#!/bin/bash

################################################################################
# Subdomain Setup Script for Cloudflare + VPS
# Author: Sovath.C
# Description: Automates Nginx reverse proxy setup for subdomains
# Usage: sudo ./setup-subdomain.sh
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "Please run this script as root or with sudo"
        exit 1
    fi
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install dependencies
install_dependencies() {
    print_message "Checking and installing dependencies..."
    
    # Update package list
    apt update -qq
    
    # Install Nginx if not installed
    if ! command_exists nginx; then
        print_message "Installing Nginx..."
        apt install -y nginx
        systemctl enable nginx
        systemctl start nginx
        print_success "Nginx installed successfully"
    else
        print_message "Nginx is already installed"
    fi
    
    # Install Certbot if not installed
    if ! command_exists certbot; then
        print_message "Installing Certbot for SSL certificates..."
        apt install -y certbot python3-certbot-nginx
        print_success "Certbot installed successfully"
    else
        print_message "Certbot is already installed"
    fi
}

# Function to validate domain name
validate_domain() {
    local domain=$1
    if [[ ! $domain =~ ^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$ ]]; then
        return 1
    fi
    return 0
}

# Function to validate port
validate_port() {
    local port=$1
    if [[ ! $port =~ ^[0-9]+$ ]] || [ $port -lt 1 ] || [ $port -gt 65535 ]; then
        return 1
    fi
    return 0
}

# Function to get user input
get_configuration() {
    echo ""
    print_message "=== Subdomain Configuration ==="
    echo ""
    
    # Get subdomain
    while true; do
        read -p "Enter subdomain (e.g., api.openplp.org): " SUBDOMAIN
        if validate_domain "$SUBDOMAIN"; then
            break
        else
            print_error "Invalid domain format. Please try again."
        fi
    done
    
    # Get target protocol
    echo ""
    echo "Select target protocol:"
    echo "1) HTTP"
    echo "2) HTTPS"
    read -p "Enter choice [1-2]: " PROTOCOL_CHOICE
    
    case $PROTOCOL_CHOICE in
        1) TARGET_PROTOCOL="http" ;;
        2) TARGET_PROTOCOL="https" ;;
        *) TARGET_PROTOCOL="http" ;;
    esac
    
    # Get target host
    read -p "Enter target host [127.0.0.1]: " TARGET_HOST
    TARGET_HOST=${TARGET_HOST:-127.0.0.1}
    
    # Get target port
    while true; do
        read -p "Enter target port (e.g., 10000): " TARGET_PORT
        if validate_port "$TARGET_PORT"; then
            break
        else
            print_error "Invalid port number. Please enter a port between 1-65535."
        fi
    done
    
    # Ask for SSL
    read -p "Do you want to install SSL certificate? (y/n) [y]: " INSTALL_SSL
    INSTALL_SSL=${INSTALL_SSL:-y}
    
    # Ask for email if SSL is enabled
    if [[ $INSTALL_SSL =~ ^[Yy]$ ]]; then
        read -p "Enter email for SSL certificate: " SSL_EMAIL
    fi
    
    # Ask for authentication
    read -p "Do you want to add basic authentication? (y/n) [n]: " ADD_AUTH
    ADD_AUTH=${ADD_AUTH:-n}
    
    if [[ $ADD_AUTH =~ ^[Yy]$ ]]; then
        read -p "Enter username for authentication: " AUTH_USER
        read -s -p "Enter password for authentication: " AUTH_PASS
        echo ""
    fi
    
    # Confirm configuration
    echo ""
    print_message "=== Configuration Summary ==="
    echo "Subdomain: $SUBDOMAIN"
    echo "Target: $TARGET_PROTOCOL://$TARGET_HOST:$TARGET_PORT"
    echo "Install SSL: $INSTALL_SSL"
    if [[ $INSTALL_SSL =~ ^[Yy]$ ]]; then
        echo "SSL Email: $SSL_EMAIL"
    fi
    echo "Basic Auth: $ADD_AUTH"
    if [[ $ADD_AUTH =~ ^[Yy]$ ]]; then
        echo "Auth User: $AUTH_USER"
    fi
    echo ""
    
    read -p "Proceed with this configuration? (y/n): " CONFIRM
    if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
        print_error "Configuration cancelled"
        exit 0
    fi
}

