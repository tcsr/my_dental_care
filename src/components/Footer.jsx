import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Globe, ArrowUpRight, Shield, Zap, Award } from 'lucide-react';

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const YoutubeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const BRAND = {
  name: 'Simple Implants',
  tagline: 'Precision. Simplicity. Excellence.',
  phone: '+91 94441 26926',
  phoneHref: 'tel:+919444126926',
  email: 'simpleimplants@gmail.com',
  emailHref: 'mailto:contact@simpleimplant.in',
  address: 'Perumbakkam, Chennai, India',
  whatsapp: 'https://wa.me/919444126926',
};

const QUICK_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Products', to: '/catalog' },
  { label: 'Video Guides', to: '/guides' },
  { label: 'About Us', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

const POLICY_LINKS = [
  { label: 'Terms & Conditions', to: '/terms' },
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Refund & Return', to: '/refund-policy' },
  { label: 'Shipping Policy', to: '/shipping-policy' },
];

const SOCIAL = [
  { icon: Globe, label: 'Website', href: '#', color: '#0ea5e9' },
  { icon: YoutubeIcon, label: 'YouTube', href: '#', color: '#ff0000' },
  { icon: InstagramIcon, label: 'Instagram', href: '#', color: '#e1306c' },
  { icon: WhatsAppIcon, label: 'WhatsApp', href: 'https://wa.me/919444126926', color: '#25d366' },
];

const BADGES = [
  { icon: Shield, text: 'ISO Certified' },
  { icon: Zap, text: 'Fast Delivery' },
  { icon: Award, text: 'Premium Quality' },
];

function FooterLink({ to, href, children }) {
  const style = {
    color: 'rgba(203, 213, 225, 0.7)',
    fontSize: '0.82rem',
    textDecoration: 'none',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    fontFamily: 'Outfit',
    fontWeight: 500,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  };
  const enter = e => {
    e.currentTarget.style.color = '#38bdf8';
    e.currentTarget.style.transform = 'translateX(4px)';
    const icon = e.currentTarget.querySelector('svg');
    if (icon) { icon.style.opacity = '1'; icon.style.color = '#38bdf8'; }
  };
  const leave = e => {
    e.currentTarget.style.color = 'rgba(203, 213, 225, 0.7)';
    e.currentTarget.style.transform = 'none';
    const icon = e.currentTarget.querySelector('svg');
    if (icon) { icon.style.opacity = '0.4'; icon.style.color = 'currentColor'; }
  };
  if (to) return <Link to={to} style={style} onMouseEnter={enter} onMouseLeave={leave}><ArrowUpRight size={11} style={{ opacity: 0.4, transition: 'all 0.2s ease' }} />{children}</Link>;
  return <a href={href} style={style} onMouseEnter={enter} onMouseLeave={leave}><ArrowUpRight size={11} style={{ opacity: 0.4, transition: 'all 0.2s ease' }} />{children}</a>;
}

function SocialBtn({ icon: Icon, label, href, color, size = 34 }) {
  const r = size <= 30 ? 8 : 10;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title={label}
      style={{ width: size, height: size, borderRadius: r, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.55)', transition: 'all 0.22s ease', textDecoration: 'none', flexShrink: 0 }}
      onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px) scale(1.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none'; }}
    >
      <Icon size={size <= 30 ? 12 : 14} strokeWidth={2} />
    </a>
  );
}

export default function Footer() {
  return (
    <footer style={{
      background: 'linear-gradient(175deg, #07224f 0%, #0a3d99 50%, #031435 100%)',
      color: '#fff',
      marginTop: 0,
      borderTop: '1.5px solid transparent',
      borderImage: 'linear-gradient(90deg, transparent 0%, rgba(14, 165, 233, 0.4) 20%, #0ea5e9 50%, rgba(14, 165, 233, 0.4) 80%, transparent 100%) 1',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        /* ── Mobile Footer ≤600px ── */
        @media (max-width: 600px) {
          .ft-top { padding: 20px 14px 0 !important; }

          /* Trust badges: horizontal scroll strip */
          .ft-badges {
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            gap: 8px !important;
            padding: 10px 14px !important;
            margin-bottom: 16px !important;
            background: none !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            scrollbar-width: none;
          }
          .ft-badges::-webkit-scrollbar { display: none; }
          .ft-badge { padding: 5px 10px !important; font-size: 0.64rem !important; flex-shrink: 0; }

          /* Main grid: 2 cols */
          .ft-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 16px 12px !important;
            padding-bottom: 16px !important;
          }

          /* Brand: spans full row, horizontal layout */
          .ft-brand-col {
            grid-column: 1 / -1 !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 10px !important;
            padding-bottom: 4px !important;
            border-bottom: 1px solid rgba(255,255,255,0.06) !important;
          }
          .ft-brand-text { flex: 1; }
          .ft-brand-desc { display: none !important; }
          .ft-brand-tagline-pill { display: none !important; }
          .ft-social-desktop { display: none !important; }
          .ft-social-mobile { display: flex !important; }

          /* Links columns: smaller text */
          .ft-links-col h4, .ft-policy-col h4 {
            font-size: 0.62rem !important;
            margin-bottom: 8px !important;
          }
          .ft-links-col a, .ft-policy-col a { font-size: 0.73rem !important; }
          .ft-links-list, .ft-policy-list { gap: 7px !important; }

          /* Contact: spans full row, horizontal pill layout */
          .ft-contact-col {
            grid-column: 1 / -1 !important;
            border-top: 1px solid rgba(255,255,255,0.06) !important;
            padding-top: 12px !important;
          }
          .ft-contact-col h4 { font-size: 0.62rem !important; margin-bottom: 8px !important; }
          .ft-contact-list {
            flex-direction: row !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .ft-contact-item {
            flex: 1 1 140px !important;
            background: rgba(255,255,255,0.04) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
            border-radius: 10px !important;
            padding: 8px 10px !important;
          }
          .ft-contact-label { display: none !important; }
          .ft-contact-value { font-size: 0.71rem !important; }

          /* Bottom bar */
          .ft-bottom-inner {
            padding: 10px 14px !important;
            flex-direction: row !important;
            gap: 4px !important;
          }
          .ft-bottom-inner span { font-size: 0.63rem !important; }
        }
      `}</style>

      {/* Ambient glow blobs */}
      <div style={{ position: 'absolute', top: '-80px', left: '-40px', width: 300, height: 300, background: 'radial-gradient(ellipse, rgba(14,165,233,0.16) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 0, right: '-60px', width: 260, height: 260, background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '24px 24px', opacity: 0.8, zIndex: 0, pointerEvents: 'none' }} />

      {/* Top content */}
      <div className="ft-top" style={{ maxWidth: 1360, margin: '0 auto', padding: '52px 28px 0', position: 'relative', zIndex: 1 }}>

        {/* Trust badges */}
        <div className="ft-badges" style={{
          display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
          background: 'rgba(255,255,255,0.02)', border: '1.5px solid rgba(255,255,255,0.05)',
          borderRadius: 20, padding: '16px 24px', marginBottom: 44,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)', backdropFilter: 'blur(8px)',
        }}>
          {BADGES.map(({ icon: Icon, text }) => (
            <div key={text} className="ft-badge" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.18)',
              borderRadius: 100, padding: '8px 16px', fontSize: '0.72rem', color: '#38bdf8',
              fontFamily: 'Outfit', fontWeight: 800, letterSpacing: '0.04em',
              textTransform: 'uppercase', whiteSpace: 'nowrap',
            }}>
              <Icon size={12} color="#38bdf8" /> {text}
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="ft-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '36px 28px', paddingBottom: 44,
        }}>

          {/* Brand col */}
          <div className="ft-brand-col" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, rgba(14,165,233,0.3), rgba(99,102,241,0.25))', border: '1px solid rgba(14,165,233,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(14,165,233,0.18)" />
                </svg>
              </div>
              <div className="ft-brand-text">
                <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.05rem', color: '#fff', lineHeight: 1.1 }}>Simple Implants</div>
                <div style={{ fontSize: '0.6rem', color: '#38bdf8', fontFamily: 'Outfit', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 1 }}>Dental Solutions</div>
              </div>
              {/* Mobile social — inline with brand */}
              <div className="ft-social-mobile" style={{ display: 'none', gap: 5 }}>
                {SOCIAL.map(s => <SocialBtn key={s.label} {...s} size={28} />)}
              </div>
            </div>

            <p className="ft-brand-desc" style={{ fontSize: '0.78rem', color: 'rgba(148,180,210,0.65)', lineHeight: 1.65, margin: 0, maxWidth: 240 }}>
              Next-generation dental implants and surgical instruments — simple, effective, and built for clinical precision.
            </p>

            <div className="ft-brand-tagline-pill" style={{ display: 'inline-flex', alignItems: 'center', background: 'linear-gradient(90deg, rgba(14,165,233,0.12), rgba(99,102,241,0.1))', border: '1px solid rgba(14,165,233,0.18)', borderRadius: 100, padding: '4px 12px', width: 'fit-content' }}>
              <span style={{ fontSize: '0.65rem', color: '#7dd3fc', fontFamily: 'Outfit', fontWeight: 700, letterSpacing: '0.07em' }}>{BRAND.tagline}</span>
            </div>

            {/* Desktop social */}
            <div className="ft-social-desktop" style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {SOCIAL.map(s => <SocialBtn key={s.label} {...s} size={34} />)}
            </div>
          </div>

          {/* Quick Links */}
          <div className="ft-links-col">
            <h4 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '0.72rem', color: '#94a3b8', margin: '0 0 18px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quick Links</h4>
            <div className="ft-links-list" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {QUICK_LINKS.map(l => <FooterLink key={l.label} to={l.to} href={l.href}>{l.label}</FooterLink>)}
            </div>
          </div>

          {/* Legal */}
          <div className="ft-policy-col">
            <h4 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '0.72rem', color: '#94a3b8', margin: '0 0 18px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Legal</h4>
            <div className="ft-policy-list" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {POLICY_LINKS.map(l => <FooterLink key={l.label} to={l.to}>{l.label}</FooterLink>)}
            </div>
          </div>

          {/* Contact */}
          <div className="ft-contact-col">
            <h4 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '0.72rem', color: '#94a3b8', margin: '0 0 18px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Get in Touch</h4>
            <div className="ft-contact-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              <a href={BRAND.phoneHref} className="ft-contact-item"
                style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={13} color="#38bdf8" strokeWidth={2.2} />
                </div>
                <div>
                  <div className="ft-contact-label" style={{ fontSize: '0.68rem', color: '#475569', fontFamily: 'Outfit', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 1 }}>Phone</div>
                  <div className="ft-contact-value" style={{ fontSize: '0.8rem', color: 'rgba(203,213,225,0.85)', fontFamily: 'Outfit', fontWeight: 600 }}>{BRAND.phone}</div>
                </div>
              </a>

              <a href={BRAND.emailHref} className="ft-contact-item"
                style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={13} color="#818cf8" strokeWidth={2.2} />
                </div>
                <div>
                  <div className="ft-contact-label" style={{ fontSize: '0.68rem', color: '#475569', fontFamily: 'Outfit', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 1 }}>Email</div>
                  <div className="ft-contact-value" style={{ fontSize: '0.78rem', color: 'rgba(203,213,225,0.85)', fontFamily: 'Outfit', fontWeight: 600, wordBreak: 'break-all' }}>{BRAND.email}</div>
                </div>
              </a>

              <div className="ft-contact-item"
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                  <MapPin size={13} color="#34d399" strokeWidth={2.2} />
                </div>
                <div>
                  <div className="ft-contact-label" style={{ fontSize: '0.68rem', color: '#475569', fontFamily: 'Outfit', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 1 }}>Location</div>
                  <div className="ft-contact-value" style={{ fontSize: '0.79rem', color: 'rgba(203,213,225,0.75)', fontFamily: 'Outfit', fontWeight: 500, lineHeight: 1.4 }}>{BRAND.address}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 1 }}>
        <div className="ft-bottom-inner" style={{ maxWidth: 1360, margin: '0 auto', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: '0.71rem', color: 'rgba(255,255,255,0.28)', fontFamily: 'Outfit', fontWeight: 500 }}>
            © {new Date().getFullYear()} Simple Implants. All rights reserved.
          </span>
          <span style={{ fontSize: '0.69rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'Outfit', fontWeight: 400 }}>
            Made with ♥ in Chennai
          </span>
        </div>
      </div>
    </footer>
  );
}
