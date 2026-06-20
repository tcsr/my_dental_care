import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { Shield, User, Key, Building, Mail, Phone, MapPin, FileText, Eye, EyeOff } from 'lucide-react';

export default function LoginScreen({ onLogin }) {
  const [screen, setScreen] = useState('login'); // 'login' | 'register' | 'pending'
  const [portal, setPortal] = useState('admin'); // 'admin' | 'doctor'
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        .select('role, approved, name')
        .eq('id', data.user.id)
        .single();

      if (profileErr) throw profileErr;

      if (profile.role === 'admin') {
        onLogin({ role: 'admin', name: profile.name, user: data.user });
      } else if (!profile.approved) {
        setScreen('pending');
        await supabase.auth.signOut();
      } else {
        onLogin({ role: profile.role, name: profile.name, user: data.user });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (regForm.password !== regForm.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (regForm.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data, error: authErr } = await supabase.auth.signUp({
        email: regForm.email,
        password: regForm.password,
        options: { data: { name: regForm.name } },
      });
      if (authErr) throw authErr;

      // Update profile with clinic details
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          name: regForm.name,
          clinic_name: regForm.clinic_name,
          phone: regForm.phone,
          address: regForm.address,
          gst_number: regForm.gst_number,
          role: 'doctor',
          approved: false,
        })
        .eq('id', data.user.id);

      if (profileErr) throw profileErr;

      await supabase.auth.signOut();
      setScreen('pending');
    } catch (err) {
      setError(err.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (screen === 'pending') {
    return (
      <div style={outerStyle}>
        <BrandHeader />
        <div className="glass-card" style={cardStyle}>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⏳</div>
            <h3 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.1rem', color: 'hsl(var(--text-primary))', margin: '0 0 10px' }}>
              Registration Submitted
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', lineHeight: 1.6, maxWidth: '280px', margin: '0 auto 20px' }}>
              Your account is pending approval from Lal Dental Care admin. You'll be notified once approved.
            </p>
            <button
              onClick={() => setScreen('login')}
              className="btn-primary"
              style={{ padding: '10px 28px', borderRadius: '10px', fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'register') {
    return (
      <div style={outerStyle}>
        <BrandHeader />
        <div className="glass-card" style={{ ...cardStyle, maxHeight: '85vh', overflowY: 'auto' }}>
          <h3 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem', color: 'hsl(var(--text-primary))', margin: '0 0 18px' }}>
            Register as Doctor / Clinic
          </h3>
          {error && <ErrorBox msg={error} />}
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Field icon={<User size={14} />} label="Full Name" required>
              <input type="text" required placeholder="Dr. John Smith" value={regForm.name}
                onChange={e => setRegForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
            </Field>
            <Field icon={<Building size={14} />} label="Clinic / Hospital Name" required>
              <input type="text" required placeholder="Bright Smiles Clinic" value={regForm.clinic_name}
                onChange={e => setRegForm(p => ({ ...p, clinic_name: e.target.value }))} style={inputStyle} />
            </Field>
            <Field icon={<Mail size={14} />} label="Email" required>
              <input type="email" required placeholder="doctor@clinic.com" value={regForm.email}
                onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
            </Field>
            <Field icon={<Phone size={14} />} label="Phone">
              <input type="tel" placeholder="+91 98765 43210" value={regForm.phone}
                onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))} style={inputStyle} />
            </Field>
            <Field icon={<MapPin size={14} />} label="Address">
              <input type="text" placeholder="City, State" value={regForm.address}
                onChange={e => setRegForm(p => ({ ...p, address: e.target.value }))} style={inputStyle} />
            </Field>
            <Field icon={<FileText size={14} />} label="GST Number (optional)">
              <input type="text" placeholder="22AAAAA0000A1Z5" value={regForm.gst_number}
                onChange={e => setRegForm(p => ({ ...p, gst_number: e.target.value }))} style={inputStyle} />
            </Field>
            <Field icon={<Key size={14} />} label="Password" required>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} required placeholder="Min 8 characters" value={regForm.password}
                  onChange={e => setRegForm(p => ({ ...p, password: e.target.value }))} style={{ ...inputStyle, paddingRight: '36px' }} />
                <button type="button" onClick={() => setShowPass(p => !p)} style={eyeBtn}>{showPass ? <EyeOff size={13} /> : <Eye size={13} />}</button>
              </div>
            </Field>
            <Field icon={<Key size={14} />} label="Confirm Password" required>
              <input type="password" required placeholder="Repeat password" value={regForm.confirm}
                onChange={e => setRegForm(p => ({ ...p, confirm: e.target.value }))} style={inputStyle} />
            </Field>
            <button type="submit" disabled={loading} className="btn-primary"
              style={{ padding: '12px', borderRadius: '10px', fontWeight: 700, fontFamily: 'Outfit', fontSize: '0.8rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '4px' }}>
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>
            <button type="button" onClick={() => { setScreen('login'); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'hsl(var(--text-muted))', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'Outfit' }}>
              Already have an account? Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Login screen
  return (
    <div style={outerStyle}>
      <BrandHeader />
      <div className="glass-card" style={cardStyle}>
        {/* Portal tabs */}
        <div style={{ display: 'flex', background: 'hsl(var(--bg-dark))', padding: '4px', borderRadius: '10px', border: '1px solid hsl(var(--border-color))', marginBottom: '20px' }}>
          {['admin', 'doctor'].map(tab => (
            <button key={tab} type="button" onClick={() => setPortal(tab)} style={{
              flex: 1, padding: '10px', border: 'none', borderRadius: '8px', fontSize: '0.75rem',
              fontWeight: 'bold', fontFamily: 'Outfit', cursor: 'pointer',
              background: portal === tab ? 'hsl(var(--bg-card))' : 'transparent',
              color: portal === tab ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
              boxShadow: portal === tab ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}>
              {tab === 'admin' ? 'Sales Portal' : 'Clinic Portal'}
            </button>
          ))}
        </div>

        {error && <ErrorBox msg={error} />}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Field icon={<Mail size={14} />} label="Email" required>
            <input type="email" required placeholder={portal === 'admin' ? 'admin@laldentalcare.com' : 'doctor@clinic.com'}
              value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
          </Field>
          <Field icon={<Key size={14} />} label="Password" required>
            <div style={{ position: 'relative' }}>
              <input type={showPass ? 'text' : 'password'} required placeholder="Your password"
                value={loginForm.password} onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                style={{ ...inputStyle, paddingRight: '36px' }} />
              <button type="button" onClick={() => setShowPass(p => !p)} style={eyeBtn}>
                {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </Field>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={13} color="hsl(var(--secondary))" />
            <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>
              {portal === 'admin' ? 'B2B Sales Console' : 'Secure Clinic Portal'} Authorization
            </span>
          </div>

          <button type="submit" disabled={loading} className="btn-primary"
            style={{ padding: '12px', borderRadius: '10px', fontWeight: 700, fontFamily: 'Outfit', fontSize: '0.8rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in...' : `Enter ${portal === 'admin' ? 'Sales Console' : 'Clinic Portal'}`}
          </button>

          {portal === 'doctor' && (
            <button type="button" onClick={() => { setScreen('register'); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: 700 }}>
              New clinic? Register here
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function BrandHeader() {
  return (
    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(14, 165, 233, 0.3)' }}>
        <span style={{ fontSize: '2rem' }}>🦷</span>
      </div>
      <h2 style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'Outfit', background: 'linear-gradient(135deg, #0284c7 0%, hsl(var(--primary)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
        Lal Dental Care
      </h2>
      <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', marginTop: '6px' }}>
        Enterprise Dental Implant & B2B Order Management
      </p>
    </div>
  );
}

function Field({ icon, label, required, children }) {
  return (
    <div>
      <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '6px', color: 'hsl(var(--text-primary))' }}>
        {label}{required && ' *'}
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))', zIndex: 1, pointerEvents: 'none' }}>
          {icon}
        </span>
        <div style={{ paddingLeft: '34px' }}>{children}</div>
      </div>
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.75rem', color: '#ef4444', marginBottom: '12px' }}>
      {msg}
    </div>
  );
}

const outerStyle = {
  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
  minHeight: '100vh', padding: '24px', background: 'linear-gradient(135deg, hsl(var(--bg-dark)) 0%, #e2e8f0 100%)',
  width: '100%', maxWidth: '480px', margin: '0 auto', boxSizing: 'border-box'
};

const cardStyle = {
  width: '100%', padding: '24px', border: '1px solid hsl(var(--border-color))', boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
};

const inputStyle = {
  width: '100%', padding: '10px 10px 10px 0', fontSize: '0.78rem', borderRadius: '8px',
  border: '1px solid hsl(var(--border-color))', background: 'transparent',
  color: 'hsl(var(--text-primary))', outline: 'none', boxSizing: 'border-box'
};

const eyeBtn = {
  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))',
  display: 'flex', alignItems: 'center', padding: 0
};
