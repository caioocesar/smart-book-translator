#!/bin/bash
# Smart Book Translator - One-Click Launcher for Linux/Mac
# This script checks dependencies, installs if needed, and starts the application

echo "========================================"
echo "  Smart Book Translator - Quick Start  "
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found!"
    echo ""
    echo "Please install Node.js from: https://nodejs.org/"
    echo "Or use your package manager:"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  Mac: brew install node"
    echo ""
    exit 1
fi

echo "[OK] Node.js is installed"
node -v

# Check if backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo ""
    echo "[INFO] First time setup detected..."
    echo "[INFO] Installing backend dependencies..."
    echo ""
    cd backend
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install backend dependencies"
        exit 1
    fi
    cd ..
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo ""
    echo "[INFO] Installing frontend dependencies..."
    echo ""
    cd frontend
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install frontend dependencies"
        exit 1
    fi
    cd ..
fi

echo ""
echo "[OK] All dependencies installed"
echo ""
echo "========================================"
echo "  Starting Application...              "
echo "========================================"
echo ""

# Function to open terminal based on available terminal emulator
open_terminal() {
    local title=$1
    local command=$2
    
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal --title="$title" -- bash -c "$command; exec bash"
    elif command -v konsole &> /dev/null; then
        konsole --title "$title" -e bash -c "$command; bash"
    elif command -v xterm &> /dev/null; then
        xterm -title "$title" -e bash -c "$command; bash" &
    elif command -v osascript &> /dev/null; then
        # Mac Terminal.app
        osascript -e "tell application \"Terminal\" to do script \"cd $(pwd) && $command\""
    else
        echo "[WARNING] No suitable terminal emulator found"
        echo "Starting in background..."
        eval "$command" &
    fi
}

# Start backend
echo "[1/2] Starting backend server..."
open_terminal "Smart Book Translator - Backend" "cd backend && npm start"

# Wait for backend to start
sleep 3

# Start frontend
echo "[2/2] Starting frontend server..."
open_terminal "Smart Book Translator - Frontend" "cd frontend && npm run dev"

# Wait for services to initialize
echo ""
echo "[INFO] Waiting for services to start..."
sleep 5

# Open browser
echo ""
echo "[OK] Opening browser..."
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v open &> /dev/null; then
    open http://localhost:3000
else
    echo "[INFO] Please open http://localhost:3000 in your browser"
fi

echo ""
echo "========================================"
echo "  Application is Running!              "
echo "========================================"
echo ""
echo "  Backend:  http://localhost:5000      "
echo "  Frontend: http://localhost:3000      "
echo ""
echo "  Two terminal windows have been opened:"
echo "  - Backend Server                      "
echo "  - Frontend Server                     "
echo ""
echo "  Keep both windows open while using the app."
echo "  Close them when you're done.          "
echo ""
echo "========================================"
echo ""
