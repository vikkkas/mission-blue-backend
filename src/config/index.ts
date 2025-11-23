import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  appUrl: process.env.APP_URL || 'http://localhost:3000/api/v1',
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || 'noreply@missionblue.com',
    secure: process.env.EMAIL_SECURE === 'true',
  },

  verification: {
    emailExpiryHours: parseInt(process.env.EMAIL_VERIFICATION_EXPIRY_HOURS || '24', 10),
  },

  passwordReset: {
    expiryMinutes: parseInt(process.env.PASSWORD_RESET_EXPIRY_MINUTES || '30', 10),
  },
  
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
};
