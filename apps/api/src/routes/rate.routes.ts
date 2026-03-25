import { Router, Request, Response, NextFunction } from 'express';
import { query, validationResult } from 'express-validator';
import { AppError } from '../middleware/error.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import * as rateService from '../services/rate.service';
import type { Currency } from '@axios-pay/types';

export const rateRoutes = Router();

function handleValidation(req: Request, _res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('VALIDATION_ERROR', errors.array());
  }
  next();
}

const VALID_CURRENCIES = ['NGN', 'UGX', 'KES', 'GHS', 'ZAR'];

// GET /rates – get all exchange rates
rateRoutes.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rates = await rateService.getAllRates();
      res.json({ rates });
    } catch (err) {
      next(err);
    }
  },
);

// GET /rates/:from/:to – get specific exchange rate
rateRoutes.get(
  '/:from/:to',
  [
    query('from').optional(),
    query('to').optional(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const from = req.params['from']?.toUpperCase();
      const to = req.params['to']?.toUpperCase();

      if (!VALID_CURRENCIES.includes(from ?? '') || !VALID_CURRENCIES.includes(to ?? '')) {
        throw new AppError('VALIDATION_ERROR', 'Invalid currency code');
      }

      const rate = await rateService.getExchangeRate(from as Currency, to as Currency);
      res.json({ rate });
    } catch (err) {
      next(err);
    }
  },
);

// POST /rates/update – admin endpoint to refresh rates
// In production, this would be triggered by a cron job
rateRoutes.post(
  '/update',
  authMiddleware,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await rateService.updateRates();
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);
