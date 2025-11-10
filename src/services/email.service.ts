import nodemailer from 'nodemailer';
import { config } from '../config';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: false, // true for 465, false for other ports
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }

  /**
   * Send OTP via email
   */
  async sendOTP(email: string, otp: string): Promise<void> {
    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: 'Your OTP Code - Mission Blue',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Your OTP Code</h2>
          <p>Your one-time password is:</p>
          <h1 style="color: #4CAF50; letter-spacing: 5px;">${otp}</h1>
          <p>This code will expire in ${config.otp.expiryMinutes} minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Failed to send OTP email');
    }
  }

  /**
   * Verify email service connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

export default new EmailService();
