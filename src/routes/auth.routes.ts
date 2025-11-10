import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../config/database';
import otpService from '../services/otp.service';
import authService from '../services/auth.service';
import emailService from '../services/email.service';
import smsService from '../services/sms.service';
import {
  registerMobileSchema,
  registerEmailSchema,
  verifyOTPSchema,
} from '../schemas/auth.schema';
import { OTPType } from '@prisma/client';
import { config } from '../config';

const router = Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
});

router.use(authLimiter);

// Register with mobile
router.post('/register/mobile', async (req: Request, res: Response) => {
  try {
    const { mobile, name } = registerMobileSchema.parse(req.body);

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { mobile } });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: { mobile, name },
      });
    }

    // Generate and send OTP
    const otp = await otpService.createOTP(user.id, mobile, OTPType.MOBILE);
    await smsService.sendOTP(mobile, otp);

    res.json({
      success: true,
      message: 'OTP sent to mobile number',
      userId: user.id,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Invalid request',
    });
  }
});

// Register with email
router.post('/register/email', async (req: Request, res: Response) => {
  try {
    const { email, name } = registerEmailSchema.parse(req.body);

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: { email, name },
      });
    }

    // Generate and send OTP
    const otp = await otpService.createOTP(user.id, email, OTPType.EMAIL);
    await emailService.sendOTP(email, otp);

    res.json({
      success: true,
      message: 'OTP sent to email',
      userId: user.id,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Invalid request',
    });
  }
});

// Login with mobile
router.post('/login/mobile', async (req: Request, res: Response) => {
  try {
    const { mobile } = registerMobileSchema.parse(req.body);

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { mobile } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate and send OTP
    const otp = await otpService.createOTP(user.id, mobile, OTPType.MOBILE);
    await smsService.sendOTP(mobile, otp);

    res.json({
      success: true,
      message: 'OTP sent to mobile number',
      userId: user.id,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Invalid request',
    });
  }
});

// Login with email
router.post('/login/email', async (req: Request, res: Response) => {
  try {
    const { email } = registerEmailSchema.parse(req.body);

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate and send OTP
    const otp = await otpService.createOTP(user.id, email, OTPType.EMAIL);
    await emailService.sendOTP(email, otp);

    res.json({
      success: true,
      message: 'OTP sent to email',
      userId: user.id,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Invalid request',
    });
  }
});

// Verify OTP
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { contact, code } = verifyOTPSchema.parse(req.body);

    const result = await otpService.verifyOTP(contact, code);

    if (!result.valid || !result.userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Create session and generate token
    const token = await authService.createSession(result.userId);

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: {
        id: true,
        mobile: true,
        email: true,
        name: true,
        isVerified: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      message: 'OTP verified successfully',
      token,
      user,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Invalid request',
    });
  }
});

// Logout
router.get('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const token = authHeader.substring(7);
    await authService.revokeSession(token);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Invalid request',
    });
  }
});

export default router;
