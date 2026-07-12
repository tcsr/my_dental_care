import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../utils/supabase';
import { useStore } from '../utils/store';
import { Search, ShoppingCart, Plus, Minus, X, Package, CheckCircle, ChevronLeft, ChevronRight, Wrench, FlaskConical, Shield, Settings, PhoneCall, ArrowLeft, Mail, Zap, Layers, Grid3x3, RefreshCw, Boxes, Flame, Clock, Syringe } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import PremiumLoader from './ui/PremiumLoader';
import EmptyStateCard from './EmptyStateCard';
import StarRating from './ui/StarRating';

const CATEGORIES = [
  'All', 'Implants', 'Instruments', 'Materials', 'PPE', 'Equipment', 'Consumables',
  // Expanded implant-type taxonomy (additive — existing products keep their current category)
  'Root Form', 'Compression', 'Basal', 'Basal SS', 'Compression MU', 'Basal MU',
  'Genweld', 'Instant Provisionals', 'General Instruments', 'Bone Graft'
];

function ToothIcon(props) {
  return (
    <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fillOpacity="0.15" fill="currentColor" />
      <path d="M8 11.5c.5-1 1.5-2 3-2s2.5 1 3 2c.5 1.5.5 3.5 0 4.5s-2 1.5-3 1.5-2.5-.5-3-1.5c-.5-1-.5-3 0-4.5z" fill="none" />
    </svg>
  );
}

const CAT = {
  Implants: { bg: 'rgba(99,102,241,0.12)', color: '#6366f1', icon: ToothIcon },
  Instruments: { bg: 'rgba(14,165,233,0.12)', color: '#0ea5e9', icon: Wrench },
  Materials: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', icon: FlaskConical },
  PPE: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', icon: Shield },
  Equipment: { bg: 'rgba(168,85,247,0.12)', color: '#a855f7', icon: Settings },
  Consumables: { bg: 'rgba(236,72,153,0.12)', color: '#ec4899', icon: Package },
  'Root Form': { bg: 'rgba(99,102,241,0.12)', color: '#6366f1', icon: ToothIcon },
  Compression: { bg: 'rgba(14,165,233,0.12)', color: '#0ea5e9', icon: Zap },
  Basal: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', icon: Layers },
  'Basal SS': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', icon: Grid3x3 },
  'Compression MU': { bg: 'rgba(168,85,247,0.12)', color: '#a855f7', icon: RefreshCw },
  'Basal MU': { bg: 'rgba(236,72,153,0.12)', color: '#ec4899', icon: Boxes },
  Genweld: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', icon: Flame },
  'Instant Provisionals': { bg: 'rgba(8,145,178,0.12)', color: '#0891b2', icon: Clock },
  'General Instruments': { bg: 'rgba(100,116,139,0.12)', color: '#64748b', icon: Wrench },
  'Bone Graft': { bg: 'rgba(20,184,166,0.12)', color: '#14b8a6', icon: Syringe },
};
const DEFAULT_CAT = { bg: 'rgba(14,165,233,0.1)', color: '#0ea5e9', icon: Package };


const splitImageUrls = (imageUrlStr) => {
  if (!imageUrlStr) return [];
  if (imageUrlStr.includes('|')) {
    return imageUrlStr.split('|').map(url => url.trim()).filter(Boolean);
  }
  const parts = imageUrlStr.split(',').map(url => url.trim()).filter(Boolean);
  const result = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].startsWith('data:') && i + 1 < parts.length) {
      result.push(parts[i] + ',' + parts[i + 1]);
      i++;
    } else {
      result.push(parts[i]);
    }
  }
  return result;
};

const getCategoryKey = (cat) => {
  if (!cat) return 'General';
  const c = cat.toLowerCase();
  if (c.includes('implant')) return 'Implants';
  if (c.includes('instrument') || c.includes('tool')) return 'Instruments';
  if (c.includes('material') || c.includes('crown') || c.includes('bridge') || c.includes('abutment')) return 'Materials';
  if (c.includes('ppe')) return 'PPE';
  if (c.includes('equipment')) return 'Equipment';
  if (c.includes('consumable')) return 'Consumables';
  return 'General';
};

const resolveUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const path = url.startsWith('/') ? url.substring(1) : url;
  const base = import.meta.env.BASE_URL || '/';
  return base + path;
};

const getProductImages = (product) => {
  let urls = [];
  if (product && product.image_url && product.image_url.trim()) {
    urls = splitImageUrls(product.image_url);
  }
  return urls.map(resolveUrl);
};

const parseImplantSizes = (sizesStr, productSku) => {
  if (!sizesStr) return { diameters: [], variantsByDiameter: {} };
  const parts = sizesStr.split(',').map(s => s.trim()).filter(Boolean);
  const diameters = [];
  const variantsByDiameter = {};

  parts.forEach(part => {
    // Matches "3.5 x 10mm" or "3.5x10" or similar
    const match = part.match(/([\d.]+)\s*[xX]\s*([\d.]+)\s*(mm)?/i);
    if (match) {
      const diameter = match[1];
      const length = match[2];
      if (!diameters.includes(diameter)) {
        diameters.push(diameter);
      }
      if (!variantsByDiameter[diameter]) {
        variantsByDiameter[diameter] = [];
      }
      const prefix = productSku ? productSku.replace('INST-', '').slice(0, 3) : 'R';
      const cleanDia = diameter.replace('.', '');
      const code = `${prefix}${cleanDia}${length}`;
      variantsByDiameter[diameter].push({
        sizeString: part,
        diameter,
        length: `${length} mm`,
        code
      });
    } else {
      const diameter = 'Standard';
      if (!diameters.includes(diameter)) {
        diameters.push(diameter);
      }
      if (!variantsByDiameter[diameter]) {
        variantsByDiameter[diameter] = [];
      }
      variantsByDiameter[diameter].push({
        sizeString: part,
        diameter,
        length: part,
        code: part
      });
    }
  });

  return { diameters, variantsByDiameter };
};


