const fs = require("fs");
const path = require('path');
const PSD = require('psd');
const {writeTemplToFile, fsExistsSync} = require('./utils');

const absolutePath = path.resolve(__dirname, './../../');

module.exports = function() {
  const {psdPath, outputPath, frame} = global.CONFIG;
  const psd = PSD.fromFile(psdPath);
  psd.parse();

  const root = psd.tree();
  const layers = root.children();

  init();

  function init() {
    const importImg = [];
    const tree = resolveLayer(root);

    const DOM = renderDOM(tree);
    const CSS = renderCSS(tree);

    const templPathDOM = path.resolve(absolutePath, `src/template/${frame}/index.ejs`);
    const templPathCSS = path.resolve(absolutePath, `src/template/${frame}/style.ejs`);
    const templData = {
      react: [{DOM}, {CSS, ImportImg: getImportList(tree).join('\n')}],
      vue: [{DOM, CSS}],
      default: [{DOM, CSS}],
    }[frame];

    writeTemplToFile(templPathDOM, outputPath, templData[0]);
    ['react'].includes(frame) && writeTemplToFile(templPathCSS, outputPath, templData[1]);
  }
}

function getImportList(group) {
  return group.children.map((item) => {
    const {bgName, children} = item;
    if (children) {
      return getImportList(item);
    }
    if (bgName) {
      const name = path.basename(bgName, '.png');
      return `import ${name} from './image/${bgName}';`;
    }
    return '';
  }).flat(Infinity).filter(Boolean)
}

function resolveLayer(group, classTier = ['psd']) {
  const className = classTier.join('_');
  return {
    className,
    dom: createDOM(className),
    style: createCSS(className, group),
    children: resolveChildrenLayer(
      group.children(),
      classTier
    )
  }

  function resolveChildrenLayer(children, _classTier) {
    const publicImgDir = path.resolve(global.CONFIG.outputPath, 'image');
    const imgDirExists = fsExistsSync(publicImgDir, 'dir')
    !imgDirExists && fs.mkdirSync(publicImgDir);

    children = children.reverse();
    return children.map((item, idx) => {
      const className = _classTier.concat(idx).join('_');

      switch (true) {
        case item.isGroup():
          const key = 'group' + getGroupIdx(item);
          return resolveLayer(item, _classTier.concat(key))
        case !!item.get('typeTool'):
          const innerTxt = item.get('typeTool').textValue
          return {
            className,
            dom: createDOM(className, 'p', innerTxt),
            style: createCSS(className, item)
          }
        default:
          if (hasEmptyLayer(item)) {
            return undefined
          }
          const bgName = `${className}.png`;
          item.layer.image.saveAsPng(
            path.resolve(global.CONFIG.outputPath, 'image', bgName)
          );
          return {
            className,
            bgName,
            dom: createDOM(className),
            style: createCSS(className, item)
          }
      }
    }).filter(Boolean);
  }
}

// 图层偏移
function stylesOffset(layer) {
  const {toPxFn} = global.CONFIG;
  let width = layer.get('width')
  let height = layer.get('height')
  let top = layer.get('top')
  let left = layer.get('left')

  if (!!layer.get('typeTool')) {
    let typeTool = layer.get('typeTool')
    const [positionTop, positionLeft, positionRight, positionBottom] = ['Top ', 'Left', 'Rght', 'Btom'].map(key => typeTool.textData.bounds[key].value);
    const {text: {transform: {xx, tx, yy, ty}}} = layer.export();
    width = Math.ceil((positionRight - positionLeft) * xx) * 1.03;
    height = Math.ceil((positionBottom - positionTop) * yy);
    left = Math.floor(tx * xx + positionLeft);
    top = Math.floor(ty * yy + positionTop);
  }

  return `width: ${toPxFn(width)};
          height: ${toPxFn(height)};
          position: absolute;
          top: ${toPxFn(top)};
          left: ${toPxFn(left)};`;
}

