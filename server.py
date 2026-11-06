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

PORT = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

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

    def do_GET(self):
        if self.path == '/api/presence' or self.path.startswith('/api/presence?'):
            self._send_presence_response()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/presence/leave'):
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

