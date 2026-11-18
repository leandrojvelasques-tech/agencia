"""Local review only: serve the home and link its event card to the draft UI."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
EVENT_PATH = '/evento/agentes-de-inteligencia-artificial-en-ciencias-economicas-2026'

class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urlparse(self.path).path
        if path == EVENT_PATH or path == EVENT_PATH + '/inscripcion':
            view = 'registration' if path.endswith('/inscripcion') else 'landing'
            self.send_response(302)
            self.send_header('Location', f'http://127.0.0.1:5187/preview.html?view={view}')
            self.end_headers()
            return
        super().do_GET()

if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 4181), partial(PreviewHandler, directory=str(ROOT))).serve_forever()
