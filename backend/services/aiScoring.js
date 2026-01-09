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

A valid resume typically contains SOME of these elements (not all are required):
- Personal information (name, email, phone)
- Work experience OR internships OR projects
- Education background
- Skills/technologies list
- Professional summary (optional)

IMPORTANT: Be LENIENT in your judgment. If the document contains:
1. A person's name, AND
2. ANY work/education/skills/projects content

Then it IS a valid resume, even if formatting is unusual or some sections are missing.

Document to analyze:
${documentText.substring(0, 3000)}

Respond in JSON format:
{
  "isResume": true/false,
  "confidence": "high"/"medium"/"low",
  "reason": "<brief explanation>",
  "detectedSections": ["section1", "section2"]
}

Only mark as NOT a resume if it's clearly something else like an invoice, cover letter only, random text, or completely unrelated document.
`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a document classifier. Be LENIENT - if a document has a name and any professional/educational content, classify it as a resume. Only reject clearly non-resume documents.'
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
  // Parse skills into array for structured matching (handle both array and string)
  const skillsList = Array.isArray(jobDetails.skills)
    ? jobDetails.skills
    : (jobDetails.skills || '').split(',').map(s => s.trim()).filter(Boolean);

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
  // Handle both array and string for skills
  const skillsArray = Array.isArray(jobDetails.skills)
    ? jobDetails.skills
    : (jobDetails.skills || '').split(',');
  const requiredSkills = skillsArray.map(s => s.toLowerCase().trim()).filter(Boolean);
  
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

/**
 * Analyze assignment submission using AI
 * @param {Object} params - Analysis parameters
 * @param {string} params.assignmentTitle - Title of the assignment
 * @param {string} params.assignmentDescription - Original assignment description/requirements
 * @param {Array} params.submissionLinks - Array of submitted links (GitHub, etc.)
 * @param {string} params.submissionNotes - Notes provided by candidate
 * @param {Array} params.submissionFiles - Array of submitted file info
 * @param {Object} params.jobDetails - Job details for context
 * @param {Object} params.candidateInfo - Candidate information
 * @returns {Promise<Object>} AI analysis result
 */
async function analyzeAssignmentSubmission(params) {
  const {
    assignmentTitle,
    assignmentDescription,
    submissionLinks = [],
    submissionNotes = '',
    submissionFiles = [],
    jobDetails = {},
    candidateInfo = {}
  } = params;

  try {
    // Fetch GitHub repo info if GitHub link is provided
    let githubAnalysis = null;
    const githubLink = submissionLinks.find(link => link.includes('github.com'));

    if (githubLink) {
      githubAnalysis = await analyzeGitHubRepo(githubLink);
    }

    // Categorize other links
    const driveLinks = submissionLinks.filter(link => link.includes('drive.google.com') || link.includes('docs.google.com'));
    const demoLinks = submissionLinks.filter(link => link.includes('vercel') || link.includes('netlify') || link.includes('herokuapp') || link.includes('render.com'));
    const videoLinks = submissionLinks.filter(link => link.includes('loom.com') || link.includes('youtube.com') || link.includes('vimeo.com'));
    const otherLinks = submissionLinks.filter(link =>
      !link.includes('github.com') &&
      !link.includes('drive.google.com') &&
      !link.includes('docs.google.com') &&
      !link.includes('vercel') &&
      !link.includes('netlify') &&
      !link.includes('herokuapp') &&
      !link.includes('loom.com') &&
      !link.includes('youtube.com') &&
      !link.includes('vimeo.com')
    );

    const skillsList = Array.isArray(jobDetails.skills)
      ? jobDetails.skills.join(', ')
      : jobDetails.skills || '';

    // Calculate time since repo creation vs assignment (freshness indicator)
    const repoCreatedRecently = githubAnalysis?.createdAt ?
      (new Date() - new Date(githubAnalysis.createdAt)) < (7 * 24 * 60 * 60 * 1000) : false; // Within 7 days

    const prompt = `
You are a SENIOR TECHNICAL RECRUITER with 15+ years of hiring experience at top tech companies (Google, Meta, Amazon level).
You evaluate candidates PRACTICALLY - focusing on what ACTUALLY matters for job success, not theoretical perfection.

