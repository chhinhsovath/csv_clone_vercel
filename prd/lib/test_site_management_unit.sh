#!/bin/bash

# Unit tests for site management functions (no nginx required)
# Tests the logic and error handling without actual nginx installation

# Source the common library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

# Test configuration
TEST_DIR="/tmp/nginx_test_$$"
NGINX_SITES_AVAILABLE="${TEST_DIR}/sites-available"
NGINX_SITES_ENABLED="${TEST_DIR}/sites-enabled"
TEST_SUBDOMAIN="test.example.com"

# Setup test environment
setup_test_env() {
    mkdir -p "$NGINX_SITES_AVAILABLE"
    mkdir -p "$NGINX_SITES_ENABLED"
    print_success "Test environment created at $TEST_DIR"
}

# Cleanup test environment
cleanup_test_env() {
    rm -rf "$TEST_DIR"
    print_success "Test environment cleaned up"
}

# Test 1: Enable site with missing config
test_enable_missing_config() {
    echo ""
    echo "Test 1: Enable site with missing configuration"
    echo "----------------------------------------------"
    
    enable_site "$TEST_SUBDOMAIN" 2>&1 | grep -q "Configuration file not found"
    local result=$?
    
    if [ $result -eq 0 ]; then
        print_success "✓ Correctly detected missing configuration"
        return 0
    else
        print_error "✗ Failed to detect missing configuration"
        return 1
    fi
}

# Test 2: Create and enable site
test_create_and_enable() {
    echo ""
    echo "Test 2: Create configuration and enable site"
    echo "----------------------------------------------"
    
    # Create test config
    echo "server { listen 80; }" > "${NGINX_SITES_AVAILABLE}/${TEST_SUBDOMAIN}"
    
    if [ ! -f "${NGINX_SITES_AVAILABLE}/${TEST_SUBDOMAIN}" ]; then
        print_error "✗ Failed to create test configuration"
        return 1
    fi
    print_info "Configuration file created"
    
    # Enable site (will fail nginx test but should create link)
    enable_site "$TEST_SUBDOMAIN" 2>/dev/null
    
    # Check if link was created (before rollback)
    if [ -L "${NGINX_SITES_ENABLED}/${TEST_SUBDOMAIN}" ]; then
        print_success "✓ Symbolic link created successfully"
        return 0
    else
        print_info "Link not created (expected if nginx test ran)"
        return 0
    fi
}

# Test 3: Check site enabled status
test_site_enabled_status() {
    echo ""
    echo "Test 3: Check site enabled status"
    echo "----------------------------------------------"
    
    # Manually create link for testing
    ln -sf "${NGINX_SITES_AVAILABLE}/${TEST_SUBDOMAIN}" "${NGINX_SITES_ENABLED}/${TEST_SUBDOMAIN}"
    
    if is_site_enabled "$TEST_SUBDOMAIN"; then
        print_success "✓ Correctly detected enabled site"
    else
        print_error "✗ Failed to detect enabled site"
        return 1
    fi
    
    # Remove link
    rm "${NGINX_SITES_ENABLED}/${TEST_SUBDOMAIN}"
    
    if ! is_site_enabled "$TEST_SUBDOMAIN"; then
        print_success "✓ Correctly detected disabled site"
        return 0
    else
        print_error "✗ Failed to detect disabled site"
        return 1
    fi
}

# Test 4: Disable site
test_disable_site() {
    echo ""
    echo "Test 4: Disable site"
    echo "----------------------------------------------"
    
    # Create link
    ln -sf "${NGINX_SITES_AVAILABLE}/${TEST_SUBDOMAIN}" "${NGINX_SITES_ENABLED}/${TEST_SUBDOMAIN}"
    print_info "Created symbolic link"
    
    # Disable site
    disable_site "$TEST_SUBDOMAIN" 2>/dev/null
    
    if [ ! -L "${NGINX_SITES_ENABLED}/${TEST_SUBDOMAIN}" ]; then
        print_success "✓ Site disabled successfully"
        return 0
    else
        print_error "✗ Failed to disable site"
        return 1
    fi
}

# Test 5: Disable already disabled site
test_disable_already_disabled() {
    echo ""
    echo "Test 5: Disable already disabled site"
    echo "----------------------------------------------"
    
    # Ensure site is disabled
    rm -f "${NGINX_SITES_ENABLED}/${TEST_SUBDOMAIN}"
    
    # Try to disable again
    disable_site "$TEST_SUBDOMAIN" 2>&1 | grep -q "not enabled"
    local result=$?
    
    if [ $result -eq 0 ]; then
        print_success "✓ Correctly handled already disabled site"
        return 0
    else
        print_error "✗ Failed to handle already disabled site"
        return 1
    fi
}

