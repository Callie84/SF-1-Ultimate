import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../utils/logger';

const S3_ENDPOINT = process.env.S3_ENDPOINT || '';
const S3_REGION = process.env.S3_REGION || 'eu-central';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || '';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || '';
export const S3_BUCKET = process.env.S3_BUCKET || 'sf1-uploads';

export const s3 = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  forcePathStyle: true, // Hetzner benötigt path-style URLs
});

export async function uploadToS3(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  // Public URL: https://endpoint/bucket/key
  const url = `${S3_ENDPOINT}/${S3_BUCKET}/${key}`;
  logger.debug(`[S3] Uploaded: ${url}`);
  return url;
}

export async function deleteFromS3(key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    }));
    logger.debug(`[S3] Deleted: ${key}`);
  } catch (err) {
    logger.warn(`[S3] Delete failed for ${key}: ${err}`);
  }
}

export function keyFromUrl(url: string): string {
  // https://endpoint/bucket/key → key
  const prefix = `${S3_ENDPOINT}/${S3_BUCKET}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : url;
}
