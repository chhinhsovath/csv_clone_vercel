#!/bin/bash

# Test script for HTTP Basic Authentication functions
# This script tests the authentication module functions

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the common library
source "${SCRIPT_DIR}/common.sh"

# Test configuration
TEST_SUBDOMAIN="test-auth.openplp.org"
TEST_USERNAME="testuser"
TEST_PASSWORD="testpass123"
TEST_CONFIG_FILE="${NGINX_SITES_AVAILABLE}/${TEST_SUBDOMAIN}"
TEST_HTPASSWD_FILE="${NGINX_HTPASSWD_DIR}/.htpasswd_${TEST_SUBDOMAIN}"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test result tracking
test_result() {
    local test_name="$1"
    local result="$2"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if [ "$result" -eq 0 ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        print_success "✓ Test $TESTS_RUN: $test_name"
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        print_error "✗ Test $TESTS_RUN: $test_name"
    fi
}

# Cleanup function
cleanup() {
    print_step "Cleaning up test files..."
    
    # Remove test htpasswd file
    if [ -f "$TEST_HTPASSWD_FILE" ]; then
        rm -f "$TEST_HTPASSWD_FILE"
        rm -f "${TEST_HTPASSWD_FILE}.backup."*
    fi
    
    # Remove test nginx config
    if [ -f "$TEST_CONFIG_FILE" ]; then
        rm -f "$TEST_CONFIG_FILE"
        rm -f "${TEST_CONFIG_FILE}.backup."*
        rm -f "${TEST_CONFIG_FILE}.tmp"
    fi
    
    # Remove test site from sites-enabled
    if [ -L "${NGINX_SITES_ENABLED}/${TEST_SUBDOMAIN}" ]; then
        rm -f "${NGINX_SITES_ENABLED}/${TEST_SUBDOMAIN}"
    fi
    
    print_success "Cleanup completed"
}

# Setup test environment
setup_test_env() {
    print_step "Setting up test environment..."
    
    # Create a test nginx config
    cat > "$TEST_CONFIG_FILE" <<'EOF'
server {
    listen 80;
    server_name test-auth.openplp.org;
    
    access_log /var/log/nginx/test-auth.openplp.org_access.log;
    error_log /var/log/nginx/test-auth.openplp.org_error.log;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
    
    chmod 644 "$TEST_CONFIG_FILE"
    print_success "Test environment ready"
}

# Run tests
run_tests() {
    print_info "Starting HTTP Basic Authentication function tests..."
    echo ""
    
    # Test 1: Check if htpasswd command exists or can be installed
    print_step "Test 1: Checking htpasswd availability..."
    if command_exists htpasswd; then
        test_result "htpasswd command is available" 0
    else
        print_warning "htpasswd not found, will be installed by create_htpasswd"
        test_result "htpasswd command check (will be installed)" 0
    fi
    
    # Test 2: Create htpasswd file
    print_step "Test 2: Creating htpasswd file..."
    if create_htpasswd "$TEST_SUBDOMAIN" "$TEST_USERNAME" "$TEST_PASSWORD" >/dev/null 2>&1; then
        test_result "create_htpasswd function" 0
    else
        test_result "create_htpasswd function" 1
    fi
    
    # Test 3: Verify htpasswd file exists
    print_step "Test 3: Verifying htpasswd file exists..."
    if [ -f "$TEST_HTPASSWD_FILE" ]; then
        test_result "htpasswd file exists" 0
    else
        test_result "htpasswd file exists" 1
    fi
    
    # Test 4: Verify htpasswd file permissions
    print_step "Test 4: Checking htpasswd file permissions..."
    if [ -f "$TEST_HTPASSWD_FILE" ]; then
        local perms=$(stat -f "%Lp" "$TEST_HTPASSWD_FILE" 2>/dev/null || stat -c "%a" "$TEST_HTPASSWD_FILE" 2>/dev/null)
        if [ "$perms" = "640" ]; then
            test_result "htpasswd file permissions (640)" 0
        else
            print_warning "Permissions are: $perms (expected: 640)"
            test_result "htpasswd file permissions (640)" 1
        fi
    else
        test_result "htpasswd file permissions (640)" 1
    fi
    
    # Test 5: Verify htpasswd file contains bcrypt hash
    print_step "Test 5: Verifying bcrypt hash in htpasswd file..."
    if [ -f "$TEST_HTPASSWD_FILE" ]; then
        if grep -q '^\$2[aby]\$' "$TEST_HTPASSWD_FILE"; then
            test_result "htpasswd file contains bcrypt hash" 0
        else
            print_warning "Hash format not recognized as bcrypt"
            test_result "htpasswd file contains bcrypt hash" 1
        fi
    else
        test_result "htpasswd file contains bcrypt hash" 1
    fi
    
    # Test 6: Add auth directives to nginx config
    print_step "Test 6: Adding auth directives to nginx config..."
    if add_auth_to_config "$TEST_SUBDOMAIN" >/dev/null 2>&1; then
        test_result "add_auth_to_config function" 0
    else
        test_result "add_auth_to_config function" 1
    fi
    
    # Test 7: Verify auth_basic directive in config
    print_step "Test 7: Verifying auth_basic directive in config..."
    if grep -q "auth_basic" "$TEST_CONFIG_FILE"; then
        test_result "auth_basic directive present" 0
    else
        test_result "auth_basic directive present" 1
    fi
    
    # Test 8: Verify auth_basic_user_file directive in config
    print_step "Test 8: Verifying auth_basic_user_file directive in config..."
    if grep -q "auth_basic_user_file.*\.htpasswd_${TEST_SUBDOMAIN}" "$TEST_CONFIG_FILE"; then
        test_result "auth_basic_user_file directive present" 0
    else
        test_result "auth_basic_user_file directive present" 1
    fi
    
    # Test 9: Check if auth is configured
    print_step "Test 9: Checking is_auth_configured function..."
    if is_auth_configured "$TEST_SUBDOMAIN"; then
        test_result "is_auth_configured returns true" 0
    else
        test_result "is_auth_configured returns true" 1
    fi
    
    # Test 10: Remove basic auth
    print_step "Test 10: Removing basic auth..."
    if remove_basic_auth "$TEST_SUBDOMAIN" >/dev/null 2>&1; then
        test_result "remove_basic_auth function" 0
    else
        test_result "remove_basic_auth function" 1
    fi
    
    # Test 11: Verify auth directives removed from config
    print_step "Test 11: Verifying auth directives removed..."
    if ! grep -q "auth_basic" "$TEST_CONFIG_FILE"; then
        test_result "auth directives removed from config" 0
    else
        test_result "auth directives removed from config" 1
    fi
    
    # Test 12: Verify htpasswd file removed
    print_step "Test 12: Verifying htpasswd file removed..."
    if [ ! -f "$TEST_HTPASSWD_FILE" ]; then
        test_result "htpasswd file removed" 0
    else
        test_result "htpasswd file removed" 1
    fi
    
    # Test 13: Check if auth is not configured after removal
    print_step "Test 13: Checking is_auth_configured after removal..."
    if ! is_auth_configured "$TEST_SUBDOMAIN"; then
        test_result "is_auth_configured returns false after removal" 0
    else
        test_result "is_auth_configured returns false after removal" 1
    fi
    
    # Test 14: Test setup_basic_auth combined function
    print_step "Test 14: Testing setup_basic_auth combined function..."
    if setup_basic_auth "$TEST_SUBDOMAIN" "$TEST_USERNAME" "$TEST_PASSWORD" >/dev/null 2>&1; then
        test_result "setup_basic_auth function" 0
    else
        test_result "setup_basic_auth function" 1
    fi
    
    # Test 15: Verify complete setup
    print_step "Test 15: Verifying complete auth setup..."
    if [ -f "$TEST_HTPASSWD_FILE" ] && grep -q "auth_basic" "$TEST_CONFIG_FILE"; then
        test_result "complete auth setup verification" 0
    else
        test_result "complete auth setup verification" 1
    fi
}

# Main execution
main() {
    echo "========================================"
    echo "HTTP Basic Authentication Function Tests"
    echo "========================================"
    echo ""
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "This test script must be run as root" "Try: sudo $0"
        exit 1
    fi
    
    # Setup test environment
    setup_test_env
    echo ""
    
    # Run tests
    run_tests
    
    # Cleanup
    echo ""
    cleanup
    
    # Print summary
    echo ""
    echo "========================================"
    echo "Test Summary"
    echo "========================================"
    echo "Total tests run: $TESTS_RUN"
    print_success "Tests passed: $TESTS_PASSED"
    if [ $TESTS_FAILED -gt 0 ]; then
        print_error "Tests failed: $TESTS_FAILED"
    else
        print_success "Tests failed: $TESTS_FAILED"
    fi
    echo "========================================"
    
    # Exit with appropriate code
    if [ $TESTS_FAILED -eq 0 ]; then
        print_success "All tests passed!"
        exit 0
    else
        print_error "Some tests failed"
        exit 1
    fi
}

# Run main function
main "$@"
