#!/bin/bash

# Common utility functions for Subdomain Management System
# This file should be sourced by all main scripts

#=============================================================================
# Color Output Functions
#=============================================================================

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print colored messages
print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    if [ -n "$2" ]; then
        echo -e "${YELLOW}[HINT]${NC} $2" >&2
    fi
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

#=============================================================================
# Error Handling Functions
#=============================================================================

# Exit with error message
die() {
    print_error "$1" "$2"
    exit 1
}

# Check if command succeeded
check_success() {
    if [ $? -eq 0 ]; then
        print_success "$1"
        return 0
    else
        print_error "$2" "$3"
        return 1
    fi
}

# Validate command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        die "This script must be run as root" "Try: sudo $0"
    fi
}

#=============================================================================
# Validation Functions
#=============================================================================

# Validate domain name format
# Returns 0 if valid, 1 if invalid
validate_domain() {
    local domain="$1"
    
    # Check if domain is empty
    if [ -z "$domain" ]; then
        print_error "Domain cannot be empty"
        return 1
    fi
    
    # Check domain format using regex
    # Valid: alphanumeric, hyphens, dots
    # Must start and end with alphanumeric
    # Must have at least one dot
    if [[ ! "$domain" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$ ]]; then
        print_error "Invalid domain format: $domain" "Example: api.openplp.org"
        return 1
    fi
    
    # Check for consecutive dots
    if [[ "$domain" =~ \.\. ]]; then
        print_error "Domain cannot contain consecutive dots"
        return 1
    fi
    
    # Check for leading/trailing hyphens in labels
    if [[ "$domain" =~ (^|\.)-|-(\.|$) ]]; then
        print_error "Domain labels cannot start or end with hyphens"
        return 1
    fi
    
    return 0
}

