import { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useGoogleDriveSync } from './hooks/useGoogleDriveSync';
import { TimerCard } from './components/TimerCard';
import type { TimerItem } from './components/TimerCard';
import { TimerModal } from './components/TimerModal';
import { SettingsPanel } from './components/SettingsPanel';
import { Header } from './components/Header';
import { Clock, Plus } from 'lucide-react';

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

const MAX_TIMERS = 50;

const DEFAULT_TIMERS: TimerItem[] = [
  {
    id: 'default-timer-1',
    title: 'Weekly Boss Reset',
    category: 'Gaming',
    colorClass: 'theme-indigo',
    totalDurationMs: (6 * 24 + 23) * 3600 * 1000, // 6 days 23 hours = 601,200,000 ms
    isRunning: false,
    targetTimestamp: null,
    remainingMs: (6 * 24 + 23) * 3600 * 1000,
    soundPlayed: false,
    updatedAt: Date.now(),
  }
];

export function App() {
  const [timers, setTimers] = useLocalStorage<TimerItem[]>('nexus-timers', DEFAULT_TIMERS);
  const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('nexus-timer-theme', 'dark');
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');

  // Modal & Settings state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingTimer, setEditingTimer] = useState<TimerItem | null>(null);

  // Google Drive Sync Hook
  const {
    clientId,
    setClientId,
    autoSync,
    setAutoSync,
    lastSynced,
    isConnected,
    isLoading: isSyncLoading,
    error: syncError,
    connect: connectSync,
    cancelConnect: cancelConnectSync,
    disconnect: disconnectSync,
    syncNow,
    pushData,
    pullData,
    categories,
    setCategories,
  } = useGoogleDriveSync();

  // Sync theme attribute with document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Startup Sync: Sync with Google Drive once when connected
  useEffect(() => {
    if (isConnected && autoSync) {
      syncNow(timers).then((merged) => {
        if (merged) {
          setTimers(merged.timers);
        }
      });
    }
  }, [isConnected]);

  // Handle Theme Toggle
  const handleThemeToggle = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Helper helper to upload data in background for auto-sync
  const triggerAutoSync = (updatedTimers: TimerItem[]) => {
    if (isConnected && autoSync) {
      pushData(updatedTimers).catch((e) => console.warn('Auto-sync push failed:', e));
    }
  };

  // CRUD Actions
  const handleSaveTimer = (timerData: {
    title: string;
    category: string;
    colorClass: string;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }) => {
    const totalMs = ((timerData.days * 24 + timerData.hours) * 3600 + timerData.minutes * 60 + timerData.seconds) * 1000;

    let updatedList: TimerItem[];

    if (editingTimer) {
      // Edit mode
      updatedList = timers.map((t) => {
        if (t.id === editingTimer.id) {
          let isRunning = t.isRunning;
          let targetTimestamp = t.targetTimestamp;
          let remainingMs = t.remainingMs;

          if (t.totalDurationMs !== totalMs) {
            isRunning = false;
            targetTimestamp = null;
            remainingMs = totalMs;
          }

          return {
            ...t,
            title: timerData.title,
            category: timerData.category,
            colorClass: timerData.colorClass,
            totalDurationMs: totalMs,
            isRunning,
            targetTimestamp,
            remainingMs,
            soundPlayed: false,
            updatedAt: Date.now()
          };
        }
        return t;
      });
      setEditingTimer(null);
    } else {
      // Create mode
      if (timers.length >= MAX_TIMERS) return;

      const newTimer: TimerItem = {
        id: generateId(),
        title: timerData.title,
        category: timerData.category,
        colorClass: timerData.colorClass,
        totalDurationMs: totalMs,
        isRunning: false,
        targetTimestamp: null,
        remainingMs: totalMs,
        soundPlayed: false,
        updatedAt: Date.now()
      };

      updatedList = [newTimer, ...timers];
    }

    setTimers(updatedList);
    triggerAutoSync(updatedList);
  };

  const handleUpdateTimer = (updatedTimer: TimerItem) => {
    const freshTimer = {
      ...updatedTimer,
      updatedAt: Date.now()
    };
    const updatedList = timers.map((t) => (t.id === updatedTimer.id ? freshTimer : t));
    setTimers(updatedList);
    triggerAutoSync(updatedList);
  };

  const handleDeleteTimer = (id: string) => {
    if (confirm('Are you sure you want to delete this timer?')) {
      const updatedList = timers.filter((t) => t.id !== id);
      setTimers(updatedList);
      triggerAutoSync(updatedList);
    }
  };

  const handleEditClick = (timer: TimerItem) => {
    setEditingTimer(timer);
    setIsModalOpen(true);
  };

  // Bulk Actions
  const handleStartAll = () => {
    const updatedList = timers.map((t) => {
      const currentRemaining = t.isRunning && t.targetTimestamp
        ? Math.max(0, t.targetTimestamp - Date.now())
        : t.remainingMs;

      if (!t.isRunning && currentRemaining > 0) {
        return {
          ...t,
          isRunning: true,
          targetTimestamp: Date.now() + currentRemaining,
          soundPlayed: false,
          updatedAt: Date.now()
        };
      }
      return t;
    });

    setTimers(updatedList);
    triggerAutoSync(updatedList);
  };

  const handlePauseAll = () => {
    const updatedList = timers.map((t) => {
      if (t.isRunning && t.targetTimestamp !== null) {
        const currentRemaining = Math.max(0, t.targetTimestamp - Date.now());
        return {
          ...t,
          isRunning: false,
          remainingMs: currentRemaining,
          targetTimestamp: null,
          updatedAt: Date.now()
        };
      }
      return t;
    });

    setTimers(updatedList);
    triggerAutoSync(updatedList);
  };

  const handleResetAll = () => {
    if (confirm('Reset all timers to their full starting duration?')) {
      const updatedList = timers.map((t) => ({
        ...t,
        isRunning: false,
        remainingMs: t.totalDurationMs,
        targetTimestamp: null,
        soundPlayed: false,
        updatedAt: Date.now()
      }));

      setTimers(updatedList);
      triggerAutoSync(updatedList);
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete ALL timers? This action cannot be undone.')) {
      setTimers([]);
      triggerAutoSync([]);
    }
  };

  // Google sync direct triggers
  const handleManualSync = async () => {
    const merged = await syncNow(timers);
    if (merged) {
      setTimers(merged.timers);
      alert('동기화가 성공적으로 완료되었습니다.');
    }
  };

  const handleManualPush = async () => {
    if (confirm('현재 기기의 데이터로 구글 드라이브 데이터를 덮어쓰시겠습니까?')) {
      const success = await pushData(timers);
      if (success) alert('구글 드라이브로 백업이 완료되었습니다.');
    }
  };

  const handleManualPull = async () => {
    if (confirm('구글 드라이브에 저장된 데이터로 현재 타이머를 덮어쓰시겠습니까? (현재 기기의 정보는 손실됩니다)')) {
      const remoteData = await pullData();
      if (remoteData !== null) {
        setTimers(remoteData.timers);
        alert('구글 드라이브로부터 데이터를 성공적으로 불러왔습니다.');
      }
    }
  };

  // Search & Filter matching logic
  const filteredTimers = timers.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());

    const currentRemaining = t.isRunning && t.targetTimestamp
      ? Math.max(0, t.targetTimestamp - Date.now())
      : t.remainingMs;

    if (!matchesSearch) return false;

    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return t.isRunning && currentRemaining > 0;
    if (activeFilter === 'paused') return !t.isRunning && currentRemaining > 0;
    if (activeFilter === 'completed') return currentRemaining <= 0;

    return true;
  });

  return (
    <div className="app-container">
      <Header
        timerCount={timers.length}
        maxTimers={MAX_TIMERS}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onAddClick={() => {
          setEditingTimer(null);
          setIsModalOpen(true);
        }}
        onStartAll={handleStartAll}
        onPauseAll={handlePauseAll}
        onResetAll={handleResetAll}
        onClearAll={handleClearAll}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        onSettingsClick={() => setIsSettingsOpen(true)}
        isSyncConnected={isConnected}
      />

      <main style={{ flex: 1 }}>
        {filteredTimers.length > 0 ? (
          <div className="timer-grid">
            {filteredTimers.map((timer) => (
              <TimerCard
                key={timer.id}
                timer={timer}
                onUpdate={handleUpdateTimer}
                onDelete={handleDeleteTimer}
                onEdit={handleEditClick}
              />
            ))}
          </div>
        ) : (
          <div className="glass-panel empty-state">
            <div className="empty-icon-wrapper">
              <Clock size={40} />
            </div>
            {timers.length === 0 ? (
              <>
                <h3>등록된 타이머가 없습니다</h3>
                <p>첫 타이머를 생성해 실시간 이벤트와 재설정 시각을 관리하세요. 최대 50개까지 지원됩니다.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingTimer(null);
                    setIsModalOpen(true);
                  }}
                  style={{ marginTop: '0.5rem' }}
                >
                  <Plus size={18} />
                  <span>타이머 생성</span>
                </button>
              </>
            ) : (
              <>
                <h3>검색 결과가 없습니다</h3>
                <p>현재 상태 필터 내에서 "{searchQuery}"와(과) 일치하는 타이머를 찾을 수 없습니다.</p>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveFilter('all');
                  }}
                  style={{ marginTop: '0.5rem' }}
                >
                  필터 초기화
                </button>
              </>
            )}
          </div>
        )}
      </main>

      <TimerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTimer(null);
        }}
        onSave={handleSaveTimer}
        editingTimer={editingTimer}
      />

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        clientId={clientId}
        onClientIdChange={setClientId}
        autoSync={autoSync}
        onAutoSyncToggle={setAutoSync}
        isConnected={isConnected}
        isLoading={isSyncLoading}
        error={syncError}
        lastSynced={lastSynced}
        onConnect={connectSync}
        onCancelConnect={cancelConnectSync}
        onDisconnect={disconnectSync}
        onSyncNow={handleManualSync}
        onPush={handleManualPush}
        onPull={handleManualPull}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        categories={categories}
        onCategoriesChange={setCategories}
      />
    </div>
  );
}

export default App;
