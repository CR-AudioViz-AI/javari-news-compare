// CR AudioViz AI - JavariAI News Feed API
// GET /api/javari/news-feed
// Exports structured news data for JavariAI to learn from

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/utils';
import type { JavariNewsFeedItem } from '@/types';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!startDate || !endDate) {
      return errorResponse('Missing required parameters: start_date and end_date', 'MISSING_PARAMS');
    }

    const supabase = await createServerSupabaseClient();

    // Fetch groups in date range
    const { data: groups, error: groupsError } = await supabase
      .from('news_groups')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .limit(limit);

    if (groupsError) {
      console.error('Error fetching groups:', groupsError);
      return errorResponse('Failed to fetch news groups', 'FETCH_ERROR', undefined, 500);
    }

    if (!groups || groups.length === 0) {
      return successResponse<JavariNewsFeedItem[]>([]);
    }

    // Fetch articles for each group
    const feedItems: JavariNewsFeedItem[] = [];

    for (const group of groups) {
      const { data: articles } = await supabase
        .from('news_articles')
        .select('*, news_sources(*)')
        .eq('group_id', group.id);

      if (!articles || articles.length === 0) continue;

      feedItems.push({
        group_id: group.id,
        date: group.date,
        title: group.title,
        keywords: group.keywords || [],
        articles: articles.map((article) => ({
          id: article.id,
          source_name: article.news_sources.name,
          ideology: article.ideology || 'neutral',
          title: article.title,
          url: article.url,
          excerpt: article.excerpt || '',
          sentiment_score: article.sentiment_score || 0,
          published_at: article.published_at || article.created_at,
        })),
      });
    }

    return successResponse(feedItems);
  } catch (error) {
    console.error('JavariAI news feed error:', error);
    return errorResponse('Failed to generate news feed', 'FEED_ERROR', undefined, 500);
  }
}
