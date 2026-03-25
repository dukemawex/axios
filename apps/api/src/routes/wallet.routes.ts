import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { AppError } from '../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import * as walletService from '../services/wallet.service';
import type { SwapRequest } from '@axios-pay/types';

export const walletRoutes = Router();

function handleValidation(req: Request, _res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('VALIDATION_ERROR', errors.array());
  }
  next();
}

const VALID_CURRENCIES = ['NGN', 'UGX', 'KES', 'GHS', 'ZAR'];

// GET /wallets – list all wallets for authenticated user
walletRoutes.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wallets = await walletService.getWallets((req as AuthenticatedRequest).user.userId);
      res.json({ wallets });
    } catch (err) {
      next(err);
    }
  },
);

// GET /wallets/transactions – paginated transaction history
walletRoutes.get(
  '/transactions',
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  handleValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = (req.query['page'] as unknown as number | undefined) ?? 1;
      const pageSize = (req.query['pageSize'] as unknown as number | undefined) ?? 20;
      const result = await walletService.getTransactions(
        (req as AuthenticatedRequest).user.userId,
        page,
        pageSize,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /wallets/swap – execute a currency swap
walletRoutes.post(
  '/swap',
  authMiddleware,
  [
    body('fromCurrency').isIn(VALID_CURRENCIES).withMessage('Invalid fromCurrency'),
    body('toCurrency').isIn(VALID_CURRENCIES).withMessage('Invalid toCurrency'),
    body('fromAmount')
      .isNumeric()
      .withMessage('fromAmount must be numeric')
      .custom((val: string) => parseFloat(val) > 0)
      .withMessage('fromAmount must be positive'),
  ],
  handleValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await walletService.executeSwap(
        (req as AuthenticatedRequest).user.userId,
        req.body as SwapRequest,
      );
      res.status(201).json({ transaction });
    } catch (err) {
      next(err);
    }
  },
);

// GET /wallets/swap/quote – get a swap quote (no funds moved)
walletRoutes.get(
  '/swap/quote',
  authMiddleware,
  [
    query('fromCurrency').isIn(VALID_CURRENCIES),
    query('toCurrency').isIn(VALID_CURRENCIES),
    query('fromAmount').isNumeric().custom((val: string) => parseFloat(val) > 0),
  ],
  handleValidation,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quote = await walletService.getSwapQuote({
        fromCurrency: req.query['fromCurrency'] as SwapRequest['fromCurrency'],
        toCurrency: req.query['toCurrency'] as SwapRequest['toCurrency'],
        fromAmount: req.query['fromAmount'] as string,
      });
      res.json({ quote });
    } catch (err) {
      next(err);
    }
  },
);
