# AI Planet Recruitment Platform

AI-powered internal recruitment management system for AI Planet.

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Database**: MongoDB Atlas
- **AI**: OpenAI GPT-4
- **Email**: Nodemailer
- **Storage**: AWS S3

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Start both frontend and backend
npm run dev
```

## URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **Admin Login**: meraj@aiplanet.com

## Project Structure

```
aip-recruiter/
├── backend/                 # Express API server
│   ├── config/             # Database config
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   ├── services/           # Business logic (AI, Email)
│   └── server.js           # Main server file
│
├── talent-ai-recruitment/  # React frontend
│   └── src/
│       ├── services/       # API client
│       └── App.jsx         # Main application
│
└── package.json            # Root scripts
```

## Environment Variables

Create `backend/.env`:

```env
MONGODB_URI=mongodb+srv://...
OPENAI_API_KEY=sk-...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_S3_BUCKET=...
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=...
EMAIL_PASSWORD=...
```

## Features

- Job posting with AI-generated descriptions
- Public career portal
- Resume parsing and AI scoring
- Kanban pipeline management
- Screening call scheduling with calendar invites
- Assignment management
- Interview scheduling
- Email notifications
- User role management (RBAC)
