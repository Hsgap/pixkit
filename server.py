#!/usr/bin/env python3
"""
PixKit Realtime Web & Presence Server
Serves static assets and provides ephemeral, zero-database real-time active user presence tracking.
"""

import http.server
import socketserver
import time
import json
import os
import sys
import threading
import mimetypes

mimetypes.add_type('application/vnd.android.package-archive', '.apk')
mimetypes.add_type('application/octet-stream', '.aab')

PORT = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
MOBILE_DIR = os.path.join(os.path.dirname(DIRECTORY), 'pixkit-mobile')
ADMIN_DIR = os.path.join(os.path.dirname(DIRECTORY), 'pixkit-admin')
CONFIG_FILE = os.path.join(ADMIN_DIR, 'config', 'ecosystem-state.json')

# Thread-safe in-memory presence tracking: { session_id: last_heartbeat_timestamp }
presence_lock = threading.Lock()
ACTIVE_SESSIONS = {}
HEARTBEAT_TIMEOUT_SECONDS = 7.0

def prune_dead_sessions_locked():
    now = time.time()
    dead = [sid for sid, ts in ACTIVE_SESSIONS.items() if now - ts > HEARTBEAT_TIMEOUT_SECONDS]
    for sid in dead:
        del ACTIVE_SESSIONS[sid]
    return max(1, len(ACTIVE_SESSIONS))

class PixKitHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def translate_path(self, path):
        clean = path.split('?', 1)[0].split('#', 1)[0]
        
        # Simulator & mobile preview aliases
        if clean in ('/simulator', '/mobile-preview', '/preview', '/simulator.html', '/mobile-preview.html'):
            return os.path.join(DIRECTORY, 'mobile-preview.html')
            
        # Serve APK / AAB binaries from pixkit-mobile
        if clean.endswith('.apk') or clean.endswith('.aab'):
            fname = os.path.basename(clean)
            target = os.path.join(MOBILE_DIR, fname)
            if os.path.isfile(target):
                return target

        # Route /mobile/... to pixkit-mobile/
        if clean == '/mobile' or clean == '/mobile/':
            return os.path.join(MOBILE_DIR, 'home.html')
            
        if clean.startswith('/mobile/'):
            rel = clean[len('/mobile/'):].lstrip('/')
            target = os.path.join(MOBILE_DIR, rel)
            if not os.path.exists(target) and not os.path.splitext(rel)[1]:
                if os.path.isfile(target + '.html'):
                    return target + '.html'
            return target
            
        return super().translate_path(path)

    def do_GET(self):
        # Redirect /mobile to /mobile/ for clean relative asset loading
        clean_path = self.path.split('?')[0].split('#')[0]
        if clean_path == '/mobile':
            query = ('?' + self.path.split('?', 1)[1]) if '?' in self.path else ''
            self.send_response(301)
            self.send_header('Location', '/mobile/' + query)
            self.end_headers()
            return
        if self.path == '/api/presence' or self.path.startswith('/api/presence?'):
            self._send_presence_response()
            return

        # API: Ecosystem State (Cross-app local sync with pixkit-admin)
        if self.path.startswith('/api/status'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.end_headers()
            try:
                with open(CONFIG_FILE, 'r') as f:
                    self.wfile.write(f.read().encode('utf-8'))
            except Exception as e:
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # Clean URL rewriting (e.g. /studio -> /studio.html, /compress-image -> /compress-image.html)
        clean_path = self.path.split('?')[0].split('#')[0]
        if clean_path != '/' and not os.path.splitext(clean_path)[1]:
            potential_file = os.path.join(DIRECTORY, clean_path.lstrip('/') + '.html')
            if os.path.isfile(potential_file):
                query = self.path[len(clean_path):]
                self.path = clean_path + '.html' + query

        super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/status'):
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                data = json.loads(body.decode('utf-8'))
                data.setdefault('system', {})
                data['system']['lastUpdated'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                with open(CONFIG_FILE, 'w') as f:
                    json.dump(data, f, indent=2)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "updated": data['system']['lastUpdated']}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
            return
        elif self.path.startswith('/api/presence/leave'):
            self._handle_leave()
        elif self.path.startswith('/api/presence'):
            self._handle_heartbeat()
        else:
            self.send_error(404, "Endpoint not found")

    def _handle_heartbeat(self):
        session_id = self._read_session_id()
        with presence_lock:
            if session_id:
                ACTIVE_SESSIONS[session_id] = time.time()
            active_count = prune_dead_sessions_locked()
        self._write_json({"active_users": active_count})

    def _handle_leave(self):
        session_id = self._read_session_id()
        with presence_lock:
            if session_id and session_id in ACTIVE_SESSIONS:
                del ACTIVE_SESSIONS[session_id]
            active_count = prune_dead_sessions_locked()
        self._write_json({"active_users": active_count})

    def _send_presence_response(self):
        with presence_lock:
            active_count = prune_dead_sessions_locked()
        self._write_json({"active_users": active_count})

    def _read_session_id(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                body = self.rfile.read(content_length).decode('utf-8')
                data = json.loads(body)
                return data.get('session_id') or self.client_address[0]
        except Exception:
            pass
        return self.client_address[0]

    def _write_json(self, data):
        payload = json.dumps(data).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format, *args):
        # Mute repetitive presence polling logs to keep console clean
        if len(args) > 0 and isinstance(args[0], str) and '/api/presence' in args[0]:
            return
        super().log_message(format, *args)

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == '__main__':
    server = ThreadedHTTPServer(('0.0.0.0', PORT), PixKitHandler)
    print(f"PixKit Realtime Server running at http://0.0.0.0:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()

