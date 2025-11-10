#!/bin/bash

# Smart Book Translator - Update Script (Ubuntu/Linux)
# Run this to update to the latest version

set -e

echo "=========================================="
echo "📦 Smart Book Translator - Update"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Navigate to script directory
cd "$(dirname "$0")"

echo "Updating Smart Book Translator..."
echo ""

# Check if git is available
if command -v git &> /dev/null; then
    print_info "Pulling latest changes from git..."
    git pull || print_info "Not a git repository or no changes available"
else
    print_info "Git not available - manual update"
fi

# Backup database
if [ -f "backend/data/translator.db" ]; then
    print_info "Backing up database..."
    mkdir -p backups
    cp backend/data/translator.db "backups/translator_backup_$(date +%Y%m%d_%H%M%S).db"
    print_success "Database backed up to backups/"
fi

# Update backend dependencies
echo ""
print_info "Updating backend dependencies..."
cd backend
npm install
print_success "Backend dependencies updated"

cd ..

# Update frontend dependencies
print_info "Updating frontend dependencies..."
cd frontend
npm install
print_success "Frontend dependencies updated"

cd ..

# Run tests to verify installation
print_info "Running system tests..."
cd backend
timeout 10 npm start > /dev/null 2>&1 &
SERVER_PID=$!
sleep 3

# Check if server is responding
if curl -s http://localhost:5000/api/health > /dev/null; then
    print_success "Backend is working correctly"
else
    print_error "Backend may have issues - check logs"
fi

kill $SERVER_PID 2>/dev/null || true
cd ..

echo ""
echo "=========================================="
echo "✅ Update Complete!"
echo "=========================================="
echo ""
echo "Changes applied. Your data and settings are preserved."
echo ""
echo "To start the application:"
echo "  ./run.sh"
echo ""


