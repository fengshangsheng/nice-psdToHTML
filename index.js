const fs = require("fs");
const path = require('path');
const PSD = require('psd');
const {toRem, stylesOffset, styleBg, styleFont, writeTemplToFile, deleteFolderRecursive} = require('./fn/utils');

const psd = PSD.fromFile("./年度账单750-9.psd");
const outputPath = path.resolve(process.cwd(), './output');

psd.parse();

init();

function init() {
  initDir();

  const root = psd.tree();
  const view = root.children();

  const importImg = [];
  const tree = fn(view.reverse());

  let dom = filter(tree, 0);
  let css = filter(tree, 1);
  dom = transformDOM(dom);
  css = `width: ${toRem(root.get('width'))};
         height: ${toRem(root.get('height'))};
         position: relative;
         ` + transformCSS(css);
  writeTemplToFile(path.resolve(process.cwd(), './template/style.ejs'), outputPath, {
    data: css, importImg: importImg.join('\n')
  });
  writeTemplToFile(path.resolve(process.cwd(), './template/index.ejs'), outputPath, {data: dom});

  function fn(gourp, preIdx = ['psd']) {
    const dirTree = gourp.map((item, idx) => {
      const keys = [...preIdx, idx];
      const key = keys.join('_');

      switch (true) {
        case item.isGroup():
          const groupName = ['group', ...preIdx, getGroupIdx(item)].join('_');
          return {
            groupName, style: `
              & > .${groupName} {
              }`, children: fn(item._children.reverse(), keys)
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
      return list;
    })
    return dirTree;
  }

  function initDir() {
    deleteFolderRecursive(outputPath)
    fs.mkdirSync(outputPath);
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
