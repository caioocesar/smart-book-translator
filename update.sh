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

# Stop running application first
echo "Stopping running application..."
if [ -f "./stop.sh" ]; then
    bash ./stop.sh
    sleep 2
    print_success "Application stopped"
else
    print_info "stop.sh not found, trying to stop manually..."
    # Try to stop processes on common ports
    for port in 5000 5001 5002 5003 5004 5005 3000 3001 3002 5173; do
        PID=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$PID" ]; then
            print_info "Stopping process on port $port (PID: $PID)"
            kill $PID 2>/dev/null || true
        fi
    done
    sleep 2
fi

echo ""
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

# Ask if user wants to start the application
read -p "Do you want to start the application now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    print_info "Starting application..."
    if [ -f "./start.sh" ]; then
        bash ./start.sh &
        sleep 3
        print_success "Application started!"
        print_info "Check the console output above for the frontend URL"
    elif [ -f "./launch.sh" ]; then
        bash ./launch.sh &
        print_success "Application launched!"
    else
        print_info "Start scripts not found. Please start manually:"
        echo "  cd backend && npm start"
        echo "  cd frontend && npm run dev"
    fi
else
    echo ""
    echo "To start the application later:"
    echo "  ./start.sh"
    echo "  or"
    echo "  ./launch.sh"
fi
echo ""



