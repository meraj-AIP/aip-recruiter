// =====================================================
// UPLOAD ROUTES - AWS S3 Storage
// =====================================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parseDocument, extractResumeInfo } = require('../services/documentParser');
const s3Service = require('../services/s3Service');

// Configure multer for memory storage (files go to buffer, then S3)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: PDF, DOCX, JPG, PNG, GIF, WebP`));
    }
  },
});

// POST /api/upload/resume - Upload resume to S3
router.post('/resume', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Upload to S3
    const uploadResult = await s3Service.uploadFile(req.file.buffer, {
      companyId,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      metadata: {
        type: 'resume',
      },
    });

    console.log('✅ File uploaded to S3:', uploadResult.key);

    // Parse document and extract text
    let extractedText = '';
    let extractedInfo = {};

    try {
      extractedText = await parseDocument(req.file.buffer, req.file.mimetype);
      extractedInfo = extractResumeInfo(extractedText);
      console.log('✅ Resume text extracted, length:', extractedText.length);
    } catch (parseError) {
      console.error('Parse error:', parseError);
    }

    // Generate signed URL for secure access
    const signedUrl = await s3Service.getSignedDownloadUrl(uploadResult.key, 86400); // 24 hours

    res.json({
      success: true,
      file: {
        url: uploadResult.url,
        signedUrl,
        key: uploadResult.key,
        size: req.file.size,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        bucket: uploadResult.bucket,
        region: uploadResult.region,
      },
      extractedText,
      extractedInfo,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
});

// POST /api/upload/image - Upload image to S3
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Validate it's an image
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    // Upload to S3
    const uploadResult = await s3Service.uploadFile(req.file.buffer, {
      companyId,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      metadata: {
        type: 'image',
      },
    });

    console.log('✅ Image uploaded to S3:', uploadResult.key);

    // Generate signed URL
    const signedUrl = await s3Service.getSignedDownloadUrl(uploadResult.key, 86400);

    res.json({
      success: true,
      file: {
        url: uploadResult.url,
        signedUrl,
        key: uploadResult.key,
        size: req.file.size,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
      },
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// POST /api/upload/document - Upload any allowed document to S3
router.post('/document', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    const { companyId, documentType } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Upload to S3
    const uploadResult = await s3Service.uploadFile(req.file.buffer, {
      companyId,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      metadata: {
        type: documentType || 'document',
      },
    });

    console.log('✅ Document uploaded to S3:', uploadResult.key);

    // Generate signed URL
    const signedUrl = await s3Service.getSignedDownloadUrl(uploadResult.key, 86400);

    res.json({
      success: true,
      file: {
        url: uploadResult.url,
        signedUrl,
        key: uploadResult.key,
        size: req.file.size,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
      },
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload document' });
  }
});

// POST /api/upload/file - Upload any file to S3 (general purpose)
router.post('/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { companyId } = req.body;
    const effectiveCompanyId = companyId || '695a077b7406a1a3c8dd3751'; // Default company

    // Upload to S3
    const uploadResult = await s3Service.uploadFile(req.file.buffer, {
      companyId: effectiveCompanyId,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      metadata: {
        type: 'assignment-file',
      },
    });

    console.log('✅ File uploaded to S3:', uploadResult.key);

    // Generate signed URL for immediate access (7 days validity)
    const signedUrl = await s3Service.getSignedDownloadUrl(uploadResult.key, 604800);

    res.json({
      success: true,
      fileUrl: signedUrl, // Return signed URL instead of direct URL
      key: uploadResult.key,
      size: req.file.size,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
});

// GET /api/upload/signed-url/:key - Get signed URL for existing file
router.get('/signed-url/*', async (req, res) => {
  try {
    const key = req.params[0]; // Get the full path after /signed-url/

    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    // Check if file exists
    const exists = await s3Service.fileExists(key);
    if (!exists) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Generate signed URL (valid for 1 hour)
    const signedUrl = await s3Service.getSignedDownloadUrl(key, 3600);

    res.json({
      success: true,
      signedUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Signed URL error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate signed URL' });
  }
});

// DELETE /api/upload/file/:key - Delete file from S3
router.delete('/file/*', async (req, res) => {
  try {
    const key = req.params[0]; // Get the full path

    if (!key) {
      return res.status(400).json({ error: 'File key is required' });
    }

    await s3Service.deleteFile(key);

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete file' });
  }
});

// POST /api/upload/parse - Parse document from S3
router.post('/parse', async (req, res) => {
  try {
    const { fileUrl, fileKey, mimeType } = req.body;

    if (!fileKey && !fileUrl) {
      return res.status(400).json({ error: 'File key or URL is required' });
    }

    // Get the key from URL if provided
    const key = fileKey || s3Service.getKeyFromUrl(fileUrl);

    // Get file from S3
    const buffer = await s3Service.getFile(key);

    // Parse document
    const extractedText = await parseDocument(buffer, mimeType);
    const extractedInfo = extractResumeInfo(extractedText);

    res.json({
      success: true,
      extractedText,
      extractedInfo,
    });
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse document' });
  }
});

// POST /api/upload/presigned-url - Get presigned URL for direct upload
router.post('/presigned-url', async (req, res) => {
  try {
    const { companyId, fileName, mimeType } = req.body;

    if (!companyId || !fileName || !mimeType) {
      return res.status(400).json({
        error: 'companyId, fileName, and mimeType are required',
      });
    }

    // Generate key for the file
    const key = s3Service.generateFileKey(companyId, mimeType, fileName);

    // Get presigned upload URL (valid for 5 minutes)
    const uploadUrl = await s3Service.getSignedUploadUrl(key, mimeType, 300);

    res.json({
      success: true,
      uploadUrl,
      key,
      expiresIn: 300,
      fileUrl: `https://${s3Service.BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    });
  } catch (error) {
    console.error('Presigned URL error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate presigned URL' });
  }
});

module.exports = router;
