"""
智能打包脚本 — 只打需要更新的包
用法：
  python scripts/build.py android   # 只打 Android
  python scripts/build.py pc         # 只打 PC
  python scripts/build.py all        # 两个都打
  python scripts/build.py check      # 只检查不打包
"""

import os
import sys
import subprocess
import hashlib
import json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APK_PATH = os.path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')
EXE_PATH = os.path.join(ROOT, 'release', 'win-unpacked', 'Novel InaKB.exe')
HASH_FILE = os.path.join(ROOT, '.build-hashes.json')

def get_src_hash():
    """计算 src/ 和 public/ 的哈希，判断代码是否变化"""
    h = hashlib.sha256()
    for folder in ['src', 'public', 'electron', 'index.html']:
        full = os.path.join(ROOT, folder)
        if os.path.isfile(full):
            with open(full, 'rb') as f:
                h.update(f.read())
        elif os.path.isdir(full):
            for root, _, files in os.walk(full):
                if 'node_modules' in root or '.git' in root:
                    continue
                for fname in sorted(files):
                    with open(os.path.join(root, fname), 'rb') as f:
                        h.update(f.read())
    return h.hexdigest()

def load_hashes():
    if os.path.exists(HASH_FILE):
        with open(HASH_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_hashes(data):
    with open(HASH_FILE, 'w') as f:
        json.dump(data, f)

def needs_rebuild(target):
    """检查目标是否需要重新构建"""
    if target == 'android':
        if not os.path.exists(APK_PATH):
            return True
        mtime = os.path.getmtime(APK_PATH)
    elif target == 'pc':
        if not os.path.exists(EXE_PATH):
            return True
        mtime = os.path.getmtime(EXE_PATH)
    else:
        return True

    hashes = load_hashes()
    current = get_src_hash()
    stored = hashes.get(target, '')
    return current != stored

def build_android():
    print('\n=== 构建 Android APK ===')
    # vite build + cap sync
    subprocess.run('npx vite build && npx cap sync android',
                   cwd=ROOT, check=True, shell=True)
    # clean build
    build_dir = os.path.join(ROOT, 'android', 'app', 'build')
    if os.path.exists(build_dir):
        import shutil
        shutil.rmtree(build_dir, ignore_errors=True)
    # gradle
    gradle_cmd = (
        'set JAVA_HOME=E:\\AndroidStudio\\jbr&& '
        'set ANDROID_HOME=E:\\Android\\android-sdk&& '
        'cd /d ' + os.path.join(ROOT, 'android') + '&& '
        '.\\gradlew.bat assembleRelease'
    )
    subprocess.run(gradle_cmd, check=True, shell=True)
    # update hash
    hashes = load_hashes()
    hashes['android'] = get_src_hash()
    save_hashes(hashes)
    print(f'[OK] Android APK: {APK_PATH}')

def build_pc():
    print('\n=== 构建 PC 桌面版 ===')
    # kill processes
    subprocess.run('taskkill /F /IM "Novel InaKB.exe" /T 2>nul & taskkill /F /IM electron.exe /T 2>nul',
                   shell=True, capture_output=True)
    # vite build + electron tsc + rename
    for cmd in ['npx vite build', 'npx tsc -p electron/tsconfig.json', 'node scripts/rename-electron.cjs']:
        subprocess.run(cmd, cwd=ROOT, check=True, shell=True)
    # electron-builder (may return exit code 1 for warnings, check file instead)
    result = subprocess.run('npx electron-builder --win --dir', cwd=ROOT, shell=True)
    if os.path.exists(EXE_PATH):
        hashes = load_hashes()
        hashes['pc'] = get_src_hash()
        save_hashes(hashes)
        print(f'[OK] PC EXE: {EXE_PATH}')
    else:
        print(f'[FAIL] PC build failed, exit code: {result.returncode}')
        sys.exit(1)

def check_all():
    import datetime
    print('=== 检查构建状态 ===')
    current_hash = get_src_hash()
    hashes = load_hashes()

    # Android
    if os.path.exists(APK_PATH):
        mtime = os.path.getmtime(APK_PATH)
        mt = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M')
        if current_hash == hashes.get('android', ''):
            print(f'[OK] Android APK 已是最新 ({mt}) - 无需重新打包')
        else:
            print(f'[!!] Android APK 需要更新 (代码已变更)')
    else:
        print(f'[XX] Android APK 不存在，需要打包')

    # PC
    if os.path.exists(EXE_PATH):
        mtime = os.path.getmtime(EXE_PATH)
        mt = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M')
        if current_hash == hashes.get('pc', ''):
            print(f'[OK] PC EXE 已是最新 ({mt}) - 无需重新打包')
        else:
            print(f'[!!] PC EXE 需要更新 (代码已变更)')
    else:
        print(f'[XX] PC EXE 不存在，需要打包')

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'check'

    if target == 'check':
        check_all()
    elif target == 'android':
        build_android()
    elif target == 'pc':
        build_pc()
    elif target == 'all':
        build_android()
        build_pc()
    else:
        print('用法: python scripts/build.py [android|pc|all|check]')
