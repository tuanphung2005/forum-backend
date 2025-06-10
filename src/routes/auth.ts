import express from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../config/database';
import { mapUserToResponse, mapToUserRole } from '../utils/mappers';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';
import { LoginRequest, RegisterRequest, ApiResponse, AuthResponse } from '../types/api';

const router = express.Router();

// Login
router.post('/login', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
      return;
    }    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the administrator for assistance.'
      });
      return;
    }const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as SignOptions
    );

    const response: ApiResponse<AuthResponse> = {
      success: true,
      message: 'Login successful',
      data: {
        user: mapUserToResponse(user),
        token
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Register
router.post('/register', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { username, email, password, fullName, role = 'student' }: RegisterRequest = req.body;

    if (!username || !email || !password || !fullName) {
      res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
      return;
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'User with this email or username already exists'
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        fullName,
        role: mapToUserRole(role),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=52c41a&color=fff`
      }
    });    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as SignOptions
    );

    const response: ApiResponse<AuthResponse> = {
      success: true,
      message: 'Registration successful',
      data: {
        user: mapUserToResponse(user),
        token
      }
    };    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res: express.Response): Promise<void> => {
  try {
    const response: ApiResponse = {
      success: true,
      message: 'User retrieved successfully',
      data: req.user
    };

    res.json(response);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
