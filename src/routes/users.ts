import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import bcrypt from 'bcrypt';

const router = Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        // Don't include password
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({
      success: true,
      data: users,
      total: users.length
    });
  } catch (error) {
    console.error('Error getting users:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new user (admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, fullName, role, password } = req.body;

    // Validate required fields
    if (!username || !email || !fullName || !role || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check for email conflicts
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Check for username conflicts
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        fullName,
        role: role.toUpperCase(),
        password: hashedPassword,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=52c41a&color=fff`,
        isActive: true
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        // Don't include password
      }
    });

    return res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { username, email, fullName, role, isActive } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check for email conflicts (exclude current user)
    if (email && email !== existingUser.email) {
      const emailConflict = await prisma.user.findFirst({
        where: {
          email,
          id: { not: userId }
        }
      });

      if (emailConflict) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Check for username conflicts (exclude current user)
    if (username && username !== existingUser.username) {
      const usernameConflict = await prisma.user.findFirst({
        where: {
          username,
          id: { not: userId }
        }
      });

      if (usernameConflict) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username: username || existingUser.username,
        email: email || existingUser.email,
        fullName: fullName || existingUser.fullName,
        role: role || existingUser.role,
        isActive: isActive !== undefined ? isActive : existingUser.isActive,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user!.id;

    // Prevent admin from deleting themselves
    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user and related data in transaction
    await prisma.$transaction([
      // Delete votes first
      prisma.postVote.deleteMany({
        where: { userId }
      }),
      prisma.commentVote.deleteMany({
        where: { userId }
      }),
      // Delete comments
      prisma.comment.deleteMany({
        where: { authorId: userId }
      }),
      // Delete posts
      prisma.post.deleteMany({
        where: { authorId: userId }
      }),
      // Finally delete user
      prisma.user.delete({
        where: { id: userId }
      })
    ]);

    return res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Toggle user status (admin only)
router.post('/:id/toggle-status', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user!.id;

    // Prevent admin from deactivating themselves
    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Toggle status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: !existingUser.isActive
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return res.json({
      success: true,
      data: updatedUser,
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset user password (admin only)
router.post('/:id/reset-password', authenticateToken, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword
      }
    });

    return res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
