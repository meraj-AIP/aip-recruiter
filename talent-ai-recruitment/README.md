# TalentAI - AI-Powered Recruitment Platform

A modern, intuitive recruitment management application UI built with React and Vite.

![TalentAI](https://img.shields.io/badge/TalentAI-Recruitment-blue)
![React](https://img.shields.io/badge/React-18.2-61dafb)
![Vite](https://img.shields.io/badge/Vite-5.0-646cff)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Navigate to the project folder:**
   ```bash
   cd talent-ai-recruitment
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   The app will automatically open at `http://localhost:3000`

## 📁 Project Structure

```
talent-ai-recruitment/
├── index.html          # HTML entry point
├── package.json        # Project dependencies
├── vite.config.js      # Vite configuration
├── README.md           # This file
└── src/
    ├── main.jsx        # React entry point
    └── App.jsx         # Main application component
```

## ✨ Features

### Screens
- **Login** - Authentication with SSO options
- **Dashboard** - Overview with stats, AI insights, recent candidates
- **Job Openings** - Manage positions (create, edit, pause/activate)
- **Candidate Pipeline** - Kanban board with drag-like actions
- **Candidate Profile** - Detailed view with AI summary, comments, timeline
- **Tasks** - Pending actions with priority levels
- **Import** - LinkedIn import and bulk resume upload

### Interactive Elements
- ✅ All buttons are clickable and functional
- ✅ Forms with working submit actions
- ✅ Real-time state updates
- ✅ Toast notifications for feedback
- ✅ Modal dialogs for create/add actions
- ✅ Filter and tab functionality

## 🛠 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## 🎨 Customization

### Colors
The app uses a cyan-to-violet gradient theme. Main colors:
- Primary: `#0ea5e9` (cyan)
- Secondary: `#8b5cf6` (violet)
- Success: `#10b981` (green)
- Warning: `#f59e0b` (amber)
- Error: `#ef4444` (red)

### Adding New Features
1. State is managed at the top of `App.jsx`
2. Each screen is a conditional render block
3. Styles are defined in the `styles` object
4. Helper functions handle business logic

## 📝 Development Notes

- No external UI libraries - pure React with inline styles
- Uses emoji icons for simplicity (can be replaced with icon library)
- All data is stored in React state (can be connected to backend)
- Responsive-ready structure (add media queries as needed)

## 🔧 Next Steps for Production

1. **Add routing** - React Router for proper navigation
2. **State management** - Redux or Zustand for complex state
3. **API integration** - Connect to backend services
4. **Authentication** - Implement real auth flow
5. **Testing** - Add Jest/Vitest tests
6. **Styling** - Consider Tailwind CSS or styled-components

## 📄 License

MIT License - feel free to use and modify!

---

Built with ⚡ by TalentAI
