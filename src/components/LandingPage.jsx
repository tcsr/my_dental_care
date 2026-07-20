import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store, LogIn, ShieldCheck, Users, Package, Award,
  ChevronLeft, ChevronRight, Target, Eye,
  Phone, Mail, MapPin, Send, ShoppingCart,
  Headphones, BookOpen, Globe, FileText, Calendar, GraduationCap,
  CheckCircle, Sparkles, Play, X, MessageSquare, Video
} from 'lucide-react';
import Footer from './Footer';
import { useStore } from '../utils/store';

const STATS = [
  { icon: Package, value: '10000+', label: 'Products Delivered', color: '#0ea5e9' },
  { icon: Users, value: '5000+', label: 'Clinics Served', color: '#6366f1' },
  { icon: Award, value: '100%', label: 'Titanium Gr5 Quality', color: '#10b981' },
  { icon: ShieldCheck, value: '24/7', label: 'Support Available', color: '#f59e0b' },
];

const TRUST_BADGES = [
  'ISO Certified',
  'Titanium Grade 5',
  'Gamma Ray Sterilized',
  'Lifetime Warranty',
];

function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.10 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={visible ? 'animate-fade-in' : ''} style={{ opacity: visible ? undefined : 0, animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

function CounterNumber({ value, duration = 1200 }) {
  const [displayValue, setDisplayValue] = useState(value);
  const ref = useRef(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const numMatch = value.match(/\d+/);
    if (!numMatch) {
      setDisplayValue(value);
      return;
    }

    const target = parseInt(numMatch[0], 10);
    const prefix = value.slice(0, numMatch.index);
    const suffix = value.slice(numMatch.index + numMatch[0].length);

    setDisplayValue(`${prefix}0${suffix}`);

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animatedRef.current) {
        animatedRef.current = true;
        let startTime = null;

        const animate = (currentTime) => {
          if (!startTime) startTime = currentTime;
          const progress = Math.min((currentTime - startTime) / duration, 1);
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          const currentCount = Math.floor(easeProgress * target);

          setDisplayValue(`${prefix}${currentCount}${suffix}`);

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            setDisplayValue(value);
          }
        };

        requestAnimationFrame(animate);
        observer.disconnect();
      }
    }, { threshold: 0.2 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{displayValue}</span>;
}

const FALLBACK_ONE_PIECE = [
  { id: 'fb-op-1', name: 'Mono Implant 3.5mm', category: 'Compression', price: 2900, image_url: '/products/two-piece-implant.jpeg' },
  { id: 'fb-op-2', name: 'Mono Implant 4.2mm', category: 'Compression', price: 2900, image_url: '/products/two-piece-implant.jpeg' },
  { id: 'fb-op-3', name: 'Basal Implant 4.0mm', category: 'Basal', price: 3200, image_url: '/products/two-piece-implant.jpeg' },
  { id: 'fb-op-4', name: 'Basal Implant 4.5mm', category: 'Basal', price: 3200, image_url: '/products/two-piece-implant.jpeg' },
  { id: 'fb-op-kit', name: 'Basal Surgical Kit', category: 'Instruments', price: 15000, image_url: '/products/dental-implant-kit.jpeg', isKit: true }
];

const FALLBACK_TWO_PIECE = [
  { id: 'fb-tp-1', name: 'Root Form Classic 3.5mm', category: 'Root Form', price: 2500, image_url: '/products/two-piece-implant.jpeg' },
  { id: 'fb-tp-2', name: 'Root Form Classic 4.3mm', category: 'Root Form', price: 2500, image_url: '/products/two-piece-implant.jpeg' },
  { id: 'fb-tp-3', name: 'Root Form Classic 5.0mm', category: 'Root Form', price: 2500, image_url: '/products/two-piece-implant.jpeg' },
  { id: 'fb-tp-kit', name: 'Standard Surgical Kit', category: 'Instruments', price: 18000, image_url: '/products/apexkonnect-kit.jpeg', isKit: true }
];

const FALLBACK_PLATES_SCREWS = [
  { id: 'fb-ps-1', name: 'L-Plate 4 Hole', category: 'Bone Plate', price: 1200, image_url: '/products/bone-plates.jpeg' },
  { id: 'fb-ps-2', name: 'Straight Plate 6 Hole', category: 'Bone Plate', price: 1500, image_url: '/products/bone-plates.jpeg' },
  { id: 'fb-ps-3', name: 'Fixation Screw 2.0mm', category: 'Fixation Screw', price: 350, image_url: '/products/bone-screws.jpeg' }
];

function HeroBannerSlider({ onLoginRequired }) { // eslint-disable-line no-unused-vars
  const [index, setIndex] = useState(0);
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const { products, fetchProducts } = useStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setActiveProductIndex(0);
  }, [index]);

  // Group products dynamically
  const activeProducts = (products || []).filter(p => p.active !== false);

  // Group 1: One Piece Implants
  const onePieceImplants = activeProducts.filter(p =>
    ['basal', 'basal ss', 'basal mu', 'compression', 'compression mu'].includes((p.category || '').toLowerCase())
  ).slice(0, 4);
  const basalKit = activeProducts.find(p =>
    (p.category || '').toLowerCase() === 'instruments' || 
    (p.category || '').toLowerCase() === 'general instruments' || 
    (p.name || '').toLowerCase().includes('kit')
  );
  const onePieceGroup = [...onePieceImplants];
  if (basalKit) onePieceGroup.push(basalKit);
  const slide1Products = onePieceGroup.length >= 2 ? onePieceGroup.slice(0, 5) : FALLBACK_ONE_PIECE;

  // Group 2: Two Piece Implants
  const twoPieceImplants = activeProducts.filter(p =>
    (p.category || '').toLowerCase() === 'root form'
  ).slice(0, 3);
  const standardKit = activeProducts.find(p =>
    p.id !== basalKit?.id &&
    ((p.category || '').toLowerCase() === 'instruments' || (p.name || '').toLowerCase().includes('kit'))
  ) || basalKit;
  const twoPieceGroup = [...twoPieceImplants];
  if (standardKit) twoPieceGroup.push(standardKit);
  const slide2Products = twoPieceGroup.length >= 2 ? twoPieceGroup.slice(0, 4) : FALLBACK_TWO_PIECE;

  // Group 3: Bone plate + Screw
  const platesScrews = activeProducts.filter(p =>
    ['bone plate', 'fixation screw', 'bone graft'].includes((p.category || '').toLowerCase()) ||
    (p.name || '').toLowerCase().includes('plate') ||
    (p.name || '').toLowerCase().includes('screw')
  ).slice(0, 3);
  const slide3Products = platesScrews.length >= 2 ? platesScrews.slice(0, 3) : FALLBACK_PLATES_SCREWS;

  const slides = [
    {
      id: 'one-piece',
      headline: 'One Piece Implants',
      subheadline: 'Monobloc implants designed for immediate loading and maximum convenience.',
      products: slide1Products,
      bg: 'linear-gradient(135deg, #090d16 0%, #172442 50%, #090d16 100%)',
    },
    {
      id: 'two-piece',
      headline: 'Two Piece Implants',
      subheadline: 'Classic root-form implants featuring high stability and standard surgical protocols.',
      products: slide2Products,
      bg: 'linear-gradient(135deg, #070d18 0%, #162f45 50%, #070d18 100%)',
    },
    {
      id: 'plates-screws',
      headline: 'Bone Plate + Screw',
      subheadline: 'Precision surgical bone plates and fixation screws for stable osteosynthesis.',
      products: slide3Products,
      bg: 'linear-gradient(135deg, #080f14 0%, #15293b 50%, #080f14 100%)',
    }
  ];

  const total = slides.length;

  useEffect(() => {
    if (total <= 1 || isHovered) return;
    const t = setInterval(() => {
      setIndex((i) => (i >= total - 1 ? 0 : i + 1));
    }, 6000);
    return () => clearInterval(t);
  }, [total, isHovered]);

  if (total === 0) return null;

  const currentSlide = slides[index];

  // Progress bar width cycles 0→100% over 6s per slide
  const SLIDE_DURATION = 6000;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        width: '100%',
        height: 'clamp(380px, 46vw, 500px)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 32px 72px -12px rgba(15,23,42,0.38), 0 0 0 1px rgba(255,255,255,0.07)',
        background: '#080e1a',
      }}
    >
      {/* ── Animated gradient background per slide ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: currentSlide.bg,
        transition: 'background 1s ease-in-out',
        zIndex: 0,
      }} />

      {/* ── Subtle dot-grid texture ── */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        zIndex: 1, pointerEvents: 'none',
      }} />

      {/* ── Glow orbs ── */}
      <div style={{ position: 'absolute', top: '-20%', right: '5%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.22) 0%, transparent 65%)', filter: 'blur(60px)', zIndex: 1, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-25%', left: '15%', width: 340, height: 340, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)', filter: 'blur(50px)', zIndex: 1, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '20%', left: '-5%', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 65%)', filter: 'blur(40px)', zIndex: 1, pointerEvents: 'none' }} />



      {/* ── MAIN CONTENT: split left/right ── */}
      <div
        key={index}
        style={{
          position: 'relative', zIndex: 2,
          height: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr 1.6fr',
          maxWidth: 1360,
          margin: '0 auto',
          padding: '0 clamp(24px, 4vw, 56px)',
          boxSizing: 'border-box',
          animation: 'carouselIn 0.6s cubic-bezier(0.16,1,0.3,1) both',
        }}
        className="carousel-main-grid"
      >
        {/* ── LEFT: Text + CTA ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 14, paddingRight: 'clamp(16px,3vw,40px)', paddingBottom: 32,
        }}>

          {/* Label pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, width: 'fit-content' }}>
            <span style={{
              fontSize: '0.62rem', fontWeight: 800,
              color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.12em',
              background: 'rgba(14,165,233,0.12)',
              border: '1px solid rgba(14,165,233,0.3)',
              padding: '4px 12px', borderRadius: 999,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <Sparkles size={10} strokeWidth={2.5} />
              {currentSlide.id === 'one-piece' ? 'One Piece System' : currentSlide.id === 'two-piece' ? 'Two Piece System' : 'Fixation System'}
            </span>
          </div>

          {/* Headline */}
          <h2 style={{
            fontFamily: 'Outfit', fontWeight: 900,
            fontSize: 'clamp(1.55rem, 3.2vw, 2.4rem)',
            lineHeight: 1.08, margin: 0,
            letterSpacing: '-0.025em',
            background: 'linear-gradient(140deg, #ffffff 30%, #bae6fd 75%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {currentSlide.headline}
          </h2>

          {/* Sub */}
          <p style={{
            fontSize: 'clamp(0.8rem, 1.6vw, 0.9rem)',
            color: 'rgba(226,232,240,0.72)',
            lineHeight: 1.55, margin: 0, fontWeight: 500,
            maxWidth: 360,
          }}>
            {currentSlide.subheadline}
          </p>

          {/* Trust badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {['Ti Grade 5', 'ISO Certified', 'Gamma Sterilized'].map(b => (
              <span key={b} style={{
                fontSize: '0.58rem', fontWeight: 800,
                color: 'rgba(186,230,253,0.85)',
                background: 'rgba(14,165,233,0.08)',
                border: '1px solid rgba(14,165,233,0.22)',
                padding: '3px 10px', borderRadius: 999,
                display: 'flex', alignItems: 'center', gap: 4,
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                <CheckCircle size={9} strokeWidth={2.5} style={{ flexShrink: 0 }} />{b}
              </span>
            ))}
          </div>

          {/* CTA */}
          <button
            onClick={() => navigate('/catalog')}
            style={{
              marginTop: 8,
              alignSelf: 'flex-start',
              padding: '11px 24px',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #4f46e5 100%)',
              color: '#fff',
              fontSize: '0.8rem', fontWeight: 800, fontFamily: 'Outfit',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 8px 24px -4px rgba(14,165,233,0.5)',
              letterSpacing: '0.01em',
              transition: 'all 0.25s ease',
            }}
            className="carousel-cta-btn"
          >
            <Store size={14} strokeWidth={2.5} /> Browse Catalog
          </button>
        </div>

        {/* ── RIGHT: Feature product + chip row ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 12, paddingBottom: 32, paddingTop: 24,
          minWidth: 0,
          width: '100%',
        }} className="carousel-right-column">
          {/* Feature card — dynamically previews selected product */}
          {(() => {
            const fp = currentSlide.products[activeProductIndex] || currentSlide.products[0];
            if (!fp) return null;
            const rawUrl = fp.image_url || fp.image;
            const baseUrl = import.meta.env.BASE_URL || '/';
            const imgUrl = rawUrl ? (rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : `${baseUrl}${rawUrl.replace(/^\//, '')}`) : '';
            return (
              <div
                key={`${index}-${activeProductIndex}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (fp.id && !String(fp.id).startsWith('fb-')) navigate(`/product/${fp.id}`);
                  else navigate(`/product/${fp.id}?name=${encodeURIComponent(fp.name)}`);
                }}
                className="carousel-feature-card"
                style={{
                  width: '100%', maxWidth: 600, display: 'flex', alignItems: 'center', gap: 20,
                  background: 'linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(99,102,241,0.09) 50%, rgba(255,255,255,0.04) 100%)',
                  border: '1px solid rgba(14,165,233,0.32)',
                  borderRadius: 12, padding: '18px 22px',
                  cursor: 'pointer', boxSizing: 'border-box',
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.32), 0 0 0 1px rgba(14,165,233,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
                  transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
                  position: 'relative', overflow: 'hidden',
                  animation: 'carouselIn 0.5s cubic-bezier(0.16,1,0.3,1) both',
                }}
              >
                {/* Glow sweep behind card */}
                <div style={{ position:'absolute', top:'-30%', left:'-10%', width:'60%', height:'160%', background:'radial-gradient(ellipse, rgba(14,165,233,0.14) 0%, transparent 70%)', pointerEvents:'none', zIndex:0 }} />

                {/* Featured badge */}
                <div style={{ position:'absolute', top:10, right:14, fontSize:'0.5rem', fontWeight:900, color:'#fff', background:'linear-gradient(135deg,#0ea5e9,#6366f1)', padding:'2px 9px', borderRadius:999, textTransform:'uppercase', letterSpacing:'0.1em', boxShadow:'0 2px 8px rgba(14,165,233,0.4)', zIndex:2 }}>
                  Featured
                </div>

                {/* Image with halo */}
                <div style={{ position:'relative', zIndex:1, flexShrink:0 }}>
                  <div style={{ position:'absolute', inset:-8, borderRadius:'50%', background:'radial-gradient(circle, rgba(14,165,233,0.35) 0%, transparent 70%)', filter:'blur(10px)', zIndex:0 }} className="halo-glow" />
                  <div style={{
                    width: 86, height: 86, borderRadius: 20, position:'relative', zIndex:1,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 10, boxSizing: 'border-box',
                    boxShadow: '0 10px 28px rgba(0,0,0,0.25), 0 0 0 2px rgba(14,165,233,0.4)',
                    border: '1px solid rgba(255,255,255,0.9)',
                  }}>
                    {imgUrl
                      ? <img src={imgUrl} alt={fp.name} style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain', transition:'transform 0.35s ease' }} className="feature-img" />
                      : <Package size={32} color="#0ea5e9" />}
                  </div>
                </div>

                {/* Text */}
                <div style={{ flex:1, minWidth:0, position:'relative', zIndex:1 }}>
                  <div style={{ fontSize:'0.58rem', fontWeight:900, color:'#38bdf8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:5, display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:'#38bdf8', display:'inline-block', boxShadow:'0 0 6px #38bdf8' }} />
                    {fp.category}
                  </div>
                  <div style={{ fontSize:'clamp(0.9rem,1.8vw,1.05rem)', fontWeight:900, color:'#fff', fontFamily:'Outfit', lineHeight:1.15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>
                    {fp.name}
                  </div>
                  <div style={{ fontSize:'0.64rem', color:'rgba(255,255,255,0.6)', fontWeight:500, marginTop:4, display:'flex', alignItems:'center', gap:6 }}>
                    <span>Click to view technical specifications</span>
                    <ChevronRight size={12} style={{ opacity: 0.7 }} />
                  </div>
                </div>

                <div style={{ flexShrink:0, width:32, height:32, borderRadius:'50%', background:'rgba(14,165,233,0.18)', border:'1px solid rgba(14,165,233,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1 }} className="feature-arrow">
                  <ChevronRight size={16} color="#38bdf8" strokeWidth={2.5} />
                </div>
              </div>
            );
          })()}

          {/* Chip row — all products in current slide */}
          <div style={{
            display: 'flex', gap: 10, width: '100%', maxWidth: 600,
            overflowX: 'auto', overflowY: 'visible', scrollbarWidth: 'none', flexWrap: 'nowrap',
            WebkitOverflowScrolling: 'touch',
            paddingTop: 10, marginTop: -10,
            paddingBottom: 6,
            paddingLeft: 6, paddingRight: 6,
          }} className="carousel-products-row">
            {currentSlide.products.map((p, idx) => {
              const rawUrl = p.image_url || p.image;
              const baseUrl = import.meta.env.BASE_URL || '/';
              const imgUrl = rawUrl ? (rawUrl.startsWith('http') || rawUrl.startsWith('data:') ? rawUrl : `${baseUrl}${rawUrl.replace(/^\//, '')}`) : '';
              const isKit = (p.category || '').toLowerCase().includes('instrument') || (p.name || '').toLowerCase().includes('kit');
              const chipAccent = isKit ? '#a78bfa' : '#38bdf8';
              const chipGlow = isKit ? 'rgba(167,139,250,0.25)' : 'rgba(14,165,233,0.22)';
              const isActive = idx === activeProductIndex;
              return (
                <div
                  key={p.id}
                  onMouseEnter={() => setActiveProductIndex(idx)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (p.id && !String(p.id).startsWith('fb-')) navigate(`/product/${p.id}`);
                    else navigate(`/product/${p.id}?name=${encodeURIComponent(p.name)}`);
                  }}
                  className={`carousel-chip ${isActive ? 'active' : ''}`}
                  style={{
                    flexShrink: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    background: isActive 
                      ? 'linear-gradient(160deg, rgba(14,165,233,0.18) 0%, rgba(99,102,241,0.12) 100%)' 
                      : 'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
                    border: isActive 
                      ? `1.5px solid ${chipAccent}` 
                      : `1px solid rgba(255,255,255,0.12)`,
                    borderRadius: 18, padding: '14px 12px 12px',
                    cursor: 'pointer', minWidth: 137, width: 137,
                    boxShadow: isActive 
                      ? `0 8px 24px rgba(0,0,0,0.28), 0 0 15px ${chipAccent}50` 
                      : `0 6px 18px rgba(0,0,0,0.22)`,
                    transition: 'all 0.32s cubic-bezier(0.16,1,0.3,1)',
                    backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
                    position: 'relative', overflow: 'hidden',
                    transform: isActive ? 'translateY(-5px) scale(1.03)' : 'translateY(0) scale(1)',
                  }}
                >
                  {/* Subtle top accent glow */}
                  <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:'70%', height:2, background:`linear-gradient(90deg, transparent, ${chipAccent}, transparent)`, borderRadius:1, zIndex:0 }} />

                  {/* Active bottom marker */}
                  {isActive && (
                    <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:20, height:3, background:chipAccent, borderRadius:'3px 3px 0 0', boxShadow:`0 -2px 8px ${chipAccent}` }} />
                  )}

                  {/* Image */}
                  <div style={{
                    width: 56, height: 56, borderRadius: 14, flexShrink: 0, position:'relative', zIndex:1,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(240,249,255,0.9) 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 7, boxSizing: 'border-box',
                    boxShadow: isActive 
                      ? `0 6px 16px rgba(0,0,0,0.2), 0 0 16px ${chipAccent}60` 
                      : `0 6px 16px rgba(0,0,0,0.2), 0 0 12px ${chipGlow}`,
                    border: isActive 
                      ? `1.5px solid ${chipAccent}` 
                      : `1.5px solid ${chipAccent}40`,
                  }}>
                    {imgUrl
                      ? <img src={imgUrl} alt={p.name} style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} />
                      : <Package size={22} color={chipAccent} />}
                  </div>

                  {/* Name */}
                  <div style={{ fontSize:'0.64rem', fontWeight:isActive ? 900 : 800, color: isActive ? '#fff' : 'rgba(241,245,249,0.92)', lineHeight:1.25, textAlign:'center', maxWidth:113, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', zIndex:1 }}>
                    {p.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Progress bar ── */}
      {!isHovered && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.07)', zIndex: 10 }}>
          <div
            key={`progress-${index}`}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #0ea5e9, #6366f1)',
              animation: `progressBar ${SLIDE_DURATION}ms linear both`,
              transformOrigin: 'left',
              boxShadow: '0 0 8px rgba(14,165,233,0.6)',
            }}
          />
        </div>
      )}

      {/* ── Slide navigation arrows ── */}
      {total > 1 && (
        <>
          <div onClick={() => setIndex((i) => (i === 0 ? total - 1 : i - 1))} className="banner-arrow-btn" style={{ left: 18 }}>
            <ChevronLeft size={20} />
          </div>
          <div onClick={() => setIndex((i) => (i === total - 1 ? 0 : i + 1))} className="banner-arrow-btn" style={{ right: 18 }}>
            <ChevronRight size={20} />
          </div>

          {/* Slide counter */}
          <div style={{
            position: 'absolute', bottom: 16, right: 24, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {slides.map((_, i) => (
              <span
                key={i}
                onClick={() => setIndex(i)}
                style={{
                  width: i === index ? 28 : 8, height: 8, borderRadius: 4,
                  background: i === index ? 'linear-gradient(135deg,#0ea5e9,#6366f1)' : 'rgba(255,255,255,0.28)',
                  cursor: 'pointer',
                  transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
                  display: 'inline-block',
                  boxShadow: i === index ? '0 0 10px rgba(14,165,233,0.55)' : 'none',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function LandingPage({ onLoginRequired, guestTheme = 'light' }) {
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });

  const sendContactEmail = () => {
    const subject = encodeURIComponent(`Inquiry from ${contactForm.name || 'Website Visitor'}`);
    const body = encodeURIComponent(`${contactForm.message}\n\n— ${contactForm.name} (${contactForm.email})`);
    window.location.href = `mailto:contact@simpleimplant.in?subject=${subject}&body=${body}`;
  };

  const isDark = guestTheme === 'dark';

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      background: isDark
        ? 'radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px) 0 0 / 28px 28px, linear-gradient(160deg, #030712 0%, #0b1528 50%, #030712 100%)'
        : 'linear-gradient(160deg, #f0f9ff 0%, #f8fafc 40%, #eef2ff 80%, #f0fdf4 100%)',
      color: isDark ? '#f8fafc' : '#0f172a',
      transition: 'all 0.4s ease'
    }}>

      {/* Animated blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-8%', left: '-6%', width: '55vw', height: '55vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.09), transparent 70%)', filter: 'blur(80px)', animation: 'blobF1 18s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '40%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.07), transparent 70%)', filter: 'blur(90px)', animation: 'blobF2 22s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '12%', width: '45vw', height: '45vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.06), transparent 70%)', filter: 'blur(100px)', animation: 'blobF3 26s ease-in-out infinite' }} />
      </div>

      <style>{`
        @keyframes blobF1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-40px) scale(1.05)} }
        @keyframes blobF2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-40px,30px) scale(1.08)} }
        @keyframes blobF3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,-20px) scale(1.04)} }
        @keyframes heroUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmerText { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .hero-btn-primary { transition: all 0.3s cubic-bezier(0.16,1,0.3,1) !important; }
        .hero-btn-primary:hover { transform: translateY(-3px) scale(1.03) !important; box-shadow: 0 20px 40px rgba(14,165,233,0.38) !important; }
        .hero-btn-secondary { transition: all 0.3s cubic-bezier(0.16,1,0.3,1) !important; }
        .hero-btn-secondary:hover { transform: translateY(-3px) !important; border-color: rgba(14,165,233,0.55) !important; background: rgba(255,255,255,1) !important; }
        .lp-stat-card { transition: all 0.3s cubic-bezier(0.16,1,0.3,1); }
        .lp-stat-card:hover { transform: translateY(-5px); box-shadow: 0 16px 40px rgba(15,23,42,0.10) !important; }
        .lp-support-card { transition: all 0.3s cubic-bezier(0.16,1,0.3,1); }
        .lp-support-card:hover { transform: translateY(-4px); }
        .contact-item { transition: all 0.3s cubic-bezier(0.16,1,0.3,1); cursor: pointer; }
        .contact-item:hover { transform: translateY(-3px); border-color: rgba(14,165,233,0.4) !important; box-shadow: 0 12px 24px rgba(14,165,233,0.08) !important; }
        .contact-input { transition: all 0.25s ease !important; }
        .contact-input:focus { border-color: #0ea5e9 !important; background: #ffffff !important; box-shadow: 0 0 0 3px rgba(14,165,233,0.15) !important; }
        @media (max-width: 768px) {
          .lp-about-grid { grid-template-columns: 1fr !important; gap: 28px !important; padding: 30px 24px !important; }
          .lp-contact-grid { grid-template-columns: 1fr !important; }
          .lp-contact-form-card { padding: 26px 22px !important; }
        }
        @media (max-width: 520px) {
          .lp-hero-section { padding: 36px 16px 36px !important; }
          .lp-section { padding-left: 16px !important; padding-right: 16px !important; }
          .lp-contact-form-row { grid-template-columns: 1fr !important; }
          .hero-btn-primary, .hero-btn-secondary { width: 100%; justify-content: center !important; }
        }
        @keyframes carouselIn {
          from { opacity:0; transform:translateX(18px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes progressBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
        .banner-arrow-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%) scale(1);
          width: 40px; height: 40px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(15,23,42,0.52);
          color: rgba(255,255,255,0.8);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          z-index: 10;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 4px 16px rgba(0,0,0,0.28);
          outline: none;
        }
        .banner-arrow-btn:hover {
          color: #fff;
          transform: translateY(-50%) scale(1.12);
          border-color: rgba(14,165,233,0.5);
          background: linear-gradient(135deg, #0ea5e9, #6366f1);
          box-shadow: 0 8px 24px rgba(14,165,233,0.45);
        }
        .banner-arrow-btn:active { transform: translateY(-50%) scale(0.94); }
        .carousel-products-row::-webkit-scrollbar { display: none; }
        .carousel-feature-card:hover {
          background: linear-gradient(135deg, rgba(14,165,233,0.16) 0%, rgba(99,102,241,0.12) 50%, rgba(255,255,255,0.07) 100%) !important;
          border-color: rgba(14,165,233,0.6) !important;
          box-shadow: 0 24px 56px rgba(0,0,0,0.45), 0 0 0 1.5px rgba(14,165,233,0.5), 0 0 40px rgba(14,165,233,0.2) !important;
          transform: translateY(-4px);
        }
        .carousel-feature-card:hover .feature-img { transform: scale(1.1) !important; }
        .carousel-feature-card:active { transform: translateY(-1px) scale(0.99); }
        .carousel-chip:hover {
          background: linear-gradient(160deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%) !important;
          border-color: rgba(56,189,248,0.55) !important;
          box-shadow: 0 12px 28px rgba(0,0,0,0.35), 0 0 20px rgba(14,165,233,0.3) !important;
          transform: translateY(-5px) scale(1.03);
        }
        .carousel-chip:active { transform: translateY(-1px) scale(0.97); }
        .carousel-cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px -4px rgba(14,165,233,0.7) !important;
          background: linear-gradient(135deg, #38bdf8 0%, #6366f1 100%) !important;
        }
        .carousel-cta-btn:active { transform: translateY(0) scale(0.97); }
        .carousel-right-column {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        @media(max-width: 768px) {
          .carousel-right-column {
            align-items: center !important;
          }
        }
        @media(max-width: 768px) {
          .carousel-main-grid {
            grid-template-columns: 1fr !important;
            padding: 0 20px !important;
            overflow-y: auto;
            gap: 0;
          }
          .carousel-main-grid > div:first-child { padding-bottom: 0 !important; padding-top: 24px; }
          .carousel-main-grid > div:last-child  { padding-top: 10px !important; padding-bottom: 28px; }
          .carousel-cta-btn { display: none !important; }
        }
        ${isDark ? `
          /* High contrast text overrides */
          .lp-hero-section h1 { color: #ffffff !important; text-shadow: 0 4px 20px rgba(0,0,0,0.8); }
          .lp-hero-section p { color: #e2e8f0 !important; font-weight: 600 !important; }
          .hero-btn-secondary { background: rgba(15, 23, 42, 0.88) !important; color: #ffffff !important; border-color: rgba(56, 189, 248, 0.4) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important; }
          
          .lp-stat-card { background: linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 41, 59, 0.9) 100%) !important; border: 1.5px solid rgba(56, 189, 248, 0.35) !important; color: #ffffff !important; box-shadow: 0 12px 36px rgba(0,0,0,0.5) !important; }
          .lp-stat-card div { color: #ffffff !important; }
          .lp-stat-card div:last-child { color: #38bdf8 !important; font-weight: 800 !important; }
          
          .lp-about-grid { background: linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 41, 59, 0.9) 100%) !important; border: 1.5px solid rgba(56, 189, 248, 0.35) !important; box-shadow: 0 20px 50px rgba(0,0,0,0.6) !important; }
          .lp-about-grid h2 { color: #ffffff !important; }
          .lp-about-grid p { color: #e2e8f0 !important; }
          .lp-about-grid h3 { color: #ffffff !important; }
          #about div[style*="linear-gradient"] { background: rgba(15, 23, 42, 0.75) !important; border-color: rgba(56, 189, 248, 0.3) !important; }
          #about div[style*="linear-gradient"] p { color: #cbd5e1 !important; }
          
          #events-courses h2 { color: #ffffff !important; }
          #events-courses > div > div > div { background: linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 41, 59, 0.9) 100%) !important; border: 1.5px solid rgba(56, 189, 248, 0.35) !important; box-shadow: 0 12px 36px rgba(0,0,0,0.5) !important; }
          #events-courses h3 { color: #ffffff !important; }
          #events-courses p { color: #e2e8f0 !important; }
          
          .lp-support-card { background: linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 41, 59, 0.9) 100%) !important; border: 1.5px solid rgba(56, 189, 248, 0.35) !important; box-shadow: 0 12px 36px rgba(0,0,0,0.5) !important; }
          .lp-support-card div { color: #ffffff !important; }
          .lp-support-card p { color: #e2e8f0 !important; }
          
          #contact h2 { color: #ffffff !important; }
          .contact-item { background: linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 41, 59, 0.9) 100%) !important; border: 1.5px solid rgba(56, 189, 248, 0.35) !important; box-shadow: 0 12px 36px rgba(0,0,0,0.5) !important; }
          .contact-item div { color: #ffffff !important; }
          .contact-item div div:first-child { color: #38bdf8 !important; }
          
          .lp-contact-form-card { background: linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 41, 59, 0.9) 100%) !important; border: 1.5px solid rgba(56, 189, 248, 0.35) !important; box-shadow: 0 20px 50px rgba(0,0,0,0.6) !important; }
          .contact-input { background: rgba(9, 13, 22, 0.95) !important; color: #ffffff !important; border-color: rgba(56, 189, 248, 0.4) !important; }
          .contact-input::placeholder { color: #94a3b8 !important; }
          
          .lp-services-section { background: rgba(8, 14, 28, 0.8) !important; border-color: rgba(56, 189, 248, 0.25) !important; }
        ` : ''}
      `}</style>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ═══════════ HERO BANNER CAROUSEL (TOPMOST) ═══════════ */}
        <section style={{ width: '100%', padding: '24px clamp(20px, 3vw, 48px) 16px', boxSizing: 'border-box' }}>
          <Reveal>
            <HeroBannerSlider onLoginRequired={onLoginRequired} />
          </Reveal>
        </section>

        {/* ═══════════ HERO ═══════════ */}
        <section className="lp-hero-section" style={{ padding: '48px 24px 48px', textAlign: 'center', maxWidth: 860, margin: '0 auto', animation: 'heroUp 0.8s cubic-bezier(0.16,1,0.3,1) both' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 18px', borderRadius: 999, background: 'linear-gradient(135deg, rgba(14,165,233,0.10), rgba(99,102,241,0.08))', border: '1px solid rgba(14,165,233,0.22)', color: '#0ea5e9', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', backdropFilter: 'blur(12px)', boxShadow: '0 4px 16px rgba(14,165,233,0.10)' }}>
              <Sparkles size={13} /> Next Generation Dental Implant System
            </span>
          </div>

          <h1 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: 'clamp(2.1rem, 5.5vw, 3.4rem)', lineHeight: 1.12, color: '#0f172a', margin: '0 0 20px', letterSpacing: '-0.02em' }}>
            Most Innovative,{' '}
            <span style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #10b981 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', backgroundSize: '200% auto', animation: 'shimmerText 4s linear infinite' }}>
              Versatile Implants
            </span>
            {' '}— All Under One System
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: 1.7, maxWidth: 660, margin: '0 auto 36px', fontWeight: 500 }}>
            Immediate loading, minimal procedures, real results. Simple, Effective, Efficient —
            join us in giving your patients their smile back.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 44 }}>
            <Link to="/catalog" className="hero-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 30px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', fontSize: '0.9rem', fontWeight: 800, textDecoration: 'none', boxShadow: '0 8px 24px rgba(14,165,233,0.30)' }}>
              <Store size={17} /> Browse Catalog
            </Link>
            <button onClick={onLoginRequired} className="hero-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '15px 30px', borderRadius: 14, border: '1.5px solid rgba(14,165,233,0.25)', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(16px)', color: '#0f172a', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
              <LogIn size={17} /> Register Your Clinic
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {TRUST_BADGES.map((b, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: 8, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(14,165,233,0.15)', fontSize: '0.68rem', fontWeight: 700, color: '#475569', backdropFilter: 'blur(8px)' }}>
                <CheckCircle size={11} color="#10b981" /> {b}
              </span>
            ))}
          </div>
        </section>

        {/* ═══════════ STATS ═══════════ */}
        <section style={{ maxWidth: 1060, margin: '0 auto', padding: '0 24px 60px' }}>
          <Reveal>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
              {STATS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="lp-stat-card" style={{ background: 'rgba(255,255,255,0.75)', borderRadius: 24, padding: '24px 20px', textAlign: 'center', border: `1.5px solid rgba(255, 255, 255, 0.4)`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 10px 30px -10px rgba(15,23,42,0.08)', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: `${s.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: `1px solid ${s.color}22` }}>
                      <Icon size={22} color={s.color} />
                    </div>
                    <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.8rem', color: '#0f172a', lineHeight: 1, letterSpacing: '-0.02em' }}>
                      <CounterNumber value={s.value} />
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 8 }}>{s.label}</div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </section>

        {/* ═══════════ ABOUT ═══════════ */}
        <section id="about" className="lp-section" style={{ maxWidth: 1060, margin: '0 auto', padding: '0 24px 80px' }}>
          <Reveal>
            <div className="lp-about-grid" style={{ background: 'rgba(255,255,255,0.72)', borderRadius: 32, padding: '44px 48px', border: '1.5px solid rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', boxShadow: '0 20px 50px -10px rgba(14,165,233,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0ea5e9', letterSpacing: '0.08em', textTransform: 'uppercase' }}>About Us</span>
                <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.9rem', color: '#0f172a', margin: '10px 0 16px', letterSpacing: '-0.02em' }}>
                  We Care for{' '}
                  <span style={{ background: 'linear-gradient(135deg, #0ea5e9, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Our Patients</span>
                </h2>
                <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.8, margin: 0 }}>
                  Immediate Loading, no bone grafting, minimal procedures. Simple, Efficient and Effective.
                  Join us in saying "Yes, we can" to your patients.
                </p>
                <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.7, marginTop: 14 }}>
                  Simple Implant supplies dental clinics with a complete range of implants, instruments, and surgical kits — sourced for quality, priced for practices of every size.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { icon: Target, color: '#0ea5e9', title: 'Our Mission', desc: 'Make high-quality dental implants simple to source, order, and track — for every clinic, regardless of size.' },
                  { icon: Eye, color: '#10b981', title: 'Our Vision', desc: 'Become the most trusted dental implant supply partner in the region, known for reliability and real support.' },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} style={{ background: `linear-gradient(135deg, ${item.color}08, rgba(255,255,255,0.5))`, borderRadius: 20, padding: 24, border: `1px solid rgba(255, 255, 255, 0.5)`, boxShadow: '0 8px 24px -8px rgba(15,23,42,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${item.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={18} color={item.color} />
                        </div>
                        <h3 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', margin: 0 }}>{item.title}</h3>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══════════ EVENTS & COURSES ═══════════ */}
        <section id="events-courses" style={{ maxWidth: 1060, margin: '0 auto', padding: '0 24px 80px' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0ea5e9', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Professional Growth</span>
              <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: 'clamp(1.6rem, 3vw, 2rem)', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Upcoming <span style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Events &amp; Courses</span>
              </h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              {[
                { icon: Calendar, color: '#0ea5e9', title: 'Conferences & Symposiums', items: [{ name: 'Symposium on Immediate Loading', desc: 'Learn chairside syncrystallisation (Genweld intra-oral welding) and multi-unit restorations for immediate prosthetics.' }, { name: 'Annual Implantology Meet', desc: 'Clinical discussions and case studies on cortical implants in challenging bone conditions.' }] },
                { icon: GraduationCap, color: '#6366f1', title: 'Clinical Training & Masterclasses', items: [{ name: 'Masterclass in Cortical Implantology', desc: 'Complete training on flapless insertion, single-piece implant loading, and prosthetics adjustment in days.' }, { name: 'Hands-on Surgical Workshop', desc: 'Practical practice on model mandibles using our general instruments, drills, and drivers.' }] }
              ].map((card, ci) => {
                const Icon = card.icon;
                return (
                  <div key={ci} style={{ background: 'rgba(255,255,255,0.82)', borderRadius: 22, padding: 30, border: `1px solid ${card.color}20`, backdropFilter: 'blur(16px)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: `${card.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={20} color={card.color} />
                      </div>
                      <h3 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem', color: '#0f172a', margin: 0 }}>{card.title}</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                      {card.items.map((item, ii) => (
                        <div key={ii}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: card.color, marginBottom: 5 }}>{item.name}</div>
                          <p style={{ fontSize: '0.77rem', color: '#64748b', margin: 0, lineHeight: 1.55 }}>{item.desc}</p>
                          {ii < card.items.length - 1 && <div style={{ height: 1, background: `${card.color}18`, marginTop: 16 }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </section>

        {/* ═══════════ SUPPORT & SERVICES ═══════════ */}
        <section className="lp-services-section" style={{ padding: '64px 24px 80px', background: isDark ? 'rgba(10, 15, 30, 0.6)' : 'rgba(255,255,255,0.48)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(14,165,233,0.15)', borderBottom: '1px solid rgba(14,165,233,0.15)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Reveal>
              <div style={{ textAlign: 'center', marginBottom: 44 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0ea5e9', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Services & Resources</span>
                <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: 'clamp(1.6rem, 3vw, 2rem)', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                  Support and <span style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Sales</span>
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
                {[
                  { title: 'ONLINE SHOP', icon: ShoppingCart, desc: 'Browse and purchase the full range of implants, instruments, and kits 24/7.', color: '#0ea5e9' },
                  { title: 'CLINICAL SUPPORT', icon: Headphones, desc: 'Technical guidance, case planning, and surgical consultation for implant placements.', color: '#6366f1' },
                  { title: 'TRAINING PROGRAM', icon: BookOpen, desc: 'Clinical textbooks, instruction guides, video masterclasses, and hands-on workshops.', color: '#10b981' },
                  { title: 'RESOURCE NETWORK', icon: Globe, desc: 'Professional resources, clinical studies, scientific articles, and research networks.', color: '#f59e0b' },
                  { title: 'LIFETIME GUARANTEE', icon: ShieldCheck, desc: '100% Grade 5 Titanium implants backed by a lifetime replacement warranty.', color: '#ef4444' },
                  { title: 'PATIENTS LITERATURE', icon: FileText, desc: 'Informative brochures, patient educational guides, and clinical manuals.', color: '#a855f7' }
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="lp-support-card" style={{ animationDelay: `${i * 0.08}s`, background: 'rgba(255,255,255,0.75)', borderRadius: 24, padding: 26, border: `1.5px solid rgba(255, 255, 255, 0.4)`, display: 'flex', flexDirection: 'column', gap: 13, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 10px 30px -10px rgba(15,23,42,0.06)' }}>
                      <div style={{ width: 46, height: 46, borderRadius: 14, background: `${item.color}12`, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${item.color}22` }}><Icon size={20} /></div>
                      <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '0.84rem', color: '#0f172a', letterSpacing: '0.02em' }}>{item.title}</div>
                      <p style={{ fontSize: '0.76rem', color: '#64748b', lineHeight: 1.55, margin: 0 }}>{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══════════ CONTACT ═══════════ */}
        <section id="contact" style={{ maxWidth: 1060, margin: '0 auto', padding: '64px 24px 80px' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0ea5e9', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Get in Touch</span>
              <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: 'clamp(1.6rem, 3vw, 2rem)', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                Let's <span style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Work Together</span>
              </h2>
            </div>
            <div className="lp-contact-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1.1fr) 2fr', gap: 28, alignItems: 'stretch' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                {[
                  { icon: Phone, label: 'Phone', value: '+91 94441 26926', color: '#0ea5e9', link: 'tel:+919444126926' },
                  { icon: Mail, label: 'Email', value: 'simpleimplants@gmail.com', color: '#6366f1', link: 'mailto:contact@simpleimplant.in' },
                  { icon: MapPin, label: 'Location', value: 'Perumbakkam, Chennai', color: '#10b981', link: 'https://maps.google.com/?q=Hitech+City+Hyderabad' }
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={i}
                      className="contact-item"
                      onClick={() => window.open(item.link, '_blank')}
                      style={{
                        animationDelay: `${i * 0.12}s`,
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        background: 'rgba(255, 255, 255, 0.88)',
                        borderRadius: 22,
                        padding: '18px 22px',
                        border: '1.5px solid rgba(14, 165, 233, 0.18)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 10px 30px -10px rgba(14, 165, 233, 0.08)',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        background: `linear-gradient(135deg, ${item.color}18, ${item.color}08)`,
                        color: item.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: `1.5px solid ${item.color}25`
                      }}><Icon size={20} /></div>
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginTop: 3 }}>{item.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="lp-contact-form-card" style={{
                background: 'rgba(255, 255, 255, 0.88)',
                borderRadius: 24,
                padding: '36px 40px',
                border: '1.5px solid rgba(14, 165, 233, 0.18)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 15px 45px -10px rgba(14, 165, 233, 0.1), 0 2px 10px rgba(15,23,42,0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
                height: '100%'
              }}>
                <div>
                  <div className="lp-contact-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    {[['Full Name', 'text', 'name'], ['Email Address', 'email', 'email']].map(([ph, type, field]) => (
                      <input
                        key={field}
                        placeholder={ph}
                        type={type}
                        value={contactForm[field]}
                        onChange={e => setContactForm(f => ({ ...f, [field]: e.target.value }))}
                        className="contact-input"
                        style={{
                          padding: '14px 18px',
                          borderRadius: 14,
                          border: '1.5px solid rgba(14, 165, 233, 0.2)',
                          background: 'rgba(248, 250, 252, 0.8)',
                          fontSize: '0.88rem',
                          outline: 'none',
                          color: '#0f172a',
                          fontFamily: 'Outfit',
                          boxSizing: 'border-box',
                          width: '100%'
                        }}
                      />
                    ))}
                  </div>
                  <textarea
                    placeholder="Tell us about your clinic's surgical requirements..."
                    rows={4}
                    value={contactForm.message}
                    onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                    className="contact-input"
                    style={{
                      width: '100%',
                      padding: '14px 18px',
                      borderRadius: 14,
                      border: '1.5px solid rgba(14, 165, 233, 0.2)',
                      background: 'rgba(248, 250, 252, 0.8)',
                      fontSize: '0.88rem',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                      marginBottom: 16,
                      fontFamily: 'Outfit',
                      color: '#0f172a'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 12 }}>
                  <button
                    onClick={sendContactEmail}
                    disabled={!contactForm.message}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '14px 30px',
                      borderRadius: 14,
                      border: 'none',
                      background: contactForm.message ? 'linear-gradient(135deg, #0ea5e9, #6366f1)' : 'rgba(148, 163, 184, 0.2)',
                      color: contactForm.message ? '#fff' : '#94a3b8',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      cursor: contactForm.message ? 'pointer' : 'not-allowed',
                      boxShadow: contactForm.message ? '0 10px 28px rgba(14, 165, 233, 0.3)' : 'none',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                      fontFamily: 'Outfit'
                    }}
                    onMouseEnter={e => { if (contactForm.message) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                  >
                    <Send size={15} /> Send via Email
                  </button>
                  <p style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: 8, fontWeight: 500, textAlign: 'right' }}>
                    This will pre-fill your message and open your native email application.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <Footer />
      </div>
    </div>
  );
}