YOUR EVALUATION PHILOSOPHY:
- A working solution beats a perfect plan
- Practical problem-solving > academic correctness
- Code that ships > code that's over-engineered
- Clear communication > complex documentation
- Evidence of learning ability > current skill level
- Real-world trade-offs understanding > textbook answers

=================================================================================
JOB CONTEXT
=================================================================================
**Position:** ${jobDetails.title || 'Software Engineering Role'}
**Required Skills:** ${skillsList || 'Not specified'}
**Experience Level:** ${jobDetails.experienceMin || 0}-${jobDetails.experienceMax || 5} years
**What we're looking for:** Someone who can deliver working solutions, collaborate effectively, and grow with the team.

=================================================================================
ASSIGNMENT GIVEN
=================================================================================
**Title:** ${assignmentTitle || 'Technical Assignment'}

**Requirements:**
${assignmentDescription || 'No description provided'}

=================================================================================
CANDIDATE SUBMISSION
=================================================================================
**Candidate:** ${candidateInfo.name || 'Unknown'} (${candidateInfo.email || 'No email'})

**What they submitted:**
${submissionLinks.length > 0 ? submissionLinks.map((link, i) => `${i + 1}. ${link}`).join('\n') : '⚠️ NO LINKS PROVIDED - This is a red flag'}

**Candidate's Notes:**
"${submissionNotes || 'No notes provided - Did they explain their approach? This matters!'}"

**Files Attached:**
${submissionFiles.length > 0 ? submissionFiles.map(f => `- ${f.name || f.originalName || 'File'} (${f.size ? Math.round(f.size/1024) + 'KB' : 'size unknown'})`).join('\n') : 'None'}

