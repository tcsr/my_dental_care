/* eslint-disable */
import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Plus, Minus, ShoppingCart, Zap, Layers, Grid3x3, RefreshCw, Boxes, Flame, Clock, Wrench, FlaskConical, Shield, Settings, CheckCircle } from 'lucide-react';
import { useStore } from '../utils/store';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import StarRating from './ui/StarRating';
import PremiumLoader from './ui/PremiumLoader';

function ToothIcon(props) {
  return (
    <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fillOpacity="0.15" fill="currentColor" />
      <path d="M8 11.5c.5-1 1.5-2 3-2s2.5 1 3 2c.5 1.5.5 3.5 0 4.5s-2 1.5-3 1.5-2.5-.5-3-1.5c-.5-1-.5-3 0-4.5z" fill="none" />
    </svg>
  );
}

const CAT = {
  Implants: { bg: 'rgba(99,102,241,0.12)', color: '#6366f1' },
  Instruments: { bg: 'rgba(14,165,233,0.12)', color: '#0ea5e9' },
  Materials: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  PPE: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  Equipment: { bg: 'rgba(168,85,247,0.12)', color: '#a855f7' },
  Consumables: { bg: 'rgba(236,72,153,0.12)', color: '#ec4899' },
  'Root Form': { bg: 'rgba(99,102,241,0.12)', color: '#6366f1' },
  Compression: { bg: 'rgba(14,165,233,0.12)', color: '#0ea5e9' },
  Basal: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
  'Basal SS': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  'Compression MU': { bg: 'rgba(168,85,247,0.12)', color: '#a855f7' },
  'Basal MU': { bg: 'rgba(236,72,153,0.12)', color: '#ec4899' },
  Genweld: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  'Instant Provisionals': { bg: 'rgba(8,145,178,0.12)', color: '#0891b2' },
  'General Instruments': { bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
  'Bone Graft': { bg: 'rgba(20,184,166,0.12)', color: '#14b8a6' },
  'Bone Plate': { bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
  'Fixation Screw': { bg: 'rgba(120,113,108,0.12)', color: '#78716c' },
};
const DEFAULT_CAT = { bg: 'rgba(14,165,233,0.1)', color: '#0ea5e9' };

const resolveUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  const path = url.startsWith('/') ? url.substring(1) : url;
  return (import.meta.env.BASE_URL || '/') + path;
};

const splitImageUrls = (str) => {
  if (!str) return [];
  if (str.includes('|')) return str.split('|').map(u => u.trim()).filter(Boolean);
  const parts = str.split(',').map(u => u.trim()).filter(Boolean);
  const result = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith('data:') && i + 1 < parts.length) { result.push(parts[i] + ',' + parts[i + 1]); i++; }
    else result.push(parts[i]);
  }
  return result;
};

const getProductImages = (product) => {
  if (!product?.image_url?.trim()) return [];
  return splitImageUrls(product.image_url).map(resolveUrl);
};

const parseImplantSizes = (sizesStr, productSku) => {
  if (!sizesStr) return { diameters: [], variantsByDiameter: {} };
  const parts = sizesStr.split(',').map(s => s.trim()).filter(Boolean);
  const diameters = [];
  const variantsByDiameter = {};
  parts.forEach(part => {
    const match = part.match(/([\d.]+)\s*[xX]\s*([\d.]+)\s*(mm)?/i);
    if (match) {
      const diameter = match[1];
      const length = match[2];
      if (!diameters.includes(diameter)) diameters.push(diameter);
      if (!variantsByDiameter[diameter]) variantsByDiameter[diameter] = [];
      const prefix = productSku ? productSku.replace('INST-', '').slice(0, 3) : 'R';
      variantsByDiameter[diameter].push({ sizeString: part, diameter, length: `${length} mm`, code: `${prefix}${diameter.replace('.', '')}${length}` });
    } else {
      if (!diameters.includes('Standard')) diameters.push('Standard');
      if (!variantsByDiameter['Standard']) variantsByDiameter['Standard'] = [];
      variantsByDiameter['Standard'].push({ sizeString: part, diameter: 'Standard', length: part, code: part });
    }
  });
  return { diameters, variantsByDiameter };
};

