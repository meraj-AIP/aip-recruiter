# 🚀 AI Recruitment Platform - Backend

Node.js + Express backend for AI-powered recruitment system with Supabase integration.

## ✨ Features

- ✅ **Resume Upload & Parsing** - PDF and DOCX support
- ✅ **AI-Powered Scoring** - OpenAI integration for intelligent resume analysis
- ✅ **Email Notifications** - Automated candidate communications
- ✅ **RESTful API** - Complete CRUD operations
- ✅ **Supabase Integration** - PostgreSQL database + Storage
- ✅ **Document Processing** - Extract text from resumes
- ✅ **Batch Operations** - Score multiple applications at once

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **AI**: OpenAI GPT-4
- **Email**: Nodemailer
- **File Processing**: pdf-parse, mammoth

## 📦 Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env

# Start development server
npm run dev
```

## 🔧 Environment Variables

See `.env.example` for all required variables:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `OPENAI_API_KEY` - OpenAI API key
- `EMAIL_*` - Email configuration

## 📚 API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

## 🏗️ Project Structure

```
backend/
├── config/
│   └── supabase.js          # Supabase client configuration
├── routes/
│   ├── applications.js      # Application endpoints
│   ├── candidates.js        # Candidate endpoints
│   ├── jobs.js             # Job openings endpoints
│   ├── ai.js               # AI scoring endpoints
│   ├── email.js            # Email notification endpoints
│   └── upload.js           # File upload endpoints
├── services/
│   ├── aiScoring.js        # AI resume analysis
│   ├── documentParser.js   # PDF/DOCX parsing
│   └── emailService.js     # Email templates & sending
├── server.js               # Main application file
├── package.json
└── .env                    # Environment variables (create this)
```

## 🚀 Quick Start

1. **Setup Supabase**:
   - Create project at supabase.com
   - Run SQL schema from `/supabase/schema.sql`
   - Create storage bucket named `resumes`

2. **Configure Environment**:
   - Copy `.env.example` to `.env`
   - Fill in all credentials

3. **Start Server**:
   ```bash
   npm run dev
   ```

4. **Test**:
   - Visit `http://localhost:5000/health`
   - Should see: `{"status": "OK"}`

## 📝 Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload

## 🔒 Security Notes

- Never commit `.env` file
- Keep `SUPABASE_SERVICE_KEY` secret
- Use environment variables for all sensitive data
- Implement proper authentication before production

## 🐛 Troubleshooting

**Server won't start?**
- Check all environment variables are set
- Ensure Node.js version is 16+
- Run `npm install` again

**AI scoring fails?**
- Verify OpenAI API key
- Check you have credits
- System falls back to quick score

**Emails not sending?**
- Check SMTP credentials
- For Gmail, use App Password
- Enable 2-Step Verification

## 📄 License

MIT

## 🤝 Contributing

This is a private project. Contact the team for contribution guidelines.

