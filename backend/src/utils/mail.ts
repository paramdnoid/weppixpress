import * as dotenv from 'dotenv';
import * as nodemailer from 'nodemailer';
import logger from './logger.js';

dotenv.config();

const sendMail = async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: {
        rejectUnauthorized: false
      }
    });
    return transporter.sendMail({
      from: '"weppiXPRESS" <noreply@weppixpress.com>',
      to,
      subject,
      html
    });
  } catch (err) {
    logger.error('Error sending email:', err);
    throw err;
  }
};
export default sendMail;