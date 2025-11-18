#!/bin/bash

# Demo script to show generated nginx configuration

# Source the common library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

echo "=========================================="
echo "Nginx Configuration Generation Demo"
echo "=========================================="
echo
echo "Generating configuration for: api.openplp.org"
echo "Target: http://127.0.0.1:3000"
echo
echo "Generated Configuration:"
echo "----------------------------------------"

generate_nginx_config "api.openplp.org" "127.0.0.1" "3000" "http"

echo "----------------------------------------"
echo
echo "✓ Configuration includes:"
echo "  • WebSocket support (Upgrade, Connection headers)"
echo "  • Proxy headers (Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto)"
echo "  • 60-second timeouts (connect, send, read)"
echo "  • Security headers (X-Frame-Options, X-XSS-Protection, X-Content-Type-Options)"
echo "  • Separate access and error logs"
echo "  • HTTP 1.1 for WebSocket compatibility"
echo
