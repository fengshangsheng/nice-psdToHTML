#!/usr/bin/env node
const path = require('path');
const {program} = require('commander');
const inquirer = require('inquirer');
const {version} = require('./package.json');
const transform = require('./src/fn/transform');

program.name('psdtohtml')
  .description('PSD设计稿转React+Styled-components,并生成.tsx、.js、.png文件')
  .version(version)
  .action(input)


function input() {
  inquirer.prompt([{
    type: "input",
    message: "PSD设计稿绝对路径：",
    name: "psdPath"
  }, {
    type: "input",
    message: "转换结果输出目标绝对路径:",
    name: "outputPath"
  }]).then((answer) => {
    transform(answer);
  });
}


program.parse();
