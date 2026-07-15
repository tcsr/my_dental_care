import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store, LogIn, ShieldCheck, Users, Package, Award,
  ChevronLeft, ChevronRight, Target, Eye,
  Phone, Mail, MapPin, Send, ArrowRight, ShoppingCart,
  Headphones, BookOpen, Globe, FileText, Calendar, GraduationCap,
  CheckCircle, Sparkles
} from 'lucide-react';
import Footer from './Footer';
import { db } from '../utils/db';

const FALLBACK_PRODUCTS = [
  { name: 'Two Piece Dental Implant', category: 'Implant', price: 3500, image: '/products/two-piece-implant.jpeg', desc: 'Titanium Gr5 (Ti6Al4V) with SLA surface finish. Sterilized with Gamma rays.' },
  { name: 'Abutment', category: 'Abutment', price: 1800, image: '/products/abutment.jpeg', desc: 'Titanium Gr5 polished finish. Straight, Angled 15°, or Angled 25° for prosthetic restorative connections.' },
  { name: 'Two Piece Implant Kit (ApexKonnect)', category: 'Surgical Tool', price: 8500, image: '/products/apexkonnect-kit.jpeg', desc: 'Serialized surgical kit with precise drills, guide keys, and drivers for the ApexKonnect implant line.' },
  { name: 'Dental Implant Kit (Torque Ratchet Set)', category: 'Surgical Tool', price: 6000, image: '/products/dental-implant-kit.jpeg', desc: 'Complete torque ratchet kit containing essential drivers, keys, and wrenches in a sterilizable compact tray.' },
  { name: 'Torque Wrench (with driver heads)', category: 'Surgical Tool', price: 4500, image: '/products/torque-wrench.jpeg', desc: 'Premium adjustable torque wrench with a full set of driver heads for secure abutment tightening.' },
  { name: 'Implant Driver', category: 'Surgical Tool', price: 1500, image: '/products/implant-driver.jpeg', desc: 'High-quality implant driver tool for manual or contra-angled handpiece insertion.' },
  { name: 'Tapping Drill', category: 'Surgical Tool', price: 1200, image: '/products/tapping-drill.jpeg', desc: 'Precisely manufactured tapping drill for dense cortical bone site preparation.' },
  { name: 'Lance Drill', category: 'Surgical Tool', price: 900, image: '/products/lance-drill.jpeg', desc: 'Initial point drill for precise marking and initial osteotomy site creation.' }
];

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

