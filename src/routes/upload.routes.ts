import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { createPresignedGet, createPresignedUpload } from '../services/s3.service';

const router = Router();

const presignSchema = z.object({
  fileName: z.string().trim().min(1),
  contentType: z.string().trim().min(1),
});

const getPresignSchema = z.object({
  key: z.string().trim().min(1),
});

router.post('/presign', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { fileName, contentType } = presignSchema.parse(req.body);
    const prefix = `users/${req.user!.id}`;

    const result = await createPresignedUpload({
      keyPrefix: prefix,
      fileName,
      contentType,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid request',
        errors: error.flatten(),
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate presigned URL',
    });
  }
});

router.post('/presign/get', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { key } = getPresignSchema.parse(req.body);

    const result = await createPresignedGet({ key });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid request',
        errors: error.flatten(),
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate download URL',
    });
  }
});

export default router;
