"""
版本号自动递增脚本
每次构建 Release 前运行，自动 versionCode + 1
同时更新 updater.ts 中的 CURRENT_VERSION_CODE
"""

import re
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def bump_version():
    # 1. 更新 android/app/build.gradle 中的 versionCode
    gradle_path = os.path.join(ROOT, 'android', 'app', 'build.gradle')
    with open(gradle_path, 'r', encoding='utf-8') as f:
        gradle = f.read()

    match = re.search(r'versionCode\s+(\d+)', gradle)
    if not match:
        print('ERROR: versionCode not found in build.gradle')
        return

    old_code = int(match.group(1))
    new_code = old_code + 1
    gradle = gradle.replace(
        f'versionCode {old_code}',
        f'versionCode {new_code}'
    )

    # 同时尝试递增 versionName（只递增末段，如 1.3 → 1.4）
    vn_match = re.search(r'versionName\s+"(\d+)\.(\d+)"', gradle)
    if vn_match:
        major, minor = int(vn_match.group(1)), int(vn_match.group(2))
        old_vn = f'"{major}.{minor}"'
        new_vn = f'"{major}.{minor + 1}"'
        gradle = gradle.replace(old_vn, new_vn)

    with open(gradle_path, 'w', encoding='utf-8') as f:
        f.write(gradle)
    print(f'build.gradle: versionCode {old_code} → {new_code}')

    # 2. 更新 src/utils/updater.ts 中的 CURRENT_VERSION_CODE
    updater_path = os.path.join(ROOT, 'src', 'utils', 'updater.ts')
    with open(updater_path, 'r', encoding='utf-8') as f:
        updater = f.read()

    updater = re.sub(
        r'const CURRENT_VERSION_CODE = \d+;',
        f'const CURRENT_VERSION_CODE = {new_code};',
        updater
    )

    with open(updater_path, 'w', encoding='utf-8') as f:
        f.write(updater)
    print(f'updater.ts: CURRENT_VERSION_CODE → {new_code}')

    return new_code

if __name__ == '__main__':
    code = bump_version()
    if code:
        print(f'\nDone! New versionCode: {code}')
