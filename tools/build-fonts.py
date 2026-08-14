#!/usr/bin/env python3
"""字体子集构建：把全量字库裁成「本请帖真正用得到的字」，首屏字体从 1.39MB 降到 ~380KB。

  背景：assets/fonts/ 下原本两个文件都是 36512 字的**全量**字库(各 ~700KB)，
        只靠 CSS 的 unicode-range 限制生效范围 —— 浏览器仍要整包下载。
        国内网络下这是白屏的主要来源之一。

  产出：
    assets/fonts/fusion-pixel-latin.woff2  像素字体·拉丁/数字/符号  (~13KB)
    assets/fonts/fusion-pixel-sc.woff2     像素字体·GB2312 全集+仓库用字 (~194KB)
    assets/fonts/serif-sc.woff2            衬线(入口页/老登版)·gate+lux 用字 (~176KB)

  用法：  python3 tools/build-fonts.py          # 改了 config.js 文案后重跑一次即可
          python3 tools/build-fonts.py --check  # 只报告体积, 不写文件

  依赖：  pip install fonttools brotli
  字体源：像素 Fusion Pixel 12px (© TakWolf, OFL) → tools/fonts-src/fusion-pixel-full.woff2
          衬线 Noto Serif CJK SC (© Google, OFL)   → 系统 /usr/share/fonts/... 或 --serif-src 指定
"""
import argparse, os, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PIXEL_SRC = os.path.join(ROOT, 'tools/fonts-src/fusion-pixel-full.woff2')
SERIF_CANDIDATES = [
    os.path.join(ROOT, 'tools/fonts-src/NotoSerifCJKsc-Regular.otf'),
    '/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc',
    '/usr/share/fonts/opentype/noto/NotoSerifCJKsc-Regular.otf',
    '/System/Library/Fonts/Supplemental/Songti.ttc',
]
# 像素字体 latin 子集覆盖的区段(与 css/style.css 的 unicode-range 保持一致)
LATIN_RANGES = 'U+0000-00FF,U+0100-024F,U+2000-206F,U+2190-21FF,U+2460-24FF'
# 像素字体正文可能出现的字：游戏内所有 js 文案 + 用户会改的 config
PIXEL_SOURCES = ['js', 'css', 'index.html']
# 衬线只出现在入口页(#gate)与老登版请帖(#lux)：模板在 index.html/boot.js, 文案在 config.js
SERIF_SOURCES = ['index.html', 'js/config.js', 'js/boot.js', 'css/style.css']
# 自动推导的日期文案(deriveDateTime)不在源码里, 单独补上
EXTRA = '0123456789年月日星期一二三四五六上午下午晚上农历初十廿'


def collect(paths):
    chars = set()
    for rel in paths:
        p = os.path.join(ROOT, rel)
        files = []
        if os.path.isdir(p):
            files = [os.path.join(p, f) for f in sorted(os.listdir(p)) if f.endswith(('.js', '.css', '.html'))]
        elif os.path.isfile(p):
            files = [p]
        for f in files:
            with open(f, encoding='utf-8') as fh:
                chars |= set(fh.read())
    return chars


def gb2312():
    """GB2312 全集 6763 汉字 + 符号：覆盖现代中文 99.7% 用字，改文案也不会缺字。"""
    out = set()
    for b1 in range(0xA1, 0xF8):
        for b2 in range(0xA1, 0xFF):
            try:
                out.add(bytes([b1, b2]).decode('gb2312'))
            except UnicodeDecodeError:
                pass
    return out


def subset(src, dst, *, text=None, unicodes=None, font_number=None, check=False):
    if not os.path.exists(src):
        print(f'  ✗ 缺少字体源 {src} —— 跳过', file=sys.stderr)
        return None
    tmp_txt = None
    cmd = ['pyftsubset', src, '--flavor=woff2', '--layout-features=', '--no-hinting', '--desubroutinize']
    if font_number is not None:
        cmd.append(f'--font-number={font_number}')
    if unicodes:
        cmd.append(f'--unicodes={unicodes}')
    if text is not None:
        tmp_txt = tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False, encoding='utf-8')
        tmp_txt.write(''.join(sorted(text)))
        tmp_txt.close()
        cmd.append(f'--text-file={tmp_txt.name}')
    out = dst if not check else dst + '.check'
    cmd.append(f'--output-file={out}')
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    finally:
        if tmp_txt:
            os.unlink(tmp_txt.name)
    size = os.path.getsize(out)
    if check:
        os.unlink(out)
    return size


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true', help='只报告体积，不覆盖 assets/fonts/')
    ap.add_argument('--serif-src', default=None)
    args = ap.parse_args()

    serif_src = args.serif_src or next((p for p in SERIF_CANDIDATES if os.path.exists(p)), SERIF_CANDIDATES[1])
    # .ttc 是四合一集合(JP/KR/SC/TC)，SC 在第 3 个
    fnum = 2 if serif_src.endswith('.ttc') else None

    pixel_chars = collect(PIXEL_SOURCES) | gb2312() | set(EXTRA)
    serif_chars = collect(SERIF_SOURCES) | set(EXTRA)
    print(f'像素字体字符集 {len(pixel_chars)} · 衬线字符集 {len(serif_chars)}')

    jobs = [
        ('fusion-pixel-latin.woff2', PIXEL_SRC, dict(unicodes=LATIN_RANGES)),
        ('fusion-pixel-sc.woff2', PIXEL_SRC, dict(text=pixel_chars)),
        ('serif-sc.woff2', serif_src, dict(text=serif_chars, font_number=fnum)),
    ]
    total = 0
    for name, src, kw in jobs:
        dst = os.path.join(ROOT, 'assets/fonts', name)
        before = os.path.getsize(dst) if os.path.exists(dst) else 0
        size = subset(src, dst, check=args.check, **kw)
        if size is None:
            continue
        total += size
        delta = f'  (原 {before / 1024:.0f}KB)' if before else ''
        print(f'  {"·" if args.check else "✓"} {name:<28} {size / 1024:7.1f} KB{delta}')
    print(f'合计 {total / 1024:.0f} KB' + ('  [--check 未写入]' if args.check else ''))


if __name__ == '__main__':
    main()
