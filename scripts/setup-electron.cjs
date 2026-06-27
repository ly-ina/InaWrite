/**
 * postinstall 脚本
 * 检查 electron 是否已安装，未安装时提示用户运行安装命令
 */

const fs = require('fs');
const path = require('path');

const electronPath = path.join(__dirname, '..', 'node_modules', 'electron');
const hasElectron = fs.existsSync(electronPath);

if (!hasElectron) {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  📦 Electron 桌面应用支持                    ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  如需开发/打包桌面应用，请运行：             ║');
  console.log('║                                              ║');
  console.log('║  npm run electron:install                    ║');
  console.log('║                                              ║');
  console.log('║  这将安装 Electron 和 electron-builder       ║');
  console.log('║  （约 200MB，使用国内镜像加速）              ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
}
