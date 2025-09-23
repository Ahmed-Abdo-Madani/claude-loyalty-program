# Development Setup

## Quick Start

### Option 1: NPM command (Recommended)
```bash
npm run dev:full
```

### Option 2: Double-click to start
```
start-dev.bat
```

### Option 3: Manual start with port cleaning
```bash
npm run clean-ports
npm run backend
npm run dev
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:full` | 🚀 **Recommended**: Cleans ports & starts both servers |
| `npm run dev` | Start frontend only (port 3000) |
| `npm run backend` | Start backend only (port 3001) |
| `npm run clean-ports` | Clean ports 3000 & 3001 |
| `npm run start:clean` | Clean ports & start production build |

## If concurrently fails

If you get `'concurrently' is not recognized` error:

1. **Install dependencies**: `npm install`
2. **Use the batch file**: `start-dev.bat`
3. **Manual approach**: Run each command separately

```bash
# Terminal 1:
npm run clean-ports
cd backend
npm start

# Terminal 2:
set VITE_PORT=3000
npm run dev
```

## Server URLs

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Troubleshooting

### Port Already in Use?
The `dev:full` script automatically cleans ports, but if you still have issues:

1. **Manual port cleaning**: `npm run clean-ports`
2. **Check what's using ports**: `netstat -ano | findstr ":300"`
3. **Kill specific process**: `taskkill /F /PID <PID_NUMBER>`

### Backend Won't Start?
- Check if port 3001 is free
- Ensure you're in the project root directory
- Try: `cd backend && npm start`

### Frontend Won't Start?
- Check if port 3000 is free
- Try: `set VITE_PORT=3000 && npm run dev`

## File Structure

```
📁 loyalty-program/
├── 📄 start.bat           # Quick start script
├── 📄 start-dev.bat       # Detailed Windows script
├── 📄 start-dev.ps1       # PowerShell script
├── 📁 scripts/
│   └── 📄 clean-ports.js  # Port cleaning utility
├── 📁 backend/            # Backend server
└── 📁 src/                # Frontend source
```