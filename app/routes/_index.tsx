import { redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';

export const meta: MetaFunction = () => {
  return [
    { title: 'AXTRAAI' },
    { name: 'description', content: 'Créez votre site web avec AXTRAAI, votre assistant IA' },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (token) {
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
      const limovaUrl = import.meta.env.VITE_LIMOVA_URL || 'http://localhost:3000';
      return redirect(`${limovaUrl}/auth?redirect=builder`);
    }

    const isHttps = request.url.startsWith('https');
    const cookieFlags = isHttps
      ? 'HttpOnly; Secure; SameSite=None; Path=/; Max-Age=3600'
      : 'HttpOnly; SameSite=Lax; Path=/; Max-Age=3600';

    const cleanUrl = new URL(request.url);
    cleanUrl.searchParams.delete('token');

    return redirect(cleanUrl.toString(), {
      headers: { 'Set-Cookie': `sb-access-token=${token}; ${cookieFlags}` },
    });
  }

  return json({});
};

/**
 * Landing page component for Bolt
 * Note: Settings functionality should ONLY be accessed through the sidebar menu.
 * Do not add settings button/panel to this landing page as it was intentionally removed
 * to keep the UI clean and consistent with the design system.
 */
export default function Index() {
  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  );
}
