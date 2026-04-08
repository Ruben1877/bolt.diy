import { RemixBrowser } from '@remix-run/react';
import { startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { setAuthToken } from '~/lib/persistence/serverSync';
import { projectKnowledgeStore, workspaceKnowledgeStore } from '~/lib/stores/knowledge';

// Suppress known WebContainer race-condition error when running in an iframe
window.addEventListener('unhandledrejection', (event) => {
  const msg: string = event.reason?.message ?? '';

  if (msg.includes('No Listener') && msg.includes('tabs:outgoing')) {
    event.preventDefault();
  }
});

/*
 * Écouter le token d'auth envoyé par Limova via postMessage
 * Sécurisé : on valide l'origine avant d'accepter le token
 */
const LIMOVA_ORIGIN = (import.meta.env.VITE_LIMOVA_URL as string) || 'http://localhost:3000';
window.addEventListener('message', (event) => {
  if (event.origin !== LIMOVA_ORIGIN) {
    return;
  }

  if (event.data?.type === 'limova:auth-token' && typeof event.data.token === 'string') {
    setAuthToken(event.data.token);
  }

  // Contexte IA persistant (Project + Workspace Knowledge, style Lovable)
  if (event.data?.type === 'limova:knowledge') {
    if (typeof event.data.projectKnowledge === 'string') {
      projectKnowledgeStore.set(event.data.projectKnowledge);
    }

    if (typeof event.data.workspaceKnowledge === 'string') {
      workspaceKnowledgeStore.set(event.data.workspaceKnowledge);
    }
  }
});

startTransition(() => {
  hydrateRoot(document.getElementById('root')!, <RemixBrowser />);
});
