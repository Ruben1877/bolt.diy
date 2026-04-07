import { z } from 'zod';
import { tool } from 'ai';
import type { FileMap } from '~/lib/.server/llm/constants';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('tool:security-scan');

interface SecurityIssue {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  file: string;
  line?: number;
  message: string;
  recommendation: string;
}

const SECRET_PATTERNS = [
  { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"]/gi, name: 'API Key' },
  { pattern: /(?:secret|token|password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/gi, name: 'Secret/Token' },
  { pattern: /sk-[A-Za-z0-9]{20,}/g, name: 'OpenAI API Key' },
  { pattern: /ghp_[A-Za-z0-9]{36,}/g, name: 'GitHub Personal Access Token' },
  { pattern: /(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}/g, name: 'AWS Access Key' },
  {
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
    name: 'JWT Token',
  },
];

function scanForSecrets(filepath: string, content: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  if (filepath.includes('node_modules') || filepath.endsWith('.lock') || filepath.endsWith('.map')) {
    return issues;
  }

  // Skip .env files themselves — they're expected to contain secrets
  if (filepath.match(/\.env(\.|$)/)) {
    return issues;
  }

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    for (const { pattern, name } of SECRET_PATTERNS) {
      pattern.lastIndex = 0;

      if (pattern.test(lines[i])) {
        // Skip if it's referencing an env var
        if (/process\.env|import\.meta\.env|Deno\.env/i.test(lines[i])) {
          continue;
        }

        issues.push({
          severity: 'critical',
          category: 'hardcoded-secret',
          file: filepath,
          line: i + 1,
          message: `Possible hardcoded ${name} detected`,
          recommendation: 'Move this value to environment variables (.env file)',
        });
      }
    }
  }

  return issues;
}

function scanForXSS(filepath: string, content: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  if (!filepath.match(/\.(tsx?|jsx?)$/)) {
    return issues;
  }

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (/dangerouslySetInnerHTML/i.test(lines[i])) {
      issues.push({
        severity: 'warning',
        category: 'xss',
        file: filepath,
        line: i + 1,
        message: 'dangerouslySetInnerHTML usage detected',
        recommendation: 'Sanitize the HTML content with a library like DOMPurify before rendering',
      });
    }

    if (/\.innerHTML\s*=/i.test(lines[i])) {
      issues.push({
        severity: 'warning',
        category: 'xss',
        file: filepath,
        line: i + 1,
        message: 'Direct innerHTML assignment detected',
        recommendation: 'Use textContent instead, or sanitize HTML with DOMPurify',
      });
    }

    if (/eval\s*\(/i.test(lines[i]) && !filepath.includes('node_modules')) {
      issues.push({
        severity: 'critical',
        category: 'code-injection',
        file: filepath,
        line: i + 1,
        message: 'eval() usage detected',
        recommendation: 'Avoid eval() — use safer alternatives like JSON.parse() or Function()',
      });
    }
  }

  return issues;
}

function scanForMissingRLS(filepath: string, content: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  if (!filepath.match(/\.sql$/i)) {
    return issues;
  }

  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;
  let match;

  while ((match = createTableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const rlsRegex = new RegExp(`ALTER\\s+TABLE\\s+${tableName}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');

    if (!rlsRegex.test(content)) {
      issues.push({
        severity: 'critical',
        category: 'missing-rls',
        file: filepath,
        message: `Table "${tableName}" created without Row Level Security`,
        recommendation: `Add: ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY; and create appropriate policies`,
      });
    }
  }

  return issues;
}

function scanForExposedEnv(filepath: string, _content: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  if (filepath.match(/\.env(\.|$)/) && !filepath.includes('.example') && !filepath.includes('.local')) {
    if (filepath.includes('public') || filepath.includes('dist') || filepath.includes('build')) {
      issues.push({
        severity: 'critical',
        category: 'exposed-env',
        file: filepath,
        message: '.env file in public/build directory may be exposed',
        recommendation: 'Move .env file out of public directories and add it to .gitignore',
      });
    }
  }

  return issues;
}

export function createSecurityScanTool(getFiles: () => FileMap) {
  return tool({
    description:
      'Run a security analysis on the project files. Detects hardcoded secrets, XSS vulnerabilities, missing RLS policies, and other security issues.',
    parameters: z.object({}),
    execute: async () => {
      logger.debug('Running security scan');

      const files = getFiles();
      const allIssues: SecurityIssue[] = [];

      for (const [filepath, fileData] of Object.entries(files)) {
        if (!fileData || typeof fileData !== 'object' || !('content' in fileData)) {
          continue;
        }

        const content = (fileData as { content: string }).content;

        if (!content) {
          continue;
        }

        allIssues.push(...scanForSecrets(filepath, content));
        allIssues.push(...scanForXSS(filepath, content));
        allIssues.push(...scanForMissingRLS(filepath, content));
        allIssues.push(...scanForExposedEnv(filepath, content));
      }

      const critical = allIssues.filter((i) => i.severity === 'critical');
      const warnings = allIssues.filter((i) => i.severity === 'warning');
      const info = allIssues.filter((i) => i.severity === 'info');

      return {
        summary: {
          total_issues: allIssues.length,
          critical: critical.length,
          warnings: warnings.length,
          info: info.length,
          files_scanned: Object.keys(files).length,
        },
        issues: allIssues,
      };
    },
  });
}
