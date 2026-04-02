import type { ActionFunctionArgs } from '@remix-run/cloudflare';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { url } = (await request.json()) as { url?: string };

  if (!url || typeof url !== 'string') {
    return Response.json({ error: 'Missing or invalid url' }, { status: 400 });
  }

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) {
      return Response.json({ error: `HTTP ${resp.status} ${resp.statusText}` }, { status: 502 });
    }

    const html = await resp.text();

    return Response.json({ html, length: html.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 502 });
  }
}