${githubAnalysis && githubAnalysis.analysisStatus === 'success' ? `
=================================================================================
GITHUB REPOSITORY ANALYSIS
=================================================================================
**Repository:** ${githubAnalysis.repoName || 'Unknown'} (${githubAnalysis.repoUrl || 'N/A'})
**Primary Language:** ${githubAnalysis.language || 'Unknown'}
**All Languages:** ${githubAnalysis.languages ? Object.entries(githubAnalysis.languages).map(([lang, bytes]) => `${lang} (${Math.round(bytes/1024)}KB)`).join(', ') : 'Unknown'}

🚨 RECRUITER RED FLAG CHECKS:
${githubAnalysis.isFork ? '⚠️ FORKED REPO: This is forked from another repo - verify this is original work, not copied!' : '✅ Original repository (not a fork)'}
${repoCreatedRecently ? '✅ Repo created recently (likely for this assignment)' : '⚠️ Repo existed before assignment - could be pre-existing work or template'}
${!githubAnalysis.hasReadme ? '⚠️ NO README: Candidate didn\'t document their work - communication red flag' : '✅ Has README'}
${githubAnalysis.recentCommits < 3 ? '⚠️ VERY FEW COMMITS (' + githubAnalysis.recentCommits + '): May indicate bulk upload instead of iterative development' : '✅ Good commit history (' + githubAnalysis.recentCommits + ' commits)'}
${!githubAnalysis.description ? '⚠️ No repo description: Shows lack of attention to detail' : '✅ Has description: ' + githubAnalysis.description}

📊 EFFORT & PROFESSIONALISM INDICATORS:
- README Present: ${githubAnalysis.hasReadme ? 'Yes ✅' : 'No ❌ (Major concern - shows poor communication)'}
- Tests Written: ${githubAnalysis.hasTests ? 'Yes ✅ (Shows quality mindset)' : 'No ⚠️ (Acceptable for junior, concerning for senior)'}
- CI/CD Setup: ${githubAnalysis.hasCICD ? 'Yes ✅ (Bonus - shows DevOps awareness)' : 'No (Normal for assignment)'}
- Docker: ${githubAnalysis.hasDockerfile ? 'Yes ✅ (Bonus - deployment ready)' : 'No (Normal for assignment)'}
- Proper .gitignore: ${githubAnalysis.fileStructure?.includes('.gitignore') ? 'Yes ✅' : 'No ⚠️'}

📅 TIMELINE ANALYSIS (Important for authenticity):
- Repo Created: ${githubAnalysis.createdAt ? new Date(githubAnalysis.createdAt).toLocaleDateString() : 'Unknown'}
- Last Activity: ${githubAnalysis.pushedAt ? new Date(githubAnalysis.pushedAt).toLocaleDateString() : 'Unknown'}
- Days Active: ${githubAnalysis.createdAt && githubAnalysis.pushedAt ? Math.ceil((new Date(githubAnalysis.pushedAt) - new Date(githubAnalysis.createdAt)) / (1000 * 60 * 60 * 24)) : 'Unknown'} days

📝 COMMIT QUALITY (Shows how candidate works):
${githubAnalysis.commitHistory && githubAnalysis.commitHistory.length > 0
  ? githubAnalysis.commitHistory.map(c => `  - "${c.message}" (${new Date(c.date).toLocaleDateString()})`).join('\n')
  : '⚠️ No commit history visible - suspicious!'}

Commit Message Quality Assessment:
${githubAnalysis.commitHistory && githubAnalysis.commitHistory.length > 0 ?
  (githubAnalysis.commitHistory.some(c => c.message.length > 20 && !c.message.toLowerCase().includes('initial') && !c.message.toLowerCase().includes('update')) ?
    '✅ Descriptive commit messages (good practice)' :
    '⚠️ Generic/poor commit messages (e.g., "update", "fix") - shows rushed work or poor habits')
  : '❌ Cannot assess'}

📁 PROJECT STRUCTURE:
${githubAnalysis.fileStructure || 'Could not fetch'}

${githubAnalysis.readmeContent ? `
📖 README CONTENT (What candidate communicated):
---
${githubAnalysis.readmeContent}
---
ASSESS: Does the README explain:
- How to run the project?
- What approach was taken?
- Any assumptions made?
- Known limitations?
` : '❌ NO README - Candidate failed to document their work. This is a significant communication red flag.'}

${githubAnalysis.dependencies ? `
🔧 TECH STACK ANALYSIS:
- Project: ${githubAnalysis.dependencies.name || 'Unknown'}
- Dependencies (${githubAnalysis.dependencies.dependencies?.length || 0}): ${githubAnalysis.dependencies.dependencies?.slice(0, 15).join(', ') || 'None'}
- Dev Tools (${githubAnalysis.dependencies.devDependencies?.length || 0}): ${githubAnalysis.dependencies.devDependencies?.slice(0, 10).join(', ') || 'None'}
- NPM Scripts: ${githubAnalysis.dependencies.scripts?.join(', ') || 'None'}

Tech Stack Assessment:
- Using modern/relevant technologies? (React, Vue, Node, etc.)
- Any outdated or unusual choices?
- Appropriate complexity for the task?
` : ''}
` : githubAnalysis?.error ? `
=================================================================================
GITHUB REPOSITORY ANALYSIS ISSUE
=================================================================================
**Status:** ${githubAnalysis.analysisStatus || 'failed'}
**Error Type:** ${githubAnalysis.errorType || 'Unknown'}
**Error:** ${githubAnalysis.error}
**Provided URL:** ${githubAnalysis.providedUrl || 'N/A'}
${githubAnalysis.isPrivate ? '**Private Repository:** Yes - Cannot access without authentication' : ''}
${githubAnalysis.possibleReasons ? `
**Possible Reasons:**
${githubAnalysis.possibleReasons.map(r => `  - ${r}`).join('\n')}
` : ''}
**Recommendation:** ${githubAnalysis.recommendation || 'Verify URL with candidate'}
${githubAnalysis.actionItems ? `
**Suggested Actions:**
${githubAnalysis.actionItems.map(a => `  - ${a}`).join('\n')}
` : ''}
${githubAnalysis.rateLimitResetsAt ? `**Rate Limit Resets At:** ${githubAnalysis.rateLimitResetsAt}` : ''}

⚠️ IMPORTANT: Since GitHub analysis failed, base your code quality assessment on other available materials (documentation, notes, deployed demos) and clearly note the limitation in your evaluation.
` : ''}

${driveLinks.length > 0 ? `
**Google Drive/Docs Links:** ${driveLinks.length} link(s) provided
${driveLinks.map((link, i) => `  ${i + 1}. ${link}`).join('\n')}
` : ''}

${demoLinks.length > 0 ? `
🌐 LIVE DEMO PROVIDED (This is a BIG plus!):
${demoLinks.map((link, i) => `  ${i + 1}. ${link}`).join('\n')}
➡️ A working demo shows the candidate can actually SHIP something. Check if it works!
` : '⚠️ No live demo provided - Candidate missed opportunity to showcase working product'}

