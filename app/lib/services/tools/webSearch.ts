import { z } from 'zod';
import { tool } from 'ai';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('tool:web-search');

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function searchWithTavily(query: string, apiKey: string, numResults: number): Promise<SearchResult[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: numResults,
      include_answer: false,
      include_raw_content: false,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`);
  }

  const data = (await response.json()) as { results: Array<{ title: string; url: string; content: string }> };

  return data.results.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
  }));
}

async function searchWithDuckDuckGo(query: string, numResults: number): Promise<SearchResult[]> {
  const encoded = encodeURIComponent(query);
  const response = await fetch(`https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BoltAssistant/1.0)' },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    Abstract?: string;
    AbstractURL?: string;
    AbstractSource?: string;
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
  };

  const results: SearchResult[] = [];

  if (data.Abstract && data.AbstractURL) {
    results.push({
      title: data.AbstractSource || 'Result',
      url: data.AbstractURL,
      snippet: data.Abstract,
    });
  }

  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics) {
      if (results.length >= numResults) {
        break;
      }

      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.substring(0, 80),
          url: topic.FirstURL,
          snippet: topic.Text,
        });
      }
    }
  }

  return results;
}

export function createWebSearchTool(getApiKeys: () => Record<string, string>, getEnv: () => Env | undefined) {
  return tool({
    description:
      'Search the web for current information, documentation, tutorials, or any topic. Use when you need up-to-date information or are unsure about something.',
    parameters: z.object({
      query: z.string().describe('The search query'),
      num_results: z
        .number()
        .optional()
        .default(5)
        .describe('Number of search results to return (default: 5, max: 10)'),
    }),
    execute: async ({ query, num_results }) => {
      logger.debug(`Web search: "${query}"`);
      const numResults = Math.min(num_results, 10);

      try {
        const apiKeys = getApiKeys();
        const env = getEnv();
        const tavilyKey = apiKeys?.TAVILY_API_KEY || (env as unknown as Record<string, string>)?.TAVILY_API_KEY;

        if (tavilyKey) {
          const results = await searchWithTavily(query, tavilyKey, numResults);
          return { provider: 'tavily', query, results };
        }

        const results = await searchWithDuckDuckGo(query, numResults);
        return { provider: 'duckduckgo', query, results };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Web search failed: ${message}`);
        return { error: `Search failed: ${message}`, query };
      }
    },
  });
}
