import { type ActionFunctionArgs } from '@remix-run/cloudflare';

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let token: string | undefined;
  try {
    const body = await request.json() as { token?: string };
    token = body.token;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing token' }), { status: 400 });
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  let valid = false;
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    });
    valid = res.ok;
  } catch {
    valid = false;
  }

  if (!valid) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }

  const isHttps = request.url.startsWith('https');
  const cookieFlags = isHttps
    ? 'HttpOnly; Secure; SameSite=None; Path=/; Max-Age=3600'
    : 'HttpOnly; SameSite=Lax; Path=/; Max-Age=3600';

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `sb-access-token=${token}; ${cookieFlags}`,
    },
  });
};
