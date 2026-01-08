// =====================================================
// IMPORT SERVICE - CSV/Excel Import for Candidates
// =====================================================

const { parse } = require('csv-parse/sync');
const { Candidate, Application, JobOpening, ActivityLog } = require('../models');

/**
 * Field mapping configurations for different platforms
 * These can be extended or modified via API
 */
const PLATFORM_MAPPINGS = {
  wellfound: {
    name: ['name', 'full_name', 'candidate_name', 'Full Name'],
    email: ['email', 'email_address', 'Email'],
    phone: ['phone', 'phone_number', 'mobile', 'Phone'],
    linkedin: ['linkedin', 'linkedin_url', 'LinkedIn URL', 'LinkedIn'],
    resume: ['resume', 'resume_url', 'Resume URL', 'Resume'],
    location: ['location', 'city', 'Location'],
    experience: ['experience', 'years_experience', 'Experience', 'Years of Experience'],
    skills: ['skills', 'skill_set', 'Skills'],
    current_company: ['current_company', 'company', 'Current Company'],
    current_title: ['current_title', 'title', 'job_title', 'Current Title', 'Job Title'],
    education: ['education', 'degree', 'Education'],
    applied_date: ['applied_date', 'applied_at', 'application_date', 'Applied Date'],
    source: ['source', 'referral_source', 'Source'],
    notes: ['notes', 'cover_letter', 'Notes', 'Cover Letter']
  },
  linkedin: {
    name: ['First Name', 'Last Name', 'full_name', 'Name'],
    email: ['Email', 'email', 'Email Address'],
    phone: ['Phone', 'phone', 'Phone Number'],
    linkedin: ['Profile URL', 'LinkedIn URL', 'linkedin'],
    location: ['Location', 'location', 'City'],
    experience: ['Years of Experience', 'experience'],
    skills: ['Skills', 'skills'],
    current_company: ['Current Company', 'Company', 'current_company'],
    current_title: ['Current Title', 'Headline', 'current_title'],
    education: ['Education', 'Degree', 'education'],
    applied_date: ['Applied On', 'Date Applied', 'applied_date'],
    source: ['Source', 'source'],
    notes: ['Notes', 'Summary', 'notes']
  },
  naukri: {
    name: ['Candidate Name', 'Name', 'name'],
    email: ['Email ID', 'Email', 'email'],
    phone: ['Mobile No', 'Phone', 'phone'],
    location: ['Current Location', 'Location', 'location'],
    experience: ['Total Exp', 'Experience', 'experience'],
    skills: ['Key Skills', 'Skills', 'skills'],
    current_company: ['Current Employer', 'Company', 'current_company'],
    current_title: ['Current Designation', 'Title', 'current_title'],
    education: ['Highest Qualification', 'Education', 'education'],
    applied_date: ['Applied On', 'applied_date'],
    resume: ['Resume', 'resume'],
    notes: ['Notes', 'notes']
  },
  generic: {
    name: ['name', 'full_name', 'candidate_name', 'Name', 'Full Name', 'Candidate Name'],
    email: ['email', 'email_address', 'Email', 'Email Address', 'Email ID'],
    phone: ['phone', 'phone_number', 'mobile', 'Phone', 'Mobile', 'Phone Number', 'Mobile No'],
    linkedin: ['linkedin', 'linkedin_url', 'LinkedIn', 'LinkedIn URL', 'Profile URL'],
    resume: ['resume', 'resume_url', 'Resume', 'Resume URL'],
    location: ['location', 'city', 'Location', 'City', 'Current Location'],
    experience: ['experience', 'years_experience', 'Experience', 'Years of Experience', 'Total Exp'],
    skills: ['skills', 'skill_set', 'Skills', 'Key Skills'],
    current_company: ['current_company', 'company', 'Company', 'Current Company', 'Current Employer'],
    current_title: ['current_title', 'title', 'job_title', 'Title', 'Current Title', 'Job Title', 'Designation'],
    education: ['education', 'degree', 'Education', 'Degree', 'Qualification'],
    applied_date: ['applied_date', 'applied_at', 'Applied Date', 'Applied On', 'Date Applied'],
    source: ['source', 'referral_source', 'Source'],
    notes: ['notes', 'cover_letter', 'Notes', 'Cover Letter', 'Summary']
  }
};

/**
 * Parse CSV content and return structured data
 * @param {string|Buffer} content - CSV content
 * @param {Object} options - Parsing options
 * @returns {Array} Parsed records
 */