const FALLBACK_PRODUCTS = [
  { id: 'fb-op-1', name: 'Mono Implant 3.5mm', category: 'Compression', price: 2900, image_url: 'products/two-piece-implant.jpeg', sizes: '3.5 x 8mm, 3.5 x 10mm, 3.5 x 12mm, 3.5 x 14mm' },
  { id: 'fb-op-2', name: 'Mono Implant 4.2mm', category: 'Compression', price: 2900, image_url: 'products/two-piece-implant.jpeg', sizes: '4.2 x 8mm, 4.2 x 10mm, 4.2 x 12mm, 4.2 x 14mm' },
  { id: 'fb-op-3', name: 'Basal Implant 4.0mm', category: 'Basal', price: 3200, image_url: 'products/two-piece-implant.jpeg', sizes: '4.0 x 10mm, 4.0 x 12mm, 4.0 x 14mm, 4.0 x 16mm' },
  { id: 'fb-op-4', name: 'Basal Implant 4.5mm', category: 'Basal', price: 3200, image_url: 'products/two-piece-implant.jpeg', sizes: '4.5 x 10mm, 4.5 x 12mm, 4.5 x 14mm, 4.5 x 16mm' },
  { id: 'fb-op-kit', name: 'Basal Surgical Kit', category: 'General Instruments', price: 15000, image_url: 'products/dental-implant-kit.jpeg' },
  
  { id: 'fb-tp-1', name: 'Root Form Classic 3.5mm', category: 'Root Form', price: 2500, image_url: 'products/two-piece-implant.jpeg', sizes: '3.5 x 8.5mm, 3.5 x 10mm, 3.5 x 11.5mm, 3.5 x 13mm' },
  { id: 'fb-tp-2', name: 'Root Form Classic 4.3mm', category: 'Root Form', price: 2500, image_url: 'products/two-piece-implant.jpeg', sizes: '4.3 x 8.5mm, 4.3 x 10mm, 4.3 x 11.5mm, 4.3 x 13mm' },
  { id: 'fb-tp-3', name: 'Root Form Classic 5.0mm', category: 'Root Form', price: 2500, image_url: 'products/two-piece-implant.jpeg', sizes: '5.0 x 8.5mm, 5.0 x 10mm, 5.0 x 11.5mm' },
  { id: 'fb-tp-kit', name: 'Standard Surgical Kit', category: 'General Instruments', price: 18000, image_url: 'products/apexkonnect-kit.jpeg' },
  
  { id: 'fb-ps-1', name: 'L-Plate 4 Hole', category: 'Bone Plate', price: 1200, image_url: 'products/bone-plates.jpeg' },
  { id: 'fb-ps-2', name: 'Straight Plate 6 Hole', category: 'Bone Plate', price: 1500, image_url: 'products/bone-plates.jpeg' },
  { id: 'fb-ps-3', name: 'Fixation Screw 2.0mm', category: 'Fixation Screw', price: 350, image_url: 'products/bone-screws.jpeg' }
];

