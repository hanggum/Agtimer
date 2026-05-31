import React from 'react';
import { Clock, Plus, Search, Play, Pause, RotateCcw, Trash2, Sun, Moon, Settings, Cloud } from 'lucide-react';

interface HeaderProps {
  timerCount: number;
  maxTimers: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: 'all' | 'active' | 'paused' | 'completed';
  onFilterChange: (filter: 'all' | 'active' | 'paused' | 'completed') => void;
  onAddClick: () => void;
  onStartAll: () => void;
  onPauseAll: () => void;
  onResetAll: () => void;
  onClearAll: () => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  onSettingsClick: () => void;
  isSyncConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  timerCount,
  maxTimers,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  onAddClick,
  onStartAll,
  onPauseAll,
  onResetAll,
  onClearAll,
  theme,
  onThemeToggle,
  onSettingsClick,
  isSyncConnected,
}) => {
  return (
    <header className="app-header">
      <div className="header-top">
        <div className="brand">
          <Clock className="brand-icon" size={32} />
          <h1>NexusTimer</h1>
          <span className="stats-badge">
            {timerCount} / {maxTimers} Timers
          </span>
          {isSyncConnected && (
            <span className="stats-badge" style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: 'var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.5rem'
            }}>
              <Cloud size={14} />
              <span style={{ fontSize: '0.75rem' }}>Cloud Synced</span>
            </span>
          )}
        </div>

        <div className="header-controls">
          <button
            className="btn btn-secondary btn-icon-only"
            onClick={onThemeToggle}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme mode"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            className="btn btn-secondary btn-icon-only"
            onClick={onSettingsClick}
            title="설정 (Settings)"
            aria-label="Open settings dashboard"
          >
            <Settings size={20} />
          </button>

          <button
            className="btn btn-primary"
            onClick={onAddClick}
            disabled={timerCount >= maxTimers}
            title={timerCount >= maxTimers ? 'Timer limit (50) reached' : 'Create new timer'}
            aria-label="Add new timer"
          >
            <Plus size={20} />
            <span>Add Timer</span>
          </button>
        </div>
      </div>

      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search timers..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search timers"
          />
        </div>

        <div className="filter-tabs">
          {(['all', 'active', 'paused', 'completed'] as const).map((filter) => (
            <button
              key={filter}
              className={`filter-tab ${activeFilter === filter ? 'active' : ''}`}
              onClick={() => onFilterChange(filter)}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {timerCount > 0 && (
        <div className="bulk-actions-bar">
          <button
            className="btn btn-secondary"
            onClick={onStartAll}
            title="Start all timers"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            <Play size={14} />
            <span>Start All</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={onPauseAll}
            title="Pause all running timers"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            <Pause size={14} />
            <span>Pause All</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={onResetAll}
            title="Reset all timers to original duration"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            <RotateCcw size={14} />
            <span>Reset All</span>
          </button>

          <button
            className="btn btn-danger"
            onClick={onClearAll}
            title="Delete all timers"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', marginLeft: 'auto' }}
          >
            <Trash2 size={14} />
            <span>Delete All</span>
          </button>
        </div>
      )}
    </header>
  );
};
export default Header;