${videoLinks.length > 0 ? `
🎥 VIDEO WALKTHROUGH PROVIDED (Shows communication skills!):
${videoLinks.map((link, i) => `  ${i + 1}. ${link}`).join('\n')}
➡️ Video demos show communication ability and pride in work. Big plus!
` : ''}

${otherLinks.length > 0 ? `
🔗 OTHER LINKS:
${otherLinks.map((link, i) => `  ${i + 1}. ${link}`).join('\n')}
` : ''}

=================================================================================
PRACTICAL RECRUITER EVALUATION FRAMEWORK
=================================================================================
Evaluate like a REAL hiring manager who needs to make a decision. Focus on:

1. **DOES IT WORK? (40% weight)** - Most important!
   - Can someone clone and run this project?
   - Does it actually solve the problem asked?
   - Is there a working demo?
   - Did they complete the core requirements?
   ➡️ A working 70% solution beats a broken 100% solution

2. **CODE QUALITY & PROFESSIONALISM (25% weight)**
   - Is the code readable by other developers?
   - Sensible file/folder organization?
   - Would you want to maintain this code?
   - Any obvious bugs or errors visible?
   - NOT looking for perfection - looking for competence

3. **COMMUNICATION & DOCUMENTATION (20% weight)** - Often overlooked but critical!
   - Did they explain HOW to run their project?
   - Did they explain their APPROACH and DECISIONS?
   - Did they mention any LIMITATIONS or TRADE-OFFS?
   - Would a new team member understand this?
   ➡️ Poor documentation = potential poor team player

4. **EFFORT & INITIATIVE (10% weight)**
   - Did they go beyond minimum requirements?
   - Tests, deployment, extra features?
   - Shows they CARE about quality

5. **RED FLAGS CHECK (5% weight)** - Deal breakers!
   - Is this potentially copied/plagiarized? (Check if forked, generic commits)
   - Security issues? (Exposed API keys, SQL injection potential)
   - Did they even read the requirements?
   - Empty repo or minimal effort?

