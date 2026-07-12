import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Globe, MessageCircle, Share2 } from 'lucide-react';

const linkStyle = {
  color: 'rgba(255, 255, 255, 0.65)',
  fontSize: '0.78rem',
  textDecoration: 'none',
  transition: 'all 0.2s ease',
  fontFamily: 'Outfit',
  fontWeight: 500
};

const headingStyle = {
  fontFamily: 'Outfit',
  fontWeight: 800,
  fontSize: '0.86rem',
  color: '#fff',
  margin: '0 0 12px 0',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      style={linkStyle}
      onMouseEnter={e => { e.currentTarget.style.color = '#0ea5e9'; e.currentTarget.style.transform = 'translateX(2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)'; e.currentTarget.style.transform = 'none'; }}
    >
      {children}
    </Link>
  );
}

export default function Footer() {
  return (
    <footer style={{
      background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
      color: '#fff',
      padding: '36px 20px 0 20px',
      marginTop: 0,
      borderTop: '1px solid rgba(14, 165, 233, 0.12)'
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 28,
        paddingBottom: 28
      }}>
        {/* Brand Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(14,165,233,0.15)" />
              <path d="M8 11.5c.5-1 1.5-2 3-2s2.5 1 3 2c.5 1.5.5 3.5 0 4.5s-2 1.5-3 1.5-2.5-.5-3-1.5c-.5-1-.5-3 0-4.5z" fill="none" />
            </svg>
            <span style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1rem', color: '#fff', letterSpacing: '-0.01em' }}>Simple Implants</span>
          </div>
          <p style={{ fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.5)', lineHeight: 1.5, margin: 0, maxWidth: 240 }}>
            Next-generation dental implants and surgical instruments — simple, effective, efficient. Built for clinical precision.
          </p>
        </div>

        {/* Quick Links Column */}
        <div>
          <h4 style={headingStyle}>Quick Links</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FooterLink to="/">Home</FooterLink>
            <FooterLink to="/catalog">Products</FooterLink>
            <a href="#about" style={linkStyle} onMouseEnter={e => e.currentTarget.style.color = '#0ea5e9'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)'}>About Us</a>
            <a href="#contact" style={linkStyle} onMouseEnter={e => e.currentTarget.style.color = '#0ea5e9'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)'}>Contact Us</a>
          </div>
        </div>

        {/* Policies Column */}
        <div>
          <h4 style={headingStyle}>Policies</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FooterLink to="/terms">Terms &amp; Conditions</FooterLink>
            <FooterLink to="/privacy">Privacy Policy</FooterLink>
            <FooterLink to="/refund-policy">Refund &amp; Return</FooterLink>
            <FooterLink to="/shipping-policy">Shipping Policy</FooterLink>
          </div>
        </div>

        {/* Contact Info Column */}
        <div>
          <h4 style={headingStyle}>Get in Touch</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href="tel:+919444126926" style={{ ...linkStyle, display: 'flex', alignItems: 'center', gap: 8 }} onMouseEnter={e => e.currentTarget.style.color = '#0ea5e9'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)'}>
              <Phone size={13} strokeWidth={2.2} /> +91 94441 26926
            </a>
            <a href="mailto:contact@simpleimplant.in" style={{ ...linkStyle, display: 'flex', alignItems: 'center', gap: 8 }} onMouseEnter={e => e.currentTarget.style.color = '#0ea5e9'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)'}>
              <Mail size={13} strokeWidth={2.2} /> simpleimplants@gmail.com
            </a>
            <span style={{ ...linkStyle, display: 'flex', alignItems: 'flex-start', gap: 8, color: 'rgba(255,255,255,0.5)' }}>
              <MapPin size={13} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 2 }} /> Perumbakkam, Chennai, India
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {[
              { icon: Globe, link: '#' },
              { icon: MessageCircle, link: 'https://wa.me/919444126926' },
              { icon: Share2, link: '#' }
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.7)',
                    transition: 'all 0.25s ease',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#0ea5e9'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <Icon size={13} strokeWidth={2.2} />
                </a>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 0',
        textAlign: 'center',
        fontSize: '0.7rem',
        color: 'rgba(255,255,255,0.4)',
        fontFamily: 'Outfit',
        fontWeight: 500
      }}>
        © {new Date().getFullYear()} Simple Implant. All rights reserved.
      </div>
    </footer>
  );
}