# Function to create Nginx configuration
create_nginx_config() {
    print_message "Creating Nginx configuration for $SUBDOMAIN..."
    
    local config_file="/etc/nginx/sites-available/$SUBDOMAIN"
    local auth_file="/etc/nginx/.htpasswd_$SUBDOMAIN"
    
    # Create basic auth if requested
    if [[ $ADD_AUTH =~ ^[Yy]$ ]]; then
        print_message "Setting up basic authentication..."
        if ! command_exists htpasswd; then
            apt install -y apache2-utils
        fi
        echo "$AUTH_PASS" | htpasswd -ci "$auth_file" "$AUTH_USER"
    fi
    
    # Create Nginx configuration
    cat > "$config_file" <<EOF
server {
    listen 80;
    server_name $SUBDOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Logging
    access_log /var/log/nginx/${SUBDOMAIN}_access.log;
    error_log /var/log/nginx/${SUBDOMAIN}_error.log;
    
    location / {
        proxy_pass $TARGET_PROTOCOL://$TARGET_HOST:$TARGET_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        
EOF

    # Add basic auth if requested
    if [[ $ADD_AUTH =~ ^[Yy]$ ]]; then
        cat >> "$config_file" <<EOF
        # Basic Authentication
        auth_basic "Restricted Access";
        auth_basic_user_file $auth_file;
        
EOF
    fi

    cat >> "$config_file" <<EOF
    }
}
EOF

    print_success "Nginx configuration created at $config_file"
}

# Function to enable Nginx site
enable_nginx_site() {
    print_message "Enabling Nginx site..."
    
    local config_file="/etc/nginx/sites-available/$SUBDOMAIN"
    local enabled_file="/etc/nginx/sites-enabled/$SUBDOMAIN"
    
    # Remove existing symlink if exists
    if [ -L "$enabled_file" ]; then
        rm "$enabled_file"
    fi
    
    # Create symlink
    ln -s "$config_file" "$enabled_file"
    
    # Test Nginx configuration
    if nginx -t 2>&1 | grep -q "test is successful"; then
        print_success "Nginx configuration test passed"
        systemctl reload nginx
        print_success "Nginx reloaded successfully"
    else
        print_error "Nginx configuration test failed"
        nginx -t
        exit 1
    fi
}

# Function to install SSL certificate
install_ssl() {
    if [[ $INSTALL_SSL =~ ^[Yy]$ ]]; then
        print_message "Installing SSL certificate for $SUBDOMAIN..."
        
        # Check if domain is accessible
        print_warning "Make sure DNS is pointing to this server before continuing"
        read -p "Press Enter to continue or Ctrl+C to cancel..."
        
        # Install certificate
        if certbot --nginx -d "$SUBDOMAIN" --email "$SSL_EMAIL" --agree-tos --non-interactive --redirect; then
            print_success "SSL certificate installed successfully"
            print_success "Your site is now accessible via https://$SUBDOMAIN"
        else
            print_warning "SSL certificate installation failed. You can try manually later with:"
            echo "sudo certbot --nginx -d $SUBDOMAIN"
        fi
    fi
}

# Function to configure Webmin referers (if applicable)
configure_webmin() {
    if [ "$TARGET_PORT" = "10000" ] && [ -f "/etc/webmin/config" ]; then
        print_message "Detected Webmin configuration. Updating referers..."
        
        # Backup config
        cp /etc/webmin/config /etc/webmin/config.backup
        
        # Add subdomain to referers
        if grep -q "^referers=" /etc/webmin/config; then
            # Append to existing referers
            sed -i "s/^referers=\(.*\)/referers=\1 $SUBDOMAIN/" /etc/webmin/config
        else
            # Add new referers line
            echo "referers=$SUBDOMAIN" >> /etc/webmin/config
        fi
        
        # Restart Webmin if systemd service exists
        if systemctl is-active --quiet webmin; then
            systemctl restart webmin
            print_success "Webmin restarted with new referer configuration"
        else
            print_warning "Webmin service not found. Please restart Webmin manually."
        fi
    fi
}

# Function to setup firewall rules
configure_firewall() {
    if command_exists ufw; then
        print_message "Configuring UFW firewall..."
        
        # Allow Nginx
        ufw allow 'Nginx Full' >/dev/null 2>&1
        
        print_success "Firewall configured"
    fi
}

