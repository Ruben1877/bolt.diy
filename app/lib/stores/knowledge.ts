import { atom } from 'nanostores';

/**
 * Contexte IA persistant transmis depuis Limova via postMessage (limova:knowledge).
 * Injecté dans chaque requête LLM au même titre que le Project/Workspace Knowledge de Lovable.
 */
export const projectKnowledgeStore = atom<string>('');
export const workspaceKnowledgeStore = atom<string>('');
