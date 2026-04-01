import { z } from 'zod';
import { tool } from 'ai';
import type { FileMap } from '~/lib/.server/llm/constants';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('tool:search-files');

function minimatch(pattern: string, filepath: string): boolean {
  const regex = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');
  return new RegExp(`^${regex}$`).test(filepath);
}

export function createSearchFilesTool(getFiles: () => FileMap) {
  return tool({
    description:
      'Search for text or regex patterns across project files. Use this to find where something is defined, used, or imported.',
    parameters: z.object({
      query: z.string().describe('Regex pattern to search for (e.g. "useState", "function\\s+handle")'),
      include_pattern: z
        .string()
        .optional()
        .describe('Glob pattern to filter files (e.g. "src/**/*.tsx"). Defaults to all files.'),
      case_sensitive: z.boolean().optional().default(false).describe('Whether to match case. Defaults to false.'),
    }),
    execute: async ({ query, include_pattern, case_sensitive }) => {
      logger.debug(`Searching for "${query}" in ${include_pattern || 'all files'}`);

      const files = getFiles();
      const flags = case_sensitive ? 'g' : 'gi';
      let regex: RegExp;

      try {
        regex = new RegExp(query, flags);
      } catch {
        return { error: `Invalid regex pattern: ${query}` };
      }

      const results: Array<{ file: string; matches: Array<{ line: number; content: string }> }> = [];
      let totalMatches = 0;
      const MAX_RESULTS = 50;

      for (const [filepath, fileData] of Object.entries(files)) {
        if (totalMatches >= MAX_RESULTS) {
          break;
        }

        if (!fileData || typeof fileData !== 'object' || !('content' in fileData)) {
          continue;
        }

        if (include_pattern && !minimatch(include_pattern, filepath)) {
          continue;
        }

        const content = (fileData as { content: string }).content;

        if (!content) {
          continue;
        }

        const lines = content.split('\n');
        const fileMatches: Array<{ line: number; content: string }> = [];

        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            fileMatches.push({ line: i + 1, content: lines[i].trim() });
            totalMatches++;
            regex.lastIndex = 0;

            if (totalMatches >= MAX_RESULTS) {
              break;
            }
          }
        }

        if (fileMatches.length > 0) {
          results.push({ file: filepath, matches: fileMatches });
        }
      }

      return {
        total_matches: totalMatches,
        files_matched: results.length,
        truncated: totalMatches >= MAX_RESULTS,
        results,
      };
    },
  });
}
