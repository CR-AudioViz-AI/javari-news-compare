// CR AudioViz AI - Compare News API
// GET /api/compare

import { NextRequest } from 'next/server';
import { createServerSupabaseClient, getCurrentUser, getUserOrg, checkAndConsumeQuota } from '@/lib/supabase';
import { successResponse, unauthorizedResponse, quotaExceededResponse, errorResponse } from '@/lib/utils';
import type { CompareResponse, NewsGroupWithArticles } from '@/types';

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

    // Check quota
    const quotaCheck = await checkAndConsumeQuota(userOrg.org_id, 'reads', 1);
    if (!quotaCheck.allowed) {
      return quotaExceededResponse('reads', quotaCheck.current, quotaCheck.limit);
    }

    const supabase = await createServerSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const savedOnly = searchParams.get('saved_only') === 'true';
    const hideArchived = searchParams.get('hide_archived') === 'true';

    // Fetch groups for the date
    let groupsQuery = supabase
      .from('news_groups')
      .select('*')
      .eq('date', date)
      .eq('country_code', 'US')
      .order('created_at', { ascending: false });

    const { data: groups, error: groupsError } = await groupsQuery;

    if (groupsError) {
      console.error('Error fetching groups:', groupsError);
      return errorResponse('Failed to fetch news groups', 'FETCH_ERROR', { error: groupsError.message }, 500);
    }

    if (!groups || groups.length === 0) {
      return successResponse<CompareResponse>({
        date,
        groups: [],
        summary: {
          total_groups: 0,
          conservative_count: 0,
          liberal_count: 0,
          neutral_count: 0,
        },
      });
    }

    // Get user's saved/archived status for these groups
    const { data: statuses } = await supabase
      .from('news_group_status')
      .select('*')
      .eq('user_id', user.id)
      .in('group_id', groups.map((g) => g.id));

    const statusMap = new Map(statuses?.map((s) => [s.group_id, s]) || []);

    // Fetch articles for each group
    const groupsWithArticles: NewsGroupWithArticles[] = [];

    for (const group of groups) {
      const status = statusMap.get(group.id);

      // Apply filters
      if (savedOnly && !status?.saved) continue;
      if (hideArchived && status?.archived) continue;

      const { data: articles } = await supabase
        .from('news_articles')
        .select('*, news_sources(*)')
        .eq('group_id', group.id);

      const conservative = articles?.filter((a) => a.ideology === 'conservative') || [];
      const liberal = articles?.filter((a) => a.ideology === 'liberal') || [];
      const neutral = articles?.filter((a) => a.ideology === 'neutral') || [];

      groupsWithArticles.push({
        ...group,
        conservative_articles: conservative.map((a) => ({
          ...a,
          source: a.news_sources,
        })),
        liberal_articles: liberal.map((a) => ({
          ...a,
          source: a.news_sources,
        })),
        neutral_articles: neutral.map((a) => ({
          ...a,
          source: a.news_sources,
        })),
        status: status || undefined,
      });
    }

    // Calculate summary
    const allArticles = groupsWithArticles.flatMap((g) => [
      ...g.conservative_articles,
      ...g.liberal_articles,
      ...g.neutral_articles,
    ]);

    const summary = {
      total_groups: groupsWithArticles.length,
      conservative_count: allArticles.filter((a) => a.ideology === 'conservative').length,
      liberal_count: allArticles.filter((a) => a.ideology === 'liberal').length,
      neutral_count: allArticles.filter((a) => a.ideology === 'neutral').length,
    };

    const response: CompareResponse = {
      date,
      groups: groupsWithArticles,
      summary,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Compare API error:', error);
    return errorResponse('Failed to fetch comparison data', 'COMPARE_ERROR', undefined, 500);
  }
}
