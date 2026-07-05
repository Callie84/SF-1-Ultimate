// /apps/media-service/src/services/processing.service.ts
import sharp from 'sharp';
import { logger } from '../utils/logger';

export interface ProcessedImage {
  original: Buffer;
  thumbnail?: Buffer;  // 150x150
  small?: Buffer;      // 300x300
  medium?: Buffer;     // 800x800
  large?: Buffer;      // 1200x1200
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

export class ProcessingService {
  /**
   * Bild verarbeiten (EXIF-Strip + Multi-Size)
   */
  async processImage(buffer: Buffer, options: {
    generateThumbnails?: boolean;
    maxSize?: number; // Max-Größe des Originals (Standard: 2048px)
  } = {}): Promise<ProcessedImage> {
    const { generateThumbnails = true, maxSize = 2048 } = options;
    
    try {
      // Original-Metadata auslesen (vor EXIF-Strip)
      const metadata = await sharp(buffer).metadata();
      
      // Original verarbeiten
      const original = await sharp(buffer)
        .rotate() // Auto-rotate basierend auf EXIF
        .resize(maxSize, maxSize, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 90 })
        .toBuffer();
      
      const result: ProcessedImage = {
        original,
        metadata: {
          width: metadata.width || 0,
          height: metadata.height || 0,
          format: metadata.format || 'jpeg',
          size: original.length
        }
      };
      
      // Thumbnails generieren
      if (generateThumbnails) {
        const [thumbnail, small, medium, large] = await Promise.all([
          this.generateThumbnail(buffer, 150, 150),
          this.generateThumbnail(buffer, 300, 300),
          this.generateThumbnail(buffer, 800, 800),
          this.generateThumbnail(buffer, 1200, 1200)
        ]);
        
        result.thumbnail = thumbnail;
        result.small = small;
        result.medium = medium;
        result.large = large;
      }
      
      logger.info(`[Processing] Processed image (${result.metadata.width}x${result.metadata.height})`);
      
      return result;
      
    } catch (error) {
      logger.error('[Processing] Image processing failed:', error);
      throw new Error('Image processing failed');
    }
  }
  
  /**
   * Thumbnail generieren
   */
  private async generateThumbnail(
    buffer: Buffer,
    width: number,
    height: number
  ): Promise<Buffer> {
    return sharp(buffer)
      .resize(width, height, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();
  }
  
  /**
   * Video-Thumbnail (ffmpeg)
   */
  async processVideoThumbnail(videoPath: string): Promise<Buffer> {
    // TODO: ffmpeg-Integration für Video-Thumbnails
    // Für jetzt: Placeholder
    throw new Error('Video processing not implemented yet');
  }
  
  /**
   * Batch-Processing (mehrere Bilder parallel)
   */
  async processBatch(
    buffers: Buffer[],
    options?: { generateThumbnails?: boolean; maxSize?: number }
  ): Promise<ProcessedImage[]> {
    const processes = buffers.map(buffer => this.processImage(buffer, options));
    return Promise.all(processes);
  }
  
  /**
   * EXIF-Daten auslesen (vor Strip)
   */
  async extractExif(buffer: Buffer): Promise<any> {
    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      exif: metadata.exif,
      icc: metadata.icc
    };
  }
  
  /**
   * Bildformat konvertieren
   */
  async convertFormat(
    buffer: Buffer,
    targetFormat: 'jpeg' | 'png' | 'webp'
  ): Promise<Buffer> {
    const converter = sharp(buffer);
    
    switch (targetFormat) {
      case 'jpeg':
        return converter.jpeg({ quality: 90 }).toBuffer();
      case 'png':
        return converter.png({ compressionLevel: 9 }).toBuffer();
      case 'webp':
        return converter.webp({ quality: 90 }).toBuffer();
      default:
        return buffer;
    }
  }
  
  /**
   * Bild-Optimierung (ohne Größenänderung)
   */
  async optimize(buffer: Buffer): Promise<Buffer> {
    const metadata = await sharp(buffer).metadata();
    
    // Behalte Original-Format bei
    if (metadata.format === 'png') {
      return sharp(buffer)
        .png({ compressionLevel: 9 })
        .toBuffer();
    }
    
    // Default: JPEG
    return sharp(buffer)
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
  }
}

export const processingService = new ProcessingService();