function Carousel() {
  const [index, setIndex] = useState(0);
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(400);
  const navigate = useNavigate();

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setContainerW(containerRef.current.offsetWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const prodList = await db.b2bProducts.toArray();
        if (prodList && prodList.length > 0) {
          const mapped = prodList.map((p, idx) => {
            const fb = FALLBACK_PRODUCTS[idx] || FALLBACK_PRODUCTS[0];
            return { ...p, desc: p.desc || fb.desc };
          });
          setProducts(mapped);
        }
      } catch (e) { console.error(e); }
    }
    fetchProducts();
  }, []);

  const perView = containerW < 500 ? 1 : containerW < 820 ? 2 : 3;
  const gap = 20;
  const maxIndex = Math.max(0, products.length - perView);

  useEffect(() => { setIndex(i => Math.min(i, maxIndex)); }, [maxIndex]);

  useEffect(() => {
    const t = setInterval(() => setIndex(i => (i >= maxIndex ? 0 : i + 1)), 4500);
    return () => clearInterval(t);
  }, [maxIndex]);

  const sidePad = 10;
  const cardW = (containerW - sidePad * 2 - gap * (perView - 1)) / perView;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', overflow: 'hidden', padding: '36px 0 40px', margin: '-36px 0 -40px' }}>
      <div style={{
        display: 'flex',
        gap,
        transform: `translateX(-${index * (cardW + gap)}px)`,
        transition: 'transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)',
        width: 'max-content',
        padding: '0 10px'
      }}>
        {products.map((prod, i) => {
          const isHov = hoveredIdx === i;
          const imgSrc = `${import.meta.env.BASE_URL || '/'}${prod.image?.startsWith('/') ? prod.image.slice(1) : prod.image}`;
          return (
            <div
              key={i}
              onClick={() => navigate(`/catalog?product=${encodeURIComponent(prod.name)}`)}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                width: cardW,
                flexShrink: 0,
                background: isHov
                  ? 'rgba(255, 255, 255, 0.95)'
                  : 'rgba(255, 255, 255, 0.70)',
                borderRadius: 24,
                padding: 20,
                border: isHov ? '1.5px solid rgba(14, 165, 233, 0.4)' : '1.5px solid rgba(255, 255, 255, 0.4)',
                boxShadow: isHov
                  ? '0 30px 60px -15px rgba(14, 165, 233, 0.22), 0 12px 30px -10px rgba(99, 102, 241, 0.15)'
                  : '0 10px 30px -10px rgba(15, 23, 42, 0.08)',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 14,
                minHeight: 320, boxSizing: 'border-box',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: isHov ? 'translateY(-8px) scale(1.02)' : 'none',
              }}
            >
              {/* Image area */}
              <div style={{
                height: 150, borderRadius: 16,
                background: isHov
                  ? 'linear-gradient(160deg, rgba(14,165,233,0.06), rgba(99,102,241,0.04))'
                  : 'linear-gradient(160deg, rgba(241,245,249,0.9), rgba(248,250,252,0.5))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', padding: 10,
                border: isHov ? '1px solid rgba(14,165,233,0.14)' : '1px solid rgba(0,0,0,0.04)',
                transition: 'all 0.35s ease',
              }}>
                <img
                  src={imgSrc}
                  alt={prod.name}
                  style={{
                    maxHeight: '100%', maxWidth: '100%', objectFit: 'contain',
                    transform: isHov ? 'scale(1.10)' : 'scale(1)',
                    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.10))',
                  }}
                />
              </div>
              {/* Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <span style={{
                  fontSize: '0.58rem', fontWeight: 850,
                  color: isHov ? '#0284c7' : '#64748b',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  background: isHov ? 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(99,102,241,0.15))' : 'rgba(100,116,139,0.06)',
                  padding: '4px 12px', borderRadius: 20, width: 'fit-content',
                  transition: 'all 0.3s ease',
                  border: isHov ? '1px solid rgba(14,165,233,0.2)' : '1px solid rgba(0,0,0,0.02)'
                }}>
                  {prod.category}
                </span>
                <h4 style={{
                  fontFamily: 'Outfit', fontWeight: 800, fontSize: '0.92rem',
                  color: isHov ? '#0f172a' : '#1e293b',
                  margin: 0, lineHeight: 1.35,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{prod.name}</h4>
                <p style={{
                  fontSize: '0.72rem', color: '#64748b', lineHeight: 1.45, margin: 0, flex: 1,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{prod.desc}</p>
              </div>
              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 4 }}>
                <span style={{
                  fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.1rem',
                  color: isHov ? '#0ea5e9' : '#0f172a',
                  transition: 'color 0.3s ease',
                }}>
                  ₹{prod.price.toLocaleString('en-IN')}
                </span>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 800, color: 'white',
                  background: isHov
                    ? 'linear-gradient(135deg, #0ea5e9, #4f46e5)'
                    : 'linear-gradient(135deg, #64748b, #475569)',
                  padding: '8px 16px', borderRadius: 20,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isHov ? '0 8px 20px -6px rgba(14,165,233,0.5)' : 'none',
                }}>
                  View Details <ArrowRight size={12} style={{ transform: isHov ? 'translateX(3px)' : 'none', transition: 'transform 0.3s' }} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 }}>
        <button
          className="carousel-control-btn"
          onClick={() => setIndex(i => Math.max(0, i - 1))}
        ><ChevronLeft size={16} /></button>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <span
              key={i}
              onClick={() => setIndex(i)}
              style={{
                width: i === index ? 24 : 7,
                height: 7,
                borderRadius: 4,
                background: i === index ? 'linear-gradient(135deg,#0ea5e9,#6366f1)' : 'rgba(14,165,233,0.2)',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'inline-block'
              }}
            />
          ))}
        </div>
        <button
          className="carousel-control-btn"
          onClick={() => setIndex(i => Math.min(maxIndex, i + 1))}
        ><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

export default function LandingPage({ onLoginRequired }) {
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });

  const sendContactEmail = () => {
    const subject = encodeURIComponent(`Inquiry from ${contactForm.name || 'Website Visitor'}`);
    const body = encodeURIComponent(`${contactForm.message}\n\n— ${contactForm.name} (${contactForm.email})`);
    window.location.href = `mailto:contact@simpleimplant.in?subject=${subject}&body=${body}`;
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', background: 'linear-gradient(160deg, #f0f9ff 0%, #f8fafc 40%, #eef2ff 80%, #f0fdf4 100%)' }}>

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
      `}</style>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ═══════════ PRODUCT CAROUSEL (TOPMOST) ═══════════ */}
        <section className="lp-section" style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 32px' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0ea5e9', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Our Range</span>
              <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: 'clamp(1.5rem, 2.5vw, 1.9rem)', color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                Comprehensive Product <span style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Categories</span>
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500, maxWidth: 480, margin: '0 auto' }}>
                Precision-engineered solutions for every clinical need. Click any product to view full details & sizes.
              </p>
            </div>
            <Carousel />
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
                    <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.8rem', color: '#0f172a', lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</div>
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
        <section style={{ padding: '64px 24px 80px', background: 'rgba(255,255,255,0.48)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(14,165,233,0.10)', borderBottom: '1px solid rgba(14,165,233,0.10)' }}>
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
                    <div key={i} className="lp-support-card" style={{ background: 'rgba(255,255,255,0.75)', borderRadius: 24, padding: 26, border: `1.5px solid rgba(255, 255, 255, 0.4)`, display: 'flex', flexDirection: 'column', gap: 13, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 10px 30px -10px rgba(15,23,42,0.06)', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
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
            <div className="lp-contact-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1.1fr) 2fr', gap: 28 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        background: 'rgba(255,255,255,0.85)',
                        borderRadius: 20,
                        padding: '20px 22px',
                        border: '1px solid rgba(14,165,233,0.12)',
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 4px 20px rgba(15,23,42,0.04)',
                      }}
                    >
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 13,
                        background: `linear-gradient(135deg, ${item.color}15, ${item.color}08)`,
                        color: item.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: `1px solid ${item.color}18`
                      }}><Icon size={18} /></div>
                      <div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#1e293b', marginTop: 3 }}>{item.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="lp-contact-form-card" style={{
                background: 'rgba(255,255,255,0.85)',
                borderRadius: 24,
                padding: '36px 40px',
                border: '1px solid rgba(14,165,233,0.16)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 10px 40px rgba(14,165,233,0.06), 0 2px 10px rgba(15,23,42,0.03)'
              }}>
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
                        padding: '13px 18px',
                        borderRadius: 12,
                        border: '1.5px solid rgba(14,165,233,0.18)',
                        background: 'rgba(248,250,252,0.6)',
                        fontSize: '0.86rem',
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
                    padding: '13px 18px',
                    borderRadius: 12,
                    border: '1.5px solid rgba(14,165,233,0.18)',
                    background: 'rgba(248,250,252,0.6)',
                    fontSize: '0.86rem',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    marginBottom: 16,
                    fontFamily: 'Outfit',
                    color: '#0f172a'
                  }}
                />
                <button
                  onClick={sendContactEmail}
                  disabled={!contactForm.message}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '14px 28px',
                    borderRadius: 12,
                    border: 'none',
                    background: contactForm.message ? 'linear-gradient(135deg, #0ea5e9, #6366f1)' : 'rgba(100,116,139,0.15)',
                    color: contactForm.message ? '#fff' : '#94a3b8',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    cursor: contactForm.message ? 'pointer' : 'not-allowed',
                    boxShadow: contactForm.message ? '0 8px 24px rgba(14,165,233,0.25)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    fontFamily: 'Outfit'
                  }}
                  onMouseEnter={e => { if (contactForm.message) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                >
                  <Send size={15} /> Send via Email
                </button>
                <p style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: 12, fontWeight: 500 }}>
                  This will pre-fill your message and open your native email application.
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        <Footer />
      </div>
    </div>
  );
}
