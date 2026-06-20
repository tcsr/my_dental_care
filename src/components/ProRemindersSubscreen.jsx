import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import { Play, RefreshCw, Trash2, CheckCircle, Smartphone, Mail, AlertCircle, Bell, X, Send, Plus, Volume2, Clock } from 'lucide-react';
import PremiumSelect from './ui/PremiumSelect';
import { t } from '../utils/i18n';
import EmptyStateCard from './EmptyStateCard';

const getCurrentTimestamp = () => Date.now();

export default function ProRemindersSubscreen({ lang }) {
  const reminders = useLiveQuery(() => db.automatedReminders.orderBy('id').reverse().toArray()) || [];
  const clients = useLiveQuery(() => db.b2bClients.toArray()) || [];
  const orders = useLiveQuery(() => db.b2bOrders.toArray()) || [];
  const implantCases = useLiveQuery(() => db.implantCases.toArray()) || [];
  const products = useLiveQuery(() => db.b2bProducts.toArray()) || [];

  const [isScanning, setIsScanning] = useState(false);
  const [selectedWhatsappReminder, setSelectedWhatsappReminder] = useState(null);
  
  const [subTab, setSubTab] = useState('automated'); // 'automated' | 'tracker'

  // Custom reminder scheduler form state
  const [customTitle, setCustomTitle] = useState('');
  const [customClient, setCustomClient] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [customPriority, setCustomPriority] = useState('Medium');
  const [customMessage, setCustomMessage] = useState('');
  const [customChannels, setCustomChannels] = useState(['Alarm']);

  const handleAddCustomAlarm = async (e) => {
    e.preventDefault();
    if (!customTitle || !customDate || !customTime) {
      alert('Please fill Title, Date, and Time');
      return;
    }

    try {
      const scheduledDateTimeStr = `${customDate}T${customTime}:00`;
      const dateScheduled = new Date(scheduledDateTimeStr).getTime();
      
      if (isNaN(dateScheduled)) {
        alert('Invalid Date/Time configuration');
        return;
      }

      await db.automatedReminders.add({
        recipientId: customClient ? parseInt(customClient, 10) : 0,
        type: 'Custom Alarm',
        title: customTitle,
        message: customMessage,
        status: 'Scheduled',
        dateScheduled,
        priority: customPriority,
        channels: customChannels,
        dateSent: 0
      });

      setCustomTitle('');
      setCustomClient('');
      setCustomDate('');
      setCustomTime('');
      setCustomPriority('Medium');
      setCustomMessage('');
      setCustomChannels(['Alarm']);
      
      alert('Custom Alarm Reminder Scheduled Successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to schedule reminder');
    }
  };

  const handleToggleAlarmStatus = async (alarm) => {
    const nextStatus = alarm.status === 'Completed' ? 'Scheduled' : 'Completed';
    // If setting to active, make sure dateScheduled is in the future, or set it to now + 10s for quick test
    let updatedDate = alarm.dateScheduled;
    if (nextStatus === 'Scheduled' && alarm.dateScheduled < getCurrentTimestamp()) {
      updatedDate = getCurrentTimestamp() + 10 * 1000; // scheduled in 10 seconds for demo/reactivity
    }
    await db.automatedReminders.update(alarm.id, { status: nextStatus, dateScheduled: updatedDate });
  };

  const handleDeleteAlarm = async (id) => {
    if (await confirm('Delete this alarm?')) {
      await db.automatedReminders.delete(id);
    }
  };

  const playChimeTest = () => {
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
        gain.gain.linearRampToValueAtTime(0.2, time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + dur);
      };

      const now = ctx.currentTime;
      playTone(523.25, now, 0.25);
      playTone(659.25, now + 0.12, 0.25);
      playTone(783.99, now + 0.24, 0.35);
    } catch (e) {
      console.warn('Audio Context failure:', e);
    }
  };

  const triggerAutoReminders = async () => {
    setIsScanning(true);
    let newRemindersCount = 0;

    // 1. Scan Unpaid Orders (WhatsApp & Email channel)
    for (const order of orders) {
      if (order.paymentStatus === 'Unpaid') {
        const client = clients.find(c => c.id === order.clientId);
        if (client) {
          // Check if we already have a reminder for this order
          const existing = reminders.some(r => r.message.includes(`Order #${order.id}`));
          if (!existing) {
            // Send standard reminder
            await db.automatedReminders.add({
              recipientId: client.id,
              type: 'Payment Due',
              title: `Invoice Due Alert: Order #${order.id}`,
              message: `Hi ${client.contactPerson || client.name}, this is an automated reminder that the payment of ₹${order.finalAmount} for Order #${order.id} is pending. Please process it.`,
              status: 'Sent',
              dateScheduled: Date.now(),
              dateSent: Date.now()
            });

            // Trigger simulated WhatsApp API Payout/Payment ping
            await db.automatedReminders.add({
              recipientId: client.id,
              type: 'Payment Due WhatsApp',
              title: `WhatsApp Alert: Order #${order.id}`,
              message: `Hello Dr. ${client.contactPerson || client.name}! Your order #${order.id} payment of ₹${order.finalAmount} is outstanding. Pay now: https://dpc-pay.in/inv-${order.id}`,
              status: 'Sent',
              dateScheduled: Date.now(),
              dateSent: Date.now()
            });
            newRemindersCount += 2;
          }
        }
      }
    }

    // 2. Scan Implant Cases in intermediate stages (WhatsApp channel follow-up)
    for (const c of implantCases) {
      if (c.stage !== 'Completed' && c.stage !== 'Planning') {
        const client = clients.find(cl => cl.id === c.doctorId);
        if (client) {
          const existing = reminders.some(r => r.message.includes(`patient ${c.patientName}`));
          if (!existing) {
            await db.automatedReminders.add({
              recipientId: client.id,
              type: 'Implant Follow-Up WhatsApp',
              title: `WhatsApp Case Status: ${c.patientName}`,
              message: `Hi Dr. ${client.contactPerson || client.name}, patient ${c.patientName} custom implant tooth #${c.toothNumber} has transitioned to stage: "${c.stage}". Track model here: https://dpc-track.in/case-${c.id}`,
              status: 'Sent',
              dateScheduled: Date.now(),
              dateSent: Date.now()
            });
            newRemindersCount++;
          }
        }
      }
    }

    // 3. Scan Low Stock Inventory items to notify management/reps
    for (const p of products) {
      if (p.stock < p.minStock) {
        const existing = reminders.some(r => r.message.includes(`Low Stock Alert: ${p.name}`));
        if (!existing) {
          await db.automatedReminders.add({
            recipientId: 0, // system/sales rep
            type: 'Inventory Restock',
            title: `Low Stock Action Advised: ${p.name}`,
            message: `Low Stock Alert: ${p.name} (${p.sku}) has fallen to ${p.stock} units (Minimum required: ${p.minStock}). Auto-generated replenishment recommendation created.`,
            status: 'Sent',
            dateScheduled: Date.now(),
            dateSent: Date.now()
          });
          newRemindersCount++;
        }
      }
    }

    setTimeout(() => {
      setIsScanning(false);
      alert(`Automated scan complete! Generated ${newRemindersCount} new reminders including WhatsApp API notifications.`);
    }, 800);
  };

  const handleClearReminders = async () => {
    if (await confirm('Clear all reminder logs?')) {
      await db.automatedReminders.clear();
    }
  };

  const getIcon = (type) => {
    if (type.includes('WhatsApp')) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    }
    if (type === 'Payment Due') return <Mail size={16} color="hsl(var(--color-hyper))" />;
    if (type === 'Implant Follow-Up') return <Smartphone size={16} color="hsl(var(--primary))" />;
    return <AlertCircle size={16} color="hsl(var(--color-hypo))" />;
  };

  const automatedList = reminders.filter(r => r.type !== 'Custom Alarm');
  const customList = reminders.filter(r => r.type === 'Custom Alarm');

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '30px' }}>
      
      {/* Sub Tab Switcher */}
      <div className="tab-group">
        <button
          type="button"
          onClick={() => setSubTab('automated')}
          className={`tab-btn ${subTab === 'automated' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          🤖 Auto Alerts
        </button>
        <button
          type="button"
          onClick={() => setSubTab('tracker')}
          className={`tab-btn ${subTab === 'tracker' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ⏰ Tracker & Alarms
        </button>
      </div>

      {subTab === 'automated' ? (
        <>
          {/* Simulation Trigger Card */}
          <div className="glass-card" style={{ padding: '18px 20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'linear-gradient(135deg, hsl(var(--primary-glow)), hsl(var(--secondary-glow)))', border: '1px solid hsl(var(--border-color))' }}>
            <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))' }}>
                <Bell size={16} />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'hsl(var(--primary))', fontFamily: 'Outfit', margin: 0 }}>
                {t('reminderEngine', lang) || 'Reminder Engine'}
              </h3>
            </div>
              <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', marginTop: '4px', lineHeight: 1.4 }}>
                {t('reminderEngineDesc', lang) || 'Scan pending items'}
              </p>
            </div>

            <button 
              onClick={triggerAutoReminders}
              disabled={isScanning}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '0.82rem',
                background: 'linear-gradient(135deg, hsl(var(--primary)), #0284c7)', color: '#fff',
                cursor: isScanning ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                fontFamily: 'Outfit'
              }}
            >
              {isScanning ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  {t('scanning', lang) || 'Scanning...'}
                </>
              ) : (
                <>
                  <Play size={18} />
                  {t('runScanBtn', lang) || 'Run Scan'}
                </>
              )}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))' }}>
                <Bell size={16} />
              </div>
              <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', fontWeight: '800', fontFamily: 'Outfit', margin: 0 }}>{t('reminderLogs', lang) || 'Reminder Logs'}</h3>
            </div>
            
            {automatedList.length > 0 && (
              <button onClick={handleClearReminders} style={{ background: 'none', border: 'none', color: 'hsl(var(--color-hyper))', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'Outfit', fontWeight: 'bold' }}>
                <Trash2 size={13} /> {t('clearLogs', lang) || 'Clear Logs'}
              </button>
            )}
          </div>

          {/* Reminders List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {automatedList.length > 0 ? (
              automatedList.map(log => {
                const clientName = log.recipientId === 0 ? 'Sales Office / Reps' : clients.find(c => c.id === log.recipientId)?.name || 'Doctor Clinic';
                
                return (
                  <div key={log.id} className="glass-card" style={{ padding: '12px 14px', border: '1px solid hsl(var(--border-color))' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <div style={{
                        padding: '8px', borderRadius: '8px', background: 'hsl(var(--border-color))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px'
                      }}>
                        {getIcon(log.type)}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.58rem', fontWeight: '800', textTransform: 'uppercase', color: 'hsl(var(--text-dim))' }}>
                            {log.type}
                          </span>
                          <span style={{
                            fontSize: '0.58rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px',
                            background: log.type.includes('WhatsApp') ? 'rgba(34,197,94,0.1)' : 'hsl(var(--secondary-glow))',
                            color: log.type.includes('WhatsApp') ? '#22c55e' : 'hsl(var(--secondary))',
                            display: 'flex', alignItems: 'center', gap: '3px'
                          }}>
                            <CheckCircle size={10} /> {log.type.includes('WhatsApp') ? 'WhatsApp Sent' : 'Email Sent'}
                          </span>
                        </div>

                        <h4 style={{ fontSize: '0.8rem', fontWeight: '800', marginTop: '4px', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>
                          {log.title}
                        </h4>

                        <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginTop: '3px', lineHeight: 1.35 }}>
                          {log.message}
                        </p>

                        {log.type.includes('WhatsApp') && (
                          <button
                            onClick={() => setSelectedWhatsappReminder(log)}
                            style={{
                              marginTop: '8px', padding: '4px 10px', fontSize: '0.62rem',
                              borderRadius: '6px', border: '1px solid #22c55e', background: 'transparent',
                              color: '#22c55e', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex',
                              alignItems: 'center', gap: '4px', fontFamily: 'Outfit'
                            }}
                          >
                            💬 Open Chat Simulator
                          </button>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.62rem', color: 'hsl(var(--text-dim))' }}>
                          <span>To: {clientName}</span>
                          <span>Sent: {new Date(log.dateSent).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyStateCard 
                icon={Bell} 
                title="No Automation Alerts" 
                message={t('noReminders', lang) || 'No Alerts'} 
              />
            )}
          </div>
        </>
      ) : (
        <>
          {/* Custom Tracker Alarm Form */}
          <div className="glass-card" style={{ border: '1px solid hsl(var(--border-color))', padding: '16px' }}>
            <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', fontWeight: '800', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
              <Plus size={16} /> Schedule Custom Medication-Style Alarm
            </h3>

            <form onSubmit={handleAddCustomAlarm} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '4px' }}>Alarm Title</label>
                <input
                  type="text"
                  placeholder="e.g. Casing Follow-up, Re-order Alert"
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'hsl(var(--bg-dark))', color: 'hsl(var(--text-primary))', fontSize: '0.78rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '4px' }}>Doctor / Clinic</label>
                  <PremiumSelect
                    value={customClient}
                    onChange={e => setCustomClient(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'hsl(var(--bg-dark))', color: 'hsl(var(--text-primary))', fontSize: '0.78rem', height: '38px' }}
                  >
                    <option value="">-- None / System Rep --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </PremiumSelect>
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '4px' }}>Priority Level</label>
                  <PremiumSelect
                    value={customPriority}
                    onChange={e => setCustomPriority(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'hsl(var(--bg-dark))', color: 'hsl(var(--text-primary))', fontSize: '0.78rem', height: '38px' }}
                  >
                    <option value="High">🔴 High Priority</option>
                    <option value="Medium">🟡 Medium Priority</option>
                    <option value="Low">🔵 Low Priority</option>
                  </PremiumSelect>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '4px' }}>Alert Date</label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'hsl(var(--bg-dark))', color: 'hsl(var(--text-primary))', fontSize: '0.78rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '4px' }}>Time (24h)</label>
                  <input
                    type="time"
                    value={customTime}
                    onChange={e => setCustomTime(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'hsl(var(--bg-dark))', color: 'hsl(var(--text-primary))', fontSize: '0.78rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '4px' }}>Notes / Alert Instructions</label>
                <textarea
                  placeholder="Provide checklist or special instructions for alarm trigger..."
                  rows={2}
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'hsl(var(--bg-dark))', color: 'hsl(var(--text-primary))', fontSize: '0.78rem', resize: 'vertical' }}
                />
              </div>

              {/* Alert Channel Choices */}
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '6px' }}>Dispatch Alert Trigger Channels</label>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={customChannels.includes('Alarm')} onChange={e => {
                      if (e.target.checked) setCustomChannels([...customChannels, 'Alarm']);
                      else setCustomChannels(customChannels.filter(c => c !== 'Alarm'));
                    }} />
                    🔊 Audio Alarm Sound
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={customChannels.includes('WhatsApp')} onChange={e => {
                      if (e.target.checked) setCustomChannels([...customChannels, 'WhatsApp']);
                      else setCustomChannels(customChannels.filter(c => c !== 'WhatsApp'));
                    }} />
                    💬 WhatsApp API Ping
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={playChimeTest}
                  style={{
                    padding: '10px 14px', borderRadius: '8px', border: '1px solid hsl(var(--border-color))',
                    background: 'hsl(var(--bg-dark))', color: 'hsl(var(--text-primary))', fontWeight: 'bold',
                    fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Outfit'
                  }}
                  title="Test synthesized alarm chime"
                >
                  <Volume2 size={16} /> Test Chime
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg, hsl(var(--primary)), #0284c7)', color: '#fff',
                    fontWeight: 'bold', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'Outfit',
                    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)'
                  }}
                >
                  Schedule Alarm Alert
                </button>
              </div>
            </form>
          </div>

          {/* Active Tracker List */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 10px' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'hsl(var(--text-primary))', fontWeight: '800', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} /> Scheduled & Tracked Alarms ({customList.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {customList.length > 0 ? (
              customList.map(alarm => {
                const doc = alarm.recipientId === 0 ? 'Sales Office / Reps' : clients.find(c => c.id === alarm.recipientId)?.name || 'Doctor Clinic';
                const dateStr = new Date(alarm.dateScheduled).toLocaleDateString();
                const timeStr = new Date(alarm.dateScheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const isCompleted = alarm.status === 'Completed';

                return (
                  <div key={alarm.id} className="glass-card" style={{
                    padding: '12px 14px', border: '1px solid hsl(var(--border-color))',
                    opacity: isCompleted ? 0.65 : 1, transition: 'opacity 0.25s'
                  }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        {/* Status Toggle Switch */}
                        <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '30px', height: '16px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={alarm.status === 'Scheduled' || alarm.status === 'Snoozed' || alarm.status === 'Triggered'}
                            onChange={() => handleToggleAlarmStatus(alarm)}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: (alarm.status === 'Scheduled' || alarm.status === 'Snoozed' || alarm.status === 'Triggered') ? 'hsl(var(--primary))' : '#cbd5e1',
                            borderRadius: '16px', transition: '0.3s'
                          }}>
                            <span style={{
                              position: 'absolute', content: '""', height: '10px', width: '10px', left: (alarm.status === 'Scheduled' || alarm.status === 'Snoozed' || alarm.status === 'Triggered') ? '16px' : '4px', bottom: '3px',
                              backgroundColor: '#fff', borderRadius: '50%', transition: '0.3s'
                            }} />
                          </span>
                        </label>
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '0.58rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px',
                            background: alarm.priority === 'High' ? 'rgba(239,68,68,0.1)' : alarm.priority === 'Medium' ? 'rgba(245,158,11,0.1)' : 'rgba(14,165,233,0.1)',
                            color: alarm.priority === 'High' ? '#ef4444' : alarm.priority === 'Medium' ? '#f59e0b' : '#0ea5e9'
                          }}>
                            {alarm.priority} Priority
                          </span>

                          <span style={{
                            fontSize: '0.58rem', fontWeight: '800', padding: '2px 6px', borderRadius: '4px',
                            background: isCompleted ? 'rgba(100,116,139,0.1)' : alarm.status === 'Snoozed' ? 'rgba(245,158,11,0.1)' : alarm.status === 'Triggered' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                            color: isCompleted ? '#64748b' : alarm.status === 'Snoozed' ? '#f59e0b' : alarm.status === 'Triggered' ? '#ef4444' : '#22c55e'
                          }}>
                            {alarm.status}
                          </span>
                        </div>

                        <h4 style={{ fontSize: '0.8rem', fontWeight: '800', marginTop: '4px', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                          {alarm.title}
                        </h4>

                        <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>
                          {alarm.message}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.62rem', color: 'hsl(var(--text-dim))' }}>
                          <span>For: {doc}</span>
                          <span style={{ fontWeight: 'bold', color: 'hsl(var(--text-muted))' }}>🔔 {dateStr} at {timeStr}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteAlarm(alarm.id)}
                        style={{
                          background: 'none', border: 'none', color: 'hsl(var(--color-hyper))',
                          cursor: 'pointer', padding: '4px', alignSelf: 'center'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyStateCard
                icon={Bell}
                title="No Custom Alarms"
                message="No custom alarm trackers scheduled. Add one above to test live audio overlays!"
              />
            )}
          </div>
        </>
      )}

      {selectedWhatsappReminder && (
        <WhatsappSimulatorModal
          reminder={selectedWhatsappReminder}
          onClose={() => setSelectedWhatsappReminder(null)}
          orders={orders}
        />
      )}

    </div>
  );
}

