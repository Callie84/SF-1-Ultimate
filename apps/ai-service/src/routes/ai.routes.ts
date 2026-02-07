// /apps/ai-service/src/routes/ai.routes.ts
import { Router } from 'express';
import multer from 'multer';
import { diagnosisService } from '../services/diagnosis.service';
import { advisorService } from '../services/advisor.service';
import { chatService } from '../services/chat.service';
import { authMiddleware } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rate-limit';

const router = Router();

// Rate-Limiter: 10 AI-Requests pro Minute
const aiRateLimit = rateLimitMiddleware({
  windowMs: 60000,
  maxRequests: 10,
  keyPrefix: 'ratelimit:ai'
});

// Multer für Image-Upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images allowed'));
    }
  }
});

/**
 * POST /api/ai/diagnose
 * Plant Problem Diagnosis (mit Bildern)
 * Frontend sendet: FormData mit 'images' und 'description'
 * Returns: { diagnoses: DiagnosisResult[] }
 */
router.post('/diagnose',
  authMiddleware,
  aiRateLimit,
  upload.array('images', 5),
  async (req, res, next) => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }

      // Convert zu Base64
      const images = files.map(file => {
        const base64 = file.buffer.toString('base64');
        return `data:${file.mimetype};base64,${base64}`;
      });

      // Frontend sendet 'description', Backend nutzt 'symptoms'
      const { description, symptoms, growSetup, stage } = req.body;

      const result = await diagnosisService.diagnose({
        images,
        symptoms: symptoms || description, // Beide Feldnamen akzeptieren
        growSetup: growSetup ? JSON.parse(growSetup) : undefined,
        stage
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/ai/diagnose/quick
 * Quick Diagnosis (nur Text, kein Bild)
 * Frontend sendet: { description: string }
 * Returns: { diagnoses: DiagnosisResult[] }
 */
router.post('/diagnose/quick',
  authMiddleware,
  aiRateLimit,
  async (req, res, next) => {
    try {
      // Frontend sendet 'description', Backend nutzt 'symptoms'
      const { description, symptoms, setup } = req.body;
      const symptomText = symptoms || description;

      if (!symptomText) {
        return res.status(400).json({ error: 'Symptoms/description required' });
      }

      const result = await diagnosisService.quickDiagnose(symptomText, setup);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/ai/diagnose/common
 * Häufige Probleme
 */
router.get('/diagnose/common',
  async (req, res, next) => {
    try {
      const problems = await diagnosisService.getCommonProblems();
      res.json({ problems });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/ai/advice
 * Personalisierte Beratung / Grow-Plan
 * Frontend sendet: { experience, goal, growType, medium }
 * ODER: { question, userContext, conversationHistory }
 * Returns: { strainRecommendations[], setupAdvice[], timeline[], tips[] }
 */
router.post('/advice',
  authMiddleware,
  aiRateLimit,
  async (req, res, next) => {
    try {
      const { experience, goal, growType, medium, question, userContext, conversationHistory } = req.body;

      // Neues Frontend-Format: { experience, goal, growType, medium }
      if (experience && goal && growType && medium) {
        const result = await advisorService.getGrowPlan({
          experience,
          goal,
          growType,
          medium
        });
        return res.json(result);
      }

      // Legacy-Format: { question, userContext, conversationHistory }
      if (question) {
        const result = await advisorService.getAdvice({
          question,
          userContext,
          conversationHistory
        });
        return res.json(result);
      }

      return res.status(400).json({ error: 'Missing required fields (experience/goal/growType/medium or question)' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/ai/advice/strain
 * Strain-Empfehlung
 */
router.post('/advice/strain',
  authMiddleware,
  aiRateLimit,
  async (req, res, next) => {
    try {
      const { experienceLevel, growType, goals, budget } = req.body;

      if (!experienceLevel || !growType || !goals) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await advisorService.recommendStrain({
        experienceLevel,
        growType,
        goals,
        budget
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/ai/advice/setup
 * Setup-Optimierung
 */
router.post('/advice/setup',
  authMiddleware,
  aiRateLimit,
  async (req, res, next) => {
    try {
      const { space, lights, ventilation, medium, nutrients } = req.body;

      const result = await advisorService.optimizeSetup({
        space,
        lights,
        ventilation,
        medium,
        nutrients
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/ai/advice/harvest
 * Harvest-Timing
 */
router.post('/advice/harvest',
  authMiddleware,
  aiRateLimit,
  upload.array('images', 3),
  async (req, res, next) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { strain, weekInFlower, trichomeColor, pistilColor } = req.body;

      let images: string[] | undefined;

      if (files && files.length > 0) {
        images = files.map(file => {
          const base64 = file.buffer.toString('base64');
          return `data:${file.mimetype};base64,${base64}`;
        });
      }

      const result = await advisorService.harvestAdvice({
        strain,
        weekInFlower: parseInt(weekInFlower),
        trichomeColor,
        pistilColor,
        images
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/ai/chat
 * Chat mit AI
 * Returns: { content, messageId, timestamp, sessionId }
 */
router.post('/chat',
  authMiddleware,
  aiRateLimit,
  async (req, res, next) => {
    try {
      const { message, sessionId } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message required' });
      }

      const result = await chatService.chat(req.user!.id, message, sessionId);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/ai/chat/sessions
 * Alle Chat-Sessions
 */
router.get('/chat/sessions',
  authMiddleware,
  async (req, res, next) => {
    try {
      const sessions = await chatService.getUserSessions(req.user!.id);
      res.json({ sessions });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/ai/chat/sessions/:id
 * Einzelne Session laden
 * Frontend erwartet: { messages: [...] } (nicht in session gewrappt)
 */
router.get('/chat/sessions/:id',
  authMiddleware,
  async (req, res, next) => {
    try {
      const session = await chatService.getSession(req.params.id);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Security: Check ownership
      if (session.userId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Frontend greift direkt auf response.messages zu
      res.json({
        id: session.id,
        messages: session.messages,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/ai/chat/sessions/:id
 * Session löschen
 */
router.delete('/chat/sessions/:id',
  authMiddleware,
  async (req, res, next) => {
    try {
      const session = await chatService.getSession(req.params.id);

      if (session && session.userId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await chatService.deleteSession(req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
