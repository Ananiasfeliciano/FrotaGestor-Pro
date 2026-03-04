/**
 * useSyncState — React hook para estado sincronizado em tempo real.
 * 
 * Substitui o padrão readStorage/writeStorage/useState por um hook
 * que mantém os dados sincronizados entre Web e Desktop via Firebase.
 * 
 * Uso:
 *   const [vehicles, setVehicles] = useSyncState<Vehicle[]>('fleet_vehicles', []);
 *   // setVehicles grava no localStorage + Firebase automaticamente
 *   // Mudanças de outros dispositivos atualizam o estado em tempo real
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { syncRead, syncWrite, syncSubscribe, isSyncKey, type SyncKey } from './syncStorage';

export function useSyncState<T>(key: string, fallback: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => syncRead(key, fallback));
  const stateRef = useRef(state);
  stateRef.current = state;

  // Escutar mudanças do Firebase (tempo real)
  useEffect(() => {
    if (!isSyncKey(key)) return;

    const cleanup = syncSubscribe<T>(key as SyncKey, (remoteData) => {
      setState(remoteData);
    });

    return cleanup;
  }, [key]);

  // Setter que grava local + Firebase
  const setSyncState = useCallback((value: T | ((prev: T) => T)) => {
    const newValue = typeof value === 'function' 
      ? (value as (prev: T) => T)(stateRef.current) 
      : value;
    
    setState(newValue);
    syncWrite(key, newValue);
  }, [key]);

  return [state, setSyncState];
}

/**
 * useSyncInit — Hook para inicializar a sincronização na montagem do app.
 * Deve ser usado uma vez no componente raiz (App.tsx).
 */
export { syncInitialPush, syncDisconnectAll } from './syncStorage';
