# AI Creative Guardrail Copilot

A full-stack web-based creative builder tool with AI-powered compliance checking and auto-fix capabilities. Create compliant marketing creatives that adhere to retailer brand guidelines automatically.

![Status](https://img.shields.io/badge/status-production--ready-success)
![Tests](https://img.shields.io/badge/tests-passing-success)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Compliance Rules](#compliance-rules)
- [Environment Variables](#environment-variables)
- [Development](#development)

---

## 🎯 Overview

**AI Creative Guardrail Copilot** helps marketers and designers create compliant marketing creatives that automatically meet retailer requirements. The tool uses AI-powered compliance checking to detect violations and provides auto-fix capabilities to resolve them instantly.

### Key Capabilities

- ✅ **Interactive Canvas Editor** - Drag, drop, and edit creatives with Fabric.js
- ✅ **AI-Powered Compliance Checking** - Real-time violation detection
- ✅ **Auto-Fix Engine** - Automatically resolves compliance issues
- ✅ **Text-to-Image Generation** - Create images with DALL-E 3
- ✅ **Multi-Format Export** - Square, Story, and Landscape formats
- ✅ **Project Management** - Save, load, and manage projects

---

## ✨ Features

### Core Features

1. **🎨 Interactive Canvas Editor**
   - Drag and drop images onto canvas
   - Select, move, resize, and rotate objects
   - Delete objects (button or Delete/Backspace key)
   - Multi-format support (1:1, 9:16, 16:9)
   - Safe zone visualization
   - Object properties panel

2. **📤 Image Management**
   - Upload packshots and backgrounds (JPG/PNG)
   - Background removal (ready for AI integration)
   - AI-powered text-to-image generation (DALL-E 3)
   - Automatic safe zone positioning

3. **✅ Compliance Checking Engine**
   - Real-time violation detection
   - Detects unsafe zones, font size, contrast issues
   - Missing TAG text and disclaimer detection
   - Prohibited claims detection
   - Visual compliance panel with severity indicators

4. **🔧 AI-Powered Auto-Fix**
   - Automatically fixes compliance violations
   - Moves text out of unsafe zones
   - Increases font size to minimum
   - Adds missing TAG text and disclaimers
   - Improves text contrast
   - Uses GPT-4 for intelligent copy fixing

5. **🎨 Text-to-Image Generation**
   - Generate images from text prompts using DALL-E 3
   - Multiple sizes (Square, Landscape, Portrait)
   - Quality options (Standard, HD)
   - Style options (Vivid, Natural)
   - Automatic canvas integration

6. **💾 Project Management**
   - Save projects to LocalStorage
   - Load saved projects
   - Delete projects
   - Full canvas state persistence

7. **📐 Export Functionality**
   - Export as JPG or PNG
   - Automatic optimization to < 500KB
   - High-resolution exports (2000px base)
   - Format-specific exports

8. **📱 Responsive Design**
   - Mobile-responsive layout
   - Adaptive sidebar visibility
   - Touch-friendly controls

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **Fabric.js** - HTML5 canvas library
- **Lucide React** - Icon library
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **OpenAI SDK** - GPT-4 and DALL-E 3 integration
- **Multer** - File upload handling
- **Sharp** - Image processing library
- **CORS** - Cross-origin resource sharing

### Storage
- **Local File System** - `assets/uploads/` for images
- **LocalStorage** - Browser storage for projects

---

## 📁 Project Structure

```
hackathon/
├── frontend/                          # React frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── CanvasArea.jsx        # Main canvas component
│   │   │   ├── LeftSidebar.jsx       # Tools sidebar
│   │   │   ├── RightSidebar.jsx      # Compliance panel
│   │   │   ├── FormatSelector.jsx    # Format selector
│   │   │   └── ProjectControls.jsx   # Save/Load/Delete
│   │   ├── services/
│   │   │   └── api.js                # API service layer
│   │   ├── store/
│   │   │   └── useStore.js          # Zustand state store
│   │   ├── utils/
│   │   │   ├── canvasLayout.js      # Canvas layout utilities
│   │   │   ├── exportCreative.js    # Export functionality
│   │   │   ├── projectStorage.js    # LocalStorage utilities
│   │   │   └── sampleCreative.js    # Sample creative loader
│   │   ├── App.jsx                   # Main app component
│   │   ├── main.jsx                  # Entry point
│   │   └── index.css                 # Global styles
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/                           # Node.js backend server
│   ├── server.js                     # Express server + API endpoints
│   ├── complianceChecker.js          # Compliance checking logic
│   ├── retailRules.js                # Retailer rule definitions
│   ├── tests/
│   │   ├── compliance.test.js       # Test suite
│   │   └── README.md                 # Test documentation
│   ├── package.json
│   └── .env                          # Environment variables
│
├── assets/
│   └── uploads/                      # Uploaded image storage
│
├── rules/
│   └── tesco.json                    # Tesco compliance rules
│
└── README.md                          # This file
```

---

## 🚀 Setup & Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- OpenAI API key

### Installation Steps

1. **Clone the repository** (if applicable)

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables:**
   ```bash
   cd backend
   cp .env.example .env  # If .env.example exists, or create .env manually
   ```
   
   Edit `backend/.env`:
   ```env
   PORT=5000
   OPENAI_API_KEY=your-openai-api-key-here
   ```

4. **Start the backend server** (Terminal 1):
   ```bash
   npm run dev:backend
   ```
   Backend runs on `http://localhost:5000`

5. **Start the frontend** (Terminal 2):
   ```bash
   npm run dev:frontend
   ```
   Frontend runs on `http://localhost:5173`

6. **Open your browser:**
   Navigate to `http://localhost:5173`

---

## 📖 Usage Guide

### Creating a Compliant Creative

1. **Select Format** - Choose Square, Story, or Landscape from the header
2. **Upload Images** - Click "Upload Packshot" or "Upload Background" in the left sidebar
3. **Add Text** - Click "Add Text" to add text elements
4. **Add TAG Text** - Click "Add TAG Text" for required retailer text (or let auto-fix add it)
5. **Check Compliance** - Violations automatically appear in the right sidebar
6. **Fix Violations** - Click "Fix All" or use quick fix buttons
7. **Export** - Click export button, select format and file type

### AI Image Generation

1. Click **"Generate Image (AI)"** in the left sidebar
2. Enter a descriptive prompt (e.g., "Modern product packshot with vibrant colors")
3. Select options:
   - **Size**: Square (1024×1024), Landscape (1792×1024), or Portrait (1024×1792)
   - **Quality**: Standard or HD
   - **Style**: Vivid (dramatic) or Natural
4. Click **"Generate"** and wait for the AI to create your image
5. The image automatically appears on your canvas

### Project Management

- **Save Project**: Click "Save Project" in the header
- **Load Project**: Click "Load Project" dropdown and select a saved project
- **Delete Project**: Click "Delete Project" and select a project to remove

---

## 🔌 API Documentation

### Image Management

#### `POST /api/upload`
Upload images (packshots/backgrounds)
- **Body**: FormData with `image` file and `type` field
- **Returns**: `{ url: string, filename: string }`

#### `POST /api/remove-bg`
Remove background from image
- **Body**: `{ imageDataUrl: string }` (base64 data URL)
- **Returns**: PNG image blob with transparency

### Compliance & Auto-Fix

#### `POST /api/check-compliance`
Check creative compliance
- **Body**: `{ canvasData: object, retailer?: string }`
- **Returns**: `{ issues: Array<Violation> }`

#### `POST /api/auto-fix`
Apply auto-fixes to canvas
- **Body**: `{ canvasData: object, issues: Array<Violation> }`
- **Returns**: `{ fixedCanvasData: object, fixedIssues: Array<string> }`

### AI Features

#### `POST /api/fix-copy`
AI-powered copy fixing using GPT-4
- **Body**: `{ headline: string, subhead: string, retailRulePack: string }`
- **Returns**: `{ fixedHeadline: string, fixedSubhead: string }`

#### `POST /api/generate-image`
Generate image from text using DALL-E 3
- **Body**: `{ prompt: string, size: string, quality: string, style: string }`
- **Returns**: `{ success: boolean, imageUrl: string, error?: string }`

### Export

#### `POST /api/export`
Export canvas as optimized image
- **Body**: `{ canvasData: object, format: string, fileType: string }`
- **Returns**: Optimized image blob (< 500KB)

### Health Check

#### `GET /api/health`
Server health check
- **Returns**: `{ status: 'ok', timestamp: string }`

---

## 🧪 Testing

### Running Tests

```bash
cd backend
npm test
# or
node tests/compliance.test.js
```

### Test Coverage

The test suite validates:

- ✅ **Violation Detection** - All violation types are detected correctly
- ✅ **Auto-Fix Functionality** - All fixes are applied correctly
- ✅ **Zero Violations After Fix** - All violations are resolved

### Test Cases

1. Text in unsafe top zone (< 200px)
2. Text in unsafe bottom zone (> canvasHeight - 250px)
3. Font size < 20px
4. Missing disclaimer text
5. Incorrect/wrong tag text
6. Low contrast text (< 4.5:1 ratio)

**Expected Result**: All tests pass ✅

---

## 📋 Compliance Rules

### Tesco Compliance Rules (Example)

- **Min Font Size**: 20px
- **Unsafe Top Zone**: < 200px from top
- **Unsafe Bottom Zone**: < 250px from bottom
- **Required TAG Text**: "Only at Tesco" or "Available at Tesco"
- **Required Disclaimer**: "Selected stores. While stocks last."
- **Min Contrast Ratio**: 4.5:1 (WCAG AA standard)
- **Prohibited Claims**: "best", "cheapest", "guaranteed", "always", "never", "100%"

### Violation Types

- `text_unsafe_top` - Text in unsafe top zone
- `text_unsafe_bottom` - Text in unsafe bottom zone
- `font_small` - Font size below minimum
- `contrast_low` - Text contrast below minimum
- `missing_tag_text` - Missing required TAG text
- `missing_disclaimer` - Missing required disclaimer
- `tag_text_incorrect` - Incorrect tag text format
- `prohibited_claim` - Prohibited claims detected

---

## 🔐 Environment Variables

### Backend `.env` File

```env
PORT=5000
OPENAI_API_KEY=your-openai-api-key-here
```

**Required:**
- `OPENAI_API_KEY` - For GPT-4 and DALL-E 3 API calls

---

## 💻 Development

### Available Scripts

```bash
# Install all dependencies
npm run install:all

# Start backend server
npm run dev:backend

# Start frontend dev server
npm run dev:frontend

# Run tests
cd backend && npm test
```

### Development Notes

- The project uses **ES modules** (`type: "module"`)
- Canvas dimensions update dynamically based on selected format
- Export optimization ensures files stay under 500KB
- Uploaded files are stored locally in `assets/uploads/`
- Projects are saved to browser LocalStorage
- All AI features require a valid OpenAI API key

### Code Structure

- **Frontend**: React components with Zustand for state management
- **Backend**: Express server with modular compliance checking
- **State Management**: Zustand store (`frontend/src/store/useStore.js`)
- **API Layer**: Axios-based service (`frontend/src/services/api.js`)

---

## 🎨 UI Components

### Left Sidebar
- Image upload buttons
- Add text button
- Add TAG text button
- Shape tools (rectangle, circle, line)
- Background removal tool
- AI image generation button
- Load sample creative button

### Right Sidebar
- Compliance issues panel
- Object properties panel (when object selected)
- Auto-fix button
- Quick fix buttons for specific violations

### Canvas Area
- Main editing canvas
- Export controls
- Format selector
- Safe zone visualization

### Header
- Format selector
- Project controls (Save/Load/Delete)
- Title and branding

---

## 🐛 Error Handling

### Frontend
- API errors displayed in modals/alerts
- Billing errors show helpful messages with links
- Network errors handled gracefully
- Loading states prevent duplicate requests

### Backend
- OpenAI API errors caught and formatted
- Billing limit errors return HTTP 402
- Rate limit errors return HTTP 429
- Content policy violations return HTTP 400
- Invalid API key returns HTTP 401
- All errors include `success: false` flag

---

## 📚 Additional Documentation

- **backend/tests/README.md** - Test suite documentation

---

## 🤝 Contributing

This is a hackathon project. For improvements:

1. Ensure all tests pass
2. Follow existing code style
3. Update documentation as needed
4. Test thoroughly before submitting

---

## 📄 License

This project was created for a hackathon. All rights reserved.

---

## 🙏 Acknowledgments

- **Fabric.js** - Canvas editing library
- **OpenAI** - GPT-4 and DALL-E 3 APIs
- **React** - UI framework
- **Tailwind CSS** - Styling framework

---

## 📞 Support

For issues or questions:
1. Check the documentation files
2. Review the test suite for examples
3. Check API endpoint documentation
4. Review compliance rules

---

**Last Updated**: Current project state
**Status**: ✅ Production Ready
**Tests**: ✅ All Passing

---

*Built with ❤️ by Team Pikachu ⚡*