=================================================================================
REQUIRED JSON RESPONSE FORMAT
=================================================================================
{
  "overallScore": <number 0-100>,
  "recommendation": "Strong Hire" | "Hire" | "Lean Hire" | "Needs Discussion" | "Lean No" | "No Hire",
  "confidenceLevel": "High" | "Medium" | "Low",
  "executiveSummary": "<2-3 sentence TL;DR for busy hiring manager - be direct!>",

  "quickVerdict": {
    "inOneLine": "<One line verdict, e.g., 'Solid developer who delivers working code but needs to improve documentation habits'>",
    "wouldYouHire": true | false,
    "whyOrWhyNot": "<Direct answer - what made you decide?>"
  },

  "submissionOverview": {
    "whatWasSubmitted": "<list what was actually provided>",
    "whatWasMissing": "<what was expected but not provided, or 'Nothing - complete submission'>",
    "firstImpression": "<your gut reaction as a recruiter>",
    "effortLevel": "High Effort" | "Good Effort" | "Adequate" | "Minimal Effort" | "Low Effort"
  },

  "criteriaScores": {
    "functionalityAndCompleteness": {
      "score": <0-100>,
      "weight": 40,
      "verdict": "<Does it work? Did they finish?>",
      "evidence": ["<specific observation>"]
    },
    "codeQualityAndProfessionalism": {
      "score": <0-100>,
      "weight": 25,
      "verdict": "<Is the code clean and maintainable?>",
      "evidence": ["<specific observation>"]
    },
    "communicationAndDocumentation": {
      "score": <0-100>,
      "weight": 20,
      "verdict": "<Did they explain their work well?>",
      "evidence": ["<specific observation>"]
    },
    "effortAndInitiative": {
      "score": <0-100>,
      "weight": 10,
      "verdict": "<Did they go above and beyond?>",
      "bonuses": ["<extra things done>"]
    },
    "redFlagsCheck": {
      "score": <0-100>,
      "weight": 5,
      "verdict": "<Any deal-breakers?>",
      "concerns": ["<any red flags found>"]
    }
  },

  "authenticityCheck": {
    "likelyOriginalWork": true | false,
    "concerns": ["<any plagiarism/copy concerns>"],
    "evidenceOfEffort": "<signs this is their own work>",
    "commitPatternAnalysis": "<do commits show real development process or bulk upload?>"
  },

  "technicalDeepDive": {
    "techStackChoice": "<appropriate/inappropriate and why>",
    "architectureQuality": "<good/poor structure and why>",
    "codePatterns": ["<notable patterns - good or bad>"],
    "securityIssues": ["<any security red flags>"],
    "performanceConsiderations": "<any obvious performance issues>"
  },

  "strengths": [
    {"point": "<strength>", "whyItMatters": "<practical impact for the job>"}
  ],

  "concerns": [
    {"issue": "<concern>", "severity": "Deal-breaker" | "Significant" | "Minor", "suggestion": "<what to ask in interview>"}
  ],

  "redFlags": ["<serious concerns that need discussion - be specific>"],
  "greenFlags": ["<impressive positives that stand out - be specific>"],

  "skillsAssessment": {
    "clearlyDemonstrated": ["<skills they definitely have>"],
    "possiblyHave": ["<skills that seem present but need verification>"],
    "notDemonstrated": ["<required skills not shown - concerning or just not applicable?>"],
    "seniorityAssessment": "<Does their work match the expected experience level? Junior/Mid/Senior indicators>"
  },

  "interviewRecommendations": {
    "shouldProceedToInterview": true | false,
    "interviewType": "Technical Deep-Dive" | "Behavioral Focus" | "Pair Programming" | "System Design" | "Skip - Not Recommended",
    "mustAskQuestions": [
      {"question": "<specific question based on their submission>", "reason": "<what you're trying to understand>"}
    ],
    "topicsToExplore": ["<areas to dig deeper>"],
    "warningAreas": ["<things to watch out for in interview>"]
  },

  "comparativeAssessment": {
    "comparedToTypicalCandidates": "<how does this compare to average submissions you've seen?>",
    "standoutFactor": "<what makes this candidate different - positive or negative>",
    "experienceLevelMatch": "Exceeds" | "Matches" | "Below" | "Way Below"
  },

  "finalVerdict": {
    "decision": "Strong Hire" | "Hire" | "Lean Hire" | "Needs Discussion" | "Lean No" | "No Hire",
    "confidence": "High" | "Medium" | "Low",
    "reasoning": "<clear, practical reasoning - what tipped the scale?>",
    "whatWouldChangeYourMind": "<if 'Lean No', what could they show in interview to change to 'Hire'?>",
    "nextSteps": "<specific recommended action>"
  }
}

SCORING GUIDELINES:
- 85-100: Exceptional - Would hire immediately, shows senior-level thinking
- 70-84: Good - Solid submission, worth interviewing, minor concerns
- 55-69: Borderline - Some promise but significant gaps, needs strong interview
- 40-54: Below expectations - Major issues, probably skip unless desperate
- 0-39: Poor - Clear no, don't waste interview time