# Function to create setup summary
create_summary() {
    local summary_file="/root/subdomain-setup-$SUBDOMAIN.txt"
    
    cat > "$summary_file" <<EOF
=================================================================
Subdomain Setup Summary
=================================================================
Date: $(date)
Subdomain: $SUBDOMAIN
Target: $TARGET_PROTOCOL://$TARGET_HOST:$TARGET_PORT
SSL Installed: $INSTALL_SSL
Basic Auth: $ADD_AUTH

Configuration Files:
- Nginx Config: /etc/nginx/sites-available/$SUBDOMAIN
- Nginx Enabled: /etc/nginx/sites-enabled/$SUBDOMAIN
- Access Log: /var/log/nginx/${SUBDOMAIN}_access.log
- Error Log: /var/log/nginx/${SUBDOMAIN}_error.log

Access URLs:
- HTTP: http://$SUBDOMAIN
EOF

    if [[ $INSTALL_SSL =~ ^[Yy]$ ]]; then
        echo "- HTTPS: https://$SUBDOMAIN" >> "$summary_file"
    fi

    if [[ $ADD_AUTH =~ ^[Yy]$ ]]; then
        cat >> "$summary_file" <<EOF

Authentication:
- Username: $AUTH_USER
- Password: [provided during setup]
- Password File: /etc/nginx/.htpasswd_$SUBDOMAIN
EOF
    fi

    cat >> "$summary_file" <<EOF

Useful Commands:
- Test Nginx: sudo nginx -t
- Reload Nginx: sudo systemctl reload nginx
- View Logs: sudo tail -f /var/log/nginx/${SUBDOMAIN}_error.log
- Renew SSL: sudo certbot renew
- Edit Config: sudo nano /etc/nginx/sites-available/$SUBDOMAIN

To remove this subdomain:
1. sudo rm /etc/nginx/sites-enabled/$SUBDOMAIN
2. sudo rm /etc/nginx/sites-available/$SUBDOMAIN
3. sudo systemctl reload nginx
4. sudo certbot delete --cert-name $SUBDOMAIN

=================================================================
EOF

    print_success "Setup summary saved to $summary_file"
    cat "$summary_file"
}

# Function to test configuration
test_configuration() {
    print_message "Testing configuration..."
    
    # Test if target is accessible
    if command_exists curl; then
        if curl -s --max-time 5 "$TARGET_PROTOCOL://$TARGET_HOST:$TARGET_PORT" >/dev/null; then
            print_success "Target $TARGET_PROTOCOL://$TARGET_HOST:$TARGET_PORT is accessible"
        else
            print_warning "Cannot reach target $TARGET_PROTOCOL://$TARGET_HOST:$TARGET_PORT"
            print_warning "Make sure the service is running"
        fi
    fi
    
    # Test subdomain (basic check)
    if [[ $INSTALL_SSL =~ ^[Yy]$ ]]; then
        print_message "Testing HTTPS access..."
        sleep 2
        if curl -s --max-time 10 "https://$SUBDOMAIN" >/dev/null 2>&1; then
            print_success "HTTPS is working!"
        else
            print_warning "HTTPS test failed. This might be normal if DNS hasn't propagated yet."
        fi
    fi
}

# Main execution
main() {
    clear
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         Subdomain Setup Script for Cloudflare + VPS       ║"
    echo "║                  by Sovath.C                               ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    check_root
    install_dependencies
    get_configuration
    
    echo ""
    print_message "Starting subdomain setup..."
    echo ""
    
    create_nginx_config
    enable_nginx_site
    configure_webmin
    configure_firewall
    install_ssl
    test_configuration
    create_summary
    
    echo ""
    print_success "=== Setup Complete! ==="
    echo ""
    print_message "Next steps:"
    echo "1. Make sure DNS record is added in Cloudflare:"
    echo "   - Type: A"
    echo "   - Name: $(echo $SUBDOMAIN | cut -d'.' -f1)"
    echo "   - IPv4: Your server IP"
    echo "   - Proxy: DNS Only (Gray Cloud)"
    echo ""
    echo "2. Wait for DNS propagation (5-10 minutes)"
    echo ""
    echo "3. Access your subdomain:"
    if [[ $INSTALL_SSL =~ ^[Yy]$ ]]; then
        echo "   https://$SUBDOMAIN"
    else
        echo "   http://$SUBDOMAIN"
    fi
    echo ""
    print_message "Check the summary file at /root/subdomain-setup-$SUBDOMAIN.txt"
    echo ""
}

# Run main function
main
