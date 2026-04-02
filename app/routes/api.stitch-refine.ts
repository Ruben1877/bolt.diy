import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { callStitchMCP } from '~/lib/services/tools/stitchDesign';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.stitch-refine');

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  for (const item of cookieHeader.split(';')) {
    const [name, ...rest] = item.trim().split('=');

    if (name && rest.length) {
      cookies[decodeURIComponent(name.trim())] = decodeURIComponent(rest.join('=').trim());
    }
  }

  return cookies;
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { projectId, screenId, prompt } = (await request.json()) as {
    projectId?: string;
    screenId?: string;
    prompt?: string;
  };

  if (!projectId || !screenId || !prompt) {
    return Response.json({ error: 'Missing projectId, screenId, or prompt' }, { status: 400 });
  }

  const cookieHeader = request.headers.get('Cookie') || '';
  const apiKeys = JSON.parse(parseCookies(cookieHeader).apiKeys || '{}');
  const stitchKey =
    apiKeys?.STITCH_API_KEY || (context.cloudflare?.env as unknown as Record<string, string>)?.STITCH_API_KEY;

  if (!stitchKey) {
    return Response.json({ error: 'STITCH_API_KEY not configured' }, { status: 400 });
  }

  try {
    logger.info(`Refining screen ${screenId} in project ${projectId}`);

    const result = await callStitchMCP(stitchKey, 'edit_screens', {
      projectId,
      screenIds: [screenId],
      prompt,
      deviceType: 'DESKTOP',
      modelId: 'GEMINI_3_1_PRO',
    });

    logger.debug(`edit_screens result: ${JSON.stringify(result).slice(0, 2000)}`);

    let imageUrl = '';
    let htmlUrl = '';
    let newScreenId = screenId;

    const screens =
      result?.outputComponents?.[0]?.design?.screens || result?.screens || (result?.screen ? [result.screen] : []);

    if (screens.length > 0) {
      const screen = screens[0];
      newScreenId = screen?.id || screen?.name?.match(/screens\/([^/]+)/)?.[1] || screenId;

      imageUrl = screen?.screenshot?.downloadUrl || screen?.screenshot?.imageUri || '';
      htmlUrl = screen?.htmlCode?.downloadUrl || screen?.html?.htmlUri || '';
    }

    return Response.json({
      success: true,
      screenId: newScreenId,
      imageUrl,
      htmlUrl,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Stitch refine failed: ${msg}`);

    return Response.json({ error: msg }, { status: 502 });
  }
}
