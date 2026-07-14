# Media Service — SF-1 Ultimate

Zentrale Upload-Pipeline mit S3-Integration, Auto-Thumbnails & EXIF-Strip.

## ✨ Features

- **Multi-Format-Support** (JPEG, PNG, WebP, GIF, MP4, PDF)
- **Auto-Thumbnails** (150x150, 300x300, 800x800, 1200x1200)
- **EXIF-Strip** (Privacy-First)
- **S3-Storage** (MinIO oder AWS S3)
- **Quota-Management** (FREE: 500 MB, PREMIUM: 5 GB)
- **Virus-Scan** (ClamAV-Integration)
- **CDN-Ready** (CloudFront/Cloudflare)

## 📦 Models

1. **File** - Uploaded Files (mit Thumbnails)
2. **Quota** - User-Storage-Limits

## 📡 API Endpoints

### Upload
```
POST   /api/media/upload           → Single-Upload
POST   /api/media/upload/multi     → Multi-Upload (max 20)
POST   /api/media/upload/avatar    → Avatar-Upload (Shortcut)
```

### Files
```
GET    /api/media/files            → Eigene Files
GET    /api/media/files/:id        → Details
DELETE /api/media/files/:id        → Löschen
POST   /api/media/files/:id/link   → Mit Entity verknüpfen
DELETE /api/media/files/:id/link   → Verknüpfung entfernen
```

### Quota
```
GET  /api/media/quota           → Stats abrufen
POST /api/media/quota/upgrade   → Premium upgraden
POST /api/media/quota/downgrade → Free downgraden
```

## 🔧 Processing-Pipeline

1. **Upload** → Multer (Memory-Storage)
2. **Validation** → Typ, Größe, MIME-Type
3. **Quota-Check** → Limit prüfen
4. **Processing** → EXIF-Strip + Thumbnails (sharp)
5. **Storage** → S3-Upload (parallel)
6. **DB-Entry** → MongoDB
7. **Quota-Update** → Verbrauch erhöhen
8. **Virus-Scan** → Async via Queue

## 🖼️ Thumbnail-Größen

- **Thumbnail:** 150x150 (Cover, Fit)
- **Small:** 300x300 (Cover, Fit)
- **Medium:** 800x800 (Inside, Without Enlargement)
- **Large:** 1200x1200 (Inside, Without Enlargement)
- **Original:** Max 2048x2048 (Without Enlargement)

## 💾 Storage

### AWS S3
```bash
S3_ENDPOINT=""  # Leer lassen
S3_REGION="eu-central-1"
S3_ACCESS_KEY="..."
S3_SECRET_KEY="..."
S3_BUCKET="sf1-media"
```

### MinIO (Self-Hosted)
```bash
S3_ENDPOINT="http://minio:9000"
S3_REGION="us-east-1"  # Beliebig
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="sf1-media"
```

## 🛡️ Quota-Limits

| Tier | Storage | File-Count | Reset |
|------|---------|------------|-------|
| FREE | 500 MB | 1.000 | Monatlich |
| PREMIUM | 5 GB | 10.000 | Monatlich |

## 🦠 Virus-Scan (Optional)

ClamAV-Container deployen:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clamav
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: clamav
          image: clamav/clamav:latest
          ports:
            - containerPort: 3310
```

## 🚀 Development

```bash
npm install
npm run dev     # Watch-Mode
npm run build   # Produktions-Build
npm start       # Produktions-Start
```

## 📋 ENV Variables

```bash
PORT=3008
NODE_ENV=production
MONGODB_URL=mongodb://...
REDIS_URL=redis://...
S3_BUCKET=sf1-media
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_REGION=eu-central-1
S3_ENDPOINT=  # Leer für AWS, oder MinIO-URL
CDN_URL=      # Optional
CLAMAV_HOST=clamav
CLAMAV_PORT=3310
```

## 🐳 Docker

```bash
docker build -t media-service .
docker run -p 3008:3008 media-service
```

## 📊 Tech Stack

- **Express** - Web-Framework
- **MongoDB** - Datenbank
- **Redis** - Cache + Queue
- **Sharp** - Image-Processing
- **AWS SDK** - S3-Integration
- **Multer** - File-Upload
- **ClamAV** - Virus-Scan

## 🔗 Integration

### Journal-Service
```typescript
// Statt direkt sharp:
const formData = new FormData();
formData.append('file', file);
formData.append('category', 'journal');
formData.append('linkToType', 'entry');
formData.append('linkToId', entryId);

const response = await fetch('http://media-service:3008/api/media/upload', {
  method: 'POST',
  body: formData,
  headers: {
    'x-user-id': userId,
    'x-user-role': userRole,
    'x-user-premium': userPremium
  }
});

const { file } = await response.json();
console.log('Uploaded:', file.url);
```

### Community-Service
```typescript
// Thread-Attachments
const files = await uploadService.uploadBatch({
  userId,
  files: req.files,
  isPremium,
  options: {
    category: 'community',
    linkTo: { type: 'thread', id: threadId }
  }
});
```

## 🔄 Migration (von Journal/Community)

**Alte Implementierung entfernen:**
1. `photo.service.ts` aus Journal-Service löschen
2. EXIF-Strip-Code entfernen
3. S3-Uploads via Media-Service machen

**Vorteil:**
- ✅ Keine Code-Duplikation
- ✅ Zentrale Quota-Verwaltung
- ✅ Einheitliche Thumbnails
- ✅ Ein Virus-Scan für alles

## ⚠️ Wichtig

1. **EXIF-Strip:** Immer aktiviert für Bilder
2. **Quota:** Check vor Upload (QUOTA_EXCEEDED → 403)
3. **File-Size:** Max 50 MB pro File
4. **Batch-Upload:** Max 20 Files gleichzeitig
5. **Allowed Types:** JPEG, PNG, WebP, GIF, MP4, PDF

## 📈 Performance

- **Parallel Processing:** Thumbnails gleichzeitig generiert
- **Parallel Upload:** S3-Uploads gleichzeitig
- **Async Virus-Scan:** Blockiert Upload nicht
- **CDN:** Optional für schnellere Auslieferung

---

**Status:** ✅ Canvas #7 komplett
**Port:** 3008
**Nächster Schritt:** Canvas #8 (Gamification Service)
