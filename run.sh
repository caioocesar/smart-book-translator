#!/bin/bash

# Smart Book Translator Launcher
cd "$(dirname "$0")"

echo "=========================================="
echo "📚 Smart Book Translator"
echo "=========================================="
echo ""

# Start backend
echo "Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "=========================================="
echo "✅ Application is running!"
echo "=========================================="
echo ""
echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo ""

# Wait for frontend to fully start (Vite can take 5-10 seconds)
echo "Waiting for frontend to start..."
FRONTEND_PORT=""
MAX_WAIT=30
WAITED=0

while [ $WAITED -lt $MAX_WAIT ]; do
    # Try to detect which port frontend is using
    for port in 5173 3002 3001 3000 3003 3004; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            FRONTEND_PORT=$port
            break
        fi
    done
    
    if [ ! -z "$FRONTEND_PORT" ]; then
        break
    fi
    
    sleep 1
    WAITED=$((WAITED + 1))
    if [ $((WAITED % 3)) -eq 0 ]; then
        echo "  Still waiting for frontend... ($WAITED/$MAX_WAIT seconds)"
    fi
done

# Open browser automatically
if [ ! -z "$FRONTEND_PORT" ]; then
    echo ""
    echo "Opening browser at http://localhost:$FRONTEND_PORT..."
    sleep 1  # Small delay to ensure server is fully ready
    xdg-open "http://localhost:$FRONTEND_PORT" 2>/dev/null || \
    sensible-browser "http://localhost:$FRONTEND_PORT" 2>/dev/null || \
    firefox "http://localhost:$FRONTEND_PORT" 2>/dev/null || \
    google-chrome "http://localhost:$FRONTEND_PORT" 2>/dev/null || \
    chromium-browser "http://localhost:$FRONTEND_PORT" 2>/dev/null || \
    echo "⚠️  Could not open browser automatically. Please open http://localhost:$FRONTEND_PORT in your browser"
else
    echo ""
    echo "⚠️  Could not detect frontend port. Trying to open default port..."
    sleep 2
    xdg-open "http://localhost:3000" 2>/dev/null || \
    sensible-browser "http://localhost:3000" 2>/dev/null || \
    firefox "http://localhost:3000" 2>/dev/null || \
    google-chrome "http://localhost:3000" 2>/dev/null || \
    chromium-browser "http://localhost:3000" 2>/dev/null || \
    echo "⚠️  Please open http://localhost:3000 (or check the frontend output for the correct port) in your browser"
fi

echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
