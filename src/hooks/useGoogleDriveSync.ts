import React, { useState, useEffect, useCallback } from 'react';
import { googleSyncManager } from '../components/GoogleSyncManager';
import type { SyncData } from '../components/GoogleSyncManager';
import { useLocalStorage } from './useLocalStorage';
import type { TimerItem } from '../components/TimerCard';

const DEFAULT_CATEGORIES = ['Antigravity', 'Manus', 'Game', 'Etc'];

export function useGoogleDriveSync() {
  const [clientId, setClientId] = useLocalStorage<string>('nexus-google-client-id', '');
  const [autoSync, setAutoSync] = useLocalStorage<boolean>('nexus-google-auto-sync', false);
  const [lastSynced, setLastSynced] = useLocalStorage<number | null>('nexus-google-last-synced', null);
  const [categories, setCategories] = useLocalStorage<string[]>('nexus-categories', DEFAULT_CATEGORIES);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = React.useRef(false);

  // Initialize and load Google Identity Services SDK script
  useEffect(() => {
    googleSyncManager.loadScripts()
      .catch((err) => {
        console.error('Failed to load Google SDK script:', err);
        setError('Google SDK를 불러오지 못했습니다. 네트워크를 확인해 주세요.');
      });
  }, []);

  // Update connected status based on active session in SyncManager
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(googleSyncManager.isConnected());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const cancelConnect = useCallback(() => {
    cancelledRef.current = true;
    setIsLoading(false);
    setError(null);
    // Disconnect any partial state
    googleSyncManager.disconnect();
    setIsConnected(false);
  }, []);

  const connect = useCallback(async (customClientId?: string) => {
    cancelledRef.current = false;
    setIsLoading(true);
    setError(null);
    const targetClientId = customClientId !== undefined ? customClientId : clientId;

    if (!targetClientId) {
      setError('구글 클라이언트 ID가 입력되지 않았습니다. 설정에서 입력해 주세요.');
      setIsLoading(false);
      return false;
    }

    try {
      if (customClientId !== undefined) {
        setClientId(customClientId);
      }
      await googleSyncManager.signIn(targetClientId);

      // If cancelled while waiting for OAuth popup
      if (cancelledRef.current) {
        return false;
      }

      setIsConnected(true);
      setError(null);
      return true;
    } catch (err: any) {
      if (cancelledRef.current) {
        return false; // Silently discard error if user cancelled
      }
      console.error('OAuth connection error:', err);
      setError(err.message || '구글 인증에 실패했습니다.');
      setIsConnected(false);
      return false;
    } finally {
      if (!cancelledRef.current) {
        setIsLoading(false);
      }
    }
  }, [clientId, setClientId]);

  const disconnect = useCallback(() => {
    googleSyncManager.disconnect();
    setIsConnected(false);
  }, []);

  /**
   * Pull and merge data from Google Drive
   */
  const syncNow = useCallback(async (localTimers: TimerItem[]): Promise<{ timers: TimerItem[]; categories: string[] } | null> => {
    if (!clientId) {
      setError('구글 클라이언트 ID가 필요합니다.');
      return null;
    }
    setIsLoading(true);
    setError(null);

    try {
      const token = await googleSyncManager.getValidToken(clientId);
      const remoteData = await googleSyncManager.downloadData(token);

      let mergedTimers: TimerItem[] = [...localTimers];
      let mergedCategories: string[] = [...categories];

      if (remoteData) {
        // 1. Merge Timers
        if (remoteData.timers) {
          const mergedMap = new Map<string, TimerItem>();
          localTimers.forEach(t => mergedMap.set(t.id, t));

          remoteData.timers.forEach((rt: TimerItem) => {
            const local = mergedMap.get(rt.id);
            if (!local) {
              mergedMap.set(rt.id, rt);
            } else {
              const localUpdated = local.updatedAt || 0;
              const remoteUpdated = rt.updatedAt || 0;
              
              if (remoteUpdated > localUpdated) {
                mergedMap.set(rt.id, rt);
              }
            }
          });
          mergedTimers = Array.from(mergedMap.values());
        }

        // 2. Merge Categories (unique merge preserving order)
        if (remoteData.categories && Array.isArray(remoteData.categories)) {
          const uniqueCats = new Set([...categories, ...remoteData.categories]);
          mergedCategories = Array.from(uniqueCats);
          setCategories(mergedCategories);
        }
      }

      // Upload the merged data back to the cloud
      const syncPayload: SyncData = {
        timers: mergedTimers,
        categories: mergedCategories,
        syncedAt: Date.now()
      };
      await googleSyncManager.uploadData(token, syncPayload);

      setLastSynced(Date.now());
      setIsConnected(true);
      return { timers: mergedTimers, categories: mergedCategories };
    } catch (err: any) {
      console.error('Sync error:', err);
      setError(err.message || '동기화 중 오류가 발생했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [clientId, setLastSynced, categories, setCategories]);

  /**
   * Push current local timers and categories to Google Drive, overwriting cloud data
   */
  const pushData = useCallback(async (localTimers: TimerItem[]): Promise<boolean> => {
    if (!clientId) return false;
    setIsLoading(true);
    setError(null);
    try {
      const token = await googleSyncManager.getValidToken(clientId);
      const syncPayload: SyncData = {
        timers: localTimers,
        categories: categories,
        syncedAt: Date.now()
      };
      await googleSyncManager.uploadData(token, syncPayload);
      setLastSynced(Date.now());
      setIsConnected(true);
      return true;
    } catch (err: any) {
      console.error('Push error:', err);
      setError(err.message || '데이터 업로드 중 오류가 발생했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [clientId, setLastSynced, categories]);

  /**
   * Pull timers and categories from Google Drive, overwriting local data
   */
  const pullData = useCallback(async (): Promise<{ timers: TimerItem[]; categories: string[] } | null> => {
    if (!clientId) return null;
    setIsLoading(true);
    setError(null);
    try {
      const token = await googleSyncManager.getValidToken(clientId);
      const remoteData = await googleSyncManager.downloadData(token);
      if (remoteData) {
        setLastSynced(Date.now());
        setIsConnected(true);

        const pulledTimers = remoteData.timers || [];
        const pulledCategories = remoteData.categories || DEFAULT_CATEGORIES;
        
        setCategories(pulledCategories);
        return { timers: pulledTimers, categories: pulledCategories };
      }
      return { timers: [], categories: DEFAULT_CATEGORIES };
    } catch (err: any) {
      console.error('Pull error:', err);
      setError(err.message || '데이터 다운로드 중 오류가 발생했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [clientId, setLastSynced, setCategories]);

  return {
    clientId,
    setClientId,
    autoSync,
    setAutoSync,
    lastSynced,
    isConnected,
    isLoading,
    error,
    connect,
    cancelConnect,
    disconnect,
    syncNow,
    pushData,
    pullData,
    categories,
    setCategories
  };
}
export default useGoogleDriveSync;
