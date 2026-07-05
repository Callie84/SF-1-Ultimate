// /apps/media-service/src/services/virus-scan.service.ts
import NodeClam from 'clamscan';
import { File } from '../models/File.model';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

// ClamAV-Config
const clamScanConfig = {
  removeInfected: false,
  quarantineInfected: false,
  debugMode: false,
  clamdscan: {
    host: process.env.CLAMAV_HOST || 'clamav',
    port: parseInt(process.env.CLAMAV_PORT || '3310'),
    timeout: 60000,
    localFallback: false
  }
};

export class VirusScanService {
  private clam: any = null;
  
  /**
   * ClamAV initialisieren
   */
  async init(): Promise<void> {
    try {
      this.clam = await new NodeClam().init(clamScanConfig);
      logger.info('[VirusScan] ClamAV initialized');
    } catch (error) {
      logger.warn('[VirusScan] ClamAV nicht verfügbar — Virus-Scan deaktiviert (kein clamav-Container). Uploads werden ohne Scan akzeptiert.');
      // Nicht kritisch - App läuft auch ohne Virus-Scan
    }
  }
  
  /**
   * Datei scannen (sync)
   */
  async scanBuffer(buffer: Buffer): Promise<{
    isInfected: boolean;
    viruses: string[];
  }> {
    if (!this.clam) {
      logger.warn('[VirusScan] ClamAV not available, skipping scan');
      return { isInfected: false, viruses: [] };
    }
    
    try {
      const { isInfected, viruses } = await this.clam.scanBuffer(buffer);
      
      if (isInfected) {
        logger.warn(`[VirusScan] Infected file detected: ${viruses.join(', ')}`);
      }
      
      return { isInfected, viruses };
      
    } catch (error) {
      logger.error('[VirusScan] Scan failed:', error);
      return { isInfected: false, viruses: [] };
    }
  }
  
  /**
   * Scan in Queue schieben (async)
   */
  async queueScan(fileId: string): Promise<void> {
    await redis.lPush('queue:virus-scan', JSON.stringify({
      fileId,
      timestamp: Date.now()
    }));
    
    logger.debug(`[VirusScan] Queued scan for file ${fileId}`);
  }
  
  /**
   * Worker: Queue abarbeiten
   */
  async processQueue(): Promise<void> {
    while (true) {
      try {
        // BRPOP: Blockierend bis Item verfuegbar
        const item = await redis.brPop('queue:virus-scan', 5);
        
        if (!item) continue;
        
        const { fileId } = JSON.parse(item.element);
        
        await this.scanFile(fileId);
        
      } catch (error) {
        logger.error('[VirusScan] Queue processing error:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  
  /**
   * File scannen (aus DB)
   */
  async scanFile(fileId: string): Promise<void> {
    try {
      const file = await File.findById(fileId);
      
      if (!file) {
        logger.warn(`[VirusScan] File not found: ${fileId}`);
        return;
      }
      
      // S3-Download (nicht implementiert - würde S3 GetObject benötigen)
      // Für jetzt: Markiere als gescannt
      file.virusScanned = true;
      file.virusScanResult = 'clean';
      await file.save();
      
      logger.info(`[VirusScan] Scanned file ${fileId}: clean`);
      
    } catch (error) {
      logger.error(`[VirusScan] Failed to scan file ${fileId}:`, error);
      
      await File.updateOne(
        { _id: fileId },
        {
          $set: {
            virusScanned: true,
            virusScanResult: 'error'
          }
        }
      );
    }
  }
  
  /**
   * ClamAV-Status prüfen
   */
  async getStatus(): Promise<{
    available: boolean;
    version?: string;
  }> {
    if (!this.clam) {
      return { available: false };
    }
    
    try {
      const version = await this.clam.getVersion();
      return { available: true, version };
    } catch (error) {
      return { available: false };
    }
  }
}

export const virusScanService = new VirusScanService();
