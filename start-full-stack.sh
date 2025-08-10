#!/bin/bash

echo "🚀 Starting Gaspar Full-Stack Application..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if backend directory exists
if [ ! -d "backend" ]; then
    print_error "Backend directory not found!"
    print_status "Please ensure you're in the correct project directory."
    exit 1
fi

# Check if backend .env file exists
if [ ! -f "backend/.env" ]; then
    print_warning "Backend .env file not found!"
    print_status "Creating .env file from template..."
    cp backend/env.example backend/.env
    print_warning "Please edit backend/.env and add your DEEPGRAM_API_KEY"
    echo ""
fi

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_success "Frontend dependencies installed"
    else
        print_error "Failed to install frontend dependencies"
        exit 1
    fi
fi

# Install backend dependencies if needed
if [ ! -d "backend/node_modules" ]; then
    print_status "Installing backend dependencies..."
    cd backend && npm install
    if [ $? -eq 0 ]; then
        print_success "Backend dependencies installed"
        cd ..
    else
        print_error "Failed to install backend dependencies"
        exit 1
    fi
fi

# Check if concurrently is installed
if ! npm list concurrently > /dev/null 2>&1; then
    print_status "Installing concurrently for parallel execution..."
    npm install --save-dev concurrently
fi

echo ""
print_status "Starting both frontend and backend servers..."
print_status "Frontend will be available at: http://localhost:5173"
print_status "Backend will be available at: http://localhost:3001"
print_status "API endpoints will be available at: http://localhost:3001/api"
echo ""
print_status "Press Ctrl+C to stop both servers"
echo ""

# Start both servers
npm run dev:full 