import { type ActionFunctionArgs } from '@remix-run/cloudflare';

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const cookieHeader = request.headers.get('Cookie') || '';
  const tokenMatch = cookieHeader.match(/sb-access-token=([^;]+)/);
  const token = tokenMatch?.[1];

  if (!token) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 });
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  // Valider le token via Supabase REST
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: supabaseAnonKey },
  });

  if (!userRes.ok) {
    return new Response(JSON.stringify({ error: 'Token invalide' }), { status: 401 });
  }

  const userData = await userRes.json() as { id: string };

  let body: { name?: string; files?: Record<string, unknown> };
  try {
    body = await request.json() as { name?: string; files?: Record<string, unknown> };
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { name, files } = body;

  // Insérer via Supabase REST (RLS appliquée avec le token user)
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/sites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': supabaseAnonKey,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      user_id: userData.id,
      name: name || 'Site sans titre',
      files: files ?? {},
      status: 'draft',
    }),
  });

  if (!insertRes.ok) {
    const err = await insertRes.text();
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }

  const [site] = await insertRes.json() as { id: string; name: string; created_at: string }[];

  return new Response(JSON.stringify({ ok: true, site }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
