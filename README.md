# 🚀 Idea Playground

A multi-dimensional UI system for organizing and visualizing ideas with different perspectives and relationships.

## 📋 **Project Overview**

- **Frontend**: React + TypeScript + Vite
- **Backend**: Firebase Functions (serverless)
- **Database**: Cloud Firestore (NoSQL)
- **Hosting**: Firebase Hosting
- **Testing**: Playwright E2E tests

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │    │ Firebase         │    │   Cloud         │
│   (Frontend)    │◄──►│ Functions        │◄──►│   Firestore     │
│                 │    │ (API Endpoints)  │    │   (Database)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌──────────────────┐              │
         └─────────────►│ Firebase Hosting │◄─────────────┘
                        │ (Static Assets)  │
                        └──────────────────┘
```

---

## 🛠️ **Prerequisites**

### **Required**
- **Node.js 18+** - JavaScript runtime
- **npm** - Package manager
- **Git** - Version control

### **Optional (for local Firebase emulators)**
- **Java Runtime 11+** - Required for Firestore emulator
- **Firebase CLI** - For local development with emulators

### **Installation**

```bash
# Install Node.js (if not already installed)
# Download from: https://nodejs.org/

# Install Firebase CLI globally
npm install -g firebase-tools

# Install Java (macOS with Homebrew)
brew install openjdk@11
echo 'export PATH="/opt/homebrew/opt/openjdk@11/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Verify installations
node --version    # Should be 18+
npm --version     # Should be 6+
firebase --version # Should be 13+
java -version     # Should be 11+ (optional)
```

---

## 🚀 **Quick Start**

### **1. Clone and Setup**

```bash
# Clone the repository
git clone https://github.com/your-username/idea-playground.git
cd idea-playground

# Install dependencies
npm install

# Install Firebase Functions dependencies
cd functions && npm install && cd ..
```

### **2. Firebase Configuration**

```bash
# Login to Firebase (if not already logged in)
firebase login

# Verify project connection
firebase projects:list

# Should show: idea-playground-1f730
```

### **3. Start Development**

**Option A: Simple Setup (Recommended)**
```bash
# Start frontend only (uses production Firebase Functions)
npm run dev:client

# Open browser to: http://localhost:3000
```

**Option B: Full Local Development**
```bash
# Start frontend + Firebase emulators (requires Java)
npm run dev

# Open browser to: http://localhost:3000
# Firebase UI: http://localhost:4000
```

---

## 💻 **Development Scripts**

| Command | Description |
|---------|-------------|
| `npm run dev:client` | Frontend only (uses production backend) |
| `npm run dev` | Frontend + Firebase emulators |
| `npm run dev:simple` | Frontend + Functions emulator only |
| `npm run dev:emulators` | Firebase emulators only |
| `npm run build` | Build frontend for production |
| `npm run build:functions` | Build Firebase Functions |
| `npm test` | Run Playwright tests |
| `npm run test:ui` | Run tests with UI |
| `npm run migrate` | Migrate data to Firestore |
| `npm run deploy` | Deploy to Firebase |

---

## 🔧 **Local Development Options**

### **Option 1: Production Backend (Recommended)**
- ✅ **Fastest setup** - No Java required
- ✅ **Real data** - Work with production database
- ✅ **No port conflicts** - Only frontend runs locally
- ✅ **Always works** - No emulator startup issues

```bash
npm run dev:client
# Opens: http://localhost:3000
```

### **Option 2: Firebase Emulators**
- ✅ **Complete local environment** - All services local
- ✅ **Isolated testing** - Safe to experiment
- ⚠️ **Requires Java** - Java 11+ needed for Firestore
- ⚠️ **Port conflicts** - May need port configuration

```bash
# Install Java first
brew install openjdk@11

# Start full environment
npm run dev
# Opens: http://localhost:3000
# Firebase UI: http://localhost:4000
```

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

#### **Java Runtime Error**
```bash
Error: Process `java -version` has exited with code 1
```
**Solution:**
```bash
# Install Java
brew install openjdk@11

# Add to PATH
echo 'export PATH="/opt/homebrew/opt/openjdk@11/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

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