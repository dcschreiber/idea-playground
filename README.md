# 🚀 Idea Playground

A multi-dimensional UI system for organizing and visualizing ideas with different perspectives and relationships.

## 📋 **Project Overview**

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + Node.js + TypeScript
- **Database**: Google Cloud Firestore (NoSQL)
- **Hosting**: Firebase Hosting (Frontend), Google Cloud Run (Backend)
- **Testing**: Playwright E2E tests

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │    │ Express.js       │    │   Cloud         │
│   (Frontend)    │◄──►│ Backend          │◄──►│   Firestore     │
│                 │    │ (RESTful API)    │    │   (Database)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌──────────────────┐              │
         └─────────────►│ Firebase Hosting │              │
                        │ (Static Assets)  │              │
                        └──────────────────┘              │
                                 │                        │
                        ┌──────────────────┐              │
                        │ Google Cloud Run │◄─────────────┘
                        │ (Backend Host)   │
                        └──────────────────┘
```

---

## 🛠️ **Prerequisites**

### **Required**
- **Node.js 18+** - JavaScript runtime
- **npm** - Package manager
- **Git** - Version control

### **For Local Development**
- **Firebase CLI** - For Firestore emulator

### **Installation**

```bash
# Install Node.js (if not already installed)
# Download from: https://nodejs.org/

# Install Firebase CLI globally
npm install -g firebase-tools

# Verify installations
node --version    # Should be 18+
npm --version     # Should be 6+
firebase --version # Should be 13+
```

---

## 🚀 **Quick Start**

### **1. Clone and Setup**

```bash
# Clone the repository
git clone https://github.com/your-username/idea-playground.git
cd idea-playground

# One-time automated setup (installs dependencies, sets up emulator, migrates data)
npm run setup
```

### **2. Firebase Configuration** (if deploying)

```bash
# Login to Firebase (only needed for deployment)
firebase login

# Verify project connection
firebase projects:list

# Should show: idea-playground-1f730
```

### **3. Start Development**

```bash
# Start full development environment
npm run dev

# This starts:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:8080  
# - Firestore Emulator: http://localhost:8080
# - Emulator UI: http://localhost:4000
```

---

## 💻 **Development Scripts**

| Command | Description |
|---------|-------------|
| `npm run setup` | One-time automated setup |
| `npm run dev` | Start full development environment |
| `npm run dev:frontend` | Frontend only |
| `npm run dev:backend` | Backend only |
| `npm run dev:emulator` | Firestore emulator only |
| `npm run build` | Build frontend + backend for production |
| `npm run build:frontend` | Build frontend for production |
| `npm run build:backend` | Build backend for production |
| `npm test` | Run Playwright tests |
| `npm run test:ui` | Run tests with UI |
| `npm run backup` | Backup production data |
| `npm run deploy` | Deploy to Google Cloud Run + Firebase Hosting |

---

## 🔧 **Local Development**

### **Complete Local Environment**
- ✅ **Express.js backend** - Standard Node.js debugging
- ✅ **Firestore emulator** - Isolated development data
- ✅ **Real-time development** - Hot reload for frontend and backend
- ✅ **No external dependencies** - Everything runs locally

```bash
# Start everything with one command
npm run dev

# Individual services
npm run dev:frontend  # React app only
npm run dev:backend   # Express.js API only
npm run dev:emulator  # Firestore emulator only
```

### **Development URLs**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Firestore Emulator**: http://localhost:8080
- **Firebase UI**: http://localhost:4000

---

## 🧪 **Testing**

### **Run Tests**

```bash
# Run all tests (headless)
npm test

# Run tests with browser UI
npm run test:ui

# Run tests with detailed output
npm test -- --reporter=list
```

### **Test Structure**
- **23 E2E tests** covering all features
- **Playwright** for browser automation
- **Automatic screenshots** on failures
- **Cross-browser testing** support

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Port Already in Use**
```bash
Error: listen EADDRINUSE: address already in use :::8080
```
**Solution:**
```bash
# Kill processes using the port
lsof -ti:8080 | xargs kill -9

# Or use different ports in the setup

# Verify
java -version
```

#### **Port Conflicts**
```bash
Error: Could not start Hosting Emulator, port taken
```
**Solution:**
```bash
# Use production backend instead
npm run dev:client

# OR kill processes using ports
lsof -ti:5000 | xargs kill -9
lsof -ti:5001 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

#### **Firebase Authentication**
```bash
Error: Authentication required
```
**Solution:**
```bash
firebase login
firebase use idea-playground-1f730
```

#### **Build Errors**
```bash
# Clear caches and reinstall
rm -rf node_modules functions/node_modules
npm install
cd functions && npm install
```

### **Development URLs**
- **Frontend**: http://localhost:3000
- **Firebase Functions**: http://localhost:5001/idea-playground-1f730/us-central1
- **Firestore Emulator**: http://localhost:8080
- **Firebase UI**: http://localhost:4000

---

## 🌍 **Deployment**

### **Prerequisites**
- Firebase Blaze plan (pay-as-you-go)
- Cost: ~$0-2/month for typical usage

### **Deploy Everything**

```bash
# Build and deploy
node deploy.js

# Or individual services
npm run deploy:functions  # Deploy Functions only
npm run deploy:hosting   # Deploy Frontend only
```

### **Production URLs**
- **Website**: https://idea-playground-1f730.web.app
- **Functions**: https://us-central1-idea-playground-1f730.cloudfunctions.net

---

## 📊 **Project Structure**

```
idea-playground/
├── src/                     # React frontend
│   ├── components/          # UI components
│   ├── services/           # API service layer
│   └── types/              # TypeScript types
├── functions/              # Firebase Functions
│   ├── src/                # Function source code
│   └── package.json        # Function dependencies
├── tests/                  # Playwright E2E tests
├── data/                   # Original JSON data (backup)
├── firebase.json           # Firebase configuration
├── package.json            # Frontend dependencies
├── DEPLOYMENT.md           # Detailed deployment guide
└── deploy.js              # Deployment automation
```

---

## 🔗 **Key Features**

- **Multi-dimensional UI** - View ideas from different perspectives
- **Drag & Drop** - Intuitive reordering
- **Real-time Editing** - Live markdown preview
- **Advanced Filtering** - Filter by field, readiness, complexity
- **Title Validation** - Prevent duplicate titles
- **Auto-save** - Automatic saving as you type
- **Responsive Design** - Works on all devices

---

## 🤝 **Contributing**

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Run tests**: `npm test`
4. **Commit changes**: `git commit -m 'Add amazing feature'`
5. **Push to branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

---

## 📄 **License**

This project is for personal use. Contact for usage permissions.

---

## 🆘 **Getting Help**

- **Detailed Setup**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Firebase Documentation**: https://firebase.google.com/docs
- **React Documentation**: https://react.dev
- **Playwright Documentation**: https://playwright.dev

---

## 🎯 **Development Status**

- ✅ **Frontend**: Complete React app with TypeScript
- ✅ **Backend**: Firebase Functions with full API
- ✅ **Database**: Cloud Firestore with migrated data
- ✅ **Testing**: 23 E2E tests passing
- ✅ **Deployment**: Ready for production
- 🚧 **Authentication**: Configured but not implemented
- 🚧 **Real-time Updates**: Planned for future release

**Ready for development and deployment!** 🚀