// =====================================================
// AWS S3 SERVICE - File Storage
// =====================================================

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const path = require('path');
const crypto = require('crypto');

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

// File type to folder mapping
const FILE_TYPE_FOLDERS = {
  'application/pdf': 'documents',
  'application/msword': 'documents',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'documents',
  'image/jpeg': 'images',
  'image/jpg': 'images',
  'image/png': 'images',
  'image/gif': 'images',
  'image/webp': 'images',
};

// Generate unique file key with organized structure
const generateFileKey = (companyId, fileType, originalName) => {
  const folder = FILE_TYPE_FOLDERS[fileType] || 'misc';
  const date = new Date();
  const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9-_]/g, '_');

  // Structure: company/folder/year-month/uniqueId_filename.ext
  return `${companyId}/${folder}/${yearMonth}/${uniqueId}_${baseName}${ext}`;
};

// Upload file to S3
const uploadFile = async (fileBuffer, options) => {
  const { companyId, mimeType, originalName, metadata = {} } = options;

  const key = generateFileKey(companyId, mimeType, originalName);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    Metadata: {
      originalName: originalName,
      uploadedAt: new Date().toISOString(),
      companyId: companyId,
      ...metadata,
    },
    // Cache control for performance
    CacheControl: 'max-age=31536000', // 1 year for immutable files
  });

  try {
    await s3Client.send(command);

    // Generate the public URL (or use signed URL)
    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return {
      success: true,
      key,
      url,
      bucket: BUCKET_NAME,
      region: process.env.AWS_REGION,
    };
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

// Get signed URL for secure file access (time-limited)
const getSignedDownloadUrl = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('S3 Signed URL Error:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

// Get signed URL for upload (presigned upload)
const getSignedUploadUrl = async (key, mimeType, expiresIn = 300) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('S3 Presigned Upload URL Error:', error);
    throw new Error(`Failed to generate presigned upload URL: ${error.message}`);
  }
};

// Delete file from S3
const deleteFile = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    await s3Client.send(command);
    return { success: true, message: 'File deleted successfully' };
  } catch (error) {
    console.error('S3 Delete Error:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

// Check if file exists
const fileExists = async (key) => {
  const command = new HeadObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    await s3Client.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    throw error;
  }
};

// Get file from S3 (returns buffer)
const getFile = async (key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    const response = await s3Client.send(command);
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('S3 Get File Error:', error);
    throw new Error(`Failed to get file from S3: ${error.message}`);
  }
};

// Extract S3 key from full URL
const getKeyFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    // Remove leading slash
    return urlObj.pathname.substring(1);
  } catch {
    // If it's already a key (not a full URL)
    return url;
  }
};

module.exports = {
  uploadFile,
  getSignedDownloadUrl,
  getSignedUploadUrl,
  deleteFile,
  fileExists,
  getFile,
  getKeyFromUrl,
  generateFileKey,
  s3Client,
  BUCKET_NAME,
};
