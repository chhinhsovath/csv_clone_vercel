#!/bin/bash

################################################################################
# Quick Subdomain Setup Script
# Author: Sovath.C
# Description: Fast subdomain setup with minimal prompts
# Usage: sudo ./quick-subdomain.sh subdomain.domain.com target_port
################################################################################

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; exit 1; }
print_info() { echo -e "${YELLOW}ℹ${NC} $1"; }

# Check root
[ "$EUID" -ne 0 ] && print_error "Please run as root (sudo)"

# Parse arguments
if [ $# -lt 2 ]; then
    echo "Usage: sudo $0 <subdomain> <port> [ssl_email]"
    echo ""
    echo "Examples:"
    echo "  sudo $0 api.openplp.org 3000 your@email.com"
    echo "  sudo $0 admin.openplp.org 8080"
    echo ""
    exit 1
fi

SUBDOMAIN=$1
PORT=$2
EMAIL=${3:-""}
HOST="127.0.0.1"
PROTOCOL="http"

# Validate
[[ ! $SUBDOMAIN =~ ^[a-zA-Z0-9.-]+$ ]] && print_error "Invalid subdomain format"
[[ ! $PORT =~ ^[0-9]+$ ]] || [ $PORT -lt 1 ] || [ $PORT -gt 65535 ] && print_error "Invalid port"

print_info "Setting up $SUBDOMAIN → $HOST:$PORT"

# Check if port is listening
if ! netstat -tuln 2>/dev/null | grep -q ":$PORT " && ! ss -tuln 2>/dev/null | grep -q ":$PORT "; then
    print_error "Port $PORT is not listening. Start your service first."
fi

# Detect protocol if port is common HTTPS port
[[ $PORT -eq 443 ]] && PROTOCOL="https"

# Create Nginx config
CONFIG_FILE="/etc/nginx/sites-available/$SUBDOMAIN"
cat > "$CONFIG_FILE" <<EOF
server {
    listen 80;
    server_name $SUBDOMAIN;

    access_log /var/log/nginx/${SUBDOMAIN}_access.log;
    error_log /var/log/nginx/${SUBDOMAIN}_error.log;

    location / {
        proxy_pass $PROTOCOL://$HOST:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

print_success "Config created"

# Enable site
ln -sf "$CONFIG_FILE" "/etc/nginx/sites-enabled/$SUBDOMAIN"
print_success "Site enabled"

# Test and reload
if nginx -t 2>&1 | grep -q "test is successful"; then
    systemctl reload nginx
    print_success "Nginx reloaded"
else
    print_error "Nginx config test failed"
fi

# Configure Webmin if detected
if [ $PORT -eq 10000 ] && [ -f "/etc/webmin/config" ]; then
    if ! grep -q "$SUBDOMAIN" /etc/webmin/config; then
        cp /etc/webmin/config /etc/webmin/config.backup
        if grep -q "^referers=" /etc/webmin/config; then
            sed -i "s/^referers=\(.*\)/referers=\1 $SUBDOMAIN/" /etc/webmin/config
        else
            echo "referers=$SUBDOMAIN" >> /etc/webmin/config
        fi
        systemctl restart webmin 2>/dev/null || true
        print_success "Webmin configured"
    fi
fi

# Install SSL if email provided
if [ -n "$EMAIL" ]; then
    print_info "Installing SSL certificate..."
    if certbot --nginx -d "$SUBDOMAIN" --email "$EMAIL" --agree-tos --non-interactive --redirect 2>/dev/null; then
        print_success "SSL installed: https://$SUBDOMAIN"
    else
        print_info "SSL failed. Install manually: sudo certbot --nginx -d $SUBDOMAIN"
        print_success "Available at: http://$SUBDOMAIN"
    fi
else
    print_success "Available at: http://$SUBDOMAIN"
    print_info "Add SSL later: sudo certbot --nginx -d $SUBDOMAIN"
fi

# Summary
echo ""
print_info "Setup complete! Next steps:"
echo "  1. Add DNS A record in Cloudflare:"
echo "     Name: $(echo $SUBDOMAIN | cut -d'.' -f1)"
echo "     Value: Your server IP"
echo "     Proxy: DNS Only (Gray Cloud)"
echo ""
echo "  2. Wait 5-10 minutes for DNS propagation"
echo ""
echo "  View logs: sudo tail -f /var/log/nginx/${SUBDOMAIN}_error.log"
echo "  Edit config: sudo nano /etc/nginx/sites-available/$SUBDOMAIN"
echo "  Remove: sudo rm /etc/nginx/sites-{enabled,available}/$SUBDOMAIN && sudo systemctl reload nginx"
echo ""
