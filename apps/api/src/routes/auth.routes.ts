import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AppError, ERROR_RESPONSES } from '../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import * as authService from '../services/auth.service';

export const authRoutes = Router();

function handleValidation(req: Request, _res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('VALIDATION_ERROR', errors.array());
  }
  next();
}

// POST /auth/register
authRoutes.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('phone').optional().isMobilePhone('any'),
  ],
  handleValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /auth/verify-email
authRoutes.post(
  '/verify-email',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  ],
  handleValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.verifyEmail(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /auth/verify-phone
authRoutes.post(
  '/verify-phone',
  [
    body('phone').isMobilePhone('any'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  ],
  handleValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.verifyPhone(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /auth/login
authRoutes.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  handleValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /auth/refresh
authRoutes.post(
  '/refresh',
  [body('refreshToken').notEmpty()],
  handleValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.refreshTokens(req.body.refreshToken as string);
      res.json(tokens);
    } catch (err) {
      next(err);
    }
  },
);

// GET /auth/me
authRoutes.get(
  '/me',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.getMe((req as AuthenticatedRequest).user.userId);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  },
);
