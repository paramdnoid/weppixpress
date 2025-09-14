import { getAllUsers, getUserById, updateUserRole } from '../models/userModel.js';
import logger from '../utils/logger.js';
import { sendValidationError, sendNotFoundError, handleValidationErrors } from '../utils/httpResponses.js';
import { validateRole } from '../utils/commonValidation.js';
import { validationResult } from 'express-validator';

/**
 * Get all users (admin only)
 */
export async function getUsers(req, res, next) {
  try {
    const users = await getAllUsers();
    res.json({
      users: users.map(user => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`.trim(),
        email: user.email,
        role: user.role || 'user',
        isVerified: user.is_verified,
        createdAt: user.created_at
      }))
    });
  } catch (err) {
    logger.error('Get users error', { action: 'get_users', adminId: req.user.userId, error: err.message });
    next(err);
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRoleController(req, res, next) {
  if (handleValidationErrors(validationResult(req), res)) {
    return;
  }

  try {
    const { userId, role } = req.body;

    // Validate role
    const roleValidation = validateRole(role);
    if (!roleValidation.isValid) {
      return sendValidationError(res, roleValidation.error);
    }

    // Check if user exists
    const user = await getUserById(userId);
    if (!user) {
      return sendNotFoundError(res, 'User not found');
    }

    // Prevent admin from demoting themselves
    if (req.user.userId === userId && role === 'user') {
      return sendValidationError(res, 'You cannot remove your own admin privileges');
    }

    await updateUserRole(userId, role);

    logger.userActivity('role_updated', req.user.userId, {
      targetUserId: userId,
      targetUserEmail: user.email,
      oldRole: user.role || 'user',
      newRole: role
    });

    res.json({ 
      message: `User role updated to ${role} successfully`,
      user: {
        id: user.id,
        email: user.email,
        role: role
      }
    });
  } catch (err) {
    logger.error(err, { 
      action: 'update_user_role', 
      adminId: req.user.userId,
      targetUserId: req.body.userId 
    });
    next(err);
  }
}

/**
 * Make user admin (convenience endpoint)
 */
export async function makeAdmin(req, res, next) {
  try {
    const { userId } = req.params;

    const user = await getUserById(userId);
    if (!user) {
      return sendNotFoundError(res, 'User not found');
    }

    if (user.role === 'admin') {
      return sendValidationError(res, 'User is already an admin');
    }

    await updateUserRole(userId, 'admin');

    logger.userActivity('admin_granted', req.user.userId, {
      targetUserId: userId,
      targetUserEmail: user.email
    });

    res.json({ 
      message: `${user.email} has been granted admin privileges`,
      user: {
        id: user.id,
        email: user.email,
        role: 'admin'
      }
    });
  } catch (err) {
    logger.error(err, { 
      action: 'make_admin', 
      adminId: req.user.userId,
      targetUserId: req.params.userId 
    });
    next(err);
  }
}

/**
 * Remove admin privileges (convenience endpoint)  
 */
export async function removeAdmin(req, res, next) {
  try {
    const { userId } = req.params;

    // Prevent admin from removing their own privileges
    if (req.user.userId === userId) {
      return sendValidationError(res, 'You cannot remove your own admin privileges');
    }

    const user = await getUserById(userId);
    if (!user) {
      return sendNotFoundError(res, 'User not found');
    }

    if (user.role !== 'admin') {
      return sendValidationError(res, 'User is not an admin');
    }

    await updateUserRole(userId, 'user');

    logger.userActivity('admin_revoked', req.user.userId, {
      targetUserId: userId,
      targetUserEmail: user.email
    });

    res.json({ 
      message: `Admin privileges removed from ${user.email}`,
      user: {
        id: user.id,
        email: user.email,
        role: 'user'
      }
    });
  } catch (err) {
    logger.error(err, { 
      action: 'remove_admin', 
      adminId: req.user.userId,
      targetUserId: req.params.userId 
    });
    next(err);
  }
}