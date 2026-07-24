import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import { Play, X, Film, Trash2, Edit3, Plus, ExternalLink, ShoppingBag, Activity, Package, MessageSquare, Settings, ChevronDown, BookOpen, Link, Search } from 'lucide-react';
import PremiumSelect from './ui/PremiumSelect';
import { t } from '../utils/i18n';
import EmptyStateCard from './EmptyStateCard';

export default function ProGuidesSubscreen({ lang, isLoggedIn = true }) {
  const isDark = localStorage.getItem('guestTheme') === 'dark';
  const guides = useLiveQuery(() => db.customGuides.toArray()) || [];
  const [guideSubTab, setGuideSubTab] = useState('video'); // 'video' | 'written'
  const [expandedSection, setExpandedSection] = useState(null);
  
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  
  const GUIDE_CATEGORIES = ['All', 'Implant', 'Surgical', 'Abutment', 'Crown', 'Portal Guide'];

  const filteredGuides = useMemo(() => {
    return guides.filter(guide => {
      const matchCat = category === 'All' || guide.tag === category || (category === 'Portal Guide' && guide.tag === 'System Guide');
      const q = search.toLowerCase();
      const matchSearch = !q || 
        guide.title?.toLowerCase().includes(q) || 
        (guide.desc && guide.desc.toLowerCase().includes(q)) || 
        (guide.tag && guide.tag.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [guides, search, category]);
  
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
    <div className="animate-fade-in" style={{ padding: '24px 24px 30px 24px', boxSizing: 'border-box' }}>
      
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
          
          {/* Glassmorphic Search & Filters */}
          <div className="guides-search-filters" style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 24, padding: '16px 16px 14px', border: '1.5px solid rgba(14,165,233,0.18)', marginBottom: 12, boxShadow: '0 8px 30px -10px rgba(14,165,233,0.15)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search B2B video guides..."
                style={{ width: '100%', padding: '13px 40px 13px 42px', background: 'rgba(255, 255, 255, 0.95)', border: '1.5px solid rgba(14,165,233,0.2)', borderRadius: 16, fontSize: '0.88rem', color: 'hsl(var(--text-primary))', outline: 'none', fontFamily: 'Outfit', boxSizing: 'border-box', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 2px 6px rgba(15,23,42,0.03)' }}
                onFocus={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.background = '#ffffff'; e.target.style.boxShadow = '0 10px 25px -10px rgba(14,165,233,0.22), 0 0 0 3px rgba(14, 165, 233, 0.1)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(14,165,233,0.2)'; e.target.style.background = 'rgba(255, 255, 255, 0.95)'; e.target.style.boxShadow = '0 2px 6px rgba(15,23,42,0.03)'; }}
              />
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#0ea5e9', pointerEvents: 'none', zIndex: 2 }} />
              {search && (
                <button
                  onClick={() => { setSearch(''); setCategory('All'); }}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20, height: 20, borderRadius: '50%',
                    color: '#ef4444'
                  }}
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Category Chips Scrollbar */}
            <div className="cat-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingTop: 2, paddingBottom: 4, paddingLeft: 2, paddingRight: 2, scrollbarWidth: 'none', justifyContent: 'flex-start', maskImage: 'linear-gradient(to right, white 85%, transparent)', WebkitMaskImage: 'linear-gradient(to right, white 85%, transparent)' }}>
              <style>{`.cat-scroll::-webkit-scrollbar{display:none}`}</style>
              {GUIDE_CATEGORIES.map(cat => {
                const isActive = category.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    className="cat-chip"
                    onClick={() => setCategory(cat)}
                    style={{
                      flexShrink: 0,
                      padding: '8px 16px',
                      borderRadius: 24,
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      fontFamily: 'Outfit',
                      border: '1.5px solid',
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                      background: isActive ? 'linear-gradient(135deg, #0ea5e9, #4f46e5)' : 'rgba(255,255,255,0.7)',
                      borderColor: isActive ? '#0ea5e9' : 'rgba(14,165,233,0.12)',
                      color: isActive ? '#fff' : 'hsl(var(--text-muted))',
                      boxShadow: isActive ? '0 4px 12px -4px rgba(14,165,233,0.4)' : '0 2px 4px rgba(15,23,42,0.02)',
                      backdropFilter: isActive ? 'none' : 'blur(6px)',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = '#0ea5e9';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.95)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'rgba(14,165,233,0.12)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.7)';
                        e.currentTarget.style.transform = 'none';
                      }
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Videos Grid Container */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '20px',
            marginTop: '4px'
          }}>
            {filteredGuides.map((video) => (
              <div 
                key={video.id} 
                className="glass-card" 
                style={{ 
                  padding: '14px', 
                  margin: 0, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px', 
                  border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(14,165,233,0.15)',
                  background: isDark ? 'rgba(15,23,42,0.45)' : 'rgba(255,255,255,0.72)',
                  borderRadius: '24px',
                  boxShadow: '0 8px 32px rgba(15,23,42,0.04)',
                  transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.borderColor = '#0ea5e955';
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(14,165,233,0.08)';
                  const img = e.currentTarget.querySelector('.video-thumb-overlay');
                  if (img) img.style.transform = 'scale(1.08)';
                  const btn = e.currentTarget.querySelector('.video-play-btn');
                  if (btn) btn.style.transform = 'scale(1.1) rotate(5deg)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(14,165,233,0.15)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(15,23,42,0.04)';
                  const img = e.currentTarget.querySelector('.video-thumb-overlay');
                  if (img) img.style.transform = 'none';
                  const btn = e.currentTarget.querySelector('.video-play-btn');
                  if (btn) btn.style.transform = 'none';
                }}
              >
                {/* Thumbnail Mock Container */}
                <div 
                  onClick={() => setSelectedVideo(video)}
                  style={{
                    position: 'relative', 
                    height: '150px', 
                    borderRadius: '16px',
                    background: '#0a0f1d',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    cursor: 'pointer',
                    overflow: 'hidden',
                    border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(14,165,233,0.12)'
                  }}
                >
                  {/* YouTube Thumbnail Background with zoom */}
                  {!video.localPath && (
                    <div 
                      className="video-thumb-overlay"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.55)), url('https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg') center/cover`,
                        transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    />
                  )}
                  {video.localPath && (
                    <div 
                      className="video-thumb-overlay"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(135deg, #071e3d 0%, #030712 100%)',
                        transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {/* Subtly show moving mesh in local backgrounds */}
                      <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(#38bdf8 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                    </div>
                  )}

                  {/* Play Button Glow Icon */}
                  <div 
                    className="video-play-btn"
                    style={{
                      width: '48px', height: '48px', borderRadius: '50%', 
                      background: 'linear-gradient(135deg, #0ea5e9, #4f46e5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                      boxShadow: '0 8px 24px rgba(14, 165, 233, 0.35)', 
                      transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                      zIndex: 2,
                      border: '1.5px solid rgba(255,255,255,0.2)'
                    }}
                  >
                    <Play size={18} fill="#ffffff" style={{ marginLeft: '3px', color: '#ffffff' }} />
                  </div>
    
                  {/* Tag Pill */}
                  <span style={{
                    position: 'absolute', top: '10px', left: '10px', fontSize: '0.62rem', fontWeight: '800',
                    background: 'rgba(15,23,42,0.85)', color: '#38bdf8', padding: '4px 10px', borderRadius: '8px', 
                    textTransform: 'uppercase', fontFamily: 'Outfit', border: '1px solid rgba(56,189,248,0.3)',
                    backdropFilter: 'blur(4px)', zIndex: 2
                  }}>
                    {video.tag === 'System Guide' ? 'Portal Guide' : video.tag}
                  </span>
                </div>
    
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 4px 4px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: isDark ? '#ffffff' : '#0f172a', fontFamily: 'Outfit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                      {video.title}
                    </h4>
                    <p style={{ fontSize: '0.74rem', color: isDark ? '#94a3b8' : '#64748b', marginTop: '6px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '34px', margin: 0 }}>
                      {video.desc || 'Demonstrational procedure video tutorial for professional clinical practitioners.'}
                    </p>
                  </div>
    
                  {isLoggedIn && (
                    <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', flexShrink: 0, marginTop: 2 }}>
                      <button 
                        onClick={() => handleStartEdit(video)} 
                        style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(14,165,233,0.08)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} 
                        onMouseEnter={e => { e.currentTarget.style.background = '#0ea5e9'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(14,165,233,0.08)'; e.currentTarget.style.color = '#0ea5e9'; }}
                        title="Edit Video"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button 
                        onClick={() => handleDeleteVideo(video.id)} 
                        style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.08)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} 
                        onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444'; }}
                        title="Delete Video"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
  
          {filteredGuides.length === 0 && (
            <EmptyStateCard 
              icon={Film} 
              title="No Video Guides Found" 
              message={search || category !== 'All' ? "Try a different search or tag category." : t('noGuides', lang)} 
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
