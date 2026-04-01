import { z } from 'zod';
import { tool } from 'ai';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('tool:generate-image');

async function generateWithOpenAI(
  prompt: string,
  apiKey: string,
  width: number,
  height: number,
): Promise<string> {
  const size = `${width}x${height}` as '1024x1024' | '1792x1024' | '1024x1792';
  const validSizes = ['1024x1024', '1792x1024', '1024x1792'];

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: validSizes.includes(size) ? size : '1024x1024',
      response_format: 'url',
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
  }

  const data = (await response.json()) as { data: Array<{ url: string }> };
  return data.data[0].url;
}

async function generateWithTogether(
  prompt: string,
  apiKey: string,
  width: number,
  height: number,
): Promise<string> {
  const response = await fetch('https://api.together.xyz/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'black-forest-labs/FLUX.1-schnell-Free',
      prompt,
      width: Math.min(Math.max(width, 512), 1440),
      height: Math.min(Math.max(height, 512), 1440),
      n: 1,
      response_format: 'url',
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Together API error ${response.status}: ${errBody}`);
  }

  const data = (await response.json()) as { data: Array<{ url: string }> };
  return data.data[0].url;
}

export function createGenerateImageTool(getApiKeys: () => Record<string, string>, getEnv: () => Env | undefined) {
  return tool({
    description:
      'Generate an image from a text description using AI. Returns a URL to the generated image. Use for logos, illustrations, hero images, icons, etc.',
    parameters: z.object({
      prompt: z.string().describe('Detailed description of the image to generate'),
      width: z.number().optional().default(1024).describe('Image width in pixels (default 1024)'),
      height: z.number().optional().default(1024).describe('Image height in pixels (default 1024)'),
    }),
    execute: async ({ prompt, width, height }) => {
      logger.debug(`Generating image: "${prompt.substring(0, 80)}..."`);

      try {
        const apiKeys = getApiKeys();
        const env = getEnv();
        const openaiKey = apiKeys?.OPENAI_API_KEY || (env as unknown as Record<string, string>)?.OPENAI_API_KEY;
        const togetherKey = apiKeys?.TOGETHER_API_KEY || (env as unknown as Record<string, string>)?.TOGETHER_API_KEY;

        if (togetherKey) {
          const url = await generateWithTogether(prompt, togetherKey, width, height);
          return {
            provider: 'together',
            url,
            prompt,
            width,
            height,
            usage_hint: 'Use this URL directly in an <img> tag src attribute.',
          };
        }

        if (openaiKey) {
          const url = await generateWithOpenAI(prompt, openaiKey, width, height);
          return {
            provider: 'openai',
            url,
            prompt,
            width,
            height,
            usage_hint: 'Use this URL directly in an <img> tag src attribute.',
          };
        }

        return {
          error:
            'No image generation API key configured. Set TOGETHER_API_KEY or OPENAI_API_KEY in your environment variables.',
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Image generation failed: ${message}`);
        return { error: `Image generation failed: ${message}` };
      }
    },
  });
}
