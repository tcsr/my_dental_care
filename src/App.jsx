import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate, Link } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDemoData, seedBasalImplants, seedSurgicalKit, clearAllData, processSyncQueue } from './utils/db';
import { supabase } from './utils/supabase';
import AiAssistant from './components/AiAssistant';
import LoginScreen from './components/LoginScreen';
import PremiumSelect from './components/ui/PremiumSelect';
import PremiumLoader from './components/ui/PremiumLoader';
import DashboardScreen from './components/DashboardScreen';
import ProductCatalog from './components/ProductCatalog';
import DoctorOrders from './components/DoctorOrders';
import LandingPage from './components/LandingPage';
import PolicyPage from './components/PolicyPage';
import { t } from './utils/i18n';
import { useStore } from './utils/store';

function ToothMark({ size = 24, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.25">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fillOpacity="0.15" fill={color} />
      <path d="M8 11.5c.5-1 1.5-2 3-2s2.5 1 3 2c.5 1.5.5 3.5 0 4.5s-2 1.5-3 1.5-2.5-.5-3-1.5c-.5-1-.5-3 0-4.5z" fill="none" />
    </svg>
  );
}

// Simple console log redirector to capture browser console logs in the workspace
(function () {
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  function sendToServer(type, args) {
    const message = Array.from(args).map(arg => {
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg); } catch (e) { return String(arg); }
      }
      return String(arg);
    }).join(' ');
    fetch('http://localhost:3099/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, message })
    }).catch(() => { });
  }

  console.log = function () {
    origLog.apply(console, arguments);
    sendToServer('LOG', arguments);
  };
  console.warn = function () {
    origWarn.apply(console, arguments);
    sendToServer('WARN', arguments);
  };
  console.error = function () {
    origError.apply(console, arguments);
    sendToServer('ERROR', arguments);
  };

  window.addEventListener('error', function (e) {
    sendToServer('UNCAUGHT', [e.message, e.filename, e.lineno]);
  });
})();

