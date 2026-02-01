#!/bin/bash

##############################################################################
# Package Installation Test Script (Bash version)
#
# This script tests the npm package by:
# 1. Creating a temporary test directory
# 2. Packing the current package
# 3. Installing it in the test directory
# 4. Running the CLI commands to verify they work
# 5. Cleaning up
##############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Icons
CHECK="${GREEN}✓${NC}"
CROSS="${RED}✗${NC}"
ARROW="${CYAN}→${NC}"
INFO="${BLUE}ℹ${NC}"
WARN="${YELLOW}⚠${NC}"

# Variables
TEST_DIR="/tmp/saber-code-test-$$"
PACKAGE_FILE=""
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Functions
log_title() {
    echo -e "\n${BOLD}${CYAN}$1${NC}\n"
}

log_step() {
    echo -e "${ARROW} $1"
}

log_success() {
    echo -e "${CHECK} $1"
}

log_error() {
    echo -e "${CROSS} $1"
}

log_warn() {
    echo -e "${WARN} $1"
}

log_info() {
    echo -e "${INFO} $1"
}

cleanup() {
    log_step "Cleaning up..."
    
    # Remove test directory
    if [ -d "$TEST_DIR" ]; then
        rm -rf "$TEST_DIR"
        log_success "Removed test directory"
    fi
    
    # Remove package tarball
    if [ -n "$PACKAGE_FILE" ] && [ -f "$PACKAGE_FILE" ]; then
        rm -f "$PACKAGE_FILE"
        log_success "Removed package tarball"
    fi
}

# Trap cleanup on exit
trap cleanup EXIT INT TERM

run_test() {
    TESTS_RUN=$((TESTS_RUN + 1))
    if eval "$1"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Main test execution
main() {
    log_title "🧪 Saber Code CLI - Package Installation Test"
    
    # Step 1: Pack the package
    log_step "Step 1: Packing the package..."
    if ! npm pack > /dev/null 2>&1; then
        log_error "Failed to pack the package"
        exit 1
    fi
    
    # Get the package filename
    PACKAGE_FILE=$(ls -t saber-code-cli-*.tgz 2>/dev/null | head -1)
    
    if [ -z "$PACKAGE_FILE" ]; then
        log_error "Package tarball not found"
        exit 1
    fi
    
    log_success "Package created: $PACKAGE_FILE"
    
    # Step 2: Create test directory
    log_step "Step 2: Creating test directory..."
    mkdir -p "$TEST_DIR"
    log_success "Test directory: $TEST_DIR"
    
    # Step 3: Install the package
    log_step "Step 3: Installing package in test directory..."
    PACKAGE_PATH="$(pwd)/$PACKAGE_FILE"
    
    if ! (cd "$TEST_DIR" && npm install "$PACKAGE_PATH" > /dev/null 2>&1); then
        log_error "Failed to install package"
        exit 1
    fi
    
    log_success "Package installed successfully"
    
    # Step 4: Verify package structure
    log_step "Step 4: Verifying package structure..."
    
    MODULE_PATH="$TEST_DIR/node_modules/saber-code-cli"
    REQUIRED_FILES=("cli.js" "index.js" "src" "package.json" "README.md")
    EXCLUDED_ITEMS=("test" "docs" "coverage" ".env")
    
    STRUCTURE_VALID=true
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -e "$MODULE_PATH/$file" ]; then
            log_error "Required file/directory missing: $file"
            STRUCTURE_VALID=false
        fi
    done
    
    for item in "${EXCLUDED_ITEMS[@]}"; do
        if [ -e "$MODULE_PATH/$item" ]; then
            log_warn "Excluded item found in package: $item"
        fi
    done
    
    if [ "$STRUCTURE_VALID" = true ]; then
        log_success "Package structure is valid"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "Package structure is invalid"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Step 5: Test CLI command availability
    log_step "Step 5: Testing CLI command availability..."
    
    CLI_PATH="$MODULE_PATH/cli.js"
    
    if [ -f "$CLI_PATH" ]; then
        log_success "CLI executable found"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "CLI executable not found"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Step 6: Test CLI help command
    log_step "Step 6: Testing CLI help command..."
    
    if node "$CLI_PATH" --help 2>&1 | grep -q "saber-code"; then
        log_success "CLI help command works"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "CLI help command failed"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Step 7: Test CLI version
    log_step "Step 7: Testing CLI version command..."
    
    VERSION=$(node "$CLI_PATH" --version 2>&1)
    if [ $? -eq 0 ]; then
        log_success "CLI version: $VERSION"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "CLI version command failed"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Step 8: Verify dependencies
    log_step "Step 8: Verifying dependencies..."
    
    REQUIRED_DEPS=("axios" "chalk" "commander" "dotenv" "glob" "inquirer")
    DEPS_VALID=true
    
    for dep in "${REQUIRED_DEPS[@]}"; do
        if ! grep -q "\"$dep\"" "$MODULE_PATH/package.json"; then
            log_error "Missing dependency: $dep"
            DEPS_VALID=false
        fi
    done
    
    if [ "$DEPS_VALID" = true ]; then
        log_success "All required dependencies present"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "Some dependencies are missing"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Step 9: Check package size
    log_step "Step 9: Checking package size..."
    
    SIZE=$(stat -f%z "$PACKAGE_PATH" 2>/dev/null || stat -c%s "$PACKAGE_PATH" 2>/dev/null)
    SIZE_MB=$(echo "scale=2; $SIZE / 1048576" | bc)
    
    if (( $(echo "$SIZE < 5242880" | bc -l) )); then
        log_success "Package size: ${SIZE_MB} MB (acceptable)"
    elif (( $(echo "$SIZE < 10485760" | bc -l) )); then
        log_warn "Package size: ${SIZE_MB} MB (large but acceptable)"
    else
        log_warn "Package size: ${SIZE_MB} MB (very large, consider optimization)"
    fi
    
    # Step 10: Test module importability
    log_step "Step 10: Testing module importability..."
    
    if node -e "require('$MODULE_PATH/index.js')" 2>/dev/null; then
        log_success "Module can be imported successfully"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "Module import failed"
        TESTS_RUN=$((TESTS_RUN + 1))
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Summary
    log_title "📊 Test Summary"
    echo "Total Tests:  $TESTS_RUN"
    echo -e "${GREEN}Passed:       $TESTS_PASSED${NC}"
    echo -e "${RED}Failed:       $TESTS_FAILED${NC}"
    
    SUCCESS_RATE=$(echo "scale=1; ($TESTS_PASSED * 100) / $TESTS_RUN" | bc)
    echo "Success Rate: ${SUCCESS_RATE}%"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log_title "✅ All package tests passed! Ready to publish."
        exit 0
    else
        log_title "❌ Some tests failed. Please fix before publishing."
        exit 1
    fi
}

# Run main function
main
