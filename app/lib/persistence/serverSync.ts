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

/*
 * En prod, VITE_LIMOVA_API_URL doit pointer directement vers l'API (ex: https://api.example.com).
 * En dev, on dérive l'URL en remplaçant le port :3000 → :3001 depuis VITE_LIMOVA_URL.
 */
const BACKEND_URL = (
  (import.meta.env.VITE_LIMOVA_API_URL as string) ||
  ((import.meta.env.VITE_LIMOVA_URL as string) || 'http://localhost:3000').replace(':3000', ':3001')
).replace(/\/$/, '');

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

/*
 * ── Debounce helpers ─────────────────────────────────────────────────────────
 * Pendant un build, bolt.diy peut écrire des dizaines de fichiers en quelques
 * secondes et appeler sync à chaque fois. Sans debounce, cela génère des
 * centaines de requêtes qui saturent le rate-limiter (429).
 * On regroupe les appels rapides en une seule requête envoyée 4 s après le
 * dernier appel.
 */

const DEBOUNCE_MS = 4000;

const _msgTimers = new Map<string, ReturnType<typeof setTimeout>>();
const _msgPending = new Map<string, { messages: Message[]; description?: string }>();

const _snapTimers = new Map<string, ReturnType<typeof setTimeout>>();
const _snapPending = new Map<string, Snapshot>();

async function _flushMessages(chatId: string): Promise<void> {
  const pending = _msgPending.get(chatId);
  _msgPending.delete(chatId);
  _msgTimers.delete(chatId);

  if (!pending) {
    return;
  }

  const headers = getHeaders();

  if (!headers) {
    return;
  }

  try {
    await fetch(`${BACKEND_URL}/bolt-chat/${encodeURIComponent(chatId)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(pending),
    });
  } catch (err) {
    logger.warn('syncMessagesToServer failed (non-blocking):', err);
  }
}

async function _flushSnapshot(chatId: string): Promise<void> {
  const snapshot = _snapPending.get(chatId);
  _snapPending.delete(chatId);
  _snapTimers.delete(chatId);

  if (!snapshot) {
    return;
  }

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

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sync les messages d'une conversation vers le serveur.
 * Debounced à 4 s : plusieurs appels rapides → une seule requête réseau.
 * Ne bloque pas — erreurs silencieuses en prod.
 */
export function syncMessagesToServer(chatId: string, messages: Message[], description?: string): void {
  if (!_authToken) {
    return;
  }

  _msgPending.set(chatId, { messages, description });

  const existing = _msgTimers.get(chatId);

  if (existing) {
    clearTimeout(existing);
  }

  _msgTimers.set(
    chatId,
    setTimeout(() => _flushMessages(chatId), DEBOUNCE_MS),
  );
}

/**
 * Sync le snapshot (fichiers WebContainer) vers le serveur.
 * Debounced à 4 s — séparé des messages car peut être volumineux.
 */
export function syncSnapshotToServer(chatId: string, snapshot: Snapshot): void {
  if (!_authToken) {
    return;
  }

  _snapPending.set(chatId, snapshot);

  const existing = _snapTimers.get(chatId);

  if (existing) {
    clearTimeout(existing);
  }

  _snapTimers.set(
    chatId,
    setTimeout(() => _flushSnapshot(chatId), DEBOUNCE_MS),
  );
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
