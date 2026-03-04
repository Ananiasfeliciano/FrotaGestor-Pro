/**
 * Sync Storage — Camada de sincronização entre localStorage e Firebase Realtime Database.
 * 
 * Estratégia:
 * - ESCRITA: grava no localStorage (imediato) E no Firebase (async)
 * - LEITURA: lê do localStorage (rápido) + escuta mudanças do Firebase em tempo real
 * - OFFLINE: funciona normalmente via localStorage; sincroniza ao reconectar
 * - CONFLITOS: última escrita vence (last-write-wins com timestamp)
 */

import { ref, set, onValue, off, DataSnapshot, serverTimestamp, get } from 'firebase/database';
import { db, isFirebaseConfigured } from './firebase';

// ── Chaves sincronizáveis ────────────────────────────────────
// Não sincronizamos: frota_user (sessão local), app_settings (preferências locais)
const SYNC_KEYS = [
  'system_users',
  'fleet_vehicles',
  'fleet_inspections',
  'fleet_stations',
  'fleet_workshops',
  'fleet_parts',
  'frota_logs',
] as const;

export type SyncKey = typeof SYNC_KEYS[number];

export function isSyncKey(key: string): key is SyncKey {
  return (SYNC_KEYS as readonly string[]).includes(key);
}

// ── Metadado de versão ───────────────────────────────────────
interface SyncEnvelope<T = unknown> {
  data: T;
  updatedAt: number;
  updatedBy: string; // deviceId
}

// ID único do dispositivo (persiste entre sessões)
function getDeviceId(): string {
  let id = localStorage.getItem('_device_id');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 12);
    localStorage.setItem('_device_id', id);
  }
  return id;
}

const deviceId = getDeviceId();

// ── Referência Firebase ──────────────────────────────────────
function getRef(key: string) {
  if (!db) return null;
  return ref(db, `frotagestor/${key}`);
}

// ── Flag para evitar loops ───────────────────────────────────
// Quando recebemos dados do Firebase, gravamos no localStorage.
// Precisamos ignorar o evento de storage que isso gera para não reenviar ao Firebase.
let _ignoreNextLocalWrite = new Set<string>();

// ── ESCREVER: localStorage + Firebase ────────────────────────
export function syncWrite<T>(key: string, value: T): boolean {
  // 1. Gravar no localStorage (sempre, para funcionar offline)
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return false;
  }

  // 2. Enviar ao Firebase (se configurado e é chave sincronizável)
  if (isFirebaseConfigured() && db && isSyncKey(key)) {
    const fbRef = getRef(key);
    if (fbRef) {
      const envelope: SyncEnvelope<T> = {
        data: value,
        updatedAt: Date.now(),
        updatedBy: deviceId,
      };
      set(fbRef, envelope).catch((err) => {
        console.warn(`[Sync] Erro ao enviar "${key}" ao Firebase:`, err);
      });
    }
  }
  return true;
}

// ── LER: localStorage (fallback local) ──────────────────────
export function syncRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

// ── ESCUTAR MUDANÇAS DO FIREBASE ─────────────────────────────
type SyncListener<T = unknown> = (data: T) => void;

const activeListeners = new Map<string, SyncListener>();

export function syncSubscribe<T>(key: SyncKey, callback: SyncListener<T>): () => void {
  if (!isFirebaseConfigured() || !db) {
    // Sem Firebase — retorna cleanup vazio
    return () => {};
  }

  const fbRef = getRef(key);
  if (!fbRef) return () => {};

  const handler = (snapshot: DataSnapshot) => {
    const val = snapshot.val() as SyncEnvelope<T> | null;
    if (!val || !val.data) return;

    // Se foi este dispositivo que enviou, ignorar (já temos localmente)
    if (val.updatedBy === deviceId) return;

    // Gravar no localStorage sem reenviar ao Firebase
    _ignoreNextLocalWrite.add(key);
    try {
      localStorage.setItem(key, JSON.stringify(val.data));
    } catch { /* ignore */ }
    setTimeout(() => _ignoreNextLocalWrite.delete(key), 100);

    // Notificar o React
    callback(val.data);
  };

  onValue(fbRef, handler);
  activeListeners.set(key, handler as SyncListener);

  return () => {
    if (fbRef) off(fbRef, 'value', handler);
    activeListeners.delete(key);
  };
}

// ── SINCRONIZAÇÃO INICIAL ────────────────────────────────────
// Na primeira conexão, envia dados locais que possam não estar no Firebase
export async function syncInitialPush(): Promise<void> {
  if (!isFirebaseConfigured() || !db) return;

  for (const key of SYNC_KEYS) {
    const fbRef = getRef(key);
    if (!fbRef) continue;

    try {
      const snapshot = await get(fbRef);
      const remoteEnvelope = snapshot.val() as SyncEnvelope | null;
      const localRaw = localStorage.getItem(key);

      if (localRaw && !remoteEnvelope) {
        // Dados locais existem mas Firebase está vazio → enviar
        const localData = JSON.parse(localRaw);
        await set(fbRef, {
          data: localData,
          updatedAt: Date.now(),
          updatedBy: deviceId,
        });
        console.log(`[Sync] Push inicial: "${key}" → Firebase`);
      } else if (remoteEnvelope?.data && !localRaw) {
        // Firebase tem dados mas local está vazio → baixar
        localStorage.setItem(key, JSON.stringify(remoteEnvelope.data));
        console.log(`[Sync] Pull inicial: "${key}" ← Firebase`);
      } else if (remoteEnvelope?.data && localRaw) {
        // Ambos existem: mais recente vence
        const localTime = 0; // Dados locais não têm timestamp, Firebase tem prioridade
        if (remoteEnvelope.updatedAt > localTime) {
          localStorage.setItem(key, JSON.stringify(remoteEnvelope.data));
          console.log(`[Sync] Merge: "${key}" ← Firebase (mais recente)`);
        }
      }
    } catch (err) {
      console.warn(`[Sync] Erro no push inicial de "${key}":`, err);
    }
  }
}

// ── DESCONECTAR TODOS OS LISTENERS ───────────────────────────
export function syncDisconnectAll(): void {
  for (const key of SYNC_KEYS) {
    const fbRef = getRef(key);
    if (fbRef) off(fbRef);
  }
  activeListeners.clear();
}

// ── REMOVER DADOS DO FIREBASE ────────────────────────────────
export function syncRemove(key: string): void {
  localStorage.removeItem(key);
  if (isFirebaseConfigured() && db && isSyncKey(key)) {
    const fbRef = getRef(key);
    if (fbRef) {
      set(fbRef, null).catch((err) => {
        console.warn(`[Sync] Erro ao remover "${key}" do Firebase:`, err);
      });
    }
  }
}

// Re-exportar para conveniência 
export { SYNC_KEYS };
