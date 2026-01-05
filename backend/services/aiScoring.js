// =====================================================
// AI SCORING SERVICE
// =====================================================
// Uses OpenAI to analyze and score resumes

const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Validate if the uploaded document is actually a resume
 * @param {string} documentText - Extracted document text
 * @returns {Promise<Object>} Validation result { isResume: boolean, reason: string }
 */
async function validateResume(documentText) {
  try {
    // Quick check for very short documents
    if (!documentText || documentText.trim().length < 100) {
      return { isResume: false, reason: 'Document is too short to be a valid resume' };
    }

    const prompt = `
Analyze the following document and determine if it is a valid resume/CV.

A valid resume typically contains:
- Personal contact information (name, email, phone)
- Work experience or employment history
- Education background
- Skills section
- Professional summary or objective (optional)

Document to analyze:
${documentText.substring(0, 3000)}

Respond in JSON format:
{
  "isResume": true/false,
  "confidence": "high"/"medium"/"low",
  "reason": "<brief explanation>",
  "detectedSections": ["section1", "section2"]
}

If the document is NOT a resume (e.g., cover letter only, random document, image text, invoice, etc.), set isResume to false and explain why.
`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a document classifier that determines if a document is a valid resume/CV. Be strict - only accept documents that are clearly resumes with professional/work content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return {
      isResume: result.isResume === true,
      confidence: result.confidence || 'unknown',
      reason: result.reason || 'Unknown',
      detectedSections: result.detectedSections || []
    };
  } catch (error) {
    console.error('Error validating resume:', error);
    // On error, allow processing but log the issue
    return { isResume: true, reason: 'Validation skipped due to error', confidence: 'unknown' };
  }
}

/**
 * Analyze resume and generate AI score
 * @param {string} resumeText - Extracted resume text
 * @param {Object} jobDetails - Job requirements and details
 * @param {Object} options - Options { skipValidation: boolean }
 * @returns {Promise<Object>} AI analysis and score
 */
async function analyzeResume(resumeText, jobDetails, options = {}) {
  try {
    // Validate document is a resume first (unless skipped)
    if (!options.skipValidation) {
      const validation = await validateResume(resumeText);
      if (!validation.isResume) {
        return {
          score: 0,
          profileStrength: 'Invalid',
          isInvalidResume: true,
          invalidReason: validation.reason,
          strengths: [],
          weaknesses: ['Uploaded document is not a valid resume'],
          skillsMatch: [],
          experienceMatch: 'Unknown',
          cultureFit: 'Unknown',
          recommendations: ['Please upload a proper resume/CV document'],
          summary: `Invalid Document: ${validation.reason}`,
          detailedAnalysis: { validation }
        };
      }
    }

    const prompt = createAnalysisPrompt(resumeText, jobDetails);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a precise resume scoring system. Follow the scoring methodology EXACTLY as specified. Always calculate scores consistently using the weighted formula provided. Never deviate from the scoring rules.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Very low temperature for maximum consistency
      response_format: { type: 'json_object' },
      seed: 42 // Fixed seed for reproducibility
    });
    
    const analysis = JSON.parse(completion.choices[0].message.content);
    
    // Ensure the response has the expected structure
    return {
      score: analysis.score || 0,
      profileStrength: determineProfileStrength(analysis.score || 0),
      strengths: analysis.strengths || [],
      weaknesses: analysis.weaknesses || [],
      skillsMatch: analysis.skillsMatch || [],
      experienceMatch: analysis.experienceMatch || 'Unknown',
      cultureFit: analysis.cultureFit || 'Unknown',
      recommendations: analysis.recommendations || [],
      summary: analysis.summary || 'No summary available',
      detailedAnalysis: analysis
    };
  } catch (error) {
    console.error('Error analyzing resume with AI:', error);
    throw new Error('Failed to analyze resume with AI');
  }
}

/**
 * Create analysis prompt for OpenAI
 * @param {string} resumeText - Resume text
 * @param {Object} jobDetails - Job details
 * @returns {string} Formatted prompt
 */
