// /apps/media-service/src/services/upload.service.ts
import { nanoid } from 'nanoid';
import { File, IFile } from '../models/File.model';
import { Quota } from '../models/Quota.model';
import { storageService } from './storage.service';
import { processingService } from './processing.service';
import { quotaService } from './quota.service';
import { getMimeTypeCategory, isImageMimeType, isVideoMimeType } from '../utils/mime-types';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface UploadOptions {
  category?: 'avatar' | 'journal' | 'community' | 'strain';
  generateThumbnails?: boolean;
  linkTo?: {
    type: string;
    id: string;
  };
}

export class UploadService {
  /**
   * Single-Upload
   */
  async upload(data: {
    userId: string;
    file: Express.Multer.File;
    isPremium?: boolean;
    options?: UploadOptions;
  }): Promise<IFile> {
    const { userId, file, isPremium = false, options = {} } = data;
    
    // Quota-Check
    await quotaService.checkQuota(userId, file.size, isPremium);
    
    // Validierung
    this.validateFile(file);
    
    // Unique Filename
    const ext = file.mimetype.split('/')[1];
    const filename = `${nanoid(16)}.${ext}`;
    
    // File-Type ermitteln
    const fileType = getMimeTypeCategory(file.mimetype);
    
    // Processing je nach Typ
    let processedBuffers: { [key: string]: Buffer | undefined } = {};
    let metadata: any = {};
    
    if (isImageMimeType(file.mimetype)) {
      // Bild verarbeiten
      const processed = await processingService.processImage(file.buffer, {
        generateThumbnails: options.generateThumbnails !== false
      });
      
      processedBuffers = {
        original: processed.original,
        thumbnail: processed.thumbnail,
        small: processed.small,
        medium: processed.medium,
        large: processed.large
      };
      
      metadata = processed.metadata;
      
    } else if (isVideoMimeType(file.mimetype)) {
      // Video: Original nur hochladen (Thumbnail später via Worker)
      processedBuffers.original = file.buffer;
      
    } else {
      // Andere Dateien: Direkt hochladen
      processedBuffers.original = file.buffer;
    }
    
    // S3-Uploads (parallel)
    const storageKey = storageService.generateKey({
      userId,
      filename,
      category: options.category
    });
    
    const uploadPromises: { [key: string]: Promise<string> } = {};
    
    for (const [size, buffer] of Object.entries(processedBuffers)) {
      if (!buffer) continue;
      
      const key = size === 'original' 
        ? storageKey 
        : storageKey.replace(`.${ext}`, `_${size}.${ext}`);
      
      uploadPromises[size] = storageService.upload({
        key,
        buffer,
        mimeType: file.mimetype,
        metadata: {
          userId,
          category: options.category || 'uploads',
          size: size
        }
      });
    }
    
    const urls = await Promise.all(
      Object.entries(uploadPromises).map(async ([size, promise]) => ({
        size,
        url: await promise
      }))
    );
    
    // URLs zuordnen
    const urlMap: any = {};
    urls.forEach(({ size, url }) => {
      if (size === 'original') urlMap.url = url;
      else urlMap[`${size}Url`] = url;
    });
    
    // File-Record erstellen
    const fileRecord = new File({
      userId,
      originalFilename: file.originalname,
      filename,
      mimeType: file.mimetype,
      size: file.size,
      storageKey,
      bucket: process.env.S3_BUCKET || 'sf1-media',
      ...urlMap,
      width: metadata.width,
      height: metadata.height,
      isProcessed: true,
      fileType,
      category: options.category,
      exifStripped: isImageMimeType(file.mimetype),
      virusScanned: false, // Wird async gescannt
      linkedTo: options.linkTo ? [options.linkTo] : []
    });
    
    await fileRecord.save();
    
    // Quota erhöhen
    await quotaService.incrementUsage(userId, file.size);
    
    // Async: Virus-Scan triggern (via Queue)
    // await virusScanService.queueScan(fileRecord._id.toString());
    
    logger.info(`[Upload] Uploaded ${filename} for user ${userId} (${fileType})`);
    
    return fileRecord;
  }
  
