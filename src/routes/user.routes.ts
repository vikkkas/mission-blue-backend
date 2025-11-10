import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';

const router = Router();

// Get current user profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        mobile: true,
        name: true,
        isVerified: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile',
    });
  }
});

// Update user profile
router.patch('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, mobile } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name && { name }),
        ...(email && { email, isVerified: false }),
        ...(mobile && { mobile, isVerified: false }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        isVerified: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user profile',
    });
  }
});

export default router;
