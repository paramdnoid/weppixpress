import { getUsers, makeAdmin, removeAdmin, updateUserRoleController } from '../controllers/adminController.js';
import authenticateToken, { requireAdmin } from '../middleware/authenticate.js';
import validateRequest from '../../shared/validation/validateRequest.js';
import express from 'express';
import { body } from 'express-validator';

const router = express.Router();

// Validation schemas
const updateRoleSchema = [
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('role').isIn(['user', 'admin']).withMessage('Role must be either "user" or "admin"')
];

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *                       isVerified:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 */
router.get('/users', authenticateToken, requireAdmin, getUsers);

/**
 * @swagger
 * /api/admin/users/role:
 *   put:
 *     summary: Update user role (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       200:
 *         description: User role updated successfully
 */
router.put('/users/role', authenticateToken, requireAdmin, validateRequest(updateRoleSchema), updateUserRoleController);

/**
 * @swagger
 * /api/admin/users/{userId}/make-admin:
 *   post:
 *     summary: Grant admin privileges to user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Admin privileges granted successfully
 */
router.post('/users/:userId/make-admin', authenticateToken, requireAdmin, makeAdmin);

/**
 * @swagger
 * /api/admin/users/{userId}/remove-admin:
 *   post:
 *     summary: Remove admin privileges from user
 *     tags: [Admin]  
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Admin privileges removed successfully
 */
router.post('/users/:userId/remove-admin', authenticateToken, requireAdmin, removeAdmin);

export default router;