// /apps/media-service/src/services/storage.service.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../utils/logger';

const BUCKET_NAME = process.env.S3_BUCKET || 'sf1-media';
const CDN_URL = process.env.CDN_URL; // Optional: CloudFront/Cloudflare URL

// S3-Client (MinIO oder AWS S3)
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'eu-central-1',
  endpoint: process.env.S3_ENDPOINT, // Für MinIO: http://minio:9000
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!
  },
  forcePathStyle: !!process.env.S3_ENDPOINT // MinIO benötigt path-style
});

export class StorageService {
  /**
   * Upload zu S3
   */
  async upload(data: {
    key: string;
    buffer: Buffer;
    mimeType: string;
    metadata?: Record<string, string>;
  }): Promise<string> {
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: data.key,
        Body: data.buffer,
        ContentType: data.mimeType,
        Metadata: data.metadata,
        CacheControl: 'public, max-age=31536000' // 1 Jahr
      }));
      
      const url = this.getPublicUrl(data.key);
      
      logger.info(`[Storage] Uploaded ${data.key} (${data.buffer.length} bytes)`);
      
      return url;
      
    } catch (error) {
      logger.error('[Storage] Upload failed:', error);
      throw new Error('Storage upload failed');
    }
  }
  
  /**
   * Mehrere Dateien hochladen (parallel)
   */
  async uploadBatch(files: Array<{
    key: string;
    buffer: Buffer;
    mimeType: string;
  }>): Promise<string[]> {
    const uploads = files.map(file => this.upload(file));
    return Promise.all(uploads);
  }
  
  /**
   * Datei löschen
   */
  async delete(key: string): Promise<void> {
    try {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      }));
      
      logger.info(`[Storage] Deleted ${key}`);
      
    } catch (error) {
      logger.error('[Storage] Delete failed:', error);
      throw new Error('Storage delete failed');
    }
  }
  
  /**
   * Mehrere Dateien löschen (parallel)
   */
  async deleteBatch(keys: string[]): Promise<void> {
    const deletions = keys.map(key => this.delete(key));
    await Promise.all(deletions);
  }
  
  /**
   * Signed URL generieren (für private Dateien)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });
    
    return getSignedUrl(s3Client, command, { expiresIn });
  }
  
  /**
   * Öffentliche URL
   */
  getPublicUrl(key: string): string {
    if (CDN_URL) {
      // CDN verwenden (CloudFront/Cloudflare)
      return `${CDN_URL}/${key}`;
    }
    
    if (process.env.S3_ENDPOINT) {
      // MinIO
      return `${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${key}`;
    }
    
    // AWS S3
    return `https://${BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
  }
  
  /**
   * Storage-Key generieren (einheitlich)
   */
  generateKey(data: {
    userId: string;
    filename: string;
    category?: string;
  }): string {
    const { userId, filename, category } = data;
    
    // Pattern: {category}/{userId}/{filename}
    // Beispiel: journal/user123/abc123.jpg
    
    const parts = [
      category || 'uploads',
      userId,
      filename
    ];
    
    return parts.join('/');
  }
}

export const storageService = new StorageService();
