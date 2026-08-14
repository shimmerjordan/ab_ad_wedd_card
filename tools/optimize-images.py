#!/usr/bin/env python3
"""照片瘦身：assets/imgs/ 里的原图直接是相机/AI 出图原件，最大单张 10MB，
全站 85MB —— 国内 4G 下点开一张要等十几秒，这是首屏之外最大的一块。

  策略：长边压到 --max-side（默认 2000px，手机全屏看图放大到 200% 仍够清晰），
        统一转 JPEG（质量 84，渐进式，剥 EXIF 但先按 EXIF 方向摆正），
        带透明通道的图保留 PNG（不会破坏叠图）。
        改了扩展名的会自动同步 js/config.js 里的引用。

  用法：  python3 tools/optimize-images.py            # 只报告，不动文件
          python3 tools/optimize-images.py --apply    # 真正改写（原图先备份到 assets/imgs.orig/）

  依赖：  pip install pillow
"""
import argparse, os, re, shutil, sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit('需要 Pillow：pip install pillow')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMGS = os.path.join(ROOT, 'assets/imgs')
BACKUP = os.path.join(ROOT, 'assets/imgs.orig')
CONFIG = os.path.join(ROOT, 'js/config.js')
EXTS = ('.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG')


def has_alpha(im):
    """只认「真的用到了透明」的图。相机/AI 出图常带一条全不透明的 alpha 通道，
    那种当成不透明处理，才能转 JPEG（否则 6MB 的 PNG 只能压到 3.8MB）。"""
    if im.mode == 'P' and 'transparency' in im.info:
        im = im.convert('RGBA')
    if im.mode not in ('RGBA', 'LA'):
        return False
    lo, _ = im.getchannel('A').getextrema()
    return lo < 255


def process(path, max_side, quality, out_dir):
    """返回 (新文件名, 新字节数)。out_dir 为 None 时只估算不落盘。"""
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im)
        alpha = has_alpha(im)
        w, h = im.size
        if max(w, h) > max_side:
            s = max_side / max(w, h)
            im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
        base = os.path.splitext(os.path.basename(path))[0]
        if alpha:
            name, kw, fmt = base + '.png', dict(optimize=True), 'PNG'
        else:
            name, kw, fmt = base + '.jpg', dict(quality=quality, progressive=True, optimize=True), 'JPEG'
            im = im.convert('RGB')
        target = os.path.join(out_dir or os.devnull, name)
        if out_dir:
            im.save(target, fmt, **kw)
            return name, os.path.getsize(target)
        import io
        buf = io.BytesIO()
        im.save(buf, fmt, **kw)
        return name, buf.tell()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true', help='真正改写文件（默认只报告）')
    ap.add_argument('--max-side', type=int, default=2000)
    ap.add_argument('--quality', type=int, default=84)
    args = ap.parse_args()

    files = sorted(f for f in os.listdir(IMGS) if f.endswith(EXTS))
    if not files:
        sys.exit(f'{IMGS} 下没有图片')

    if args.apply:
        os.makedirs(BACKUP, exist_ok=True)

    renames, before_all, after_all = {}, 0, 0
    print(f'{"文件":<52}{"原始":>10}{"压缩后":>10}  省')
    for f in files:
        src = os.path.join(IMGS, f)
        before = os.path.getsize(src)
        if args.apply:
            # 先把原图挪进备份，再从备份读、写回 assets/imgs/ ——
            # 千万不能「就地写完再 move 走」：同名文件(jpg→jpg)会把刚压好的那份挪走，原图就没了
            src = shutil.move(src, os.path.join(BACKUP, f))
        try:
            name, after = process(src, args.max_side, args.quality, IMGS if args.apply else None)
        except Exception as e:
            if args.apply:
                shutil.move(src, os.path.join(IMGS, f))   # 失败就原样放回去
            print(f'  ! {f}: {e}')
            continue
        before_all += before
        after_all += after
        if name != f:
            renames[f] = name
        print(f'{f[:50]:<52}{before / 1048576:>9.1f}M{after / 1048576:>9.1f}M  {100 - after * 100 / before:>4.0f}%')

    print(f'\n合计 {before_all / 1048576:.1f}MB → {after_all / 1048576:.1f}MB'
          f'（省 {100 - after_all * 100 / before_all:.0f}%）'
          + ('' if args.apply else '   ← 这是预演，加 --apply 才真正改写'))

    if renames:
        print(f'\n{len(renames)} 个文件改了扩展名，js/config.js 中的引用'
              + ('已同步：' if args.apply else '需同步（--apply 时自动改）：'))
        for a, b in list(renames.items())[:6]:
            print(f'  {a} → {b}')
        if len(renames) > 6:
            print(f'  …等共 {len(renames)} 处')
        if args.apply:
            src = open(CONFIG, encoding='utf-8').read()
            for a, b in renames.items():
                src = src.replace(f"'{a}'", f"'{b}'")
            open(CONFIG, 'w', encoding='utf-8').write(src)
    if args.apply:
        print(f'\n原图已备份到 {os.path.relpath(BACKUP, ROOT)}/ —— 确认没问题后可以整个删掉'
              '（git 历史里也还留着）。部署前记得删，否则仓库照样是 85MB。')


if __name__ == '__main__':
    main()
