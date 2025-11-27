import { Resend } from 'resend';
import { config } from '../config';
import logger from '../utils/logger';

const resendClient = config.email.resendApiKey
  ? new Resend(config.email.resendApiKey)
  : null;

class EmailService {
  async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (!resendClient) {
      logger.warn(
        { to, subject },
        'Resend API key not configured. Email not sent.'
      );
      return;
    }

    try {
      const from = config.email.from || "Mission Blue <hello@vikasworks.tech>";

      const resendResponse = await resendClient.emails.send({
        from,
        to,
        subject,
        html,
      });

      logger.info(
        { resendResponse },
        'Email sent successfully via Resend.'
      );
    } catch (err: any) {
      logger.error(
        { error: err },
        `Error sending email to ${to}: ${err.message}`
      );
    }
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

    logger.info({ to }, 'Password reset email sent.');
  }
}

export default new EmailService();