function parseCSV(content, options = {}) {
  const { delimiter = ',', skipEmptyLines = true } = options;

  try {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: skipEmptyLines,
      delimiter,
      trim: true,
      relax_quotes: true,
      relax_column_count: true
    });

    return records;
  } catch (error) {
    console.error('CSV parsing error:', error);
    throw new Error(`Failed to parse CSV: ${error.message}`);
  }
}

/**
 * Detect platform based on CSV headers
 * @param {Array} headers - CSV column headers
 * @returns {string} Detected platform name
 */
function detectPlatform(headers) {
  const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));

  // Check for Wellfound-specific headers
  if (headerSet.has('wellfound') || headerSet.has('angellist')) {
    return 'wellfound';
  }

  // Check for LinkedIn-specific headers
  if (headerSet.has('profile url') || headerSet.has('headline')) {
    return 'linkedin';
  }

  // Check for Naukri-specific headers
  if (headerSet.has('key skills') || headerSet.has('current employer') || headerSet.has('mobile no')) {
    return 'naukri';
  }

  return 'generic';
}

/**
 * Map a CSV row to candidate fields using platform mapping
 * @param {Object} row - CSV row data
 * @param {string} platform - Platform name
 * @param {Object} customMapping - Custom field mapping (optional)
 * @returns {Object} Mapped candidate data
 */
function mapRowToCandidate(row, platform = 'generic', customMapping = null) {
  const mapping = customMapping || PLATFORM_MAPPINGS[platform] || PLATFORM_MAPPINGS.generic;
  const candidate = {};

  // Helper to find value from possible field names
  const findValue = (possibleFields) => {
    for (const field of possibleFields) {
      // Try exact match
      if (row[field] !== undefined && row[field] !== '') {
        return row[field];
      }
      // Try case-insensitive match
      const lowerField = field.toLowerCase();
      for (const key of Object.keys(row)) {
        if (key.toLowerCase() === lowerField && row[key] !== undefined && row[key] !== '') {
          return row[key];
        }
      }
    }
    return null;
  };

  // Map each field
  for (const [candidateField, possibleFields] of Object.entries(mapping)) {
    const value = findValue(possibleFields);
    if (value) {
      candidate[candidateField] = value;
    }
  }

  // Handle special case: LinkedIn might have First Name + Last Name
  if (!candidate.name && (row['First Name'] || row['Last Name'])) {
    candidate.name = [row['First Name'], row['Last Name']].filter(Boolean).join(' ').trim();
  }

  // Parse experience as number if possible
  if (candidate.experience) {
    const expMatch = candidate.experience.toString().match(/(\d+)/);
    if (expMatch) {
      candidate.experienceYears = parseInt(expMatch[1]);
    }
  }

  // Parse skills as array
  if (candidate.skills && typeof candidate.skills === 'string') {
    candidate.skillsArray = candidate.skills.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
  }

  return candidate;
}

/**
 * Validate candidate data
 * @param {Object} candidate - Candidate data
 * @returns {Object} Validation result { valid, errors }
 */
