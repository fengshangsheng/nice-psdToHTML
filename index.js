#!/usr/bin/env node
const path = require('path');
const {program} = require('commander');
const inquirer = require('inquirer');
const nodeEval = require('node-eval');
const {version} = require('./package.json');
const transform = require('./src/fn/transform');
const {fsExistsSync} = require("./src/fn/utils");

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});
program.name('psdtohtml')
  .description('PSD设计稿转React+Styled-components,并生成.tsx、.js、.png文件')
  .version(version)
  .action((str, options) => {
    input()
  })

global.CONFIG = {
  psdPath: undefined,
  outputPath: undefined,
  frame: undefined,
  isMobile: undefined,
  toPxFn: `function fn(px) {
  return px / 100 + 'rem';
}`
}

async function input() {
  const data = await inquirer.prompt([{
    type: "input",
    message: "PSD设计稿绝对路径：",
    name: "psdPath",
    filter: (val) => val.trim(),
    validate: (val) => {
      const bool = fsExistsSync(val, 'file')
      if (!bool) {
        throw  new Error('路径文件错误')
        return false
      }
      if (path.extname(val) !== '.psd') {
        throw new Error('文件非PSD类型');
        return false
      }
      return true
    }
  }, {
    type: "input",
    message: "转换结果输出目标文件夹的绝对路径:",
    name: "outputPath",
    filter: (val) => val.trim(),
    validate: (val) => {
      const bool = fsExistsSync(val, 'dir')
      if (!bool) {
        throw  new Error('文件夹不存在')
        return false
      }
      return true
    }
  }, {
    type: "list",
    message: "转换的目标模板：",
    name: "frame",
    default: "React",
    choices: ["React", "Vue", "Default"],
    filter: (val) => val.toLowerCase(),
  }, {
    type: "confirm",
    message: "是否响应式？",
    name: "isMobile"
  }, {
    type: "editor",
    message: "像素转换规则函数：",
    name: "toPxFn",
    default: global.CONFIG.toPxFn,
    when: (answer) => {
      !answer.isMobile && (global.CONFIG.toPxFn = (px) => px + 'px')
      return answer.isMobile
    },
    filter: (answer) => {
      try {
        eval(answer);
        return fn;
      } catch (e) {
        throw new Error(e);
      }
    },
    validate: (fn) => {
      try {
        if(fn(100) === undefined){
          throw new Error('函数返回值: undefined')
        }
      } catch (e) {
        throw new Error('语法错误:\n' + e)
        return false;
      }
      return true;
    }
  }]);

  global.CONFIG = {
    ...global.CONFIG,
    ...data
  }

  transform();
}


program.parse();