// 文字样式
function styleFont(layer) {
  const item = layer.get('typeTool');
  if (!item) {
    return '';
  }


  const {toPxFn} = global.CONFIG;
  const [positionTop, positionLeft, positionRight, positionBottom] = ['Top ', 'Left', 'Rght', 'Btom'].map(key => item.textData.bounds[key].value);
  // const {transform: {xx, tx, yy, ty}, font, value} = layer.export();
  const {text: {transform: {xx, tx, yy, ty}, font, value}} = layer.export();

  const {Leading, Tracking} = item.styles();
  const fontSize = Math.floor(font.sizes[0] * yy);
  const fontFamily = font.names.join(', ') || '微软雅黑';
  const fontColor = font.colors && font.colors.length ? rgbToHex(font.colors[0]) : '#000000';
  const letterSpacing = Tracking ? Math.round(Tracking[0] * fontSize / 1000) : 0;

  return `font-family: ${fontFamily};
          font-size: ${toPxFn(fontSize)};
          line-height: 1;
          letter-spacing: ${toPxFn(letterSpacing)};
          color: ${fontColor};
          text-align: ${item.alignment()[0]};
          `

  function rgbToHex([r, g, b]) {
    const bin = (r << 16 | g << 8 | b).toString(16);
    return `#${bin.padStart(6, '0')}`;
  }
}

// 是否空图层
function hasEmptyLayer(layer) {
  return layer.get('width') === 0 || layer.get('height') === 0
}

// 获取图层组索引
function getGroupIdx(layer) {
  const groups = layer.siblings().filter((item) => item.isGroup());
  return groups.findIndex((item) => item === layer)
}

// 过滤出 css/html 树
function filter1(list, idx) {
  return list.map((item) => {
    if (Object.prototype.toString.call(item) === '[object Object]') {
      return {
        ...item,
        children: filter1(item.children, idx)
      };
    }
    return item[idx];
  })
}

function createDOM(className, tag = 'div', innerHTML = '') {
  const {frame} = global.CONFIG;
  switch (frame) {
    case 'react':
      return `<${tag} className="${className}">${innerHTML}</${tag}>`
    case 'vue':
    case 'default':
      return `<${tag} class="${className}">${innerHTML}</${tag}>`
    default:
      throw new Error('createDOM');
  }
}

function createCSS(className, layer) {
  const {frame} = global.CONFIG;
  switch (frame) {
    case 'vue':
    case 'react':
    case 'default':
      if (layer.isGroup()) {
        if (layer.isRoot()) {
          return `${stylesOffset(layer)}`
        }
        return ''
      }
      return `${stylesOffset(layer)}
              ${styleFont(layer)}`;
    default:
      throw new Error('createCSS');
  }
}

// Tree => 转换DOM节点
function renderDOM(group) {
  const {dom, children} = group;
  const Reg = /\<\/\S+\>$/g;

  const endTag = dom.match(Reg);

  return dom.replace(
    endTag,
    children.map((item) => {
      if (item.children) {
        return renderDOM(item);
      }
      return item.dom;
    }).flat(Infinity).join('\n')
  ) + endTag;
}

// Tree => 转换CSS结构
function renderCSS(group) {
  switch (global.CONFIG.frame) {
    case 'react':
      return toReact(group, true);
    case 'vue':
      return toVue(group, true);
    case 'default':
      return toDefault(group);
      break
    default:
      throw new Error('renderCSS:' + global.CONFIG.frame);
  }

  function toReact(group, isRoot = false) {
    const {className, style, children, bgName} = group;
    const selector = isRoot ? `.${className}` : `& > .${className}`;

    return `${selector} {
      ${style ? style : ''}
      ${bgName ? `background-image: url(\${${path.basename(bgName, '.png')}});` : ''}
      ${children ? children.map((item) => toReact(item)).join('\n') : ''}
    }`
  }

  function toVue(group, isRoot = false) {
    const {className, style, children, bgName} = group;
    const selector = isRoot ? `.${className}` : `& > .${className}`;

    return `${selector} {
      ${style ? style : ''}
      ${bgName ? `background-image: url('./image/${bgName}');` : ''}
      ${children ? children.map((item) => toVue(item)).join('\n') : ''}
    }`
  }

  function toDefault(group, levelClass = []) {
    const {className, style, children, bgName} = group;
    levelClass = levelClass.concat(className);
    return `.${levelClass.join(' .')} {
      ${style ? style : ''}
      ${bgName ? `background-image: url(./image/${bgName});` : ''}
    }
    ${children ? children.map((item) => toDefault(item, levelClass)).join('\n') : ''}
    `;
  }
}
