#!/bin/bash

# Demo script for HTTP Basic Authentication functions
# This script demonstrates how to use the authentication module

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the common library
source "${SCRIPT_DIR}/common.sh"

# Demo configuration
DEMO_SUBDOMAIN="demo.openplp.org"
DEMO_USERNAME="admin"
DEMO_PASSWORD="demo123"

echo "========================================"
echo "HTTP Basic Authentication Demo"
echo "========================================"
echo ""

print_info "This demo shows how to use the authentication functions"
echo ""

# Demo 1: Create htpasswd file
print_step "Demo 1: Creating htpasswd file"
echo "Command: create_htpasswd \"$DEMO_SUBDOMAIN\" \"$DEMO_USERNAME\" \"$DEMO_PASSWORD\""
echo ""
print_info "This will:"
print_info "  - Install apache2-utils if needed"
print_info "  - Create /etc/nginx/.htpasswd_${DEMO_SUBDOMAIN}"
print_info "  - Hash password with bcrypt"
print_info "  - Set permissions to 640"
print_info "  - Set ownership to root:root"
echo ""

# Demo 2: Add auth to nginx config
print_step "Demo 2: Adding authentication to nginx config"
echo "Command: add_auth_to_config \"$DEMO_SUBDOMAIN\""
echo ""
print_info "This will:"
print_info "  - Add auth_basic \"Restricted Access\" directive"
print_info "  - Add auth_basic_user_file directive"
print_info "  - Create backup before modification"
print_info "  - Test nginx configuration"
print_info "  - Reload nginx"
print_info "  - Rollback on failure"
echo ""

# Demo 3: Combined setup
print_step "Demo 3: Combined authentication setup"
echo "Command: setup_basic_auth \"$DEMO_SUBDOMAIN\" \"$DEMO_USERNAME\" \"$DEMO_PASSWORD\""
echo ""
print_info "This combines both steps above into one function"
echo ""

# Demo 4: Interactive setup
print_step "Demo 4: Interactive authentication setup"
echo "Command: setup_basic_auth_interactive \"$DEMO_SUBDOMAIN\""
echo ""
print_info "This will:"
print_info "  - Prompt for username (default: admin)"
print_info "  - Prompt for password (no echo)"
print_info "  - Prompt for password confirmation"
print_info "  - Setup authentication"
echo ""

# Demo 5: Check if auth is configured
print_step "Demo 5: Check authentication status"
echo "Command: is_auth_configured \"$DEMO_SUBDOMAIN\""
echo ""
print_info "Returns 0 if configured, 1 if not"
echo ""

# Demo 6: Remove authentication
print_step "Demo 6: Remove authentication"
echo "Command: remove_basic_auth \"$DEMO_SUBDOMAIN\""
echo ""
print_info "This will:"
print_info "  - Remove auth_basic directives from nginx config"
print_info "  - Create backup before modification"
print_info "  - Test nginx configuration"
print_info "  - Remove htpasswd file"
print_info "  - Reload nginx"
print_info "  - Rollback on failure"
echo ""

# Example usage in a script
print_step "Example: Using in a setup script"
echo ""
cat <<'EOF'
#!/bin/bash
source "$(dirname "$0")/lib/common.sh"

# Check if running as root
check_root

# Setup subdomain
SUBDOMAIN="api.openplp.org"

# Ask if user wants authentication
if prompt_confirm "Enable HTTP Basic Authentication?"; then
    # Interactive setup
    if setup_basic_auth_interactive "$SUBDOMAIN"; then
        print_success "Authentication enabled successfully"
    else
        print_error "Failed to enable authentication"
    fi
fi

# Or use non-interactive setup
# setup_basic_auth "$SUBDOMAIN" "admin" "secure_password"
EOF
echo ""

print_step "Security Features"
echo ""
print_info "✓ Bcrypt password hashing"
print_info "✓ Secure password input (no echo)"
print_info "✓ File permissions: 640"
print_info "✓ Root ownership"
print_info "✓ Automatic backup and rollback"
print_info "✓ Nginx configuration testing"
echo ""

print_step "File Locations"
echo ""
print_info "htpasswd files: /etc/nginx/.htpasswd_[subdomain]"
print_info "Nginx configs: /etc/nginx/sites-available/[subdomain]"
echo ""

print_success "Demo completed!"
print_info "For more details, see: lib/AUTH_FUNCTIONS.md"
