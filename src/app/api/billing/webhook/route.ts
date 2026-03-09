// CR AudioViz AI - Stripe Webhook Handler
// POST /api/billing/webhook

import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { verifyWebhookSignature } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/utils';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return errorResponse('Missing stripe-signature header', 'MISSING_SIGNATURE', undefined, 400);
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = verifyWebhookSignature(body, signature);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return errorResponse('Invalid signature', 'INVALID_SIGNATURE', undefined, 401);
    }

    const supabase = createServiceRoleClient();

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.subscription) {
          const orgId = session.metadata?.org_id;
          const planId = session.metadata?.plan_id;

          if (!orgId || !planId) {
            console.error('Missing metadata in checkout session');
            break;
          }

          // Create or update subscription
          const { error } = await (supabase
            .from('news_subscriptions') as any)
            .upsert({
              org_id: orgId,
              plan_id: planId,
              status: 'active',
              stripe_subscription_id: session.subscription as string,
              stripe_customer_id: session.customer as string,
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });

          if (error) {
            console.error('Error creating subscription:', error);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await (supabase
          .from('news_subscriptions') as any)
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error updating subscription:', error);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await (supabase
          .from('news_subscriptions') as any)
          .update({
            status: 'canceled',
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error canceling subscription:', error);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription) {
          // Extend subscription period
          const { error } = await (supabase
            .from('news_subscriptions') as any)
            .update({
              status: 'active',
              current_period_start: new Date(invoice.period_start * 1000).toISOString(),
              current_period_end: new Date(invoice.period_end * 1000).toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription as string);

          if (error) {
            console.error('Error updating subscription after payment:', error);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.subscription) {
          const { error } = await (supabase
            .from('news_subscriptions') as any)
            .update({
              status: 'past_due',
            })
            .eq('stripe_subscription_id', invoice.subscription as string);

          if (error) {
            console.error('Error marking subscription as past due:', error);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return successResponse({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return errorResponse('Webhook processing failed', 'WEBHOOK_ERROR', undefined, 500);
  }
}
