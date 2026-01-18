#!/bin/bash

# Smart Book Translator - Desktop Launcher
# Starts servers and opens the application in browser

set -e

cd "$(dirname "$0")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if already running
if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${BLUE}Application is already running!${NC}"
    # Detect frontend port and open browser
    FRONTEND_PORT=""
    for port in 3002 5173 3001 3000 3003 3004; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            FRONTEND_PORT=$port
            break
        fi
    done
    
    # Also check log files
    if [ -z "$FRONTEND_PORT" ] && [ -f "frontend.log" ]; then
        LOG_PORT=$(grep -oP 'Local:\s+http://localhost:\K\d+' frontend.log 2>/dev/null | head -1)
        if [ ! -z "$LOG_PORT" ] && lsof -Pi :$LOG_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            FRONTEND_PORT=$LOG_PORT
        fi
    fi
    
    if [ ! -z "$FRONTEND_PORT" ]; then
        echo -e "${GREEN}Opening application on port $FRONTEND_PORT...${NC}"
        xdg-open "http://localhost:$FRONTEND_PORT" 2>/dev/null || \
        sensible-browser "http://localhost:$FRONTEND_PORT" 2>/dev/null || \
        echo "Please open http://localhost:$FRONTEND_PORT in your browser"
    else
        # Try common ports
        xdg-open http://localhost:3000 2>/dev/null || \
        xdg-open http://localhost:5173 2>/dev/null || \
        xdg-open http://localhost:3001 2>/dev/null || \
        echo "Please check which port the frontend is running on"
    fi
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
sleep 5

# Try to detect which port frontend is using
FRONTEND_PORT=""
for port in 3002 5173 3001 3000 3003 3004; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        FRONTEND_PORT=$port
        break
    fi
done

# Also try to read from frontend log
if [ -z "$FRONTEND_PORT" ] && [ -f "/tmp/smart-book-translator-frontend.log" ]; then
    # Try to extract port from log
    LOG_PORT=$(grep -oP 'Local:\s+http://localhost:\K\d+' /tmp/smart-book-translator-frontend.log 2>/dev/null | head -1)
    if [ ! -z "$LOG_PORT" ] && lsof -Pi :$LOG_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        FRONTEND_PORT=$LOG_PORT
    fi
fi

# Also check frontend.log in current directory
if [ -z "$FRONTEND_PORT" ] && [ -f "frontend.log" ]; then
    LOG_PORT=$(grep -oP 'Local:\s+http://localhost:\K\d+' frontend.log 2>/dev/null | head -1)
    if [ ! -z "$LOG_PORT" ] && lsof -Pi :$LOG_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        FRONTEND_PORT=$LOG_PORT
    fi
fi

# Open browser with detected port
if [ ! -z "$FRONTEND_PORT" ]; then
    echo -e "${GREEN}Opening application on port $FRONTEND_PORT...${NC}"
    xdg-open "http://localhost:$FRONTEND_PORT" 2>/dev/null || \
    sensible-browser "http://localhost:$FRONTEND_PORT" 2>/dev/null || \
    echo "Please open http://localhost:$FRONTEND_PORT in your browser"
    
    # Show notification
    if command -v notify-send &> /dev/null; then
        notify-send "Smart Book Translator" "Application started on port $FRONTEND_PORT!" -i applications-education
    fi
else
    echo -e "${YELLOW}Could not detect frontend port. Trying common ports...${NC}"
    for port in 3002 5173 3001 3000; do
        xdg-open "http://localhost:$port" 2>/dev/null && break
    done
fi


