#!/bin/bash

# Test script for site management functions
# This script tests enable, disable, backup, and rollback functionality

# Source the common library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

# Test configuration
TEST_SUBDOMAIN="test.example.com"
TEST_HOST="127.0.0.1"
TEST_PORT="8080"
TEST_PROTOCOL="http"

# Color output for test results
print_test_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
}

print_test_result() {
    if [ $1 -eq 0 ]; then
        print_success "TEST PASSED: $2"
    else
        print_error "TEST FAILED: $2"
    fi
}

# Cleanup function
cleanup_test() {
    print_info "Cleaning up test files..."
    
    # Remove test configuration
    rm -f "${NGINX_SITES_AVAILABLE}/${TEST_SUBDOMAIN}" 2>/dev/null
    rm -f "${NGINX_SITES_ENABLED}/${TEST_SUBDOMAIN}" 2>/dev/null
    rm -f "${NGINX_SITES_AVAILABLE}/${TEST_SUBDOMAIN}.backup."* 2>/dev/null
    
    print_success "Cleanup complete"
}

# Test 1: Test nginx configuration validation
test_nginx_config_validation() {
    print_test_header "Test 1: Nginx Configuration Validation"
    
    # This should pass if nginx is installed and configured correctly
    test_nginx_config
    local result=$?
    
    print_test_result $result "Nginx configuration validation"
    return $result
}

# Test 2: Create test configuration
test_create_config() {
    print_test_header "Test 2: Create Test Configuration"
    
    # Generate test config
    generate_nginx_config "$TEST_SUBDOMAIN" "$TEST_HOST" "$TEST_PORT" "$TEST_PROTOCOL" > "${NGINX_SITES_AVAILABLE}/${TEST_SUBDOMAIN}"
    
    if [ -f "${NGINX_SITES_AVAILABLE}/${TEST_SUBDOMAIN}" ]; then
        print_test_result 0 "Configuration file created"
        return 0
    else
        print_test_result 1 "Configuration file creation"
        return 1
    fi
}

# Test 3: Enable site
test_enable_site() {
    print_test_header "Test 3: Enable Site"
    
    enable_site "$TEST_SUBDOMAIN"
    local result=$?
    
    # Verify symbolic link exists
    if [ -L "${NGINX_SITES_ENABLED}/${TEST_SUBDOMAIN}" ]; then
        print_test_result 0 "Site enabled successfully"
        return 0
    else
        print_test_result 1 "Site enable - symbolic link not created"
        return 1
    fi
}

# Test 4: Check if site is enabled
test_is_site_enabled() {
    print_test_header "Test 4: Check Site Enabled Status"
    
    if is_site_enabled "$TEST_SUBDOMAIN"; then
        print_test_result 0 "Site enabled status check"
        return 0
    else
        print_test_result 1 "Site enabled status check"
        return 1
    fi
}

# Test 5: Disable site
test_disable_site() {
    print_test_header "Test 5: Disable Site"
    
    disable_site "$TEST_SUBDOMAIN"
    local result=$?
    
    # Verify symbolic link is removed
    if [ ! -L "${NGINX_SITES_ENABLED}/${TEST_SUBDOMAIN}" ]; then
        print_test_result 0 "Site disabled successfully"
        return 0
    else
        print_test_result 1 "Site disable - symbolic link still exists"
        return 1
    fi
}

# Test 6: Check if site is disabled
test_is_site_disabled() {
    print_test_header "Test 6: Check Site Disabled Status"
    
    if ! is_site_enabled "$TEST_SUBDOMAIN"; then
        print_test_result 0 "Site disabled status check"
        return 0
    else
        print_test_result 1 "Site disabled status check"
        return 1
    fi
}

# Test 7: Configuration backup
test_config_backup() {
    print_test_header "Test 7: Configuration Backup"
    
    backup_file "${NGINX_SITES_AVAILABLE}/${TEST_SUBDOMAIN}"
    local result=$?
    
    # Check if backup was created
    local backup_count=$(ls -1 "${NGINX_SITES_AVAILABLE}/${TEST_SUBDOMAIN}.backup."* 2>/dev/null | wc -l)
    
    if [ $backup_count -gt 0 ]; then
        print_test_result 0 "Configuration backup created"
        return 0
    else
        print_test_result 1 "Configuration backup"
        return 1
    fi
}

# Test 8: Enable site with validation
test_enable_with_validation() {
    print_test_header "Test 8: Enable Site with Validation"
    
    # First disable if enabled
    disable_site "$TEST_SUBDOMAIN" 2>/dev/null
    
    # Enable with validation
    enable_site "$TEST_SUBDOMAIN"
    local result=$?
    
    print_test_result $result "Enable site with nginx validation"
    return $result
}

# Test 9: Disable site with validation
test_disable_with_validation() {
    print_test_header "Test 9: Disable Site with Validation"
    
    disable_site "$TEST_SUBDOMAIN"
    local result=$?
    
    print_test_result $result "Disable site with nginx validation"
    return $result
}

# Test 10: Test and reload nginx
test_test_and_reload() {
    print_test_header "Test 10: Test and Reload Nginx"
    
    test_and_reload_nginx
    local result=$?
    
    print_test_result $result "Test and reload nginx"
    return $result
}

# Main test execution
main() {
    print_info "Starting Site Management Function Tests"
    print_info "Test subdomain: $TEST_SUBDOMAIN"
    echo ""
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_warning "Not running as root - some tests may fail"
        print_info "Run with: sudo $0"
        echo ""
    fi
    
    # Track test results
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    # Run tests
    local tests=(
        "test_nginx_config_validation"
        "test_create_config"
        "test_enable_site"
        "test_is_site_enabled"
        "test_disable_site"
        "test_is_site_disabled"
        "test_config_backup"
        "test_enable_with_validation"
        "test_disable_with_validation"
        "test_test_and_reload"
    )
    
    for test_func in "${tests[@]}"; do
        total_tests=$((total_tests + 1))
        
        if $test_func; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
    done
    
    # Cleanup
    cleanup_test
    
    # Print summary
    echo ""
    print_test_header "Test Summary"
    echo "Total Tests: $total_tests"
    echo "Passed: $passed_tests"
    echo "Failed: $failed_tests"
    echo ""
    
    if [ $failed_tests -eq 0 ]; then
        print_success "All tests passed!"
        return 0
    else
        print_error "Some tests failed"
        return 1
    fi
}

# Run main function
main "$@"
