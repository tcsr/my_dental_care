import { useState, useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDemoData, clearAllData } from './utils/db';
import { supabase } from './utils/supabase';
import ProSalesSubscreen from './components/ProSalesSubscreen';
import ProImplantsSubscreen from './components/ProImplantsSubscreen';
import ProInventorySubscreen from './components/ProInventorySubscreen';
import ProRemindersSubscreen from './components/ProRemindersSubscreen';
import ProGuidesSubscreen from './components/ProGuidesSubscreen';
import ProMasterDataSubscreen from './components/ProMasterDataSubscreen';
import ProProfileSettingsSubscreen from './components/ProProfileSettingsSubscreen';
import AiAssistant from './components/AiAssistant';
import LoginScreen from './components/LoginScreen';
import AdminPanel from './components/AdminPanel';
import { t } from './utils/i18n';
import { ShoppingBag, Package, Bell, Activity, Menu, X, Trash2, Film, Globe, Settings, User, ArrowUp, ArrowDown, CheckCircle, AlertTriangle, AlertCircle, Info, MessageSquare, ShieldCheck } from 'lucide-react';

import { Capacitor } from '@capacitor/core';

export default function App() {
  const [activeTab, setActiveTab] = useState('sales');
  const [isDbReady, setIsDbReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem('dentalLang') || 'en');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authUser, setAuthUser] = useState(null);

  const [activeAlarm, setActiveAlarm] = useState(null);
  const [activeAlarmClient, setActiveAlarmClient] = useState(null);
  const [isAiOpen, setIsAiOpen] = useState(false);

  // Set platform classes
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      document.body.classList.add('is-native-app');
      document.body.classList.remove('is-browser');
    } else {
      document.body.classList.add('is-browser');
      document.body.classList.remove('is-native-app');
    }
  }, []);

  // Supabase session — check on mount only; LoginScreen handles sign-in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from('profiles').select('role, name').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data?.role === 'admin' || data?.approved) {
              setAuthUser({ role: data.role, name: data.name, user: session.user });
              setIsLoggedIn(true);
            }
          });
      }
    });
  }, []);

  // Initialize DB and Seeder
  useEffect(() => {
    async function init() {
      try {
        await seedDemoData();
        setIsDbReady(true);
      } catch (err) {
        console.error('Failed to seed database:', err);
        setIsDbReady(true);
      }
    }
    init();

    // Intercept native back button to prevent app exit
    let backButtonHandler = null;
    if (Capacitor.isNativePlatform()) {
      backButtonHandler = CapApp.addListener('backButton', () => {
        if (activeAlarm) {
          setActiveAlarm(null);
          setActiveAlarmClient(null);
        } else if (isAiOpen) {
          setIsAiOpen(false);
        } else if (isSidebarOpen) {
          setIsSidebarOpen(false);
        } else if (activeTab !== 'sales') {
          setActiveTab('sales');
        } else {
          console.log('Back button exit blocked.');
        }
      });
    }

    return () => {
      if (backButtonHandler) {
        backButtonHandler.then(h => h.remove());
      }
    };
  }, [activeTab, activeAlarm, isSidebarOpen, isAiOpen]);

  // Reset scroll to top on tab change
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0 });
    }
  }, [activeTab]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl + / or Cmd + / to toggle AI Assistant
      if (e.key === '/' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsAiOpen(prev => !prev);
      }
      
      // Escape to close open dialogs, drawers, and assistants
      if (e.key === 'Escape') {
        if (activeAlarm) {
          setActiveAlarm(null);
          setActiveAlarmClient(null);
        } else if (isAiOpen) {
          setIsAiOpen(false);
        } else if (isSidebarOpen) {
          setIsSidebarOpen(false);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAlarm, isAiOpen, isSidebarOpen]);

  // Synthesize medication-style premium chime beep sequence using Web Audio API
  const playAlarmSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playTone = (freq, time, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.25, time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + dur);
      };

      const now = ctx.currentTime;
      // Elegant multi-tone chord chime
      playTone(523.25, now, 0.25);        // C5
      playTone(659.25, now + 0.12, 0.25); // E5
      playTone(783.99, now + 0.24, 0.35); // G5
      playTone(1046.50, now + 0.36, 0.5); // C6
    } catch (e) {
      console.warn('Web Audio failure:', e);
    }
  };

  // Check custom alarms every 6 seconds
  useEffect(() => {
    if (!isDbReady) return;
    
    let isChecking = false;
    const interval = setInterval(async () => {
      if (isChecking || activeAlarm) return;
      isChecking = true;
      try {
        const now = Date.now();
        // Look for scheduled/snoozed custom alarms that have passed their trigger time
        const triggered = await db.automatedReminders
          .where('type')
          .equals('Custom Alarm')
          .and(item => (item.status === 'Scheduled' || item.status === 'Snoozed') && now >= item.dateScheduled)
          .toArray();

        if (triggered.length > 0) {
          const alarm = triggered[0];
          // Set to Triggered to prevent duplicate popups
          await db.automatedReminders.update(alarm.id, { status: 'Triggered' });
          
          let clientData = null;
          if (alarm.recipientId && alarm.recipientId !== 0) {
            clientData = await db.b2bClients.get(alarm.recipientId);
          }
          
          setActiveAlarm(alarm);
          setActiveAlarmClient(clientData);
          playAlarmSound();
        }
      } catch (err) {
        console.error('Alarm scan error:', err);
      } finally {
        isChecking = false;
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [isDbReady, activeAlarm]);

  const handleDismissAlarm = async (id) => {
    await db.automatedReminders.update(id, { status: 'Completed', dateSent: Date.now() });
    setActiveAlarm(null);
    setActiveAlarmClient(null);
    if (window.__triggerToast) {
      window.__triggerToast('Alarm Alert Completed', 'success');
    }
  };

  const handleSnoozeAlarm = async (id) => {
    const newScheduled = Date.now() + 10 * 60 * 1000; // Snooze for 10 minutes
    await db.automatedReminders.update(id, { status: 'Snoozed', dateScheduled: newScheduled });
    setActiveAlarm(null);
    setActiveAlarmClient(null);
    if (window.__triggerToast) {
      window.__triggerToast('Alarm Snoozed for 10 min', 'warning');
    }
  };

  const profile = useLiveQuery(async () => {
    if (!db || !db.userProfile) return {};
    const arr = await db.userProfile.toArray();
    return arr.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
  });
  const isDoctorMode = profile?.activeRole === 'doctor';
  const activeProfileImage = profile
    ? (profile.activeRole === 'doctor' && profile.actingClientId
      ? profile[`profileImage_doctor_${profile.actingClientId}`]
      : profile[`profileImage_rep`] || profile[`profileImage` /* fallback */])
    : undefined;

  const handleReset = async () => {
    if (confirm('Clear all logs and reset database? This cannot be undone.')) {
      await clearAllData();
      alert('Database cleared.');
      window.location.reload();
    }
  };

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('dentalLang', newLang);
  };

  const isAdmin = authUser?.role === 'admin';

  const renderContent = () => {
    switch (activeTab) {
      case 'sales':
        return <ProSalesSubscreen lang={lang} profile={profile} />;
      case 'implants':
        return <ProImplantsSubscreen lang={lang} profile={profile} />;
      case 'inventory':
        return <ProInventorySubscreen lang={lang} profile={profile} />;
      case 'reminders':
        return <ProRemindersSubscreen lang={lang} profile={profile} />;
      case 'guides':
        return <ProGuidesSubscreen lang={lang} profile={profile} />;
      case 'master':
        return <ProMasterDataSubscreen lang={lang} profile={profile} />;
      case 'profile':
        return <ProProfileSettingsSubscreen lang={lang} profile={profile} />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <ProSalesSubscreen lang={lang} profile={profile} />;
    }
  };

  if (!isDbReady) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))' }}>
        Loading Pro Dental Database...
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen lang={lang} onLogin={(user) => { setAuthUser(user); setIsLoggedIn(true); }} />;
  }

  return (
    <>
      {/* Sidebar Drawer Overlay */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)} />

      {/* Sidebar Drawer */}
      <div className={`sidebar-drawer ${isSidebarOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid hsl(var(--border-color))' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#0ea5e9' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(14, 165, 233, 0.15)"/>
              <path d="M8 11.5c.5-1 1.5-2 3-2s2.5 1 3 2c.5 1.5.5 3.5 0 4.5s-2 1.5-3 1.5-2.5-.5-3-1.5c-.5-1-.5-3 0-4.5z" stroke="currentColor" fill="none"/>
            </svg>
            <span style={{ color: '#0f172a' }}>Lal Dental Care</span>
          </h2>
          <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
          <div className="glass-card" style={{
            background: 'hsla(0, 0%, 100%, 0.65)',
            border: '1px solid hsla(205, 85%, 50%, 0.08)',
            borderRadius: '16px',
            padding: '12px 14px',
            boxShadow: '0 8px 32px rgba(15, 23, 42, 0.04)',
            backdropFilter: 'blur(10px)',
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--primary) / 25%)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'hsla(205, 85%, 50%, 0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <span style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: 'hsl(var(--text-dim))', fontWeight: '800', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>
              👤 {t('userConsole', lang)}
            </span>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                {activeProfileImage ? (
                  <img 
                    src={activeProfileImage} 
                    alt="Avatar" 
                    style={{ width: '42px', height: '42px', borderRadius: '12px', objectFit: 'cover', border: '2px solid hsl(var(--primary))' }} 
                  />
                ) : (
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '1rem',
                    textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)'
                  }}>
                    {(profile?.userName || 'C').charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Active Sync Status Indicator Dot */}
                <span style={{
                  position: 'absolute', bottom: '-2px', right: '-2px',
                  width: '10px', height: '10px', background: '#22c55e',
                  border: '2px solid #fff', borderRadius: '50%', display: 'block'
                }} title="Active B2B Session" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {profile?.userName || 'Chandra'}
                </h4>
                <p style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', margin: '2px 0 0 0', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.02em', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {profile?.role || t('representative', lang)}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid hsla(205, 85%, 50%, 0.05)' }}>
              <span style={{
                fontSize: '0.55rem', fontWeight: '800', background: 'rgba(34,197,94,0.08)',
                color: '#22c55e', padding: '3px 8px', borderRadius: '6px',
                display: 'inline-flex', alignItems: 'center', gap: '4px'
              }}>
                ● System Ready
              </span>
              <span style={{ fontSize: '0.55rem', color: 'hsl(var(--text-dim))', fontWeight: 'bold' }}>
                ID: REP-902
              </span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: '16px', flex: 1, overflowY: 'auto' }}>
            <div className="sidebar-menu-list">
              <button 
                className={`sidebar-link ${activeTab === 'sales' ? 'active' : ''}`} 
                onClick={() => { setActiveTab('sales'); setIsSidebarOpen(false); }}
              >
                <ShoppingBag size={16} />
                <span>{isDoctorMode ? 'My Orders & Invoices' : t('navSales', lang)}</span>
              </button>
              <button 
                className={`sidebar-link ${activeTab === 'implants' ? 'active' : ''}`} 
                onClick={() => { setActiveTab('implants'); setIsSidebarOpen(false); }}
              >
                <Activity size={16} />
                <span>{isDoctorMode ? 'My Implant Timeline' : t('navImplants', lang)}</span>
              </button>
              {!isDoctorMode && (
                <button 
                  className={`sidebar-link ${activeTab === 'inventory' ? 'active' : ''}`} 
                  onClick={() => { setActiveTab('inventory'); setIsSidebarOpen(false); }}
                >
                  <Package size={16} />
                  <span>{t('navInventory', lang)}</span>
                </button>
              )}
              {!isDoctorMode && (
                <button 
                  className={`sidebar-link ${activeTab === 'reminders' ? 'active' : ''}`} 
                  onClick={() => { setActiveTab('reminders'); setIsSidebarOpen(false); }}
                >
                  <Bell size={16} />
                  <span>{t('navAlerts', lang)}</span>
                </button>
              )}
              <button 
                className={`sidebar-link ${activeTab === 'guides' ? 'active' : ''}`} 
                onClick={() => { setActiveTab('guides'); setIsSidebarOpen(false); }}
              >
                <Film size={16} />
                <span>{isDoctorMode ? 'Training Guides' : t('navGuides', lang)}</span>
              </button>
              {!isDoctorMode && (
                <button 
                  className={`sidebar-link ${activeTab === 'master' ? 'active' : ''}`} 
                  onClick={() => { setActiveTab('master'); setIsSidebarOpen(false); }}
                >
                  <Settings size={16} />
                  <span>{t('navMaster', lang)}</span>
                </button>
              )}
              <button
                className={`sidebar-link ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}
              >
                <User size={16} />
                <span>Profile & Settings</span>
              </button>
              {isAdmin && (
                <button
                  className={`sidebar-link ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('admin'); setIsSidebarOpen(false); }}
                >
                  <ShieldCheck size={16} />
                  <span>Admin Panel</span>
                </button>
              )}
            </div>

          </div>

          <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                setIsLoggedIn(false);
                setAuthUser(null);
                setIsSidebarOpen(false);
              }} 
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
                background: 'transparent', border: '1px solid transparent', color: 'hsl(var(--text-muted))',
                fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '10px',
                transition: 'all 0.2s', fontFamily: 'Outfit'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'hsla(0,0%,0%,0.03)'; e.currentTarget.style.color = 'hsl(var(--text-primary))'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'hsl(var(--text-muted))'; }}
            >
              <X size={15} /> Log Out / Switch Portal
            </button>
            <button 
              onClick={handleReset}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
                background: 'transparent', border: '1px solid transparent', color: 'hsl(var(--color-hyper))',
                fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '10px',
                transition: 'all 0.2s', fontFamily: 'Outfit'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
            >
              <Trash2 size={15} /> {t('resetDb', lang)}
            </button>
          </div>
        </div>
      </div>

      <div className="main-layout-container">
        {/* Main Premium Layout Wrapper */}
        <div className="app-header" style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
        <button onClick={() => setIsSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'hsl(var(--text-primary))' }}>
          <Menu size={20} />
        </button>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span className="gradient-text app-title" style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: '1.05rem', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
            {t('portalTitle', lang)}
          </span>
          {isDoctorMode && (
            <span style={{ fontSize: '0.55rem', background: 'hsl(var(--secondary) / 12%)', color: 'hsl(var(--secondary))', padding: '1px 6px', borderRadius: '4px', fontWeight: '800', marginTop: '1px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Doctor Portal
            </span>
          )}
        </div>

        {/* Premium Globe i18n Dropdown & Profile Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* AI Support Chat Button */}
          <button 
            onClick={() => setIsAiOpen(true)}
            style={{ 
              background: 'hsl(var(--bg-dark))', border: '1px solid hsl(var(--border-color))', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '6px', borderRadius: '8px', width: '28px', height: '28px', transition: 'all 0.2s',
              color: 'hsl(var(--primary))'
            }}
            title="AI Assistant"
          >
            <MessageSquare size={14} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'hsl(var(--bg-dark))', padding: '4px 8px', borderRadius: '8px', border: '1px solid hsl(var(--border-color))' }}>
            <Globe size={14} color="hsl(var(--text-muted))" />
            <select 
              value={lang} 
              onChange={(e) => handleLangChange(e.target.value)}
              style={{
                background: 'transparent', border: 'none', outline: 'none', fontSize: '0.68rem', fontWeight: 'bold',
                color: 'hsl(var(--text-primary))', cursor: 'pointer', fontFamily: 'Inter'
              }}
            >
              <option value="en">EN</option>
              <option value="te">తెలుగు</option>
              <option value="hi">हिंदी</option>
              <option value="ta">தமிழ்</option>
            </select>
          </div>

          <button 
            onClick={() => setActiveTab('profile')} 
            style={{ 
              background: 'hsl(var(--bg-dark))', border: activeTab === 'profile' ? '1.5px solid hsl(var(--primary))' : '1px solid hsl(var(--border-color))', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '6px', borderRadius: '8px', width: '28px', height: '28px', transition: 'all 0.2s'
            }}
            title="Profile & Settings"
          >
            {activeProfileImage ? (
              <img src={activeProfileImage} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <User size={14} color="hsl(var(--text-primary))" />
            )}
          </button>
        </div>
      </div>

      <main>
        {renderContent()}
      </main>

      {/* Bottom Premium Nav Bar */}
      <div className="bottom-nav" style={{ gridTemplateColumns: isAdmin ? 'repeat(4, 1fr)' : isDoctorMode ? 'repeat(4, 1fr)' : 'repeat(5, 1fr)' }}>
        <button className={`nav-item ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
          <ShoppingBag />
          <span>{isDoctorMode ? 'My Orders' : t('navSales', lang)}</span>
        </button>
        <button className={`nav-item ${activeTab === 'implants' ? 'active' : ''}`} onClick={() => setActiveTab('implants')}>
          <Activity />
          <span>{isDoctorMode ? 'My Cases' : t('navImplants', lang)}</span>
        </button>
        {!isDoctorMode && (
          <button className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
            <Package />
            <span>{t('navInventory', lang)}</span>
          </button>
        )}
        {!isDoctorMode && (
          <button className={`nav-item ${activeTab === 'reminders' ? 'active' : ''}`} onClick={() => setActiveTab('reminders')}>
            <Bell />
            <span>{t('navAlerts', lang)}</span>
          </button>
        )}
        <button className={`nav-item ${activeTab === 'guides' ? 'active' : ''}`} onClick={() => setActiveTab('guides')}>
          <Film />
          <span>{isDoctorMode ? 'Videos' : t('navGuides', lang)}</span>
        </button>
        {isDoctorMode && (
          <button className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <User />
            <span>Profile</span>
          </button>
        )}
        {isAdmin && (
          <button className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
            <ShieldCheck />
            <span>Admin</span>
          </button>
        )}
      </div>

      {/* Floating Scroll to Top / Bottom Buttons */}
      <div className="floating-scroll-controls">
        <button 
          onClick={() => document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="scroll-btn up"
          title="Scroll to Top"
        >
          <ArrowUp size={16} />
        </button>
        <button 
          onClick={() => {
            const mainEl = document.querySelector('main');
            if (mainEl) mainEl.scrollTo({ top: mainEl.scrollHeight, behavior: 'smooth' });
          }}
          className="scroll-btn down"
          title="Scroll to Bottom"
        >
          <ArrowDown size={16} />
        </button>
      </div>

      {/* Full height Localized AI FAQ Assistant */}
      <AiAssistant key={lang} lang={lang} isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />

      {/* Modern Professional Toaster System */}
      <Toaster />

      {/* Global Custom Alarm Trigger Overlay Modal */}
      {activeAlarm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', zIndex: 999999, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '20px',
          backdropFilter: 'blur(8px)', boxSizing: 'border-box'
        }}>
          <div className="glass-card animate-fade-in" style={{
            width: '100%', maxWidth: '380px', background: 'hsl(var(--bg-card))',
            borderRadius: '24px', border: '2px solid hsl(var(--primary))',
            padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative',
            animation: 'alarmPulse 2s infinite ease-in-out'
          }}>
            {/* Alarm Header Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="animate-spin" style={{
                  padding: '6px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444', display: 'inline-flex'
                }}>
                  <Bell size={18} />
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: '800', fontFamily: 'Outfit', color: 'hsl(var(--text-primary))' }}>
                  Live Dental Alarm
                </span>
              </div>
              <span style={{
                fontSize: '0.62rem', fontWeight: '800', padding: '3px 8px', borderRadius: '6px',
                background: activeAlarm.priority === 'High' ? 'rgba(239,68,68,0.1)' : activeAlarm.priority === 'Medium' ? 'rgba(245,158,11,0.1)' : 'rgba(14,165,233,0.1)',
                color: activeAlarm.priority === 'High' ? '#ef4444' : activeAlarm.priority === 'Medium' ? '#f59e0b' : '#0ea5e9',
                textTransform: 'uppercase'
              }}>
                {activeAlarm.priority} Priority
              </span>
            </div>

            {/* Alarm Content */}
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'hsl(var(--primary))', fontFamily: 'Outfit', margin: '0 0 6px 0' }}>
                {activeAlarm.title}
              </h3>
              
              {activeAlarmClient && (
                <div style={{
                  fontSize: '0.72rem', fontWeight: 'bold', color: 'hsl(var(--text-muted))',
                  marginBottom: '10px', background: 'hsl(var(--bg-dark))', padding: '6px 10px',
                  borderRadius: '8px', border: '1px solid hsl(var(--border-color))'
                }}>
                  🏥 Target: {activeAlarmClient.name} ({activeAlarmClient.contactPerson})
                </div>
              )}

              <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-primary))', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
                {activeAlarm.message}
              </p>
            </div>

            {/* Action Row */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                onClick={() => handleSnoozeAlarm(activeAlarm.id)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid hsl(var(--border-color))',
                  background: 'hsl(var(--bg-dark))', color: 'hsl(var(--text-primary))', fontWeight: 'bold',
                  fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                ⏰ Snooze 10m
              </button>
              <button
                onClick={() => handleDismissAlarm(activeAlarm.id)}
                style={{
                  flex: 1.2, padding: '12px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', fontWeight: 'bold',
                  fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit', transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '6px'
                }}
              >
                <CheckCircle size={15} /> Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes alarmPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
          50% { transform: scale(1.02); box-shadow: 0 25px 50px -12px rgba(239, 68, 68, 0.2); }
        }
      `}</style>
      </div>
    </>
  );
}

function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    window.__triggerToast = (message, type = 'info', duration = 3500) => {
      const id = Date.now() + Math.random();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    };

    const originalAlert = window.alert;
    window.alert = (message) => {
      const msgLower = String(message).toLowerCase();
      let type = 'info';
      if (
        msgLower.includes('success') || 
        msgLower.includes('added') || 
        msgLower.includes('registered') || 
        msgLower.includes('saved') || 
        msgLower.includes('completed') || 
        msgLower.includes('recorded') || 
        msgLower.includes('settled') || 
        msgLower.includes('issued') ||
        msgLower.includes('restored') ||
        msgLower.includes('cleared')
      ) {
        type = 'success';
      } else if (
        msgLower.includes('failed') || 
        msgLower.includes('invalid') || 
        msgLower.includes('blocked') || 
        msgLower.includes('insufficient') ||
        msgLower.includes('exceed') ||
        msgLower.includes('limit') ||
        msgLower.includes('error')
      ) {
        type = 'error';
      } else if (
        msgLower.includes('warning') || 
        msgLower.includes('caution') ||
        msgLower.includes('please')
      ) {
        type = 'warning';
      }
      window.__triggerToast(message, type);
    };

    return () => {
      window.alert = originalAlert;
      delete window.__triggerToast;
    };
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '350px',
      width: 'calc(100% - 40px)'
    }}>
      {toasts.map(t => {
        let bgColor = 'hsl(var(--bg-card))';
        let borderColor = 'hsl(var(--border-color))';
        let textColor = 'hsl(var(--text-primary))';
        let Icon = Info;
        let iconColor = 'hsl(var(--primary))';

        if (t.type === 'success') {
          bgColor = 'rgba(15, 23, 42, 0.95)';
          borderColor = 'rgba(16, 185, 129, 0.4)';
          textColor = '#fff';
          Icon = CheckCircle;
          iconColor = '#10b981';
        } else if (t.type === 'error') {
          bgColor = 'rgba(15, 23, 42, 0.95)';
          borderColor = 'rgba(239, 68, 68, 0.4)';
          textColor = '#fff';
          Icon = AlertCircle;
          iconColor = 'hsl(var(--color-hyper))';
        } else if (t.type === 'warning') {
          bgColor = 'rgba(15, 23, 42, 0.95)';
          borderColor = 'rgba(245, 158, 11, 0.4)';
          textColor = '#fff';
          Icon = AlertTriangle;
          iconColor = 'hsl(var(--color-hypo))';
        }

        return (
          <div key={t.id} className="animate-fade-in" style={{
            background: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: textColor,
            fontSize: '0.78rem',
            fontWeight: '600',
            fontFamily: 'Outfit',
            transition: 'all 0.3s ease-out'
          }}>
            <div style={{ color: iconColor, display: 'flex', flexShrink: 0 }}>
              <Icon size={16} />
            </div>
            <div style={{ flex: 1, whiteSpace: 'pre-line', lineHeight: 1.4 }}>
              {t.message}
            </div>
            <button 
              onClick={() => removeToast(t.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'hsl(var(--text-muted))',
                display: 'flex',
                padding: '2px',
                marginLeft: '4px'
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
