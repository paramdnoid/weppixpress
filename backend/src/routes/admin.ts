import {
  getUsers,
  makeAdmin,
  removeAdmin,
  updateUserRoleController,
  suspendUserAccount,
  reactivateUserAccount,
  deleteUserAccount,
  exportUsers,
  getDashboardOverview,
  getActivityLogs
} from '../controllers/adminController.js';
import authenticateToken, { requireAdmin } from '../middleware/authenticate.js';
import validateRequest from '../validators/validateRequest.js';
import express, { Router } from 'express';
import { body, ValidationChain } from 'express-validator';

const router: Router = express.Router();

// Validation schemas
const updateRoleSchema: ValidationChain[] = [
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

/**
 * @swagger
 * /api/admin/users/{userId}/suspend:
 *   post:
 *     summary: Suspend user account
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
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: User suspended successfully
 */
router.post('/users/:userId/suspend', authenticateToken, requireAdmin, suspendUserAccount);

/**
 * @swagger
 * /api/admin/users/{userId}/reactivate:
 *   post:
 *     summary: Reactivate suspended user account
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
 *         description: User reactivated successfully
 */
router.post('/users/:userId/reactivate', authenticateToken, requireAdmin, reactivateUserAccount);

/**
 * @swagger
 * /api/admin/users/{userId}/delete:
 *   delete:
 *     summary: Delete user account permanently
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               confirmDelete:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.delete('/users/:userId/delete', authenticateToken, requireAdmin, deleteUserAccount);

/**
 * @swagger
 * /api/admin/users/export:
 *   get:
 *     summary: Export users to CSV
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/users/export', authenticateToken, requireAdmin, exportUsers);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard overview
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview data
 */
router.get('/dashboard', authenticateToken, requireAdmin, getDashboardOverview);

/**
 * @swagger
 * /api/admin/activity-logs:
 *   get:
 *     summary: Get admin activity logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Activity logs
 */
router.get('/activity-logs', authenticateToken, requireAdmin, getActivityLogs);

export default router;