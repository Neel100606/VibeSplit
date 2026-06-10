import express from 'express';
import multer from 'multer';
import { scanReceipt } from '../controllers/aiController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Configure multer memory storage
const storage = multer.memoryStorage();

// Set up file filter for standard image formats
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP receipt images are allowed.'), false);
  }
};

// Configure upload middleware with 5MB limit
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});

// Middleware helper to handle multer error responses gracefully
const handleMulterUpload = (req, res, next) => {
  upload.single('receipt')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size limit exceeded. Maximum allowed size is 5MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// POST /scan-receipt route
// Protected by standard auth middleware, handles receipt upload, and forwards to the controller
router.post('/scan-receipt', auth, handleMulterUpload, scanReceipt);

export default router;
