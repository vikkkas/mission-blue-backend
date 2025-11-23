import crypto from 'crypto';
import prisma from '../config/database';
import { TokenTypeEnum, TokenTypeValue } from '../utils/tokenTypes';

class TokenService {
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async createToken(userId: string, type: TokenTypeValue, expiresInMs: number): Promise<string> {
    const token = this.generateToken();

    // Clean up old unused tokens of same type for the user
    await prisma.verificationToken.deleteMany({
      where: { userId, type, used: false },
    });

    await prisma.verificationToken.create({
      data: {
        userId,
        token,
        type,
        expiresAt: new Date(Date.now() + expiresInMs),
      },
    });

    return token;
  }

  async consumeToken(token: string, type: TokenTypeValue): Promise<string | null> {
    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!record || record.used || record.type !== type || record.expiresAt < new Date()) {
      return null;
    }

    await prisma.verificationToken.update({
      where: { token },
      data: { used: true },
    });

    return record.userId;
  }
}

export default new TokenService();
