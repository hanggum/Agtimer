import { useState, useEffect, useCallback } from 'react';
import { firebaseSyncManager } from '../components/FirebaseSyncManager';
import type { SyncData } from '../components/FirebaseSyncManager';
import { useLocalStorage } from './useLocalStorage';
import type { TimerItem } from '../components/TimerCard';
import type { User } from 'firebase/auth';

const DEFAULT_CATEGORIES = ['Antigravity', 'Manus', 'Game', 'Etc'];

export function useFirebaseSync() {
  const [firebaseConfig, setFirebaseConfig] = useLocalStorage<string>('nexus-firebase-config-json', '');
  const [autoSync, setAutoSync] = useLocalStorage<boolean>('nexus-firebase-auto-sync', false);
  const [lastSynced, setLastSynced] = useLocalStorage<number | null>('nexus-firebase-last-synced', null);
  const [categories, setCategories] = useLocalStorage<string[]>('nexus-categories', DEFAULT_CATEGORIES);

  const [isConfigured, setIsConfigured] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize firebase when the hook mounts if config exists
  useEffect(() => {
    const configStr = localStorage.getItem('nexus-firebase-config'); // check from manager storage key
    if (configStr) {
      try {
        firebaseSyncManager.initFirebase(JSON.parse(configStr));
        setIsConfigured(true);
      } catch (e) {
        console.error('Firebase auto-init failed:', e);
        setError('파이어베이스 초기화에 실패했습니다. 설정을 확인해 주세요.');
      }
    }
  }, []);

  // Monitor auth state changes
  useEffect(() => {
    if (!isConfigured) {
      setIsConnected(false);
      setUserEmail(null);
      return;
    }

    const unsubscribe = firebaseSyncManager.onAuthChange((user: User | null) => {
      setIsConnected(!!user);
      setUserEmail(user ? user.email : null);
    });

    return () => unsubscribe();
  }, [isConfigured]);

  /**
   * Save configuration and initialize Firebase
   */
  const saveConfig = useCallback((configText: string) => {
    setError(null);
    try {
      firebaseSyncManager.saveConfig(configText);
      setFirebaseConfig(configText);
      setIsConfigured(true);
      return true;
    } catch (err: any) {
      setError(err.message || '설정 저장 중 오류가 발생했습니다.');
      setIsConfigured(false);
      return false;
    }
  }, [setFirebaseConfig]);

  /**
   * Clear configuration
   */
  const clearConfig = useCallback(() => {
    firebaseSyncManager.clearConfig();
    setFirebaseConfig('');
    setIsConfigured(false);
    setIsConnected(false);
    setUserEmail(null);
    setAutoSync(false);
    setLastSynced(null);
    setError(null);
  }, [setFirebaseConfig, setAutoSync, setLastSynced]);

  /**
   * Sign up user
   */
  const signUp = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await firebaseSyncManager.signUp(email, password);
      return true;
    } catch (err: any) {
      console.error('Firebase Sign Up error:', err);
      // Map common errors to friendly Korean messages
      let msg = '회원가입에 실패했습니다.';
      if (err.code === 'auth/email-already-in-use') msg = '이미 사용 중인 이메일 주소입니다.';
      else if (err.code === 'auth/invalid-email') msg = '유효하지 않은 이메일 형식입니다.';
      else if (err.code === 'auth/weak-password') msg = '비밀번호는 최소 6자 이상이어야 합니다.';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sign in user
   */
  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await firebaseSyncManager.signIn(email, password);
      return true;
    } catch (err: any) {
      console.error('Firebase Sign In error:', err);
      let msg = '로그인에 실패했습니다.';
      if (err.code === 'auth/invalid-credential') msg = '이메일 또는 비밀번호가 일치하지 않습니다.';
      else if (err.code === 'auth/user-not-found') msg = '가입되지 않은 이메일입니다.';
      else if (err.code === 'auth/wrong-password') msg = '비밀번호가 올바르지 않습니다.';
      setError(msg);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Log out user
   */
  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await firebaseSyncManager.logout();
      return true;
    } catch (err: any) {
      console.error('Firebase Sign Out error:', err);
      setError('로그아웃 중 오류가 발생했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sync now (pull, merge, push)
   */
  const syncNow = useCallback(async (localTimers: TimerItem[]): Promise<{ timers: TimerItem[]; categories: string[] } | null> => {
    const user = firebaseSyncManager.getCurrentUser();
    if (!user) {
      setError('로그인이 필요합니다.');
      return null;
    }
    setIsLoading(true);
    setError(null);

    try {
      const remoteData = await firebaseSyncManager.downloadData(user.uid);

      let mergedTimers: TimerItem[] = [...localTimers];
      let mergedCategories: string[] = [...categories];

      if (remoteData) {
        // 1. Merge Timers based on updatedAt
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

        // 2. Merge Categories (unique preserve order)
        if (remoteData.categories && Array.isArray(remoteData.categories)) {
          const uniqueCats = new Set([...categories, ...remoteData.categories]);
          mergedCategories = Array.from(uniqueCats);
          setCategories(mergedCategories);
        }
      }

      // Write merged data back
      const syncPayload: SyncData = {
        timers: mergedTimers,
        categories: mergedCategories,
        syncedAt: Date.now()
      };
      await firebaseSyncManager.uploadData(user.uid, syncPayload);

      setLastSynced(Date.now());
      return { timers: mergedTimers, categories: mergedCategories };
    } catch (err: any) {
      console.error('Firebase Sync error:', err);
      setError('동기화 중 오류가 발생했습니다: ' + (err.message || ''));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [categories, setCategories, setLastSynced]);

  /**
   * Push local data (overwrite remote)
   */
  const pushData = useCallback(async (localTimers: TimerItem[]): Promise<boolean> => {
    const user = firebaseSyncManager.getCurrentUser();
    if (!user) return false;
    setIsLoading(true);
    setError(null);
    try {
      const syncPayload: SyncData = {
        timers: localTimers,
        categories: categories,
        syncedAt: Date.now()
      };
      await firebaseSyncManager.uploadData(user.uid, syncPayload);
      setLastSynced(Date.now());
      return true;
    } catch (err: any) {
      console.error('Firebase Push error:', err);
      setError('클라우드에 데이터를 올리는 중 오류가 발생했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [categories, setLastSynced]);

  /**
   * Pull remote data (overwrite local)
   */
  const pullData = useCallback(async (): Promise<{ timers: TimerItem[]; categories: string[] } | null> => {
    const user = firebaseSyncManager.getCurrentUser();
    if (!user) return null;
    setIsLoading(true);
    setError(null);
    try {
      const remoteData = await firebaseSyncManager.downloadData(user.uid);
      if (remoteData) {
        setLastSynced(Date.now());

        const pulledTimers = remoteData.timers || [];
        const pulledCategories = remoteData.categories || DEFAULT_CATEGORIES;
        
        setCategories(pulledCategories);
        return { timers: pulledTimers, categories: pulledCategories };
      }
      return { timers: [], categories: DEFAULT_CATEGORIES };
    } catch (err: any) {
      console.error('Firebase Pull error:', err);
      setError('클라우드에서 데이터를 가져오는 중 오류가 발생했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [setCategories, setLastSynced]);

  return {
    firebaseConfig,
    autoSync,
    setAutoSync,
    lastSynced,
    isConfigured,
    isConnected,
    userEmail,
    isLoading,
    error,
    saveConfig,
    clearConfig,
    signUp,
    signIn,
    logout,
    syncNow,
    pushData,
    pullData,
    categories,
    setCategories
  };
}

export default useFirebaseSync;
