import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Footer from './Footer';

const CONTENT = {
  terms: {
    title: 'Terms & Conditions',
    sections: [
      ['Acceptance of Terms', 'By accessing or placing an order through this site, you agree to be bound by these terms. If you do not agree, please do not use this platform.'],
      ['Products & Pricing', 'All product listings, specifications, and prices are subject to change without prior notice. Prices exclude applicable GST unless stated otherwise.'],
      ['Orders', 'An order is confirmed only after payment is received or credit terms are approved by our sales team. We reserve the right to refuse or cancel any order at our discretion.'],
      ['Account Responsibility', 'Registered clinics are responsible for maintaining the confidentiality of their login credentials and for all activity under their account.'],
      ['Limitation of Liability', 'Products are supplied for use by licensed dental professionals. We are not liable for outcomes arising from improper use, storage, or handling of supplied products.'],
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    sections: [
      ['Information We Collect', 'We collect the information you provide during registration (clinic name, contact details, GST number) and order history required to process and deliver your orders.'],
      ['How We Use It', 'Your information is used to process orders, provide support, send order/payment reminders, and improve our services. We do not sell your data to third parties.'],
      ['Data Storage', 'Data is stored securely with access restricted to authorized personnel. Payment processing is handled by our payment gateway partner and is not stored on our servers.'],
      ['Your Rights', 'You may request access to, correction of, or deletion of your account data at any time by contacting us.'],
    ]
  },
  refund: {
    title: 'Refund & Return Policy',
    sections: [
      ['Eligibility', 'Unopened, unused products in original packaging may be returned within 7 days of delivery for a full refund, subject to inspection.'],
      ['Non-Returnable Items', 'Sterilized/single-use items that have left secure packaging, and custom or made-to-order products, are not eligible for return.'],
      ['Damaged or Incorrect Items', 'Report damaged or incorrect shipments within 48 hours of delivery with photos for a replacement or refund at no additional cost.'],
      ['Refund Timeline', 'Approved refunds are processed within 7-10 business days to the original payment method, or adjusted against your account credit.'],
    ]
  },
  shipping: {
    title: 'Shipping Policy',
    sections: [
      ['Processing Time', 'Orders are typically processed within 1-2 business days of confirmation, subject to stock availability.'],
      ['Delivery Timeline', 'Standard delivery takes 3-7 business days depending on location. Metro cities are typically faster.'],
      ['Shipping Charges', 'Shipping charges (if any) are calculated at checkout based on order value and delivery location.'],
      ['Tracking', 'A tracking number is shared once your order is dispatched, viewable from your Orders screen.'],
    ]
  }
};

export default function PolicyPage({ type }) {
  const data = CONTENT[type] || CONTENT.terms;

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(var(--bg-dark))', display: 'flex', flexDirection: 'column' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 60px', flex: 1, width: '100%', boxSizing: 'border-box' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'hsl(var(--primary))', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', marginBottom: 24 }}>
          <ArrowLeft size={15} /> Back to Home
        </Link>

        <h1 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.8rem', color: 'hsl(var(--text-primary))', margin: '0 0 8px' }}>
          {data.title}
        </h1>
        <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', marginBottom: 24 }}>Last updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}</p>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 32 }}>
          <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: '0.78rem', color: '#b45309', lineHeight: 1.5 }}>
            This is a template policy for launch purposes — have it reviewed by your legal counsel before relying on it as a binding agreement.
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {data.sections.map(([heading, body], i) => (
            <div key={i}>
              <h3 style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1rem', color: 'hsl(var(--text-primary))', margin: '0 0 6px' }}>{heading}</h3>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', lineHeight: 1.7, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