// Lazy-loaded: admin/rep-only screens, not needed for first paint (catalog/dashboard land first).
const ProSalesSubscreen = lazy(() => import('./components/ProSalesSubscreen'));
const ProImplantsSubscreen = lazy(() => import('./components/ProImplantsSubscreen'));
const ProInventorySubscreen = lazy(() => import('./components/ProInventorySubscreen'));
const ProRemindersSubscreen = lazy(() => import('./components/ProRemindersSubscreen'));
const ProMarketingSubscreen = lazy(() => import('./components/ProMarketingSubscreen'));
const ProGuidesSubscreen = lazy(() => import('./components/ProGuidesSubscreen'));
const ProMasterDataSubscreen = lazy(() => import('./components/ProMasterDataSubscreen'));
const ProProfileSettingsSubscreen = lazy(() => import('./components/ProProfileSettingsSubscreen'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const OrderManagement = lazy(() => import('./components/OrderManagement'));
const ProductManagement = lazy(() => import('./components/ProductManagement'));
import { ShoppingBag, ShoppingCart, Package, Bell, Activity, Menu, X, Trash2, Film, Globe, Settings, User, ArrowUp, ArrowDown, ChevronUp, ChevronDown, CheckCircle, AlertTriangle, AlertCircle, Info, MessageSquare, ShieldCheck, LayoutDashboard, LogOut, LogIn, ChevronRight, Store, ClipboardList, Megaphone, Phone, Mail } from 'lucide-react';

import { Capacitor } from '@capacitor/core';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.slice(1) || 'catalog';
  const setActiveTab = (tab) => navigate('/' + tab);
  const handleNav = (tab) => {
    setActiveTab(tab);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };
  const [isDbReady, setIsDbReady] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('dental_sidebar_collapsed');
      if (saved !== null) {
        return saved === 'false';
      }
    } catch (e) { }
    return false;
  });
  const [lang, setLang] = useState(() => localStorage.getItem('dentalLang') || 'en');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [cart, setCart] = useState({});
  const [cartUserId, setCartUserId] = useState(undefined); // undefined means not loaded yet
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [postLoginAction, setPostLoginAction] = useState(null); // callback to run after login
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [guestScrolled, setGuestScrolled] = useState(false);

  useEffect(() => {
    let mainEl = null;
    const handleScroll = () => {
      if (mainEl) {
        setGuestScrolled(mainEl.scrollTop > 20);
      }
    };

    const checkEl = setInterval(() => {
      const el = document.querySelector('main');
      if (el) {
        mainEl = el;
        el.addEventListener('scroll', handleScroll);
        setGuestScrolled(el.scrollTop > 20);
        clearInterval(checkEl);
      }
    }, 100);

    return () => {
      clearInterval(checkEl);
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScroll);
      }
    };
  }, [location.pathname, isLoggedIn]);

  // useEffect(() => {
  //   const handleOnline = () => setIsOnline(true);
  //   const handleOffline = () => setIsOnline(false);
  //   window.addEventListener('online', handleOnline);
  //   window.addEventListener('offline', handleOffline);
  //   return () => {
  //     window.removeEventListener('online', handleOnline);
  //     window.removeEventListener('offline', handleOffline);
  //   };
  // }, []);

  const [toast, setToast] = useState(null);
  const isInitialOnline = useRef(true);

  useEffect(() => {
    if (isInitialOnline.current) {
      isInitialOnline.current = false;
      return;
    }
    if (!isOnline) {
      setToast({ message: '📡 Offline mode active. Cart changes will sync when reconnected.', type: 'warning' });
    }
  }, [isOnline]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load/merge cart from Dexie IndexedDB based on auth user
  useEffect(() => {
    if (!isDbReady || !authChecked) return;

    async function loadCart() {
      try {
        const targetUserId = authUser ? authUser.user.id : null;
        const userKey = authUser ? `lal_dental_cart_${authUser.user.id}` : 'lal_dental_cart_guest';

        // 1. Get user cart
        const userRow = await db.userProfile.get(userKey);
        let currentCart = (userRow && userRow.value && typeof userRow.value === 'object') ? userRow.value : {};

        // 2. If logged in as non-admin, transfer guest cart if guest cart has items
        if (authUser && authUser.role !== 'admin') {
          const guestRow = await db.userProfile.get('lal_dental_cart_guest');
          const guestCart = (guestRow && guestRow.value && typeof guestRow.value === 'object') ? guestRow.value : {};

          if (Object.keys(guestCart).length > 0) {
            // Merge guest cart into user cart
            currentCart = { ...currentCart, ...guestCart };
            // Clear guest cart from DB
            await db.userProfile.delete('lal_dental_cart_guest');
            try {
              localStorage.removeItem('lal_dental_cart_guest');
            } catch (e) { }
          }
        }

        setCart(currentCart);
        setCartUserId(targetUserId);
      } catch (e) {
        console.error('Failed to load cart:', e);
      }
    }

    loadCart();
  }, [isDbReady, authChecked, authUser]);

  // Save/clean up cart state in storage
  useEffect(() => {
    const targetUserId = authUser ? authUser.user.id : null;
    // Only save if the loaded cart state corresponds to the current user
    if (cartUserId !== targetUserId) return;

    async function saveCart() {
      try {
        const userKey = authUser ? `lal_dental_cart_${authUser.user.id}` : 'lal_dental_cart_guest';

        if (!cart || Object.keys(cart).length === 0) {
          // If empty, delete from Dexie and localStorage
          await db.userProfile.delete(userKey);
          try {
            localStorage.removeItem(userKey);
          } catch (e) { }
        } else {
          // Otherwise save to Dexie and try localStorage (ignoring QuotaExceededError in localStorage)
          await db.userProfile.put({ key: userKey, value: cart });
          try {
            localStorage.setItem(userKey, JSON.stringify(cart));
          } catch (e) {
            // Ignore quota errors silently as IndexedDB is our source of truth
          }
        }
      } catch (e) {
        console.warn('Could not update cart in storage:', e);
      }
    }
    saveCart();
  }, [cart, cartUserId, authUser]);

  // Collapsible sidebar desktop default behavior
  useEffect(() => {
    if (isLoggedIn && !Capacitor.isNativePlatform()) {
      try {
        const saved = localStorage.getItem('dental_sidebar_collapsed');
        if (saved !== null) {
          setIsSidebarOpen(saved === 'false');
          return;
        }
      } catch (e) { }
      setIsSidebarOpen(true);
    } else {
      setIsSidebarOpen(false);
    }
  }, [isLoggedIn]);

  const handleLogout = async () => {
    if (await confirm('Are you sure you want to log out?')) {
      // Clear user session cart state
      setCart({});
      setCartUserId(undefined);

      // Clear session storage caches
      try {
        sessionStorage.clear();
      } catch (e) {
        console.warn('Could not clear sessionStorage:', e);
      }

      await supabase.auth.signOut();
      setIsLoggedIn(false);
      setAuthUser(null);
      setIsSidebarOpen(false);
      setActiveTab('catalog');
    }
  };

  const [activeAlarm, setActiveAlarm] = useState(null);
  const [activeAlarmClient, setActiveAlarmClient] = useState(null);
  const [isAiOpen, setIsAiOpen] = useState(false);

  // Real-time memory cache using Zustand store
  const globalLoading = useStore(state => state.loading);
  const initData = useStore(state => state.initData);
  const clearData = useStore(state => state.clearData);
  const storeProducts = useStore(state => state.products);

  useEffect(() => {
    console.log('App.jsx storeProducts changed:', storeProducts);
  }, [storeProducts]);

  useEffect(() => {
    let activeSubscriptions = [];

    // Trigger initial data load
    initData(isLoggedIn);

    // Online event handler to trigger syncQueue processing
    const handleOnlineStatusChange = () => {
      if (navigator.onLine) {
        processSyncQueue();
      }
    };
    window.addEventListener('online', handleOnlineStatusChange);

    // Run sync worker on mount
    handleOnlineStatusChange();

    // Supabase Realtime subscriptions
    const productsSub = supabase
      .channel('realtime-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        useStore.getState().fetchProducts();
      })
      .subscribe();

    const categoriesSub = supabase
      .channel('realtime-categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_categories' }, () => {
        useStore.getState().fetchCategories();
      })
      .subscribe();

    activeSubscriptions.push(productsSub, categoriesSub);

    if (isLoggedIn) {
      const ordersSub = supabase
        .channel('realtime-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          useStore.getState().fetchOrders();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
          useStore.getState().fetchOrders();
        })
        .subscribe();

      const profilesSub = supabase
        .channel('realtime-profiles')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          useStore.getState().fetchProfiles();
        })
        .subscribe();

      activeSubscriptions.push(ordersSub, profilesSub);
    } else {
      clearData();
    }

    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      activeSubscriptions.forEach(sub => {
        supabase.removeChannel(sub);
      });
    };
  }, [isLoggedIn]);

  // Custom global confirm modal setup
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => {
    window.confirm = (message) => {
      return new Promise((resolve) => {
        setConfirmModal({ message, resolve });
      });
    };
  }, []);

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
        supabase.from('profiles').select('role, name, approved, clinic_name, phone, address, gst_number').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data) {
              if (data.role !== 'admin' && !data.approved) {
                supabase.auth.signOut();
                setAuthChecked(true);
                return;
              }
              const role = data.role;
              setAuthUser({
                role,
                name: data.name,
                user: session.user,
                clinicName: data.clinic_name,
                phone: data.phone,
                address: data.address,
                gstNumber: data.gst_number,
                approved: data.approved
              });
              setIsLoggedIn(true);
              const currentPath = window.location.pathname;
              if (currentPath === '/' || currentPath === '/login' || currentPath === '') {
                setActiveTab(role === 'admin' ? 'dashboard' : 'catalog');
              }
            }
            setAuthChecked(true);
          });
      } else {
        setAuthChecked(true);
      }
    });
  }, []);

  // Initialize DB and Seeder
  useEffect(() => {
    async function init() {
      try {
        await seedDemoData();
        await seedBasalImplants();
        await seedSurgicalKit();
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
        } else if (activeTab !== (isAdmin ? 'dashboard' : 'catalog')) {
          setActiveTab(isAdmin ? 'dashboard' : 'catalog');
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

  // Reset scroll to top on tab change or handle hash scroll
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      if (location.hash) {
        const id = location.hash.replace('#', '');
        const scrollTarget = () => {
          const el = document.getElementById(id);
          if (el) {
            const offsetTop = el.offsetTop - 86; // 86px offset to account for sticky header height + safety spacing
            mainEl.scrollTo({ top: Math.max(0, offsetTop), behavior: 'smooth' });
            return true;
          }
          return false;
        };

        if (!scrollTarget()) {
          const interval = setInterval(() => {
            if (scrollTarget()) clearInterval(interval);
          }, 50);
          setTimeout(() => clearInterval(interval), 1000);
        }
      } else {
        mainEl.scrollTo({ top: 0 });
      }
    }
  }, [activeTab, location.pathname, location.hash]);

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
        } else if (isSidebarOpen && window.innerWidth < 1024) {
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
    const rawProfile = arr.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});

    if (authUser?.user?.id) {
      const prefix = `${authUser.user.id}_`;
      const userProfile = {};

      for (const key in rawProfile) {
        if (key.startsWith(prefix)) {
          const cleanKey = key.slice(prefix.length);
          userProfile[cleanKey] = rawProfile[key];
        }
      }

      if (Object.keys(userProfile).length === 0 || !userProfile.userName) {
        userProfile.userName = authUser.name || '';
        userProfile.role = authUser.role === 'admin' ? 'Administrator' : 'Clinic Doctor / Manager';
        userProfile.userEmail = authUser.user.email || '';
        userProfile.userPhone = authUser.phone || '';
        userProfile.clinicName = authUser.clinicName || '';
        userProfile.clinicAddress = authUser.address || '';
        userProfile.gstNumber = authUser.gstNumber || '';
        userProfile.activeRole = authUser.role === 'admin' ? 'rep' : 'doctor';
        userProfile.actingClientId = null;
      }

      // Resolved independently of the branch above: prefer this user's prefixed
      // setting, fall back to a legacy unprefixed value, then a sane default.
      userProfile.gstRates = rawProfile[`${prefix}gstRates`] ?? rawProfile.gstRates ?? [5, 12, 18, 28];
      userProfile.defaultGstRate = rawProfile[`${prefix}defaultGstRate`] ?? rawProfile.defaultGstRate ?? 12;
      userProfile.commissionRate = rawProfile[`${prefix}commissionRate`] ?? rawProfile.commissionRate ?? 0.05;
      userProfile.salesQuota = rawProfile[`${prefix}salesQuota`] ?? rawProfile.salesQuota ?? 500000;
      userProfile.torqueNarrow = rawProfile[`${prefix}torqueNarrow`] ?? rawProfile.torqueNarrow ?? 20;
      userProfile.torqueStandard = rawProfile[`${prefix}torqueStandard`] ?? rawProfile.torqueStandard ?? 30;
      userProfile.torqueWide = rawProfile[`${prefix}torqueWide`] ?? rawProfile.torqueWide ?? 35;
      return userProfile;
    }

    return rawProfile;
  }, [authUser]);
  const isDoctorMode = profile?.activeRole === 'doctor';
  const activeProfileImage = profile
    ? (profile.activeRole === 'doctor' && profile.actingClientId
      ? profile[`profileImage_doctor_${profile.actingClientId}`]
      : profile[`profileImage_rep`] || profile[`profileImage` /* fallback */])
    : undefined;

  const handleReset = async () => {
    if (await confirm('Clear all logs and reset database? This cannot be undone.')) {
      await clearAllData();
      alert('Database cleared.');
      window.location.reload();
    }
  };

  const handleLangChange = (e) => {
    const newLang = e && e.target ? e.target.value : e;
    setLang(newLang);
    localStorage.setItem('dentalLang', newLang); // consistent key with initial read
  };

  const isAdmin = authUser?.role === 'admin';

  const cartCount = Object.values(cart || {}).reduce((s, i) => s + i.qty, 0);

  const [cartBouncing, setCartBouncing] = useState(false);

  useEffect(() => {
    if (cartCount > 0) {
      setCartBouncing(true);
      const timer = setTimeout(() => setCartBouncing(false), 450);
      return () => clearTimeout(timer);
    }
  }, [cartCount]);


  const splashLoader = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99998,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: '#0a0f1e',
    }}>
      <style>{`
        @keyframes _bgPulse  { from { opacity:0.7; } to { opacity:1; } }
        @keyframes _ringExp  { 0% { transform:scale(0.8); opacity:0.6; } 100% { transform:scale(1.2); opacity:0; } }
        @keyframes _logoFlt  { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-9px); } }
        @keyframes _fadeUp   { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes _shimmer  { 0% { background-position:100% 0; } 100% { background-position:-100% 0; } }
        @keyframes _dotB     { 0%,75%,100% { transform:translateY(0); opacity:0.4; } 38% { transform:translateY(-8px); opacity:1; } }
        ._splash-bg::before {
          content:''; position:absolute; inset:0; pointer-events:none;
          background:
            radial-gradient(ellipse 70% 60% at 20% 30%, rgba(14,165,233,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 70%, rgba(99,102,241,0.10) 0%, transparent 60%);
          animation: _bgPulse 4s ease-in-out infinite alternate;
        }
      `}</style>

      {/* Background glow layer */}
      <div className="_splash-bg" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(14,165,233,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.035) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%)',
      }} />

      {/* Expanding rings */}
      {[150, 220, 300].map((size, i) => (
        <div key={size} style={{
          position: 'absolute', width: size, height: size, borderRadius: '50%',
          border: '1px solid rgba(14,165,233,0.14)',
          animation: `_ringExp 3s ease-out ${i * 0.9}s infinite`,
        }} />
      ))}

      {/* Floating logo */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: 82, height: 82, borderRadius: 26,
        background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 24px 56px rgba(14,165,233,0.45), 0 0 100px rgba(99,102,241,0.2)',
        animation: '_logoFlt 3.2s ease-in-out infinite, _fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both',
        marginBottom: 26,
      }}>
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(255,255,255,0.2)" />
          <path d="M8 11.5c.5-1 1.5-2 3-2s2.5 1 3 2c.5 1.5.5 3.5 0 4.5s-2 1.5-3 1.5-2.5-.5-3-1.5c-.5-1-.5-3 0-4.5z" fill="none" />
        </svg>
      </div>

      {/* Brand name */}
      <div style={{
        position: 'relative', zIndex: 1,
        fontFamily: 'Outfit, -apple-system, sans-serif', fontWeight: 900, fontSize: '1.65rem',
        letterSpacing: '-0.04em', color: '#fff',
        animation: '_fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.15s both', marginBottom: 5
      }}>
        <span style={{ background: 'linear-gradient(135deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Simple</span>
        {' '}Implant
      </div>

      {/* Tagline */}
      <div style={{
        position: 'relative', zIndex: 1,
        fontFamily: 'Outfit, -apple-system, sans-serif', fontWeight: 700, fontSize: '0.68rem',
        letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
        animation: '_fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.3s both', marginBottom: 42
      }}>
        Dental Commerce Platform
      </div>

      {/* Shimmer bar */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: 168, height: 3, borderRadius: 99,
        background: 'rgba(255,255,255,0.07)', overflow: 'hidden',
        animation: '_fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s both'
      }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 99,
          background: 'linear-gradient(90deg, transparent, #0ea5e9, #6366f1, #0ea5e9, transparent)',
          backgroundSize: '300% 100%',
          animation: '_shimmer 1.6s linear infinite'
        }} />
      </div>

      {/* Bouncing dots */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 7, marginTop: 20, animation: '_fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.5s both' }}>
        {[0, 0.22, 0.44].map((delay, i) => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'rgba(56,189,248,0.55)',
            animation: `_dotB 1.3s ease-in-out ${delay}s infinite`
          }} />
        ))}
      </div>
    </div>
  );

  if (!isDbReady) return splashLoader;

  if (!authChecked) return splashLoader;

  if (globalLoading) return splashLoader;



  return (
    <>
      {/* Sleek Glassmorphic Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 20px',
          borderRadius: 16,
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          border: toast.type === 'success' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
          color: toast.type === 'success' ? '#10b981' : '#f59e0b',
          fontFamily: 'Outfit',
          fontSize: '0.8rem',
          fontWeight: 700,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)',
          animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both'
        }}>
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              padding: 0,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Sidebar Drawer Overlay + Drawer — logged-in: full nav; guests: minimal nav, mobile-only via hamburger */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''} ${!isLoggedIn ? 'guest-only-mobile' : ''}`} onClick={() => setIsSidebarOpen(false)} />

      <div className={`sidebar-drawer ${isSidebarOpen ? 'open' : ''} ${!isLoggedIn ? 'guest-only-mobile' : ''}`}>
            <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', width: '100%', height: '81px', position: 'relative' }}>
              <img
                src={`${import.meta.env.BASE_URL || '/'}logo.png`}
                alt="Simple Implants"
                className="sidebar-logo-animated"
                style={{
                  height: '90px',
                  width: 'auto',
                  filter: 'drop-shadow(0 8px 24px rgba(2, 132, 199, 0.25))',
                  objectFit: 'contain'
                }}
              />
              <button
                onClick={() => setIsSidebarOpen(false)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '16px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'hsl(var(--text-muted))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Compact user card */}
              {isLoggedIn ? (
                <div
                  onClick={() => handleNav('profile')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    marginTop: '14px', padding: '10px 12px', flexShrink: 0,
                    background: 'hsla(0,0%,100%,0.6)', borderRadius: '14px',
                    border: '1px solid hsla(205,85%,50%,0.1)',
                    boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
                    backdropFilter: 'blur(10px)', cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--primary) / 30%)'; e.currentTarget.style.background = 'hsla(0,0%,100%,0.85)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'hsla(205,85%,50%,0.1)'; e.currentTarget.style.background = 'hsla(0,0%,100%,0.6)'; }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {activeProfileImage ? (
                      <img src={activeProfileImage} alt="Avatar" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover', border: '2px solid hsl(var(--primary))' }} />
                    ) : (
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.9rem', boxShadow: '0 3px 10px rgba(14,165,233,0.3)' }}>
                        {(authUser?.name || profile?.userName || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '9px', height: '9px', background: '#22c55e', border: '2px solid #fff', borderRadius: '50%' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '800', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {authUser?.name || profile?.userName || 'User'}
                    </div>
                    <div style={{ fontSize: '0.58rem', color: 'hsl(var(--text-muted))', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '1px' }}>
                      {authUser?.role === 'admin' ? 'Administrator' : profile?.role || t('representative', lang)}
                    </div>
                  </div>
                  <ChevronRight size={14} color="hsl(var(--text-dim))" style={{ flexShrink: 0 }} />
                </div>
              ) : (
                <div
                  onClick={() => { setIsSidebarOpen(false); setTimeout(() => setShowLoginModal(true), 150); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    marginTop: '14px', padding: '10px 12px', flexShrink: 0,
                    background: 'hsla(0,0%,100%,0.6)', borderRadius: '14px',
                    border: '1px solid hsla(205,85%,50%,0.1)',
                    boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
                    backdropFilter: 'blur(10px)', cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'hsl(var(--primary) / 30%)'; e.currentTarget.style.background = 'hsla(0,0%,100%,0.85)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'hsla(205,85%,50%,0.1)'; e.currentTarget.style.background = 'hsla(0,0%,100%,0.6)'; }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'hsl(var(--border-color))', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                    👤
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '800', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>
                      Guest User
                    </div>
                    <div style={{ fontSize: '0.58rem', color: 'hsl(var(--text-muted))', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '1px' }}>
                      Click to Log In
                    </div>
                  </div>
                  <ChevronRight size={14} color="hsl(var(--text-dim))" style={{ flexShrink: 0 }} />
                </div>
              )}

              <div className="sidebar-scroller" style={{ borderTop: '1px solid hsl(var(--border-color))', marginTop: '16px', paddingTop: '16px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                <div className="sidebar-menu-list">
                  {!isLoggedIn ? (
                    /* ── GUEST NAV ── */
                    <>
                      <button className={`sidebar-link ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => handleNav('catalog')}>
                        <Store size={16} />
                        <span>Product Catalog</span>
                        {cartCount > 0 && <span style={{ marginLeft: 'auto', background: '#0ea5e9', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '1px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center' }}>{cartCount}</span>}
                      </button>
                      <button className={`sidebar-link ${activeTab === 'guides' ? 'active' : ''}`} onClick={() => handleNav('guides')}>
                        <Film size={16} /><span>Guides & Videos</span>
                      </button>
                      <button className="sidebar-link" onClick={() => { setIsSidebarOpen(false); setTimeout(() => setShowLoginModal(true), 150); }} style={{ color: 'hsl(var(--primary))' }}>
                        <LogIn size={16} /><span>Log In / Register</span>
                      </button>
                    </>
                  ) : isAdmin ? (
                    /* ── ADMIN NAV ── */
                    <>
                      <button className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleNav('dashboard')}>
                        <LayoutDashboard size={16} /><span>Dashboard</span>
                      </button>
                      <button className={`sidebar-link ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => handleNav('orders')}>
                        <ClipboardList size={16} /><span>Orders</span>
                      </button>
                      <button className={`sidebar-link ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => handleNav('sales')}>
                        <ShoppingBag size={16} /><span>{t('navSales', lang)}</span>
                      </button>
                      <button className={`sidebar-link ${activeTab === 'products' ? 'active' : ''}`} onClick={() => handleNav('products')}>
                        <Store size={16} /><span>Products</span>
                      </button>
                      <button className={`sidebar-link ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => handleNav('inventory')}>
                        <Package size={16} /><span>{t('navInventory', lang)}</span>
                      </button>
                      <button className={`sidebar-link ${activeTab === 'implants' ? 'active' : ''}`} onClick={() => handleNav('implants')}>
                        <Activity size={16} /><span>{t('navImplants', lang)}</span>
                      </button>
                      <button className={`sidebar-link ${activeTab === 'marketing' ? 'active' : ''}`} onClick={() => handleNav('marketing')}>
                        <Megaphone size={16} /><span>{t('navMarketing', lang)}</span>
                      </button>
                      <button className={`sidebar-link ${activeTab === 'master' ? 'active' : ''}`} onClick={() => handleNav('master')}>
                        <Settings size={16} /><span>{t('navMaster', lang)}</span>
                      </button>
                      <button className={`sidebar-link ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => handleNav('admin')}>
                        <ShieldCheck size={16} /><span>Admin Panel</span>
                      </button>
                      <button className={`sidebar-link ${activeTab === 'reminders' ? 'active' : ''}`} onClick={() => handleNav('reminders')}>
                        <Bell size={16} /><span>{t('navAlerts', lang)}</span>
                      </button>
                      <button className={`sidebar-link ${activeTab === 'guides' ? 'active' : ''}`} onClick={() => handleNav('guides')}>
                        <Film size={16} /><span>{t('navGuides', lang)}</span>
                      </button>
                      <button className={`sidebar-link ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => handleNav('profile')}>
                        <User size={16} /><span>Profile & Settings</span>
                      </button>
                    </>
                  ) : (
                    /* ── DOCTOR NAV ── */
                    <>
                      <button className={`sidebar-link ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => handleNav('catalog')}>
                        <Store size={16} />
                        <span>Product Catalog</span>
                        {cartCount > 0 && <span style={{ marginLeft: 'auto', background: '#0ea5e9', color: '#fff', fontSize: '0.6rem', fontWeight: 800, padding: '1px 6px', borderRadius: 10, minWidth: 18, textAlign: 'center' }}>{cartCount}</span>}
                      </button>
                      <button className={`sidebar-link ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => handleNav('sales')}>
                        <ClipboardList size={16} /><span>My Orders</span>
                      </button>
                      <button className={`sidebar-link ${activeTab === 'implants' ? 'active' : ''}`} onClick={() => handleNav('implants')}>
                        <Activity size={16} /><span>My Cases</span>
                      </button>
                      <button className={`sidebar-link ${activeTab === 'guides' ? 'active' : ''}`} onClick={() => handleNav('guides')}>
                        <Film size={16} /><span>Guides & Videos</span>
                      </button>
                      <button className={`sidebar-link ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => handleNav('profile')}>
                        <User size={16} /><span>Profile & Settings</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Premium Sidebar Help Callout */}
                <div style={{
                  marginTop: '24px',
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, hsla(205, 85%, 50%, 0.05) 0%, hsla(162, 75%, 38%, 0.02) 100%)',
                  border: '1px solid hsl(var(--primary) / 12%)',
                  boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Subtle background glow */}
                  <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '60px', height: '60px', borderRadius: '50%', background: 'hsl(var(--primary))', filter: 'blur(30px)', opacity: 0.15, pointerEvents: 'none' }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'hsl(var(--primary))', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Outfit', marginBottom: '12px' }}>
                    <span style={{ display: 'flex', width: 6, height: 6, borderRadius: '50%', background: 'hsl(var(--primary))' }} />
                    Contact Support
                  </div>

                  {/* Specialist Profile */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.95rem', fontFamily: 'Outfit', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)' }}>
                        L
                      </div>
                      <span style={{ position: 'absolute', bottom: '0px', right: '0px', width: '10px', height: '10px', background: '#22c55e', border: '2px solid hsl(var(--bg-card))', borderRadius: '50%' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>
                        Lal
                      </div>
                      <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>
                        Support Specialist
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a
                      href="tel:+919444126926"
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 0',
                        borderRadius: '10px',
                        background: 'hsl(var(--bg-card))',
                        border: '1.5px solid hsl(var(--primary) / 15%)',
                        color: 'hsl(var(--primary))',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        fontFamily: 'Outfit',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'hsl(var(--primary))';
                        e.currentTarget.style.color = '#fff';
                        e.currentTarget.style.borderColor = 'hsl(var(--primary))';
                        e.currentTarget.style.boxShadow = '0 4px 12px hsl(var(--primary-glow))';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'hsl(var(--bg-card))';
                        e.currentTarget.style.color = 'hsl(var(--primary))';
                        e.currentTarget.style.borderColor = 'hsl(var(--primary) / 15%)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <Phone size={12} strokeWidth={2.5} /> Call
                    </a>
                    <a
                      href="mailto:simpleimplants@gmail.com"
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 0',
                        borderRadius: '10px',
                        background: 'hsl(var(--bg-card))',
                        border: '1.5px solid hsl(var(--border-color))',
                        color: 'hsl(var(--text-muted))',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        fontFamily: 'Outfit',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'hsl(var(--bg-card-hover))';
                        e.currentTarget.style.color = 'hsl(var(--text-primary))';
                        e.currentTarget.style.borderColor = 'hsl(var(--border-light))';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'hsl(var(--bg-card))';
                        e.currentTarget.style.color = 'hsl(var(--text-muted))';
                        e.currentTarget.style.borderColor = 'hsl(var(--border-color))';
                      }}
                    >
                      <Mail size={12} strokeWidth={2.5} /> Email
                    </a>
                  </div>
                </div>

              </div>

              {/* Compact footer actions */}
              <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: '10px', paddingBottom: '2px', display: 'flex', gap: '8px', flexShrink: 0 }}>
                {isLoggedIn ? (
                  <button
                    onClick={handleLogout}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '10px 8px', borderRadius: '12px',
                      border: '1px solid hsla(0, 84%, 60%, 0.2)',
                      background: 'linear-gradient(135deg, hsla(0, 84%, 60%, 0.05) 0%, hsla(0, 84%, 60%, 0.01) 100%)',
                      color: 'hsl(348, 83%, 47%)',
                      fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', fontFamily: 'Outfit',
                      boxShadow: '0 2px 8px rgba(225, 29, 72, 0.05)',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, hsla(0, 84%, 60%, 0.1) 0%, hsla(0, 84%, 60%, 0.05) 100%)';
                      e.currentTarget.style.borderColor = 'hsla(0, 84%, 60%, 0.4)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(225, 29, 72, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, hsla(0, 84%, 60%, 0.05) 0%, hsla(0, 84%, 60%, 0.01) 100%)';
                      e.currentTarget.style.borderColor = 'hsla(0, 84%, 60%, 0.2)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(225, 29, 72, 0.05)';
                    }}
                    title="Log Out / Switch Portal"
                  >
                    <LogOut size={13} /> Log Out
                  </button>
                ) : (
                  <button
                    onClick={() => { setIsSidebarOpen(false); setTimeout(() => setShowLoginModal(true), 150); }}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '9px 8px', borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff',
                      fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'Outfit',
                      boxShadow: '0 4px 10px rgba(14,165,233,0.2)'
                    }}
                  >
                    <LogIn size={13} /> Log In
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={handleReset}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                      padding: '9px 14px', borderRadius: '10px',
                      border: '1px solid rgba(239,68,68,0.2)',
                      background: 'rgba(239,68,68,0.04)', color: '#ef4444',
                      fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'Outfit',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.04)'; }}
                    title={t('resetDb', lang)}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

      <div className="main-layout-container">
        {/* Main Premium Layout Wrapper */}
        {!isLoggedIn ? (
          <div className={`app-header guest-header ${guestScrolled ? 'scrolled' : ''}`}>
            <div className="guest-header-inner">
              <div className="guest-brand-wrapper">
                <button
                  onClick={() => setIsSidebarOpen(prev => !prev)}
                  className="header-btn guest-hamburger-btn"
                  title="Menu"
                >
                  <Menu size={16} />
                </button>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }} className="guest-brand">
                  <img
                    src={`${import.meta.env.BASE_URL || '/'}logo.png`}
                    alt="Simple Implants"
                    className="sidebar-logo-animated navbar-brand-logo"
                  />
                </Link>
              </div>

              <div className="guest-right-nav">
                <div className="guest-nav-links">
                  <Link to="/" className={`guest-nav-link ${location.pathname === '/' && !location.hash ? 'active' : ''}`}>Home</Link>
                  <Link to="/#about" className={`guest-nav-link ${location.pathname === '/' && location.hash === '#about' ? 'active' : ''}`}>About</Link>
                  <Link to="/catalog" className={`guest-nav-link ${location.pathname === '/catalog' ? 'active' : ''}`}>Products</Link>
                  <Link to="/#events-courses" className={`guest-nav-link ${location.pathname === '/' && location.hash === '#events-courses' ? 'active' : ''}`}>Events &amp; Courses</Link>
                  <Link to="/guides" className={`guest-nav-link ${location.pathname === '/guides' ? 'active' : ''}`}>Videos</Link>
                  <Link to="/#contact" className={`guest-nav-link ${location.pathname === '/' && location.hash === '#contact' ? 'active' : ''}`}>Contact</Link>
                </div>
              </div>

              {/* Right: Actions pinned to far right */}
              <div className="guest-header-actions">
                <div className="header-select-wrapper">
                  <PremiumSelect
                    value={lang}
                    onChange={handleLangChange}
                    options={[
                      { label: 'English', value: 'en' },
                      { label: 'Telugu', value: 'te' },
                      { label: 'Hindi', value: 'hi' },
                      { label: 'Tamil', value: 'ta' }
                    ]}
                    icon={<Globe size={14} />}
                    style={{ fontSize: '0.7rem' }}
                  />
                </div>

                <button
                  onClick={() => setIsAiOpen(true)}
                  className="header-btn header-btn-ai"
                  title="AI Assistant (Ctrl + /)"
                >
                  <MessageSquare size={15} />
                </button>

                <button
                  onClick={() => {
                    setActiveTab('catalog');
                    setIsCartOpen(true);
                  }}
                  className={`header-btn header-btn-cart ${cartBouncing ? 'cart-pop-bounce' : ''}`}
                  style={{
                    border: isCartOpen ? '1.5px solid hsl(var(--primary))' : '1.5px solid hsl(var(--border-color))',
                    color: isCartOpen ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))'
                  }}
                  title="View Cart"
                >
                  <ShoppingCart size={15} />
                  {cartCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      background: 'linear-gradient(135deg, hsl(var(--primary)), #6366f1)',
                      color: '#fff',
                      fontSize: '0.55rem',
                      fontWeight: '800',
                      borderRadius: '50%',
                      minWidth: '13px',
                      height: '13px',
                      padding: '0 3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(14,165,233,0.3)',
                      border: '1px solid hsl(var(--bg-dark))',
                      fontFamily: 'Outfit'
                    }}>
                      {cartCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setShowLoginModal(true)}
                  className="header-login-btn"
                  title="Log In"
                >
                  <LogIn size={13} />
                  <span className="login-text">Log In</span>
                </button>
              </div>
            </div>
          </div>

        ) : (
          <div className="app-header" style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img
                  src={`${import.meta.env.BASE_URL || '/'}logo.png`}
                  alt="Simple Implants"
                  className="sidebar-logo-animated navbar-brand-logo"
                  style={{
                    width: 'auto',
                    filter: 'drop-shadow(0 4px 12px rgba(2, 132, 199, 0.15))',
                    objectFit: 'contain'
                  }}
                />
                {isDoctorMode && (
                  <span style={{ fontSize: '0.55rem', background: 'hsl(var(--secondary) / 12%)', color: 'hsl(var(--secondary))', padding: '1px 6px', borderRadius: '4px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Doctor Portal
                  </span>
                )}
              </div>
              {isLoggedIn && (
                <button
                  onClick={() => setIsSidebarOpen(prev => {
                    const next = !prev;
                    try {
                      localStorage.setItem('dental_sidebar_collapsed', String(!next));
                    } catch (e) { }
                    return next;
                  })}
                  className="header-btn"
                  style={{
                    border: isSidebarOpen ? '1.5px solid hsl(var(--primary))' : '1.5px solid hsl(var(--border-color))',
                    color: isSidebarOpen ? 'hsl(var(--primary))' : 'hsl(var(--text-primary))'
                  }}
                  title="Toggle Menu"
                >
                  <Menu size={15} />
                </button>
              )}
            </div>

            {/* Premium Globe i18n Dropdown & Profile Icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>


              {/* AI Support Chat Button */}
              <button
                onClick={() => setIsAiOpen(true)}
                className="header-btn header-btn-ai"
                title="AI Assistant (Ctrl + /)"
              >
                <MessageSquare size={15} />
              </button>

              {/* Cart Navigation Button — hidden for admin */}
              {!isAdmin && (
                <button
                  onClick={() => {
                    setActiveTab('catalog');
                    setIsCartOpen(true);
                  }}
                  className={`header-btn header-btn-cart ${cartBouncing ? 'cart-pop-bounce' : ''}`}
                  style={{
                    border: isCartOpen ? '1.5px solid hsl(var(--primary))' : '1.5px solid hsl(var(--border-color))',
                    color: isCartOpen ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))'
                  }}
                  title="View Cart"
                >
                  <ShoppingCart size={15} />
                  {cartCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      background: 'linear-gradient(135deg, hsl(var(--primary)), #6366f1)',
                      color: '#fff',
                      fontSize: '0.55rem',
                      fontWeight: '800',
                      borderRadius: '50%',
                      minWidth: '13px',
                      height: '13px',
                      padding: '0 3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(14,165,233,0.3)',
                      border: '1px solid hsl(var(--bg-dark))',
                      fontFamily: 'Outfit'
                    }}>
                      {cartCount}
                    </span>
                  )}
                </button>
              )}

              <div className="header-select-wrapper">
                <PremiumSelect
                  value={lang}
                  onChange={handleLangChange}
                  options={[
                    { label: 'English', value: 'en' },
                    { label: 'Telugu', value: 'te' },
                    { label: 'Hindi', value: 'hi' },
                    { label: 'Tamil', value: 'ta' }
                  ]}
                  icon={<Globe size={14} />}
                  style={{ fontSize: '0.7rem' }}
                />
              </div>

              {isLoggedIn ? (
                <>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="header-btn header-btn-profile"
                    style={{
                      border: activeTab === 'profile' ? '1.5px solid hsl(var(--primary))' : '1.5px solid hsl(var(--border-color))'
                    }}
                    title="Profile & Settings"
                  >
                    {activeProfileImage ? (
                      <img src={activeProfileImage} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <User size={15} color="hsl(var(--text-primary))" />
                    )}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="header-btn header-btn-logout"
                    title="Log Out"
                  >
                    <LogOut size={15} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="header-login-btn"
                  title="Log In"
                >
                  <LogIn size={13} />
                  <span className="login-text">Log In</span>
                </button>
              )}
            </div>
          </div>
        )}

        <main className={!isLoggedIn ? 'guest-main' : ''}>
          <Suspense fallback={<PremiumLoader text="Loading..." />}>
            <div key={location.pathname} style={{ animation: 'fadeInScreen 0.25s cubic-bezier(0.16, 1, 0.3, 1) both', width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
              <Routes>
                {isLoggedIn ? (
                  <>
                    <Route path="/dashboard" element={
                      <DashboardScreen
                        authUser={authUser}
                        onNavigate={setActiveTab}
                      />
                    } />
                    <Route path="/catalog" element={
                      <ProductCatalog
                        authUser={authUser}
                        cart={cart}
                        onCartChange={setCart}
                        cartOpen={isCartOpen}
                        setCartOpen={setIsCartOpen}
                        onOrderPlaced={() => setActiveTab('sales')}
                        onLoginRequired={(afterLoginFn) => {
                          if (afterLoginFn) setPostLoginAction(() => afterLoginFn);
                          setShowLoginModal(true);
                        }}
                      />
                    } />
                    <Route path="/orders" element={
                      <OrderManagement />
                    } />
                    <Route path="/products" element={<ProductManagement />} />
                    <Route path="/sales" element={isAdmin ? <ProSalesSubscreen lang={lang} profile={profile} onNavigate={setActiveTab} /> : <DoctorOrders authUser={authUser} onGoToCatalog={() => setActiveTab('catalog')} />} />
                    <Route path="/implants" element={<ProImplantsSubscreen lang={lang} profile={profile} />} />
                    <Route path="/inventory" element={<ProInventorySubscreen lang={lang} profile={profile} />} />
                    <Route path="/reminders" element={<ProRemindersSubscreen lang={lang} profile={profile} />} />
                    <Route path="/marketing" element={<ProMarketingSubscreen lang={lang} profile={profile} />} />
                    <Route path="/guides" element={<ProGuidesSubscreen lang={lang} profile={profile} isLoggedIn={true} />} />
                    <Route path="/master" element={<ProMasterDataSubscreen lang={lang} profile={profile} authUser={authUser} />} />
                    <Route path="/profile" element={<ProProfileSettingsSubscreen lang={lang} profile={profile} authUser={authUser} isAdmin={isAdmin} />} />
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="*" element={
                      <Navigate to={isAdmin ? "/dashboard" : "/catalog"} replace />
                    } />
                  </>
                ) : (
                  <>
                    <Route path="/catalog" element={
                      <ProductCatalog
                        authUser={authUser}
                        cart={cart}
                        onCartChange={setCart}
                        cartOpen={isCartOpen}
                        setCartOpen={setIsCartOpen}
                        onOrderPlaced={() => setActiveTab('sales')}
                        onLoginRequired={(afterLoginFn) => {
                          if (afterLoginFn) setPostLoginAction(() => afterLoginFn);
                          setShowLoginModal(true);
                        }}
                      />
                    } />
                    <Route path="/guides" element={<ProGuidesSubscreen lang={lang} isLoggedIn={false} />} />
                    <Route path="/" element={<LandingPage onLoginRequired={() => setShowLoginModal(true)} />} />
                    <Route path="/terms" element={<PolicyPage type="terms" />} />
                    <Route path="/privacy" element={<PolicyPage type="privacy" />} />
                    <Route path="/refund-policy" element={<PolicyPage type="refund" />} />
                    <Route path="/shipping-policy" element={<PolicyPage type="shipping" />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </>
                )}
              </Routes>
            </div>
          </Suspense>
        </main>

        {/* Bottom Premium Nav Bar */}
        {isLoggedIn && (
          <div className="bottom-nav" style={{ gridTemplateColumns: `repeat(${isAdmin ? 5 : 4}, 1fr)` }}>
            {isAdmin ? (
              <>
                <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                  <LayoutDashboard /><span>Dashboard</span>
                </button>
                <button className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
                  <ClipboardList /><span>Orders</span>
                </button>
                <button className={`nav-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
                  <Store /><span>Products</span>
                </button>
                <button className={`nav-item ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
                  <ShoppingBag /><span>{t('navSales', lang)}</span>
                </button>
                <button className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
                  <ShieldCheck /><span>Admin</span>
                </button>
              </>
            ) : (
              <>
                <button className={`nav-item ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => setActiveTab('catalog')} style={{ position: 'relative' }}>
                  <Store />
                  {cartCount > 0 && <span style={{ position: 'absolute', top: 4, right: '50%', transform: 'translateX(10px)', background: '#ef4444', color: '#fff', fontSize: '0.5rem', fontWeight: 800, padding: '1px 4px', borderRadius: 8, minWidth: 14, textAlign: 'center' }}>{cartCount}</span>}
                  <span>Catalog</span>
                </button>
                <button className={`nav-item ${activeTab === 'sales' || activeTab === 'my-orders' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
                  <ClipboardList /><span>My Orders</span>
                </button>
                <button className={`nav-item ${activeTab === 'implants' ? 'active' : ''}`} onClick={() => setActiveTab('implants')}>
                  <Activity /><span>My Cases</span>
                </button>
                <button className={`nav-item ${activeTab === 'guides' ? 'active' : ''}`} onClick={() => setActiveTab('guides')}>
                  <Film /><span>Videos</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Bottom Nav Bar — guest, minimal */}
        {!isLoggedIn && (
          <div className="bottom-nav" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <button className={`nav-item ${location.pathname === '/' && !location.hash ? 'active' : ''}`} onClick={() => handleNav('')}>
              <Store /><span>Home</span>
            </button>
            <button className={`nav-item ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => handleNav('catalog')} style={{ position: 'relative' }}>
              <ShoppingBag />
              {cartCount > 0 && <span style={{ position: 'absolute', top: 4, right: '50%', transform: 'translateX(10px)', background: '#ef4444', color: '#fff', fontSize: '0.5rem', fontWeight: 800, padding: '1px 4px', borderRadius: 8, minWidth: 14, textAlign: 'center' }}>{cartCount}</span>}
              <span>Products</span>
            </button>
            <button className={`nav-item ${activeTab === 'guides' ? 'active' : ''}`} onClick={() => handleNav('guides')}>
              <Film /><span>Videos</span>
            </button>
            <button className="nav-item" onClick={() => setShowLoginModal(true)}>
              <LogIn /><span>Log In</span>
            </button>
          </div>
        )}
      </div> {/* END main-layout-container */}

      {/* Floating Scroll to Top / Bottom Buttons */}
      <div className="floating-scroll-controls">
        <button
          onClick={() => document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="scroll-btn up"
          title="Scroll to Top"
        >
          <ChevronUp size={20} />
        </button>
        <button
          onClick={() => {
            const mainEl = document.querySelector('main');
            if (mainEl) mainEl.scrollTo({ top: mainEl.scrollHeight, behavior: 'smooth' });
          }}
          className="scroll-btn down"
          title="Scroll to Bottom"
        >
          <ChevronDown size={20} />
        </button>
        <a
          href="https://wa.me/919444126926?text=Hello%20Simple%20Implants%20Support%2C%20I%20am%20using%20the%20B2B%20catalog%20app%20and%20have%20a%20query%20regarding%20surgical%20supplies%2C%20clinical%20cases%2C%20or%20pricing.%20Could%20you%20please%20assist%20me%3F"
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-btn"
          title="Chat on WhatsApp"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.248 8.477 3.517 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.731-1.456L0 24h.057zM12.008 2.18c-5.405 0-9.782 4.382-9.785 9.791a9.77 9.77 0 001.492 5.178l.327.52-1.002 3.657 3.743-.982.507.301a9.75 9.75 0 005.173 1.496c5.405 0 9.782-4.382 9.786-9.79a9.77 9.77 0 00-2.868-6.924A9.73 9.73 0 0012.008 2.18zm5.359 13.149c-.293-.146-1.737-.858-2.006-.955-.269-.098-.465-.147-.661.147-.196.293-.76.955-.931 1.15-.171.196-.343.22-.636.073-.293-.146-1.239-.456-2.361-1.458-.873-.779-1.462-1.74-1.633-2.033-.171-.293-.018-.452.129-.597.132-.131.293-.342.44-.513.146-.171.196-.293.293-.489.098-.196.049-.367-.024-.513-.074-.146-.661-1.593-.906-2.18-.238-.574-.48-.496-.661-.505-.171-.007-.367-.008-.563-.008-.196 0-.514.073-.783.366-.269.293-1.026 1.002-1.026 2.444s1.05 2.836 1.197 3.031c.147.196 2.067 3.156 5.006 4.428.699.303 1.246.484 1.671.62.704.223 1.345.192 1.851.116.564-.084 1.737-.709 1.982-1.393.245-.684.245-1.27.172-1.393-.073-.122-.269-.195-.563-.341z"/>
          </svg>
        </a>
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

      {showLoginModal && (
        <div
          onClick={() => setShowLoginModal(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 100000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: '16px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              border: '1px solid hsl(var(--border-color))',
              padding: '28px 24px',
              maxWidth: 420,
              width: '100%',
              borderRadius: 24,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
          >
            <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
              <button
                onClick={() => setShowLoginModal(false)}
                style={{
                  background: 'hsl(var(--bg-dark))',
                  border: '1px solid hsl(var(--border-color))',
                  borderRadius: 10,
                  padding: 6,
                  cursor: 'pointer',
                  display: 'flex',
                  color: 'hsl(var(--text-muted))',
                  transition: 'all 0.2s'
                }}
              >
                <X size={15} />
              </button>
            </div>
            <LoginScreen
              lang={lang}
              isModal={true}
              onLogin={(user) => {
                setAuthUser(user);
                setIsLoggedIn(true);
                setShowLoginModal(false);
                setActiveTab(user.role === 'admin' ? 'dashboard' : 'catalog');
                if (Object.keys(cart).length > 0 && user.role !== 'admin') {
                  setIsCartOpen(true);
                }
                // Execute any pending action (e.g., place order after login)
                if (postLoginAction) {
                  setTimeout(() => { postLoginAction(user); setPostLoginAction(null); }, 400);
                }
              }}
            />
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="modal-overlay-container animate-fade-in" style={{ zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.25)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} />
          <div className="confirm-dialog-card">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ padding: 12, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', boxShadow: '0 0 15px rgba(239, 68, 68, 0.1)' }}>
                <AlertTriangle size={28} />
              </div>
            </div>
            <h4 style={{ fontFamily: 'Outfit', fontSize: '1.05rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginBottom: 10 }}>Confirm Action</h4>
            <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))', lineHeight: 1.4, marginBottom: 20 }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
              <button
                onClick={() => {
                  confirmModal.resolve(false);
                  setConfirmModal(null);
                }}
                style={{ flex: 1, padding: '11px', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'Outfit', background: 'rgba(0, 0, 0, 0.04)', border: '1px solid hsl(var(--border-color))', cursor: 'pointer', color: 'hsl(var(--text-primary))', borderRadius: '10px' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.resolve(true);
                  setConfirmModal(null);
                }}
                style={{ flex: 1, padding: '11px', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'Outfit', background: 'linear-gradient(135deg, #ef4444, #ec4899)', border: 'none', color: '#ffffff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)', borderRadius: '10px' }}
              >
                Confirm
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
        .confirm-dialog-card {
          width: calc(100% - 32px);
          max-width: 350px;
          background: #ffffff !important;
          border: 1px solid hsl(var(--border-color)) !important;
          border-radius: 20px !important;
          padding: 26px 22px !important;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12) !important;
          text-align: center;
          position: relative;
          z-index: 100001;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
      `}</style>
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
