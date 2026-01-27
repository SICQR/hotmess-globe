/**
 * Chunked File Upload API
 * Handles large file uploads in chunks with resumable support
 */

import { createClient } from '@supabase/supabase-js';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const config = {
  api: {
    bodyParser: false,
  },
};

// Temporary storage for chunks
const TEMP_DIR = '/tmp/hotmess-uploads';

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Parse multipart form data
 */
async function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      uploadDir: TEMP_DIR,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB per chunk
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

/**
 * Generate upload ID
 */
function generateUploadId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Get chunk path
 */
function getChunkPath(uploadId, chunkIndex) {
  return path.join(TEMP_DIR, `${uploadId}_chunk_${chunkIndex}`);
}

/**
 * Get metadata path
 */
function getMetadataPath(uploadId) {
  return path.join(TEMP_DIR, `${uploadId}_meta.json`);
}

export default async function handler(req, res) {
  if (!supabaseServiceKey) {
    return res.status(500).json({ error: 'Storage not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Initialize new upload
    if (req.method === 'POST' && req.query.action === 'init') {
      const { filename, filesize, mimetype, totalChunks } = req.body;

      if (!filename || !filesize || !totalChunks) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const uploadId = generateUploadId();
      const metadata = {
        uploadId,
        filename,
        filesize,
        mimetype,
        totalChunks,
        uploadedChunks: [],
        createdAt: new Date().toISOString(),
        status: 'uploading',
      };

      fs.writeFileSync(getMetadataPath(uploadId), JSON.stringify(metadata));

      return res.status(200).json({
        uploadId,
        chunkSize: 5 * 1024 * 1024, // 5MB chunks
      });
    }

    // Upload chunk
    if (req.method === 'POST' && req.query.action === 'chunk') {
      const { fields, files } = await parseForm(req);
      const uploadId = fields.uploadId?.[0] || fields.uploadId;
      const chunkIndex = parseInt(fields.chunkIndex?.[0] || fields.chunkIndex, 10);
      const chunkFile = files.chunk?.[0] || files.chunk;

      if (!uploadId || isNaN(chunkIndex) || !chunkFile) {
        return res.status(400).json({ error: 'Missing uploadId, chunkIndex, or chunk file' });
      }

      // Read metadata
      const metadataPath = getMetadataPath(uploadId);
      if (!fs.existsSync(metadataPath)) {
        return res.status(404).json({ error: 'Upload not found' });
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

      // Move chunk to proper location
      const chunkPath = getChunkPath(uploadId, chunkIndex);
      fs.renameSync(chunkFile.filepath, chunkPath);

      // Update metadata
      if (!metadata.uploadedChunks.includes(chunkIndex)) {
        metadata.uploadedChunks.push(chunkIndex);
        metadata.uploadedChunks.sort((a, b) => a - b);
      }
      fs.writeFileSync(metadataPath, JSON.stringify(metadata));

      const progress = Math.round((metadata.uploadedChunks.length / metadata.totalChunks) * 100);

      return res.status(200).json({
        success: true,
        chunkIndex,
        uploadedChunks: metadata.uploadedChunks.length,
        totalChunks: metadata.totalChunks,
        progress,
      });
    }

    // Complete upload - merge chunks and upload to Supabase
    if (req.method === 'POST' && req.query.action === 'complete') {
      const { uploadId } = req.body;

      if (!uploadId) {
        return res.status(400).json({ error: 'Missing uploadId' });
      }

      const metadataPath = getMetadataPath(uploadId);
      if (!fs.existsSync(metadataPath)) {
        return res.status(404).json({ error: 'Upload not found' });
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

      // Verify all chunks uploaded
      if (metadata.uploadedChunks.length !== metadata.totalChunks) {
        return res.status(400).json({
          error: 'Missing chunks',
          uploaded: metadata.uploadedChunks.length,
          total: metadata.totalChunks,
          missing: Array.from({ length: metadata.totalChunks }, (_, i) => i)
            .filter(i => !metadata.uploadedChunks.includes(i)),
        });
      }

      // Merge chunks
      const mergedPath = path.join(TEMP_DIR, `${uploadId}_merged`);
      const writeStream = fs.createWriteStream(mergedPath);

      for (let i = 0; i < metadata.totalChunks; i++) {
        const chunkPath = getChunkPath(uploadId, i);
        const chunkData = fs.readFileSync(chunkPath);
        writeStream.write(chunkData);
        fs.unlinkSync(chunkPath); // Clean up chunk
      }

      writeStream.end();

      // Wait for write to complete
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Upload to Supabase Storage
      const fileBuffer = fs.readFileSync(mergedPath);
      const fileExt = path.extname(metadata.filename);
      const storagePath = `uploads/${Date.now()}_${crypto.randomBytes(8).toString('hex')}${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(storagePath, fileBuffer, {
          contentType: metadata.mimetype || 'application/octet-stream',
          upsert: false,
        });

      // Clean up temp files
      fs.unlinkSync(mergedPath);
      fs.unlinkSync(metadataPath);

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(storagePath);

      return res.status(200).json({
        success: true,
        file_url: urlData.publicUrl,
        path: storagePath,
        size: metadata.filesize,
      });
    }

    // Get upload status
    if (req.method === 'GET') {
      const { uploadId } = req.query;

      if (!uploadId) {
        return res.status(400).json({ error: 'Missing uploadId' });
      }

      const metadataPath = getMetadataPath(uploadId);
      if (!fs.existsSync(metadataPath)) {
        return res.status(404).json({ error: 'Upload not found' });
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const progress = Math.round((metadata.uploadedChunks.length / metadata.totalChunks) * 100);

      return res.status(200).json({
        ...metadata,
        progress,
      });
    }

    // Cancel upload
    if (req.method === 'DELETE') {
      const { uploadId } = req.query;

      if (!uploadId) {
        return res.status(400).json({ error: 'Missing uploadId' });
      }

      const metadataPath = getMetadataPath(uploadId);
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        
        // Delete chunks
        for (const chunkIndex of metadata.uploadedChunks) {
          const chunkPath = getChunkPath(uploadId, chunkIndex);
          if (fs.existsSync(chunkPath)) {
            fs.unlinkSync(chunkPath);
          }
        }
        
        // Delete metadata
        fs.unlinkSync(metadataPath);
      }

      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('[Upload/Chunk] Error:', error);
    return res.status(500).json({
      error: 'Upload failed',
      details: error.message,
    });
  }
}
