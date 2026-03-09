// CR AudioViz AI - JavariAI Pattern Detection API
// GET /api/javari/patterns
// Analyzes news patterns for Roy & Cindy's learning dashboard

import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { successResponse, errorResponse } from '@/lib/utils';
import type { JavariPatternInsight } from '@/types';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return errorResponse('Missing required parameters: start_date and end_date', 'MISSING_PARAMS');
    }

    const supabase = createServiceRoleClient();

    // Call the database function to get pattern data
    // Type assertion needed for custom RPC functions
    const { data: patternData, error } = (await supabase.rpc('get_news_patterns', {
      p_start_date: startDate,
      p_end_date: endDate,
    } as any)) as { data: any[] | null; error: any };

    if (error) {
      console.error('Error fetching patterns:', error);
      return errorResponse('Failed to fetch pattern data', 'PATTERN_ERROR', undefined, 500);
    }

    const patterns: JavariPatternInsight[] = [];

    // Analyze sentiment divergence
    for (const row of patternData || []) {
      if (row.avg_conservative_sentiment && row.avg_liberal_sentiment) {
        const sentimentDiff = Math.abs(
          row.avg_conservative_sentiment - row.avg_liberal_sentiment
        );

        if (sentimentDiff > 0.3) {
          patterns.push({
            pattern_type: 'sentiment',
            description: `Significant sentiment divergence detected on ${row.date}: Conservative sources show ${row.avg_conservative_sentiment > row.avg_liberal_sentiment ? 'more positive' : 'more negative'} sentiment`,
            confidence: Math.min(sentimentDiff * 2, 1.0),
            evidence: {
              group_ids: [],
              date_range: [row.date, row.date],
              affected_sources: [],
            },
            metadata: {
              conservative_sentiment: row.avg_conservative_sentiment,
              liberal_sentiment: row.avg_liberal_sentiment,
              difference: sentimentDiff,
            },
          });
        }
      }

      // Analyze coverage imbalance
      const totalArticles =
        row.conservative_articles + row.liberal_articles + row.neutral_articles;
      
      if (totalArticles > 0) {
        const conservativeRatio = row.conservative_articles / totalArticles;
        const liberalRatio = row.liberal_articles / totalArticles;
        const imbalance = Math.abs(conservativeRatio - liberalRatio);

        if (imbalance > 0.4) {
          patterns.push({
            pattern_type: 'coverage',
            description: `Coverage imbalance on ${row.date}: ${conservativeRatio > liberalRatio ? 'Conservative' : 'Liberal'} sources published significantly more articles`,
            confidence: Math.min(imbalance * 1.5, 1.0),
            evidence: {
              group_ids: [],
              date_range: [row.date, row.date],
              affected_sources: [],
            },
            metadata: {
              conservative_count: row.conservative_articles,
              liberal_count: row.liberal_articles,
              neutral_count: row.neutral_articles,
              imbalance_ratio: imbalance,
            },
          });
        }
      }

      // Analyze keyword patterns
      if (row.top_keywords && row.top_keywords.length > 0) {
        const uniqueKeywords = [...new Set(row.top_keywords)];
        
        if (uniqueKeywords.length >= 3) {
          patterns.push({
            pattern_type: 'bias',
            description: `Common themes on ${row.date}: ${uniqueKeywords.slice(0, 5).join(', ')}`,
            confidence: 0.7,
            evidence: {
              group_ids: [],
              date_range: [row.date, row.date],
              affected_sources: [],
            },
            metadata: {
              keywords: uniqueKeywords,
              total_groups: row.total_groups,
            },
          });
        }
      }
    }

    // Sort by confidence
    patterns.sort((a, b) => b.confidence - a.confidence);

    return successResponse(patterns);
  } catch (error) {
    console.error('Pattern detection error:', error);
    return errorResponse('Failed to detect patterns', 'PATTERN_ERROR', undefined, 500);
  }
}
