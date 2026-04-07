import { z } from 'zod';
import { tool } from 'ai';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('tool:design-inspiration');

interface DesignResult {
  title: string;
  url: string;
  screenshotUrl: string;
  description: string;
}

function getScreenshotUrl(siteUrl: string, width = 1280): string {
  return `https://image.thum.io/get/width/${width}/crop/900/noanimate/${encodeURIComponent(siteUrl)}`;
}

async function searchDesigns(query: string, numResults: number, tavilyKey?: string): Promise<DesignResult[]> {
  const searchQuery = `best ${query} website design examples`;

  if (tavilyKey) {
    return searchWithTavily(searchQuery, tavilyKey, numResults);
  }

  return searchWithDuckDuckGo(searchQuery, numResults);
}

async function searchWithTavily(query: string, apiKey: string, numResults: number): Promise<DesignResult[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: numResults + 5,
      include_answer: false,
      include_raw_content: false,
      exclude_domains: ['pinterest.com', 'dribbble.com', 'behance.net', 'youtube.com', 'reddit.com', 'twitter.com'],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    results: Array<{ title: string; url: string; content: string }>;
  };

  const validResults: DesignResult[] = [];

  for (const r of data.results) {
    if (validResults.length >= numResults) {
      break;
    }

    try {
      const urlObj = new URL(r.url);
      const isDirectSite =
        !urlObj.pathname.includes('/search') &&
        !urlObj.hostname.includes('google') &&
        !urlObj.hostname.includes('bing') &&
        !urlObj.hostname.includes('wikipedia');

      if (isDirectSite) {
        validResults.push({
          title: r.title,
          url: r.url,
          screenshotUrl: getScreenshotUrl(r.url),
          description: r.content.substring(0, 200),
        });
      }
    } catch {
      // skip invalid URLs
    }
  }

  return validResults;
}

async function searchWithDuckDuckGo(query: string, numResults: number): Promise<DesignResult[]> {
  const encoded = encodeURIComponent(query);
  const response = await fetch(`https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BoltAssistant/1.0)' },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
  };

  const results: DesignResult[] = [];

  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics) {
      if (results.length >= numResults) {
        break;
      }

      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.substring(0, 80),
          url: topic.FirstURL,
          screenshotUrl: getScreenshotUrl(topic.FirstURL),
          description: topic.Text.substring(0, 200),
        });
      }
    }
  }

  return results;
}

export function createDesignInspirationTool(getApiKeys: () => Record<string, string>, getEnv: () => Env | undefined) {
  return tool({
    description:
      'Search for real website designs in a specific industry/niche and return screenshots for the user to choose from. ' +
      'The user picks their favorite, then you reproduce it. ' +
      'Returns website URLs with live screenshot previews.',
    parameters: z.object({
      niche: z
        .string()
        .describe(
          'The industry or niche to search designs for (e.g. "plumber", "restaurant", "dentist", "SaaS landing page", "portfolio photographer")',
        ),
      style: z
        .string()
        .optional()
        .describe('Optional style preference (e.g. "modern", "minimalist", "luxury", "colorful")'),
      num_results: z.number().optional().default(3).describe('Number of design options to show (default: 3, max: 5)'),
    }),
    // eslint-disable-next-line @typescript-eslint/naming-convention
    execute: async ({ niche, style, num_results }) => {
      logger.debug(`Design inspiration search: niche="${niche}", style="${style || 'any'}"`);

      const numResults = Math.min(num_results, 5);
      const query = style ? `${style} ${niche}` : niche;

      try {
        const apiKeys = getApiKeys();
        const env = getEnv();
        const tavilyKey = apiKeys?.TAVILY_API_KEY || (env as unknown as Record<string, string>)?.TAVILY_API_KEY;

        const designs = await searchDesigns(query, numResults, tavilyKey || undefined);

        if (designs.length === 0) {
          return {
            success: false,
            message: `No website designs found for "${niche}". Try a different search term.`,
          };
        }

        return {
          success: true,
          niche,
          style: style || 'any',
          message:
            `Found ${designs.length} website designs for "${niche}". ` +
            'Present each option with its screenshot image to the user using markdown image syntax: ![Option N](screenshotUrl). ' +
            'Ask the user to pick their favorite. Once they choose, use fetch_website on that URL to get the HTML/CSS, ' +
            'then reproduce the design faithfully.',
          designs: designs.map((d, i) => ({
            option: i + 1,
            title: d.title,
            url: d.url,
            screenshotUrl: d.screenshotUrl,
            description: d.description,
          })),
          instructions:
            'IMPORTANT: Display each design as a numbered option with the screenshot image rendered in markdown. ' +
            'Use this exact format for each option:\n' +
            '### Option N: [Title]\n' +
            '![Option N preview](screenshotUrl)\n' +
            '🔗 [Visit site](url)\n' +
            'Brief description.\n\n' +
            'After showing all options, ask: "Which design do you prefer? I will reproduce it for you."',
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Design inspiration search failed: ${message}`);

        return { success: false, error: `Search failed: ${message}`, niche };
      }
    },
  });
}
