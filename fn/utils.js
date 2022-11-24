const path = require('path');
const fs = require('fs');
const ejs = require('ejs');

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
  const data = '${' + imgName +'}';
  return `background-image: url(${data});
          background-repeat: no-repeat;`
}

// 根据模板,输出文件
const writeTemplToFile = (templatePath, targetDir, templateData) => {
  return new Promise((resolve, reject) => {
    ejs.renderFile(templatePath, templateData, {}, (er, template) => {
      if (er) {
        return reject();
      }

      let basename = path.basename(templatePath);
      basename = transformFileName(basename);

      fs.writeFileSync(path.resolve(targetDir, basename), template);

      resolve();
    })
  })
}

// 模板文件名称转换输出文件名称
const transformFileName = (filename) => {
  switch (filename) {
    case 'index.ejs':
      return 'index.tsx'
    case 'style.ejs':
      return 'style.js'
    default:
      throw new Error('transformFileName:filename');
  }
}

// 递归删除输出文件目录
const deleteFolderRecursive = (url) => {
  let files = [];

  if (fs.existsSync(url)) {
    files = fs.readdirSync(url);
    files.forEach(function(file, index) {
      const curPath = path.join(url, file);
      if (fs.statSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(url);
  }
}

module.exports = {
  toRem,
  stylesOffset,
  styleBg,
  styleFont,
  writeTemplToFile,
  deleteFolderRecursive
}