function WhatsappSimulatorModal({ reminder, onClose, orders }) {
  const orderIdMatch = reminder.message.match(/order #(\d+)/i);
  const orderId = orderIdMatch ? parseInt(orderIdMatch[1], 10) : null;
  const initialOrder = orders.find(o => o.id === orderId);

  const [order, setOrder] = useState(initialOrder);
  const [messages, setMessages] = useState([
    { sender: 'us', text: reminder.message, time: new Date(reminder.dateSent).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [inputText, setInputText] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [payStatus, setPayStatus] = useState('idle'); // 'idle' | 'paying' | 'done'

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = { sender: 'them', text: inputText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    const txt = inputText.toLowerCase();
    setInputText('');

    setTimeout(() => {
      let botReply = '';
      if (txt.includes('pay') || txt.includes('money') || txt.includes('invoice') || txt.includes('payment')) {
        botReply = `Lal Dental Bot: To settle the outstanding payment of ₹${order?.finalAmount || '20,000'}, please click the "💳 Pay Outstanding" button or use our direct link: https://dpc-pay.in/inv-${order?.id || '101'}`;
      } else if (txt.includes('track') || txt.includes('delivery') || txt.includes('where')) {
        botReply = `Lal Dental Bot: Your implant order #${order?.id || '101'} has been dispatched. Status: In Transit. Estimated delivery: Tomorrow morning via Blue Dart (Ref: BD-88719-IN).`;
      } else if (txt.includes('help') || txt.includes('implant') || txt.includes('crown')) {
        botReply = `Lal Dental Bot: For crown sizing or fixture compatibility questions, our master technician is available at 1800-LAL-DENTAL or ask the AI assistant.`;
      } else {
        botReply = `Lal Dental Bot: Message received. Our representative Chandra will check this shortly. Tap "💳 Pay Outstanding" or "📦 Track Delivery" for quick automated actions.`;
      }
      setMessages(prev => [...prev, { sender: 'us', text: botReply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    }, 1200);
  };

  const handleQuickAction = (action) => {
    if (action === 'pay') {
      if (order?.paymentStatus === 'Paid') {
        alert('This order has already been paid!');
        return;
      }
      setShowPayment(true);
    } else if (action === 'track') {
      setMessages(prev => [
        ...prev,
        { sender: 'them', text: 'Where is my order delivery?', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        { sender: 'us', text: `Lal Dental Bot: Order #${order?.id || 'N/A'} is dispatched and currently in transit. Estimated delivery: 24-48 hours. Courier: Blue Dart, Tracking Ref: BD-889102-IN`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    } else if (action === 'ai') {
      setMessages(prev => [
        ...prev,
        { sender: 'them', text: 'Connect me to Lal Dental Care AI support.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        { sender: 'us', text: `Lal Dental Bot: Hello Doctor, I am the Lal Dental Care virtual assistant. You can check invoices, update implant casing checkups, and request stock reconciliations directly from the portal dashboards.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    }
  };

  const executePayment = async () => {
    setPayStatus('paying');
    setTimeout(async () => {
      if (order) {
        await db.b2bOrders.update(order.id, { paymentStatus: 'Paid' });
        const updated = await db.b2bOrders.get(order.id);
        setOrder(updated);
      }
      setPayStatus('done');
      setTimeout(() => {
        setShowPayment(false);
        setPayStatus('idle');
        setMessages(prev => [
          ...prev,
          { sender: 'us', text: `✅ Payment Settlement Confirmed: Receipt for Order #${order?.id || 'N/A'} has been successfully cleared in Razorpay. Invoice status updated to Paid.`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
      }, 1000);
    }, 1600);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: '480px', height: '100%', zIndex: 99999,
      background: 'rgba(15,23,42,0.85)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', padding: '16px', backdropFilter: 'blur(6px)',
      boxSizing: 'border-box'
    }}>
      {/* Phone chassis */}
      <div className="glass-card animate-fade-in" style={{
        width: '100%', maxWidth: '360px', height: '540px', background: '#efeae2',
        borderRadius: '36px', border: '8px solid #0f172a', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px rgba(0,0,0,0.35)', position: 'relative', overflow: 'hidden'
      }}>
        {/* Phone Notch */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '110px', height: '18px', background: '#0f172a', borderBottomLeftRadius: '10px',
          borderBottomRightRadius: '10px', zIndex: 999
        }} />

        {/* WhatsApp Header */}
        <div style={{
          background: '#075e54', padding: '24px 14px 10px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', color: '#fff', zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fff', color: '#075e54', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
              L
            </div>
            <div>
              <h4 style={{ fontSize: '0.78rem', fontWeight: 'bold', margin: 0 }}>Lal Dental Support</h4>
              <span style={{ fontSize: '0.55rem', opacity: 0.85 }}>Online Automated Channel</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', marginTop: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Chat Area */}
        <div style={{
          flex: 1, padding: '12px', overflowY: 'auto', display: 'flex',
          flexDirection: 'column', gap: '10px', paddingBottom: '16px'
        }}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: m.sender === 'us' ? 'flex-start' : 'flex-end',
                maxWidth: '85%',
                background: m.sender === 'us' ? '#fff' : '#dcf8c6',
                padding: '8px 10px',
                borderRadius: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                position: 'relative'
              }}
            >
              <p style={{ fontSize: '0.68rem', color: '#000', margin: 0, lineHeight: 1.35, whiteSpace: 'pre-line' }}>{m.text}</p>
              <span style={{ fontSize: '0.48rem', color: '#666', display: 'block', textAlign: 'right', marginTop: '3px' }}>{m.time}</span>
            </div>
          ))}

          {/* Quick replies bubbles inside screen */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
            {order?.paymentStatus !== 'Paid' && (
              <button
                onClick={() => handleQuickAction('pay')}
                style={{
                  background: '#22c55e', color: '#fff', border: 'none',
                  padding: '5px 10px', borderRadius: '100px', fontSize: '0.58rem',
                  fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                }}
              >
                💳 Pay Outstanding
              </button>
            )}
            <button
              onClick={() => handleQuickAction('track')}
              style={{
                background: '#0ea5e9', color: '#fff', border: 'none',
                padding: '5px 10px', borderRadius: '100px', fontSize: '0.58rem',
                fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
              }}
            >
              📦 Track Delivery
            </button>
            <button
              onClick={() => handleQuickAction('ai')}
              style={{
                background: '#64748b', color: '#fff', border: 'none',
                padding: '5px 10px', borderRadius: '100px', fontSize: '0.58rem',
                fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
              }}
            >
              💬 Ask AI Support
            </button>
          </div>
        </div>

        {/* Input Box */}
        <form onSubmit={handleSend} style={{
          padding: '8px', background: '#f0f0f0', display: 'flex',
          gap: '6px', alignItems: 'center', borderTop: '1px solid #ddd'
        }}>
          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '100px', border: '1px solid #ccc',
              fontSize: '0.72rem', outline: 'none', background: '#fff', color: '#000'
            }}
          />
          <button type="submit" style={{
            width: '32px', height: '32px', borderRadius: '50%', background: '#075e54',
            border: 'none', color: '#fff', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer'
          }}>
            <Send size={14} />
          </button>
        </form>

        {/* Payment Simulator Popup inside Phone Screen */}
        {showPayment && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '16px'
          }}>
            <div style={{
              background: '#fff', width: '100%', borderRadius: '16px',
              padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#000' }}>💳 Razorpay & Stripe Gateway</span>
                <button onClick={() => setShowPayment(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>✕</button>
              </div>

              {payStatus === 'idle' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#000' }}>
                  <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <span style={{ fontSize: '0.55rem', color: '#64748b', display: 'block' }}>RECIPIENT: LAL DENTAL CARE</span>
                    <strong style={{ fontSize: '0.85rem' }}>Amount: ₹{order?.finalAmount || '20,000'}</strong>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.55rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>UPI ID OR CELL NUMBER</label>
                    <input type="text" defaultValue="doctor@okaxis" readOnly style={{ width: '100%', padding: '6px', fontSize: '0.72rem', border: '1px solid #ccc', borderRadius: '4px', background: '#f1f5f9', color: '#000' }} />
                  </div>

                  <button
                    onClick={executePayment}
                    style={{
                      background: '#22c55e', color: '#fff', border: 'none', padding: '10px',
                      borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer',
                      marginTop: '4px'
                    }}
                  >
                    Authorize Payment Simulation
                  </button>
                </div>
              ) : payStatus === 'paying' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px 0', color: '#000' }}>
                  <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid #e2e8f0', borderTop: '3px solid #22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Settling B2B transaction lines...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px 0', color: '#000' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#dcf8c6', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>✓</div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>Success! Order Marked Paid.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
