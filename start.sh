#!/bin/bash

# Smart Book Translator - Start Script
# This script starts both backend and frontend servers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo "=========================================="
    echo "📚 Smart Book Translator"
    echo "=========================================="
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Kill process on port
kill_port() {
    local port=$1
    print_info "Stopping process on port $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 1
}

print_header

# Check if backend port is in use
if check_port 5000; then
    print_info "Port 5000 is already in use"
    read -p "Do you want to stop the existing process? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port 5000
        print_success "Stopped process on port 5000"
    else
        print_error "Cannot start backend on port 5000. Please stop the existing process or use a different port."
        echo ""
        echo "To use a different port:"
        echo "  export PORT=5001"
        echo "  ./start.sh"
        exit 1
    fi
fi

# Start backend
print_info "Starting backend server..."
cd backend
npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

if ! ps -p $BACKEND_PID > /dev/null; then
    print_error "Backend failed to start. Check backend.log for details."
    cat backend.log
    exit 1
fi

print_success "Backend started (PID: $BACKEND_PID)"

# Start frontend
print_info "Starting frontend..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 2

if ! ps -p $FRONTEND_PID > /dev/null; then
    print_error "Frontend failed to start. Check frontend.log for details."
    cat frontend.log
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

print_success "Frontend started (PID: $FRONTEND_PID)"

# Print summary
echo ""
echo "=========================================="
echo "✅ Application is running!"
echo "=========================================="
echo ""
echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:5173 (or next available port)"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""
echo "Logs:"
echo "  Backend:  tail -f backend.log"
echo "  Frontend: tail -f frontend.log"
echo ""

# Save PIDs to file for stop script
echo "$BACKEND_PID" > .pids
echo "$FRONTEND_PID" >> .pids

# Wait a bit more for frontend to fully start
sleep 3

# Try to detect frontend port
FRONTEND_PORT=""
for port in 3002 5173 3001 3000 3003 3004; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        FRONTEND_PORT=$port
        break
    fi
done

# Also try to read from frontend log
if [ -z "$FRONTEND_PORT" ] && [ -f "frontend.log" ]; then
    LOG_PORT=$(grep -oP 'Local:\s+http://localhost:\K\d+' frontend.log 2>/dev/null | head -1)
    if [ ! -z "$LOG_PORT" ] && lsof -Pi :$LOG_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        FRONTEND_PORT=$LOG_PORT
    fi
fi

# Ask if user wants to open browser (before waiting)
if [ ! -z "$FRONTEND_PORT" ]; then
    echo ""
    read -p "Do you want to open the application in your browser now? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Opening http://localhost:$FRONTEND_PORT..."
        xdg-open "http://localhost:$FRONTEND_PORT" 2>/dev/null || \
        sensible-browser "http://localhost:$FRONTEND_PORT" 2>/dev/null || \
        echo "Please open http://localhost:$FRONTEND_PORT in your browser"
    fi
else
    echo ""
    print_info "Frontend port not detected. Check frontend.log for the correct URL"
    echo ""
    read -p "Do you want to wait a bit and try again? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sleep 5
        # Try to detect frontend port again
        for port in 3002 5173 3001 3000 3003 3004; do
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
                FRONTEND_PORT=$port
                print_info "Opening http://localhost:$FRONTEND_PORT..."
                xdg-open "http://localhost:$FRONTEND_PORT" 2>/dev/null || \
                sensible-browser "http://localhost:$FRONTEND_PORT" 2>/dev/null || \
                echo "Please open http://localhost:$FRONTEND_PORT in your browser"
                break
            fi
        done
    fi
fi

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f .pids; echo 'Servers stopped.'; exit 0" INT TERM

# Keep script running
wait


