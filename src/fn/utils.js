const path = require('path');
const fs = require('fs');
const ejs = require('ejs');

// 根据模板,输出文件
const writeTemplToFile = (templatePath, targetDir, templateData) => {
  return new Promise((resolve, reject) => {
    ejs.renderFile(templatePath, templateData, {}, async (er, template) => {
      if (er) {
        return reject();
      }

      let basename = path.basename(templatePath);
      basename = transformFileName(basename);

      const outputPath = path.resolve(targetDir, basename)

      console.log('outputPath', outputPath);
      const hasIn = await fileHasExist(outputPath)
      if (hasIn) {
        throw new Error('路径文件已存在:' + outputPath)
      }
      fs.writeFileSync(outputPath, template);
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
      throw new Error('transformFileName:' + filename);
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

// 文件是否存在
const fileHasExist = async filePath => await fs.promises.access(filePath).then(() => true).catch(_ => false)


module.exports = {
  writeTemplToFile,
  deleteFolderRecursive,
  fileHasExist
}