# Validate port number
# Returns 0 if valid, 1 if invalid
validate_port() {
    local port="$1"
    
    # Check if port is empty
    if [ -z "$port" ]; then
        print_error "Port cannot be empty"
        return 1
    fi
    
    # Check if port is numeric
    if ! [[ "$port" =~ ^[0-9]+$ ]]; then
        print_error "Port must be a number: $port" "Example: 3000"
        return 1
    fi
    
    # Check port range (1-65535)
    if [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
        print_error "Port must be between 1 and 65535: $port" "Common ports: 3000, 8080, 8000"
        return 1
    fi
    
    return 0
}

# Validate email address format
# Returns 0 if valid, 1 if invalid
validate_email() {
    local email="$1"
    
    # Check if email is empty
    if [ -z "$email" ]; then
        print_error "Email cannot be empty"
        return 1
    fi
    
    # Check email format using regex
    # Basic validation: user@domain.tld
    if [[ ! "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        print_error "Invalid email format: $email" "Example: admin@example.com"
        return 1
    fi
    
    return 0
}

# Check if port is listening
# Returns 0 if listening, 1 if not
check_port_listening() {
    local port="$1"
    local host="${2:-127.0.0.1}"
    
    if command_exists ss; then
        ss -tuln | grep -q ":${port} "
        return $?
    elif command_exists netstat; then
        netstat -tuln | grep -q ":${port} "
        return $?
    else
        # Fallback: try to connect using bash
        timeout 1 bash -c "echo >/dev/tcp/${host}/${port}" 2>/dev/null
        return $?
    fi
}

#=============================================================================
# Input Functions
#=============================================================================

# Prompt for input with validation
prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local default="$3"
    local value=""
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " value
        value="${value:-$default}"
    else
        read -p "$prompt: " value
    fi
    
    eval "$var_name='$value'"
}

# Prompt for yes/no confirmation
prompt_confirm() {
    local prompt="$1"
    local default="${2:-n}"
    local response
    
    if [ "$default" = "y" ]; then
        read -p "$prompt [Y/n]: " response
        response="${response:-y}"
    else
        read -p "$prompt [y/N]: " response
        response="${response:-n}"
    fi
    
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Prompt for password (no echo)
prompt_password() {
    local prompt="$1"
    local var_name="$2"
    local password=""
    
    read -s -p "$prompt: " password
    echo
    eval "$var_name='$password'"
}

#=============================================================================
# File System Functions
#=============================================================================

# Create backup of a file
backup_file() {
    local file="$1"
    local backup="${file}.backup.$(date +%Y%m%d_%H%M%S)"
    
    if [ -f "$file" ]; then
        cp "$file" "$backup"
        print_info "Backup created: $backup"
        return 0
    else
        print_warning "File does not exist, no backup created: $file"
        return 1
    fi
}

# Restore file from backup
restore_backup() {
    local file="$1"
    local backup="$2"
    
    if [ -f "$backup" ]; then
        cp "$backup" "$file"
        print_success "Restored from backup: $backup"
        return 0
    else
        print_error "Backup file not found: $backup"
        return 1
    fi
}

#=============================================================================
# Dependency Management Functions
#=============================================================================

# Install system dependencies (nginx and certbot)
install_dependencies() {
    print_step "Checking and installing dependencies..."
    
    local needs_update=false
    
    # Check if nginx is installed
    if ! command_exists nginx; then
        print_info "Nginx not found, will install..."
        needs_update=true
    else
        print_success "Nginx is already installed"
    fi
    
    # Check if certbot is installed
    if ! command_exists certbot; then
        print_info "Certbot not found, will install..."
        needs_update=true
    else
        print_success "Certbot is already installed"
    fi
    
    # Update package cache if needed
    if [ "$needs_update" = true ]; then
        print_step "Updating package cache..."
        apt-get update -qq || die "Failed to update package cache" "Check your internet connection"
    fi
    
    # Install nginx if not present
    if ! command_exists nginx; then
        print_step "Installing nginx..."
        apt-get install -y nginx >/dev/null 2>&1 || die "Failed to install nginx" "Try running: apt-get install nginx"
        print_success "Nginx installed successfully"
    fi
    
    # Install certbot and nginx plugin if not present
    if ! command_exists certbot; then
        print_step "Installing certbot and nginx plugin..."
        apt-get install -y certbot python3-certbot-nginx >/dev/null 2>&1 || die "Failed to install certbot" "Try running: apt-get install certbot python3-certbot-nginx"
        print_success "Certbot installed successfully"
    fi
    
    # Verify installations
    print_step "Verifying installations..."
    
    if ! command_exists nginx; then
        die "Nginx installation verification failed" "Nginx command not found after installation"
    fi
    
    if ! command_exists certbot; then
        die "Certbot installation verification failed" "Certbot command not found after installation"
    fi
    
    print_success "All dependencies verified"
    
    # Enable and start nginx service
    enable_and_start_nginx
}

# Enable and start nginx service
enable_and_start_nginx() {
    print_step "Configuring nginx service..."
    
    # Enable nginx to start on boot
    if systemctl is-enabled nginx >/dev/null 2>&1; then
        print_success "Nginx is already enabled"
    else
        print_step "Enabling nginx service..."
        systemctl enable nginx >/dev/null 2>&1 || print_warning "Failed to enable nginx service"
        print_success "Nginx service enabled"
    fi
    
    # Check if nginx is running
    if systemctl is-active nginx >/dev/null 2>&1; then
        print_success "Nginx is already running"
    else
        print_step "Starting nginx service..."
        systemctl start nginx || die "Failed to start nginx service" "Check logs: journalctl -u nginx"
        print_success "Nginx service started"
    fi
    
    # Verify nginx is running
    if ! systemctl is-active nginx >/dev/null 2>&1; then
        die "Nginx service verification failed" "Service is not running after start attempt"
    fi
    
    print_success "Nginx service is running and enabled"
}

# Check if nginx service is running
check_nginx_running() {
    systemctl is-active nginx >/dev/null 2>&1
    return $?
}

# Test nginx configuration
# Returns: 0 if valid, 1 if invalid
test_nginx_config() {
    print_step "Testing nginx configuration..."
    
    local output
    output=$(nginx -t 2>&1)
    local result=$?
    
    if [ $result -eq 0 ]; then
        print_success "Nginx configuration is valid"
        return 0
    else
        print_error "Nginx configuration test failed"
        echo "$output" >&2
        return 1
    fi
}

# Reload nginx configuration with error handling
# Returns: 0 if successful, 1 if failed
reload_nginx() {
    print_step "Reloading nginx configuration..."
    
    local output
    output=$(systemctl reload nginx 2>&1)
    local result=$?
    
    if [ $result -eq 0 ]; then
        print_success "Nginx reloaded successfully"
        return 0
    else
        print_error "Failed to reload nginx" "Check configuration: nginx -t"
        echo "$output" >&2
        return 1
    fi
}

# Test nginx configuration and reload if valid
# Returns: 0 if successful, 1 if failed
test_and_reload_nginx() {
    if test_nginx_config; then
        reload_nginx
        return $?
    else
        print_error "Cannot reload nginx due to configuration errors"
        return 1
    fi
}

#=============================================================================
# Nginx Configuration Generation Functions
#=============================================================================

# Nginx configuration paths
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
NGINX_LOG_DIR="/var/log/nginx"

# Generate nginx configuration for a subdomain
# Arguments: subdomain, host, port, protocol
generate_nginx_config() {
    local subdomain="$1"
    local host="$2"
    local port="$3"
    local protocol="${4:-http}"
    
    # Validate inputs
    if [ -z "$subdomain" ] || [ -z "$host" ] || [ -z "$port" ]; then
        print_error "Missing required parameters for config generation"
        return 1
    fi
    
    # Create the configuration content
    cat <<EOF
server {
    listen 80;
    server_name ${subdomain};
    
    access_log ${NGINX_LOG_DIR}/${subdomain}_access.log;
    error_log ${NGINX_LOG_DIR}/${subdomain}_error.log;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        proxy_pass ${protocol}://${host}:${port};
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Standard proxy headers
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF
}

# Create nginx configuration file for a subdomain
# Arguments: subdomain, host, port, protocol
create_nginx_config() {
    local subdomain="$1"
    local host="$2"
    local port="$3"
    local protocol="${4:-http}"
    local config_file="${NGINX_SITES_AVAILABLE}/${subdomain}"
    
    print_step "Creating nginx configuration for ${subdomain}..."
    
    # Check if config already exists
    if [ -f "$config_file" ]; then
        print_warning "Configuration file already exists: $config_file"
        if ! prompt_confirm "Overwrite existing configuration?"; then
            print_info "Skipping configuration creation"
            return 1
        fi
        # Backup existing config
        backup_file "$config_file"
    fi
    
    # Generate and write configuration
    generate_nginx_config "$subdomain" "$host" "$port" "$protocol" > "$config_file"
    
    if [ $? -eq 0 ] && [ -f "$config_file" ]; then
        # Set proper permissions
        chmod 644 "$config_file"
        print_success "Configuration created: $config_file"
        return 0
    else
        print_error "Failed to create configuration file"
        return 1
    fi
}

# Enable a site by creating symbolic link with validation
# Arguments: subdomain
# Returns: 0 if successful, 1 if failed
enable_site() {
    local subdomain="$1"
    local config_file="${NGINX_SITES_AVAILABLE}/${subdomain}"
    local link_file="${NGINX_SITES_ENABLED}/${subdomain}"
    
    print_step "Enabling site: ${subdomain}..."
    
    # Check if config file exists
    if [ ! -f "$config_file" ]; then
        print_error "Configuration file not found: $config_file"
        return 1
    fi
    
    # Check if already enabled
    if [ -L "$link_file" ]; then
        print_warning "Site is already enabled: $subdomain"
        return 0
    fi
    
    # Create symbolic link
    if ln -s "$config_file" "$link_file" 2>/dev/null; then
        print_success "Site enabled: $subdomain"
        
        # Test nginx configuration
        if ! test_nginx_config; then
            print_error "Configuration test failed, rolling back..."
            rm "$link_file" 2>/dev/null
            print_info "Site enable rolled back"
            return 1
        fi
        
        return 0
    else
        print_error "Failed to enable site: $subdomain"
        return 1
    fi
}

# Disable a site by removing symbolic link with validation
# Arguments: subdomain
# Returns: 0 if successful, 1 if failed
disable_site() {
    local subdomain="$1"
    local link_file="${NGINX_SITES_ENABLED}/${subdomain}"
    
    print_step "Disabling site: ${subdomain}..."
    
    # Check if site is enabled
    if [ ! -L "$link_file" ]; then
        print_warning "Site is not enabled: $subdomain"
        return 0
    fi
    
    # Remove symbolic link
    if rm "$link_file" 2>/dev/null; then
        print_success "Site disabled: $subdomain"
        
        # Test nginx configuration (should still be valid)
        if ! test_nginx_config; then
            print_warning "Configuration test failed after disabling site"
            print_warning "This may indicate other configuration issues"
        fi
        
        return 0
    else
        print_error "Failed to disable site: $subdomain"
        return 1
    fi
}

# Enable site and reload nginx with rollback on failure
# Arguments: subdomain
# Returns: 0 if successful, 1 if failed
enable_site_and_reload() {
    local subdomain="$1"
    local link_file="${NGINX_SITES_ENABLED}/${subdomain}"
    local was_enabled=false
    
    # Check if already enabled
    if [ -L "$link_file" ]; then
        was_enabled=true
    fi
    
    # Enable the site
    if ! enable_site "$subdomain"; then
        return 1
    fi
    
    # Test and reload nginx
    if ! test_and_reload_nginx; then
        print_error "Failed to reload nginx, rolling back..."
        
        # Rollback: remove the link if it wasn't enabled before
        if [ "$was_enabled" = false ]; then
            rm "$link_file" 2>/dev/null
            print_info "Site enable rolled back"
        fi
        
        return 1
    fi
    
    print_success "Site enabled and nginx reloaded successfully"
    return 0
}

# Disable site and reload nginx with rollback on failure
# Arguments: subdomain
# Returns: 0 if successful, 1 if failed
disable_site_and_reload() {
    local subdomain="$1"
    local config_file="${NGINX_SITES_AVAILABLE}/${subdomain}"
    local link_file="${NGINX_SITES_ENABLED}/${subdomain}"
    
    # Check if site is enabled
    if [ ! -L "$link_file" ]; then
        print_warning "Site is not enabled: $subdomain"
        return 0
    fi
    
    # Disable the site
    if ! disable_site "$subdomain"; then
        return 1
    fi
    
    # Test and reload nginx
    if ! test_and_reload_nginx; then
        print_error "Failed to reload nginx, rolling back..."
        
        # Rollback: recreate the link
        ln -s "$config_file" "$link_file" 2>/dev/null
        print_info "Site disable rolled back"
        
        return 1
    fi
    
    print_success "Site disabled and nginx reloaded successfully"
    return 0
}

# Modify nginx configuration with backup and rollback
# Arguments: subdomain, modification_function
# Returns: 0 if successful, 1 if failed
modify_config_with_backup() {
    local subdomain="$1"
    local modification_function="$2"
    local config_file="${NGINX_SITES_AVAILABLE}/${subdomain}"
    local backup_file=""
    
    # Check if config exists
    if [ ! -f "$config_file" ]; then
        print_error "Configuration file not found: $config_file"
        return 1
    fi
    
    # Create backup
    backup_file="${config_file}.backup.$(date +%Y%m%d_%H%M%S)"
    if ! cp "$config_file" "$backup_file" 2>/dev/null; then
        print_error "Failed to create backup"
        return 1
    fi
    print_info "Backup created: $backup_file"
    
    # Execute modification function
    if ! $modification_function "$subdomain" "$config_file"; then
        print_error "Modification function failed"
        restore_backup "$config_file" "$backup_file"
        return 1
    fi
    
    # Test nginx configuration
    if ! test_nginx_config; then
        print_error "Configuration test failed, rolling back..."
        restore_backup "$config_file" "$backup_file"
        return 1
    fi
    
    # Reload nginx
    if ! reload_nginx; then
        print_error "Failed to reload nginx, rolling back..."
        restore_backup "$config_file" "$backup_file"
        test_and_reload_nginx  # Try to reload with old config
        return 1
    fi
    
    print_success "Configuration modified successfully"
    print_info "Backup available at: $backup_file"
    return 0
}

# Check if a site is enabled
# Arguments: subdomain
# Returns: 0 if enabled, 1 if not
is_site_enabled() {
    local subdomain="$1"
    local link_file="${NGINX_SITES_ENABLED}/${subdomain}"
    
    [ -L "$link_file" ]
    return $?
}

# Get list of all configured subdomains
list_configured_sites() {
    if [ -d "$NGINX_SITES_AVAILABLE" ]; then
        ls -1 "$NGINX_SITES_AVAILABLE" 2>/dev/null | grep -v "^default$"
    fi
}

# Get list of enabled subdomains
list_enabled_sites() {
    if [ -d "$NGINX_SITES_ENABLED" ]; then
        ls -1 "$NGINX_SITES_ENABLED" 2>/dev/null | grep -v "^default$"
    fi
}

# Get target (host:port) from nginx config
# Arguments: subdomain
get_site_target() {
    local subdomain="$1"
    local config_file="${NGINX_SITES_AVAILABLE}/${subdomain}"
    
    if [ -f "$config_file" ]; then
        grep "proxy_pass" "$config_file" | head -1 | sed -E 's/.*proxy_pass[[:space:]]+([^;]+);.*/\1/'
    fi
}

# Check if SSL is configured for a subdomain
# Arguments: subdomain
# Returns: 0 if SSL configured, 1 if not
is_ssl_configured() {
    local subdomain="$1"
    local config_file="${NGINX_SITES_AVAILABLE}/${subdomain}"
    
    if [ -f "$config_file" ]; then
        grep -q "listen 443 ssl" "$config_file"
        return $?
    fi
    
    return 1
}

#=============================================================================
# SSL Certificate Management Functions
#=============================================================================

# Install SSL certificate using certbot with nginx plugin
# Arguments: subdomain, email
# Returns: 0 if successful, 1 if failed
install_ssl() {
    local subdomain="$1"
    local email="$2"
    local config_file="${NGINX_SITES_AVAILABLE}/${subdomain}"
    
    print_step "Installing SSL certificate for ${subdomain}..."
    
    # Validate inputs
    if [ -z "$subdomain" ]; then
        print_error "Subdomain is required for SSL installation"
        return 1
    fi
    
    if [ -z "$email" ]; then
        print_error "Email is required for SSL installation"
        return 1
    fi
    
    # Validate email format
    if ! validate_email "$email"; then
        return 1
    fi
    
    # Check if config file exists
    if [ ! -f "$config_file" ]; then
        print_error "Configuration file not found: $config_file" "Create the subdomain first before installing SSL"
        return 1
    fi
    
    # Check if site is enabled
    if ! is_site_enabled "$subdomain"; then
        print_warning "Site is not enabled, enabling it now..."
        if ! enable_site_and_reload "$subdomain"; then
            print_error "Failed to enable site before SSL installation"
            return 1
        fi
    fi
    
    # Check if SSL is already configured
    if is_ssl_configured "$subdomain"; then
        print_warning "SSL is already configured for $subdomain"
        if ! prompt_confirm "Reinstall SSL certificate?"; then
            print_info "Skipping SSL installation"
            return 0
        fi
    fi
    
    # Create backup before SSL installation
    local backup_file="${config_file}.backup.pre-ssl.$(date +%Y%m%d_%H%M%S)"
    if ! cp "$config_file" "$backup_file" 2>/dev/null; then
        print_warning "Failed to create backup, continuing anyway..."
    else
        print_info "Backup created: $backup_file"
    fi
    
    # Run certbot with nginx plugin
    print_info "Running certbot (this may take a minute)..."
    print_info "Certbot will automatically configure HTTPS and redirect HTTP to HTTPS"
    
    local certbot_output
    certbot_output=$(certbot --nginx \
        -d "$subdomain" \
        --non-interactive \
        --agree-tos \
        --email "$email" \
        --redirect \
        2>&1)
    local result=$?
    
    if [ $result -eq 0 ]; then
        print_success "SSL certificate installed successfully for $subdomain"
        
        # Add HSTS header for SSL-enabled sites
        if add_hsts_header "$subdomain"; then
            print_success "HSTS header configured"
        else
            print_warning "Failed to add HSTS header, but SSL is working"
        fi
        
        # Reload nginx to apply HSTS changes
        reload_nginx
        
        print_info "Certificate details:"
        certbot certificates -d "$subdomain" 2>/dev/null | grep -A 10 "Certificate Name: $subdomain" || true
        
        return 0
    else
        print_error "SSL certificate installation failed"
        echo "$certbot_output" >&2
        
        # Provide troubleshooting hints
        if echo "$certbot_output" | grep -q "DNS"; then
            print_error "DNS issue detected" "Ensure DNS records are properly configured and propagated"
        elif echo "$certbot_output" | grep -q "port 80"; then
            print_error "Port 80 access issue" "Ensure port 80 is open and accessible from the internet"
        elif echo "$certbot_output" | grep -q "rate limit"; then
            print_error "Rate limit exceeded" "Let's Encrypt has rate limits. Wait and try again later"
        else
            print_error "Check the error output above for details" "Common issues: DNS not propagated, firewall blocking port 80/443"
        fi
        
        # Restore backup if available
        if [ -f "$backup_file" ]; then
            print_info "Restoring configuration from backup..."
            if restore_backup "$config_file" "$backup_file"; then
                test_and_reload_nginx
            fi
        fi
        
        return 1
    fi
}

# Check SSL status for a subdomain
# Arguments: subdomain
# Returns: 0 if SSL is configured and valid, 1 if not
check_ssl_status() {
    local subdomain="$1"
    
    if [ -z "$subdomain" ]; then
        print_error "Subdomain is required"
        return 1
    fi
    
    print_step "Checking SSL status for ${subdomain}..."
    
    # Check if SSL is configured in nginx
    if ! is_ssl_configured "$subdomain"; then
        print_info "SSL is not configured for $subdomain"
        return 1
    fi
    
    print_success "SSL is configured in nginx"
    
    # Check certbot for certificate details
    if command_exists certbot; then
        local cert_info
        cert_info=$(certbot certificates 2>/dev/null | grep -A 15 "Certificate Name: $subdomain" || true)
        
        if [ -n "$cert_info" ]; then
            print_success "SSL certificate found in certbot"
            echo "$cert_info"
            
            # Check expiry
            if echo "$cert_info" | grep -q "VALID"; then
                print_success "Certificate is valid"
                return 0
            else
                print_warning "Certificate may be expired or invalid"
                return 1
            fi
        else
            print_warning "Certificate not found in certbot, but nginx is configured for SSL"
            print_info "This may indicate a manual SSL configuration"
            return 0
        fi
    else
        print_warning "Certbot not installed, cannot check certificate details"
        return 0
    fi
}

# List all SSL certificates managed by certbot
# Returns: 0 if successful, 1 if failed
list_certificates() {
    print_step "Listing SSL certificates..."
    
    if ! command_exists certbot; then
        print_error "Certbot is not installed" "Install certbot to manage SSL certificates"
        return 1
    fi
    
    local cert_list
    cert_list=$(certbot certificates 2>&1)
    local result=$?
    
    if [ $result -eq 0 ]; then
        if echo "$cert_list" | grep -q "No certificates found"; then
            print_info "No SSL certificates found"
            return 0
        else
            echo "$cert_list"
            return 0
        fi
    else
        print_error "Failed to list certificates"
        echo "$cert_list" >&2
        return 1
    fi
}

# Remove SSL certificate for a subdomain
# Arguments: subdomain, remove_cert (optional, default: prompt)
# Returns: 0 if successful, 1 if failed
remove_certificate() {
    local subdomain="$1"
    local remove_cert="${2:-prompt}"
    
    if [ -z "$subdomain" ]; then
        print_error "Subdomain is required"
        return 1
    fi
    
    print_step "Removing SSL certificate for ${subdomain}..."
    
    # Check if SSL is configured
    if ! is_ssl_configured "$subdomain"; then
        print_info "SSL is not configured for $subdomain, nothing to remove"
        return 0
    fi
    
    # Confirm removal if not specified
    if [ "$remove_cert" = "prompt" ]; then
        if ! prompt_confirm "Remove SSL certificate for $subdomain?"; then
            print_info "Certificate removal cancelled"
            return 0
        fi
    fi
    
    # Check if certbot is installed
    if ! command_exists certbot; then
        print_warning "Certbot is not installed, cannot remove certificate"
        print_info "You may need to manually remove SSL configuration from nginx"
        return 1
    fi
    
    # Remove certificate using certbot
    print_info "Removing certificate with certbot..."
    local certbot_output
    certbot_output=$(certbot delete --cert-name "$subdomain" --non-interactive 2>&1)
    local result=$?
    
    if [ $result -eq 0 ]; then
        print_success "SSL certificate removed successfully"
        
        # Note: Certbot should have already updated the nginx config
        # but we'll reload nginx to be sure
        if reload_nginx; then
            print_success "Nginx configuration reloaded"
        else
            print_warning "Failed to reload nginx, you may need to reload manually"
        fi
        
        return 0
    else
        # Check if certificate doesn't exist
        if echo "$certbot_output" | grep -q "No certificate found"; then
            print_info "Certificate not found in certbot"
            print_info "SSL may be manually configured in nginx"
            return 0
        else
            print_error "Failed to remove certificate"
            echo "$certbot_output" >&2
            return 1
        fi
    fi
}

# Add HSTS (HTTP Strict Transport Security) header to SSL-enabled site
# Arguments: subdomain
# Returns: 0 if successful, 1 if failed
add_hsts_header() {
    local subdomain="$1"
    local config_file="${NGINX_SITES_AVAILABLE}/${subdomain}"
    
    if [ -z "$subdomain" ]; then
        print_error "Subdomain is required"
        return 1
    fi
    
    # Check if config file exists
    if [ ! -f "$config_file" ]; then
        print_error "Configuration file not found: $config_file"
        return 1
    fi
    
    # Check if SSL is configured
    if ! is_ssl_configured "$subdomain"; then
        print_warning "SSL is not configured, HSTS header not applicable"
        return 1
    fi
    
    # Check if HSTS header already exists
    if grep -q "Strict-Transport-Security" "$config_file"; then
        print_info "HSTS header already configured"
        return 0
    fi
    
    print_step "Adding HSTS header to ${subdomain}..."
    
    # Find the SSL server block and add HSTS header after other security headers
    # We'll add it after the X-Content-Type-Options header in the SSL block
    local temp_file="${config_file}.tmp"
    local in_ssl_block=false
    local hsts_added=false
    
    while IFS= read -r line; do
        echo "$line"
        
        # Detect SSL server block
        if echo "$line" | grep -q "listen 443 ssl"; then
            in_ssl_block=true
        fi
        
        # Add HSTS after X-Content-Type-Options in SSL block
        if [ "$in_ssl_block" = true ] && [ "$hsts_added" = false ] && echo "$line" | grep -q "X-Content-Type-Options"; then
            echo '    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;'
            hsts_added=true
        fi
        
        # Reset when exiting server block
        if echo "$line" | grep -q "^}"; then
            in_ssl_block=false
        fi
    done < "$config_file" > "$temp_file"
    
    # Replace original file if HSTS was added
    if [ "$hsts_added" = true ]; then
        mv "$temp_file" "$config_file"
        chmod 644 "$config_file"
        print_success "HSTS header added successfully"
        return 0
    else
        rm -f "$temp_file"
        print_warning "Could not add HSTS header (SSL block not found or already configured)"
        return 1
    fi
}

# Install SSL with full error handling and rollback
# Arguments: subdomain, email
# Returns: 0 if successful, 1 if failed
install_ssl_safe() {
    local subdomain="$1"
    local email="$2"
    
    # Validate inputs
    if [ -z "$subdomain" ] || [ -z "$email" ]; then
        print_error "Subdomain and email are required"
        return 1
    fi
    
    # Check prerequisites
    if ! command_exists certbot; then
        print_error "Certbot is not installed" "Run install_dependencies first"
        return 1
    fi
    
    # Attempt SSL installation
    if install_ssl "$subdomain" "$email"; then
        print_success "SSL installation completed successfully"
        print_info "Your site is now accessible via HTTPS"
        print_info "HTTP requests will automatically redirect to HTTPS"
        return 0
    else
        print_error "SSL installation failed"
        print_info "Your site is still accessible via HTTP"
        print_info "You can try installing SSL again later with: certbot --nginx -d $subdomain"
        return 1
    fi
}

#=============================================================================
# Initialization
#=============================================================================

# Note: Strict error handling should be enabled by the calling script
# The following are recommended settings:
# set -e  # Exit on error
# set -u  # Exit on undefined variable
# set -o pipefail  # Exit on pipe failure
# trap 'print_error "Script failed at line $LINENO"' ERR

#=============================================================================
# HTTP Basic Authentication Functions
#=============================================================================

# Nginx htpasswd file directory
NGINX_HTPASSWD_DIR="/etc/nginx"

# Create htpasswd file with bcrypt hashing
# Arguments: subdomain, username, password
# Returns: 0 if successful, 1 if failed
create_htpasswd() {
    local subdomain="$1"
    local username="$2"
    local password="$3"
    local htpasswd_file="${NGINX_HTPASSWD_DIR}/.htpasswd_${subdomain}"
    
    print_step "Creating htpasswd file for ${subdomain}..."
    
    # Validate inputs
    if [ -z "$subdomain" ] || [ -z "$username" ] || [ -z "$password" ]; then
        print_error "Subdomain, username, and password are required"
        return 1
    fi
    
    # Check if htpasswd command exists (from apache2-utils package)
    if ! command_exists htpasswd; then
        print_info "Installing apache2-utils for htpasswd command..."
        apt-get update -qq >/dev/null 2>&1
        apt-get install -y apache2-utils >/dev/null 2>&1 || {
            print_error "Failed to install apache2-utils" "Try: apt-get install apache2-utils"
            return 1
        }
        print_success "apache2-utils installed"
    fi
    
    # Check if htpasswd file already exists
    if [ -f "$htpasswd_file" ]; then
        print_warning "htpasswd file already exists: $htpasswd_file"
        if ! prompt_confirm "Overwrite existing htpasswd file?"; then
            print_info "Skipping htpasswd file creation"
            return 0
        fi
        # Backup existing file
        backup_file "$htpasswd_file"
    fi
    
    # Create htpasswd file with bcrypt hashing (-B flag)
    # Use -c to create new file, -B for bcrypt
    print_info "Generating password hash with bcrypt..."
    if echo "$password" | htpasswd -ciB "$htpasswd_file" "$username" >/dev/null 2>&1; then
        print_success "htpasswd file created: $htpasswd_file"
    else
        print_error "Failed to create htpasswd file"
        return 1
    fi
    
    # Set proper file permissions (640: owner read/write, group read, others none)
    if chmod 640 "$htpasswd_file" 2>/dev/null; then
        print_success "File permissions set to 640"
    else
        print_warning "Failed to set file permissions"
    fi
    
    # Set ownership to root:root
    if chown root:root "$htpasswd_file" 2>/dev/null; then
        print_success "File ownership set to root:root"
    else
        print_warning "Failed to set file ownership"
    fi
    
    print_success "HTTP Basic Authentication configured for $subdomain"
    print_info "Username: $username"
    print_info "htpasswd file: $htpasswd_file"
    
    return 0
}

# Add auth_basic directives to nginx configuration
# Arguments: subdomain
# Returns: 0 if successful, 1 if failed
add_auth_to_config() {
    local subdomain="$1"
    local config_file="${NGINX_SITES_AVAILABLE}/${subdomain}"
    local htpasswd_file="${NGINX_HTPASSWD_DIR}/.htpasswd_${subdomain}"
    
    print_step "Adding authentication directives to nginx config..."
    
    # Validate subdomain
    if [ -z "$subdomain" ]; then
        print_error "Subdomain is required"
        return 1
    fi
    
    # Check if config file exists
    if [ ! -f "$config_file" ]; then
        print_error "Configuration file not found: $config_file"
        return 1
    fi
    
    # Check if htpasswd file exists
    if [ ! -f "$htpasswd_file" ]; then
        print_error "htpasswd file not found: $htpasswd_file" "Create htpasswd file first using create_htpasswd"
        return 1
    fi
    
    # Check if auth is already configured
    if grep -q "auth_basic" "$config_file"; then
        print_warning "Authentication is already configured in $config_file"
        if ! prompt_confirm "Reconfigure authentication?"; then
            print_info "Skipping authentication configuration"
            return 0
        fi
    fi
    
    # Create backup before modification
    local backup_file="${config_file}.backup.$(date +%Y%m%d_%H%M%S)"
    if ! cp "$config_file" "$backup_file" 2>/dev/null; then
        print_error "Failed to create backup"
        return 1
    fi
    print_info "Backup created: $backup_file"
    
    # Add auth_basic directives to the location block
    # We'll add them right after the "location / {" line
    local temp_file="${config_file}.tmp"
    local auth_added=false
    
    while IFS= read -r line; do
        echo "$line"
        
        # Add auth directives after "location / {" line
        if [ "$auth_added" = false ] && echo "$line" | grep -q "location / {"; then
            echo "        auth_basic \"Restricted Access\";"
            echo "        auth_basic_user_file ${htpasswd_file};"
            echo ""
            auth_added=true
        fi
    done < "$config_file" > "$temp_file"
    
    # Replace original file if auth was added
    if [ "$auth_added" = true ]; then
        mv "$temp_file" "$config_file"
        chmod 644 "$config_file"
        print_success "Authentication directives added to nginx config"
        
        # Test nginx configuration
        if ! test_nginx_config; then
            print_error "Configuration test failed, rolling back..."
            restore_backup "$config_file" "$backup_file"
            return 1
        fi
        
        # Reload nginx
        if ! reload_nginx; then
            print_error "Failed to reload nginx, rolling back..."
            restore_backup "$config_file" "$backup_file"
            test_and_reload_nginx
            return 1
        fi
        
        print_success "HTTP Basic Authentication enabled for $subdomain"
        return 0
    else
        rm -f "$temp_file"
        print_error "Could not add authentication directives (location block not found)"
        return 1
    fi
}

# Setup HTTP Basic Authentication (combined function)
# Arguments: subdomain, username, password
# Returns: 0 if successful, 1 if failed
setup_basic_auth() {
    local subdomain="$1"
    local username="$2"
    local password="$3"
    
    # Validate inputs
    if [ -z "$subdomain" ] || [ -z "$username" ] || [ -z "$password" ]; then
        print_error "Subdomain, username, and password are required"
        return 1
    fi
    
    # Create htpasswd file
    if ! create_htpasswd "$subdomain" "$username" "$password"; then
        print_error "Failed to create htpasswd file"
        return 1
    fi
    
    # Add auth directives to nginx config
    if ! add_auth_to_config "$subdomain"; then
        print_error "Failed to add authentication to nginx config"
        return 1
    fi
    
    print_success "HTTP Basic Authentication setup completed for $subdomain"
    return 0
}

# Setup HTTP Basic Authentication with interactive prompts
# Arguments: subdomain
# Returns: 0 if successful, 1 if failed
setup_basic_auth_interactive() {
    local subdomain="$1"
    local username=""
    local password=""
    local password_confirm=""
    
    # Validate subdomain
    if [ -z "$subdomain" ]; then
        print_error "Subdomain is required"
        return 1
    fi
    
    print_step "Setting up HTTP Basic Authentication for ${subdomain}..."
    
    # Prompt for username
    prompt_input "Enter username for authentication" username "admin"
    
    if [ -z "$username" ]; then
        print_error "Username cannot be empty"
        return 1
    fi
    
    # Prompt for password (no echo)
    while true; do
        prompt_password "Enter password" password
        
        if [ -z "$password" ]; then
            print_error "Password cannot be empty"
            continue
        fi
        
        # Confirm password
        prompt_password "Confirm password" password_confirm
        
        if [ "$password" = "$password_confirm" ]; then
            break
        else
            print_error "Passwords do not match, please try again"
        fi
    done
    
    # Setup authentication
    if setup_basic_auth "$subdomain" "$username" "$password"; then
        print_success "Authentication configured successfully"
        print_info "Username: $username"
        print_info "Users will be prompted for credentials when accessing $subdomain"
        return 0
    else
        print_error "Failed to setup authentication"
        return 1
    fi
}

# Remove HTTP Basic Authentication from a subdomain
# Arguments: subdomain
# Returns: 0 if successful, 1 if failed
remove_basic_auth() {
    local subdomain="$1"
    local config_file="${NGINX_SITES_AVAILABLE}/${subdomain}"
    local htpasswd_file="${NGINX_HTPASSWD_DIR}/.htpasswd_${subdomain}"
    
    print_step "Removing HTTP Basic Authentication from ${subdomain}..."
    
    # Validate subdomain
    if [ -z "$subdomain" ]; then
        print_error "Subdomain is required"
        return 1
    fi
    
    # Check if config file exists
    if [ ! -f "$config_file" ]; then
        print_error "Configuration file not found: $config_file"
        return 1
    fi
    
    # Check if auth is configured
    if ! grep -q "auth_basic" "$config_file"; then
        print_info "Authentication is not configured for $subdomain"
        return 0
    fi
    
    # Create backup before modification
    local backup_file="${config_file}.backup.$(date +%Y%m%d_%H%M%S)"
    if ! cp "$config_file" "$backup_file" 2>/dev/null; then
        print_error "Failed to create backup"
        return 1
    fi
    print_info "Backup created: $backup_file"
    
    # Remove auth_basic directives from config
    local temp_file="${config_file}.tmp"
    grep -v "auth_basic" "$config_file" > "$temp_file"
    
    mv "$temp_file" "$config_file"
    chmod 644 "$config_file"
    print_success "Authentication directives removed from nginx config"
    
    # Test nginx configuration
    if ! test_nginx_config; then
        print_error "Configuration test failed, rolling back..."
        restore_backup "$config_file" "$backup_file"
        return 1
    fi
    
    # Reload nginx
    if ! reload_nginx; then
        print_error "Failed to reload nginx, rolling back..."
        restore_backup "$config_file" "$backup_file"
        test_and_reload_nginx
        return 1
    fi
    
    # Remove htpasswd file if it exists
    if [ -f "$htpasswd_file" ]; then
        if rm "$htpasswd_file" 2>/dev/null; then
            print_success "htpasswd file removed: $htpasswd_file"
        else
            print_warning "Failed to remove htpasswd file: $htpasswd_file"
        fi
    fi
    
    print_success "HTTP Basic Authentication removed from $subdomain"
    return 0
}

# Check if HTTP Basic Authentication is configured for a subdomain
# Arguments: subdomain
# Returns: 0 if configured, 1 if not
is_auth_configured() {
    local subdomain="$1"
    local config_file="${NGINX_SITES_AVAILABLE}/${subdomain}"
    
    if [ -f "$config_file" ]; then
        grep -q "auth_basic" "$config_file"
        return $?
    fi
    
    return 1
}

#=============================================================================
# Logging and Monitoring Functions
#=============================================================================

# Get log file paths for a subdomain
# Arguments: subdomain, log_type (access|error)
# Returns: log file path
get_log_path() {
    local subdomain="$1"
    local log_type="${2:-error}"
    
    if [ -z "$subdomain" ]; then
        print_error "Subdomain is required"
        return 1
    fi
    
    case "$log_type" in
        access)
            echo "${NGINX_LOG_DIR}/${subdomain}_access.log"
            ;;
        error)
            echo "${NGINX_LOG_DIR}/${subdomain}_error.log"
            ;;
        *)
            print_error "Invalid log type: $log_type" "Valid types: access, error"
            return 1
            ;;
    esac
}

# Check if log file exists for a subdomain
# Arguments: subdomain, log_type (access|error)
# Returns: 0 if exists, 1 if not
log_file_exists() {
    local subdomain="$1"
    local log_type="${2:-error}"
    local log_file
    
    log_file=$(get_log_path "$subdomain" "$log_type")
    
    if [ -f "$log_file" ]; then
        return 0
    else
        return 1
    fi
}

# View last N lines of logs for a subdomain
# Arguments: subdomain, log_type (access|error), lines (default: 50)
# Returns: 0 if successful, 1 if failed
view_logs() {
    local subdomain="$1"
    local log_type="${2:-error}"
    local lines="${3:-50}"
    local log_file
    
    # Validate subdomain
    if [ -z "$subdomain" ]; then
        print_error "Subdomain is required"
        return 1
    fi
    
    # Validate lines is a number
    if ! [[ "$lines" =~ ^[0-9]+$ ]]; then
        print_error "Lines must be a number: $lines"
        return 1
    fi
    
    # Get log file path
    log_file=$(get_log_path "$subdomain" "$log_type")
    
    if [ -z "$log_file" ]; then
        return 1
    fi
    
    # Check if log file exists
    if [ ! -f "$log_file" ]; then
        print_warning "Log file not found: $log_file"
        print_info "The log file will be created when the subdomain receives traffic"
        return 1
    fi
    
    # Check if log file is empty
    if [ ! -s "$log_file" ]; then
        print_info "Log file is empty: $log_file"
        print_info "No log entries yet for $subdomain"
        return 0
    fi
    
    # Display log header
    print_step "Showing last $lines lines of $log_type log for ${subdomain}:"
    echo "----------------------------------------"
    
    # Display last N lines
    tail -n "$lines" "$log_file"
    
    echo "----------------------------------------"
    print_info "Log file: $log_file"
    
    return 0
}

# Follow logs in real-time (tail -f)
# Arguments: subdomain, log_type (access|error)
# Returns: 0 if successful, 1 if failed
tail_logs() {
    local subdomain="$1"
    local log_type="${2:-error}"
    local log_file
    
    # Validate subdomain
    if [ -z "$subdomain" ]; then
        print_error "Subdomain is required"
        return 1
    fi
    
    # Get log file path
    log_file=$(get_log_path "$subdomain" "$log_type")
    
    if [ -z "$log_file" ]; then
        return 1
    fi
    
    # Check if log file exists
    if [ ! -f "$log_file" ]; then
        print_warning "Log file not found: $log_file"
        print_info "Creating log file and waiting for entries..."
        # Create empty log file with proper permissions
        touch "$log_file" 2>/dev/null || {
            print_error "Failed to create log file" "Check permissions"
            return 1
        }
        chmod 640 "$log_file" 2>/dev/null
    fi
    
    # Display header
    print_step "Following $log_type log for ${subdomain} in real-time..."
    print_info "Press Ctrl+C to stop"
    echo "----------------------------------------"
    
    # Follow log file in real-time
    tail -f "$log_file"
    
    return 0
}

# View logs with interactive selection
# Arguments: subdomain
# Returns: 0 if successful, 1 if failed
view_logs_interactive() {
    local subdomain="$1"
    local log_type=""
    local lines=""
    local follow=""
    
    # Validate subdomain
    if [ -z "$subdomain" ]; then
        print_error "Subdomain is required"
        return 1
    fi
    
    # Check if subdomain exists
    local config_file="${NGINX_SITES_AVAILABLE}/${subdomain}"
    if [ ! -f "$config_file" ]; then
        print_error "Subdomain not found: $subdomain"
        return 1
    fi
    
    print_step "Log viewer for ${subdomain}"
    echo ""
    
    # Select log type
    echo "Select log type:"
    echo "  1) Error log (default)"
    echo "  2) Access log"
    read -p "Enter choice [1-2]: " choice
    
    case "$choice" in
        2)
            log_type="access"
            ;;
        *)
            log_type="error"
            ;;
    esac
    
    # Ask if user wants to follow logs
    if prompt_confirm "Follow logs in real-time?"; then
        tail_logs "$subdomain" "$log_type"
        return $?
    else
        # Ask for number of lines
        read -p "Number of lines to display [50]: " lines
        lines="${lines:-50}"
        
        view_logs "$subdomain" "$log_type" "$lines"
        return $?
    fi
}

