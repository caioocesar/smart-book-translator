#!/bin/bash
# Ollama Installation Script for Linux
# This script downloads and installs Ollama on Linux

set -e

echo "========================================"
echo "  Ollama Installation for Linux"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  This script should NOT be run as root${NC}"
    echo -e "${YELLOW}   Please run as a regular user (sudo will be used when needed)${NC}"
    echo ""
    exit 1
fi

# Check if Ollama is already installed
echo -e "${YELLOW}Checking if Ollama is already installed...${NC}"

if command -v ollama &> /dev/null; then
    echo -e "${GREEN}✓ Ollama is already installed${NC}"
    
    # Get version
    VERSION=$(ollama --version 2>&1)
    echo -e "${GREEN}  Version: $VERSION${NC}"
    echo ""
    
    read -p "Do you want to reinstall Ollama? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Installation cancelled.${NC}"
        exit 0
    fi
fi

# Detect Linux distribution
echo ""
echo -e "${YELLOW}Detecting Linux distribution...${NC}"

if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$ID
    echo -e "${GREEN}✓ Detected: $PRETTY_NAME${NC}"
else
    echo -e "${RED}✗ Could not detect Linux distribution${NC}"
    exit 1
fi

# Install Ollama using official script
echo ""
echo -e "${YELLOW}Downloading and installing Ollama...${NC}"
echo -e "${CYAN}  This will use the official Ollama installation script${NC}"
echo ""

# Download and run official installer
curl -fsSL https://ollama.com/install.sh | sh

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Ollama installed successfully!${NC}"
else
    echo ""
    echo -e "${RED}✗ Installation failed${NC}"
    exit 1
fi

# Verify installation
echo ""
echo -e "${YELLOW}Verifying installation...${NC}"

sleep 2

if command -v ollama &> /dev/null; then
    VERSION=$(ollama --version 2>&1)
    LOCATION=$(which ollama)
    
    echo -e "${GREEN}✓ Ollama is ready!${NC}"
    echo -e "${GREEN}  Version: $VERSION${NC}"
    echo -e "${GREEN}  Location: $LOCATION${NC}"
else
    echo -e "${RED}✗ Ollama command not found${NC}"
    echo -e "${YELLOW}  You may need to restart your terminal${NC}"
    exit 1
fi

# Check if Ollama service is running
echo ""
echo -e "${YELLOW}Checking Ollama service status...${NC}"

if systemctl is-active --quiet ollama; then
    echo -e "${GREEN}✓ Ollama service is running${NC}"
else
    echo -e "${YELLOW}⚠️  Ollama service is not running${NC}"
    
    read -p "Do you want to start Ollama service now? (Y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo ""
        echo -e "${YELLOW}Starting Ollama service...${NC}"
        
        sudo systemctl start ollama
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Ollama service started!${NC}"
            
            # Enable service to start on boot
            sudo systemctl enable ollama
            echo -e "${GREEN}✓ Ollama will start automatically on boot${NC}"
        else
            echo -e "${RED}✗ Failed to start Ollama service${NC}"
        fi
    fi
fi

# Test connection
echo ""
echo -e "${YELLOW}Testing Ollama connection...${NC}"

sleep 2

if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Ollama is accessible at http://localhost:11434${NC}"
else
    echo -e "${YELLOW}⚠️  Could not connect to Ollama service${NC}"
    echo -e "${YELLOW}   The service may take a few seconds to start${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}  Installation Complete!${NC}"
echo "========================================"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "${NC}  1. Ollama service is running and will start on boot${NC}"
echo -e "${NC}  2. Download a model: ${CYAN}ollama pull llama3.2:3b${NC}"
echo -e "${NC}  3. Or use the Smart Book Translator UI to download models${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "${NC}  - Check status: ${CYAN}systemctl status ollama${NC}"
echo -e "${NC}  - View logs: ${CYAN}journalctl -u ollama -f${NC}"
echo -e "${NC}  - Stop service: ${CYAN}sudo systemctl stop ollama${NC}"
echo -e "${NC}  - Start service: ${CYAN}sudo systemctl start ollama${NC}"
echo ""
echo -e "${CYAN}For more information, visit: https://ollama.com${NC}"
echo ""
