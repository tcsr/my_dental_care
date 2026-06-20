import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import { Trash2, Edit3, X, Activity, Plus, Folder, Wrench, Cpu, RotateCcw } from 'lucide-react';
import { t } from '../utils/i18n';
import EmptyStateCard from './EmptyStateCard';

const STAGES = [
  'Planning',
  'Surgical (Fixture)',
  'Healing (Abutment)',
  'Prosthetic (Crown)',
  'Completed'
];

const STAGE_KEYS = {
  'Planning': 'stagePlanning',
  'Surgical (Fixture)': 'stageSurgical',
  'Healing (Abutment)': 'stageHealing',
  'Prosthetic (Crown)': 'stageProsthetic',
  'Completed': 'stageCompleted'
};


export default function ProImplantsSubscreen({ lang, profile }) {
  const isDoctor = profile?.activeRole === 'doctor';
  const actingClientId = profile?.actingClientId ? parseInt(profile.actingClientId) : null;

  const clients = useLiveQuery(() => db.b2bClients.toArray()) || [];
  const products = useLiveQuery(() => db.b2bProducts.filter(p => p.category === 'Implant').toArray()) || [];
  const cases = useLiveQuery(async () => {
    if (!db || !db.implantCases) return [];
    const allCases = await db.implantCases.toArray();
    if (isDoctor && actingClientId) {
      return allCases.filter(c => c.doctorId === actingClientId);
    }
    return allCases;
  }, [isDoctor, actingClientId]) || [];

  // Form state
  const [patientName, setPatientName] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [toothNumber, setToothNumber] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');

  // Tab State
  const [activeTab, setActiveTab] = useState('cases'); // 'cases' | 'assembler'

  // Assembler State
  const [selectedFixture, setSelectedFixture] = useState('std'); // 'std' | 'wide' | 'narrow'
  const [selectedAbutment, setSelectedAbutment] = useState('std'); // 'std' | 'angled' | 'wide' | 'narrow'
  const [selectedCrown, setSelectedCrown] = useState('molar'); // 'molar' | 'bicuspid' | 'anterior'
  const [assemblyState, setAssemblyState] = useState('idle'); // 'idle' | 'assembling' | 'assembled'
  const [associatedCaseId, setAssociatedCaseId] = useState('');
  const [showGrid, setShowGrid] = useState(true);
  const [scannerActive, setScannerActive] = useState(null);

  // Edit Case States
  const [editingCase, setEditingCase] = useState(null);
  const [editPatientName, setEditPatientName] = useState('');
  const [editDoctorId, setEditDoctorId] = useState('');
  const [editToothNumber, setEditToothNumber] = useState('');
  const [editProductId, setEditProductId] = useState('');
  const getDiam = (val) => {
    if (val === 'narrow') return 3.3;
    if (val === 'wide') return 5.0;
    return 4.0;
  };

  const fixtureD = getDiam(selectedFixture);
  const abutmentD = getDiam(selectedAbutment);
  const crownD = getDiam(selectedCrown);

  const platformMatch = fixtureD === abutmentD;
  const crownMatch = abutmentD === crownD;
  const isCompatible = platformMatch && crownMatch;
  const startEditCase = (c) => {
    setEditingCase(c);
    setEditPatientName(c.patientName);
    setEditDoctorId(c.doctorId);
    setEditToothNumber(c.toothNumber);
    setEditProductId(c.implantProductId);
  };

  const handleUpdateCase = async (e) => {
    e.preventDefault();
    if (!editingCase || !editPatientName || !editToothNumber) return;
    await db.implantCases.update(editingCase.id, {
      patientName: editPatientName,
      doctorId: parseInt(editDoctorId),
      toothNumber: editToothNumber,
      implantProductId: parseInt(editProductId)
    });
    setEditingCase(null);
    alert('Implant case details updated successfully!');
  };

  const handleAddCase = async (e) => {
    e.preventDefault();
    if (!patientName || !selectedDoctorId || !toothNumber || !selectedProductId) {
      alert('Please fill out all fields to register an implant case.');
      return;
    }

    await db.implantCases.add({
      patientName,
      doctorId: parseInt(selectedDoctorId),
      toothNumber,
      implantProductId: parseInt(selectedProductId),
      stage: 'Planning',
      startDate: Date.now(),
      lastFollowUpDate: Date.now(),
      nextFollowUpDate: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days default
    });

    setPatientName('');
    setSelectedDoctorId('');
    setToothNumber('');
    setSelectedProductId('');
    alert('Implant case registered successfully!');
  };

  const advanceStage = async (caseId, currentStage) => {
    const currentIndex = STAGES.indexOf(currentStage);
    if (currentIndex < STAGES.length - 1) {
      const nextStage = STAGES[currentIndex + 1];
      await db.implantCases.update(caseId, {
        stage: nextStage,
        lastFollowUpDate: Date.now(),
        nextFollowUpDate: Date.now() + 14 * 24 * 60 * 60 * 1000 // Update next follow up to +14 days
      });
    }
  };

  const regressStage = async (caseId, currentStage) => {
    const currentIndex = STAGES.indexOf(currentStage);
    if (currentIndex > 0) {
      const prevStage = STAGES[currentIndex - 1];
      await db.implantCases.update(caseId, {
        stage: prevStage,
        lastFollowUpDate: Date.now()
      });
    }
  };

  const handleDeleteCase = async (caseId) => {
    if (confirm('Delete this implant case record?')) {
      await db.implantCases.delete(caseId);
    }
  };

  const handleSaveSpecConfig = async () => {
    if (!associatedCaseId) {
      alert('Please select a patient case first.');
      return;
    }
    const caseId = parseInt(associatedCaseId);
    const matchedCase = cases.find(c => c.id === caseId);
    if (!matchedCase) return;
    
    await db.implantCases.update(caseId, {
      specConfig: {
        fixture: selectedFixture,
        abutment: selectedAbutment,
        crown: selectedCrown,
        timestamp: Date.now()
      }
    });
    alert(`Configuration saved successfully for patient: ${matchedCase.patientName}!`);
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '30px' }}>
      
      {/* Sub tabs switcher */}
      <div className="tab-group">
        <button
          type="button"
          onClick={() => setActiveTab('cases')}
          className={`tab-btn ${activeTab === 'cases' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Folder size={14} /> {t('activeCases', lang)}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('assembler')}
          className={`tab-btn ${activeTab === 'assembler' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Wrench size={14} /> Visual Assembler
        </button>
      </div>

      {activeTab === 'cases' ? (
        <>
          {/* Add Implant Case Form */}
          {!isDoctor && (
        <div className="glass-card" style={{ padding: '18px 20px', marginBottom: '20px', border: '1px solid hsl(var(--border-color))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{ padding: '6px', borderRadius: '8px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))' }}>
              <Plus size={16} />
            </div>
            <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', fontWeight: '800', margin: 0 }}>
              {t('logImplantCase', lang)}
            </h3>
          </div>

          <form onSubmit={handleAddCase} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>{t('patientName', lang)}</label>
                <input 
                  type="text" 
                  placeholder="e.g. John Doe" 
                  value={patientName} 
                  onChange={(e) => setPatientName(e.target.value)}
                  style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>{t('toothNumber', lang)}</label>
                <input 
                  type="text" 
                  placeholder="e.g. 36" 
                  value={toothNumber} 
                  onChange={(e) => setToothNumber(e.target.value)}
                  style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} 
                />
              </div>
            </div>
      

          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>{t('attendingDoctor', lang)}</label>
              <select 
                value={selectedDoctorId} 
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}
              >
                <option value="">-- {t('attendingDoctor', lang)} --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.7rem', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>{t('implantModel', lang)}</label>
              <select 
                value={selectedProductId} 
                onChange={(e) => setSelectedProductId(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}
              >
                <option value="">-- {t('implantModel', lang)} --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ padding: '12px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '6px', fontFamily: 'Outfit' }}>
            {t('registerCaseBtn', lang)}
          </button>
        </form>
      </div>
      )}

      {/* Implant Cases List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ padding: '6px', borderRadius: '8px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))' }}>
            <Activity size={16} />
          </div>
          <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', fontWeight: '800', fontFamily: 'Outfit', margin: 0 }}>
            {t('activeCases', lang)}
          </h3>
        </div>

        {cases.length > 0 ? (
          cases.map(item => {
            const doctor = clients.find(c => c.id === item.doctorId);
            const implant = products.find(p => p.id === item.implantProductId);
            const currentStageIndex = STAGES.indexOf(item.stage);

            return (
              <div key={item.id} className="glass-card" style={{ padding: '16px', border: '1px solid hsl(var(--border-color))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1 }}>
                    {/* SVG progress circle */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <div style={{ position: 'relative', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="42" height="42" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="hsl(var(--border-color))"
                            strokeWidth="3.5"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="url(#implantsGrad)"
                            strokeWidth="3.5"
                            strokeDasharray={`${Math.round(((currentStageIndex + 1) / STAGES.length) * 100)}, 100`}
                            strokeLinecap="round"
                          />
                          <defs>
                            <linearGradient id="implantsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#0ea5e9" />
                              <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div style={{ position: 'absolute', fontSize: '0.58rem', fontWeight: '800', color: 'hsl(var(--text-primary))' }}>
                          {Math.round(((currentStageIndex + 1) / STAGES.length) * 100)}%
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: '800', margin: 0, fontFamily: 'Outfit' }}>
                        {item.patientName} (Tooth #{item.toothNumber})
                      </h4>
                      <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', marginTop: '4px', margin: 0 }}>
                        {t('attendingDoctor', lang)} {doctor ? doctor.name : 'Unknown Dentist'}
                      </p>
                      <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', margin: 0 }}>
                        {t('implantModel', lang)} {implant ? implant.name : 'Standard Titanium'}
                      </p>
                      {item.specConfig && (
                        <div style={{ marginTop: '8px', padding: '6px 10px', background: 'hsl(var(--bg-dark))', borderRadius: '6px', border: '1px dashed hsl(var(--border-color))' }}>
                          <p style={{ margin: 0, fontSize: '0.65rem', color: 'hsl(var(--text-muted))', fontWeight: 'bold' }}>
                            ⚙️ Visual Config Selections:
                          </p>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.65rem', color: 'hsl(var(--text-primary))', fontFamily: 'monospace' }}>
                            Fixture: {item.specConfig.fixture?.toUpperCase()} | Abutment: {item.specConfig.abutment?.toUpperCase()} | Crown: {item.specConfig.crown?.toUpperCase()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {!isDoctor && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => startEditCase(item)} style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer' }} title="Edit Case">
                        <Edit3 size={15} />
                      </button>
                      <button onClick={() => handleDeleteCase(item.id)} style={{ background: 'none', border: 'none', color: 'hsl(var(--color-hyper))', cursor: 'pointer' }} title="Delete Case">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress Visualizer - Sleek Medical Timeline */}
                <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                    
                    {/* Background Progress Line */}
                    <div style={{
                      position: 'absolute', top: '10px', left: '0', right: '0', height: '4px',
                      background: 'hsl(var(--border-color))', zIndex: 0, borderRadius: '2px'
                    }} />

                    {/* Active Progress Line */}
                    <div style={{
                      position: 'absolute', top: '10px', left: '0',
                      width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%`,
                      height: '4px', background: 'linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)', zIndex: 0,
                      transition: 'width 0.3s ease', borderRadius: '2px'
                    }} />

                    {STAGES.map((stage, idx) => {
                      const isActive = idx <= currentStageIndex;
                      const isCurrent = idx === currentStageIndex;

                      return (
                        <div key={stage} style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, zIndex: 1, position: 'relative'
                        }}>
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: isCurrent ? 'hsl(var(--primary))' : isActive ? 'hsl(var(--secondary))' : '#cbd5e1',
                            border: isCurrent ? '4px solid hsl(var(--primary-glow))' : '2px solid #fff',
                            boxShadow: isCurrent ? '0 0 10px hsl(var(--primary))' : '0 2px 5px rgba(0,0,0,0.1)',
                            transition: 'all 0.3s', cursor: 'pointer'
                          }} title={t(STAGE_KEYS[stage] || stage, lang)} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Stage Label Text */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'hsl(var(--text-primary))' }}>
                      {t('currentStage', lang)} <span style={{ color: 'hsl(var(--primary))', textTransform: 'uppercase' }}>{t(STAGE_KEYS[item.stage] || item.stage, lang)}</span>
                    </span>
                  </div>
                </div>

                {/* Action Buttons to Advance or Regress Stage */}
                {!isDoctor && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid hsl(var(--border-color))' }}>
                    <button 
                      disabled={currentStageIndex === 0}
                      onClick={() => regressStage(item.id, item.stage)}
                      style={{
                        flex: 1, padding: '8px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 'bold', border: '1px solid hsl(var(--border-color))',
                        background: 'none', cursor: currentStageIndex === 0 ? 'not-allowed' : 'pointer', color: currentStageIndex === 0 ? 'hsl(var(--text-dim))' : 'hsl(var(--text-primary))',
                        fontFamily: 'Outfit'
                      }}
                    >
                      ◀ {t('prevStage', lang)}
                    </button>
                    <button 
                      disabled={currentStageIndex === STAGES.length - 1}
                      onClick={() => advanceStage(item.id, item.stage)}
                      style={{
                        flex: 1, padding: '8px 10px', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 'bold', border: 'none',
                        background: 'hsl(var(--primary))', color: '#fff', cursor: currentStageIndex === STAGES.length - 1 ? 'not-allowed' : 'pointer',
                        fontFamily: 'Outfit'
                      }}
                    >
                      {t('nextStage', lang)} ▶
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.65rem', color: 'hsl(var(--text-dim))' }}>
                  <span>{t('startDate', lang)}: {new Date(item.startDate).toLocaleDateString()}</span>
                  <span>{t('nextCheckup', lang)}: {new Date(item.nextFollowUpDate).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyStateCard 
            icon={Activity} 
            title="No Implant Cases" 
            message="No implant cases currently logged. Register a new patient case to track clinical healing timelines." 
          />
        )}
      </div>
    </>
      ) : (
        <div className="glass-card animate-fade-in" style={{ padding: '20px', border: '1px solid hsl(var(--border-color))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', fontWeight: '800', margin: 0 }}>
              🔩 Interactive 2D Implant Assembler
            </h3>
          </div>

          <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', marginTop: '-10px', marginBottom: '20px' }}>
            Select implant parts and perform size matching validation to test engineering clearances. Simulate component threading and fitting with live SVG rendering.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Control Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Clinical Integration: Link to Patient Case */}
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: 'hsl(var(--text-dim))' }}>
                  Link to Patient Case
                </label>
                <select
                  value={associatedCaseId}
                  onChange={(e) => {
                    setAssociatedCaseId(e.target.value);
                    const parsedId = parseInt(e.target.value);
                    const matchedCase = cases.find(c => c.id === parsedId);
                    if (matchedCase && matchedCase.specConfig) {
                      setSelectedFixture(matchedCase.specConfig.fixture || 'std');
                      setSelectedAbutment(matchedCase.specConfig.abutment || 'std');
                      setSelectedCrown(matchedCase.specConfig.crown || 'molar');
                    }
                  }}
                  style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                >
                  <option value="">-- Associate with Case (Optional) --</option>
                  {cases.map(c => (
                    <option key={c.id} value={c.id}>{c.patientName} (Tooth #{c.toothNumber})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: 'hsl(var(--text-dim))' }}>
                  1. Select Fixture (Bone Anchor)
                </label>
                <select
                  value={selectedFixture}
                  onChange={(e) => {
                    setSelectedFixture(e.target.value);
                    setAssemblyState('idle');
                    setScannerActive('fixture');
                    setTimeout(() => setScannerActive(null), 850);
                  }}
                  style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                >
                  <option value="narrow">Narrow Body (3.3mm Platform)</option>
                  <option value="std">Tapered Standard (4.0mm Platform)</option>
                  <option value="wide">Wide Platform (5.0mm Platform)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: 'hsl(var(--text-dim))' }}>
                  2. Select Abutment (Connector Post)
                </label>
                <select
                  value={selectedAbutment}
                  onChange={(e) => {
                    setSelectedAbutment(e.target.value);
                    setAssemblyState('idle');
                    setScannerActive('abutment');
                    setTimeout(() => setScannerActive(null), 850);
                  }}
                  style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                >
                  <option value="narrow">Narrow Esthetic (3.3mm Connection)</option>
                  <option value="std">Standard Straight (4.0mm Connection)</option>
                  <option value="wide">Wide Healing Cap (5.0mm Connection)</option>
                  <option value="angled">Angled Multi-Unit (4.0mm Connection)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: 'hsl(var(--text-dim))' }}>
                  3. Select Crown (Prosthetic Tooth)
                </label>
                <select
                  value={selectedCrown}
                  onChange={(e) => {
                    setSelectedCrown(e.target.value);
                    setAssemblyState('idle');
                    setScannerActive('crown');
                    setTimeout(() => setScannerActive(null), 850);
                  }}
                  style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                >
                  <option value="anterior">Narrow Anterior (3.3mm Fit)</option>
                  <option value="bicuspid">Cement-Retained Bicuspid (4.0mm Fit)</option>
                  <option value="molar">Screw-Retained Molar (5.0mm Fit)</option>
                </select>
              </div>

              {/* Compatibility Check */}
              <div style={{ marginTop: '10px', padding: '12px', borderRadius: '10px', background: isCompatible ? 'hsl(var(--primary-glow) / 20%)' : 'hsl(var(--destructive-glow) / 20%)', border: '1px solid ' + (isCompatible ? 'hsl(var(--primary) / 30%)' : 'hsl(var(--destructive) / 30%)') }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold', margin: '0 0 6px 0', color: isCompatible ? 'hsl(var(--primary))' : 'hsl(var(--destructive))' }}>
                  {isCompatible ? '✅ Specs Aligned' : '⚠️ Compatibility Warning'}
                </h4>
                <div style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span>Platform Connection: {fixtureD}mm vs {abutmentD}mm {platformMatch ? '✓ Match' : '✗ Mismatch'}</span>
                  <span>Crown Seating Profile: {abutmentD}mm vs {crownD}mm {crownMatch ? '✓ Match' : '✗ Mismatch'}</span>
                  <span style={{ fontWeight: 'bold', color: 'hsl(var(--text-primary))', marginTop: '4px' }}>Recommended Torque: {selectedFixture === 'narrow' ? '20' : selectedFixture === 'wide' ? '35' : '30'} Ncm</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setAssemblyState('assembling');
                      setTimeout(() => {
                        setAssemblyState('assembled');
                        if (navigator.vibrate) {
                          navigator.vibrate([40, 30, 40]);
                        }
                      }, 1500);
                    }}
                    style={{
                      flex: '1 1 100%',
                      padding: '10px 12px',
                      fontSize: '0.72rem',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: assemblyState === 'assembling' ? 'not-allowed' : 'pointer',
                      background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
                      color: '#fff',
                      opacity: assemblyState === 'assembling' ? 0.7 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                    disabled={assemblyState === 'assembling'}
                  >
                    <Cpu size={12} /> {assemblyState === 'idle' ? 'Assemble Components' : assemblyState === 'assembling' ? 'Assembling...' : 'Re-Assemble'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssemblyState('idle')}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      fontSize: '0.72rem',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      border: '1px solid hsl(var(--border-color))',
                      background: 'transparent',
                      color: 'hsl(var(--text-primary))',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <RotateCcw size={12} /> Reset
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowGrid(!showGrid)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      fontSize: '0.72rem',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      border: '1px solid hsl(var(--border-color))',
                      background: 'transparent',
                      color: 'hsl(var(--text-primary))',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    📐 {showGrid ? 'Grid: ON' : 'Grid: OFF'}
                  </button>

                  {associatedCaseId && (
                    <button
                      type="button"
                      onClick={handleSaveSpecConfig}
                      style={{
                        flex: '1 1 100%',
                        padding: '10px 12px',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        borderRadius: '6px',
                        border: '1px solid hsl(var(--primary))',
                        background: 'hsl(var(--primary-glow) / 10%)',
                        color: 'hsl(var(--primary))',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '4px'
                      }}
                    >
                      💾 Save Config to Patient Case
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SVG Visualizer */}
            <div style={{
              background: 'radial-gradient(circle at center, #1e293b 0%, #0b0f19 100%)',
              border: '2px solid #334155',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '520px',
              boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.8), 0 10px 25px rgba(0,0,0,0.4)'
            }}>
              {/* CAD grid line overlays */}
              {showGrid && (
                <div style={{ position: 'absolute', inset: 0, opacity: 0.07, background: 'linear-gradient(to right, #38bdf8 1px, transparent 1px) 0 0 / 20px 20px, linear-gradient(to bottom, #38bdf8 1px, transparent 1px) 0 0 / 20px 20px' }}></div>
              )}

              <svg width="100%" height="480" viewBox="68 8 64 240" style={{ background: 'transparent', zIndex: 1 }}>
                <defs>
                  <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="30%" stopColor="#e2e8f0" />
                    <stop offset="70%" stopColor="#cbd5e1" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>
                  <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ca8a04" />
                    <stop offset="50%" stopColor="#fef08a" />
                    <stop offset="100%" stopColor="#854d0e" />
                  </linearGradient>
                  <linearGradient id="crownGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fffbeb" />
                    <stop offset="40%" stopColor="#ffffff" />
                    <stop offset="70%" stopColor="#fef3c7" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="boneGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#334155" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#1e293b" stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {/* Tech Radar / Concentric Rings Background */}
                <circle cx="100" cy="180" r="80" fill="none" stroke="#38bdf8" strokeOpacity={showGrid ? "0.08" : "0.01"} strokeWidth="1" strokeDasharray="4,4" />
                <circle cx="100" cy="180" r="50" fill="none" stroke="#38bdf8" strokeOpacity={showGrid ? "0.05" : "0.01"} strokeWidth="1.5" />
                <circle cx="100" cy="180" r="20" fill="none" stroke="#38bdf8" strokeOpacity={showGrid ? "0.03" : "0.005"} strokeWidth="1" />
                
                {/* HUD Alignment Laser Lines */}
                <line x1="100" y1="0" x2="100" y2="310" stroke="#0ea5e9" strokeOpacity={showGrid ? "0.18" : "0.02"} strokeDasharray="3,3" />
                <line x1="40" y1="180" x2="160" y2="180" stroke="#0ea5e9" strokeOpacity={showGrid ? "0.1" : "0.01"} strokeDasharray="2,2" />

                {/* Bone tissue level simulation line */}
                <rect x="30" y="120" width="140" height="145" fill="url(#boneGrad)" rx="8" />
                <line x1="30" y1="120" x2="170" y2="120" stroke="#475569" strokeWidth="1" strokeDasharray="4,4" />
                <text x="100" y="134" fill="#64748b" fontSize="5" fontWeight="900" letterSpacing="0.05em" textAnchor="middle">CORTICAL BONE LEVEL</text>

                {/* Technical dynamic telemetry text labels */}
                <text x="71" y="18" fill="#38bdf8" fillOpacity="0.6" fontSize="4.2" fontFamily="monospace">PLATFORM: {selectedFixture === 'narrow' ? '3.3mm' : selectedFixture === 'wide' ? '5.0mm' : '4.0mm'}</text>
                <text x="71" y="24" fill="#38bdf8" fillOpacity="0.6" fontSize="4.2" fontFamily="monospace">FIT TOLERANCE: +/-0.01mm</text>
                <text x="71" y="30" fill="#38bdf8" fillOpacity="0.6" fontSize="4.2" fontFamily="monospace">INDEX: INTERNAL HEX</text>
                <text x="71" y="36" fill="#38bdf8" fillOpacity="0.6" fontSize="4.2" fontFamily="monospace">REC. TORQUE: {selectedFixture === 'narrow' ? '20' : selectedFixture === 'wide' ? '35' : '30'} Ncm</text>
                <text x="71" y="42" fill={isCompatible ? '#22c55e' : '#f87171'} fillOpacity="0.8" fontSize="4.2" fontFamily="monospace" fontWeight="bold">ALIGNMENT: {isCompatible ? 'COMPATIBLE' : 'WARN MISMATCH'}</text>

                {/* SVG GROUP FOR FIXTURE */}
                {(() => {
                  const getFixtureWidth = () => {
                    if (selectedFixture === 'narrow') return 20;
                    if (selectedFixture === 'wide') return 34;
                    return 26;
                  };
                  const w = getFixtureWidth();
                  const x = 100 - w / 2;
                  
                  return (
                    <g style={{
                      transform: 'translateY(125px)',
                      cursor: 'pointer',
                      filter: scannerActive === 'fixture' ? 'drop-shadow(0 0 10px #38bdf8)' : 'none',
                      transition: 'filter 0.3s ease'
                    }}>
                      {/* Main anchor body - Gold anodized titanium gradient */}
                      <path
                        d={`M ${x},0 
                            L ${x + w},0 
                            L ${x + w - 4},50 
                            C ${x + w - 6},65 100,70 100,70 
                            C 100,70 ${x + 6},65 ${x + 4},50 
                            Z`}
                        fill="url(#goldGrad)"
                        stroke="#713f12"
                        strokeWidth="1.2"
                      />
                      {/* Threads (horizontal ridges) */}
                      <line x1={x + 2} y1="12" x2={x + w - 2} y2="12" stroke="#713f12" strokeWidth="2.2" />
                      <line x1={x + 3} y1="24" x2={x + w - 3} y2="24" stroke="#713f12" strokeWidth="2.2" />
                      <line x1={x + 4} y1="36" x2={x + w - 4} y2="36" stroke="#713f12" strokeWidth="2.2" />
                      <line x1={x + 5} y1="48" x2={x + w - 5} y2="48" stroke="#713f12" strokeWidth="2.2" />
                      
                      {/* Internal well */}
                      <path
                        d="M 94,0 L 94,18 L 106,18 L 106,0 Z"
                        fill="#0b0f19"
                        stroke="#0ea5e9"
                        strokeWidth="0.5"
                      />

                      <text x="100" y="32" fill="#451a03" fontSize="6.5" fontWeight="900" letterSpacing="0.05em" textAnchor="middle">FIXTURE</text>
                    </g>
                  );
                })()}

                {/* SVG GROUP FOR ABUTMENT */}
                {(() => {
                  const getAbutmentWidth = () => {
                    if (selectedAbutment === 'narrow') return 16;
                    if (selectedAbutment === 'wide') return 28;
                    return 22;
                  };
                  const w = getAbutmentWidth();
                  
                  const isAngled = selectedAbutment === 'angled';
                  
                  const getAbutmentStyle = () => {
                    if (assemblyState === 'assembling') {
                      return {
                        animation: 'threadAssembleAbutment 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                        transformOrigin: '100px 40px',
                        cursor: 'pointer',
                        filter: scannerActive === 'abutment' ? 'drop-shadow(0 0 10px #38bdf8)' : 'none'
                      };
                    }
                    return {
                      transform: assemblyState === 'assembled' ? 'translateY(80px) rotate(720deg)' : 'translateY(65px) rotate(0deg)',
                      transformOrigin: '100px 40px',
                      transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1), filter 0.3s ease',
                      cursor: 'pointer',
                      filter: scannerActive === 'abutment' ? 'drop-shadow(0 0 10px #38bdf8)' : 'none'
                    };
                  };
                  
                  return (
                    <g style={getAbutmentStyle()}>
                      {/* Abutment Head/Core - Titanium gradient */}
                      <path
                        d={isAngled 
                          ? `M 91,18 L 109,7 L 115,35 L 85,41 Z`
                          : `M ${100 - w/2 + 2},12 L ${100 + w/2 - 2},12 L ${100 + w/2},45 L ${100 - w/2},45 Z`
                        }
                        fill="url(#metalGrad)"
                        stroke="#334155"
                        strokeWidth="1.2"
                      />
                      {/* Abutment base screw/hexagon index */}
                      <rect x="94.5" y="45" width="11" height="15" fill="#475569" stroke="#1e293b" strokeWidth="0.8" rx="1" />
                      <line x1="97.5" y1="45" x2="97.5" y2="60" stroke="#cbd5e1" strokeWidth="0.8" />
                      <line x1="102.5" y1="45" x2="102.5" y2="60" stroke="#cbd5e1" strokeWidth="0.8" />
                      
                      <text x="100" y="28" fill="#0f172a" fontSize="6" fontWeight="900" letterSpacing="0.03em" textAnchor="middle">ABUTMENT</text>
                    </g>
                  );
                })()}

                {/* SVG GROUP FOR CROWN */}
                {(() => {
                  const getCrownWidth = () => {
                    if (selectedCrown === 'narrow') return 24;
                    if (selectedCrown === 'molar') return 44;
                    return 34;
                  };
                  const w = getCrownWidth();
                  const x = 100 - w / 2;
                  
                  const getCrownStyle = () => {
                    if (assemblyState === 'assembling') {
                      return {
                        animation: 'threadAssembleCrown 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                        cursor: 'pointer',
                        filter: scannerActive === 'crown' ? 'drop-shadow(0 0 10px #38bdf8)' : 'none'
                      };
                    }
                    return {
                      transform: assemblyState === 'assembled' ? 'translateY(61px)' : 'translateY(10px)',
                      transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1), filter 0.3s ease',
                      cursor: 'pointer',
                      filter: scannerActive === 'crown' ? 'drop-shadow(0 0 10px #38bdf8)' : 'none'
                    };
                  };
                  
                  return (
                    <g style={getCrownStyle()}>
                      {/* Realistic detailed tooth shape */}
                      <path
                        d={`M ${x},45 
                            C ${x - 4},20 ${x + w/4},6 100,6 
                            C ${100 + w/4},6 ${x + w + 4},20 ${x + w},45 
                            C ${x + w},58 ${x + w - 2},58 ${x + w - 4},64 
                            L ${x + 4},64 
                            C ${x + 2},58 ${x},58 ${x},45 Z`}
                        fill="url(#crownGrad)"
                        stroke="#d97706"
                        strokeWidth="1.2"
                        style={assemblyState === 'assembled' ? { animation: 'hudGlowPulse 3s infinite ease-in-out' } : {}}
                      />
                      {/* Crown visual cusp details */}
                      <path d={`M ${100 - w/4},18 C 100,24 100,24 ${100 + w/4},18`} fill="none" stroke="#f59e0b" strokeOpacity="0.4" strokeWidth="1" />
                      
                      {/* Inner seating cavity */}
                      <path
                        d="M 92,64 L 94,48 L 106,48 L 108,64 Z"
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="0.8"
                        strokeDasharray="1,1"
                        strokeOpacity="0.8"
                      />
                      <text x="100" y="34" fill="#b45309" fontSize="6.5" fontWeight="900" letterSpacing="0.05em" textAnchor="middle">CROWN</text>
                      <text x="100" y="42" fill="#d97706" fontSize="5" textAnchor="middle" fontWeight="bold">{selectedCrown.toUpperCase()}</text>
                    </g>
                  );
                })()}

              </svg>

              {/* High-tech status display panel overlay */}
              <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.92)',
                border: '1px solid #38bdf8',
                fontSize: '0.7rem',
                color: '#38bdf8',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                boxShadow: '0 0 15px rgba(56, 189, 248, 0.25), inset 0 0 8px rgba(56, 189, 248, 0.15)',
                letterSpacing: '0.07em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                zIndex: 10
              }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: assemblyState === 'assembled' ? '#22c55e' : assemblyState === 'assembling' ? '#eab308' : '#64748b',
                  display: 'inline-block',
                  boxShadow: assemblyState === 'assembled' ? '0 0 10px #22c55e' : assemblyState === 'assembling' ? '0 0 10px #eab308' : 'none',
                  animation: assemblyState === 'assembling' ? 'hudLaserPulse 1s infinite' : 'none'
                }}></span>
                STATUS: {assemblyState === 'idle' ? 'STANDBY' : assemblyState === 'assembling' ? 'ALIGNING...' : 'FULLY SEATED'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Case Modal Overlay */}
      {editingCase && (
        <div className="modal-overlay-container" style={{ zIndex: 9999 }}>
          <div className="modal-content-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>
                ✏️ {t('editImplantTitle', lang)}
              </h3>
              <button onClick={() => setEditingCase(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateCase} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('patientName', lang)}</label>
                  <input type="text" value={editPatientName} onChange={(e) => setEditPatientName(e.target.value)} required
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('toothNumber', lang)}</label>
                  <input type="text" value={editToothNumber} onChange={(e) => setEditToothNumber(e.target.value)} required
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('attendingDoctor', lang)}</label>
                  <select value={editDoctorId} onChange={(e) => setEditDoctorId(e.target.value)} required
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                    <option value="">-- {t('attendingDoctor', lang)} --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('implantModel', lang)}</label>
                  <select value={editProductId} onChange={(e) => setEditProductId(e.target.value)} required
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                    <option value="">-- {t('implantModel', lang)} --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ padding: '12px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '6px', fontFamily: 'Outfit' }}>
                {t('saveChanges', lang)}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
