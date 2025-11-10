import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config } from '../config';

export class AuthService {
  /**
   * Generate JWT token
   */
  generateToken(userId: string): string {
    return jwt.sign(
      { userId }, 
      config.jwt.secret, 
      { expiresIn: config.jwt.expiresIn as string }
    );
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create session for user
   */
  async createSession(userId: string): Promise<string> {
    const token = this.generateToken(userId);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Validate session token
   */
  async validateSession(token: string): Promise<string | null> {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return session.userId;
  }

  /**
   * Revoke session
   */
  async revokeSession(token: string): Promise<void> {
    await prisma.session.delete({
      where: { token },
    });
  }
}

export default new AuthService();
