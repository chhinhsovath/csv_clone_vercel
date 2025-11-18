#!/bin/bash

# Test script for dependency management functions
# This script tests the core dependency management module

# Source the common library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

echo "=========================================="
echo "Testing Dependency Management Module"
echo "=========================================="
echo

# Test 1: Check root function
echo "Test 1: Testing check_root() function"
echo "----------------------------------------"
if [ "$EUID" -eq 0 ]; then
    print_success "Running as root"
    check_root
    echo "check_root() passed (running as root)"
else
    print_info "Not running as root (expected for this test)"
    echo "To test check_root() fully, run with sudo"
fi
echo

# Test 2: Command existence checker
echo "Test 2: Testing command_exists() function"
echo "----------------------------------------"
if command_exists bash; then
    print_success "command_exists('bash') returned true (correct)"
else
    print_error "command_exists('bash') returned false (incorrect)"
fi

if command_exists nonexistent_command_xyz; then
    print_error "command_exists('nonexistent_command_xyz') returned true (incorrect)"
else
    print_success "command_exists('nonexistent_command_xyz') returned false (correct)"
fi
echo

# Test 3: Check if nginx is installed
echo "Test 3: Checking nginx installation status"
echo "----------------------------------------"
if command_exists nginx; then
    print_success "Nginx is installed"
    nginx -v 2>&1 | head -n1
else
    print_info "Nginx is not installed"
fi
echo

# Test 4: Check if certbot is installed
echo "Test 4: Checking certbot installation status"
echo "----------------------------------------"
if command_exists certbot; then
    print_success "Certbot is installed"
    certbot --version 2>&1 | head -n1
else
    print_info "Certbot is not installed"
fi
echo

# Test 5: Check nginx service status (if running as root)
if [ "$EUID" -eq 0 ]; then
    echo "Test 5: Checking nginx service status"
    echo "----------------------------------------"
    if check_nginx_running; then
        print_success "Nginx service is running"
    else
        print_info "Nginx service is not running"
    fi
    echo
    
    # Test 6: Test nginx configuration (if nginx is installed)
    if command_exists nginx; then
        echo "Test 6: Testing nginx configuration"
        echo "----------------------------------------"
        test_nginx_config
        echo
    fi
else
    print_info "Skipping service tests (requires root privileges)"
    echo
fi

# Test 7: Verify all required functions exist
echo "Test 7: Verifying all required functions exist"
echo "----------------------------------------"
required_functions=(
    "check_root"
    "command_exists"
    "install_dependencies"
    "enable_and_start_nginx"
    "check_nginx_running"
    "reload_nginx"
    "test_nginx_config"
)

all_exist=true
for func in "${required_functions[@]}"; do
    if declare -f "$func" >/dev/null; then
        print_success "Function '$func' exists"
    else
        print_error "Function '$func' is missing"
        all_exist=false
    fi
done
echo

if [ "$all_exist" = true ]; then
    echo "=========================================="
    print_success "All dependency management tests passed!"
    echo "=========================================="
    exit 0
else
    echo "=========================================="
    print_error "Some tests failed"
    echo "=========================================="
    exit 1
fi