export default function ProductDetailPage({ authUser, cart, onCartChange, setCartOpen, onLoginRequired }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const storeProducts = useStore(state => state.products);
  const fetchProducts = useStore(state => state.fetchProducts);
  const fetchFeedback = useStore(state => state.fetchFeedback);
  const submitFeedback = useStore(state => state.submitFeedback);
  const refresh = useStore(state => state.refresh);
  const feedback = useStore(state => state.feedback);

  const dbProducts = useLiveQuery(() => db.b2bProducts.toArray()) || [];

  const allProducts = useMemo(() => {
    let list = [];
    if (storeProducts && storeProducts.length > 0) {
      list = [...storeProducts];
    } else if (dbProducts && dbProducts.length > 0) {
      list = dbProducts.map(p => ({
        ...p,
        stock_qty: p.stock,
        image_url: p.image || p.image_url || '',
        description: p.description || p.material || p.finish || '',
        product_variants: p.variants || p.product_variants || []
      }));
    }
    
    // Always append fallback products so matching by ID/name works if missing in Supabase
    FALLBACK_PRODUCTS.forEach(fb => {
      if (!list.some(p => p.name === fb.name)) {
        list.push(fb);
      }
    });
    
    return list;
  }, [storeProducts, dbProducts]);

  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchProducts().finally(() => setFetching(false));
  }, [fetchProducts]);

  const nameParam = searchParams.get('name');

  const product = useMemo(() => {
    if (!allProducts.length) return null;
    let match = allProducts.find(p => p.id === id || String(p.id) === id);
    if (!match && nameParam) {
      match = allProducts.find(p => p.name && p.name.toLowerCase() === decodeURIComponent(nameParam).toLowerCase());
    }
    return match || null;
  }, [allProducts, id, nameParam]);

  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [activeDiameter, setActiveDiameter] = useState(null);
  const [imgIdx, setImgIdx] = useState(0);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  const feedbackList = product ? (feedback[product.id] || []) : [];
  const hasReviewed = useMemo(() => feedbackList.some(item => item.user_id === authUser?.user?.id), [feedbackList, authUser]);

  useEffect(() => {
    if (!product) return;
    fetchFeedback(product.id);
    if (product.product_variants?.length > 0) {
      const activeVars = product.product_variants.filter(v => v.active !== false);
      const initialVar = activeVars[0] || null;
      setSelectedVariant(initialVar);
      setSelectedSize(initialVar ? [initialVar.diameter, initialVar.length].filter(Boolean).join(' x ') : null);
      setActiveDiameter(null);
    } else {
      setSelectedVariant(null);
      const parsed = parseImplantSizes(product.sizes, product.sku);
      setActiveDiameter(parsed.diameters[0] || null);
      setSelectedSize(null);
    }
    setImgIdx(0);
  }, [product, fetchFeedback]);

  const addToCart = (prod, size = null, variant = null) => {
    if (!prod) return;
    const cartKey = variant ? `${prod.id}_v_${variant.id}` : (size ? `${prod.id}_${size}` : prod.id);
    const currentQty = (cart || {})[cartKey]?.qty || 0;
    const maxStock = variant ? variant.stock_qty : prod.stock_qty;
    if (maxStock !== null && maxStock !== undefined && currentQty >= maxStock) {
      alert(`Cannot add more. Only ${maxStock} items in stock.`);
      return;
    }
    onCartChange(prev => {
      const sp = prev && typeof prev === 'object' ? prev : {};
      return { ...sp, [cartKey]: sp[cartKey] ? { ...sp[cartKey], qty: sp[cartKey].qty + 1 } : { product: prod, qty: 1, size, variant } };
    });
  };

  const removeFromCart = (productId, size = null, variant = null) => {
    if (!productId) return;
    const cartKey = variant ? `${productId}_v_${variant.id}` : (size ? `${productId}_${size}` : productId);
    onCartChange(prev => {
      const sp = prev && typeof prev === 'object' ? prev : {};
      const next = { ...sp };
      if (!next[cartKey]) return next;
      if (next[cartKey].qty <= 1) delete next[cartKey];
      else next[cartKey] = { ...next[cartKey], qty: next[cartKey].qty - 1 };
      return next;
    });
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!newRating || !product) return;
    setSubmittingFeedback(true);
    setFeedbackError('');
    const result = await submitFeedback(product.id, newRating, newComment, authUser.user.id);
    setSubmittingFeedback(false);
    if (result.success) {
      setNewComment('');
      setNewRating(5);
      await refresh('products');
    } else {
      setFeedbackError(result.error || 'Failed to submit review');
    }
  };

  if (fetching && !product) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
        <PremiumLoader text="Loading product..." />
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ minHeight: '100vh', background: 'hsl(var(--bg-primary, #f8fafc))' }}>
        <style>{`
          .pdp-sticky-bar { position:sticky; top:0; z-index:120; background:rgba(255,255,255,0.82); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px); border-bottom:1px solid rgba(14,165,233,0.12); box-shadow:0 2px 16px rgba(15,23,42,0.07); padding:10px 0; }
          .pdp-back { display:inline-flex; align-items:center; gap:8px; padding:9px 18px; border-radius:12px; border:1.5px solid rgba(14,165,233,0.2); background:rgba(255,255,255,0.75); color:hsl(var(--text-primary,#0f172a)); font-size:0.82rem; font-weight:800; font-family:Outfit; cursor:pointer; transition:all 0.25s ease; backdrop-filter:blur(8px); }
          .pdp-back:hover { background:white; border-color:#0ea5e9; color:#0ea5e9; transform:translateX(-2px); }
        `}</style>
        <div className="pdp-sticky-bar">
          <div className="catalog-container-responsive" style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button className="pdp-back" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} strokeWidth={2.5} /> Back to Catalog
            </button>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', gap:20 }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(148,163,184,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Package size={36} color="#94a3b8" />
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'1.1rem', fontWeight:900, color:'#475569', fontFamily:'Outfit', marginBottom:6 }}>Product not found</div>
            <div style={{ fontSize:'0.82rem', color:'#94a3b8', fontWeight:500 }}>This product may have been removed or the link is incorrect.</div>
          </div>
          <button onClick={() => navigate('/catalog')} style={{ padding:'11px 28px', borderRadius:14, border:'none', background:'linear-gradient(135deg,#0ea5e9,#4f46e5)', color:'#fff', fontSize:'0.82rem', fontWeight:800, cursor:'pointer', fontFamily:'Outfit', boxShadow:'0 8px 20px -4px rgba(14,165,233,0.4)' }}>
            Browse Catalog
          </button>
        </div>
      </div>
    );
  }

  const images = getProductImages(product);
  const cs = CAT[product.category] || DEFAULT_CAT;
  const relatedProducts = allProducts.filter(p => p.category === product.category && p.id !== product.id && p.active !== false).slice(0, 8);
  const { diameters, variantsByDiameter } = parseImplantSizes(product.sizes, product.sku);
  const activeDia = activeDiameter || diameters[0] || null;
  const outOfStock = product.stock_qty === null || product.stock_qty === undefined || product.stock_qty <= 0;
  const lowStock = !outOfStock && product.stock_qty <= 5;
  const isAdmin = authUser?.role === 'admin';
  const hasVariants = (product.product_variants?.length || 0) > 0;
  const hasSizes = diameters.length > 0;

  return (
    <div style={{ paddingBottom: 100, minHeight: '100vh' }}>
      <style>{`
        @keyframes pdpFadeIn { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        .pdp-wrap { animation: pdpFadeIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }
        .pdp-vc { transition: all 0.3s cubic-bezier(0.16,1,0.3,1)!important; }
        .pdp-vc:hover { transform:translateY(-3px)!important; box-shadow:0 12px 28px rgba(14,165,233,0.18)!important; border-color:#0ea5e9!important; }
        .pdp-rb { transition:all 0.25s ease!important; }
        .pdp-rb:hover { transform:translateY(-2px)!important; box-shadow:0 8px 18px rgba(14,165,233,0.2)!important; }
        .pdp-thumb { transition:all 0.2s ease; cursor:pointer; border-radius:10px; border:2.5px solid transparent; }
        .pdp-thumb:hover { border-color:#0ea5e9; }
        .pdp-thumb.active { border-color:#0ea5e9; box-shadow:0 0 0 3px rgba(14,165,233,0.2); }
        .pdp-sticky-bar {
          position: sticky;
          top: 0;
          z-index: 120;
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-bottom: 1px solid rgba(14,165,233,0.12);
          box-shadow: 0 2px 16px rgba(15,23,42,0.07);
          padding: 10px 0;
          margin-bottom: 28px;
          transition: box-shadow 0.2s ease;
        }
        .pdp-back { display:inline-flex; align-items:center; gap:8px; padding:9px 18px; border-radius:12px; border:1.5px solid rgba(14,165,233,0.2); background:rgba(255,255,255,0.75); color:hsl(var(--text-primary)); font-size:0.82rem; font-weight:800; font-family:Outfit; cursor:pointer; transition:all 0.25s ease; backdrop-filter:blur(8px); }
        .pdp-back:hover { background:white; border-color:#0ea5e9; color:#0ea5e9; transform:translateX(-2px); }
        @media(max-width:768px) { .pdp-hero { grid-template-columns:1fr!important; } }
      `}</style>

      {/* ── STICKY TOP BAR ── */}
      <div className="pdp-sticky-bar">
        <div className="catalog-container-responsive" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button className="pdp-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} strokeWidth={2.5} /> Back to Catalog
          </button>
          {product && (
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'hsl(var(--text-muted))', fontFamily: 'Outfit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60vw' }}>
              {(product.name || '').replace(/`/g, '')}
            </span>
          )}
        </div>
      </div>

      <div className="catalog-container-responsive pdp-wrap">

        {/* HERO */}
        <div className="pdp-hero" style={{
          background: 'linear-gradient(135deg,rgba(255,255,255,0.96) 0%,rgba(240,253,250,0.9) 50%,rgba(240,249,255,0.88) 100%)',
          border: '1.5px solid rgba(14,165,233,0.18)', borderRadius: 28,
          padding: 'clamp(24px,5vw,40px)', display: 'grid',
          gridTemplateColumns: 'minmax(0,1.4fr) 1fr', gap: 36,
          alignItems: 'center', boxShadow: '0 20px 48px -12px rgba(14,165,233,0.14)',
          backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
          marginBottom: 32, position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: '-30%', right: '-10%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,rgba(14,165,233,0.08) 0%,transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 850, color: cs.color, background: cs.bg, padding: '4px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'inline-block', width: 'fit-content', border: `1px solid ${cs.color}30` }}>
              {product.category || 'General'}
            </span>
            <h1 style={{ fontSize: 'clamp(1.4rem,4vw,2.3rem)', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              {(product.name || '').replace(/`/g, '')}
            </h1>
            {product.sku && (
              <span style={{ fontSize: '0.74rem', color: 'hsl(var(--text-dim))', fontWeight: 600 }}>
                SKU: <span style={{ fontFamily: 'monospace', color: 'hsl(var(--text-muted))' }}>{product.sku}</span>
              </span>
            )}
            <p style={{ fontSize: '0.92rem', color: 'hsl(var(--text-muted))', lineHeight: 1.6, margin: 0, fontWeight: 500, maxWidth: 520 }}>
              {product.description || 'Premium dental solution manufactured using Grade 5 Titanium (Ti6Al4V) with high osseointegration surface treatment for superior primary stability.'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0ea5e9', fontFamily: 'Outfit', letterSpacing: '-0.02em' }}>
                {'\u20B9'}{product.price?.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, padding: '4px 10px', borderRadius: 20, border: `1px solid ${outOfStock ? '#ef444430' : lowStock ? '#f59e0b30' : '#10b98130'}`, background: outOfStock ? 'rgba(239,68,68,0.07)' : lowStock ? 'rgba(245,158,11,0.07)' : 'rgba(16,185,129,0.07)', color: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {outOfStock ? 'Out of Stock' : lowStock ? `Low Stock \u2014 ${product.stock_qty} left` : 'In Stock'}
              </div>
            </div>

            {!hasSizes && !hasVariants && !isAdmin && !outOfStock && (() => {
              const qty = (cart || {})[product.id]?.qty || 0;
              return qty > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(241,245,249,0.8)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 12, padding: 4, gap: 10 }}>
                    <button onClick={() => removeFromCart(product.id)} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Minus size={12} strokeWidth={2.5} /></button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0ea5e9', fontFamily: 'Outfit', minWidth: 20, textAlign: 'center' }}>{qty}</span>
                    <button onClick={() => addToCart(product)} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Plus size={12} strokeWidth={2.5} /></button>
                  </div>
                  <button onClick={() => setCartOpen(true)} style={{ padding: '9px 18px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#0ea5e9,#4f46e5)', color: '#fff', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShoppingCart size={14} /> View Cart
                  </button>
                </div>
              ) : (
                <button onClick={() => addToCart(product)} style={{ alignSelf: 'flex-start', padding: '12px 24px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#0ea5e9,#4f46e5)', color: '#fff', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 20px -4px rgba(14,165,233,0.4)', marginTop: 8 }}>
                  <Plus size={16} /> Add to Cart
                </button>
              );
            })()}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 1 }}>
            <div style={{ height: 240, background: 'linear-gradient(180deg,rgba(255,255,255,0.96) 0%,rgba(248,250,252,0.5) 100%)', borderRadius: 20, border: '1px solid rgba(14,165,233,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, boxSizing: 'border-box', boxShadow: '0 10px 24px -8px rgba(15,23,42,0.08)' }}>
              <img src={images[imgIdx] || `${import.meta.env.BASE_URL || '/'}logo.png`} alt={product.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.1))' }} />
            </div>
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {images.map((img, i) => (
                  <img key={i} src={img} alt={`View ${i + 1}`} className={`pdp-thumb${imgIdx === i ? ' active' : ''}`} onClick={() => setImgIdx(i)} style={{ width: 48, height: 48, objectFit: 'contain', background: 'white', padding: 4, boxSizing: 'border-box' }} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RELATED */}
        {relatedProducts.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Related Products</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {relatedProducts.map(rp => (
                <button key={rp.id} className="pdp-rb" onClick={() => navigate(`/product/${rp.id}`)} style={{ padding: '9px 18px', borderRadius: 24, background: 'rgba(255,255,255,0.75)', color: 'hsl(var(--text-muted))', fontSize: '0.80rem', fontWeight: 800, fontFamily: 'Outfit', cursor: 'pointer', boxShadow: '0 2px 8px rgba(15,23,42,0.04)', border: '1px solid rgba(14,165,233,0.15)' }}>
                  {rp.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SIZES / VARIANTS */}
        {(hasSizes || hasVariants) && (
          <div style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 28, padding: 32, marginBottom: 32, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', margin: '0 0 24px 0', letterSpacing: '-0.01em' }}>
              {hasVariants ? 'Available Variants' : 'Available Sizes'}
            </h2>

            {hasSizes && (
              <>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                  {diameters.map(dia => (
                    <button key={dia} onClick={() => setActiveDiameter(dia)} style={{ padding: '9px 20px', borderRadius: 20, background: activeDia === dia ? 'linear-gradient(135deg,#0ea5e9,#4f46e5)' : 'rgba(255,255,255,0.85)', color: activeDia === dia ? '#fff' : 'hsl(var(--text-muted))', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit', boxShadow: activeDia === dia ? '0 6px 16px -4px rgba(14,165,233,0.45)' : '0 2px 6px rgba(15,23,42,0.03)', border: activeDia === dia ? 'none' : '1px solid rgba(14,165,233,0.15)', transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)' }}>
                      {dia === 'Standard' ? dia : `\u2300 ${dia}`}
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: 'center', marginBottom: 20, fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.4rem', color: '#0ea5e9', letterSpacing: '-0.01em' }}>
                  {activeDia === 'Standard' ? 'STANDARD SIZES' : `R${(activeDia || '').replace('.', '')}`}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 20 }}>
                  {(variantsByDiameter[activeDia] || []).map(variant => {
                    const cartKey = `${product.id}_${variant.sizeString}`;
                    const qty = (cart || {})[cartKey]?.qty || 0;
                    return (
                      <div key={variant.sizeString} className="pdp-vc" style={{ background: 'rgba(255,255,255,0.88)', border: '1.5px solid rgba(14,165,233,0.12)', borderRadius: 24, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 8px 20px -6px rgba(15,23,42,0.06)' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(14,165,233,0.08),rgba(99,102,241,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, border: '1px solid rgba(14,165,233,0.15)' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#0ea5e9', fontFamily: 'Outfit' }}>{variant.diameter}</span>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0f172a', fontFamily: 'Outfit', marginBottom: 2 }}>{variant.code}</div>
                        <div style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', marginBottom: 4, fontWeight: 600 }}>{variant.sizeString}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 14 }}>{variant.length}</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0ea5e9', fontFamily: 'Outfit', marginBottom: 14 }}>{'\u20B9'}{product.price?.toLocaleString('en-IN')}</div>
                        {isAdmin ? (
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>Admin Mode</div>
                        ) : outOfStock ? (
                          <button disabled style={{ width: '100%', padding: '8px 0', borderRadius: 10, border: 'none', background: 'rgba(241,245,249,0.8)', color: '#94a3b8', fontSize: '0.74rem', fontWeight: 800, cursor: 'not-allowed' }}>Sold Out</button>
                        ) : qty > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(241,245,249,0.6)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 10, padding: 3, gap: 8, width: '100%', justifyContent: 'space-between' }}>
                            <button onClick={() => removeFromCart(product.id, variant.sizeString)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Minus size={11} strokeWidth={2.5} /></button>
                            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0ea5e9', fontFamily: 'Outfit' }}>{qty}</span>
                            <button onClick={() => addToCart(product, variant.sizeString)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Plus size={11} strokeWidth={2.5} /></button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(product, variant.sizeString)} style={{ width: '100%', padding: '9px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#0ea5e9,#4f46e5)', color: '#fff', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, boxShadow: '0 6px 16px -4px rgba(14,165,233,0.4)' }}>
                            <Plus size={12} strokeWidth={2.5} /> Add to Cart
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {hasVariants && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 20 }}>
                {product.product_variants.filter(v => v.active !== false).map(v => {
                  const cartKey = `${product.id}_v_${v.id}`;
                  const qty = (cart || {})[cartKey]?.qty || 0;
                  const vOOS = v.stock_qty !== null && v.stock_qty !== undefined && v.stock_qty <= 0;
                  const totalPrice = (product.price || 0) + (v.price_delta || 0);
                  return (
                    <div key={v.id} className="pdp-vc" onClick={() => { setSelectedVariant(v); setSelectedSize([v.diameter, v.length].filter(Boolean).join(' x ')); }} style={{ background: 'rgba(255,255,255,0.88)', border: `2px solid ${selectedVariant?.id === v.id ? '#0ea5e9' : 'rgba(14,165,233,0.12)'}`, borderRadius: 24, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: selectedVariant?.id === v.id ? '0 8px 24px rgba(14,165,233,0.2)' : '0 8px 20px -6px rgba(15,23,42,0.06)', cursor: 'pointer' }}>
                      <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a', fontFamily: 'Outfit', marginBottom: 4 }}>{v.diameter ? `\u2300${v.diameter}` : v.name || 'Variant'}</div>
                      {v.length && <div style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', marginBottom: 4, fontWeight: 600 }}>L: {v.length}</div>}
                      <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#0ea5e9', fontFamily: 'Outfit', marginBottom: 14 }}>{'\u20B9'}{totalPrice.toLocaleString('en-IN')}</div>
                      {isAdmin ? (
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>Admin Mode</div>
                      ) : vOOS ? (
                        <button disabled style={{ width: '100%', padding: '8px 0', borderRadius: 10, border: 'none', background: 'rgba(241,245,249,0.8)', color: '#94a3b8', fontSize: '0.74rem', fontWeight: 800, cursor: 'not-allowed' }}>Sold Out</button>
                      ) : qty > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(241,245,249,0.6)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 10, padding: 3, gap: 8, width: '100%', justifyContent: 'space-between' }}>
                          <button onClick={e => { e.stopPropagation(); removeFromCart(product.id, null, v); }} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Minus size={11} strokeWidth={2.5} /></button>
                          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0ea5e9', fontFamily: 'Outfit' }}>{qty}</span>
                          <button onClick={e => { e.stopPropagation(); addToCart(product, null, v); }} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Plus size={11} strokeWidth={2.5} /></button>
                        </div>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); addToCart(product, null, v); }} style={{ width: '100%', padding: '9px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#0ea5e9,#4f46e5)', color: '#fff', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, boxShadow: '0 6px 16px -4px rgba(14,165,233,0.4)' }}>
                          <Plus size={12} strokeWidth={2.5} /> Add to Cart
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28 }}>
              <button onClick={() => setCartOpen(true)} style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#0ea5e9,#4f46e5)', color: '#fff', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 6px 16px -4px rgba(14,165,233,0.4)' }}>
                <ShoppingCart size={15} /> View Cart
              </button>
            </div>
          </div>
        )}

        {/* SPECS */}
        <div style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 28, padding: 32, marginBottom: 32, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', margin: '0 0 20px 0', letterSpacing: '-0.01em' }}>Technical Specifications</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
            {[
              { label: 'Availability', value: outOfStock ? 'Out of Stock' : lowStock ? `Low Stock \u2014 ${product.stock_qty} units left` : 'In Stock', color: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981' },
              { label: 'Category', value: product.category || 'General', color: cs.color },
              product.material && { label: 'Material Composition', value: product.material },
              product.finish && { label: 'Surface Treatment', value: product.finish },
              product.sterilization && { label: 'Sterilization Method', value: product.sterilization },
              product.unit && { label: 'Unit', value: product.unit },
              product.warrantyPct > 0 && { label: 'Product Warranty', value: `${product.warrantyPct}% Clinical Lifetime Coverage` },
            ].filter(Boolean).map((spec, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.88)', padding: '18px 22px', borderRadius: 20, border: '1px solid rgba(14,165,233,0.12)', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
                <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{spec.label}</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: spec.color || 'hsl(var(--text-primary))', marginTop: 4 }}>{spec.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* REVIEWS */}
        <div style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 28, padding: 32, marginBottom: 40, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', margin: '0 0 24px 0', letterSpacing: '-0.01em' }}>Doctor Reviews &amp; Clinical Feedback</h2>
          {authUser ? (
            hasReviewed ? (
              <div style={{ fontSize: '0.8rem', color: '#10b981', background: 'rgba(16,185,129,0.06)', padding: '14px 20px', borderRadius: 12, fontWeight: 700, marginBottom: 24, border: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={14} /> You have already submitted feedback. Thank you!
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24, borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>Your Rating:</span>
                  <StarRating rating={newRating} onRatingChange={setNewRating} editable size={18} />
                </div>
                <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Share your clinical experience..." required style={{ width: '100%', minHeight: 80, padding: 12, background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(14,165,233,0.2)', borderRadius: 12, fontSize: '0.82rem', color: 'hsl(var(--text-primary))', outline: 'none', fontFamily: 'Outfit', boxSizing: 'border-box' }} />
                {feedbackError && <div style={{ fontSize: '0.7rem', color: '#ef4444' }}>{feedbackError}</div>}
                <button type="submit" disabled={submittingFeedback} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', alignSelf: 'flex-start', fontFamily: 'Outfit' }}>
                  {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            )
          ) : (
            <div style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', background: 'rgba(255,255,255,0.6)', padding: '14px 20px', borderRadius: 12, fontWeight: 700, marginBottom: 24, border: '1px solid rgba(0,0,0,0.05)' }}>
              {'\uD83D\uDD12'} Please log in to write a review.
            </div>
          )}
          {feedbackList.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-dim))', fontStyle: 'italic' }}>No doctor reviews submitted yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {feedbackList.map(item => (
                <div key={item.id} style={{ display: 'flex', gap: 14, padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(14,165,233,0.08)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.95rem', flexShrink: 0 }}>
                    {item.profiles?.name?.charAt(0).toUpperCase() || 'D'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>{item.profiles?.name || 'Doctor'}</div>
                      <span style={{ fontSize: '0.64rem', color: 'hsl(var(--text-dim))' }}>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <div style={{ display: 'flex', marginTop: 4, marginBottom: 8 }}><StarRating rating={item.rating} size={10} /></div>
                    <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5, margin: 0 }}>{item.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
