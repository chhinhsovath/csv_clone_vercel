#!/bin/bash

# Test script for validation functions
# This script tests the validation functions in common.sh

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

echo "========================================="
echo "Testing Validation Functions"
echo "========================================="
echo

# Domain validation tests
echo "Domain Validation Tests:"
echo "-------------------------"
run_test "Valid domain: api.openplp.org" 0 validate_domain "api.openplp.org"
run_test "Valid domain: sub-domain.example.com" 0 validate_domain "sub-domain.example.com"
run_test "Valid domain: test123.example.org" 0 validate_domain "test123.example.org"
run_test "Invalid domain: empty string" 1 validate_domain ""
run_test "Invalid domain: no TLD" 1 validate_domain "subdomain"
run_test "Invalid domain: consecutive dots" 1 validate_domain "invalid..domain.com"
run_test "Invalid domain: starts with hyphen" 1 validate_domain "-invalid.domain.com"
run_test "Invalid domain: ends with hyphen" 1 validate_domain "invalid-.domain.com"
run_test "Invalid domain: special characters" 1 validate_domain "invalid@domain.com"
echo

# Port validation tests
echo "Port Validation Tests:"
echo "----------------------"
run_test "Valid port: 3000" 0 validate_port "3000"
run_test "Valid port: 80" 0 validate_port "80"
run_test "Valid port: 443" 0 validate_port "443"
run_test "Valid port: 8080" 0 validate_port "8080"
run_test "Valid port: 65535 (max)" 0 validate_port "65535"
run_test "Valid port: 1 (min)" 0 validate_port "1"
run_test "Invalid port: 0" 1 validate_port "0"
run_test "Invalid port: 65536 (too high)" 1 validate_port "65536"
run_test "Invalid port: -1 (negative)" 1 validate_port "-1"
run_test "Invalid port: abc (non-numeric)" 1 validate_port "abc"
run_test "Invalid port: empty string" 1 validate_port ""
run_test "Invalid port: 3000abc (mixed)" 1 validate_port "3000abc"
echo

# Email validation tests
echo "Email Validation Tests:"
echo "-----------------------"
run_test "Valid email: admin@example.com" 0 validate_email "admin@example.com"
run_test "Valid email: user.name@domain.org" 0 validate_email "user.name@domain.org"
run_test "Valid email: test+tag@example.co.uk" 0 validate_email "test+tag@example.co.uk"
run_test "Valid email: user123@test-domain.com" 0 validate_email "user123@test-domain.com"
run_test "Invalid email: empty string" 1 validate_email ""
run_test "Invalid email: no @" 1 validate_email "invalid.email.com"
run_test "Invalid email: no domain" 1 validate_email "user@"
run_test "Invalid email: no user" 1 validate_email "@domain.com"
run_test "Invalid email: no TLD" 1 validate_email "user@domain"
run_test "Invalid email: spaces" 1 validate_email "user name@domain.com"
echo

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
