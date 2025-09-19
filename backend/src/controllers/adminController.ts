import type { Request, Response, NextFunction } from 'express';
import { getAllUsers, getUserById, updateUserRole, suspendUser, reactivateUser, deleteUser, getUsersWithLastActivity } from '../models/userModel.js';
import logger from '../utils/logger.js';
import { sendValidationError, sendNotFoundError, handleValidationErrors, sendForbiddenError } from '../utils/httpResponses.js';
import { validateRole } from '../utils/commonValidation.js';
import { validationResult } from 'express-validator';
import { parse } from 'json2csv';
import monitoringService from '../services/monitoringService.js';
import errorMetricsService from '../services/errorMetricsService.js';
import adminWebSocketService from '../services/adminWebSocketService.js';

// Extend Request interface
interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * Get all users (admin only)
 */
export async function getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const users = await getUsersWithLastActivity();
    res.json({
      users: users.map((user: any) => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`.trim(),
        email: user.email,
        role: user.role || 'user',
        isVerified: user.is_verified,
        isSuspended: user.is_suspended,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        activityStatus: user.activity_status,
        minutesSinceLogin: user.minutes_since_login
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
export async function updateUserRoleController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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

    logger.info('User role updated', {
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
export async function makeAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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

    logger.info('Admin privileges granted', {
      targetUserId: userId,
      targetUserEmail: user.email
    });

    // Broadcast user action to admin clients
    adminWebSocketService.broadcastUserAction('admin_granted', {
      userId,
      userEmail: user.email,
      adminId: req.user.userId
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
export async function removeAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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

    logger.info('Admin privileges revoked', {
      targetUserId: userId,
      targetUserEmail: user.email
    });

    // Broadcast user action to admin clients
    adminWebSocketService.broadcastUserAction('admin_revoked', {
      userId,
      userEmail: user.email,
      adminId: req.user.userId
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

/**
 * Suspend user account
 */
export async function suspendUserAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    // Prevent admin from suspending themselves
    if (req.user.userId === userId) {
      return sendValidationError(res, 'You cannot suspend your own account');
    }

    const user = await getUserById(userId);
    if (!user) {
      return sendNotFoundError(res, 'User not found');
    }

    if (user.is_suspended) {
      return sendValidationError(res, 'User is already suspended');
    }

    await suspendUser(userId, reason || 'Administrative action');

    logger.info('User suspended', {
      targetUserId: userId,
      targetUserEmail: user.email,
      reason: reason || 'Administrative action'
    });

    // Broadcast user action to admin clients
    adminWebSocketService.broadcastUserAction('user_suspended', {
      userId,
      userEmail: user.email,
      reason: reason || 'Administrative action',
      adminId: req.user.userId
    });

    res.json({
      message: `User ${user.email} has been suspended`,
      user: {
        id: user.id,
        email: user.email,
        suspended: true
      }
    });
  } catch (err) {
    logger.error(err, {
      action: 'suspend_user',
      adminId: req.user.userId,
      targetUserId: req.params.userId
    });
    next(err);
  }
}

/**
 * Reactivate suspended user account
 */
export async function reactivateUserAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;

    const user = await getUserById(userId);
    if (!user) {
      return sendNotFoundError(res, 'User not found');
    }

    if (!user.is_suspended) {
      return sendValidationError(res, 'User is not suspended');
    }

    await reactivateUser(userId);

    logger.info('User reactivated', {
      targetUserId: userId,
      targetUserEmail: user.email
    });

    // Broadcast user action to admin clients
    adminWebSocketService.broadcastUserAction('user_reactivated', {
      userId,
      userEmail: user.email,
      adminId: req.user.userId
    });

    res.json({
      message: `User ${user.email} has been reactivated`,
      user: {
        id: user.id,
        email: user.email,
        suspended: false
      }
    });
  } catch (err) {
    logger.error(err, {
      action: 'reactivate_user',
      adminId: req.user.userId,
      targetUserId: req.params.userId
    });
    next(err);
  }
}

/**
 * Delete user account permanently
 */
export async function deleteUserAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const { confirmDelete } = req.body;

    if (!confirmDelete) {
      return sendValidationError(res, 'Deletion confirmation is required');
    }

    // Prevent admin from deleting themselves
    if (req.user.userId === userId) {
      return sendValidationError(res, 'You cannot delete your own account');
    }

    const user = await getUserById(userId);
    if (!user) {
      return sendNotFoundError(res, 'User not found');
    }

    // Additional protection for admin accounts
    if (user.role === 'admin') {
      return sendForbiddenError(res, 'Cannot delete admin accounts. Remove admin privileges first.');
    }

    await deleteUser(userId);

    logger.info('User deleted', {
      targetUserId: userId,
      targetUserEmail: user.email
    });

    // Broadcast user action to admin clients
    adminWebSocketService.broadcastUserAction('user_deleted', {
      userId,
      userEmail: user.email,
      adminId: req.user.userId
    });

    res.json({
      message: `User ${user.email} has been permanently deleted`
    });
  } catch (err) {
    logger.error(err, {
      action: 'delete_user',
      adminId: req.user.userId,
      targetUserId: req.params.userId
    });
    next(err);
  }
}

/**
 * Export users to CSV
 */
export async function exportUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const users = await getAllUsers();

    const exportData = users.map(user => ({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`.trim(),
      email: user.email,
      role: user.role || 'user',
      verified: user.is_verified ? 'Yes' : 'No',
      suspended: user.is_suspended ? 'Yes' : 'No',
      created_at: new Date(user.created_at).toISOString(),
      last_login: user.last_login_at ? new Date(user.last_login_at).toISOString() : 'Never'
    }));

    const fields = [
      { label: 'User ID', value: 'id' },
      { label: 'Name', value: 'name' },
      { label: 'Email', value: 'email' },
      { label: 'Role', value: 'role' },
      { label: 'Verified', value: 'verified' },
      { label: 'Suspended', value: 'suspended' },
      { label: 'Created At', value: 'created_at' },
      { label: 'Last Login', value: 'last_login' }
    ];

    const csv = parse(exportData, { fields });
    const filename = `users-export-${new Date().toISOString().split('T')[0]}.csv`;

    logger.info('Users exported', {
      userCount: users.length,
      filename
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    logger.error(err, {
      action: 'export_users',
      adminId: req.user.userId
    });
    next(err);
  }
}