function createAnalysisPrompt(resumeText, jobDetails) {
  // Parse skills into array for structured matching
  const skillsList = (jobDetails.skills || '').split(',').map(s => s.trim()).filter(Boolean);

  return `
You are an expert technical recruiter. Analyze this resume against the job requirements using a STRICT, CONSISTENT scoring methodology.

## SCORING METHODOLOGY (Follow this EXACTLY):

The final score is calculated as a weighted sum of these components:

1. **SKILLS MATCH (40% of total score = max 40 points)**
   - List each required skill and check if it appears in the resume
   - Score = (matched skills / total required skills) × 40
   - If no skills specified, give 20 points (neutral)

2. **EXPERIENCE MATCH (25% of total score = max 25 points)**
   - Extract years of experience from resume
   - Compare to required: ${jobDetails.experienceMin || 0}-${jobDetails.experienceMax || 10} years
   - If experience >= required max: 25 points
   - If experience >= required min: 20 points
   - If experience is 1-2 years below min: 15 points
   - If experience is 3+ years below min: 10 points
   - If no experience found: 12 points

3. **EDUCATION/QUALIFICATIONS (15% of total score = max 15 points)**
   - Relevant degree: 15 points
   - Related field degree: 12 points
   - Unrelated degree: 8 points
   - No degree mentioned: 5 points

4. **ROLE RELEVANCE (10% of total score = max 10 points)**
   - Previous roles directly match job title: 10 points
   - Previous roles somewhat related: 7 points
   - Previous roles unrelated: 3 points

5. **ADDITIONAL FACTORS (10% of total score = max 10 points)**
   - Certifications relevant to role: +3 points
   - Leadership/management experience: +2 points
   - Project highlights relevant to role: +3 points
   - Clear career progression: +2 points

## JOB REQUIREMENTS:
- **Title:** ${jobDetails.title || 'Not specified'}
- **Department:** ${jobDetails.department || 'Not specified'}
- **Required Skills:** ${skillsList.length > 0 ? skillsList.join(', ') : 'Not specified'}
- **Experience Required:** ${jobDetails.experienceMin || 0}-${jobDetails.experienceMax || 10} years
- **Qualifications:** ${jobDetails.qualifications || 'Not specified'}
- **Key Responsibilities:** ${jobDetails.keyResponsibilities || 'Not specified'}

## RESUME TO ANALYZE:
${resumeText}

## REQUIRED OUTPUT FORMAT (JSON):
{
  "score": <calculated total score 0-100>,
  "scoreBreakdown": {
    "skillsMatch": {"points": <0-40>, "matched": ["skill1", "skill2"], "missing": ["skill3"]},
    "experienceMatch": {"points": <0-25>, "yearsFound": <number>, "assessment": "<text>"},
    "education": {"points": <0-15>, "found": "<degree/qualification>", "relevance": "<high|medium|low>"},
    "roleRelevance": {"points": <0-10>, "relevantRoles": ["role1", "role2"]},
    "additionalFactors": {"points": <0-10>, "factors": ["factor1", "factor2"]}
  },
  "summary": "<2-3 sentence objective summary>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "skillsMatch": [
    {"skill": "<skill name>", "level": "<beginner|intermediate|advanced|expert>", "matched": <true|false>}
  ],
  "experienceMatch": "<excellent|good|fair|poor>",
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>"],
  "keyHighlights": ["<highlight 1>", "<highlight 2>"],
  "redFlags": ["<red flag if any>"]
}

IMPORTANT:
- Calculate the score EXACTLY using the methodology above
- Be consistent - the same resume should get the same score every time
- Be objective - don't inflate or deflate scores
- A score of 70+ means candidate is worth interviewing
- A score of 85+ means strong candidate
- A score below 50 means significant gaps
`;
}

/**
 * Determine profile strength based on score
 * @param {number} score - AI score (0-100)
 * @returns {string} Profile strength category
 */
function determineProfileStrength(score) {
  if (score >= 90) return 'Exceptional';
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Weak';
}

/**
 * Quick score for simple matching (fallback if AI fails)
 * @param {string} resumeText - Resume text
 * @param {Object} jobDetails - Job details
 * @returns {number} Simple score (0-100)
 */
function quickScore(resumeText, jobDetails) {
  let score = 50; // Base score
  
  const resumeLower = resumeText.toLowerCase();
  const requiredSkills = (jobDetails.skills || '').toLowerCase().split(',');
  
  // Check for skill matches
  let matchedSkills = 0;
  requiredSkills.forEach(skill => {
    if (skill.trim() && resumeLower.includes(skill.trim())) {
      matchedSkills++;
    }
  });
  
  if (requiredSkills.length > 0) {
    score += (matchedSkills / requiredSkills.length) * 30;
  }
  
  // Check for experience keywords
  const experienceKeywords = ['years', 'experience', 'worked', 'developed', 'managed'];
  const experienceCount = experienceKeywords.filter(kw => resumeLower.includes(kw)).length;
  score += Math.min(experienceCount * 4, 20);
  
  return Math.min(Math.round(score), 100);
}

