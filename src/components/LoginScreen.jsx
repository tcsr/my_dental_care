import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { Eye, EyeOff, Mail, Lock, User, Building2, Phone, MapPin, FileText, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';

export default function LoginScreen({ onLogin, isModal = false }) {
  const [screen, setScreen] = useState('login'); // 'login' | 'register' | 'pending' | 'forgot'
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // registration step 1 or 2
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({
    name: '', clinic_name: '', email: '', phone: '', address: '', gst_number: '', password: '', confirm: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });
      if (authErr) throw authErr;

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('role, approved, name, clinic_name, phone, address, gst_number')
        .eq('id', data.user.id)
        .single();

      if (profileErr) throw profileErr;

      if (profile.role === 'admin') {
        onLogin({ 
          role: 'admin', 
          name: profile.name, 
          user: data.user,
          clinicName: profile.clinic_name,
          phone: profile.phone,
          address: profile.address,
          gstNumber: profile.gst_number,
          approved: profile.approved
        });
      } else if (!profile.approved) {
        await supabase.auth.signOut();
        setPendingEmail(loginForm.email);
        setScreen('pending');
        return;
      } else {
        onLogin({ 
          role: profile.role, 
          name: profile.name, 
          user: data.user,
          clinicName: profile.clinic_name,
          phone: profile.phone,
          address: profile.address,
          gstNumber: profile.gst_number,
          approved: profile.approved
        });
      }
    } catch (err) {
      setError(err?.message || err?.error_description || String(err) || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const validateStep1 = () => {
    if (!regForm.name.trim()) { setError('Full name is required.'); return false; }
    if (!regForm.clinic_name.trim()) { setError('Clinic name is required.'); return false; }
    if (regForm.phone && !/^[6-9]\d{9}$/.test(regForm.phone.replace(/\s/g, ''))) {
      setError('Enter a valid 10-digit Indian mobile number (starts with 6-9).');
      return false;
    }
    if (regForm.gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(regForm.gst_number.toUpperCase())) {
      setError('Enter a valid 15-character GSTIN (e.g. 22AAAAA0000A1Z5).');
      return false;
    }
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (regForm.password !== regForm.confirm) { setError('Passwords do not match.'); return; }
    if (regForm.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signUp({
        email: regForm.email,
        password: regForm.password,
        options: { data: { name: regForm.name } },
      });
      if (authErr) throw authErr;

      // Wait for trigger to create profile row
      await new Promise(r => setTimeout(r, 1500));

      // Update profile details — approved stays false until admin approves
      const { error: profileErr } = await supabase.rpc('update_own_profile', {
        p_id: data.user.id,
        p_name: regForm.name,
        p_clinic_name: regForm.clinic_name,
        p_phone: regForm.phone,
        p_address: regForm.address,
        p_gst_number: regForm.gst_number,
      });

      if (profileErr) {
        console.warn('Profile update failed (non-fatal):', profileErr);
      }

      // Always sign out after registration — admin must approve before first login
      await supabase.auth.signOut();

      // Show pending approval screen
      setScreen('pending');

    } catch (err) {
      console.error('Register error:', err);
      const msg = err?.message
        || err?.error_description
        || (err && JSON.stringify(err, Object.getOwnPropertyNames(err)))
        || 'Registration failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!forgotEmail.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: window.location.origin,
      });
      if (resetErr) throw resetErr;
      setForgotSent(true);
    } catch (err) {
      setError(err?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── PENDING ──────────────────────────────────────────────────────────────────
  if (screen === 'pending') {
    return (
      <Wrapper isModal={isModal}>
        <div style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))',
            border: '2px solid rgba(245,158,11,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <AlertTriangle size={32} color="#f59e0b" />
          </div>
          <h3 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.3rem', color: '#0f172a', margin: '0 0 10px' }}>
            Awaiting Admin Approval
          </h3>
          {pendingEmail && (
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0ea5e9', margin: '0 auto 6px' }}>
              {pendingEmail}
            </p>
          )}
          <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.7, maxWidth: '300px', margin: '0 auto 6px' }}>
            Your clinic account is pending approval from Simple Implant admin.
          </p>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 auto 28px' }}>
            You'll receive access once an admin reviews your registration.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              disabled={loading}
              onClick={async () => {
                if (!pendingEmail) { setScreen('login'); return; }
                setLoading(true);
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session) {
                    const { data: profile } = await supabase.from('profiles').select('approved').eq('id', session.user.id).single();
                    if (profile?.approved) { window.location.reload(); return; }
                  } else {
                    // Try to sign in temporarily to check
                    const { data } = await supabase.auth.signInWithPassword({ email: pendingEmail, password: '___dummy_check___' });
                    if (data?.session) await supabase.auth.signOut();
                  }
                  setError('');
                  window.__triggerToast?.('Still pending approval. We\'ll notify you once approved.', 'info');
                } catch (_) {
                  // noop — expected if password is wrong
                  window.__triggerToast?.('Still pending approval. Please check back later.', 'info');
                } finally {
                  setLoading(false);
                }
              }}
              style={{ ...btnPrimary, opacity: loading ? 0.75 : 1 }}
            >
              {loading ? 'Checking...' : '↻ Refresh Status'}
            </button>
            <button onClick={() => { setScreen('login'); setStep(1); setPendingEmail(''); }} style={{ background: 'none', border: '1px solid hsl(220 13% 91%)', borderRadius: 12, padding: '12px', fontSize: '0.82rem', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}>
              Back to Login
            </button>
          </div>
        </div>
      </Wrapper>
    );
  }

  // ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
  if (screen === 'forgot') {
    return (
      <Wrapper isModal={isModal}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button onClick={() => { setScreen('login'); setError(''); setForgotSent(false); setForgotEmail(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.3rem', color: '#0f172a', margin: 0 }}>Reset Password</h2>
            <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '2px 0 0' }}>We'll send a reset link to your email</p>
          </div>
        </div>

        {error && <ErrorBox msg={error} />}

        {forgotSent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={24} color="#10b981" />
            </div>
            <p style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 700, margin: '0 0 6px' }}>Email Sent!</p>
            <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 24px' }}>
              Check your inbox at <strong>{forgotEmail}</strong> for the password reset link.
            </p>
            <button onClick={() => { setScreen('login'); setForgotSent(false); setForgotEmail(''); }} style={btnPrimary}>
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <PremiumInput icon={<Mail size={15} />} label="Email Address" required type="email"
              placeholder="Enter your registered email"
              value={forgotEmail} onChange={v => setForgotEmail(v)} />
            <button type="submit" disabled={loading} style={{ ...btnPrimary, marginTop: 4, opacity: loading ? 0.75 : 1 }}>
              {loading ? 'Sending...' : <> Send Reset Link <ArrowRight size={15} /> </>}
            </button>
          </form>
        )}
      </Wrapper>
    );
  }

  // ── REGISTER ─────────────────────────────────────────────────────────────────
  if (screen === 'register') {
    return (
      <Wrapper isModal={isModal}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button onClick={() => { setScreen('login'); setError(''); setStep(1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.3rem', color: '#0f172a', margin: 0 }}>Create Account</h2>
            <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '2px 0 0' }}>Register your clinic on Simple Implant</p>
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          {[1, 2].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.72rem', fontWeight: 800, fontFamily: 'Outfit',
                background: step >= s ? 'linear-gradient(135deg, #0ea5e9, #6366f1)' : 'rgba(0,0,0,0.06)',
                color: step >= s ? '#fff' : '#94a3b8',
                transition: 'all 0.3s'
              }}>{s}</div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: step >= s ? '#0ea5e9' : '#94a3b8', fontFamily: 'Outfit' }}>
                {s === 1 ? 'Clinic Info' : 'Credentials'}
              </span>
              {s < 2 && <div style={{ width: 32, height: 2, background: step > s ? '#0ea5e9' : 'rgba(0,0,0,0.08)', borderRadius: 2 }} />}
            </div>
          ))}
        </div>

        {error && <ErrorBox msg={error} />}

        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setError(''); if (validateStep1()) setStep(2); } : handleRegister}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {step === 1 ? (
            <>
              <PremiumInput icon={<User size={15} />} label="Full Name" required
                placeholder="Dr. John Smith" value={regForm.name}
                onChange={v => setRegForm(p => ({ ...p, name: v }))} />
              <PremiumInput icon={<Building2 size={15} />} label="Clinic / Hospital Name" required
                placeholder="Bright Smiles Clinic" value={regForm.clinic_name}
                onChange={v => setRegForm(p => ({ ...p, clinic_name: v }))} />
              <PremiumInput icon={<Phone size={15} />} label="Phone Number (10-digit)"
                placeholder="9876543210" value={regForm.phone}
                onChange={v => setRegForm(p => ({ ...p, phone: v }))} />
              <PremiumInput icon={<MapPin size={15} />} label="City / Address"
                placeholder="Hyderabad, Telangana" value={regForm.address}
                onChange={v => setRegForm(p => ({ ...p, address: v }))} />
              <PremiumInput icon={<FileText size={15} />} label="GST Number (optional)"
                placeholder="22AAAAA0000A1Z5" value={regForm.gst_number}
                onChange={v => setRegForm(p => ({ ...p, gst_number: v }))} />
              <button type="submit" style={{ ...btnPrimary, marginTop: 4 }}>
                Continue <ArrowRight size={15} />
              </button>
            </>
          ) : (
            <>
              <PremiumInput icon={<Mail size={15} />} label="Email Address" required type="email"
                placeholder="doctor@clinic.com" value={regForm.email}
                onChange={v => setRegForm(p => ({ ...p, email: v }))} />
              <PremiumInput icon={<Lock size={15} />} label="Password" required
                type={showPass ? 'text' : 'password'} placeholder="Min 8 characters" value={regForm.password}
                onChange={v => setRegForm(p => ({ ...p, password: v }))}
                suffix={
                  <button type="button" onClick={() => setShowPass(p => !p)} style={eyeStyle}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                } />
              <PremiumInput icon={<Lock size={15} />} label="Confirm Password" required
                type="password" placeholder="Repeat password" value={regForm.confirm}
                onChange={v => setRegForm(p => ({ ...p, confirm: v }))} />

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setStep(1)} style={btnOutline}>
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="submit" disabled={loading} style={{ ...btnPrimary, flex: 1, opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Submitting...' : 'Submit Registration'}
                </button>
              </div>
            </>
          )}
        </form>

        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8', marginTop: 20 }}>
          Already have an account?{' '}
          <button onClick={() => { setScreen('login'); setError(''); setStep(1); }}
            style={{ background: 'none', border: 'none', color: '#0ea5e9', fontWeight: 700, cursor: 'pointer', fontSize: '0.72rem' }}>
            Sign in
          </button>
        </p>
      </Wrapper>
    );
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────────────
  return (
    <Wrapper isModal={isModal}>
      {/* Brand */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 68, height: 68, borderRadius: 20, margin: '0 auto 14px',
          background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 12px 32px rgba(14,165,233,0.35)',
        }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(255,255,255,0.2)"/>
            <path d="M8 11.5c.5-1 1.5-2 3-2s2.5 1 3 2c.5 1.5.5 3.5 0 4.5s-2 1.5-3 1.5-2.5-.5-3-1.5c-.5-1-.5-3 0-4.5z" stroke="#fff" fill="none"/>
          </svg>
        </div>
        <h1 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.65rem', background: 'linear-gradient(135deg, #0284c7, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 6px' }}>
          Simple Implant
        </h1>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
          B2B Dental Implant & Order Management
        </p>
      </div>

      {error && <ErrorBox msg={error} />}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PremiumInput icon={<Mail size={15} />} label="Email Address" required type="email"
          placeholder="Enter your email"
          value={loginForm.email} onChange={v => setLoginForm(p => ({ ...p, email: v }))} />

        <PremiumInput icon={<Lock size={15} />} label="Password" required
          type={showPass ? 'text' : 'password'} placeholder="Enter your password"
          value={loginForm.password} onChange={v => setLoginForm(p => ({ ...p, password: v }))}
          suffix={
            <button type="button" onClick={() => setShowPass(p => !p)} style={eyeStyle}>
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          } />

        <button type="submit" disabled={loading} style={{ ...btnPrimary, marginTop: 4, opacity: loading ? 0.75 : 1 }}>
          {loading ? 'Signing in...' : <> Sign In <ArrowRight size={15} /> </>}
        </button>
      </form>

      {/* Forgot Password */}
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <button
          onClick={() => { setScreen('forgot'); setError(''); }}
          style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
        >
          Forgot your password?
        </button>
      </div>

      <div style={{ marginTop: 16, padding: '16px', background: 'rgba(14,165,233,0.04)', borderRadius: 12, border: '1px solid rgba(14,165,233,0.1)', textAlign: 'center' }}>
        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 10px', fontWeight: 500 }}>
          New to Simple Implant?
        </p>
        <button onClick={() => { setScreen('register'); setError(''); }} style={btnOutline}>
          Register your Clinic
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.65rem', color: '#cbd5e1', marginTop: 24 }}>
        🔒 Secured with end-to-end encryption
      </p>
    </Wrapper>
  );
}

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────

