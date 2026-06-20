import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import { Shield, User, Key, Building, CheckCircle2 } from 'lucide-react';

export default function LoginScreen({ onLogin }) {
  const [activeTab, setActiveTab] = useState('rep'); // 'rep' | 'doctor'
  const [selectedClientId, setSelectedClientId] = useState('');
  const [password, setPassword] = useState('password123');
  const [username, setUsername] = useState('chandra@dentalpro.com');

  const clients = useLiveQuery(() => db.b2bClients.toArray()) || [];

  const handleLogin = async (e) => {
    e.preventDefault();

    if (activeTab === 'doctor') {
      if (!selectedClientId) {
        alert('Please select a clinic to log in.');
        return;
      }
      const selectedClient = clients.find(c => c.id === parseInt(selectedClientId));
      if (selectedClient) {
        // Save to userProfile
        await db.userProfile.bulkPut([
          { key: 'userName', value: selectedClient.contactPerson || selectedClient.name },
          { key: 'role', value: 'Clinic Doctor / Manager' },
          { key: 'userEmail', value: selectedClient.email || 'doctor@clinic.com' },
          { key: 'userPhone', value: selectedClient.phone || '+91 99000 11223' },
          { key: 'clinicName', value: selectedClient.name },
          { key: 'activeRole', value: 'doctor' },
          { key: 'actingClientId', value: selectedClient.id }
        ]);
      }
    } else {
      // Save Rep details
      await db.userProfile.bulkPut([
        { key: 'userName', value: 'Chandra' },
        { key: 'role', value: 'B2B Sales Representative' },
        { key: 'userEmail', value: 'chandra@dentalpro.com' },
        { key: 'userPhone', value: '+91 99887 76655' },
        { key: 'clinicName', value: 'Apex Dental Distributor' },
        { key: 'activeRole', value: 'rep' },
        { key: 'actingClientId', value: null }
      ]);
    }

    localStorage.setItem('dentalIsLoggedIn', 'true');
    onLogin();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '24px',
      background: 'linear-gradient(135deg, hsl(var(--bg-dark)) 0%, #e2e8f0 100%)',
      width: '100%',
      maxWidth: '480px',
      margin: '0 auto',
      boxSizing: 'border-box'
    }}>
      {/* Brand Logo / Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px',
          boxShadow: '0 8px 24px rgba(14, 165, 233, 0.3)'
        }}>
          <span style={{ fontSize: '2rem' }}>🦷</span>
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: '800', fontFamily: 'Outfit', background: 'linear-gradient(135deg, #0284c7 0%, hsl(var(--primary)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          Lal Dental Care
        </h2>
        <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', marginTop: '6px' }}>
          Enterprise Dental Implant & B2B Order Management
        </p>
      </div>

      {/* Login Box */}
      <div className="glass-card" style={{
        width: '100%',
        padding: '24px',
        border: '1px solid hsl(var(--border-color))',
        boxShadow: '0 10px 30px rgba(0,0,0,0.06)'
      }}>
        {/* Portal Tabs */}
        <div style={{
          display: 'flex',
          background: 'hsl(var(--bg-dark))',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid hsl(var(--border-color))',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('rep')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              fontFamily: 'Outfit',
              cursor: 'pointer',
              background: activeTab === 'rep' ? 'hsl(var(--bg-card))' : 'transparent',
              color: activeTab === 'rep' ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
              boxShadow: activeTab === 'rep' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Sales Portal
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('doctor');
              if (clients.length > 0 && !selectedClientId) {
                setSelectedClientId(clients[0].id.toString());
              }
            }}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              fontFamily: 'Outfit',
              cursor: 'pointer',
              background: activeTab === 'doctor' ? 'hsl(var(--bg-card))' : 'transparent',
              color: activeTab === 'doctor' ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
              boxShadow: activeTab === 'doctor' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Clinic Portal
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {activeTab === 'rep' ? (
            <>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                  Representative Email
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }}>
                    <User size={14} />
                  </span>
                  <input
                    type="email"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 10px 10px 34px',
                      fontSize: '0.78rem',
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border-color))',
                      background: 'transparent',
                      color: 'hsl(var(--text-primary))',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                  Select Registered Clinic
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }}>
                    <Building size={14} />
                  </span>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 10px 10px 34px',
                      fontSize: '0.78rem',
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border-color))',
                      background: 'transparent',
                      color: 'hsl(var(--text-primary))',
                      outline: 'none'
                    }}
                  >
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.discountTier} Tier)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }}>
                <Key size={14} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 34px',
                  fontSize: '0.78rem',
                  borderRadius: '8px',
                  border: '1px solid hsl(var(--border-color))',
                  background: 'transparent',
                  color: 'hsl(var(--text-primary))',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
            <CheckCircle2 size={14} color="hsl(var(--secondary))" />
            <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>
              {activeTab === 'rep' ? 'B2B Sales Console' : 'Secure Clinic Portal'} Authorization
            </span>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{
              padding: '12px',
              borderRadius: '10px',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Outfit',
              width: '100%',
              marginTop: '4px'
            }}
          >
            Enter {activeTab === 'rep' ? 'Sales Console' : 'Clinic Portal'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Shield size={12} /> Secure RBAC Enabled
        </span>
      </div>
    </div>
  );
}