Be HONEST and PRACTICAL. Don't sugarcoat - recruiters need to make real decisions.
Reference SPECIFIC evidence from what you can see. If you can't assess something, say so.
`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a SENIOR TECHNICAL RECRUITER at a top tech company (Google/Meta/Amazon caliber).
You've reviewed thousands of candidate submissions and know exactly what separates good candidates from great ones.

YOUR MINDSET:
- You're practical, not academic. Working code > perfect theory.
- You spot BS quickly - copy-pasted work, minimal effort, fake commits.
- You value communication skills - can they explain their work?
- You think about team fit - would you want to work with this person?
- You're fair but honest - no sugarcoating, real feedback.

YOUR APPROACH:
1. First impression matters - what's your gut reaction?
2. Does it WORK? This trumps everything else.
3. Can they communicate? README and notes tell a lot.
4. Red flags check - plagiarism, security issues, zero effort.
5. Would you stake your reputation recommending this person?

IMPORTANT:
- Be SPECIFIC - reference actual files, commits, code you can see
- Be HONEST - if it's mediocre, say so. Don't inflate scores.
- Be PRACTICAL - focus on what matters for actual job performance
- Be FAIR - consider experience level expectations
- If you can't verify something (e.g., can't access private repo), say so clearly

You must respond with valid JSON matching the exact format requested.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 4050,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0].message.content);

    return {
      success: true,
      analysis: {
        // Core scores
        overallScore: result.overallScore || 0,
        recommendation: result.recommendation || result.finalVerdict?.decision || 'Needs Discussion',
        confidenceLevel: result.confidenceLevel || result.finalVerdict?.confidence || 'Medium',
        executiveSummary: result.executiveSummary || '',

        // NEW: Quick verdict for recruiters
        quickVerdict: result.quickVerdict || {},

        // Submission details
        submissionOverview: result.submissionOverview || {},

        // Scoring breakdown
        criteriaScores: result.criteriaScores || {},

        // NEW: Authenticity check
        authenticityCheck: result.authenticityCheck || {},

        // Technical analysis
        technicalDeepDive: result.technicalDeepDive || {},

        // Strengths and concerns
        strengths: result.strengths || [],
        concerns: result.concerns || result.areasForImprovement || [],
        areasForImprovement: result.concerns || result.areasForImprovement || [], // backward compat
        redFlags: result.redFlags || [],
        greenFlags: result.greenFlags || [],

        // Skills
        skillsAssessment: result.skillsAssessment || {},

        // Interview
        interviewRecommendations: result.interviewRecommendations || {},

        // NEW: Comparative assessment
        comparativeAssessment: result.comparativeAssessment || {},
        comparativeNotes: result.comparativeAssessment?.comparedToTypicalCandidates || result.comparativeNotes || '',

        // Final verdict
        finalVerdict: result.finalVerdict || {},

        // GitHub data
        githubAnalysis: githubAnalysis,

        // Legacy fields for backward compatibility
        technicalObservations: result.technicalDeepDive?.codePatterns || [],
        summary: result.executiveSummary || '',
        detailedFeedback: result.finalVerdict?.reasoning || '',
        questionsForInterview: (result.interviewRecommendations?.mustAskQuestions || result.interviewRecommendations?.questionsToAsk || []).map(q => typeof q === 'string' ? q : q.question)
      },
      analyzedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error analyzing assignment submission:', error);
    throw new Error('Failed to analyze assignment: ' + error.message);
  }
}

/**
 * Analyze GitHub repository with comprehensive error handling
 * @param {string} githubUrl - GitHub repository URL
 * @returns {Promise<Object>} Repository analysis
 */
async function analyzeGitHubRepo(githubUrl) {
  try {
    // Validate URL format first
    if (!githubUrl || typeof githubUrl !== 'string') {
      return {
        error: 'No GitHub URL provided',
        errorType: 'INVALID_INPUT',
        analysisStatus: 'failed',
        recommendation: 'Ask candidate to provide a valid GitHub repository URL'
      };
    }

    // Clean the URL
    const cleanUrl = githubUrl.trim().replace(/\/$/, '');

    // Extract owner and repo from URL - support various GitHub URL formats
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/\?#]+)/,           // Standard: github.com/owner/repo
      /github\.com\/([^\/]+)\/([^\/]+)\/tree\/.+/,    // With branch: github.com/owner/repo/tree/branch
      /github\.com\/([^\/]+)\/([^\/]+)\/blob\/.+/,    // File link: github.com/owner/repo/blob/...
    ];

    let owner, repoName;
    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match) {
        owner = match[1];
        repoName = match[2].replace(/\.git$/, '');
        break;
      }
    }

    if (!owner || !repoName) {
      return {
        error: 'Invalid GitHub URL format. Expected format: github.com/username/repository',
        errorType: 'INVALID_URL_FORMAT',
        providedUrl: githubUrl,
        analysisStatus: 'failed',
        recommendation: 'Ask candidate to provide a valid GitHub repository URL (e.g., https://github.com/username/repo)'
      };
    }

    // Check for common URL mistakes
    if (repoName.includes('.') && !repoName.includes('-')) {
      // Might be a file extension mistake like "repo.js" instead of "repo"
      console.log(`Warning: Repo name "${repoName}" looks unusual, proceeding anyway`);
    }

    const headers = {
      'User-Agent': 'AI-Recruitment-Platform',
      'Accept': 'application/vnd.github.v3+json'
    };

    // Add GitHub token if available for higher rate limits
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    // Fetch repo info from GitHub API
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, { headers });

    if (!repoResponse.ok) {
      const status = repoResponse.status;

      if (status === 404) {
        // Could be private or doesn't exist
        return {
          repoName: `${owner}/${repoName}`,
          error: 'Repository not found - either it does not exist, or it is private',
          errorType: 'NOT_FOUND_OR_PRIVATE',
          providedUrl: githubUrl,
          analysisStatus: 'failed',
          isPrivate: true,
          possibleReasons: [
            'The repository is private and requires authentication',
            'The repository URL is incorrect or has a typo',
            'The repository was deleted or renamed',
            'The username/organization does not exist'
          ],
          recommendation: 'Ask candidate to: (1) Make the repo public, (2) Add your GitHub account as collaborator, or (3) Verify the URL is correct',
          actionItems: [
            'Verify the repository URL with the candidate',
            'Request repository access if private',
            'Consider asking for alternative submission method (ZIP file, etc.)'
          ]
        };
      } else if (status === 403) {
        // Rate limited
        const rateLimitReset = repoResponse.headers.get('X-RateLimit-Reset');
        const resetTime = rateLimitReset ? new Date(rateLimitReset * 1000).toLocaleTimeString() : 'unknown';
        return {
          repoName: `${owner}/${repoName}`,
          error: 'GitHub API rate limit exceeded',
          errorType: 'RATE_LIMITED',
          providedUrl: githubUrl,
          analysisStatus: 'rate_limited',
          rateLimitResetsAt: resetTime,
          recommendation: 'Wait for rate limit reset or configure GITHUB_TOKEN in environment for higher limits',
          actionItems: [
            'Try again later',
            'Configure GITHUB_TOKEN environment variable for 5000 requests/hour instead of 60'
          ]
        };
      } else {
        return {
          repoName: `${owner}/${repoName}`,
          error: `GitHub API error: ${status}`,
          errorType: 'API_ERROR',
          providedUrl: githubUrl,
          analysisStatus: 'failed',
          recommendation: 'Try again later or verify the repository URL'
        };
      }
    }

    const repoData = await repoResponse.json();

    // Check if it's actually private (shouldn't reach here for private repos without token)
    if (repoData.private) {
      return {
        repoName: repoData.full_name,
        error: 'Repository is private',
        errorType: 'PRIVATE_REPO',
        providedUrl: githubUrl,
        analysisStatus: 'limited',
        isPrivate: true,
        description: repoData.description,
        recommendation: 'Repository is private but accessible. Full analysis may be limited.',
        partialData: {
          description: repoData.description,
          createdAt: repoData.created_at
        }
      };
    }

    // Fetch languages with error handling
    let languages = {};
    let languagesFetched = false;
    try {
      const langResponse = await fetch(repoData.languages_url, { headers });
      if (langResponse.ok) {
        languages = await langResponse.json();
        languagesFetched = true;
      }
    } catch (e) {
      console.log('Could not fetch languages:', e.message);
    }

    // Fetch recent commits with details
    let recentCommits = 0;
    let commitDetails = [];
    let commitsFetched = false;
    try {
      const commitsResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/commits?per_page=10`,
        { headers }
      );
      if (commitsResponse.ok) {
        const commits = await commitsResponse.json();
        recentCommits = commits.length;
        commitsFetched = true;
        commitDetails = commits.slice(0, 5).map(c => ({
          message: c.commit.message.split('\n')[0].substring(0, 80),
          date: c.commit.author?.date,
          author: c.commit.author?.name
        }));
      }
    } catch (e) {
      console.log('Could not fetch commits:', e.message);
    }

    // Fetch file tree (root level) with more details
    let fileStructure = '';
    let fileList = [];
    let hasPackageJson = false;
    let hasDockerfile = false;
    let hasTests = false;
    let hasCICD = false;
    let contentsFetched = false;

    try {
      const contentsResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/contents`,
        { headers }
      );
      if (contentsResponse.ok) {
        const contents = await contentsResponse.json();
        contentsFetched = true;
        fileList = contents.map(f => ({
          name: f.name,
          type: f.type,
          size: f.size
        }));
        fileStructure = contents.map(f => `${f.type === 'dir' ? '📁' : '📄'} ${f.name}`).join(', ');

        // Check for important files
        const fileNames = contents.map(f => f.name.toLowerCase());
        hasPackageJson = fileNames.includes('package.json');
        hasDockerfile = fileNames.some(f => f.includes('dockerfile'));
        hasTests = fileNames.some(f => f.includes('test') || f.includes('spec') || f === '__tests__');
        hasCICD = fileNames.includes('.github') || fileNames.includes('.gitlab-ci.yml') || fileNames.includes('.travis.yml');
      }
    } catch (e) {
      console.log('Could not fetch contents:', e.message);
    }

    // Fetch README content if available
    let readmeContent = null;
    let hasReadme = false;
    try {
      const readmeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/readme`,
        { headers }
      );
      if (readmeResponse.ok) {
        const readmeData = await readmeResponse.json();
        hasReadme = true;
        // Decode base64 content
        if (readmeData.content) {
          const decoded = Buffer.from(readmeData.content, 'base64').toString('utf-8');
          // Truncate to first 2000 chars for analysis
          readmeContent = decoded.substring(0, 2000);
          if (decoded.length > 2000) {
            readmeContent += '\n... [README truncated for analysis]';
          }
        }
      }
    } catch (e) {
      console.log('Could not fetch README:', e.message);
    }

    // Fetch package.json if it exists (for tech stack analysis)
    let packageJson = null;
    if (hasPackageJson) {
      try {
        const pkgResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repoName}/contents/package.json`,
          { headers }
        );
        if (pkgResponse.ok) {
          const pkgData = await pkgResponse.json();
          if (pkgData.content) {
            const decoded = Buffer.from(pkgData.content, 'base64').toString('utf-8');
            packageJson = JSON.parse(decoded);
          }
        }
      } catch (e) {
        console.log('Could not fetch package.json:', e.message);
      }
    }

    // Calculate data completeness
    const dataCompleteness = {
      repoInfo: true,
      languages: languagesFetched,
      commits: commitsFetched,
      fileStructure: contentsFetched,
      readme: hasReadme,
      packageJson: !!packageJson
    };

    const completenessScore = Object.values(dataCompleteness).filter(Boolean).length / Object.keys(dataCompleteness).length * 100;

    return {
      analysisStatus: 'success',
      dataCompleteness: Math.round(completenessScore),
      dataCompletenessDetails: dataCompleteness,

      // Basic repo info
      repoName: repoData.full_name,
      repoUrl: repoData.html_url,
      description: repoData.description || 'No description provided',
      language: repoData.language,
      languages: languages,

      // Stats
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      watchers: repoData.watchers_count,
      openIssues: repoData.open_issues_count,
      size: repoData.size, // in KB

      // Dates
      createdAt: repoData.created_at,
      updatedAt: repoData.updated_at,
      pushedAt: repoData.pushed_at,

      // Branch info
      defaultBranch: repoData.default_branch,
      isPrivate: repoData.private,
      isFork: repoData.fork,

      // Structure analysis
      hasReadme: hasReadme,
      readmeContent: readmeContent,
      hasPackageJson: hasPackageJson,
      hasDockerfile: hasDockerfile,
      hasTests: hasTests,
      hasCICD: hasCICD,

      // Commits
      recentCommits: recentCommits,
      commitHistory: commitDetails,

      // Files
      fileStructure: fileStructure,
      fileList: fileList,

      // Package.json analysis
      dependencies: packageJson ? {
        dependencies: Object.keys(packageJson.dependencies || {}),
        devDependencies: Object.keys(packageJson.devDependencies || {}),
        scripts: Object.keys(packageJson.scripts || {}),
        hasTests: !!(packageJson.scripts?.test && packageJson.scripts.test !== 'echo "Error: no test specified" && exit 1'),
        hasLinting: !!(packageJson.scripts?.lint || packageJson.devDependencies?.eslint),
        name: packageJson.name,
        version: packageJson.version
      } : null,

      // Quality indicators
      qualityIndicators: {
        hasDocumentation: hasReadme,
        hasTests: hasTests,
        hasCICD: hasCICD,
        hasContainerization: hasDockerfile,
        activelyMaintained: recentCommits > 0,
        hasDescription: !!repoData.description
      }
    };
  } catch (error) {
    console.error('Error analyzing GitHub repo:', error);
    return {
      error: 'Failed to analyze GitHub repository: ' + error.message,
      errorType: 'UNEXPECTED_ERROR',
      analysisStatus: 'failed',
      recommendation: 'An unexpected error occurred. Please try again or verify the repository URL.'
    };
  }
}

module.exports = {
  analyzeResume,
  validateResume,
  quickScore,
  determineProfileStrength,
  generateJobDescription,
  analyzeAssignmentSubmission,
  analyzeGitHubRepo
};

