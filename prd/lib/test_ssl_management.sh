#!/bin/bash

# Test script for SSL certificate management functions
# This script tests the SSL management functions in common.sh

# Source the common library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

# Disable strict error handling for tests
set +e

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test helper function
run_test() {
    local test_name="$1"
    local expected_result="$2"
    shift 2
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    # Run the command and capture result
    "$@" >/dev/null 2>&1
    local actual_result=$?
    
    if [ "$actual_result" -eq "$expected_result" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} $test_name (expected: $expected_result, got: $actual_result)"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Function existence test
test_function_exists() {
    local func_name="$1"
    if declare -f "$func_name" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Function exists: $func_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} Function missing: $func_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    TESTS_RUN=$((TESTS_RUN + 1))
}

echo "========================================="
echo "Testing SSL Management Functions"
echo "========================================="
echo

# Test function existence
echo "Function Existence Tests:"
echo "-------------------------"
test_function_exists "install_ssl"
test_function_exists "check_ssl_status"
test_function_exists "list_certificates"
test_function_exists "remove_certificate"
test_function_exists "add_hsts_header"
test_function_exists "install_ssl_safe"
echo

# Test is_ssl_configured function
echo "SSL Configuration Detection Tests:"
echo "-----------------------------------"

# Create temporary test directory
TEST_DIR="/tmp/ssl_test_$$"
mkdir -p "$TEST_DIR"

# Override nginx paths for testing
NGINX_SITES_AVAILABLE="$TEST_DIR/sites-available"
NGINX_SITES_ENABLED="$TEST_DIR/sites-enabled"
mkdir -p "$NGINX_SITES_AVAILABLE"
mkdir -p "$NGINX_SITES_ENABLED"

# Test 1: Non-existent subdomain
run_test "SSL not configured: non-existent subdomain" 1 is_ssl_configured "nonexistent.test.com"

# Test 2: Subdomain without SSL
cat > "$NGINX_SITES_AVAILABLE/nossl.test.com" <<'EOF'
server {
    listen 80;
    server_name nossl.test.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
EOF
run_test "SSL not configured: HTTP only config" 1 is_ssl_configured "nossl.test.com"

# Test 3: Subdomain with SSL
cat > "$NGINX_SITES_AVAILABLE/ssl.test.com" <<'EOF'
server {
    listen 80;
    server_name ssl.test.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name ssl.test.com;
    
    ssl_certificate /etc/letsencrypt/live/ssl.test.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ssl.test.com/privkey.pem;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
EOF
run_test "SSL configured: HTTPS config detected" 0 is_ssl_configured "ssl.test.com"

# Test 4: Check SSL status with invalid input
run_test "Check SSL status: empty subdomain" 1 check_ssl_status ""

# Test 5: Check SSL status for non-SSL site
run_test "Check SSL status: non-SSL site" 1 check_ssl_status "nossl.test.com"

# Test 6: List certificates (should work even if no certs)
echo "Testing list_certificates function:"
if command_exists certbot; then
    list_certificates >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} list_certificates executed successfully"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} list_certificates failed"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
else
    echo -e "${YELLOW}⊘${NC} list_certificates skipped (certbot not installed)"
fi
TESTS_RUN=$((TESTS_RUN + 1))

echo

# Test HSTS header addition
echo "HSTS Header Tests:"
echo "------------------"

# Test adding HSTS to SSL-enabled site
cat > "$NGINX_SITES_AVAILABLE/hsts-test.com" <<'EOF'
server {
    listen 80;
    server_name hsts-test.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name hsts-test.com;
    
    ssl_certificate /etc/letsencrypt/live/hsts-test.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hsts-test.com/privkey.pem;
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
EOF

# Add HSTS header
add_hsts_header "hsts-test.com" >/dev/null 2>&1
if grep -q "Strict-Transport-Security" "$NGINX_SITES_AVAILABLE/hsts-test.com"; then
    echo -e "${GREEN}✓${NC} HSTS header added successfully"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗${NC} HSTS header not added"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_RUN=$((TESTS_RUN + 1))

# Test HSTS header already exists
add_hsts_header "hsts-test.com" >/dev/null 2>&1
hsts_count=$(grep -c "Strict-Transport-Security" "$NGINX_SITES_AVAILABLE/hsts-test.com")
if [ "$hsts_count" -eq 1 ]; then
    echo -e "${GREEN}✓${NC} HSTS header not duplicated"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗${NC} HSTS header duplicated (count: $hsts_count)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_RUN=$((TESTS_RUN + 1))

# Test HSTS on non-SSL site
run_test "HSTS on non-SSL site: should fail" 1 add_hsts_header "nossl.test.com"

echo

# Cleanup
rm -rf "$TEST_DIR"

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Tests run:    $TESTS_RUN"
echo "Tests passed: $TESTS_PASSED"
echo "Tests failed: $TESTS_FAILED"
echo

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
