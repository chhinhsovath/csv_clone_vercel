#!/bin/bash

# Example script demonstrating usage of common.sh utilities
# This is for reference only and not part of the main system

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the common library
source "${SCRIPT_DIR}/common.sh"

# Enable strict error handling
set -e
set -u
set -o pipefail
trap 'print_error "Script failed at line $LINENO"' ERR

echo "========================================="
echo "Common Library Usage Examples"
echo "========================================="
echo

# Example 1: Color output
print_step "Example 1: Color Output Functions"
print_success "This is a success message"
print_error "This is an error message" "This is a helpful hint"
print_warning "This is a warning message"
print_info "This is an info message"
echo

# Example 2: Command existence check
print_step "Example 2: Command Existence Check"
if command_exists bash; then
    print_success "bash command exists"
else
    print_error "bash command not found"
fi

if command_exists nonexistent_command; then
    print_success "nonexistent_command exists"
else
    print_warning "nonexistent_command not found (expected)"
fi
echo

# Example 3: Domain validation
print_step "Example 3: Domain Validation"
test_domains=("api.openplp.org" "invalid..domain" "test.com")
for domain in "${test_domains[@]}"; do
    if validate_domain "$domain"; then
        print_success "Valid domain: $domain"
    else
        print_warning "Invalid domain: $domain"
    fi
done
echo

# Example 4: Port validation
print_step "Example 4: Port Validation"
test_ports=(3000 0 65535 99999 "abc")
for port in "${test_ports[@]}"; do
    if validate_port "$port"; then
        print_success "Valid port: $port"
    else
        print_warning "Invalid port: $port"
    fi
done
echo

# Example 5: Email validation
print_step "Example 5: Email Validation"
test_emails=("admin@example.com" "invalid@" "user@domain.org")
for email in "${test_emails[@]}"; do
    if validate_email "$email"; then
        print_success "Valid email: $email"
    else
        print_warning "Invalid email: $email"
    fi
done
echo

# Example 6: File backup
print_step "Example 6: File Backup (demonstration only)"
print_info "backup_file() would create: /path/to/file.backup.YYYYMMDD_HHMMSS"
echo

print_success "All examples completed successfully!"
