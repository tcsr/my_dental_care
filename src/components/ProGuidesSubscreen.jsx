import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import { Play, X, Film, Trash2, Edit3, Plus, ExternalLink, ShoppingBag, Activity, Package, MessageSquare, Settings, ChevronDown, BookOpen, Link } from 'lucide-react';
import PremiumSelect from './ui/PremiumSelect';
import { t } from '../utils/i18n';
import EmptyStateCard from './EmptyStateCard';

export default function ProGuidesSubscreen({ lang, isLoggedIn = true }) {
  const guides = useLiveQuery(() => db.customGuides.toArray()) || [];
  const [guideSubTab, setGuideSubTab] = useState('video'); // 'video' | 'written'
  const [expandedSection, setExpandedSection] = useState(null);
  
  // Modal player state
  const [selectedVideo, setSelectedVideo] = useState(null);
  
  // Add Video form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSourceType, setNewSourceType] = useState('youtube'); // 'youtube' | 'local'
  const [newUrl, setNewUrl] = useState('');
  const [newLocalPath, setNewLocalPath] = useState('');
  const [newTag, setNewTag] = useState('Implant');
  const [newDesc, setNewDesc] = useState('');

  // Edit Video form states
  const [editingVideo, setEditingVideo] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSourceType, setEditSourceType] = useState('youtube'); // 'youtube' | 'local'
  const [editUrl, setEditUrl] = useState('');
  const [editLocalPath, setEditLocalPath] = useState('');
  const [editTag, setEditTag] = useState('Implant');
  const [editDesc, setEditDesc] = useState('');

  const handleCloseVideo = () => {
    setSelectedVideo(null);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (selectedVideo) {
          setSelectedVideo(null);
        } else if (editingVideo) {
          setEditingVideo(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedVideo, editingVideo]);

  // Helper to extract YouTube video ID from standard URL or share link
  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!newTitle) return;

    let ytId = null;
    let localPathVal = null;

    if (newSourceType === 'youtube') {
      ytId = getYouTubeId(newUrl);
      if (!ytId) {
        alert('Invalid YouTube URL. Please enter a valid watch link or short share link.');
        return;
      }
    } else {
      if (!newLocalPath.trim()) {
        alert('Please enter a local video file path.');
        return;
      }
      localPathVal = newLocalPath.trim();
    }

    await db.customGuides.add({
      title: newTitle,
      desc: newDesc,
      youtubeId: ytId,
      localPath: localPathVal,
      tag: newTag
    });

    setNewTitle('');
    setNewUrl('');
    setNewLocalPath('');
    setNewDesc('');
    setShowAddForm(false);
    alert('Training video guide added successfully!');
  };

  const handleStartEdit = (video) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditSourceType(video.localPath ? 'local' : 'youtube');
    setEditUrl(video.youtubeId ? `https://www.youtube.com/watch?v=${video.youtubeId}` : '');
    setEditLocalPath(video.localPath || '');
    setEditTag(video.tag);
    setEditDesc(video.desc);
  };

  const handleUpdateVideo = async (e) => {
    e.preventDefault();
    if (!editTitle) return;

    let ytId = null;
    let localPathVal = null;

    if (editSourceType === 'youtube') {
      ytId = getYouTubeId(editUrl);
      if (!ytId) {
        alert('Invalid YouTube URL.');
        return;
      }
    } else {
      if (!editLocalPath.trim()) {
        alert('Please enter a local video file path.');
        return;
      }
      localPathVal = editLocalPath.trim();
    }

    await db.customGuides.update(editingVideo.id, {
      title: editTitle,
      desc: editDesc,
      youtubeId: ytId,
      localPath: localPathVal,
      tag: editTag
    });

    setEditingVideo(null);
    alert('Training video updated successfully!');
  };

  const handleDeleteVideo = async (id) => {
    if (await confirm('Delete this training video guide permanently?')) {
      await db.customGuides.delete(id);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '30px' }}>
      
      {/* Intro Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))' }}>
            <Film size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', fontWeight: '800', fontFamily: 'Outfit', margin: 0 }}>
              {t('guidesTitle', lang)}
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>
              {t('guidesDesc', lang)}
            </p>
          </div>
        </div>

        {guideSubTab === 'video' && isLoggedIn && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                background: showAddForm ? 'hsl(var(--color-hyper) / 10%)' : 'hsl(var(--primary-glow))',
                color: showAddForm ? 'hsl(var(--color-hyper))' : 'hsl(var(--primary))', padding: '6px 12px',
                borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                fontFamily: 'Outfit', border: showAddForm ? '1px solid hsl(var(--color-hyper))' : '1px solid hsl(var(--primary))',
                transition: 'all 0.2s ease'
              }}
            >
              {showAddForm ? (
                <>
                  <X size={14} /> Cancel
                </>
              ) : (
                <>
                  <Plus size={14} /> Add Link
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Sub-tab Selection Bar */}
      <div className="tab-group">
        <button
          type="button"
          onClick={() => { setGuideSubTab('video'); setShowAddForm(false); }}
          className={`tab-btn ${guideSubTab === 'video' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Film size={14} /> {t('manualTabVideo', lang)}
        </button>
        <button
          type="button"
          onClick={() => { setGuideSubTab('written'); setShowAddForm(false); }}
          className={`tab-btn ${guideSubTab === 'written' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <BookOpen size={14} /> {t('manualTabWritten', lang)}
        </button>
      </div>

      {/* Add Custom Video Form */}
      {showAddForm && (
        <div className="glass-card animate-fade-in" style={{ padding: '16px 20px', marginBottom: '16px', border: '1px solid hsl(var(--primary) / 20%)' }}>
          <h4 style={{ fontSize: '0.82rem', fontWeight: 'bold', marginBottom: '10px', color: 'hsl(var(--primary))', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Link size={14} /> {t('addCustomGuide', lang)}
          </h4>
          
          <form onSubmit={handleAddVideo} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('videoTitle', lang)}</label>
                <input 
                  type="text" 
                  placeholder="e.g. Anterior Crown Placement Video" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)} 
                  required
                  style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Source Type</label>
                <PremiumSelect 
                  value={newSourceType} 
                  onChange={(e) => setNewSourceType(e.target.value)}
                  style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                >
                  <option value="youtube">YouTube Link</option>
                  <option value="local">Local Video File</option>
                </PremiumSelect>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 2 }}>
                {newSourceType === 'youtube' ? (
                  <>
                    <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('youtubeUrl', lang)}</label>
                    <input 
                      type="text" 
                      placeholder="https://youtube.com/watch?v=..." 
                      value={newUrl} 
                      onChange={(e) => setNewUrl(e.target.value)} 
                      required
                      style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} 
                    />
                  </>
                ) : (
                  <>
                    <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Local File Path (inside public/)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. /videos/my_video.mp4" 
                      value={newLocalPath} 
                      onChange={(e) => setNewLocalPath(e.target.value)} 
                      required
                      style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} 
                    />
                  </>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('category', lang)}</label>
                <PremiumSelect 
                  value={newTag} 
                  onChange={(e) => setNewTag(e.target.value)}
                  style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                >
                  <option value="Implant">Implant</option>
                  <option value="Surgical">Surgical</option>
                  <option value="Abutment">Abutment</option>
                  <option value="Crown">Crown</option>
                  <option value="System Guide">Portal Guide</option>
                </PremiumSelect>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Description:</label>
              <input 
                type="text" 
                placeholder="Brief summary of tutorial guide content..." 
                value={newDesc} 
                onChange={(e) => setNewDesc(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} 
              />
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '10px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '4px', fontFamily: 'Outfit' }}>
              {t('saveGuideBtn', lang)}
            </button>
          </form>
        </div>
      )}

      {/* Videos List Grid */}
      {guideSubTab === 'video' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {guides.map((video) => (
            <div key={video.id} className="glass-card" style={{ padding: '14px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid hsl(var(--border-color))' }}>
              
              {/* Thumbnail Mock Container */}
              <div 
                onClick={() => setSelectedVideo(video)}
                style={{
                  position: 'relative', 
                  height: '140px', 
                  borderRadius: '10px',
                  background: video.localPath 
                    ? 'linear-gradient(rgba(15, 23, 42, 0.4), rgba(15, 23, 42, 0.85)), #0f172a'
                    : `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.6)), url('https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg') center/cover`,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  boxShadow: 'inset 0 0 30px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  border: '1.5px solid hsl(var(--border-color))'
                }}
              >
                {/* Play Button Glow Icon */}
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%', background: 'hsl(var(--primary))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.35)', transition: 'transform 0.2s'
                }}>
                  <Play size={20} style={{ marginLeft: '3px' }} />
                </div>
  
                {/* Tag Pill */}
                <span style={{
                  position: 'absolute', top: '8px', left: '8px', fontSize: '0.58rem', fontWeight: '800',
                  background: 'hsl(var(--primary))', color: '#fff', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontFamily: 'Outfit'
                }}>
                  {video.tag}
                </span>
              </div>
  
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: '800', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>
                    {video.title}
                  </h4>
                  <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginTop: '4px', lineHeight: 1.35 }}>
                    {video.desc || 'No description provided.'}
                  </p>
                </div>
  
                {isLoggedIn && (
                  <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
                    <button onClick={() => handleStartEdit(video)} style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer' }} title="Edit Video">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDeleteVideo(video.id)} style={{ background: 'none', border: 'none', color: 'hsl(var(--color-hyper))', cursor: 'pointer' }} title="Delete Video">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
  
          {guides.length === 0 && (
            <EmptyStateCard 
              icon={Film} 
              title="No Video Guides Found" 
              message={t('noGuides', lang)} 
            />
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            {
              id: 'sales',
              icon: ShoppingBag,
              titleKey: 'manualTitleSales',
              bulletsKey: 'manualBulletsSales'
            },
            {
              id: 'implant',
              icon: Activity,
              titleKey: 'manualTitleImplants',
              bulletsKey: 'manualBulletsImplants'
            },
            {
              id: 'inventory',
              icon: Package,
              titleKey: 'manualTitleInventory',
              bulletsKey: 'manualBulletsInventory'
            },
            {
              id: 'whatsapp',
              icon: MessageSquare,
              titleKey: 'manualTitleReminders',
              bulletsKey: 'manualBulletsReminders'
            },
            {
              id: 'settings',
              icon: Settings,
              titleKey: 'manualTitleSettings',
              bulletsKey: 'manualBulletsSettings'
            }
          ].map((sec) => {
            const isExpanded = expandedSection === sec.id;
            const IconComponent = sec.icon;
            const title = t(sec.titleKey, lang);
            const bulletsStr = t(sec.bulletsKey, lang);
            
            // Clean up the bullet points
            const bullets = bulletsStr
              .split('\n')
              .map(b => b.trim())
              .filter(b => b.length > 0)
              .map(b => b.replace(/^[•\-\s]+/, '')); // strip existing bullet/dash characters

            return (
              <div 
                key={sec.id} 
                className="glass-card" 
                style={{ 
                  padding: '16px', 
                  margin: 0, 
                  border: '1px solid hsl(var(--border-color))',
                  borderRadius: '12px',
                  cursor: 'pointer', 
                  transition: 'all 0.25s ease',
                  background: isExpanded ? 'hsl(var(--bg-card))' : 'hsl(var(--bg-card) / 40%)',
                  boxShadow: isExpanded ? '0 8px 20px -8px hsl(var(--primary) / 25%)' : 'none'
                }}
                onClick={() => setExpandedSection(isExpanded ? null : sec.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      padding: '8px', 
                      borderRadius: '8px', 
                      background: isExpanded ? 'hsl(var(--primary-glow))' : 'hsl(var(--border-color) / 20%)',
                      color: isExpanded ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                      transition: 'all 0.25s ease'
                    }}>
                      <IconComponent size={18} />
                    </div>
                    <h4 style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: '700', 
                      color: isExpanded ? 'hsl(var(--primary))' : 'hsl(var(--text-primary))', 
                      fontFamily: 'Outfit', 
                      margin: 0,
                      transition: 'color 0.2s'
                    }}>
                      {title}
                    </h4>
                  </div>
                  <div style={{
                    color: isExpanded ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                    transition: 'transform 0.25s ease',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}>
                    <ChevronDown size={16} />
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ 
                    marginTop: '12px', 
                    borderTop: '1px solid hsl(var(--border-color) / 30%)', 
                    paddingTop: '12px'
                  }} onClick={(e) => e.stopPropagation()}>
                    <ul style={{ 
                      margin: 0, 
                      paddingLeft: '18px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px',
                      fontSize: '0.74rem', 
                      color: 'hsl(var(--text-muted))', 
                      lineHeight: 1.45 
                    }}>
                      {bullets.map((bullet, idx) => (
                        <li key={idx} style={{ position: 'relative', listStyleType: 'disc' }}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Video Modal Player (using portal so it overlays the entire app frame) */}
      {selectedVideo && createPortal(
        <div className="modal-overlay-container" style={{ zIndex: 9999 }}>
          <div className="modal-content-card guides-modal-player animate-fade-in" style={{ maxWidth: '820px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>
                {selectedVideo.title}
              </h3>
              <button 
                onClick={handleCloseVideo}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Video Iframe / Local Video Tag */}
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '12px', overflow: 'hidden', border: '1px solid hsl(var(--border-color))', background: '#000' }}>
              {selectedVideo.localPath ? (
                <video 
                  src={`${import.meta.env.BASE_URL || ''}${selectedVideo.localPath.replace(/^\//, '')}`}
                  controls
                  autoPlay
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <iframe 
                  src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                  title={selectedVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              )}
            </div>

            {!selectedVideo.localPath && (
              <button 
                onClick={() => window.open(`https://youtube.com/watch?v=${selectedVideo.youtubeId}`, '_blank')}
                className="btn-primary"
                style={{ fontSize: '0.75rem', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'Outfit' }}
              >
                {t('openInYt', lang)} <ExternalLink size={14} />
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Edit Video Modal Overlay */}
      {editingVideo && createPortal(
        <div className="modal-overlay-container" style={{ zIndex: 9999 }}>
          <div className="modal-content-card animate-fade-in" style={{ minHeight: 'auto', height: 'auto', maxHeight: '90vh', padding: '24px', paddingBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>
                ✏️ {t('editGuideTitle', lang)}
              </h3>
              <button onClick={() => setEditingVideo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateVideo} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>{t('videoTitle', lang)}</label>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>Source Type</label>
                  <PremiumSelect value={editSourceType} onChange={(e) => setEditSourceType(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                    <option value="youtube">YouTube Link</option>
                    <option value="local">Local Video File</option>
                  </PremiumSelect>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 2 }}>
                  {editSourceType === 'youtube' ? (
                    <>
                      <label style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>{t('youtubeUrl', lang)}</label>
                      <input type="text" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} required
                        style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                    </>
                  ) : (
                    <>
                      <label style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>Local File Path (inside public/)</label>
                      <input type="text" value={editLocalPath} onChange={(e) => setEditLocalPath(e.target.value)} required
                        style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                    </>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>{t('category', lang)}</label>
                  <PremiumSelect value={editTag} onChange={(e) => setEditTag(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                    <option value="Implant">Implant</option>
                    <option value="Surgical">Surgical</option>
                    <option value="Abutment">Abutment</option>
                    <option value="Crown">Crown</option>
                    <option value="System Guide">Portal Guide</option>
                  </PremiumSelect>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 'bold' }}>Description:</label>
                <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
              </div>

              <button type="submit" className="btn-primary" style={{ padding: '10px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '6px', fontFamily: 'Outfit' }}>
                {t('saveChanges', lang)}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
