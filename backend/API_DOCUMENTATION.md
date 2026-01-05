# 📚 API Documentation

Complete API reference for the AI Recruitment Platform backend.

**Base URL**: `http://localhost:5000/api`

---

## 🔐 Authentication

Currently, the API uses Supabase service role key for authentication. In production, implement proper JWT authentication.

---

## 📁 Applications API

### Get All Applications

```http
GET /api/applications
```

**Query Parameters**:
- `companyId` (string) - Filter by company
- `jobId` (string) - Filter by job
- `stageId` (string) - Filter by pipeline stage
- `status` (string) - Filter by status
- `minScore` (number) - Filter by minimum AI score
- `search` (string) - Search by candidate name/email
- `limit` (number) - Results per page (default: 50)
- `offset` (number) - Pagination offset (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "job_id": "uuid",
      "candidate_id": "uuid",
      "stage_id": "uuid",
      "status": "screening",
      "ai_score": 85,
      "profile_strength": "Strong",
      "candidate": { ... },
      "job": { ... },
      "stage": { ... }
    }
  ],
  "count": 10,
  "total": 100
}
```

### Get Single Application

```http
GET /api/applications/:id
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "candidate": { ... },
    "job": { ... },
    "stage": { ... },
    "interviews": [ ... ],
    "ai_score": 85,
    "ai_analysis": { ... }
  }
}
```

### Create Application

```http
POST /api/applications
```

**Body**:
```json
{
  "company_id": "uuid",
  "job_id": "uuid",
  "candidate_id": "uuid",
  "stage_id": "uuid",
  "cover_letter": "text",
  "questionnaire_answers": {}
}
```

### Update Application

```http
PATCH /api/applications/:id
```

**Body**:
```json
{
  "status": "interview",
  "stage_id": "uuid",
  "is_hot_applicant": true
}
```

### Move to Different Stage

```http
POST /api/applications/:id/move-stage
```

**Body**:
```json
{
  "stageId": "uuid"
}
```

### Get Activity Log

```http
GET /api/applications/:id/activity
```

---

## 👤 Candidates API

### Get All Candidates

```http
GET /api/candidates?companyId=uuid&search=john
```

### Get Single Candidate

```http
GET /api/candidates/:id
```

### Create Candidate

```http
POST /api/candidates
```

**Body**:
```json
{
  "company_id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "location": "New York",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "resume_url": "https://...",
  "resume_text": "extracted text..."
}
```

### Update Candidate

```http
PATCH /api/candidates/:id
```

---

## 💼 Jobs API

### Get All Jobs

```http
GET /api/jobs?companyId=uuid&isActive=true
```

### Get Single Job

```http
GET /api/jobs/:id
```

### Create Job

```http
POST /api/jobs
```

**Body**:
```json
{
  "company_id": "uuid",
  "title": "Senior Software Engineer",
  "department_id": "uuid",
  "location": "Remote",
  "role_type_id": "uuid",
  "work_setup_id": "uuid",
  "job_overview": "...",
  "key_responsibilities": "...",
  "qualifications": "...",
  "skills": "JavaScript, React, Node.js",
  "salary_min": 100000,
  "salary_max": 150000,
  "experience_min": 5,
  "experience_max": 10,
  "is_active": true
}
```

---

## 📤 Upload API

### Upload Resume

```http
POST /api/upload/resume
```

**Content-Type**: `multipart/form-data`

**Body**:
- `resume` (file) - PDF or DOCX file
- `companyId` (string)
- `candidateId` (string, optional)

**Response**:
```json
{
  "success": true,
  "file": {
    "url": "https://...",
    "path": "company/candidate/resume.pdf",
    "size": 123456,
    "mimeType": "application/pdf"
  },
  "extractedText": "Resume content...",
  "extractedInfo": {
    "email": "john@example.com",
    "phone": "+1234567890",
    "skills": ["JavaScript", "React"]
  }
}
```

### Parse Document

```http
POST /api/upload/parse
```

**Body**:
```json
{
  "fileUrl": "https://...",
  "mimeType": "application/pdf"
}
```

---

## 🤖 AI API

### Score Resume

```http
POST /api/ai/score
```

**Body**:
```json
{
  "resumeText": "Full resume text...",
  "jobId": "uuid",
  "applicationId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "analysis": {
    "score": 85,
    "profileStrength": "Strong",
    "summary": "Excellent candidate with...",
    "strengths": ["5+ years experience", "Strong technical skills"],
    "weaknesses": ["Limited leadership experience"],
    "skillsMatch": [
      { "skill": "JavaScript", "level": "expert", "matched": true }
    ],
    "experienceMatch": "excellent",
    "cultureFit": "good",
    "recommendations": ["Schedule technical interview"]
  }
}
```

### Batch Score

```http
POST /api/ai/batch-score
```

**Body**:
```json
{
  "applicationIds": ["uuid1", "uuid2", "uuid3"]
}
```

---

## 📧 Email API

### Send Application Received

```http
POST /api/email/application-received
```

**Body**:
```json
{
  "candidateId": "uuid",
  "jobId": "uuid"
}
```

### Send Interview Invitation

```http
POST /api/email/interview-invitation
```

**Body**:
```json
{
  "candidateId": "uuid",
  "interviewId": "uuid"
}
```

### Send Status Update

```http
POST /api/email/status-update
```

**Body**:
```json
{
  "applicationId": "uuid",
  "newStatus": "interview"
}
```

### Send Rejection

```http
POST /api/email/rejection
```

**Body**:
```json
{
  "applicationId": "uuid"
}
```

### Send Offer Letter

```http
POST /api/email/offer
```

**Body**:
```json
{
  "candidateId": "uuid",
  "jobId": "uuid",
  "offerDetails": {
    "startDate": "2024-02-01",
    "salary": "$120,000"
  }
}
```

---

## ❌ Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message here"
}
```

**Common HTTP Status Codes**:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `409` - Conflict (duplicate)
- `500` - Internal Server Error

---

## 🔄 Real-time Updates

Use Supabase real-time subscriptions in your frontend:

```javascript
const subscription = supabase
  .from('applications')
  .on('*', payload => {
    console.log('Change received!', payload);
  })
  .subscribe();
```

---

**Need more endpoints? Check the route files in `/backend/routes/`**

