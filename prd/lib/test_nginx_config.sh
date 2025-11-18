#!/bin/bash

# Test script for Nginx configuration generation module

# Source the common library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

echo "Testing Nginx Configuration Generation Module"
echo "=============================================="
echo

# Test 1: Generate basic configuration
echo "Test 1: Generate basic nginx configuration"
echo "-------------------------------------------"
config_output=$(generate_nginx_config "api.openplp.org" "127.0.0.1" "3000" "http")

if [ $? -eq 0 ]; then
    echo "✓ Configuration generated successfully"
else
    echo "✗ Failed to generate configuration"
    exit 1
fi

# Test 2: Verify required directives are present
echo
echo "Test 2: Verify required directives"
echo "-----------------------------------"

required_directives=(
    "listen 80"
    "server_name api.openplp.org"
    "access_log /var/log/nginx/api.openplp.org_access.log"
    "error_log /var/log/nginx/api.openplp.org_error.log"
    "proxy_pass http://127.0.0.1:3000"
    "proxy_http_version 1.1"
)

all_passed=true
for directive in "${required_directives[@]}"; do
    if echo "$config_output" | grep -q "$directive"; then
        echo "✓ Found: $directive"
    else
        echo "✗ Missing: $directive"
        all_passed=false
    fi
done

# Test 3: Verify WebSocket support headers
echo
echo "Test 3: Verify WebSocket support headers"
echo "-----------------------------------------"

websocket_headers=(
    "proxy_set_header Upgrade"
    "proxy_set_header Connection"
)

for header in "${websocket_headers[@]}"; do
    if echo "$config_output" | grep -q "$header"; then
        echo "✓ Found: $header"
    else
        echo "✗ Missing: $header"
        all_passed=false
    fi
done

# Test 4: Verify proxy headers
echo
echo "Test 4: Verify proxy headers"
echo "-----------------------------"

proxy_headers=(
    "proxy_set_header Host"
    "proxy_set_header X-Real-IP"
    "proxy_set_header X-Forwarded-For"
    "proxy_set_header X-Forwarded-Proto"
)

for header in "${proxy_headers[@]}"; do
    if echo "$config_output" | grep -q "$header"; then
        echo "✓ Found: $header"
    else
        echo "✗ Missing: $header"
        all_passed=false
    fi
done

# Test 5: Verify timeout values
echo
echo "Test 5: Verify timeout values (60 seconds)"
echo "-------------------------------------------"

timeout_directives=(
    "proxy_connect_timeout 60s"
    "proxy_send_timeout 60s"
    "proxy_read_timeout 60s"
)

for directive in "${timeout_directives[@]}"; do
    if echo "$config_output" | grep -q "$directive"; then
        echo "✓ Found: $directive"
    else
        echo "✗ Missing: $directive"
        all_passed=false
    fi
done

# Test 6: Verify security headers
echo
echo "Test 6: Verify security headers"
echo "--------------------------------"

security_headers=(
    'add_header X-Frame-Options "SAMEORIGIN" always'
    'add_header X-XSS-Protection "1; mode=block" always'
    'add_header X-Content-Type-Options "nosniff" always'
)

for header in "${security_headers[@]}"; do
    if echo "$config_output" | grep -q "$header"; then
        echo "✓ Found: $header"
    else
        echo "✗ Missing: $header"
        all_passed=false
    fi
done

# Test 7: Test with HTTPS protocol
echo
echo "Test 7: Generate configuration with HTTPS protocol"
echo "---------------------------------------------------"
https_config=$(generate_nginx_config "secure.openplp.org" "127.0.0.1" "8443" "https")

if echo "$https_config" | grep -q "proxy_pass https://127.0.0.1:8443"; then
    echo "✓ HTTPS protocol correctly configured"
else
    echo "✗ HTTPS protocol not configured correctly"
    all_passed=false
fi

# Final result
echo
echo "=============================================="
if [ "$all_passed" = true ]; then
    echo "✓ All tests passed!"
    exit 0
else
    echo "✗ Some tests failed"
    exit 1
fi