function validateCandidate(candidate) {
  const errors = [];

  if (!candidate.name || candidate.name.trim() === '') {
    errors.push('Name is required');
  }

  if (!candidate.email || candidate.email.trim() === '') {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)) {
    errors.push('Invalid email format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Import candidates from CSV data
 * @param {string|Buffer} csvContent - CSV content
 * @param {Object} options - Import options
 * @returns {Object} Import result
 */
async function importCandidates(csvContent, options = {}) {
  const {
    jobId,
    platform = 'auto',
    customMapping = null,
    skipDuplicates = true,
    defaultStage = 'shortlisting',
    source = 'CSV Import',
    importedBy = null
  } = options;

  const results = {
    total: 0,
    imported: 0,
    duplicates: 0,
    errors: [],
    candidates: []
  };

  try {
    // Parse CSV
    const records = parseCSV(csvContent);
    results.total = records.length;

    if (records.length === 0) {
      results.errors.push('No records found in CSV');
      return results;
    }

    // Detect platform if auto
    const headers = Object.keys(records[0]);
    const detectedPlatform = platform === 'auto' ? detectPlatform(headers) : platform;
    console.log(`📊 Detected platform: ${detectedPlatform}, Total records: ${records.length}`);

    // Get job details if jobId provided
    let job = null;
    if (jobId) {
      job = await JobOpening.findById(jobId);
      if (!job) {
        results.errors.push(`Job with ID ${jobId} not found`);
        return results;
      }
    }

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // +2 for header row and 0-indexing

      try {
        // Map row to candidate
        const candidateData = mapRowToCandidate(row, detectedPlatform, customMapping);

        // Validate
        const validation = validateCandidate(candidateData);
        if (!validation.valid) {
          results.errors.push({
            row: rowNum,
            data: candidateData,
            errors: validation.errors
          });
          continue;
        }

        // Check for duplicate by email
        if (skipDuplicates) {
          const existingCandidate = await Candidate.findOne({ email: candidateData.email.toLowerCase() });
          if (existingCandidate) {
            results.duplicates++;
            results.errors.push({
              row: rowNum,
              email: candidateData.email,
              message: 'Duplicate email - candidate already exists'
            });
            continue;
          }
        }

        // Create candidate
        const candidate = new Candidate({
          name: candidateData.name,
          email: candidateData.email.toLowerCase(),
          phone: candidateData.phone || '',
          linkedin: candidateData.linkedin || '',
          location: candidateData.location || '',
          experience: candidateData.experience || '',
          skills: candidateData.skillsArray || [],
          current_company: candidateData.current_company || '',
          current_title: candidateData.current_title || '',
          education: candidateData.education || '',
          resume_url: candidateData.resume || '',
          source: source,
          notes: candidateData.notes || '',
          importedAt: new Date(),
          importedBy: importedBy,
          importPlatform: detectedPlatform
        });

        await candidate.save();

        // Create application if job is specified
        if (job) {
          const application = new Application({
            candidate_id: candidate._id,
            job_id: job._id,
            stage: defaultStage,
            status: 'active',
            source: source,
            applied_at: candidateData.applied_date ? new Date(candidateData.applied_date) : new Date(),
            last_activity_at: new Date()
          });

          await application.save();

          // Log activity
          await new ActivityLog({
            application_id: application._id,
            action: 'imported',
            description: `Candidate imported from ${detectedPlatform} CSV`,
            metadata: { source, platform: detectedPlatform, importedBy }
          }).save();
        }

        results.imported++;
        results.candidates.push({
          id: candidate._id,
          name: candidate.name,
          email: candidate.email
        });

      } catch (rowError) {
        results.errors.push({
          row: rowNum,
          message: rowError.message
        });
      }
    }

    console.log(`✅ Import complete: ${results.imported}/${results.total} imported, ${results.duplicates} duplicates`);

  } catch (error) {
    console.error('Import error:', error);
    results.errors.push({ message: error.message });
  }

  return results;
}

/**
 * Get available platform mappings
 * @returns {Object} Platform mappings
 */
function getPlatformMappings() {
  return PLATFORM_MAPPINGS;
}

/**
 * Preview import without saving
 * @param {string|Buffer} csvContent - CSV content
 * @param {Object} options - Import options
 * @returns {Object} Preview result
 */
async function previewImport(csvContent, options = {}) {
  const { platform = 'auto', customMapping = null, limit = 10 } = options;

  try {
    const records = parseCSV(csvContent);
    const headers = Object.keys(records[0] || {});
    const detectedPlatform = platform === 'auto' ? detectPlatform(headers) : platform;

    // Map and validate first N records
    const preview = [];
    for (let i = 0; i < Math.min(records.length, limit); i++) {
      const candidateData = mapRowToCandidate(records[i], detectedPlatform, customMapping);
      const validation = validateCandidate(candidateData);

      // Check for existing candidate
      let isDuplicate = false;
      if (candidateData.email) {
        const existing = await Candidate.findOne({ email: candidateData.email.toLowerCase() });
        isDuplicate = !!existing;
      }

      preview.push({
        ...candidateData,
        _valid: validation.valid,
        _errors: validation.errors,
        _duplicate: isDuplicate
      });
    }

    return {
      success: true,
      totalRecords: records.length,
      headers,
      detectedPlatform,
      preview,
      validCount: preview.filter(p => p._valid && !p._duplicate).length,
      duplicateCount: preview.filter(p => p._duplicate).length,
      errorCount: preview.filter(p => !p._valid).length
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  parseCSV,
  detectPlatform,
  mapRowToCandidate,
  validateCandidate,
  importCandidates,
  previewImport,
  getPlatformMappings,
  PLATFORM_MAPPINGS
};