# Display log statistics for a subdomain
# Arguments: subdomain
# Returns: 0 if successful, 1 if failed
show_log_stats() {
    local subdomain="$1"
    local access_log="${NGINX_LOG_DIR}/${subdomain}_access.log"
    local error_log="${NGINX_LOG_DIR}/${subdomain}_error.log"
    
    # Validate subdomain
    if [ -z "$subdomain" ]; then
        print_error "Subdomain is required"
        return 1
    fi
    
    print_step "Log statistics for ${subdomain}:"
    echo ""
    
    # Access log stats
    if [ -f "$access_log" ]; then
        local access_lines=$(wc -l < "$access_log" 2>/dev/null || echo "0")
        local access_size=$(du -h "$access_log" 2>/dev/null | cut -f1 || echo "0")
        print_info "Access log: $access_lines lines, $access_size"
        
        if [ "$access_lines" -gt 0 ]; then
            # Show last access time
            local last_access=$(tail -n 1 "$access_log" 2>/dev/null | grep -oP '\[\K[^\]]+' | head -1 || echo "N/A")
            print_info "Last access: $last_access"
        fi
    else
        print_warning "Access log not found"
    fi
    
    echo ""
    
    # Error log stats
    if [ -f "$error_log" ]; then
        local error_lines=$(wc -l < "$error_log" 2>/dev/null || echo "0")
        local error_size=$(du -h "$error_log" 2>/dev/null | cut -f1 || echo "0")
        print_info "Error log: $error_lines lines, $error_size"
        
        if [ "$error_lines" -gt 0 ]; then
            # Show last error time
            local last_error=$(tail -n 1 "$error_log" 2>/dev/null | grep -oP '\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}' | head -1 || echo "N/A")
            print_info "Last error: $last_error"
        fi
    else
        print_warning "Error log not found"
    fi
    
    echo ""
    print_info "Log directory: $NGINX_LOG_DIR"
    
    return 0
}

