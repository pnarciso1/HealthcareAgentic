#!/usr/bin/env python3
import http.server
import ssl
import socketserver
import os

# Get the current directory (where certificates are)
current_dir = os.getcwd()
cert_path = os.path.join(current_dir, 'local+3.pem')
key_path = os.path.join(current_dir, 'local+3-key.pem')

# Change to the public directory
os.chdir('public')

# Create server
httpd = socketserver.TCPServer(("localhost", 8000), http.server.SimpleHTTPRequestHandler)

# Wrap with SSL
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(cert_path, key_path)
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print("HTTPS Server running on https://localhost:8000")
print("Press Ctrl+C to stop")
httpd.serve_forever() 