  /**
   * Multi-Upload (parallel)
   */
  async uploadBatch(data: {
    userId: string;
    files: Express.Multer.File[];
    isPremium?: boolean;
    options?: UploadOptions;
  }): Promise<IFile[]> {
    const { userId, files, isPremium, options } = data;
    
    // Gesamtgröße prüfen
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    await quotaService.checkQuota(userId, totalSize, isPremium);
    
    // Parallel hochladen
    const uploads = files.map(file => 
      this.upload({ userId, file, isPremium, options })
    );
    
    return Promise.all(uploads);
  }
  
  /**
   * File-Validierung
   */
  private validateFile(file: Express.Multer.File): void {
    const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
    
    const ALLOWED_TYPES = [
      // Images
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      
      // Videos
      'video/mp4',
      'video/webm',
      
      // Documents
      'application/pdf'
    ];
    
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new AppError('INVALID_FILE_TYPE', 400, `File type ${file.mimetype} not allowed`);
    }
    
    if (file.size > MAX_SIZE) {
      throw new AppError('FILE_TOO_LARGE', 400, `File size exceeds ${MAX_SIZE / (1024 * 1024)} MB`);
    }
    
    if (file.size === 0) {
      throw new AppError('EMPTY_FILE', 400, 'File is empty');
    }
  }
  
  /**
   * File löschen
   */
  async delete(fileId: string, userId: string): Promise<void> {
    const file = await File.findOne({ _id: fileId, userId });
    
    if (!file) {
      throw new AppError('FILE_NOT_FOUND', 404);
    }
    
    // S3-Dateien löschen
    const keysToDelete = [file.storageKey];
    
    if (file.thumbnailUrl) {
      keysToDelete.push(file.storageKey.replace('.', '_thumbnail.'));
    }
    if (file.smallUrl) {
      keysToDelete.push(file.storageKey.replace('.', '_small.'));
    }
    if (file.mediumUrl) {
      keysToDelete.push(file.storageKey.replace('.', '_medium.'));
    }
    if (file.largeUrl) {
      keysToDelete.push(file.storageKey.replace('.', '_large.'));
    }
    
    await storageService.deleteBatch(keysToDelete);
    
    // DB: Soft-Delete
    file.deletedAt = new Date();
    await file.save();
    
    // Quota reduzieren
    await quotaService.decrementUsage(userId, file.size);
    
    logger.info(`[Upload] Deleted file ${fileId}`);
  }
  
  /**
   * File-Info abrufen
   */
  async getFile(fileId: string, userId?: string): Promise<IFile | null> {
    const query: any = { _id: fileId, deletedAt: { $exists: false } };
    
    // Optional: User-Check (nur eigene Dateien)
    if (userId) {
      query.userId = userId;
    }
    
    return File.findOne(query).lean<IFile>();
  }
  
  /**
   * User-Files abrufen
   */
  async getUserFiles(userId: string, options: {
    fileType?: string;
    category?: string;
    limit?: number;
    skip?: number;
  } = {}): Promise<{ files: IFile[]; total: number }> {
    const query: any = { 
      userId, 
      deletedAt: { $exists: false } 
    };
    
    if (options.fileType) {
      query.fileType = options.fileType;
    }
    
    if (options.category) {
      query.category = options.category;
    }
    
    const limit = Math.min(options.limit || 50, 200);
    const skip = options.skip || 0;
    
    const [files, total] = await Promise.all([
      File.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IFile[]>(),
      File.countDocuments(query)
    ]);
    
    return { files, total };
  }
  
  /**
   * Link zu Entity hinzufügen
   */
  async linkToEntity(fileId: string, data: {
    type: string;
    id: string;
  }): Promise<void> {
    await File.updateOne(
      { _id: fileId },
      { $addToSet: { linkedTo: data } }
    );
  }
  
  /**
   * Link entfernen
   */
  async unlinkFromEntity(fileId: string, data: {
    type: string;
    id: string;
  }): Promise<void> {
    await File.updateOne(
      { _id: fileId },
      { $pull: { linkedTo: data } }
    );
  }
}

export const uploadService = new UploadService();
