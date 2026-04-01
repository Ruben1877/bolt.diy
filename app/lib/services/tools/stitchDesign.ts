import { z } from 'zod';
import { tool } from 'ai';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('tool:stitch-design');

interface DesignResult {
  option: number;
  title: string;
  imageUrl: string;
  htmlUrl: string;
  screenId: string;
}

function buildCreativeBrief(
  niche: string,
  businessName?: string,
  colors?: string,
  typographyStyle?: string,
  styleDescription?: string,
): string {
  const name = businessName || `a ${niche} business`;
  const parts: string[] = [
    `A website for ${name}, a ${niche} business.`,
  ];

  if (colors) {
    parts.push(`Brand identity: ${colors} palette.`);
  }

  if (typographyStyle) {
    const typoMap: Record<string, string> = {
      modern: 'Clean, contemporary sans-serif typography with generous whitespace.',
      elegant: 'Refined serif and sans-serif pairing, sophisticated and timeless.',
      bold: 'Strong, impactful display typography with confident presence.',
      minimalist: 'Ultra-clean type hierarchy, restrained and purposeful.',
      classic: 'Traditional, trustworthy typography rooted in heritage.',
    };
    parts.push(typoMap[typographyStyle] || `${typographyStyle} typography.`);
  }

  parts.push(`The design should feel professional and trustworthy, tailored to the ${niche} industry.`);

  if (styleDescription) {
    parts.push(styleDescription);
  }

  return parts.join('\n');
}

export function createStitchDesignTool(
  getApiKeys: () => Record<string, string>,
  getEnv: () => Env | undefined,
) {
  return tool({
    description:
      'Generate professional website mockups using Google Stitch AI. ' +
      'Creates 3 radically different design variants based on a creative brief. ' +
      'Returns screenshot previews and HTML for each variant. ' +
      'Use when a user asks to create a website for a business.',
    parameters: z.object({
      niche: z.string().describe('The business industry (e.g. "plumber", "restaurant", "dentist", "photographer")'),
      business_name: z.string().optional().describe('The business name (e.g. "PlombExpert", "Chez Mario")'),
      colors: z
        .string()
        .optional()
        .describe('Brand colors described naturally (e.g. "blue and white", "dark navy #1a1a2e with gold accents")'),
      typography_style: z
        .enum(['modern', 'elegant', 'bold', 'minimalist', 'classic'])
        .optional()
        .describe('Typography style preference'),
      style_description: z
        .string()
        .optional()
        .describe('Additional style notes from the user (e.g. "luxurious feel", "playful and colorful")'),
    }),
    execute: async ({ niche, business_name, colors, typography_style, style_description }) => {
      logger.info(`Stitch design: niche="${niche}", business="${business_name || 'unnamed'}"`);

      const apiKeys = getApiKeys();
      const env = getEnv();
      const stitchKey =
        apiKeys?.STITCH_API_KEY || (env as unknown as Record<string, string>)?.STITCH_API_KEY;

      if (!stitchKey) {
        return {
          success: false,
          fallback: true,
          message:
            'STITCH_API_KEY not configured. Use the design_inspiration tool instead to show real website examples.',
        };
      }

      try {
        const { Stitch, StitchToolClient } = await import('@google/stitch-sdk');

        const client = new StitchToolClient({ apiKey: stitchKey });
        const stitchInstance = new Stitch(client);

        const projectTitle = business_name || `${niche} website`;
        logger.info(`Creating Stitch project: "${projectTitle}"`);
        const project = await stitchInstance.createProject(projectTitle);

        const brief = buildCreativeBrief(niche, business_name, colors, typography_style, style_description);
        logger.info(`Generating base screen with brief:\n${brief}`);
        const baseScreen = await project.generate(brief, 'DESKTOP');

        logger.info('Generating 3 design variants (REIMAGINE)...');
        const variants = await baseScreen.variants(
          brief,
          {
            variantCount: 3,
            creativeRange: 'REIMAGINE',
            aspects: ['COLOR_SCHEME', 'LAYOUT', 'TEXT_FONT'],
          },
          'DESKTOP',
        );

        const designs: DesignResult[] = [];

        for (let i = 0; i < variants.length; i++) {
          const variant = variants[i];

          try {
            const [imageUrl, htmlUrl] = await Promise.all([variant.getImage(), variant.getHtml()]);

            designs.push({
              option: i + 1,
              title: `Design ${i + 1}`,
              imageUrl,
              htmlUrl,
              screenId: variant.id,
            });
          } catch (err) {
            logger.warn(`Failed to get assets for variant ${i + 1}: ${err}`);
          }
        }

        if (designs.length === 0) {
          try {
            const [imageUrl, htmlUrl] = await Promise.all([baseScreen.getImage(), baseScreen.getHtml()]);
            designs.push({
              option: 1,
              title: 'Design 1',
              imageUrl,
              htmlUrl,
              screenId: baseScreen.id,
            });
          } catch {
            // ignore
          }
        }

        await client.close();

        if (designs.length === 0) {
          return {
            success: false,
            message: 'Stitch generated designs but failed to retrieve screenshots. Try again.',
          };
        }

        return {
          success: true,
          niche,
          businessName: business_name || niche,
          designCount: designs.length,
          designs,
          instructions:
            'IMPORTANT: The design cards will be displayed automatically via the chat UI annotation. ' +
            'In your text response, briefly introduce the options and ask the user to click the design they prefer. ' +
            'Once they select one, use fetch_website on that design\'s htmlUrl to get the full HTML, ' +
            'then reproduce it faithfully as a boltArtifact, adapting the content to the user\'s business.',
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Stitch design generation failed: ${message}`);

        return {
          success: false,
          fallback: true,
          error: `Stitch failed: ${message}`,
          message:
            'Stitch generation failed. Use the design_inspiration tool as fallback to show real website examples.',
        };
      }
    },
  });
}
