import { TokenType as PrismaTokenType } from '@prisma/client';

// Fallback ensures enum values are available even if Prisma client hasn't been regenerated yet.
export const TokenTypeEnum =
  (PrismaTokenType as typeof PrismaTokenType | undefined) ?? {
    VERIFY_EMAIL: 'VERIFY_EMAIL',
    RESET_PASSWORD: 'RESET_PASSWORD',
  };

export type TokenTypeValue = typeof TokenTypeEnum[keyof typeof TokenTypeEnum];
