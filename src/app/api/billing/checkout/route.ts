// CR AudioViz AI - Billing Checkout API
// POST /api/billing/checkout

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createCheckoutSession } from '@/lib/stripe';
import { getCurrentUser, getUserOrg } from '@/lib/supabase';
import { successResponse, unauthorizedResponse, errorResponse, getBaseUrl } from '@/lib/utils';
import type { CheckoutResponse } from '@/types';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const checkoutSchema = z.object({
  plan_id: z.string().min(1),
  coupon_code: z.string().optional(),
  success_url: z.string().optional(),
  cancel_url: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const userOrg = await getUserOrg(user.id);
    if (!userOrg) {
      return errorResponse('Organization not found', 'ORG_NOT_FOUND', undefined, 404);
    }

    const body = await request.json();
    const { plan_id, coupon_code, success_url, cancel_url } = checkoutSchema.parse(body);

    // Get plan details from database
    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const supabase = await createServerSupabaseClient();

    const { data: plan, error: planError } = await supabase
      .from('news_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      return errorResponse('Plan not found', 'PLAN_NOT_FOUND', undefined, 404);
    }

    if (!plan.stripe_price_id) {
      return errorResponse('Plan does not have a Stripe price configured', 'INVALID_PLAN');
    }

    // Check for existing Stripe customer
    const { data: existingSubscription } = await supabase
      .from('news_subscriptions')
      .select('stripe_customer_id')
      .eq('org_id', userOrg.org_id)
      .single();

    const baseUrl = getBaseUrl();
    const defaultSuccessUrl = `${baseUrl}/billing?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${baseUrl}/billing`;

    // Create checkout session
    const session = await createCheckoutSession({
      priceId: plan.stripe_price_id,
      customerId: existingSubscription?.stripe_customer_id,
      customerEmail: user.email,
      metadata: {
        org_id: userOrg.org_id,
        plan_id: plan_id,
        user_id: user.id,
      },
      successUrl: success_url || defaultSuccessUrl,
      cancelUrl: cancel_url || defaultCancelUrl,
      couponCode: coupon_code,
    });

    const response: CheckoutResponse = {
      session_id: session.id,
      url: session.url!,
    };

    return successResponse(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 'VALIDATION_ERROR', { errors: error.errors });
    }

    console.error('Checkout API error:', error);
    return errorResponse('Failed to create checkout session', 'CHECKOUT_ERROR', undefined, 500);
  }
}
