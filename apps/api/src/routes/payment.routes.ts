import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { AppError } from '../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import * as interswitchService from '../services/interswitch.service';
import type { InitiatePaymentRequest } from '@axios-pay/types';

export const paymentRoutes = Router();

function handleValidation(req: Request, _res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('VALIDATION_ERROR', errors.array());
  }
  next();
}

const VALID_CURRENCIES = ['NGN', 'UGX', 'KES', 'GHS', 'ZAR'];

// POST /payments/initiate – initiate a deposit via Interswitch
paymentRoutes.post(
  '/initiate',
  authMiddleware,
  [
    body('currency').isIn(VALID_CURRENCIES).withMessage('Invalid currency'),
    body('amount')
      .isNumeric()
      .withMessage('Amount must be numeric')
      .custom((val: string) => parseFloat(val) > 0)
      .withMessage('Amount must be positive'),
    body('redirectUrl').isURL().withMessage('redirectUrl must be a valid URL'),
  ],
  handleValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currency, amount, redirectUrl } = req.body as InitiatePaymentRequest;
      const result = await interswitchService.initiatePayment({
        userId: (req as AuthenticatedRequest).user.userId,
        currency,
        amount,
        redirectUrl,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /payments/verify/:reference – verify a payment
paymentRoutes.get(
  '/verify/:reference',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await interswitchService.verifyPayment(req.params['reference'] as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /payments/webhook – Interswitch webhook handler
// Raw body needed for signature verification; mount before express.json() in production
paymentRoutes.post(
  '/webhook',
  express_raw_middleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['x-interswitch-signature'] as string | undefined;
      const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body);

      if (!signature) {
        res.status(400).json({ error: 'Missing signature' });
        return;
      }

      const isValid = interswitchService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      const event = req.body as {
        transactionReference?: string;
        responseCode?: string;
      };

      if (event.transactionReference && event.responseCode === '00') {
        await interswitchService.verifyPayment(event.transactionReference);
      }

      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  },
);

// Middleware to capture raw body for webhook signature verification
function express_raw_middleware(req: Request, _res: Response, next: NextFunction): void {
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    (req as Request & { rawBody?: string }).rawBody = Buffer.concat(chunks).toString('utf8');
    next();
  });
  req.on('error', next);
}
