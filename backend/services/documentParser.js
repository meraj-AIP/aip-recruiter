// =====================================================
// DOCUMENT PARSER SERVICE
// =====================================================
// Extracts text from PDF and DOCX files

const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs').promises;

/**
 * Parse PDF file and extract text
 * @param {Buffer|string} filePathOrBuffer - File path or buffer
 * @returns {Promise<string>} Extracted text
 */
async function parsePDF(filePathOrBuffer) {
  try {
    let dataBuffer;
    
    if (typeof filePathOrBuffer === 'string') {
      // It's a file path
      dataBuffer = await fs.readFile(filePathOrBuffer);
    } else {
      // It's already a buffer
      dataBuffer = filePathOrBuffer;
    }
    
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}

/**
 * Parse DOCX file and extract text
 * @param {Buffer|string} filePathOrBuffer - File path or buffer
 * @returns {Promise<string>} Extracted text
 */
async function parseDOCX(filePathOrBuffer) {
  try {
    let buffer;
    
    if (typeof filePathOrBuffer === 'string') {
      // It's a file path
      buffer = await fs.readFile(filePathOrBuffer);
    } else {
      // It's already a buffer
      buffer = filePathOrBuffer;
    }
    
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Failed to parse DOCX file');
  }
}

/**
 * Parse document based on file type
 * @param {Buffer|string} filePathOrBuffer - File path or buffer
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} Extracted text
 */
async function parseDocument(filePathOrBuffer, mimeType) {
  try {
    if (mimeType === 'application/pdf') {
      return await parsePDF(filePathOrBuffer);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      return await parseDOCX(filePathOrBuffer);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error('Error parsing document:', error);
    throw error;
  }
}

/**
 * Extract key information from resume text
 * @param {string} text - Resume text
 * @returns {Object} Extracted information
 */
function extractResumeInfo(text) {
  const info = {
    email: null,
    phone: null,
    skills: [],
    experience: [],
    education: []
  };
  
  // Extract email
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const emails = text.match(emailRegex);
  if (emails && emails.length > 0) {
    info.email = emails[0];
  }
  
  // Extract phone
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phones = text.match(phoneRegex);
  if (phones && phones.length > 0) {
    info.phone = phones[0];
  }
  
  // Extract common skills (basic implementation)
  const commonSkills = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'MongoDB',
    'AWS', 'Docker', 'Kubernetes', 'Git', 'TypeScript', 'Angular', 'Vue',
    'Machine Learning', 'AI', 'Data Science', 'DevOps', 'Agile', 'Scrum'
  ];
  
  commonSkills.forEach(skill => {
    if (text.toLowerCase().includes(skill.toLowerCase())) {
      info.skills.push(skill);
    }
  });
  
  return info;
}

module.exports = {
  parsePDF,
  parseDOCX,
  parseDocument,
  extractResumeInfo
};

