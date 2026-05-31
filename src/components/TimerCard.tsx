import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Edit2, Trash2, BellRing } from 'lucide-react';
import { alertSound } from './AlertSound';

export interface TimerItem {
  id: string;
  title: string;
  category: string;
  colorClass: string;
  totalDurationMs: number;
  isRunning: boolean;
  targetTimestamp: number | null;
  remainingMs: number;
  soundPlayed: boolean;
  updatedAt: number;
}

interface TimerCardProps {
  timer: TimerItem;
  onUpdate: (timer: TimerItem) => void;
  onDelete: (id: string) => void;
  onEdit: (timer: TimerItem) => void;
}

export const TimerCard: React.FC<TimerCardProps> = ({ timer, onUpdate, onDelete, onEdit }) => {
  const { id, title, category, colorClass, totalDurationMs, isRunning, targetTimestamp, remainingMs, soundPlayed } = timer;

  // Local state to track the active remaining time for rendering
  const [currentRemaining, setCurrentRemaining] = useState<number>(() => {
    if (isRunning && targetTimestamp !== null) {
      return Math.max(0, targetTimestamp - Date.now());
    }
    return remainingMs;
  });

  // Keep rendering in sync when timer object changes (e.g. paused or reset externally)
  useEffect(() => {
    if (isRunning && targetTimestamp !== null) {
      setCurrentRemaining(Math.max(0, targetTimestamp - Date.now()));
    } else {
      setCurrentRemaining(remainingMs);
    }
  }, [isRunning, targetTimestamp, remainingMs]);

  // Active countdown interval
  useEffect(() => {
    if (!isRunning || targetTimestamp === null) return;

    const intervalId = setInterval(() => {
      const timeLeft = Math.max(0, targetTimestamp - Date.now());
      setCurrentRemaining(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(intervalId);
        
        // Play sound if not already played
        if (!soundPlayed) {
          alertSound.play();
          onUpdate({
            ...timer,
            isRunning: false,
            remainingMs: 0,
            targetTimestamp: null,
            soundPlayed: true
          });
        }
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [isRunning, targetTimestamp, soundPlayed, timer, onUpdate]);

  const handleTogglePlay = () => {
    if (isRunning) {
      // Pause
      const newRemaining = Math.max(0, (targetTimestamp ?? Date.now()) - Date.now());
      onUpdate({
        ...timer,
        isRunning: false,
        remainingMs: newRemaining,
        targetTimestamp: null
      });
    } else {
      // Play
      // If completed, do nothing or reset first. Let's make it so if they press play at 0, it resets and plays.
      const startRemaining = remainingMs <= 0 ? totalDurationMs : remainingMs;
      onUpdate({
        ...timer,
        isRunning: true,
        remainingMs: startRemaining,
        targetTimestamp: Date.now() + startRemaining,
        soundPlayed: false // Reset sound played state so it rings again
      });
    }
  };

  const handleReset = () => {
    onUpdate({
      ...timer,
      isRunning: false,
      remainingMs: totalDurationMs,
      targetTimestamp: null,
      soundPlayed: false
    });
  };

  // Helper to format remaining time
  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const d = Math.floor(totalSeconds / (3600 * 24));
    const h = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');

    return {
      days: String(d),
      hours: pad(h),
      minutes: pad(m),
      seconds: pad(s),
      isCompleted: totalSeconds <= 0
    };
  };

  const timeParts = formatTime(currentRemaining);
  const isCompleted = timeParts.isCompleted;

  // Calculate SVG progress ring values
  const radius = 54;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = totalDurationMs > 0 ? (currentRemaining / totalDurationMs) * 100 : 0;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Determine current status string
  let statusText = 'Paused';
  let statusDotClass = 'status-dot paused';
  if (isRunning) {
    statusText = 'Running';
    statusDotClass = 'status-dot running';
  } else if (isCompleted) {
    statusText = 'Completed';
    statusDotClass = 'status-dot completed';
  }

  return (
    <div className={`glass-panel timer-card ${colorClass} ${isCompleted ? 'completed-pulse' : ''}`}>
      {isCompleted && <div className="timer-alert-overlay" />}
      
      <div className="timer-card-header">
        <div className="timer-info">
          <h3 className="timer-title" title={title}>{title}</h3>
          <div className="timer-meta">
            <span className="category-tag">{category || 'General'}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span className={statusDotClass}></span>
              <span>{statusText}</span>
            </div>
          </div>
        </div>
        
        {isCompleted && (
          <div style={{ color: 'var(--color-danger)', animation: 'pulse-danger 1s infinite alternate' }}>
            <BellRing size={20} />
          </div>
        )}
      </div>

      <div className="timer-visual">
        <svg className="progress-svg" width="128" height="128" viewBox="0 0 128 128">
          <circle
            className="progress-track"
            cx="64"
            cy="64"
            r={radius}
            strokeWidth={strokeWidth}
          />
          <circle
            className="progress-bar"
            cx="64"
            cy="64"
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        
        <div className="timer-display-wrapper">
          <div className="timer-time-main">
            {timeParts.days !== '0' ? `${timeParts.days}d ` : ''}
            {timeParts.hours}:{timeParts.minutes}:{timeParts.seconds}
          </div>
          <div className="timer-time-sub">
            {isCompleted ? 'FINISHED' : 'REMAINING'}
          </div>
        </div>
      </div>

      <div className="timer-actions">
        <div className="timer-controls-left">
          <button
            className={`btn btn-icon-only ${isRunning ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleTogglePlay}
            title={isRunning ? 'Pause' : 'Start'}
            aria-label={isRunning ? 'Pause timer' : 'Start timer'}
          >
            {isRunning ? <Pause size={18} /> : <Play size={18} />}
          </button>
          
          <button
            className="btn btn-secondary btn-icon-only"
            onClick={handleReset}
            title="Reset"
            aria-label="Reset timer"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        <div className="timer-controls-right">
          <button
            className="btn btn-secondary btn-icon-only"
            onClick={() => onEdit(timer)}
            title="Edit"
            style={{ padding: '0.5rem', opacity: 0.8 }}
            aria-label="Edit timer settings"
          >
            <Edit2 size={16} />
          </button>
          
          <button
            className="btn btn-secondary btn-icon-only"
            onClick={() => onDelete(id)}
            title="Delete"
            style={{ padding: '0.5rem', opacity: 0.8, color: 'var(--color-danger)' }}
            aria-label="Delete timer"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
