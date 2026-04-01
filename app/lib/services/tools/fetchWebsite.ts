import { z } from 'zod';
import { tool } from 'ai';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('tool:fetch-website');

function htmlToMarkdown(html: string): string {
  let md = html;

  // Remove script and style tags entirely
  md = md.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  md = md.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  md = md.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  md = md.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  md = md.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');

  // Headings
  md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');

  // Paragraphs, line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');

  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');

  // Bold, italic
  md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');

  // Code
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
  md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n```\n$1\n```\n');

  // Lists
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?[ou]l[^>]*>/gi, '\n');

  // Remove all remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#39;/g, "'");
  md = md.replace(/&nbsp;/g, ' ');

  // Clean up whitespace
  md = md.replace(/\n{3,}/g, '\n\n');
  md = md.trim();

  return md;
}

export function createFetchWebsiteTool() {
  return tool({
    description:
      'Fetch a website URL and return its content as markdown. Useful for reading documentation, articles, or any web page content.',
    parameters: z.object({
      url: z.string().url().describe('The URL to fetch'),
      format: z
        .enum(['markdown', 'html'])
        .optional()
        .default('markdown')
        .describe('Output format. Defaults to markdown.'),
    }),
    execute: async ({ url, format }) => {
      logger.debug(`Fetching website: ${url}`);

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          return { error: `Failed to fetch: HTTP ${response.status} ${response.statusText}` };
        }

        const html = await response.text();
        const MAX_LENGTH = 30000;

        if (format === 'html') {
          return {
            url,
            format: 'html',
            content: html.length > MAX_LENGTH ? html.substring(0, MAX_LENGTH) + '\n... (truncated)' : html,
            length: html.length,
          };
        }

        let markdown = htmlToMarkdown(html);

        if (markdown.length > MAX_LENGTH) {
          markdown = markdown.substring(0, MAX_LENGTH) + '\n... (truncated)';
        }

        return {
          url,
          format: 'markdown',
          content: markdown,
          length: markdown.length,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to fetch ${url}: ${message}`);
        return { error: `Failed to fetch website: ${message}` };
      }
    },
  });
}
