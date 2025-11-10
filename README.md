# Smart Book Translator

Translator for e-books

## Project Structure

```
smart-book-translator/
├── backend/          # Node.js/Express API server
├── frontend/         # React application with Vite
└── README.md
```

## Tech Stack

### Backend
- **Node.js** v20.19.5+ (compatible with Windows and Ubuntu)
- **Express** v4.21.2 - Web framework
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variables

### Frontend
- **React** v19.2.0 - UI library
- **Vite** v7.2.2 - Build tool and dev server
- **ESLint** - Code linting

## Prerequisites

- Node.js >= 18.0.0 (tested with v20.19.5)
- npm >= 10.0.0 (comes with Node.js)

## Installation

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

## Running the Application

### Development Mode

#### Start Backend Server

```bash
cd backend
npm run dev
```

The backend will run on `http://localhost:5000`

#### Start Frontend Development Server

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

### Production Mode

#### Build Frontend

```bash
cd frontend
npm run build
```

#### Start Backend (Production)

```bash
cd backend
npm start
```

## Environment Variables

Create a `.env` file in the `backend` directory:

```env
PORT=5000
NODE_ENV=development
```

## API Endpoints

- `GET /api/health` - Health check endpoint

## Cross-Platform Compatibility

This project is compatible with:
- ✅ Windows 10/11
- ✅ Ubuntu 20.04+
- ✅ macOS

All dependencies are cross-platform and tested on both Windows and Ubuntu.

## License

ISC