# Set appropriate log file permissions
# Arguments: subdomain
# Returns: 0 if successful, 1 if failed
set_log_permissions() {
    local subdomain="$1"
    local access_log="${NGINX_LOG_DIR}/${subdomain}_access.log"
    local error_log="${NGINX_LOG_DIR}/${subdomain}_error.log"
    
    # Validate subdomain
    if [ -z "$subdomain" ]; then
        print_error "Subdomain is required"
        return 1
    fi
    
    print_step "Setting log file permissions for ${subdomain}..."
    
    local success=true
    
    # Set permissions for access log if it exists
    if [ -f "$access_log" ]; then
        if chmod 640 "$access_log" 2>/dev/null; then
            print_success "Access log permissions set to 640"
        else
            print_error "Failed to set access log permissions"
            success=false
        fi
    fi
    
    # Set permissions for error log if it exists
    if [ -f "$error_log" ]; then
        if chmod 640 "$error_log" 2>/dev/null; then
            print_success "Error log permissions set to 640"
        else
            print_error "Failed to set error log permissions"
            success=false
        fi
    fi
    
    if [ "$success" = true ]; then
        print_success "Log file permissions configured"
        return 0
    else
        return 1
    fi
}

# List all log files for configured subdomains
# Returns: 0 if successful, 1 if failed
list_all_logs() {
    print_step "Listing all subdomain log files..."
    echo ""
    
    if [ ! -d "$NGINX_LOG_DIR" ]; then
        print_error "Nginx log directory not found: $NGINX_LOG_DIR"
        return 1
    fi
    
    # Find all subdomain log files (exclude default nginx logs)
    local log_files=$(find "$NGINX_LOG_DIR" -name "*_access.log" -o -name "*_error.log" 2>/dev/null | grep -v "access.log$" | grep -v "error.log$" | sort)
    
    if [ -z "$log_files" ]; then
        print_info "No subdomain log files found"
        return 0
    fi
    
    echo "Log files:"
    echo "$log_files" | while read -r log_file; do
        local size=$(du -h "$log_file" 2>/dev/null | cut -f1 || echo "0")
        local lines=$(wc -l < "$log_file" 2>/dev/null || echo "0")
        echo "  $log_file ($size, $lines lines)"
    done
    
    echo ""
    print_info "Total log files: $(echo "$log_files" | wc -l)"
    
    return 0
}

