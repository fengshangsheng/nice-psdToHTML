const fs = require("fs");
const path = require('path');
const PSD = require('psd');
const {writeTemplToFile, fileHasExist} = require('./utils');

module.exports = async function({psdPath, outputPath}) {
  psdPath = psdPath.trim()
  outputPath = outputPath.trim()
  if (!fileHasExist(psdPath)) {
    throw new Error('文件不存在');
  }
  if(path.extname(psdPath) !== '.psd'){
    throw new Error('文件非PSD类型');
  }

  const psd = PSD.fromFile(psdPath);
  psd.parse();
  const root = psd.tree();
  const layers = root.children();

  init();

  function init() {
    const importImg = [];
    const tree = resolveLayer(layers.reverse());
    let dom = filter(tree, 0);
    let css = filter(tree, 1);
    dom = transformDOM(dom);
    css = `width: ${toRem(root.get('width'))};
           height: ${toRem(root.get('height'))};
           position: relative;` + transformCSS(css);
    writeTemplToFile('./../template/style.ejs', outputPath, {
      data: css,
      importImg: importImg.join('\n')
    });
    writeTemplToFile('./../template/index.ejs', outputPath, {
      data: dom
    });

    function resolveLayer(gourp, preIdx = ['psd']) {
      return gourp.map((item, idx) => {
        const keys = [...preIdx, idx];
        const key = keys.join('_');
        switch (true) {
          case item.isGroup():
            const groupName = ['group', ...preIdx, getGroupIdx(item)].join('_');
            return {
              groupName,
              style: `& > .${groupName} {}`,
              children: resolveLayer(item._children.reverse(), keys)
            };
          case !!item.get('typeTool'):
            const style = `
            & > .${key} {
              ${stylesOffset(item)}
              ${styleFont(item)}
            }`;
            const dom = `<p className="${key}">${item.get('typeTool').textValue}</p>`;
            return [dom, style];
          default:
            if (hasEmptyLayer(item)) {
              return ['', '']
            }
            const imgPath = path.resolve(outputPath, `${key}.png`);
            item.layer.image.saveAsPng(imgPath);

            importImg.push(`import ${key} from './image/${key}.png';`)
            const style2 = `& > .${key} {
                                   ${stylesOffset(item)}
                                   ${styleBg(key)}
                                 }`;
            const dom2 = `<div className="${key}"></div>`;

            return [dom2, style2];
        }
      })
    }
  }
}

function toRem(px) {
  return px / 100 + 'rem';
}

// 图层偏移
function stylesOffset(layer) {
  return `width: ${toRem(layer.get('width'))}
          height: ${toRem(layer.get('height'))};
          position: absolute;
          top: ${toRem(layer.get('top'))};
          left: ${toRem(layer.get('left'))};`;
}

// 文字样式
function styleFont(layer) {
  const item = layer.get('typeTool');
  return `font-family: ${item.fonts().join(', ')}; 
          font-size: ${toRem(item.sizes()[0])}; 
          color: rgba(${item.colors()[0].join(', ')}); 
          text-align: ${item.alignment()[0]};`
}

// 背景图样式
function styleBg(imgName) {
  const data = '${' + imgName + '}';
  return `background-image: url(${data});
          background-repeat: no-repeat;`
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
function filter(list, idx) {
  return list.map((item) => {
    if (Object.prototype.toString.call(item) === '[object Object]') {
      return {
        ...item, children: filter(item.children, idx)
      };
    }
    return item[idx];
  })
}

// HTML树 => 转换DOM节点
function transformDOM(tree) {
  return tree.flat().map((item) => {
    if (Object.prototype.toString.call(item) === '[object Object]') {
      return `<div className="${item.groupName}">${transformDOM(item.children)}</div>`
    }
    return item;
  }).flat(Infinity).join('')
}

// CSS树 => 转换CSS结构
function transformCSS(tree) {
  return tree.flat().map((item) => {
    if (Object.prototype.toString.call(item) === '[object Object]') {
      item.style = item.style.replace('}', '');
      return `
          ${item.style}
          ${transformCSS(item.children)}
        }`
    }
    return item;
  }).flat(Infinity).join('')
}
