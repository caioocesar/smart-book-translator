#!/bin/bash

# Smart Book Translator - Ubuntu Installation Script
# This script will install all dependencies and set up the application

set -e  # Exit on error

echo "=========================================="
echo "📚 Smart Book Translator Installation"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if Node.js is installed
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    echo "Please install Node.js 18 or higher from https://nodejs.org/"
    echo "Or use nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "Then run: nvm install 18"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version must be 18 or higher. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) is installed"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed!"
    exit 1
fi

print_success "npm $(npm -v) is installed"

# Navigate to script directory
cd "$(dirname "$0")"

# Install backend dependencies
echo ""
echo "Installing backend dependencies..."
cd backend
if [ -f "package.json" ]; then
    npm install
    print_success "Backend dependencies installed"
else
    print_error "backend/package.json not found!"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_info "Creating .env file from example..."
    cp .env.example .env
    print_success ".env file created"
fi

# Create necessary directories
mkdir -p uploads outputs data temp
print_success "Created necessary directories"

cd ..

# Install frontend dependencies
echo ""
echo "Installing frontend dependencies..."
cd frontend
if [ -f "package.json" ]; then
    npm install
    print_success "Frontend dependencies installed"
else
    print_error "frontend/package.json not found!"
    exit 1
fi

cd ..

# Create desktop launcher script
echo ""
echo "Creating launcher script..."
cat > run.sh << 'EOF'
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
echo "Frontend: http://localhost:5173"
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
EOF

chmod +x run.sh
print_success "Launcher script created (run.sh)"

# Create desktop entry for Linux
echo ""
print_info "Creating desktop launcher..."
DESKTOP_FILE="$HOME/.local/share/applications/smart-book-translator.desktop"
ICON_PATH="$(pwd)/frontend/public/vite.svg"
EXEC_PATH="$(pwd)/run.sh"

mkdir -p "$HOME/.local/share/applications"

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Smart Book Translator
Comment=Translate documents using AI
Exec=$EXEC_PATH
Icon=$ICON_PATH
Terminal=true
Categories=Utility;Office;
EOF

chmod +x "$DESKTOP_FILE"
print_success "Desktop launcher created"

echo ""
echo "=========================================="
echo "✅ Installation Complete!"
echo "=========================================="
echo ""
echo "To start the application, you can:"
echo "  1. Run: ./run.sh"
echo "  2. Search for 'Smart Book Translator' in your applications menu"
echo ""
echo "⚠️  Important: This program is for personal use only."
echo "    Do not use for commercial purposes or copyright infringement."
echo ""
echo "For more information, see README.md"
echo ""


