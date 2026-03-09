// CR AudioViz AI - Analytics Summary API
// GET /api/telemetry/summary

import { NextRequest } from 'next/server';
import { createServerSupabaseClient, getCurrentUser, getUserOrg } from '@/lib/supabase';
import { successResponse, unauthorizedResponse, errorResponse } from '@/lib/utils';
import type { AnalyticsSummaryResponse } from '@/types';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }

    const userOrg = await getUserOrg(user.id);
    if (!userOrg) {
      return errorResponse('Organization not found', 'ORG_NOT_FOUND', undefined, 404);
    }

    const supabase = await createServerSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total events
    const { count: totalEvents } = await supabase
      .from('news_events')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', userOrg.org_id)
      .gte('created_at', startDate.toISOString());

    // Get unique users
    const { data: uniqueUsersData } = await supabase
      .from('news_events')
      .select('user_id')
      .eq('org_id', userOrg.org_id)
      .gte('created_at', startDate.toISOString())
      .not('user_id', 'is', null);

    const uniqueUsers = new Set(uniqueUsersData?.map((e) => e.user_id)).size;

    // Get top events
    const { data: topEventsData } = await supabase
      .from('news_events')
      .select('event_name')
      .eq('org_id', userOrg.org_id)
      .gte('created_at', startDate.toISOString());

    const eventCounts = topEventsData?.reduce((acc, e) => {
      acc[e.event_name] = (acc[e.event_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topEvents = Object.entries(eventCounts || {})
      .map(([event_name, count]) => ({ event_name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get funnel metrics
    const { count: saves } = await supabase
      .from('news_events')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', userOrg.org_id)
      .eq('event_name', 'group_save')
      .gte('created_at', startDate.toISOString());

    const { count: generates } = await supabase
      .from('news_events')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', userOrg.org_id)
      .eq('event_name', 'compose_generate')
      .gte('created_at', startDate.toISOString());

    const { count: publishes } = await supabase
      .from('news_events')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', userOrg.org_id)
      .eq('event_name', 'compose_publish')
      .gte('created_at', startDate.toISOString());

    const conversionRate = saves ? (publishes || 0) / saves : 0;

    const response: AnalyticsSummaryResponse = {
      total_events: totalEvents || 0,
      unique_users: uniqueUsers,
      top_events: topEvents,
      funnel: {
        saves: saves || 0,
        generates: generates || 0,
        publishes: publishes || 0,
        conversion_rate: conversionRate,
      },
    };

    return successResponse(response);
  } catch (error) {
    console.error('Analytics summary error:', error);
    return errorResponse('Failed to fetch analytics', 'ANALYTICS_ERROR', undefined, 500);
  }
}
