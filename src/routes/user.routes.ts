import { Router, Response } from 'express';
import { ZodError } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/database';
import { profileSchema } from '../schemas/profile.schema';

const router = Router();
const userProfileSelect = {
  id: true,
  email: true,
  mobile: true,
  name: true,
  isVerified: true,
  createdAt: true,
  profile: true,
};

// Get current user profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: userProfileSelect,
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

router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: userProfileSelect,
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

const normalizeConsents = (body: Record<string, any>) => {
  if (body.consents) {
    if (typeof body.consents === 'string') {
      try {
        const parsed = JSON.parse(body.consents);
        if (parsed) return parsed;
      } catch {
        // ignore parse errors
      }
    } else if (typeof body.consents === 'object') {
      return body.consents;
    }
  }

  return {
    terms: body.terms ?? body.termsConsent ?? body['consents.terms'],
    media: body.media ?? body.mediaConsent ?? body['consents.media'],
    data: body.data ?? body.dataConsent ?? body['consents.data'] ?? body.dataStorage,
  };
};

router.post(
  '/profile',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const parsed = profileSchema.parse({
        ...req.body,
        consents: normalizeConsents(req.body as Record<string, any>),
      });

      const profileData = {
        fullName: parsed.fullName,
        dob: new Date(parsed.dob),
        gender: parsed.gender,
        nationality: parsed.nationality,
        passport: parsed.passport,
        email: parsed.email,
        mobile: parsed.mobile,
        altMobile: parsed.altMobile,
        address: parsed.address,
        pincode: parsed.pincode,
        organization: parsed.organization,
        designation: parsed.designation,
        industry: parsed.industry,
        linkedin: parsed.linkedin,
        referral: parsed.referral,
        volunteer: parsed.volunteer,
        interests: parsed.interests ?? [],
        termsConsent: parsed.consents.terms,
        mediaConsent: parsed.consents.media,
        dataConsent: parsed.consents.data,
        photoUrl: parsed.photoUrl,
        idProofUrl: parsed.idProofUrl,
        studentIdUrl: parsed.studentIdUrl,
      };

      const profile = await prisma.profile.upsert({
        where: { userId: req.user!.id },
        create: {
          userId: req.user!.id,
          ...profileData,
        },
        update: profileData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              mobile: true,
              name: true,
              isVerified: true,
              createdAt: true,
            },
          },
        },
      });

      await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          name: parsed.fullName,
          email: parsed.email,
          mobile: parsed.mobile,
        },
      });

      res.json({
        success: true,
        message: 'Profile saved successfully',
        data: profile,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.flatten(),
        });
        return;
      }
      res.status(500).json({
        success: false,
        message: 'Failed to save profile',
      });
    }
  },
);

// Update user profile
router.patch('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, mobile } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(mobile && { mobile }),
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
