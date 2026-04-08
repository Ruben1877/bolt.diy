/**
 * serverSync.ts
 * Synchronise les conversations bolt.diy avec le backend Limova.
 * Le token d'auth est fourni par Limova via postMessage (bolt:auth-token).
 * Sécurisé : toutes les requêtes sont authentifiées par JWT vérifié côté serveur.
 */

import { createScopedLogger } from '~/utils/logger';
import type { Message } from 'ai';
import type { Snapshot } from './types';

const logger = createScopedLogger('serverSync');

const LIMOVA_API = ((import.meta.env.VITE_LIMOVA_URL as string) || 'http://localhost:3000').replace(/\/$/, '');
const BACKEND_URL = `${LIMOVA_API.replace(':3000', ':3001')}`;

// Token reçu depuis Limova via postMessage — stocké en mémoire (jamais dans localStorage)
let _authToken: string | null = null;

export function setAuthToken(token: string) {
  _authToken = token;
  logger.debug('Auth token set');
}

function getHeaders(): HeadersInit | null {
  if (!_authToken) {
    return null;
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${_authToken}`,
  };
}

/**
 * Sync les messages d'une conversation vers le serveur.
 * Appelé après chaque sauvegarde dans IndexedDB.
 * Ne bloque pas — erreurs silencieuses en prod.
 */
export async function syncMessagesToServer(chatId: string, messages: Message[], description?: string): Promise<void> {
  const headers = getHeaders();

  if (!headers) {
    return;
  } // Pas de token = invité, on ne sync pas

  try {
    await fetch(`${BACKEND_URL}/bolt-chat/${encodeURIComponent(chatId)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ messages, description }),
    });
  } catch (err) {
    logger.warn('syncMessagesToServer failed (non-blocking):', err);
  }
}

/**
 * Sync le snapshot (fichiers WebContainer) vers le serveur.
 * Appelé après chaque snapshot — séparé car peut être volumineux.
 */
export async function syncSnapshotToServer(chatId: string, snapshot: Snapshot): Promise<void> {
  const headers = getHeaders();

  if (!headers) {
    return;
  }

  try {
    await fetch(`${BACKEND_URL}/bolt-chat/${encodeURIComponent(chatId)}/snapshot`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ snapshot }),
    });
  } catch (err) {
    logger.warn('syncSnapshotToServer failed (non-blocking):', err);
  }
}

/**
 * Récupère une conversation depuis le serveur.
 * Retourne null si introuvable ou si pas de token.
 */
export async function fetchChatFromServer(chatId: string): Promise<{
  messages: Message[];
  snapshot: Snapshot | null;
  description: string | null;
} | null> {
  const headers = getHeaders();

  if (!headers) {
    return null;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/bolt-chat/${encodeURIComponent(chatId)}`, { headers });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as { messages?: Message[]; snapshot?: Snapshot; description?: string };

    return {
      messages: data.messages || [],
      snapshot: data.snapshot || null,
      description: data.description || null,
    };
  } catch (err) {
    logger.warn('fetchChatFromServer failed:', err);
    return null;
  }
}
