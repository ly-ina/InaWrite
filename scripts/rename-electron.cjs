/**
 * Electron 编译后重命名 .js → .cjs
 * 因为 package.json 有 "type": "module"，.js 会被当 ESM 执行
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist-electron');

['main', 'preload'].forEach((name) => {
  const jsPath = path.join(distDir, `${name}.js`);
  const cjsPath = path.join(distDir, `${name}.cjs`);
  if (fs.existsSync(jsPath)) {
    if (fs.existsSync(cjsPath)) fs.unlinkSync(cjsPath);
    fs.renameSync(jsPath, cjsPath);
    console.log(`renamed: ${name}.js → ${name}.cjs`);
  } else {
    console.log(`skip: ${name}.js not found`);
  }
});
