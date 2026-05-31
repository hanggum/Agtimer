import React, { useState, useEffect } from 'react';
import { X, RefreshCw, LogIn, LogOut, CloudUpload, CloudDownload, HelpCircle, Sun, Moon, CheckCircle, XCircle, Plus } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onClientIdChange: (id: string) => void;
  autoSync: boolean;
  onAutoSyncToggle: (val: boolean) => void;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastSynced: number | null;
  onConnect: (clientId: string) => Promise<boolean>;
  onCancelConnect: () => void;
  onDisconnect: () => void;
  onSyncNow: () => void;
  onPush: () => void;
  onPull: () => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  categories: string[];
  onCategoriesChange: (cats: string[]) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  clientId,
  onClientIdChange,
  autoSync,
  onAutoSyncToggle,
  isConnected,
  isLoading,
  error,
  lastSynced,
  onConnect,
  onCancelConnect,
  onDisconnect,
  onSyncNow,
  onPush,
  onPull,
  theme,
  onThemeToggle,
  categories,
  onCategoriesChange,
}) => {
  const [localId, setLocalId] = useState(clientId);
  const [showInstructions, setShowInstructions] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    setLocalId(clientId);
  }, [clientId, isOpen]);

  // Handle ESC key to close
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

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localId.trim()) {
      alert('클라이언트 ID를 입력해 주세요.');
      return;
    }
    const success = await onConnect(localId.trim());
    if (success) {
      onClientIdChange(localId.trim());
    }
  };

  const formatLastSynced = (timestamp: number | null) => {
    if (!timestamp) return '동기화 이력 없음';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCat = newCategory.trim();
    if (!cleanCat) return;

    if (categories.includes(cleanCat)) {
      alert('이미 존재하는 카테고리 이름입니다.');
      return;
    }
    
    onCategoriesChange([...categories, cleanCat]);
    setNewCategory('');
  };

  const handleDeleteCategory = (catToDelete: string) => {
    if (categories.length <= 1) {
      alert('최소 하나의 카테고리는 유지되어야 합니다.');
      return;
    }
    
    if (confirm(`"${catToDelete}" 카테고리를 삭제하시겠습니까?`)) {
      onCategoriesChange(categories.filter(cat => cat !== catToDelete));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">설정 (Settings)</h2>
          <button className="btn-close" onClick={onClose} aria-label="설정 닫기">
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '75vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
          
          {/* 테마 설정 */}
          <div className="form-group">
            <label className="form-label">기본 테마</label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onThemeToggle}
              style={{ justifyContent: 'flex-start', width: '100%' }}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={18} style={{ color: 'var(--color-warning)' }} />
                  <span>라이트 모드로 전환</span>
                </>
              ) : (
                <>
                  <Moon size={18} style={{ color: 'var(--color-primary)' }} />
                  <span>다크 모드로 전환</span>
                </>
              )}
            </button>
          </div>

          {/* 카테고리 설정 */}
          <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <label className="form-label">카테고리 관리 (Category Management)</label>
            
            {/* 카테고리 리스트 */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '0.75rem',
              maxHeight: '120px',
              overflowY: 'auto',
              padding: '0.5rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)'
            }}>
              {categories.map((cat) => (
                <div
                  key={cat}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.25rem 0.625rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8125rem',
                    color: 'var(--text-light)',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <span>{cat}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-danger)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    title="삭제"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* 카테고리 추가 입력창 */}
            <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="새 카테고리 입력 (최대 15자)"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                maxLength={15}
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem' }}
                disabled={!newCategory.trim()}
              >
                <Plus size={16} />
                <span>추가</span>
              </button>
            </form>
          </div>

          {/* 구글 드라이브 연동 */}
          <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>구글 드라이브 데이터 동기화</label>
              <button
                type="button"
                className="btn btn-secondary btn-icon-only"
                style={{ border: 'none', padding: '0.25rem', color: 'var(--text-muted)' }}
                onClick={() => setShowInstructions(!showInstructions)}
                title="Google Client ID 발급 안내"
              >
                <HelpCircle size={18} />
              </button>
            </div>

            {/* 발급 안내 가이드 */}
            {showInstructions && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem',
                fontSize: '0.825rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                lineHeight: '1.4'
              }}>
                <strong style={{ color: 'var(--text-primary)' }}>🔑 구글 OAuth Client ID 발급 순서:</strong>
                <ol style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <li><a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Google Cloud Console</a> 접속 및 프로젝트 생성</li>
                  <li><strong>API 및 서비스 {' > '} 사용자 인증 정보</strong>로 이동</li>
                  <li><strong>사용자 인증 정보 만들기 {' > '} OAuth 클라이언트 ID</strong> 클릭 (최초 진행 시 '동의 화면' 구성 필요)</li>
                  <li>애플리케이션 유형: <strong>웹 애플리케이션</strong></li>
                  <li><strong>승인된 JavaScript 원본</strong>에 아래 주소 추가:
                    <ul style={{ paddingLeft: '1rem', marginTop: '0.125rem', listStyleType: 'circle' }}>
                      <li>로컬용: <code>http://localhost:5173</code></li>
                      <li>배포용: <code>https://{`<본인아이디>`}.github.io</code></li>
                    </ul>
                  </li>
                  <li>생성 후 발급된 <strong>클라이언트 ID</strong>를 아래 입력창에 붙여넣기</li>
                </ol>
              </div>
            )}

            <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="구글 클라이언트 ID를 입력하세요 (.apps.googleusercontent.com)"
                value={localId}
                onChange={(e) => setLocalId(e.target.value)}
                disabled={isConnected || isLoading}
                aria-label="Google Client ID"
              />

              {!isConnected ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isLoading || !localId.trim()}
                    style={{ width: '100%' }}
                  >
                    {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <LogIn size={18} />}
                    <span>{isLoading ? '구글 로그인 팝업 대기 중...' : '구글 드라이브 연동하기'}</span>
                  </button>

                  {/* 취소 버튼: 로딩 중(팝업 대기 중)일 때만 표시 */}
                  {isLoading && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={onCancelConnect}
                      style={{
                        width: '100%',
                        borderColor: 'var(--color-danger)',
                        color: 'var(--color-danger)',
                      }}
                    >
                      <XCircle size={18} />
                      <span>연동 취소 (Cancel)</span>
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 0.875rem',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-success)',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}>
                    <CheckCircle size={16} />
                    <span>연동 완료</span>
                  </div>
                  
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={onDisconnect}
                    title="연동 해제"
                  >
                    <LogOut size={18} />
                    <span>해제</span>
                  </button>
                </div>
              )}
            </form>

            {error && (
              <div style={{
                color: 'var(--color-danger)',
                fontSize: '0.8rem',
                marginTop: '0.5rem',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)'
              }}>
                {error}
              </div>
            )}
          </div>

          {/* 동기화 수동/자동 상세 설정 */}
          {isConnected && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)'
            }}>
              
              {/* 자동 동기화 토글 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>실시간 자동 동기화</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                    타이머 변경 시 자동으로 구글 드라이브와 동기화합니다.
                  </div>
                </div>
                <label className="switch-wrapper" style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px' }}>
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => onAutoSyncToggle(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                    aria-label="Auto sync toggle"
                  />
                  <span className={`switch-slider ${autoSync ? 'active' : ''}`} style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    inset: 0,
                    backgroundColor: autoSync ? 'var(--color-success)' : 'var(--text-muted)',
                    borderRadius: '34px',
                    transition: '0.3s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: autoSync ? '26px' : '4px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.3s'
                    }} />
                  </span>
                </label>
              </div>

              {/* 수동 동기화 컨트롤 버튼 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span>동기화 상태:</span>
                  <strong>{formatLastSynced(lastSynced)}</strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onSyncNow}
                    disabled={isLoading}
                    style={{ fontSize: '0.85rem' }}
                  >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    <span>양방향 최신 병합 (Sync)</span>
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={onPush}
                      disabled={isLoading}
                      title="로컬 데이터를 구글 드라이브에 강제로 덮어씌웁니다."
                      style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                    >
                      <CloudUpload size={14} />
                      <span>기기로 덮어쓰기 (Push)</span>
                    </button>
                    
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={onPull}
                      disabled={isLoading}
                      title="구글 드라이브의 데이터로 현재 타이머를 강제로 덮어씌웁니다."
                      style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                    >
                      <CloudDownload size={14} />
                      <span>구글로 덮어쓰기 (Pull)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default SettingsPanel;
