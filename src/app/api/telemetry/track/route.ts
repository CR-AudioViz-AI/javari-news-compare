// CR AudioViz AI - Telemetry Tracking API
// POST /api/telemetry/track

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient, getCurrentUser } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/utils';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const trackEventSchema = z.object({
  session_id: z.string().min(1),
  event_type: z.string().min(1),
  event_data: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, event_type, event_data } = trackEventSchema.parse(body);

    const user = await getCurrentUser();
    const supabase = createServiceRoleClient();

    // Get org_id if user is authenticated
    let orgId: string | null = null;
    if (user) {
      const { data: membership } = (await supabase
        .from('news_org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single()) as { data: { org_id: string } | null; error: any };

      orgId = membership?.org_id || null;
    }

    // Insert event - type assertion for tables not yet in generated types
    const { error } = await (supabase
      .from('news_telemetry_events') as any)
      .insert({
        org_id: orgId,
        user_id: user?.id || null,
        session_id,
        event_type,
        event_data: event_data || {},
      });

    if (error) {
      console.error('Error inserting telemetry event:', error);
      return errorResponse('Failed to track event', 'TRACKING_ERROR', { error: error.message }, 500);
    }

    return successResponse({ tracked: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request data', 'VALIDATION_ERROR', { errors: error.errors });
    }

    console.error('Telemetry tracking error:', error);
    return errorResponse('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

