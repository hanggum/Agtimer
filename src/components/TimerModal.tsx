import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { TimerItem } from './TimerCard';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface TimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (timerData: { title: string; category: string; colorClass: string; days: number; hours: number; minutes: number; seconds: number }) => void;
  editingTimer: TimerItem | null;
}

const COLOR_OPTIONS = [
  { class: 'theme-indigo', color: '#6366f1', label: 'Indigo' },
  { class: 'theme-blue', color: '#3b82f6', label: 'Blue' },
  { class: 'theme-emerald', color: '#10b981', label: 'Emerald' },
  { class: 'theme-purple', color: '#a855f7', label: 'Purple' },
  { class: 'theme-pink', color: '#ec4899', label: 'Pink' },
  { class: 'theme-orange', color: '#f97316', label: 'Orange' },
];

const DEFAULT_CATEGORIES = ['Antigravity', 'Manus', 'Game', 'Etc'];

export const TimerModal: React.FC<TimerModalProps> = ({ isOpen, onClose, onSave, editingTimer }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [colorClass, setColorClass] = useState('theme-indigo');
  const [categories] = useLocalStorage<string[]>('nexus-categories', DEFAULT_CATEGORIES);

  // Duration states
  const [days, setDays] = useState<number>(6);
  const [hours, setHours] = useState<number>(23);
  const [minutes, setMinutes] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);

  // Sync inputs with editingTimer if it's set
  useEffect(() => {
    if (editingTimer) {
      setTitle(editingTimer.title);
      setCategory(editingTimer.category);
      setColorClass(editingTimer.colorClass);

      // Convert total duration back to D, H, M, S
      const totalSeconds = Math.ceil(editingTimer.totalDurationMs / 1000);
      const d = Math.floor(totalSeconds / (3600 * 24));
      const h = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;

      setDays(d);
      setHours(h);
      setMinutes(m);
      setSeconds(s);
    } else {
      // Default creation state: 6d 23h
      setTitle('');
      setCategory(categories[0] || 'Etc');
      setColorClass('theme-indigo');
      setDays(6);
      setHours(23);
      setMinutes(0);
      setSeconds(0);
    }
  }, [editingTimer, isOpen]);

  // Handle keyboard events (ESC to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('Please enter a timer title.');
      return;
    }

    const totalSeconds = (days * 24 * 3600) + (hours * 3600) + (minutes * 60) + seconds;
    if (totalSeconds <= 0) {
      alert('Timer duration must be greater than 0 seconds.');
      return;
    }

    onSave({
      title: title.trim(),
      category: category || categories[0] || 'Etc',
      colorClass,
      days,
      hours,
      minutes,
      seconds
    });
    
    onClose();
  };

  const handleNumberInput = (
    value: string, 
    setter: React.Dispatch<React.SetStateAction<number>>, 
    max: number | null = null
  ) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) { setter(0); return; }
    if (num < 0) { setter(0); return; }
    if (max !== null && num > max) { setter(max); return; }
    setter(num);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {editingTimer ? 'Edit Timer' : 'Create New Timer'}
          </h2>
          <button className="btn-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="timer-title-input">Title</label>
            <input
              type="text"
              id="timer-title-input"
              className="form-input"
              placeholder="e.g. Weekly Quest, Pizza, Workout"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={40}
              required
              autoFocus
            />
          </div>

          {/* Category Dropdown */}
          <div className="form-group">
            <label className="form-label" htmlFor="timer-category-select">Category</label>
            <select
              id="timer-category-select"
              className="form-input form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Select category"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div className="form-group">
            <label className="form-label">Duration</label>
            <div className="duration-inputs">
              <div className="time-unit-wrapper">
                <input
                  type="number"
                  aria-label="Days"
                  className="time-unit-input"
                  min="0"
                  value={days}
                  onChange={(e) => handleNumberInput(e.target.value, setDays)}
                />
                <span className="time-unit-label">Days</span>
              </div>

              <div className="time-unit-wrapper">
                <input
                  type="number"
                  aria-label="Hours"
                  className="time-unit-input"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => handleNumberInput(e.target.value, setHours, 23)}
                />
                <span className="time-unit-label">Hours</span>
              </div>

              <div className="time-unit-wrapper">
                <input
                  type="number"
                  aria-label="Minutes"
                  className="time-unit-input"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => handleNumberInput(e.target.value, setMinutes, 59)}
                />
                <span className="time-unit-label">Min</span>
              </div>

              <div className="time-unit-wrapper">
                <input
                  type="number"
                  aria-label="Seconds"
                  className="time-unit-input"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => handleNumberInput(e.target.value, setSeconds, 59)}
                />
                <span className="time-unit-label">Sec</span>
              </div>
            </div>
          </div>

          {/* Theme Color */}
          <div className="form-group">
            <label className="form-label">Theme Color</label>
            <div className="color-selector">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.class}
                  type="button"
                  className={`color-option ${colorClass === option.class ? 'selected' : ''}`}
                  style={{ backgroundColor: option.color }}
                  onClick={() => setColorClass(option.class)}
                  title={option.label}
                  aria-label={`Select ${option.label} theme`}
                />
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {editingTimer ? 'Save Changes' : 'Create Timer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
