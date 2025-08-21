import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const sendMail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    return transporter.sendMail({
      from: '"weppiXPRESS" <noreply@weppixpress.com>',
      to,
      subject,
      html
    });
  } catch (err) {
    console.error('Error sending email:', err);
    throw err;
  }
};