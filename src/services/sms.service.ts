import twilio from 'twilio';
import { config } from '../config';

export class SMSService {
  private client: twilio.Twilio | null = null;

  constructor() {
    if (config.twilio.accountSid && config.twilio.authToken) {
      this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    }
  }

  /**
   * Send OTP via SMS
   */
  async sendOTP(mobile: string, otp: string): Promise<void> {
    if (!this.client) {
      console.warn('Twilio not configured. OTP:', otp);
      // In development, just log the OTP instead of sending
      if (config.nodeEnv === 'development') {
        console.log(`📱 SMS OTP for ${mobile}: ${otp}`);
        return;
      }
      throw new Error('SMS service not configured');
    }

    try {
      await this.client.messages.create({
        body: `Your Mission Blue verification code is: ${otp}. Valid for ${config.otp.expiryMinutes} minutes.`,
        from: config.twilio.phoneNumber,
        to: mobile,
      });
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw new Error('Failed to send OTP SMS');
    }
  }

  /**
   * Check if SMS service is configured
   */
  isConfigured(): boolean {
    return this.client !== null;
  }
}

export default new SMSService();
