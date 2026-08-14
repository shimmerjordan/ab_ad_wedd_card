#!/usr/bin/env python3
"""本地预览服务器：python3 tools/serve.py [端口]

为什么不能直接双击 index.html？浏览器给 file:// 页面的 origin 是 null，
凡是走 CORS 的东西一律拒绝 —— 字体(@font-face/preload)、manifest、
fetch('wedding-config.json')、Service Worker 全部失效，控制台还会刷红字。
这不是代码问题，是浏览器安全模型，任何静态站点都一样。

跑起来就和 GitHub Pages 上完全一致（含 PWA 离线缓存）。开发时默认禁用缓存，
改了 js/css 刷新即生效，不用手动清。
"""
import http.server, os, socketserver, sys, webbrowser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json'}

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')   # 开发时永远拿最新的
        super().end_headers()

    def log_message(self, fmt, *args):
        if '404' in (args[1] if len(args) > 1 else ''):
            super().log_message(fmt, *args)             # 只报 404，不刷屏


socketserver.TCPServer.allow_reuse_address = True
for port in range(PORT, PORT + 20):
    try:
        with socketserver.TCPServer(('127.0.0.1', port), Handler) as httpd:
            url = f'http://127.0.0.1:{port}/index.html'
            print(f'请帖预览： {url}\n老登版直达：{url}?lux=1\n星露谷直达：{url}?auto=groom&nodlg=1\nCtrl+C 结束')
            try:
                webbrowser.open(url)
            except Exception:
                pass
            httpd.serve_forever()
    except OSError:
        continue
    except KeyboardInterrupt:
        print('\n已结束')
        break
else:
    sys.exit(f'{PORT}~{PORT + 19} 端口都被占用了')
