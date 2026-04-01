import { z } from 'zod';
import { tool } from 'ai';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('tool:supabase-docs');

export function createSupabaseDocsSearchTool() {
  return tool({
    description:
      'Search the official Supabase documentation to find information about auth, database, storage, edge functions, RLS policies, and more.',
    parameters: z.object({
      query: z.string().describe('Search query (e.g. "row level security", "auth policies", "storage upload")'),
    }),
    execute: async ({ query }) => {
      logger.debug(`Searching Supabase docs: "${query}"`);

      try {
        const encoded = encodeURIComponent(query);
        const response = await fetch(
          `https://supabase.com/docs/api/search?query=${encoded}`,
          {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'Mozilla/5.0 (compatible; BoltAssistant/1.0)',
            },
            signal: AbortSignal.timeout(10000),
          },
        );

        if (!response.ok) {
          // Fallback: construct useful doc links from the query
          return buildFallbackResults(query);
        }

        const data = (await response.json()) as Array<{
          title?: string;
          url?: string;
          description?: string;
          content?: string;
          section?: string;
        }>;

        if (!Array.isArray(data) || data.length === 0) {
          return buildFallbackResults(query);
        }

        const results = data.slice(0, 8).map((item) => ({
          title: item.title || 'Supabase Documentation',
          url: item.url ? `https://supabase.com${item.url}` : 'https://supabase.com/docs',
          snippet: item.description || item.content?.substring(0, 200) || '',
          section: item.section || '',
        }));

        return { query, results };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Supabase docs search failed: ${message}`);
        return buildFallbackResults(query);
      }
    },
  });
}

function buildFallbackResults(query: string) {
  const topics: Record<string, { title: string; url: string; snippet: string }> = {
    auth: {
      title: 'Supabase Auth',
      url: 'https://supabase.com/docs/guides/auth',
      snippet: 'Authentication and user management with Supabase',
    },
    rls: {
      title: 'Row Level Security',
      url: 'https://supabase.com/docs/guides/auth/row-level-security',
      snippet: 'Secure your data with row-level policies',
    },
    storage: {
      title: 'Supabase Storage',
      url: 'https://supabase.com/docs/guides/storage',
      snippet: 'File storage and management',
    },
    database: {
      title: 'Supabase Database',
      url: 'https://supabase.com/docs/guides/database/overview',
      snippet: 'PostgreSQL database with Supabase',
    },
    edge: {
      title: 'Edge Functions',
      url: 'https://supabase.com/docs/guides/functions',
      snippet: 'Serverless functions at the edge',
    },
    realtime: {
      title: 'Supabase Realtime',
      url: 'https://supabase.com/docs/guides/realtime',
      snippet: 'Real-time subscriptions and broadcasts',
    },
  };

  const lowerQuery = query.toLowerCase();
  const matchedResults = Object.entries(topics)
    .filter(([key]) => lowerQuery.includes(key))
    .map(([, value]) => value);

  if (matchedResults.length === 0) {
    matchedResults.push({
      title: 'Supabase Documentation',
      url: `https://supabase.com/docs?search=${encodeURIComponent(query)}`,
      snippet: `Search Supabase docs for: ${query}`,
    });
  }

  return { query, results: matchedResults, note: 'Fallback results — API unavailable' };
}
