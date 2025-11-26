import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import prisma from '../config/database';
import authService from '../services/auth.service';
import emailService from '../services/email.service';
import tokenService from '../services/token.service';
import {
  registerMobileSchema,
  registerEmailSchema,
  loginWithEmailSchema,
  loginWithMobileSchema,
  resendVerificationSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
} from '../schemas/auth.schema';
import { config } from '../config';
import { TokenTypeEnum } from '../utils/tokenTypes';

const router = Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
});

router.use(authLimiter);

const sanitizeUser = (user: any) => ({
  id: user.id,
  email: user.email,
  mobile: user.mobile,
  name: user.name,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
});

const buildLink = (path: string, token: string) => `${config.appUrl}${path}?token=${token}`;


// Register with email
router.post('/register/email', async (req: Request, res: Response) => {
  try {
    const { email, name, password } = registerEmailSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
      });
    }

    const passwordHash = await authService.hashPassword(password);

    const user = await prisma.user.create({
      data: { email, name, passwordHash, isVerified: false },
    });

    const token = await tokenService.createToken(
      user.id,
      TokenTypeEnum.VERIFY_EMAIL,
      config.verification.emailExpiryHours * 60 * 60 * 1000,
    );

    const verificationLink = buildLink('/verify-email', token);
    await emailService.sendVerificationEmail(email, verificationLink);

    return res.json({
      success: true,
      message: 'Verification email sent. Please check your inbox to verify your account.',
      user: sanitizeUser(user),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return res.status(400).json({
        success: false,
        message: firstError.message,
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message || 'Invalid request',
    });
  }
});

// Login with email
router.post('/login/email', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginWithEmailSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your account before logging in.',
      });
    }

    const passwordMatches = await authService.verifyPassword(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = await authService.createSession(user.id);

    return res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: sanitizeUser(user),
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Invalid request',
    });
  }
});

// Resend email verification link
router.post('/verify/email/resend', async (req: Request, res: Response) => {
  try {
    const { email } = resendVerificationSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.isVerified) {
      return res.json({
        success: true,
        message: 'Email is already verified.',
      });
    }

    const token = await tokenService.createToken(
      user.id,
      TokenTypeEnum.VERIFY_EMAIL,
      config.verification.emailExpiryHours * 60 * 60 * 1000,
    );

    const verificationLink = buildLink('/verify-email', token);
    await emailService.sendVerificationEmail(email, verificationLink);

    return res.json({
      success: true,
      message: 'Verification email resent.',
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Invalid request',
    });
  }
});

// Verify email magic link
router.get('/verify/email', async (req: Request, res: Response) => {
  try {
    const token = req.query.token;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required',
      });
    }

    const userId = await tokenService.consumeToken(token, TokenTypeEnum.VERIFY_EMAIL);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link',
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });

    return res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Invalid request',
    });
  }
});

// Send password reset magic link
router.post('/password/reset/request', async (req: Request, res: Response) => {
  try {
    const { email } = passwordResetRequestSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond success to avoid leaking existence, but send email if user exists
    if (user) {
      const token = await tokenService.createToken(
        user.id,
        TokenTypeEnum.RESET_PASSWORD,
        config.passwordReset.expiryMinutes * 60 * 1000,
      );

      const resetLink = buildLink('/reset-password', token);
      await emailService.sendPasswordResetEmail(email, resetLink);
    }

    return res.json({
      success: true,
      message: 'If an account exists for that email, a password reset link has been sent.',
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Invalid request',
    });
  }
});

// Confirm password reset
router.post('/password/reset/confirm', async (req: Request, res: Response) => {
  try {
    const { token, password } = passwordResetConfirmSchema.parse(req.body);

    const userId = await tokenService.consumeToken(token, TokenTypeEnum.RESET_PASSWORD);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset link',
      });
    }

    const passwordHash = await authService.hashPassword(password);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, isVerified: true },
    });

    return res.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Invalid request',
    });
  }
});

export default router;
