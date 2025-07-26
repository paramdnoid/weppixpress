import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import {
  register, login, verifyEmail, forgotPassword, resetPassword,
  setup2FA, enable2FAController, disable2FAController, verify2FA,
  refreshToken, logout
} from './controllers/authController.js';
import authenticate from './middleware/authenticate.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.post('/api/auth/register', register);
app.get('/api/auth/verify-email', verifyEmail);
app.post('/api/auth/login', login);
app.post('/api/auth/verify-2fa', verify2FA);

app.post('/api/auth/forgot-password', forgotPassword);
app.post('/api/auth/reset-password', resetPassword);

app.post('/api/auth/refresh', refreshToken);
app.post('/api/auth/logout', logout);

// 2FA Management
app.post('/api/auth/setup-2fa', authenticate, setup2FA);
app.post('/api/auth/enable-2fa', authenticate, enable2FAController);
app.post('/api/auth/disable-2fa', authenticate, disable2FAController);

// Geschützte Beispielroute
app.get('/api/files', authenticate, (req, res) => {
  res.json({ message: `Hallo User ${req.user.userId}` });
});

app.listen(process.env.PORT, () => console.log('Backend ready on port ' + process.env.PORT));