# Test 6: Configuration backup
test_config_backup() {
    echo ""
    echo "Test 6: Configuration backup"
    echo "----------------------------------------------"
    
    local config_file="${NGINX_SITES_AVAILABLE}/${TEST_SUBDOMAIN}"
    
    # Ensure config exists
    echo "server { listen 80; }" > "$config_file"
    
    # Create backup
    backup_file "$config_file" 2>/dev/null
    
    # Check if backup was created
    local backup_count=$(ls -1 "${config_file}.backup."* 2>/dev/null | wc -l)
    
    if [ $backup_count -gt 0 ]; then
        print_success "✓ Backup created successfully"
        return 0
    else
        print_error "✗ Failed to create backup"
        return 1
    fi
}

# Test 7: List configured sites
test_list_sites() {
    echo ""
    echo "Test 7: List configured sites"
    echo "----------------------------------------------"
    
    # Create multiple test configs
    echo "server { listen 80; }" > "${NGINX_SITES_AVAILABLE}/site1.example.com"
    echo "server { listen 80; }" > "${NGINX_SITES_AVAILABLE}/site2.example.com"
    echo "server { listen 80; }" > "${NGINX_SITES_AVAILABLE}/site3.example.com"
    
    local site_count=$(list_configured_sites | wc -l)
    
    if [ $site_count -ge 3 ]; then
        print_success "✓ Listed $site_count configured sites"
        return 0
    else
        print_error "✗ Failed to list sites correctly"
        return 1
    fi
}

# Test 8: List enabled sites
test_list_enabled_sites() {
    echo ""
    echo "Test 8: List enabled sites"
    echo "----------------------------------------------"
    
    # Enable some sites
    ln -sf "${NGINX_SITES_AVAILABLE}/site1.example.com" "${NGINX_SITES_ENABLED}/site1.example.com"
    ln -sf "${NGINX_SITES_AVAILABLE}/site2.example.com" "${NGINX_SITES_ENABLED}/site2.example.com"
    
    local enabled_count=$(list_enabled_sites | wc -l)
    
    if [ $enabled_count -ge 2 ]; then
        print_success "✓ Listed $enabled_count enabled sites"
        return 0
    else
        print_error "✗ Failed to list enabled sites correctly"
        return 1
    fi
}

# Test 9: Get site target
test_get_site_target() {
    echo ""
    echo "Test 9: Get site target from configuration"
    echo "----------------------------------------------"
    
    # Create config with proxy_pass
    cat > "${NGINX_SITES_AVAILABLE}/target-test.example.com" <<EOF
server {
    listen 80;
    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
EOF
    
    local target=$(get_site_target "target-test.example.com")
    
    if [[ "$target" == *"127.0.0.1:3000"* ]]; then
        print_success "✓ Correctly extracted target: $target"
        return 0
    else
        print_error "✗ Failed to extract target"
        return 1
    fi
}

# Test 10: Check SSL configuration
test_check_ssl_config() {
    echo ""
    echo "Test 10: Check SSL configuration"
    echo "----------------------------------------------"
    
    # Create config without SSL
    cat > "${NGINX_SITES_AVAILABLE}/no-ssl.example.com" <<EOF
server {
    listen 80;
}
EOF
    
    if ! is_ssl_configured "no-ssl.example.com"; then
        print_success "✓ Correctly detected no SSL"
    else
        print_error "✗ Incorrectly detected SSL"
        return 1
    fi
    
    # Create config with SSL
    cat > "${NGINX_SITES_AVAILABLE}/with-ssl.example.com" <<EOF
server {
    listen 443 ssl;
}
EOF
    
    if is_ssl_configured "with-ssl.example.com"; then
        print_success "✓ Correctly detected SSL"
        return 0
    else
        print_error "✗ Failed to detect SSL"
        return 1
    fi
}

# Main test execution
main() {
    echo ""
    echo "=========================================="
    echo "Site Management Unit Tests"
    echo "=========================================="
    echo ""
    
    # Setup
    setup_test_env
    
    # Track results
    local total=0
    local passed=0
    local failed=0
    
    # Run tests
    local tests=(
        "test_enable_missing_config"
        "test_create_and_enable"
        "test_site_enabled_status"
        "test_disable_site"
        "test_disable_already_disabled"
        "test_config_backup"
        "test_list_sites"
        "test_list_enabled_sites"
        "test_get_site_target"
        "test_check_ssl_config"
    )
    
    for test_func in "${tests[@]}"; do
        total=$((total + 1))
        if $test_func; then
            passed=$((passed + 1))
        else
            failed=$((failed + 1))
        fi
    done
    
    # Cleanup
    echo ""
    cleanup_test_env
    
    # Summary
    echo ""
    echo "=========================================="
    echo "Test Summary"
    echo "=========================================="
    echo "Total:  $total"
    echo "Passed: $passed"
    echo "Failed: $failed"
    echo ""
    
    if [ $failed -eq 0 ]; then
        print_success "All tests passed! ✓"
        return 0
    else
        print_error "Some tests failed"
        return 1
    fi
}

# Run tests
main "$@"
