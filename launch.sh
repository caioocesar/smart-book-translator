#!/bin/bash

# Smart Book Translator - Desktop Launcher
# Starts servers and opens the application in browser

set -e

cd "$(dirname "$0")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if already running
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${BLUE}Application is already running!${NC}"
    # Just open browser to existing instance
    xdg-open http://localhost:3002 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null || xdg-open http://localhost:3001 2>/dev/null &
    exit 0
fi

# Start backend in background
echo -e "${GREEN}Starting Smart Book Translator...${NC}"
cd backend
npm start > /tmp/smart-book-translator-backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend in background
cd frontend
npm run dev > /tmp/smart-book-translator-frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Save PIDs
echo "$BACKEND_PID" > /tmp/smart-book-translator.pids
echo "$FRONTEND_PID" >> /tmp/smart-book-translator.pids

# Wait for frontend to start and detect port
sleep 4

# Try to detect which port frontend is using and open it
for port in 3002 5173 3001 3000; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${GREEN}Opening application on port $port...${NC}"
        xdg-open "http://localhost:$port" &
        
        # Show notification
        if command -v notify-send &> /dev/null; then
            notify-send "Smart Book Translator" "Application started successfully!" -i applications-education
        fi
        
        exit 0
    fi
done

echo "Application started but port detection failed. Check http://localhost:5173"
xdg-open "http://localhost:5173" &