# Clear/rotate log file for a subdomain
# Arguments: subdomain, log_type (access|error|all)
# Returns: 0 if successful, 1 if failed
clear_logs() {
    local subdomain="$1"
    local log_type="${2:-all}"
    
    # Validate subdomain
    if [ -z "$subdomain" ]; then
        print_error "Subdomain is required"
        return 1
    fi
    
    print_step "Clearing logs for ${subdomain}..."
    
    # Confirm action
    if ! prompt_confirm "Are you sure you want to clear logs for $subdomain?"; then
        print_info "Log clearing cancelled"
        return 0
    fi
    
    local success=true
    
    # Clear access log
    if [ "$log_type" = "access" ] || [ "$log_type" = "all" ]; then
        local access_log="${NGINX_LOG_DIR}/${subdomain}_access.log"
        if [ -f "$access_log" ]; then
            if > "$access_log" 2>/dev/null; then
                print_success "Access log cleared"
            else
                print_error "Failed to clear access log"
                success=false
            fi
        fi
    fi
    
    # Clear error log
    if [ "$log_type" = "error" ] || [ "$log_type" = "all" ]; then
        local error_log="${NGINX_LOG_DIR}/${subdomain}_error.log"
        if [ -f "$error_log" ]; then
            if > "$error_log" 2>/dev/null; then
                print_success "Error log cleared"
            else
                print_error "Failed to clear error log"
                success=false
            fi
        fi
    fi
    
    if [ "$success" = true ]; then
        print_success "Logs cleared for $subdomain"
        return 0
    else
        return 1
    fi
}