export default function ProductCatalog({
  authUser,
  cart,
  onCartChange,
  onOrderPlaced,
  onLoginRequired,
  cartOpen,
  setCartOpen
}) {
  const storeProducts = useStore(state => state.products);
  const dbProducts = useLiveQuery(() => db.b2bProducts.toArray()) || [];

  const products = useMemo(() => {
    if (storeProducts && storeProducts.length >= dbProducts.length && storeProducts.some(p => p.sku && p.sku.startsWith('INST-'))) {
      return storeProducts;
    }
    return dbProducts.map(p => ({
      ...p,
      stock_qty: p.stock, // B2C compatibility alias
      image_url: p.image || p.image_url || '', // B2C compatibility alias
      description: p.description || p.material || p.finish || '' // B2C compatibility alias
    }));
  }, [storeProducts, dbProducts]);

  const categories = useStore(state => state.categories);
  const loading = useStore(state => state.loading);

  const [categoriesList, setCategoriesList] = useState(CATEGORIES);
  const [catConfig, setCatConfig] = useState(CAT);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [placing, setPlacing] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [activeDiameter, setActiveDiameter] = useState(null);

  // Ratings & Feedback form states
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  const fetchFeedback = useStore(state => state.fetchFeedback);
  const submitFeedback = useStore(state => state.submitFeedback);
  const refresh = useStore(state => state.refresh);
  const feedback = useStore(state => state.feedback);
  const feedbackList = selectedProduct ? (feedback[selectedProduct.id] || []) : [];

  const hasReviewed = useMemo(() => {
    return feedbackList.some(item => item.user_id === authUser?.user?.id);
  }, [feedbackList, authUser]);

  const isAdmin = authUser && authUser.role === 'admin';

  useEffect(() => {
    if (selectedProduct) {
      const sizeList = selectedProduct.sizes ? selectedProduct.sizes.split(',').map(s => s.trim()).filter(Boolean) : [];
      setSelectedSize(sizeList.length > 0 ? sizeList[0] : null);
      fetchFeedback(selectedProduct.id);
      
      const parsed = parseImplantSizes(selectedProduct.sizes, selectedProduct.sku);
      if (parsed.diameters.length > 0) {
        setActiveDiameter(parsed.diameters[0]);
      } else {
        setActiveDiameter(null);
      }
    } else {
      setSelectedSize(null);
      setActiveDiameter(null);
    }
  }, [selectedProduct, fetchFeedback]);

  // ── Auto-open product from URL param (e.g. /catalog?product=Two+Piece+Dental+Implant) ──
  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenDone = useRef(false);
  useEffect(() => {
    if (autoOpenDone.current) return;
    const paramName = searchParams.get('product');
    if (!paramName || products.length === 0) return;
    const match = products.find(p => p.name && p.name.toLowerCase() === paramName.toLowerCase());
    if (match) {
      setSelectedProduct(match);
      setCarouselIndex(0);
      autoOpenDone.current = true;
      // Remove the query param so back/refresh won't re-open
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, products, setSearchParams]);


  useEffect(() => {
    if (categories && categories.length > 0) {
      const list = ['All', ...categories.map(c => c.name)];
      setCategoriesList(list);
      const config = {};
      categories.forEach(c => {
        config[c.name] = { bg: c.bg_color || 'rgba(14,165,233,0.1)', color: c.text_color || '#0ea5e9', icon: c.icon || '📦' };
      });
      setCatConfig(config);
    }
  }, [categories]);

  const filtered = useMemo(() => products.filter(p => {
    if (p.active === false) return false;
    const mappedCat = getCategoryKey(p.category);
    const matchCat = category === 'All' || p.category === category || mappedCat === category;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)) || (p.sku && p.sku.toLowerCase().includes(q));
    return matchCat && matchSearch;
  }), [products, search, category]);

  const ratingStats = useMemo(() => {
    let totalCount = 0;
    let sumRating = 0;

    products.forEach(p => {
      const cnt = p.rating_count || 0;
      const avg = p.rating_avg || 0;
      if (cnt > 0) {
        totalCount += cnt;
        sumRating += avg * cnt;
      }
    });

    const overallAvg = totalCount > 0 ? (sumRating / totalCount) : 4.8;
    return {
      avg: overallAvg.toFixed(1),
      count: totalCount || 24
    };
  }, [products]);

  const cartItems = Object.values(cart || {});
  const cartCount = cartItems.reduce((s, i) => s + (i?.qty || 0), 0);
  const cartTotal = cartItems.reduce((s, i) => s + (i?.qty || 0) * (i?.product?.price || 0), 0);

  const addToCart = (product, size = null) => {
    if (!product) return;
    const cartKey = size ? `${product.id}_${size}` : product.id;
    const safeCart = cart || {};
    const currentQty = safeCart[cartKey]?.qty || 0;
    if (product.stock_qty !== null && product.stock_qty !== undefined && currentQty >= product.stock_qty) {
      alert(`Cannot add more. Only ${product.stock_qty} items in stock.`);
      return;
    }
    onCartChange(prev => {
      const safePrev = prev && typeof prev === 'object' ? prev : {};
      return {
        ...safePrev,
        [cartKey]: safePrev[cartKey]
          ? { ...safePrev[cartKey], qty: safePrev[cartKey].qty + 1 }
          : { product, qty: 1, size },
      };
    });
  };

  const removeFromCart = (productId, size = null) => {
    if (!productId) return;
    const cartKey = size ? `${productId}_${size}` : productId;
    onCartChange(prev => {
      const safePrev = prev && typeof prev === 'object' ? prev : {};
      const next = { ...safePrev };
      if (!next[cartKey]) return next;
      if (next[cartKey].qty <= 1) delete next[cartKey];
      else next[cartKey] = { ...next[cartKey], qty: next[cartKey].qty - 1 };
      return next;
    });
  };

  const clearCart = () => onCartChange({});

  const placeOrderWithUser = async (user, paymentId) => {
    if (!cartItems.length) return;
    setPlacing(true);
    const finalTotal = Math.round(cartTotal * 1.12);
    const notesStr = paymentId ? `Paid via Razorpay. Transaction ID: ${paymentId}` : 'Payment pending / manual';

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        doctor_id: user.user.id,
        status: 'pending',
        total: finalTotal,
        notes: notesStr
      })
      .select().single();

    if (error || !order) {
      setPlacing(false);
      alert('Failed to place order. Please try again.');
      return;
    }

    await supabase.from('order_items').insert(
      cartItems.map(i => ({
        order_id: order.id,
        product_id: i.product.id,
        qty: i.qty,
        unit_price: i.product.price,
        size: i.size || null
      }))
    );

    for (const { product, qty } of cartItems) {
      // Skip stock update for untracked products (null stock_qty)
      if (product.stock_qty === null || product.stock_qty === undefined) continue;
      // Atomic safe decrement — only update if current DB stock >= qty
      await supabase.rpc('decrement_stock', { p_product_id: product.id, p_qty: qty });
    }

    clearCart();
    setPlacing(false);
    setCartOpen(false);
    setOrderDone(true);
    useStore.getState().refresh('all');
    setTimeout(() => { setOrderDone(false); }, 5000);
  };

  const triggerRazorpayPayment = async (user) => {
    setPlacing(true);
    if (!window.Razorpay) {
      // Fallback: try loading dynamically if static script failed
      const scriptLoaded = await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
      if (!scriptLoaded || !window.Razorpay) {
        setPlacing(false);
        alert('Failed to load Razorpay payment gateway. Please check connection and try again.');
        return;
      }
    }

    const finalTotal = Math.round(cartTotal * 1.12);
    const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_LalDentalPlaceholder';

    try {
      // 1. Create order on backend (Supabase Edge Function)
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-order', {
        body: {
          amount: finalTotal * 100,
          currency: 'INR'
        }
      });

      if (orderError || (orderData && orderData.error)) {
        const errMsg = orderError?.message || orderData?.error || 'Order creation failed';
        console.error('Create order function error:', orderError, orderData);
        alert('Payment error: ' + errMsg);
        setPlacing(false);
        return;
      }

      if (!orderData || !orderData.order_id) {
        alert('Failed to create payment order.');
        setPlacing(false);
        return;
      }

      const options = {
        key: rzpKey,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Simple Implants',
        description: 'Clinic Case Order Payment',
        image: 'https://cdn-icons-png.flaticon.com/512/3482/3482200.png',
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            // 2. Verify payment signature on backend (Supabase Edge Function)
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }
            });

            if (verifyError || (verifyData && verifyData.error) || !verifyData || !verifyData.verified) {
              const errMsg = verifyError?.message || verifyData?.error || 'Signature verification failed';
              console.error('Verify payment function error:', verifyError, verifyData);
              alert('Payment verification failed: ' + errMsg);
              setPlacing(false);
              return;
            }

            // 3. Signature verified successfully! Complete order DB insertion
            await placeOrderWithUser(user, response.razorpay_payment_id);
          } catch (verErr) {
            console.error('Payment verification exception:', verErr);
            alert('Failed to verify payment: ' + verErr.message);
            setPlacing(false);
          }
        },
        prefill: {
          name: user.name || '',
          email: user.user?.email || '',
          contact: user.phone || ''
        },
        notes: {
          address: user.address || ''
        },
        theme: {
          color: '#0ea5e9'
        },
        modal: {
          ondismiss: function () {
            setPlacing(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        console.error('Payment failed:', resp.error);
        alert('Payment failed: ' + (resp.error.description || 'Unknown error'));
        setPlacing(false);
      });
      rzp.open();

    } catch (e) {
      console.error('Razorpay initialization error:', e);
      alert('Failed to initiate payment: ' + e.message);
      setPlacing(false);
    }
  };

  const placeOrder = async () => {
    if (!cartItems.length || placing) return;
    if (!authUser) {
      if (onLoginRequired) {
        onLoginRequired((loggedInUser) => {
          if (loggedInUser) triggerRazorpayPayment(loggedInUser);
        });
      } else {
        alert('Please log in to place an order.');
      }
      return;
    }
    await triggerRazorpayPayment(authUser);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!newRating) return;
    setSubmittingFeedback(true);
    setFeedbackError('');
    const result = await submitFeedback(selectedProduct.id, newRating, newComment, authUser.user.id);
    setSubmittingFeedback(false);
    if (result.success) {
      setNewComment('');
      setNewRating(5);
      await refresh('products');
    } else {
      setFeedbackError(result.error || 'Failed to submit review');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <PremiumLoader text="Loading catalog..." />
    </div>
  );

  return (
    <div style={{ paddingBottom: 100 }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .product-card {
          animation: fadeInUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease !important;
          will-change: transform;
        }
        .product-card:hover {
          transform: translateY(-3px) !important;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.10) !important;
          border-color: #0ea5e9 !important;
        }
        .product-card:hover .product-card-img {
          transform: scale(1.05);
        }
        .product-card:hover .product-card-overlay {
          opacity: 1;
        }
        .product-card-img {
          transition: transform 0.4s ease;
        }
        .product-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 40%, rgba(15, 23, 42, 0.04) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
          z-index: 1;
        }
        .cat-chip {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .cat-chip:hover {
          transform: translateY(-1px) !important;
          border-color: #0ea5e9 !important;
        }
        .search-clear-btn {
          width: 24px !important;
          height: 24px !important;
          min-width: 24px !important;
          max-width: 24px !important;
          min-height: 24px !important;
          max-height: 24px !important;
          border-radius: 50% !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .search-clear-btn:hover {
          transform: translateY(-50%) scale(1.15) rotate(90deg) !important;
          background-color: #ef4444 !important;
          color: #fff !important;
        }
        .modal-close-btn-premium {
          width: 36px !important;
          height: 36px !important;
          min-width: 36px !important;
          max-width: 36px !important;
          min-height: 36px !important;
          max-height: 36px !important;
          border-radius: 50% !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .modal-close-btn-premium:hover {
          transform: scale(1.1) rotate(90deg) !important;
          background-color: #ef4444 !important;
          color: #fff !important;
          border-color: #ef4444 !important;
        }
        .detail-modal-footer {
          position: sticky;
          bottom: 0;
          background: hsl(var(--bg-card));
          border-top: 1px solid hsl(var(--border-color));
          padding: 16px 20px;
          z-index: 10;
          box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.06);
          display: flex;
          justify-content: flex-end;
        }
      `}</style>

      {/* Success toast with CTA */}
      {orderDone && (
        <div style={{ position: 'fixed', top: 76, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#fff', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 32px rgba(15,23,42,0.18)', border: '1px solid rgba(16,185,129,0.2)', padding: '12px 16px', minWidth: 260 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={18} color="#10b981" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Outfit' }}>Order placed!</div>
            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>We'll process it shortly</div>
          </div>
          <button onClick={() => { setOrderDone(false); onOrderPlaced?.(); }} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #10b981, #0ea5e9)', color: '#fff', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit', flexShrink: 0 }}>
            View Orders
          </button>
        </div>
      )}

      {selectedProduct ? (
        /* Product Details Screen */
        <div className="catalog-container-responsive" style={{ animation: 'fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
          {/* Back Navigation Button */}
          <button
            className="details-back-btn"
            onClick={() => { setSelectedProduct(null); setCarouselIndex(0); }}
          >
            <ArrowLeft size={16} strokeWidth={2.5} /> Back to Catalog
          </button>

          {/* Details Grid */}
          {(() => {
            const images = getProductImages(selectedProduct);
            const cs = catConfig[selectedProduct.category] || DEFAULT_CAT;
            const relatedProducts = products.filter(p => p.category === selectedProduct.category);
            const { diameters, variantsByDiameter } = parseImplantSizes(selectedProduct.sizes, selectedProduct.sku);
            const activeDia = activeDiameter || (diameters.length > 0 ? diameters[0] : null);
            const outOfStockMain = selectedProduct.stock_qty === null || selectedProduct.stock_qty === undefined || selectedProduct.stock_qty <= 0;
            const lowStockMain = !outOfStockMain && selectedProduct.stock_qty <= 5;

            return (
              <>
                {/* Top Section - Brand/Product Intro Banner */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(240,249,255,0.85) 50%, rgba(238,242,255,0.80) 100%)',
                  border: '1px solid rgba(14,165,233,0.14)',
                  borderRadius: 24,
                  padding: '32px 40px',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.4fr) 1fr',
                  gap: 36,
                  alignItems: 'center',
                  boxShadow: 'var(--shadow-md)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  marginBottom: 32,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0ea5e9', background: 'rgba(14,165,233,0.1)', padding: '4px 12px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-block', width: 'fit-content' }}>
                      {selectedProduct.category || 'General'}
                    </span>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                      {(selectedProduct.name || '').replace(/`/g, '')}
                    </h1>
                    <p style={{ fontSize: '0.94rem', color: 'hsl(var(--text-muted))', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                      {selectedProduct.description || 'Premium dental solution manufactured using Grade 5 Titanium (Ti6Al4V) with high osseointegration surface treatment, designed to provide superior primary stability and predictable clinical success.'}
                    </p>
                    
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6 }}>
                      <button
                        style={{
                          padding: '11px 22px',
                          borderRadius: 10,
                          border: 'none',
                          background: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
                          color: '#fff',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          fontFamily: 'Outfit',
                          boxShadow: '0 4px 14px rgba(14,165,233,0.22)',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                      >
                        Learn More...
                      </button>
                      {selectedProduct.sku && (
                        <span style={{ fontSize: '0.74rem', color: 'hsl(var(--text-dim))', fontWeight: 600 }}>
                          SKU: <span style={{ fontFamily: 'monospace', color: 'hsl(var(--text-muted))' }}>{selectedProduct.sku}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Product Image Box */}
                  <div style={{
                    height: 240,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.4) 100%)',
                    borderRadius: 20,
                    border: '1px solid rgba(14,165,233,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <img
                      src={images[0] || `${import.meta.env.BASE_URL || '/'}logo.png`}
                      alt={selectedProduct.name}
                      style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.08))' }}
                    />
                  </div>
                </div>

                {/* Sub-category Tabs (Related Products) */}
                {relatedProducts.length > 1 && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
                    {relatedProducts.map(rp => (
                      <button
                        key={rp.id}
                        onClick={() => { setSelectedProduct(rp); setCarouselIndex(0); }}
                        style={{
                          padding: '9px 18px',
                          borderRadius: 24,
                          background: rp.id === selectedProduct.id
                            ? 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)'
                            : 'rgba(255, 255, 255, 0.8)',
                          color: rp.id === selectedProduct.id ? '#fff' : 'hsl(var(--text-muted))',
                          fontSize: '0.80rem',
                          fontWeight: 800,
                          fontFamily: 'Outfit',
                          cursor: 'pointer',
                          boxShadow: rp.id === selectedProduct.id
                            ? '0 6px 14px rgba(14,165,233,0.25)'
                            : '0 2px 8px rgba(15,23,42,0.04)',
                          border: rp.id === selectedProduct.id ? 'none' : '1px solid rgba(14,165,233,0.15)',
                          transition: 'all 0.25s ease'
                        }}
                      >
                        {rp.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Size / Variant Section */}
                <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(14,165,233,0.12)', borderRadius: 24, padding: 32, marginBottom: 32, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                  
                  {diameters.length > 0 ? (
                    <>
                      {/* Diameter Selector Tabs */}
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                        {diameters.map(dia => (
                          <button
                            key={dia}
                            onClick={() => setActiveDiameter(dia)}
                            style={{
                              padding: '8px 18px',
                              borderRadius: 20,
                              background: activeDia === dia
                                ? '#0ea5e9'
                                : 'rgba(255,255,255,0.85)',
                              color: activeDia === dia ? '#fff' : 'hsl(var(--text-muted))',
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              fontFamily: 'Outfit',
                              boxShadow: activeDia === dia ? '0 4px 10px rgba(14,165,233,0.2)' : 'none',
                              border: activeDia === dia ? 'none' : '1px solid rgba(14,165,233,0.15)',
                              transition: 'all 0.2s'
                            }}
                          >
                            {dia}
                          </button>
                        ))}
                      </div>

                      {/* Header with selected prefix (e.g. R30 or standard variant category code) */}
                      <div style={{ textAlign: 'center', marginBottom: 20, fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.45rem', color: '#0ea5e9' }}>
                        {activeDia === 'Standard' ? 'STANDARD SIZES' : `R${activeDia?.replace('.', '') || '30'}`}
                      </div>

                      {/* Variants Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
                        {(variantsByDiameter[activeDia] || []).map(variant => {
                          const cartKey = `${selectedProduct.id}_${variant.sizeString}`;
                          const inCart = (cart || {})[cartKey];
                          const qty = inCart ? inCart.qty : 0;
                          return (
                            <div key={variant.sizeString} style={{
                              background: 'rgba(255,255,255,0.92)',
                              border: '1px solid rgba(14,165,233,0.15)',
                              borderRadius: 20,
                              padding: 20,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              position: 'relative',
                              boxShadow: '0 4px 16px rgba(15,23,42,0.04)',
                              transition: 'all 0.3s ease'
                            }}>
                              {outOfStockMain && (
                                <div style={{
                                  position: 'absolute', top: 10, left: 10,
                                  background: '#ef4444', color: '#fff', fontSize: '0.55rem',
                                  fontWeight: 800, padding: '3px 8px', borderRadius: 5,
                                  textTransform: 'uppercase', letterSpacing: '0.04em'
                                }}>SOLD OUT</div>
                              )}
                              
                              {/* Variant Image */}
                              <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                                <img
                                  src={images[0] || `${import.meta.env.BASE_URL || '/'}logo.png`}
                                  alt={variant.code}
                                  style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.08))' }}
                                />
                              </div>

                              {/* Title / Code */}
                              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', fontFamily: 'Outfit' }}>{variant.code}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2, marginBottom: 12 }}>Length: {variant.length}</div>
                              
                              {/* Price */}
                              <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0ea5e9', marginBottom: 14, fontFamily: 'Outfit' }}>
                                ₹{selectedProduct.price?.toLocaleString('en-IN')}
                              </div>

                              {/* Buy button / quantity selectors */}
                              {isAdmin ? (
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>Admin Mode</div>
                              ) : outOfStockMain ? (
                                <button disabled style={{ width: '100%', padding: '8px 0', borderRadius: 10, border: 'none', background: 'rgba(241,245,249,0.8)', color: '#94a3b8', fontSize: '0.74rem', fontWeight: 800, cursor: 'not-allowed' }}>Sold Out</button>
                              ) : qty > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(241,245,249,0.6)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 10, padding: 3, gap: 8, width: '100%', justifyContent: 'space-between' }}>
                                  <button
                                    type="button"
                                    onClick={() => removeFromCart(selectedProduct.id, variant.sizeString)}
                                    style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
                                  >
                                    <Minus size={11} strokeWidth={2.5} />
                                  </button>
                                  <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0ea5e9', fontFamily: 'Outfit' }}>{qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => addToCart(selectedProduct, variant.sizeString)}
                                    disabled={selectedProduct.stock_qty !== null && selectedProduct.stock_qty !== undefined && qty >= selectedProduct.stock_qty}
                                    style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}
                                  >
                                    <Plus size={11} strokeWidth={2.5} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => addToCart(selectedProduct, variant.sizeString)}
                                  style={{ width: '100%', padding: '9px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, boxShadow: '0 4px 10px rgba(14,165,233,0.15)' }}
                                >
                                  <Plus size={12} strokeWidth={2.5} /> Buy Now
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    // Simple product view without sizes
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div style={{
                        background: 'rgba(255,255,255,0.92)',
                        border: '1px solid rgba(14,165,233,0.15)',
                        borderRadius: 20,
                        padding: 24,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        width: '100%',
                        maxWidth: 320,
                        boxShadow: '0 4px 16px rgba(15,23,42,0.04)'
                      }}>
                        <div style={{ height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                          <img
                            src={images[0] || `${import.meta.env.BASE_URL || '/'}logo.png`}
                            alt={selectedProduct.name}
                            style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                          />
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', fontFamily: 'Outfit' }}>Standard Size</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0ea5e9', margin: '8px 0 16px', fontFamily: 'Outfit' }}>₹{selectedProduct.price?.toLocaleString('en-IN')}</div>
                        
                        {isAdmin ? (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>Admin Mode</div>
                        ) : outOfStockMain ? (
                          <button disabled style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', background: 'rgba(241,245,249,0.8)', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 800, cursor: 'not-allowed' }}>Sold Out</button>
                        ) : (
                          (() => {
                            const cartKey = selectedProduct.id;
                            const inCart = (cart || {})[cartKey];
                            const qty = inCart ? inCart.qty : 0;
                            return qty > 0 ? (
                              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(241,245,249,0.6)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 10, padding: 3, gap: 8, width: '100%', justifyContent: 'space-between' }}>
                                <button type="button" onClick={() => removeFromCart(selectedProduct.id)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}><Minus size={11} strokeWidth={2.5} /></button>
                                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0ea5e9', fontFamily: 'Outfit' }}>{qty}</span>
                                <button type="button" onClick={() => addToCart(selectedProduct)} disabled={selectedProduct.stock_qty !== null && selectedProduct.stock_qty !== undefined && qty >= selectedProduct.stock_qty} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}><Plus size={11} strokeWidth={2.5} /></button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => addToCart(selectedProduct)} style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 10px rgba(14,165,233,0.15)' }}><Plus size={14} /> Buy Now</button>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
                    <button onClick={() => setCartOpen(true)} style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', fontSize: '0.84rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(14,165,233,0.2)' }}>
                      <ShoppingCart size={15} /> View Cart
                    </button>
                  </div>
                </div>

                {/* Technical Specifications */}
                <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(14,165,233,0.12)', borderRadius: 24, padding: 32, marginBottom: 32, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', margin: '0 0 20px 0', letterSpacing: '-0.01em' }}>Technical Specifications</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                    <div style={{ background: 'rgba(255,255,255,0.6)', padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(14,165,233,0.1)' }}>
                      <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Availability</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: outOfStockMain ? '#ef4444' : lowStockMain ? '#f59e0b' : '#10b981', marginTop: 4 }}>
                        {outOfStockMain ? 'Out of Stock' : lowStockMain ? `Low Stock — ${selectedProduct.stock_qty} units left` : 'In Stock'}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.6)', padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(14,165,233,0.1)' }}>
                      <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: cs.color, marginTop: 4 }}>{selectedProduct.category || 'General'}</div>
                    </div>
                    {selectedProduct.material && (
                      <div style={{ background: 'rgba(255,255,255,0.6)', padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(14,165,233,0.1)' }}>
                        <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Material Composition</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 4 }}>{selectedProduct.material}</div>
                      </div>
                    )}
                    {selectedProduct.finish && (
                      <div style={{ background: 'rgba(255,255,255,0.6)', padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(14,165,233,0.1)' }}>
                        <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Surface Treatment</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 4 }}>{selectedProduct.finish}</div>
                      </div>
                    )}
                    {selectedProduct.sterilization && (
                      <div style={{ background: 'rgba(255,255,255,0.6)', padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(14,165,233,0.1)' }}>
                        <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sterilization Method</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 4 }}>{selectedProduct.sterilization}</div>
                      </div>
                    )}
                    {selectedProduct.warrantyPct > 0 && (
                      <div style={{ background: 'rgba(255,255,255,0.6)', padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(14,165,233,0.1)' }}>
                        <div style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Product Warranty</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 4 }}>{selectedProduct.warrantyPct}% Clinical Lifetime Coverage</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reviews & Feedback */}
                <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(14,165,233,0.12)', borderRadius: 24, padding: 32, marginBottom: 40, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', margin: '0 0 24px 0', letterSpacing: '-0.01em' }}>Doctor Reviews &amp; Clinical Feedback</h3>

                  {/* Submit Review */}
                  {authUser ? (
                    hasReviewed ? (
                      <div style={{ fontSize: '0.8rem', color: '#10b981', background: 'rgba(16,185,129,0.06)', padding: '14px 20px', borderRadius: 12, fontWeight: 700, marginBottom: 24, border: '1px solid rgba(16,185,129,0.15)' }}>
                        ✓ You have already submitted feedback for this product. Thank you for sharing your experience!
                      </div>
                    ) : (
                      <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24, borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>Your Rating:</span>
                          <StarRating rating={newRating} onRatingChange={setNewRating} editable size={18} />
                        </div>
                        <textarea
                          value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Share your clinical experience, material quality, or product specifications feedback..." required
                          style={{ width: '100%', minHeight: 80, padding: 12, background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(14,165,233,0.2)', borderRadius: 12, fontSize: '0.82rem', color: 'hsl(var(--text-primary))', outline: 'none', fontFamily: 'Outfit', boxSizing: 'border-box' }}
                        />
                        {feedbackError && <div style={{ fontSize: '0.7rem', color: '#ef4444' }}>{feedbackError}</div>}
                        <button type="submit" disabled={submittingFeedback} style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', fontSize: '0.74rem', fontWeight: 800, cursor: 'pointer', alignSelf: 'flex-start', fontFamily: 'Outfit' }}>
                          {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                      </form>
                    )
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', background: 'rgba(255,255,255,0.6)', padding: '14px 20px', borderRadius: 12, fontWeight: 700, marginBottom: 24, border: '1px solid rgba(0,0,0,0.05)' }}>
                      🔒 Please log in to write a review.
                    </div>
                  )}

                  {/* Reviews List */}
                  {feedbackList.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-dim))', fontStyle: 'italic' }}>No doctor reviews submitted yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {feedbackList.map(item => (
                        <div key={item.id} style={{ display: 'flex', gap: 14, padding: '16px', borderRadius: 16, background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(14,165,233,0.08)' }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.95rem', flexShrink: 0 }}>
                            {item.profiles?.name?.charAt(0).toUpperCase() || 'D'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>
                                {item.profiles?.name || 'Doctor'}
                              </div>
                              <span style={{ fontSize: '0.64rem', color: 'hsl(var(--text-dim))' }}>
                                {new Date(item.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', marginTop: 4, marginBottom: 8 }}>
                              <StarRating rating={item.rating} size={10} />
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5, margin: 0 }}>{item.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        /* Catalog Listing View */
        <div className="catalog-container-responsive">
          {/* Sticky search & category chips bar */}
          <div className="catalog-sticky-header">
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-dim))', pointerEvents: 'none' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
                style={{ width: '100%', padding: '12px 38px 12px 38px', background: 'hsl(var(--bg-card))', border: '1.5px solid hsl(var(--border-color))', borderRadius: 12, fontSize: '0.88rem', color: 'hsl(var(--text-primary))', outline: 'none', fontFamily: 'Outfit', boxSizing: 'border-box', transition: 'all 0.2s ease' }}
                onFocus={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.15)'; }}
                onBlur={e => { e.target.style.borderColor = 'hsl(var(--border-color))'; e.target.style.boxShadow = 'none'; }}
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setCategory('All'); }}
                  className="search-clear-btn"
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
                    color: '#ef4444'
                  }}
                >
                  <X size={13} strokeWidth={2.5} style={{ width: '13px', height: '13px', display: 'block' }} />
                </button>
              )}
            </div>

            {/* Category chips */}
            <div className="cat-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingTop: 6, paddingBottom: 8, scrollbarWidth: 'none' }}>
              <style>{`.cat-scroll::-webkit-scrollbar{display:none}`}</style>
              {categoriesList.map(cat => (
                <button key={cat} className="cat-chip" onClick={() => setCategory(cat)} style={{ flexShrink: 0, padding: '8px 16px', borderRadius: 24, fontSize: '0.78rem', fontWeight: 700, fontFamily: 'Outfit', border: '1.5px solid', cursor: 'pointer', transition: 'all 0.2s', background: category === cat ? '#0ea5e9' : 'transparent', borderColor: category === cat ? '#0ea5e9' : 'hsl(var(--border-color))', color: category === cat ? '#fff' : 'hsl(var(--text-muted))' }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          {filtered.length === 0 ? (
            <EmptyStateCard
              icon={Package}
              title="No Products Found"
              message="Try a different search or category to find what you're looking for."
              action={(search || category !== 'All') && (
                <button
                  onClick={() => { setSearch(''); setCategory('All'); }}
                  style={{
                    background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '10px',
                    fontSize: '0.74rem',
                    fontWeight: '800',
                    fontFamily: 'Outfit',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(14,165,233,0.2)'
                  }}
                >
                  Clear Search & Filter
                </button>
              )}
            />
          ) : (
            <div className="product-catalog-grid">
              {filtered.map((p, index) => {
                const cs = catConfig[p.category] || DEFAULT_CAT;
                const inCart = (cart || {})[p.id];
                const outOfStock = p.stock_qty === null || p.stock_qty === undefined || p.stock_qty <= 0;
                const lowStock = !outOfStock && p.stock_qty <= 5;
                const images = getProductImages(p);
                return (
                  <div
                    key={p.id}
                    onClick={() => { setSelectedProduct(p); setCarouselIndex(0); }}
                    className="product-card"
                    style={{
                      background: 'hsl(var(--bg-card))', borderRadius: 20, padding: 0,
                      display: 'flex', flexDirection: 'column',
                      border: inCart ? '1.5px solid #0ea5e9' : '1px solid hsl(var(--border-color))',
                      boxShadow: inCart ? '0 8px 24px rgba(14,165,233,0.15)' : 'var(--shadow-sm)',
                      position: 'relative', overflow: 'hidden',
                      cursor: 'pointer',
                      animationDelay: `${index * 0.04}s`
                    }}
                  >
                    {/* Product Image Thumbnail */}
                    <div style={{ width: '100%', height: 150, overflow: 'hidden', background: 'hsl(var(--bg-dark))', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid hsl(var(--border-color))' }}>
                      <div className="product-card-overlay" />
                      {images && images.length > 0 ? (
                        <img className="product-card-img" src={images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} loading="lazy" />
                      ) : (
                        <div style={{ color: cs.color, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: 0.5 }}>
                          {typeof cs.icon === 'string' ? <span style={{ fontSize: '2.5rem' }}>{cs.icon}</span> : <cs.icon size={40} />}
                          <span style={{ fontSize: '0.5rem', fontWeight: 700, color: 'hsl(var(--text-dim))', fontFamily: 'Outfit' }}>No Image</span>
                        </div>
                      )}
                      {/* Category Pill Overlay */}
                      <span style={{ position: 'absolute', left: 8, bottom: 8, fontSize: '0.55rem', fontWeight: 800, color: '#fff', background: cs.color, padding: '4px 10px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 2 }}>
                        {p.category || 'General'}
                      </span>
                      {images && images.length > 1 && (
                        <span style={{ position: 'absolute', right: 8, top: 8, fontSize: '0.5rem', fontWeight: 800, color: '#fff', background: 'rgba(0,0,0,0.45)', padding: '3px 7px', borderRadius: 6, backdropFilter: 'blur(4px)', zIndex: 2 }}>
                          {images.length} imgs
                        </span>
                      )}
                    </div>

                    <div style={{ padding: '12px 14px 0', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: 36 }}>
                        {(p.name || '').replace(/`/g, '')}
                      </div>

                      {p.description && (
                        <div style={{ fontSize: '0.64rem', color: 'hsl(var(--text-muted))', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                          {p.description}
                        </div>
                      )}

                      {/* Rating Stars on Card */}
                      {p.rating_count > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <StarRating rating={Number(p.rating_avg)} size={11} />
                          <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'hsl(var(--text-muted))', fontFamily: 'Outfit' }}>
                            {Number(p.rating_avg).toFixed(1)} ({p.rating_count})
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <StarRating rating={0} size={11} />
                          <span style={{ fontSize: '0.66rem', fontWeight: 500, color: 'hsl(var(--text-dim))', fontFamily: 'Outfit' }}>
                            No reviews
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 6 }}>
                        <span style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.08rem', color: 'hsl(var(--text-primary))' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginRight: 2 }}>₹</span>{p.price?.toLocaleString('en-IN')}
                        </span>
                        <span style={{ fontSize: '0.56rem', fontWeight: 800, padding: '3px 8px', borderRadius: 8, background: outOfStock ? 'rgba(239,68,68,0.1)' : lowStock ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981' }}>
                          {outOfStock ? 'Out of Stock' : lowStock ? `${p.stock_qty} left` : 'In Stock'}
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: '0 14px 14px', display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                      {isAdmin ? (
                        <div style={{ width: '100%', textAlign: 'center', fontSize: '0.66rem', color: 'hsl(var(--text-dim))', padding: '10px 0', borderTop: '1px solid hsl(var(--border-color))', fontWeight: 700 }}>👁️ Administrator View</div>
                      ) : outOfStock ? (
                        <div style={{ width: '100%', textAlign: 'center', fontSize: '0.66rem', color: 'hsl(var(--text-dim))', padding: '10px 0', borderTop: '1px solid hsl(var(--border-color))', fontWeight: 700 }}>Currently unavailable</div>
                      ) : (p.sizes && p.sizes.trim()) ? (
                        <button onClick={(e) => { e.stopPropagation(); setSelectedProduct(p); setCarouselIndex(0); }} style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 12px rgba(14,165,233,0.25)', transition: 'all 0.2s ease' }}>
                          Select Size / Options
                        </button>
                      ) : inCart ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)', borderRadius: 12, padding: '5px 6px', width: '100%' }}>
                          <button
                            className="qty-btn"
                            onClick={(e) => { e.stopPropagation(); removeFromCart(p.id); }}
                            style={{ width: 22, height: 22 }}
                          >
                            <Minus size={11} strokeWidth={2.5} />
                          </button>
                          <span
                            onClick={(e) => { e.stopPropagation(); setCartOpen(true); }}
                            style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0ea5e9', fontFamily: 'Outfit', cursor: 'pointer', padding: '2px 6px' }}
                            title="View Cart"
                          >{inCart.qty}</span>
                          <button
                            className="qty-btn"
                            onClick={(e) => { e.stopPropagation(); addToCart(p); }}
                            disabled={p.stock_qty !== null && p.stock_qty !== undefined && inCart.qty >= p.stock_qty}
                            style={{ width: 22, height: 22 }}
                          >
                            <Plus size={11} strokeWidth={2.5} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); addToCart(p); }} style={{ padding: '10px 18px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 12px rgba(14,165,233,0.25)', transition: 'all 0.2s ease', marginLeft: 'auto' }}>
                          <Plus size={14} strokeWidth={2.5} /> Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating cart pill — rendered via portal */}
      {cartCount > 0 && !cartOpen && !isAdmin && createPortal(
        <button
          onClick={() => setCartOpen(true)}
          className="floating-cart-pill"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#fff',
            border: '1.5px solid rgba(14, 165, 233, 0.4)',
            borderRadius: 30,
            padding: '14px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: '0.88rem',
            fontWeight: 800,
            fontFamily: 'Outfit',
            cursor: 'pointer',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.35), 0 0 15px rgba(14, 165, 233, 0.15)',
            whiteSpace: 'nowrap',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <ShoppingCart size={18} strokeWidth={2.5} style={{ color: '#0ea5e9' }} />
          <span style={{ letterSpacing: '0.01em' }}>{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
          <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ color: '#0ea5e9', fontWeight: 900 }}>₹{cartTotal.toLocaleString('en-IN')}</span>
        </button>,
        document.body
      )}

      {/* Cart drawer */}
      {cartOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(8px)' }}>
          <div style={{
            background: 'hsl(var(--bg-card))',
            borderRadius: '24px 24px 0 0',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 -24px 64px rgba(15,23,42,0.25)',
            borderTop: '1px solid hsl(var(--border-color))',
            animation: 'cartSlideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 20px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart size={18} strokeWidth={2.5} style={{ color: '#0ea5e9' }} /> Your Order Case
                </h3>
                <button
                  onClick={() => setCartOpen(false)}
                  style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'hsl(var(--bg-dark))', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--text-muted))'; e.currentTarget.style.background = 'hsl(var(--bg-dark))'; }}
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cartItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'hsl(var(--text-dim))' }}>
                  <Package size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, fontFamily: 'Outfit' }}>Your case is currently empty</div>
                  <div style={{ fontSize: '0.72rem', marginTop: 4 }}>Add surgical supplies or implants from the catalog to build an order.</div>
                </div>
              ) : (
                cartItems.map(item => {
                  const images = getProductImages(item.product);
                  return (
                    <div key={item.key} style={{ display: 'flex', gap: 12, padding: 12, background: 'hsl(var(--bg-dark))', borderRadius: 16, border: '1px solid hsl(var(--border-color))', alignItems: 'center' }}>
                      <div style={{ width: 56, height: 56, borderRadius: 10, background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {images && images.length > 0 ? (
                          <img src={images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Package size={20} style={{ opacity: 0.3 }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {(item.product.name || '').replace(/`/g, '')}
                        </div>
                        {item.size && (
                          <div style={{ fontSize: '0.62rem', color: '#0ea5e9', fontWeight: 800, fontFamily: 'Outfit', marginTop: 1 }}>
                            Size: {item.size}
                          </div>
                        )}
                        <div style={{ fontSize: '0.76rem', fontWeight: 900, color: 'hsl(var(--text-primary))', marginTop: 3 }}>
                          ₹{(item.product.price * item.qty).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 10, padding: 4, gap: 8 }}>
                        <button
                          className="qty-btn"
                          onClick={() => removeFromCart(item.product.id, item.size)}
                          style={{ width: 22, height: 22 }}
                        >
                          <Minus size={10} strokeWidth={2.5} />
                        </button>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', minWidth: 16, textAlign: 'center' }}>{item.qty}</span>
                        <button
                          className="qty-btn"
                          onClick={() => addToCart(item.product, item.size)}
                          disabled={item.product.stock_qty !== null && item.product.stock_qty !== undefined && item.qty >= item.product.stock_qty}
                          style={{ width: 22, height: 22 }}
                        >
                          <Plus size={10} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ padding: 20, borderTop: '1px solid hsl(var(--border-color))', background: 'hsl(var(--bg-dark))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Case Total</span>
                <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0ea5e9', fontFamily: 'Outfit' }}>₹{cartTotal.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {cartItems.length > 0 ? (
                  <button
                    onClick={placeOrder}
                    disabled={placing}
                    style={{
                      flex: 1.2,
                      padding: '12px 20px',
                      borderRadius: 12,
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981, #0ea5e9)',
                      color: '#fff',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: 'Outfit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 6px 18px rgba(16,185,129,0.25)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {placing ? 'Placing...' : 'Place Order'}
                    <ChevronRight size={14} strokeWidth={2.5} />
                  </button>
                ) : (
                  <button
                    onClick={() => setCartOpen(false)}
                    style={{
                      flex: 1,
                      padding: '12px 22px',
                      borderRadius: 12,
                      border: 'none',
                      background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                      color: '#fff',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: 'Outfit',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <ArrowLeft size={15} strokeWidth={2.5} /> Continue Shopping
                  </button>
                )}
              </div>
              {cartItems.length > 0 && (
                <button
                  onClick={() => setCartOpen(false)}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: 12,
                    border: '1px solid hsl(var(--border-color))',
                    background: 'transparent',
                    color: 'hsl(var(--text-muted))',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: 'Outfit',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={e => {
                    const arrow = e.currentTarget.querySelector('.continue-arrow-sec');
                    if (arrow) arrow.style.transform = 'translateX(-3px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'hsl(var(--bg-dark))';
                    e.currentTarget.style.color = 'hsl(var(--text-muted))';
                    e.currentTarget.style.borderColor = 'hsl(var(--border-color))';
                    const arrow = e.currentTarget.querySelector('.continue-arrow-sec');
                    if (arrow) arrow.style.transform = 'none';
                  }}
                >
                  <ArrowLeft className="continue-arrow-sec" size={14} strokeWidth={2.5} style={{ transition: 'transform 0.2s ease' }} />
                  Continue Shopping
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (() => {
        const images = getProductImages(selectedProduct);
        const cartKey = selectedSize ? `${selectedProduct.id}_${selectedSize}` : selectedProduct.id;
        const inCart = (cart || {})[cartKey];
        const outOfStock = selectedProduct.stock_qty === null || selectedProduct.stock_qty === undefined || selectedProduct.stock_qty <= 0;
        const lowStock = !outOfStock && selectedProduct.stock_qty <= 5;
        const cs = catConfig[selectedProduct.category] || DEFAULT_CAT;

        return createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 6000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box' }}>
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
            `}</style>

            <div
              onClick={() => { setSelectedProduct(null); setCarouselIndex(0); }}
              style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', animation: 'fadeIn 0.2s ease-out' }}
            />

            <div style={{ position: 'relative', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 32px 80px rgba(15, 23, 42, 0.3)', animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)', zIndex: 1 }}>

              {/* Close Button directly on modal container */}
              <button
                onClick={() => { setSelectedProduct(null); setCarouselIndex(0); }}
                className="modal-close-btn-premium"
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 100,
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: '#0f172a',
                  border: '1px solid hsl(var(--border-color))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                <X size={16} strokeWidth={2.5} style={{ width: '16px', height: '16px', display: 'block' }} />
              </button>

              {/* Image Carousel */}
              <div style={{ position: 'relative', width: '100%', height: 260, background: 'hsl(var(--bg-dark))', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {images.length > 0 ? (
                  <img
                    src={images[carouselIndex]}
                    alt={selectedProduct.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'all 0.3s ease' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: 0.45, color: cs.color }}>
                    {typeof cs.icon === 'string' ? <span style={{ fontSize: '4rem' }}>{cs.icon}</span> : <cs.icon size={64} />}
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', fontFamily: 'Outfit' }}>No images uploaded</span>
                  </div>
                )}

                {/* Left/Right nav buttons — only when multiple images exist */}
                {images.length > 1 && (
                  <>
                    <button
                      className="carousel-nav-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCarouselIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
                      }}
                      style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                    >
                      <ChevronLeft size={18} strokeWidth={2.5} />
                    </button>
                    <button
                      className="carousel-nav-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCarouselIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
                      }}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                    >
                      <ChevronRight size={18} strokeWidth={2.5} />
                    </button>
                  </>
                )}

                {/* Carousel Dots */}
                {images.length > 1 && (
                  <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 10 }}>
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); setCarouselIndex(idx); }}
                        style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', background: carouselIndex === idx ? '#fff' : 'rgba(255, 255, 255, 0.45)', cursor: 'pointer', padding: 0, transition: 'all 0.2s' }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Scrollable Product Info */}
              <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#fff', background: cs.color, padding: '4px 10px', borderRadius: 'var(--radius-xs)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-block', marginBottom: 6 }}>
                      {selectedProduct.category || 'General'}
                    </span>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', margin: 0, lineHeight: 1.3, wordBreak: 'break-word' }}>
                      {(selectedProduct.name || '').replace(/`/g, '')}
                    </h2>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.35rem', color: '#0ea5e9' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginRight: 2 }}>₹</span>{selectedProduct.price?.toLocaleString('en-IN')}
                    </div>
                    {selectedProduct.unit && (
                      <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', marginTop: 1 }}>
                        per {selectedProduct.unit}
                      </div>
                    )}
                  </div>
                </div>

                {/* Badges / Stock */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '4px 10px', borderRadius: 'var(--radius-xs)', background: outOfStock ? 'rgba(239,68,68,0.1)' : lowStock ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981' }}>
                    {outOfStock ? 'Out of Stock' : lowStock ? `Only ${selectedProduct.stock_qty} left` : 'In Stock'}
                  </span>
                  {selectedProduct.sku && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--radius-xs)', background: 'hsl(var(--bg-dark))', border: '1px solid hsl(var(--border-color))', color: 'hsl(var(--text-muted))' }}>
                      SKU: {selectedProduct.sku}
                    </span>
                  )}
                  {selectedProduct.is_serialized && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--radius-xs)', background: 'rgba(168,85,247,0.08)', color: '#a855f7' }}>
                      Tracked by Serial
                    </span>
                  )}
                </div>

                {/* Sizes Selector */}
                {selectedProduct.sizes && selectedProduct.sizes.trim() && (
                  <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: 12 }}>
                    <h4 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>Select Size / Option</h4>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {selectedProduct.sizes.split(',').map(s => s.trim()).filter(Boolean).map(size => {
                        const isSelected = selectedSize === size;
                        return (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 10,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              fontFamily: 'Outfit',
                              cursor: 'pointer',
                              border: isSelected ? '1.5px solid #0ea5e9' : '1px solid hsl(var(--border-color))',
                              background: isSelected ? 'rgba(14,165,233,0.08)' : 'transparent',
                              color: isSelected ? '#0ea5e9' : 'hsl(var(--text-primary))',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Premium Specifications Grid */}
                <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: 12 }}>
                  <h4 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>Product Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'hsl(var(--bg-dark))', padding: 14, borderRadius: 16, border: '1px solid hsl(var(--border-color))' }}>
                    <div>
                      <div style={{ fontSize: '0.58rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Availability</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981', marginTop: 2 }}>
                        {outOfStock ? 'Out of Stock' : lowStock ? `Low — ${selectedProduct.stock_qty} left` : '✅ In Stock'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.58rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Category</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: cs.color, marginTop: 2 }}>{selectedProduct.category || 'General'}</div>
                    </div>
                    {selectedProduct.material && (
                      <div>
                        <div style={{ fontSize: '0.58rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Material</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 2 }}>{selectedProduct.material}</div>
                      </div>
                    )}
                    {selectedProduct.finish && (
                      <div>
                        <div style={{ fontSize: '0.58rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Surface Finish</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 2 }}>{selectedProduct.finish}</div>
                      </div>
                    )}
                    {selectedProduct.sterilization && (
                      <div>
                        <div style={{ fontSize: '0.58rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Sterilization</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 2 }}>{selectedProduct.sterilization}</div>
                      </div>
                    )}
                    {selectedProduct.warrantyPct > 0 && (
                      <div>
                        <div style={{ fontSize: '0.58rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Warranty</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 2 }}>{selectedProduct.warrantyPct}% Coverage</div>
                      </div>
                    )}
                    {selectedProduct.sku && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '0.58rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>SKU / Product Code</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 2, fontFamily: 'monospace' }}>{selectedProduct.sku}</div>
                      </div>
                    )}
                    {selectedProduct.unit && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '0.58rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Unit</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 2 }}>per {selectedProduct.unit}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedProduct.description && (
                  <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: 12 }}>
                    <h4 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px 0' }}>Description</h4>
                    <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-primary))', lineHeight: 1.6, margin: 0 }}>
                      {selectedProduct.description}
                    </p>
                  </div>
                )}

                {/* Ratings & Feedback Section */}
                <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: 12 }}>
                  <h4 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px 0' }}>Reviews & Ratings</h4>

                  {/* Reviews List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                    {feedbackList.length === 0 ? (
                      <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-dim))', fontStyle: 'italic', padding: '6px 0' }}>
                        No reviews yet. Be the first to review this product!
                      </div>
                    ) : (
                      feedbackList.map((item) => (
                        <div key={item.id} style={{ background: 'hsl(var(--bg-dark))', padding: '10px 12px', borderRadius: 12, border: '1px solid hsl(var(--border-color))' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-primary))' }}>
                              {item.profiles?.name || 'Anonymous Doctor'}
                            </span>
                            <span style={{ fontSize: '0.6rem', color: 'hsl(var(--text-dim))' }}>
                              {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <div style={{ marginTop: 2 }}>
                            <StarRating rating={item.rating} size={10} />
                          </div>
                          {item.comment && (
                            <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                              {item.comment}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Submission Form */}
                  {authUser && !hasReviewed ? (
                    <form onSubmit={handleReviewSubmit} style={{ borderTop: '1px dotted hsl(var(--border-color))', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <h5 style={{ fontSize: '0.72rem', fontWeight: 700, color: 'hsl(var(--text-primary))', margin: 0 }}>Add Your Review</h5>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))' }}>Your Rating:</span>
                        <StarRating rating={newRating} onRatingChange={setNewRating} editable size={16} />
                      </div>

                      <textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Write your feedback..."
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          fontSize: '0.75rem',
                          borderRadius: 8,
                          border: '1px solid hsl(var(--border-color))',
                          background: 'transparent',
                          color: 'hsl(var(--text-primary))',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: 'inherit'
                        }}
                      />

                      {feedbackError && (
                        <div style={{ fontSize: '0.68rem', color: '#ef4444' }}>{feedbackError}</div>
                      )}

                      <button
                        type="submit"
                        disabled={submittingFeedback}
                        style={{
                          alignSelf: 'flex-end',
                          padding: '6px 14px',
                          borderRadius: 8,
                          border: 'none',
                          background: submittingFeedback ? 'hsl(var(--border-color))' : 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                          color: '#fff',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: submittingFeedback ? 'not-allowed' : 'pointer',
                          fontFamily: 'Outfit'
                        }}
                      >
                        {submittingFeedback ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </form>
                  ) : authUser && hasReviewed ? (
                    <div style={{ fontSize: '0.68rem', color: 'hsl(var(--text-dim))', fontStyle: 'italic', padding: '6px 0', borderTop: '1px dotted hsl(var(--border-color))' }}>
                      You have already submitted a review for this product.
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.68rem', color: 'hsl(var(--text-dim))', fontStyle: 'italic', padding: '6px 0', borderTop: '1px dotted hsl(var(--border-color))' }}>
                      Please log in to leave a review.
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Action Footer */}
              <div className="detail-modal-footer">
                {isAdmin ? (
                  <div style={{ width: '100%', padding: '12px', background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 12, color: 'hsl(var(--text-muted))', fontSize: '0.78rem', textAlign: 'center', fontWeight: 800, fontFamily: 'Outfit' }}>
                    👁️ Administrator Preview Mode
                  </div>
                ) : outOfStock ? (
                  <div style={{ width: '100%', padding: '12px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, color: '#ef4444', fontSize: '0.78rem', textAlign: 'center', fontWeight: 800, fontFamily: 'Outfit' }}>
                    🚫 Currently Out of Stock
                  </div>
                ) : inCart ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}>
                    <style>{`
                      @keyframes pulseCart {
                        0% { box-shadow: 0 4px 12px rgba(14,165,233,0.3); transform: scale(1); }
                        50% { box-shadow: 0 6px 20px rgba(14,165,233,0.5); transform: scale(1.02); }
                        100% { box-shadow: 0 4px 12px rgba(14,165,233,0.3); transform: scale(1); }
                      }
                      @keyframes bounceCartIcon {
                        0% { transform: translateY(0) scale(1); }
                        50% { transform: translateY(-3px) scale(1.1); }
                        100% { transform: translateY(0) scale(1); }
                      }
                    `}</style>
                    {/* Qty Changer */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1.1, background: 'hsl(var(--bg-dark))', border: '1px solid hsl(var(--border-color))', borderRadius: 16, padding: '6px 16px' }}>
                      <button
                        className="qty-btn"
                        onClick={() => removeFromCart(selectedProduct.id, selectedSize)}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'hsl(var(--border-color))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <Minus size={12} strokeWidth={2.5} />
                      </button>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 24 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>{inCart.qty}</span>
                        <span style={{ fontSize: '0.5rem', color: 'hsl(var(--text-muted))', fontWeight: 700, letterSpacing: '0.02em' }}>QTY</span>
                      </div>
                      <button
                        className="qty-btn"
                        onClick={() => addToCart(selectedProduct, selectedSize)}
                        disabled={selectedProduct.stock_qty !== null && selectedProduct.stock_qty !== undefined && inCart.qty >= selectedProduct.stock_qty}
                        style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'hsl(var(--border-color))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <Plus size={12} strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Animated Go to Cart Button */}
                    <button
                      onClick={() => { setSelectedProduct(null); setCartOpen(true); }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '12px 20px',
                        borderRadius: 16,
                        border: 'none',
                        background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                        color: '#fff',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontFamily: 'Outfit',
                        animation: 'pulseCart 2s infinite ease-in-out',
                        transition: 'all 0.2s'
                      }}
                    >
                      <ShoppingCart size={15} strokeWidth={2.5} style={{ animation: 'bounceCartIcon 1.5s infinite ease-in-out' }} />
                      Go to Cart
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(selectedProduct, selectedSize)}
                    style={{ padding: '14px 28px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(14,165,233,0.3)', letterSpacing: '0.02em', marginLeft: 'auto' }}
                  >
                    <Plus size={16} /> Add to Cart
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
