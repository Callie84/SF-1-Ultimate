// /apps/auth-service/src/routes/billing.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { prisma } from '../config/database';
import { authMiddleware } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

const router = Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY nicht konfiguriert');
  return new Stripe(key, { apiVersion: '2024-04-10' });
}

const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY || '',
  yearly: process.env.STRIPE_PRICE_ID_YEARLY || '',
};

const BASE_URL = process.env.FRONTEND_URL || 'https://seedfinderpro.de';

const auth = authMiddleware(false);

/**
 * POST /api/auth/billing/checkout
 * Erstellt eine Stripe Checkout Session
 * Body: { plan: 'monthly' | 'yearly' }
 */
router.post('/checkout', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stripe = getStripe();
    const userId = (req as any).user!.id;
    const { plan = 'monthly' } = req.body;

    const priceId = plan === 'yearly' ? PRICE_IDS.yearly : PRICE_IDS.monthly;
    if (!priceId) {
      return res.status(503).json({
        error: 'Stripe-Preise nicht konfiguriert. Bitte STRIPE_PRICE_ID_MONTHLY/.._YEARLY in .env setzen.',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

    if (user.subscriptionStatus === 'active' && user.premiumUntil && user.premiumUntil > new Date()) {
      return res.status(400).json({ error: 'Du hast bereits ein aktives Premium-Abo.' });
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.displayName || user.username || undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/premium`,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
    });

    res.json({ url: session.url });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/billing/portal
 * Erstellt eine Stripe Customer Portal Session (Abo verwalten / kündigen)
 */
router.post('/portal', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stripe = getStripe();
    const userId = (req as any).user!.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ error: 'Kein Stripe-Kundenkonto gefunden.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${BASE_URL}/settings/billing`,
    });

    res.json({ url: session.url });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/billing/status
 * Gibt den aktuellen Abo-Status zurück
 */
router.get('/status', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        premiumUntil: true,
        subscriptionStatus: true,
        stripePriceId: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

    const isPremium = user.premiumUntil ? user.premiumUntil > new Date() : false;
    const plan = user.stripePriceId === PRICE_IDS.yearly ? 'yearly' : 'monthly';

    res.json({
      isPremium,
      subscriptionStatus: user.subscriptionStatus || 'free',
      premiumUntil: user.premiumUntil,
      plan: isPremium ? plan : null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/billing/webhook
 * Stripe Webhook Handler — KEIN auth, braucht raw body
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error('[Billing] STRIPE_WEBHOOK_SECRET nicht konfiguriert');
    return res.status(500).json({ error: 'Webhook nicht konfiguriert' });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    const sig = req.headers['stripe-signature'] as string;
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    logger.warn('[Billing] Webhook Signatur ungültig:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  logger.info(`[Billing] Webhook Event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const stripe = getStripe();
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const userId = session.metadata?.userId || sub.metadata?.userId;
          if (!userId) break;

          const priceId = sub.items.data[0]?.price.id;
          const periodEnd = new Date(sub.current_period_end * 1000);

          await prisma.user.update({
            where: { id: userId },
            data: {
              role: 'PREMIUM',
              premiumUntil: periodEnd,
              stripeSubscriptionId: sub.id,
              stripePriceId: priceId,
              subscriptionStatus: 'active',
            },
          });
          logger.info(`[Billing] Premium aktiviert für User ${userId} bis ${periodEnd.toISOString()}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const stripe = getStripe();
          const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const userId = sub.metadata?.userId;
          if (!userId) break;

          const periodEnd = new Date(sub.current_period_end * 1000);
          await prisma.user.update({
            where: { id: userId },
            data: { premiumUntil: periodEnd, subscriptionStatus: 'active' },
          });
          logger.info(`[Billing] Premium verlängert für User ${userId} bis ${periodEnd.toISOString()}`);
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.paused': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await prisma.user.update({
          where: { id: userId },
          data: { role: 'USER', premiumUntil: null, subscriptionStatus: 'canceled' },
        });
        logger.info(`[Billing] Premium deaktiviert für User ${userId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        const isPastDue = sub.status === 'past_due';
        const periodEnd = new Date(sub.current_period_end * 1000);

        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: sub.status,
            premiumUntil: isPastDue ? new Date() : periodEnd,
            ...(isPastDue ? { role: 'USER' } : {}),
          },
        });
        break;
      }

      default:
        logger.debug(`[Billing] Unbehandelter Event-Typ: ${event.type}`);
    }
  } catch (err) {
    logger.error('[Billing] Fehler beim Verarbeiten des Webhooks:', err);
  }

  res.json({ received: true });
});

export default router;
