// =====================================================
// IMPORT ROUTES - CSV/Excel Import for Candidates
// =====================================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const importService = require('../services/importService');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    const allowedExtensions = ['.csv', '.txt'];

    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// GET /api/import/platforms - Get available platform mappings
router.get('/platforms', (req, res) => {
  try {
    const mappings = importService.getPlatformMappings();
    const platforms = Object.keys(mappings).map(key => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      fields: Object.keys(mappings[key])
    }));

    res.json({
      success: true,
      data: platforms
    });
  } catch (error) {
    console.error('Error getting platforms:', error);
    res.status(500).json({ error: 'Failed to get platforms' });
  }
});

// POST /api/import/preview - Preview CSV import without saving
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { platform = 'auto', limit = 10 } = req.body;

    const result = await importService.previewImport(req.file.buffer.toString(), {
      platform,
      limit: parseInt(limit)
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message || 'Failed to preview import' });
  }
});

// POST /api/import/candidates - Import candidates from CSV
router.post('/candidates', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const {
      jobId,
      platform = 'auto',
      skipDuplicates = 'true',
      defaultStage = 'shortlisting',
      source = 'CSV Import',
      importedBy
    } = req.body;

    console.log(`📥 Starting CSV import - Job: ${jobId || 'None'}, Platform: ${platform}`);

    const result = await importService.importCandidates(req.file.buffer.toString(), {
      jobId,
      platform,
      skipDuplicates: skipDuplicates === 'true',
      defaultStage,
      source,
      importedBy
    });

    res.json({
      success: true,
      message: `Imported ${result.imported} of ${result.total} candidates`,
      data: result
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message || 'Failed to import candidates' });
  }
});

// POST /api/import/validate - Validate CSV structure
router.post('/validate', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const content = req.file.buffer.toString();
    const records = importService.parseCSV(content);

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No records found in CSV'
      });
    }

    const headers = Object.keys(records[0]);
    const detectedPlatform = importService.detectPlatform(headers);

    // Check required fields
    const mapping = importService.PLATFORM_MAPPINGS[detectedPlatform];
    const missingRequired = [];

    // Check if name and email fields are present
    const hasName = mapping.name.some(f => headers.some(h => h.toLowerCase() === f.toLowerCase()));
    const hasEmail = mapping.email.some(f => headers.some(h => h.toLowerCase() === f.toLowerCase()));

    if (!hasName) missingRequired.push('name');
    if (!hasEmail) missingRequired.push('email');

    res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        totalRecords: records.length,
        headers,
        detectedPlatform,
        missingRequired,
        isValid: missingRequired.length === 0
      }
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: error.message || 'Failed to validate CSV' });
  }
});

// GET /api/import/template/:platform - Download CSV template for platform
router.get('/template/:platform', (req, res) => {
  try {
    const { platform } = req.params;
    const mappings = importService.PLATFORM_MAPPINGS;

    if (!mappings[platform]) {
      return res.status(404).json({ error: 'Platform not found' });
    }

    // Generate CSV header from first field of each mapping
    const headers = Object.entries(mappings[platform])
      .map(([field, alternatives]) => alternatives[0])
      .join(',');

    // Generate sample row
    const sampleData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      linkedin: 'https://linkedin.com/in/johndoe',
      resume: 'https://example.com/resume.pdf',
      location: 'San Francisco, CA',
      experience: '5 years',
      skills: 'JavaScript, React, Node.js',
      current_company: 'Tech Corp',
      current_title: 'Senior Developer',
      education: 'BS Computer Science',
      applied_date: new Date().toISOString().split('T')[0],
      source: 'Wellfound',
      notes: 'Excellent candidate'
    };

    const sampleRow = Object.entries(mappings[platform])
      .map(([field]) => sampleData[field] || '')
      .join(',');

    const csv = `${headers}\n${sampleRow}`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${platform}_import_template.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Template error:', error);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

module.exports = router;
