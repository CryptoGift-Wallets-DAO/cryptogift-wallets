#!/bin/bash

# 🔥 VALIDACIÓN FINAL: Test Mint Process After Critical Fixes
# Tests all 4 critical errors that were causing mint failures
# Made by mbxarts.com The Moon in a Box property
# Co-Author: Godez22

BASE_URL="${BASE_URL:-https://cryptogift-wallets.vercel.app}"
CONTRACT_ADDRESS="${CONTRACT_ADDRESS:-0xE9F316159a0830114252a96a6B7CA6efD874650F}"

echo "🔥 TESTING MINT PROCESS AFTER CRITICAL FIXES"
echo "============================================"
echo "🌐 Base URL: $BASE_URL"
echo "📄 Contract: $CONTRACT_ADDRESS"
echo "📅 Test Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

test_counter=0
passed_tests=0

run_test() {
    local test_name="$1"
    local curl_command="$2"
    local expected_condition="$3"
    
    test_counter=$((test_counter + 1))
    echo -e "${BLUE}🧪 TEST ${test_counter}: ${test_name}${NC}"
    echo "=================" | head -c ${#test_name} | tr ' ' '='
    echo "================="
    
    echo "📤 Request:"
    echo "$curl_command"
    echo ""
    
    echo "⏱️ Executing..."
    start_time=$(date +%s%3N)
    
    # Execute the curl command and capture both output and status
    response=$(eval "$curl_command" 2>&1)
    exit_code=$?
    
    end_time=$(date +%s%3N)
    duration=$((end_time - start_time))
    
    echo "📥 Response (${duration}ms):"
    echo "$response"
    echo ""
    
    # Simple condition checking
    if [[ $exit_code -eq 0 ]] && echo "$response" | grep -q "$expected_condition"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        passed_tests=$((passed_tests + 1))
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        echo -e "${YELLOW}Expected condition: $expected_condition${NC}"
    fi
    
    echo ""
    echo "================================================"
    echo ""
}

# TEST 1: Debug Endpoints Authentication Fix
run_test "Debug Endpoints Authentication" \
    "curl -X POST '$BASE_URL/api/debug/mint-logs' -H 'Content-Type: application/json' -H 'Origin: $BASE_URL' -d '{\"level\":\"INFO\",\"step\":\"TEST_AUTHENTICATION\",\"data\":{\"message\":\"Testing fixed auth\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}' --max-time 10 -s" \
    "success"

# TEST 2: Metadata Endpoint (Should Use Redis, Not Placeholder)
run_test "Metadata Endpoint Redis Priority" \
    "curl '$BASE_URL/api/nft-metadata/$CONTRACT_ADDRESS/154' -H 'Accept: application/json' --max-time 10 -s" \
    '"source":"redis"'

# TEST 3: Upload Security Validation (Should Block Invalid)
run_test "Upload Security Blocking" \
    "curl -X POST '$BASE_URL/api/upload' -H 'Content-Type: application/json' -d '{}' --max-time 10 -s" \
    "error"

# TEST 4: Metadata Schema Validation
run_test "Metadata Schema Response" \
    "curl '$BASE_URL/api/nft-metadata/$CONTRACT_ADDRESS/154' -H 'Accept: application/json' --max-time 10 -s" \
    '"image":"https://'

# TEST 5: CORS Headers Present
run_test "CORS Headers Configuration" \
    "curl -I '$BASE_URL/api/nft-metadata/$CONTRACT_ADDRESS/154' --max-time 5 -s" \
    "Access-Control-Allow-Origin"

# TEST 6: Debug Logging Endpoint
run_test "Debug Logs Access" \
    "curl '$BASE_URL/api/debug/mint-logs' -H 'Accept: application/json' --max-time 10 -s" \
    "logs"

# Final Results
echo "🎯 FINAL TEST RESULTS"
echo "===================="
echo -e "✅ Passed: ${GREEN}$passed_tests${NC}/$test_counter"
echo -e "❌ Failed: ${RED}$((test_counter - passed_tests))${NC}/$test_counter"

success_rate=$((passed_tests * 100 / test_counter))
echo -e "📊 Success Rate: $success_rate%"

if [[ $passed_tests -eq $test_counter ]]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED - Critical fixes working correctly!${NC}"
    echo -e "${GREEN}✅ System ready for mint retry${NC}"
    exit 0
elif [[ $passed_tests -ge $((test_counter * 3 / 4)) ]]; then
    echo -e "${YELLOW}⚠️ MOSTLY WORKING - ${passed_tests}/$test_counter tests passed${NC}"
    echo -e "${YELLOW}📝 Review failed tests before mint retry${NC}"
    exit 0
else
    echo -e "${RED}❌ CRITICAL ISSUES REMAIN - ${passed_tests}/$test_counter tests passed${NC}"
    echo -e "${RED}🔧 Address failed tests before attempting mint${NC}"
    exit 1
fi