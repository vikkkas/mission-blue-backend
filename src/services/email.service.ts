import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: config.email.user
    ? {
        user: config.email.user,
        pass: config.email.password,
      }
    : undefined,
});

class EmailService {
  async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (!config.email.user || !config.email.password) {
      console.warn('Email credentials not configured. Email content:', {
        to,
        subject,
        html,
      });
      return;
    }

    await transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      html,
    });
  }

  async sendVerificationEmail(to: string, link: string): Promise<void> {
    const html = `
      <p>Welcome to Mission Blue!</p>
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${link}">Verify Email</a></p>
      <p>This link will expire in ${config.verification.emailExpiryHours} hours.</p>
    `;
    await this.sendMail(to, 'Verify your email', html);
  }

  async sendPasswordResetEmail(to: string, link: string): Promise<void> {
    const html = `
      <p>We received a request to reset your password.</p>
      <p>Click the link below to set a new password:</p>
      <p><a href="${link}">Reset Password</a></p>
      <p>This link will expire in ${config.passwordReset.expiryMinutes} minutes.</p>
    `;
    await this.sendMail(to, 'Reset your password', html);
  }
}

export default new EmailService();
