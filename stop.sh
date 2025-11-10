#!/bin/bash

# Smart Book Translator - Stop Script
# Stops both backend and frontend servers

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

echo ""
echo "Stopping Smart Book Translator..."
echo ""

# Stop by PIDs if available
if [ -f ".pids" ]; then
    while read -r pid; do
        if ps -p "$pid" > /dev/null 2>&1; then
            kill "$pid" 2>/dev/null && print_success "Stopped process $pid"
        fi
    done < .pids
    rm -f .pids
fi

# Stop any remaining processes on the ports
lsof -ti:5000 | xargs kill -9 2>/dev/null && print_success "Stopped backend on port 5000" || true
lsof -ti:5173 | xargs kill -9 2>/dev/null && print_success "Stopped frontend on port 5173" || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3002 | xargs kill -9 2>/dev/null || true

# Clean up log files
rm -f backend.log frontend.log

echo ""
print_success "All servers stopped"
echo ""


