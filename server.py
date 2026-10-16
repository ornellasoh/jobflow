"""Serveur local de la web app HTML. Usage personnel, accès loopback uniquement."""
import io
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

import store

WEB = Path(__file__).parent / 'web'
GENERATION_LOCK = threading.Lock()

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB), **kwargs)

    def log_message(self, *_):
        pass

    def respond(self, data, status=200, mime='application/json; charset=utf-8'):
        body = json.dumps(data, ensure_ascii=False).encode() if not isinstance(data, bytes) else data
        self.send_response(status)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/api/applications':
            return self.respond(store.all_records())
        if path == '/api/profile':
            from engine import MASTER_CV
            return self.respond(MASTER_CV)
        if path.startswith('/api/'):
            return self.respond({'error':'Ressource introuvable.'}, 404)
        return super().do_GET()

    def do_POST(self):
        # Les mutations ne sont accessibles qu'au navigateur ouvert sur cette origine locale.
        origin = self.headers.get('Origin')
        if origin and origin != f'http://{self.headers.get("Host")}':
            return self.respond({'error':'Origine non autorisée.'}, 403)
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            return self.respond({'error':'Format JSON requis.'}, 415)
        try:
            size = int(self.headers.get('Content-Length', 0))
            if not 0 < size <= 2_000_000:
                return self.respond({'error':'Requête trop volumineuse ou vide.'}, 413)
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError('Objet JSON requis.')
            path = urlsplit(self.path).path
            if path == '/api/applications':
                data.pop('api_key', None)
                return self.respond(store.save(data))
            if path == '/api/generate':
                import engine
                if not data.get('offer_text', '').strip() or not data.get('api_key', '').strip():
                    raise ValueError('Ajoute le texte de l’offre et une clé API.')
                if data.get('provider') not in ['Gemini', 'DeepSeek']:
                    raise ValueError('Choisis un moteur IA disponible.')
                with GENERATION_LOCK:
                    result = engine.generate_complete_application(data['offer_text'], data['provider'], data['api_key'])
                return self.respond({'cv':store.factual_cv(result['cv'], engine.MASTER_CV), 'letter_text':'\n\n'.join(engine.cover_letter_to_paragraphs(result['cover_letter']))})
            if path == '/api/document':
                import engine
                cv = store.factual_cv(data.get('cv', {}), engine.MASTER_CV)
                with GENERATION_LOCK:
                    docs = engine.build_docx_documents(cv, data.get('letter_text', '').split('\n\n'), data.get('company', ''), '', engine.COLOR_PALETTE['Bleu Roi']['rgb'])
                out = io.BytesIO()
                docs[1 if data.get('kind') == 'letter' else 0].save(out)
                return self.respond(out.getvalue(), mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            return self.respond({'error':'Ressource introuvable.'}, 404)
        except (ValueError, TypeError, KeyError):
            return self.respond({'error':'Données invalides. Vérifie les champs requis.'}, 400)
        except Exception:
            return self.respond({'error':'Action impossible. Vérifie la configuration du moteur et réessaie.'}, 500)

if __name__ == '__main__':
    print('JobFlow : http://127.0.0.1:8502', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8502), Handler).serve_forever()
