import { Router } from 'express';
import multer from 'multer';
import { photoService } from '../services/photo.service';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/:entryId/photos',
  authMiddleware,
  async (req, res, next) => {
    try {
      const photos = await photoService.getByEntry(req.params.entryId, req.user!.id);
      res.json({ photos });
    } catch (error) {
      next(error);
    }
  }
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

router.post('/:entryId/photos',
  authMiddleware,
  upload.single('photo'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const photo = await photoService.upload({
        entryId: req.params.entryId,
        userId: req.user!.id,
        file: req.file,
        caption: req.body.caption,
        order: parseInt(req.body.order || '0')
      });
      
      res.status(201).json({ photo });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/:entryId/photos/bulk',
  authMiddleware,
  upload.array('photos', 10),
  async (req, res, next) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }
      
      const photos = await Promise.all(
        req.files.map((file, index) => 
          photoService.upload({
            entryId: req.params.entryId,
            userId: req.user!.id,
            file,
            order: index
          })
        )
      );
      
      res.status(201).json({ photos });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/photos/:id',
  authMiddleware,
  async (req, res, next) => {
    try {
      await photoService.delete(req.params.id, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
