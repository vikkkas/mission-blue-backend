import crypto from 'crypto';
import prisma from '../config/database';
import { config } from '../config';
import { OTPType } from '@prisma/client';

export class OTPService {
  /**
   * Generate a random OTP code
   */
  private generateOTPCode(): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < config.otp.length; i++) {
      otp += digits[crypto.randomInt(0, digits.length)];
    }
    return otp;
  }

  /**
   * Create and save OTP for a user
   */
  async createOTP(userId: string, contact: string, type: OTPType): Promise<string> {
    const code = this.generateOTPCode();
    const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

    // Delete any existing unverified OTPs for this contact
    await prisma.oTP.deleteMany({
      where: {
        contact,
        verified: false,
      },
    });

    // Create new OTP
    await prisma.oTP.create({
      data: {
        userId,
        code,
        type,
        contact,
        expiresAt,
      },
    });

    return code;
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(contact: string, code: string): Promise<{ valid: boolean; userId?: string }> {
    const otp = await prisma.oTP.findFirst({
      where: {
        contact,
        code,
        verified: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otp) {
      return { valid: false };
    }

    // Mark OTP as verified
    await prisma.oTP.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    // Mark user as verified
    await prisma.user.update({
      where: { id: otp.userId },
      data: { isVerified: true },
    });

    return { valid: true, userId: otp.userId };
  }

  /**
   * Clean up expired OTPs
   */
  async cleanupExpiredOTPs(): Promise<void> {
    await prisma.oTP.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}

export default new OTPService();
