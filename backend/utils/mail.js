/**
 * @fileoverview Mail utility module for sending verification and password reset emails.
 * Provides functions to generate email HTML content from templates and send emails via SMTP.
 * Handles environment configuration, SMTP transporter setup, and template reading with error handling.
 */

import { dirname } from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
import dotenv from 'dotenv';
dotenv.config({ quiet: true })
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createTransport } from 'nodemailer';

// Ensure required environment variables are present
const requiredEnv = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
for (const envVar of requiredEnv) {
  if (!process.env[envVar]) {
    throw new Error(`[Mail] Missing required environment variable: ${envVar}`);
  }
}

const transporter = createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('[Mail] SMTP connection failed:', error);
  } else {
    console.log('[Mail] SMTP server is ready to send messages');
  }
});

/**
 * Generates the HTML content for the verification email by reading the template file.
 * Replaces the placeholder with the verification URL containing the token.
 * @param {string} token - The verification token to include in the URL.
 * @returns {string} The HTML content of the verification email.
 * @throws Will throw an error if the template file cannot be read.
 */
function generateVerificationEmailHtml(token) {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  const filePath = resolve(__dirname, 'email-templates/verify.html');
  try {
    return readFileSync(filePath, 'utf8').replace('{{VERIFY_URL}}', verifyUrl);
  } catch (err) {
    console.error(`[Mail] Error reading verification email template: ${err.message}`);
    throw err;
  }
}

/**
 * Sends a verification email to the specified email address with the provided token.
 * @param {string} email - The recipient's email address.
 * @param {string} token - The verification token to include in the email.
 * @returns {Promise<void>} A promise that resolves when the email is sent.
 * @throws Will throw an error if sending the email fails.
 */
async function sendVerificationEmail(email, token) {
  try {
    await transporter.sendMail({
      from: '"weppiXPRESS" <noreply@weppixpress.com>',
      to: email,
      subject: 'Verify your email',
      html: generateVerificationEmailHtml(token)
    });
  } catch (error) {
    console.error(`[Mail] Failed to send verification email to ${email}:`, error);
    throw error;
  }
}

/**
 * Generates the HTML content for the password reset email by reading the template file.
 * Replaces the placeholder with the password reset URL containing the token.
 * @param {string} token - The password reset token to include in the URL.
 * @returns {string} The HTML content of the password reset email.
 * @throws Will throw an error if the template file cannot be read.
 */
function generatePasswordResetHtml(token) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  const filePath = resolve(__dirname, 'email-templates/reset.html');
  try {
    return readFileSync(filePath, 'utf8').replace('{{RESET_URL}}', resetUrl);
  } catch (err) {
    console.error(`[Mail] Error reading password reset email template: ${err.message}`);
    throw err;
  }
}

/**
 * Sends a password reset email to the specified email address with the provided token.
 * @param {string} email - The recipient's email address.
 * @param {string} token - The password reset token to include in the email.
 * @returns {Promise<void>} A promise that resolves when the email is sent.
 * @throws Will throw an error if sending the email fails.
 */
async function sendPasswordResetEmail(email, token) {
  try {
    await transporter.sendMail({
      from: '"weppiXPRESS" <noreply@weppixpress.com>',
      to: email,
      subject: 'Passwort zurücksetzen',
      html: generatePasswordResetHtml(token)
    });
  } catch (error) {
    console.error(`[Mail] Failed to send password reset email to ${email}:`, error);
    throw error;
  }
}

export default {
  sendVerificationEmail,
  generateVerificationEmailHtml,
  sendPasswordResetEmail,
  generatePasswordResetHtml
};

/* End of mail.js - Mail utility module */