function Wrapper({ children, isModal }) {
  if (isModal) {
    return (
      <div style={{ width: '100%', boxSizing: 'border-box' }}>
        {children}
      </div>
    );
  }
  return (
    <div style={{
      minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 50%, #f0fdf4 100%)',
      padding: '24px', boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%', maxWidth: 420, background: '#fff',
        borderRadius: 'var(--radius-2xl)', padding: '36px 32px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.06)',
        border: '1px solid rgba(255,255,255,0.8)'
      }}>
        {children}
      </div>
    </div>
  );
}

function PremiumInput({ icon, label, required, type = 'text', placeholder, value, onChange, suffix }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ textAlign: 'left' }}>
      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6, letterSpacing: '0.02em' }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      <div className="premium-input-container" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        border: `1.5px solid ${focused ? '#0ea5e9' : '#e2e8f0'}`,
        borderRadius: 'var(--radius-sm)', padding: '0 12px', background: focused ? '#f0f9ff' : '#f8fafc',
        transition: 'all 0.2s', boxShadow: focused ? '0 0 0 3px rgba(14,165,233,0.1)' : 'none'
      }}>
        <span style={{ color: focused ? '#0ea5e9' : '#94a3b8', display: 'flex', flexShrink: 0, transition: 'color 0.2s' }}>{icon}</span>
        <input
          type={type} required={required} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            flex: 1, border: 'none', background: 'transparent', outline: 'none',
            fontSize: '0.82rem', color: '#0f172a', padding: '11px 0 11px 8px',
            fontFamily: 'Inter, sans-serif'
          }}
        />
        {suffix}
      </div>
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: '0.75rem', color: '#dc2626',
      marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500
    }}>
      <AlertTriangle size={15} style={{ flexShrink: 0 }} /> {msg}
    </div>
  );
}

const btnPrimary = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '12px 20px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
  background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
  color: '#fff', fontWeight: 800, fontSize: '0.82rem', fontFamily: 'Outfit',
  boxShadow: '0 4px 16px rgba(14,165,233,0.35)', transition: 'all 0.2s',
  width: '100%'
};

const btnOutline = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '12px 20px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
  background: 'transparent', border: '1.5px solid #e2e8f0',
  color: '#374151', fontWeight: 700, fontSize: '0.78rem', fontFamily: 'Outfit',
  transition: 'all 0.2s', width: '100%'
};

const eyeStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#94a3b8', display: 'flex', padding: 0, flexShrink: 0
};
