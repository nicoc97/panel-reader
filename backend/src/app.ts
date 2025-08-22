import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer') as any;
// Use require form to avoid missing @types in some environments
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sizeOf = require('image-size') as (path: string) => { width?: number; height?: number };

import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

// Middleware
const isProd = process.env.NODE_ENV === 'production';

// Helmet security headers - environment-aware
if (isProd) {
  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          blockAllMixedContent: [],
          fontSrc: ["'self'", 'https:', 'data:'],
          frameAncestors: ["'none'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
          upgradeInsecureRequests: [],
        },
      },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
      // COOP/COEP for stronger isolation; adjust if using cross-origin resources that require relax
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginEmbedderPolicy: false, // set true only if you need COEP and can serve all cross-origin with proper CORP/COEP
      crossOriginResourcePolicy: { policy: 'same-origin' },
      hsts: { maxAge: 15552000 }, // 180 days
    })
  );
} else {
  // Development: relax policies for Vite HMR and cross-port embedding
  app.use(
    helmet({
      contentSecurityPolicy: false, // Vite HMR and inline styles/scripts in dev
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'no-referrer' },
    })
  );
}

const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        // Allow non-browser clients or same-origin
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
const uploadDir = path.resolve(process.env.UPLOAD_PATH || path.join(__dirname, '..', 'uploads'));
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const staticOptions = isProd
  ? {}
  : {
      setHeaders: (res: express.Response) => {
        // Ensure CORP is relaxed in development and avoid stale caches carrying stricter headers
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cache-Control', 'no-store');
      },
    } as any;
app.use('/uploads', express.static(uploadDir, staticOptions));
// Fallback to legacy path if different and files were saved previously
const legacyUploadDir = path.resolve(process.cwd(), 'uploads');
if (legacyUploadDir !== uploadDir) {
  app.use('/uploads', express.static(legacyUploadDir, staticOptions));
}

// Multer setup
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024); // 10MB
const storage = multer.diskStorage({
  destination: (_req: express.Request, _file: any, cb: (error: Error | null, destination?: string) => void) => {
    cb(null, uploadDir);
  },
  filename: (_req: express.Request, file: any, cb: (error: Error | null, filename?: string) => void) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (
  req: express.Request,
  file: any,
  cb: (error: Error | null, acceptFile?: boolean) => void
) => {
  const allowed = ['image/jpeg', 'image/png'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Only JPEG and PNG files are allowed'));
  }
  cb(null, true);
};

const upload = multer({ storage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter });

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Upload endpoint
app.post('/api/v1/uploads', upload.single('image'), async (req: express.Request & { file?: any }, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = path.join(uploadDir, req.file.filename);

    let dimensions;
    try {
      dimensions = sizeOf(filePath);
      if (!dimensions.width || !dimensions.height) {
        // Not a valid image? cleanup and error
        fs.unlink(filePath, () => {});
        return res.status(400).json({ error: 'Invalid image file' });
      }
    } catch (e) {
      fs.unlink(filePath, () => {});
      return res.status(400).json({ error: 'Could not process image' });
    }

    // Create or find a demo user until auth exists
    const demoEmail = 'demo@example.com';
    const demoUsername = 'demo';
    const user = await prisma.user.upsert({
      where: { email: demoEmail },
      update: {},
      create: { email: demoEmail, username: demoUsername },
    });

    let image;
    try {
      image = await prisma.image.create({
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          width: dimensions.width ?? null,
          height: dimensions.height ?? null,
          userId: user.id,
        },
      });
    } catch (dbErr) {
      // cleanup file if DB write fails
      fs.unlink(filePath, () => {});
      throw dbErr;
    }

    const publicBase = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
    const url = `${publicBase}/uploads/${req.file.filename}`;

    return res.status(201).json({
      id: image.id,
      filename: image.filename,
      originalName: image.originalName,
      mimeType: image.mimeType,
      size: image.size,
      width: image.width,
      height: image.height,
      url,
      uploadedAt: image.uploadedAt,
    });
  } catch (err) {
    return next(err);
  }
});

// API routes placeholder
app.get('/api/v1/test', (req, res) => {
  res.json({ message: 'Backend API is working!' });
});

// Health: DB connectivity
app.get('/health/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch (e: any) {
    res.status(503).json({ status: 'error', error: e?.message || 'DB not reachable' });
  }
});

// Health: storage (uploads dir)
app.get('/health/storage', (req, res) => {
  try {
    fs.accessSync(uploadDir, fs.constants.R_OK | fs.constants.W_OK);
    res.json({ status: 'ok' });
  } catch (e: any) {
    res.status(503).json({ status: 'error', error: e?.message || 'Storage not accessible' });
  }
});

// List uploaded images
app.get('/api/v1/images', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '20'), 10) || 20, 1), 100);
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);

    const [items, total] = await Promise.all([
      prisma.image.findMany({
        orderBy: { uploadedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.image.count(),
    ]);

    const publicBase = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
    const mapped = items.map((image) => ({
      id: image.id,
      filename: image.filename,
      originalName: image.originalName,
      mimeType: image.mimeType,
      size: image.size,
      width: image.width,
      height: image.height,
      url: `${publicBase}/uploads/${image.filename}`,
      uploadedAt: image.uploadedAt,
    }));

    res.json({ total, limit, offset, items: mapped });
  } catch (err) {
    next(err);
  }
});

// Multer error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Max 10MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  return next(err);
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler (Express 5: avoid '*' which breaks path-to-regexp)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