/**
 * Get admin dashboard overview
 */
export async function getDashboardOverview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const [healthStatus, errorMetrics, users] = await Promise.all([
      monitoringService.getHealthStatus(),
      errorMetricsService.getMetrics(3600000), // Last hour
      getAllUsers()
    ]);

    const userStats = {
      total: users.length,
      admins: users.filter(u => u.role === 'admin').length,
      verified: users.filter(u => u.is_verified).length,
      suspended: users.filter(u => u.is_suspended).length,
      recentRegistrations: users.filter(u => {
        const createdAt = new Date(u.created_at);
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return createdAt > dayAgo;
      }).length
    };

    const overview = {
      timestamp: Date.now(),
      system: {
        status: healthStatus.status,
        uptime: healthStatus.uptime,
        memory: healthStatus.metrics.memory,
        cpu: healthStatus.metrics.cpu,
        version: healthStatus.version
      },
      users: userStats,
      errors: {
        total: errorMetrics.summary.totalErrors,
        critical: errorMetrics.summary.criticalErrors,
        operational: errorMetrics.summary.operationalErrors,
        trends: errorMetrics.trends,
        topErrors: errorMetrics.topErrors.slice(0, 5)
      },
      requests: {
        total: healthStatus.metrics.requests.total,
        errors: healthStatus.metrics.requests.errors,
        error_rate: parseFloat(healthStatus.metrics.requests.error_rate),
        avg_response_time: healthStatus.metrics.requests.avg_response_time,
        requests_per_minute: healthStatus.metrics.requests.requests_per_minute
      },
      alerts: healthStatus.alerts,
      database: healthStatus.metrics.database,
      cache: healthStatus.metrics.cache
    };

    res.json(overview);
  } catch (err) {
    logger.error('Dashboard overview error:', err);
    next(err);
  }
}

/**
 * Get admin activity logs
 */
export async function getActivityLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { limit = 50, offset = 0, type } = req.query;

    // This would typically come from a database query
    // For now, return mock data that represents the structure
    const logs = [
      {
        id: '1',
        timestamp: Date.now() - 300000,
        action: 'user_role_updated',
        adminId: req.user.userId,
        adminEmail: req.user.email,
        targetUserId: 'user123',
        targetEmail: 'user@example.com',
        details: { oldRole: 'user', newRole: 'admin' },
        ip: req.ip
      }
    ];

    res.json({
      logs,
      pagination: {
        total: logs.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: false
      }
    });
  } catch (err) {
    logger.error(err, {
      action: 'get_activity_logs',
      adminId: req.user.userId
    });
    next(err);
  }
}