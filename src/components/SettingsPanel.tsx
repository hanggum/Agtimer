import React, { useState, useEffect } from 'react';
import { X, RefreshCw, LogIn, LogOut, CloudUpload, CloudDownload, HelpCircle, Sun, Moon, CheckCircle, Plus, Mail, Lock, FileCode } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Firebase configuration
  firebaseConfig: string;
  onSaveConfig: (configText: string) => boolean;
  onClearConfig: () => void;
  isConfigured: boolean;
  
  // Firebase Authentication
  isConnected: boolean;
  userEmail: string | null;
  isLoading: boolean;
  error: string | null;
  onSignUp: (email: string, password: string) => Promise<boolean>;
  onSignIn: (email: string, password: string) => Promise<boolean>;
  onLogout: () => Promise<boolean>;
  
  // Sync operations
  autoSync: boolean;
  onAutoSyncToggle: (val: boolean) => void;
  lastSynced: number | null;
  onSyncNow: () => void;
  onPush: () => void;
  onPull: () => void;
  
  // Theme and Categories
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  categories: string[];
  onCategoriesChange: (cats: string[]) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  firebaseConfig,
  onSaveConfig,
  onClearConfig,
  isConfigured,
  isConnected,
  userEmail,
  isLoading,
  error,
  onSignUp,
  onSignIn,
  onLogout,
  autoSync,
  onAutoSyncToggle,
  lastSynced,
  onSyncNow,
  onPush,
  onPull,
  theme,
  onThemeToggle,
  categories,
  onCategoriesChange,
}) => {
  const [configInput, setConfigInput] = useState(firebaseConfig);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    setConfigInput(firebaseConfig);
  }, [firebaseConfig, isOpen]);

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

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configInput.trim()) {
      alert('설정 JSON을 입력해 주세요.');
      return;
    }
    const success = onSaveConfig(configInput.trim());
    if (success) {
      alert('파이어베이스 설정이 완료되었습니다.');
    }
  };

  const handleAuthAction = async (action: 'signin' | 'signup') => {
    const email = emailInput.trim();
    const password = passwordInput.trim();
    if (!email || !password) {
      alert('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }
    if (password.length < 6) {
      alert('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    let success = false;
    if (action === 'signup') {
      success = await onSignUp(email, password);
      if (success) {
        alert('회원가입이 완료되고 로그인되었습니다.');
        setEmailInput('');
        setPasswordInput('');
      }
    } else {
      success = await onSignIn(email, password);
      if (success) {
        setEmailInput('');
        setPasswordInput('');
      }
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

          {/* 파이어베이스 연동 설정 */}
          <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>파이어베이스 데이터 동기화</label>
              <button
                type="button"
                className="btn btn-secondary btn-icon-only"
                style={{ border: 'none', padding: '0.25rem', color: 'var(--text-muted)' }}
                onClick={() => setShowInstructions(!showInstructions)}
                title="Firebase 구성법 안내"
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
                <strong style={{ color: 'var(--text-primary)' }}>🔥 파이어베이스(Firebase) 프로젝트 구성 순서:</strong>
                <ol style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <li><a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Firebase 콘솔</a> 접속 및 프로젝트 생성</li>
                  <li>프로젝트에 <strong>웹(Web) 앱</strong>을 추가하고 발급된 <code>firebaseConfig</code> JSON 코드를 복사합니다.</li>
                  <li>콘솔 좌측 메뉴에서 <strong>Build {' > '} Authentication</strong>으로 이동하여 **이메일/비밀번호(Email/Password)** 로그인 제공업체를 활성화합니다.</li>
                  <li>콘솔 좌측 메뉴에서 <strong>Build {' > '} Firestore Database</strong>로 이동하여 데이터베이스를 생성합니다. *(규칙 탭에서 쓰기/읽기 권한이 허용되어 있는지 확인해 주세요.)*</li>
                  <li>복사한 설정 JSON을 아래 입력창에 붙여넣고 저장해 주세요.</li>
                </ol>
              </div>
            )}

            {/* 1단계: Firebase 설정 등록 */}
            {!isConfigured ? (
              <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <textarea
                  className="form-input"
                  rows={6}
                  placeholder={`콘솔의 firebaseConfig 객체 또는 JSON을 입력하세요:\n{\n  "apiKey": "...",\n  "authDomain": "...",\n  "projectId": "...",\n  ...\n}`}
                  value={configInput}
                  onChange={(e) => setConfigInput(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
                  aria-label="Firebase config JSON"
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  <FileCode size={18} />
                  <span>설정 저장 및 연결</span>
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
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
                    <span>Firebase 설정 연결됨</span>
                  </div>
                  
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onClearConfig}
                    style={{
                      borderColor: 'var(--color-danger)',
                      color: 'var(--color-danger)',
                    }}
                  >
                    <span>설정 초기화</span>
                  </button>
                </div>

                {/* 2단계: 인증 & 로그인 */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  marginTop: '0.25rem'
                }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>파이어베이스 계정 연동</h4>

                  {!isConnected ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div className="input-with-icon" style={{ position: 'relative' }}>
                        <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          type="email"
                          className="form-input"
                          placeholder="이메일 주소"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          style={{ paddingLeft: '38px', width: '100%' }}
                          disabled={isLoading}
                        />
                      </div>

                      <div className="input-with-icon" style={{ position: 'relative' }}>
                        <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                          type="password"
                          className="form-input"
                          placeholder="비밀번호 (6자 이상)"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          style={{ paddingLeft: '38px', width: '100%' }}
                          disabled={isLoading}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleAuthAction('signin')}
                          disabled={isLoading}
                        >
                          {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <LogIn size={14} />}
                          <span>로그인</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleAuthAction('signup')}
                          disabled={isLoading}
                        >
                          <span>회원가입</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          로그인 계정: <strong style={{ color: 'var(--text-primary)' }}>{userEmail}</strong>
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={onLogout}
                          style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                          disabled={isLoading}
                        >
                          <LogOut size={12} />
                          <span>로그아웃</span>
                        </button>
                      </div>

                      {/* 동기화 수동/자동 상세 설정 */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        padding: '0.875rem',
                        borderRadius: 'var(--radius-md)',
                        marginTop: '0.25rem'
                      }}>
                        {/* 자동 동기화 토글 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>실시간 자동 동기화</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                              타이머 변경 시 자동으로 파이어베이스와 동기화합니다.
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
                                title="로컬 데이터를 서버 데이터베이스에 강제로 덮어씌웁니다."
                                style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                              >
                                <CloudUpload size={14} />
                                <span>서버로 덮어쓰기 (Push)</span>
                              </button>
                              
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={onPull}
                                disabled={isLoading}
                                title="서버의 데이터로 현재 타이머를 강제로 덮어씌웁니다."
                                style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                              >
                                <CloudDownload size={14} />
                                <span>기기로 덮어쓰기 (Pull)</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div style={{
                color: 'var(--color-danger)',
                fontSize: '0.8rem',
                marginTop: '0.75rem',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)'
              }}>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default SettingsPanel;
