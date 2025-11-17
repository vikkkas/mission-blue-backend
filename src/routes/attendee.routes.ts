import { Router } from 'express';
import multer from 'multer';
import attendeeController from '../controllers/attendee.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Configure multer for file uploads (in-memory storage)
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept only specific file types
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
});

// File upload fields configuration
const uploadFields = upload.fields([
  { name: 'photoUpload', maxCount: 1 },
  { name: 'idProofUpload', maxCount: 1 },
  { name: 'studentIdUpload', maxCount: 1 },
]);

/**
 * Authenticated Routes - User must be logged in
 */

// Submit registration form (authenticated user)
router.post('/', authenticate, uploadFields, attendeeController.create.bind(attendeeController));

// Get my registration
router.get('/me', authenticate, attendeeController.getMyRegistration.bind(attendeeController));

// Update my registration
router.put('/me', authenticate, uploadFields, attendeeController.updateMyRegistration.bind(attendeeController));

/**
 * Admin Routes (require authentication - add role check if needed)
 */

// Get all attendees with filtering and pagination
// router.get('/', authenticate, attendeeController.getAll.bind(attendeeController));

// Get statistics
// router.get('/stats', authenticate, attendeeController.getStatistics.bind(attendeeController));

// Get attendee by ID
// router.get('/:id', authenticate, attendeeController.getById.bind(attendeeController));

// Delete attendee
// router.delete('/:id', authenticate, attendeeController.delete.bind(attendeeController));

export default router;
