import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { Eye, EyeOff, Mail, Lock, User, Building2, Phone, MapPin, FileText, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

export default function LoginScreen({ onLogin, isModal = false }) {
  const [screen, setScreen] = useState('login'); // 'login' | 'register' | 'pending'
  const [portal, setPortal] = useState('admin');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // registration step 1 or 2

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
        setScreen('pending');
        await supabase.auth.signOut();
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

      // Use SQL function to bypass RLS for profile update
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
        // Don't block registration — trigger already created basic profile
      }
      await supabase.auth.signOut();
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

  // ── PENDING ──────────────────────────────────────────────────────────────────
  if (screen === 'pending') {
    return (
      <Wrapper isModal={isModal}>
        <div style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
            background: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(99,102,241,0.15))',
            border: '2px solid rgba(14,165,233,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <CheckCircle size={32} color="#0ea5e9" />
          </div>
          <h3 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.3rem', color: '#0f172a', margin: '0 0 10px' }}>
            Registration Submitted!
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.7, maxWidth: '300px', margin: '0 auto 28px' }}>
            Your clinic account is pending approval from Lal Dental Care. You'll be able to login once approved.
          </p>
          <button onClick={() => { setScreen('login'); setStep(1); }} style={btnPrimary}>
            Back to Login
          </button>
        </div>
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
            <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '2px 0 0' }}>Register your clinic on Lal Dental Care</p>
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

        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setError(''); setStep(2); } : handleRegister}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {step === 1 ? (
            <>
              <PremiumInput icon={<User size={15} />} label="Full Name" required
                placeholder="Dr. John Smith" value={regForm.name}
                onChange={v => setRegForm(p => ({ ...p, name: v }))} />
              <PremiumInput icon={<Building2 size={15} />} label="Clinic / Hospital Name" required
                placeholder="Bright Smiles Clinic" value={regForm.clinic_name}
                onChange={v => setRegForm(p => ({ ...p, clinic_name: v }))} />
              <PremiumInput icon={<Phone size={15} />} label="Phone Number"
                placeholder="+91 98765 43210" value={regForm.phone}
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
          <span style={{ fontSize: '2rem' }}>🦷</span>
        </div>
        <h1 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.65rem', background: 'linear-gradient(135deg, #0284c7, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 6px' }}>
          Lal Dental Care
        </h1>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
          B2B Dental Implant & Order Management
        </p>
      </div>

      {/* Portal toggle */}
      <div style={{ display: 'flex', background: 'rgba(0,0,0,0.04)', padding: 4, borderRadius: 12, marginBottom: 24, border: '1px solid rgba(0,0,0,0.06)' }}>
        {[['admin', '🏢 Sales Portal'], ['doctor', '🦷 Clinic Portal']].map(([key, label]) => (
          <button key={key} type="button" onClick={() => { setPortal(key); setError(''); }} style={{
            flex: 1, padding: '10px 8px', border: 'none', borderRadius: 9, fontSize: '0.73rem',
            fontWeight: 700, fontFamily: 'Outfit', cursor: 'pointer', transition: 'all 0.25s',
            background: portal === key ? '#fff' : 'transparent',
            color: portal === key ? '#0ea5e9' : '#94a3b8',
            boxShadow: portal === key ? '0 2px 12px rgba(0,0,0,0.08)' : 'none',
          }}>
            {label}
          </button>
        ))}
      </div>

      {error && <ErrorBox msg={error} />}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PremiumInput icon={<Mail size={15} />} label="Email Address" required type="email"
          placeholder={portal === 'admin' ? 'admin@laldentalcare.com' : 'doctor@yourclinic.com'}
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
          {loading ? 'Signing in...' : <>Sign In <ArrowRight size={15} /></>}
        </button>
      </form>

      {portal === 'doctor' && (
        <div style={{ marginTop: 20, padding: '16px', background: 'rgba(14,165,233,0.04)', borderRadius: 12, border: '1px solid rgba(14,165,233,0.1)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 10px', fontWeight: 500 }}>
            New to Lal Dental Care?
          </p>
          <button onClick={() => { setScreen('register'); setError(''); }} style={btnOutline}>
            Register your Clinic
          </button>
        </div>
      )}

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
        borderRadius: 24, padding: '36px 32px',
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
        {label}{required && <span style={{ color: '#0ea5e9', marginLeft: 2 }}>*</span>}
      </label>
      <div className="premium-input-container" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        border: `1.5px solid ${focused ? '#0ea5e9' : '#e2e8f0'}`,
        borderRadius: 10, padding: '0 12px', background: focused ? '#f0f9ff' : '#f8fafc',
        transition: 'all 0.2s', boxShadow: focused ? '0 0 0 3px rgba(14,165,233,0.1)' : 'none'
      }}>
        <span style={{ color: focused ? '#0ea5e9' : '#94a3b8', display: 'flex', flexShrink: 0, transition: 'color 0.2s' }}>{icon}</span>
        <input
          type={type} required={required} placeholder={placeholder} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            flex: 1, border: 'none', background: 'transparent', outline: 'none',
            fontSize: '0.82rem', color: '#0f172a', padding: '11px 0',
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
      borderRadius: 10, padding: '10px 14px', fontSize: '0.75rem', color: '#dc2626',
      marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500
    }}>
      ⚠️ {msg}
    </div>
  );
}

const btnPrimary = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '13px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
  background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
  color: '#fff', fontWeight: 800, fontSize: '0.82rem', fontFamily: 'Outfit',
  boxShadow: '0 4px 16px rgba(14,165,233,0.35)', transition: 'all 0.2s',
  width: '100%'
};

const btnOutline = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '11px 20px', borderRadius: 12, cursor: 'pointer',
  background: 'transparent', border: '1.5px solid #e2e8f0',
  color: '#374151', fontWeight: 700, fontSize: '0.78rem', fontFamily: 'Outfit',
  transition: 'all 0.2s', width: '100%'
};

const eyeStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#94a3b8', display: 'flex', padding: 0, flexShrink: 0
};