/**
 * Generate job description using AI
 * @param {Object} params - Job parameters
 * @param {string} params.title - Job title
 * @param {string} params.department - Department name
 * @param {string} params.roleType - Full-time, Part-time, etc.
 * @param {string} params.workSetup - Remote, Hybrid, On-site
 * @param {string} params.location - Job location
 * @param {string} params.experienceMin - Minimum experience years
 * @param {string} params.experienceMax - Maximum experience years
 * @returns {Promise<Object>} Generated job description
 */
async function generateJobDescription(params) {
  try {
    const { title, department, roleType, workSetup, location, experienceMin, experienceMax } = params;

    const prompt = `
You are an expert HR professional and job description writer for AI Planet, an Indian AI/ML company based in India. Create a comprehensive, professional job description for the following role.

## COMPANY CONTEXT:
AI Planet is an Indian AI startup with a 300K+ global AI community. The company focuses on AI marketplace and Generative AI stack solutions.

## ROLE DETAILS:
- **Job Title:** ${title}
- **Department:** ${department || 'Not specified'}
- **Employment Type:** ${roleType || 'Full-time'}
- **Work Setup:** ${workSetup || 'Not specified'}
- **Location:** ${location || 'India'}
- **Experience Required:** ${experienceMin || 0}-${experienceMax || 5} years

## INSTRUCTIONS:
1. Create content that is specific to this role, not generic
2. Use industry-standard terminology relevant to Indian tech industry
3. Be realistic about requirements - don't over-inflate
4. Make it engaging to attract top Indian talent
5. Include both technical and soft skills where relevant
6. Keep each section concise but comprehensive

## INDIAN EDUCATION STANDARDS TO USE:
- Use Indian degree names: B.Tech/B.E., M.Tech/M.E., MCA, BCA, B.Sc/M.Sc in Computer Science
- Reference Indian institutions where appropriate (IITs, NITs, IIIT, top universities)
- Include relevant Indian certifications if applicable
- Consider typical Indian career progression and experience levels

## REQUIRED OUTPUT FORMAT (JSON):
{
  "jobOverview": "<2-3 paragraphs wrapped in <p> tags. Example: <p>First paragraph...</p><p>Second paragraph...</p>. Should excite candidates about the opportunity. Mention working with cutting-edge AI/ML technologies. 150-250 words total>",

  "keyResponsibilities": "<Use <ul><li>Item 1</li><li>Item 2</li></ul> format with 6-8 specific responsibilities. Each item should start with an action verb>",

  "qualifications": "<Use <ul><li>Item 1</li><li>Item 2</li></ul> format with 5-7 required qualifications. Use Indian degree standards (B.Tech/B.E., M.Tech, MCA, etc.)>",

  "preferredQualifications": "<Use <ul><li>Item 1</li><li>Item 2</li></ul> format with 3-5 nice-to-have qualifications>",

  "skills": "<comma-separated plain text list of 8-12 skills. NO HTML tags. Example: Python, Machine Learning, TensorFlow, Communication>",

  "benefits": "<Use <ul><li>Item 1</li><li>Item 2</li></ul> format with 5-7 benefits typical for Indian startups>"
}

CRITICAL FORMATTING RULES:
1. jobOverview: Wrap each paragraph in <p></p> tags. Do NOT use bullet points.
2. keyResponsibilities, qualifications, preferredQualifications, benefits: Use <ul><li></li></ul> format ONLY. No <p> tags inside lists.
3. skills: Plain comma-separated text ONLY. NO HTML tags at all.
4. Make content specific to the ${title} role
5. Use Indian education standards (B.Tech, M.Tech, MCA, etc.)
6. Benefits should be relevant to Indian employment context
`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert HR professional who writes compelling, accurate job descriptions. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7, // Slightly creative but still consistent
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content);

    return {
      success: true,
      jobDescription: {
        jobOverview: result.jobOverview || '',
        keyResponsibilities: result.keyResponsibilities || '',
        qualifications: result.qualifications || '',
        preferredQualifications: result.preferredQualifications || '',
        skills: result.skills || '',
        benefits: result.benefits || ''
      }
    };
  } catch (error) {
    console.error('Error generating job description with AI:', error);
    throw new Error('Failed to generate job description: ' + error.message);
  }
}

module.exports = {
  analyzeResume,
  validateResume,
  quickScore,
  determineProfileStrength,
  generateJobDescription
};

