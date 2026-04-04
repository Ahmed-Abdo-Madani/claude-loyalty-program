import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import logger from '../config/logger.js';

/**
 * R2StorageService - Cloudflare R2 Storage service using S3-compatible API
 * Handles file uploads and deletions with lazy initialization
 * 
 * Pattern: Instance-based singleton (similar to ImageProcessingService)
 */
class R2StorageService {
  constructor() {
    this.client = null;
    // Constants for required environment variables
    this.CONFIG_VARS = {
      ACCOUNT_ID: 'CLOUDFLARE_R2_ACCOUNT_ID',
      ACCESS_KEY: 'R2_ACCESS_KEY_ID',
      SECRET_KEY: 'R2_SECRET_ACCESS_KEY',
      BUCKET: 'R2_BUCKET'
    };
    this.PUBLIC_URL_VAR = 'R2_PUBLIC_URL';
  }

  /**
   * Lazy initializer for S3Client (private-ish)
   * Ensures server doesn't crash on boot if R2 is not configured
   * @returns {S3Client}
   * @throws {Error} If configuration is missing
   */
  _getClient() {
    if (this.client) return this.client;

    const env = process.env;
    const missing = Object.values(this.CONFIG_VARS).filter(v => !env[v]);

    if (missing.length > 0) {
      const error = new Error(`Missing required R2 configuration: ${missing.join(', ')}`);
      logger.error('❌ R2 configuration error', { missing });
      throw error;
    }

    this.client = new S3Client({
      endpoint: `https://${env[this.CONFIG_VARS.ACCOUNT_ID]}.r2.cloudflarestorage.com`,
      region: 'auto', // Required by Cloudflare R2
      credentials: {
        accessKeyId: env[this.CONFIG_VARS.ACCESS_KEY],
        secretAccessKey: env[this.CONFIG_VARS.SECRET_KEY],
      },
    });

    logger.info('✅ R2 S3Client initialized');
    return this.client;
  }

  /**
   * Upload file from buffer
   * @param {Buffer} buffer - File content
   * @param {string} key - R2 object key
   * @param {string} contentType - MIME type
   * @returns {Promise<string>} Public URL of the uploaded file
   */
  async uploadFile(buffer, key, contentType) {
    try {
      const publicUrlBase = process.env[this.PUBLIC_URL_VAR]?.replace(/\/+$/, '');
      if (!publicUrlBase) {
        const error = new Error(`Missing required R2 configuration for uploads: ${this.PUBLIC_URL_VAR}`);
        logger.error('❌ R2 configuration error', { var: this.PUBLIC_URL_VAR });
        throw error;
      }

      const client = this._getClient();
      const command = new PutObjectCommand({
        Bucket: process.env[this.CONFIG_VARS.BUCKET],
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await client.send(command);
      
      const publicUrl = `${publicUrlBase}/${key}`;
      logger.info(`📤 File uploaded to R2: ${key} (${(buffer.length / 1024).toFixed(2)} KB)`);
      
      return publicUrl;
    } catch (error) {
      logger.error(`❌ Failed to upload file to R2: ${key}`, error);
      throw error;
    }
  }

  /**
   * Upload file from readable stream
   * @param {ReadableStream} stream - File stream
   * @param {string} key - R2 object key
   * @param {string} contentType - MIME type
   * @param {number} [contentLength] - Optional content length
   * @returns {Promise<string>} Public URL of the uploaded file
   */
  async uploadStream(stream, key, contentType, contentLength) {
    try {
      const publicUrlBase = process.env[this.PUBLIC_URL_VAR]?.replace(/\/+$/, '');
      if (!publicUrlBase) {
        const error = new Error(`Missing required R2 configuration for uploads: ${this.PUBLIC_URL_VAR}`);
        logger.error('❌ R2 configuration error', { var: this.PUBLIC_URL_VAR });
        throw error;
      }

      const client = this._getClient();
      const command = new PutObjectCommand({
        Bucket: process.env[this.CONFIG_VARS.BUCKET],
        Key: key,
        Body: stream,
        ContentType: contentType,
        ContentLength: contentLength,
      });

      await client.send(command);
      
      const publicUrl = `${publicUrlBase}/${key}`;
      logger.info(`📤 Stream uploaded to R2: ${key}`);
      
      return publicUrl;
    } catch (error) {
      logger.error(`❌ Failed to upload stream to R2: ${key}`, error);
      throw error;
    }
  }

  /**
   * Delete a single file
   * @param {string} key - R2 object key
   * @returns {Promise<boolean>} True on success, false if not found
   */
  async deleteFile(key) {
    try {
      const client = this._getClient();
      const command = new DeleteObjectCommand({
        Bucket: process.env[this.CONFIG_VARS.BUCKET],
        Key: key,
      });

      await client.send(command);
      logger.info(`✅ File deleted from R2: ${key}`);
      return true;
    } catch (error) {
      // Check for specific error code if key doesn't exist
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        logger.warn(`⚠️ File not found in R2 for deletion: ${key}`);
        return false;
      }
      
      logger.error(`❌ Failed to delete file from R2: ${key}`, error);
      throw error;
    }
  }

  /**
   * Delete multiple files in parallel
   * @param {string[]} keys - Array of R2 object keys
   * @returns {Promise<boolean[]>} Results for each deletion
   */
  async deleteFiles(keys) {
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return [];
    }

    logger.info(`🗑️ deleting ${keys.length} files from R2 in parallel...`);
    
    // Process all deletions in parallel matching ImageProcessingService style
    const results = await Promise.all(
      keys.map(key => this.deleteFile(key).catch(() => false))
    );

    const succeeded = results.filter(r => r === true).length;
    const failed = results.length - succeeded;
    logger.info(`✅ R2 Batch delete summary: ${succeeded} succeeded, ${failed} failed`);

    return results;
  }
}

export default new R2StorageService();
