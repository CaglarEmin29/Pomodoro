#!/usr/bin/env python3
import http.server
import socketserver
import webbrowser
import os

PORT = 3000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # CORS headers ekle
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        index_url = f'http://localhost:{PORT}/html/tanitim.html'
        print(f"Frontend sunucusu http://localhost:{PORT} adresinde çalışıyor")
        print(f"Ana sayfa: {index_url}")
        print("Tarayıcıda otomatik açılıyor...")
        webbrowser.open(index_url)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nSunucu durduruldu.")
