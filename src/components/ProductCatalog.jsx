import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { Search, ShoppingCart, Plus, Minus, X, Package, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import PremiumLoader from './ui/PremiumLoader';
import EmptyStateCard from './EmptyStateCard';

const CATEGORIES = ['All', 'Implants', 'Instruments', 'Materials', 'PPE', 'Equipment', 'Consumables'];

const CAT = {
  Implants:    { bg: 'rgba(99,102,241,0.12)',  color: '#6366f1', icon: '🦷' },
  Instruments: { bg: 'rgba(14,165,233,0.12)',  color: '#0ea5e9', icon: '🔧' },
  Materials:   { bg: 'rgba(16,185,129,0.12)',  color: '#10b981', icon: '🧪' },
  PPE:         { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b', icon: '🧤' },
  Equipment:   { bg: 'rgba(168,85,247,0.12)',  color: '#a855f7', icon: '⚙️' },
  Consumables: { bg: 'rgba(236,72,153,0.12)', color: '#ec4899', icon: '📦' },
};
const DEFAULT_CAT = { bg: 'rgba(14,165,233,0.1)', color: '#0ea5e9', icon: '📦' };


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

const getProductImages = (product) => {
  if (product && product.image_url && product.image_url.trim()) {
    return splitImageUrls(product.image_url);
  }
  return []; // No uploaded image — return empty, show placeholder
};

export default function ProductCatalog({ authUser, cart, onCartChange, onOrderPlaced, onLoginRequired, cartOpen, setCartOpen }) {
  const [products, setProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState(CATEGORIES);
  const [catConfig, setCatConfig] = useState(CAT);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [placing, setPlacing] = useState(false);
  const [orderDone, setOrderDone] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('product_categories').select('*').eq('active', true);
      if (error) throw error;
      if (data && data.length > 0) {
        const list = ['All', ...data.map(c => c.name)];
        setCategoriesList(list);
        const config = {};
        data.forEach(c => {
          config[c.name] = { bg: c.bg_color || 'rgba(14,165,233,0.1)', color: c.text_color || '#0ea5e9', icon: c.icon || '📦' };
        });
        setCatConfig(config);
      }
    } catch (e) {
      console.warn('Could not load categories from DB, using fallback:', e);
    }
  };

  const fetchProducts = async () => {
    try {
      const cached = sessionStorage.getItem('pc_products_cache');
      if (cached && cached !== 'undefined') {
        try {
          setProducts(JSON.parse(cached));
          setLoading(false);
        } catch (e) {
          console.warn('Cache parse error:', e);
          setLoading(true);
        }
      } else {
        setLoading(true);
      }

      const { data, error } = await supabase.from('products').select('*').or('active.eq.true,active.is.null').order('name');
      if (error) throw error;
      if (data) {
        setProducts(data);
        try {
          sessionStorage.setItem('pc_products_cache', JSON.stringify(data));
        } catch (e) {
          console.warn('Could not cache products to sessionStorage:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
    fetchProducts(); 
  }, []);

  const filtered = useMemo(() => products.filter(p => {
    const matchCat = category === 'All' || p.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    return matchCat && matchSearch;
  }), [products, search, category]);

  const cartItems = Object.values(cart || {});
  const cartCount = cartItems.reduce((s, i) => s + (i?.qty || 0), 0);
  const cartTotal = cartItems.reduce((s, i) => s + (i?.qty || 0) * (i?.product?.price || 0), 0);

  const addToCart = (product) => {
    if (!product) return;
    const safeCart = cart || {};
    const currentQty = safeCart[product.id]?.qty || 0;
    if (product.stock_qty !== null && product.stock_qty !== undefined && currentQty >= product.stock_qty) {
      alert(`Cannot add more. Only ${product.stock_qty} items in stock.`);
      return;
    }
    onCartChange(prev => {
      const safePrev = prev && typeof prev === 'object' ? prev : {};
      return {
        ...safePrev,
        [product.id]: safePrev[product.id]
          ? { ...safePrev[product.id], qty: safePrev[product.id].qty + 1 }
          : { product, qty: 1 },
      };
    });
  };

  const removeFromCart = (productId) => {
    if (!productId) return;
    onCartChange(prev => {
      const safePrev = prev && typeof prev === 'object' ? prev : {};
      const next = { ...safePrev };
      if (!next[productId]) return next;
      if (next[productId].qty <= 1) delete next[productId];
      else next[productId] = { ...next[productId], qty: next[productId].qty - 1 };
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
      cartItems.map(i => ({ order_id: order.id, product_id: i.product.id, qty: i.qty, unit_price: i.product.price }))
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
    fetchProducts();
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
        name: 'Simple Implant',
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <PremiumLoader text="Loading catalog..." />
    </div>
  );

  return (
    <div style={{ paddingBottom: 100 }}>
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

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-dim))', pointerEvents: 'none' }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
          style={{ width: '100%', padding: '12px 14px 12px 38px', background: 'hsl(var(--bg-card))', border: '1.5px solid hsl(var(--border-color))', borderRadius: 12, fontSize: '0.88rem', color: 'hsl(var(--text-primary))', outline: 'none', fontFamily: 'Outfit', boxSizing: 'border-box', transition: 'all 0.2s ease' }}
          onFocus={e => { e.target.style.borderColor = '#0ea5e9'; e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.15)'; }}
          onBlur={e => { e.target.style.borderColor = 'hsl(var(--border-color))'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Category chips */}
      <div className="cat-scroll" style={{ display: 'flex', gap: 7, overflowX: 'auto', marginBottom: 20, paddingBottom: 4, scrollbarWidth: 'none' }}>
        <style>{`.cat-scroll::-webkit-scrollbar{display:none}`}</style>
        {categoriesList.map(cat => (
          <button key={cat} className="cat-chip" onClick={() => setCategory(cat)} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, fontFamily: 'Outfit', border: '1.5px solid', cursor: 'pointer', transition: 'all 0.2s', background: category === cat ? '#0ea5e9' : 'transparent', borderColor: category === cat ? '#0ea5e9' : 'hsl(var(--border-color))', color: category === cat ? '#fff' : 'hsl(var(--text-muted))' }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <EmptyStateCard 
          icon={Package} 
          title="No Products Found" 
          message="Try a different search or category to find what you're looking for." 
        />
      ) : (
        <div className="product-catalog-grid">
          {filtered.map(p => {
            const cs = catConfig[p.category] || DEFAULT_CAT;
            const inCart = (cart || {})[p.id];
            const outOfStock = p.stock_qty === null || p.stock_qty === undefined || p.stock_qty <= 0;
            const lowStock = !outOfStock && p.stock_qty <= 5;
            const images = getProductImages(p);
            return (
              <div 
                key={p.id} 
                onClick={() => { setSelectedProduct(p); setCarouselIndex(0); }}
                style={{
                  background: 'hsl(var(--bg-card))', borderRadius: 16, padding: '14px 12px',
                  display: 'flex', flexDirection: 'column', gap: 8,
                  border: inCart ? '1.5px solid #0ea5e9' : '1px solid hsl(var(--border-color))',
                  boxShadow: inCart ? '0 4px 16px rgba(14,165,233,0.15)' : '0 2px 8px rgba(15,23,42,0.04)',
                  position: 'relative', overflow: 'hidden', transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = inCart 
                    ? '0 6px 20px rgba(14,165,233,0.22)' 
                    : '0 6px 16px rgba(15,23,42,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = inCart 
                    ? '0 4px 16px rgba(14,165,233,0.15)' 
                    : '0 2px 8px rgba(15,23,42,0.04)';
                }}
              >
                {/* Product Image Thumbnail */}
                <div style={{ width: '100%', height: 110, borderRadius: 12, overflow: 'hidden', background: 'hsl(var(--bg-dark))', border: '1px solid hsl(var(--border-color))', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {images && images.length > 0 ? (
                    <img src={images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div style={{ fontSize: '2.5rem', color: cs.color }}>{cs.icon}</div>
                  )}
                </div>

                <span style={{ fontSize: '0.55rem', fontWeight: 800, color: cs.color, background: cs.bg, padding: '2px 7px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.06em', alignSelf: 'flex-start' }}>
                  {p.category || 'General'}
                </span>

                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {(p.name || '').replace(/`/g, '')}
                </div>

                {p.description && (
                  <div style={{ fontSize: '0.64rem', color: 'hsl(var(--text-muted))', lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {p.description}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 4 }}>
                  <span style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1rem', color: 'hsl(var(--text-primary))' }}>
                    ₹{p.price?.toLocaleString('en-IN')}
                  </span>
                  <span style={{ fontSize: '0.58rem', fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: outOfStock ? 'rgba(239,68,68,0.1)' : lowStock ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981' }}>
                    {outOfStock ? 'Out of Stock' : lowStock ? `${p.stock_qty} left` : 'In Stock'}
                  </span>
                </div>

                {outOfStock ? (
                  <div style={{ textAlign: 'center', fontSize: '0.66rem', color: 'hsl(var(--text-dim))', padding: '6px 0', borderTop: '1px solid hsl(var(--border-color))' }}>Currently unavailable</div>
                ) : inCart ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)', borderRadius: 12, padding: '4px 6px' }}>
                    <button 
                      className="qty-btn"
                      onClick={(e) => { e.stopPropagation(); removeFromCart(p.id); }} 
                    >
                      <Minus size={13} strokeWidth={2.5} />
                    </button>
                    <span 
                      onClick={(e) => { e.stopPropagation(); setCartOpen(true); }} 
                      style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0ea5e9', fontFamily: 'Outfit', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, transition: 'background 0.15s' }}
                      title="View Cart"
                    >{inCart.qty}</span>
                    <button 
                      className="qty-btn"
                      onClick={(e) => { e.stopPropagation(); addToCart(p); }} 
                      disabled={p.stock_qty !== null && p.stock_qty !== undefined && inCart.qty >= p.stock_qty}
                    >
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); addToCart(p); }} style={{ width: '100%', padding: '8px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, boxShadow: '0 3px 10px rgba(14,165,233,0.25)' }}>
                    <Plus size={13} /> Add to Cart
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating cart pill */}
      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          style={{ position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', border: 'none', borderRadius: 24, padding: '13px 24px', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', fontWeight: 800, fontFamily: 'Outfit', cursor: 'pointer', boxShadow: '0 10px 32px rgba(14,165,233,0.45)', whiteSpace: 'nowrap' }}
        >
          <ShoppingCart size={17} />
          <span>{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
          <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.35)' }} />
          <span>₹{cartTotal.toLocaleString('en-IN')}</span>
        </button>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}>
          <style>{`
            @keyframes cartFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes cartSlideDown {
              from { transform: translateY(-20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          <div onClick={() => setCartOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', animation: 'cartFadeIn 0.2s ease-out' }} />
          <div style={{ 
            position: 'relative', 
            marginTop: '5vh', 
            background: 'hsl(var(--bg-card))', 
            borderRadius: '24px', 
            width: '100%',
            maxWidth: '620px', 
            maxHeight: '85vh', 
            display: 'flex', 
            flexDirection: 'column', 
            boxShadow: '0 24px 64px rgba(15,23,42,0.25)', 
            border: '1px solid hsl(var(--border-color))',
            animation: 'cartSlideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 20px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.2rem', color: 'hsl(var(--text-primary))', margin: 0 }}>Your Cart</h3>
                  <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', margin: '2px 0 0' }}>{cartCount} item{cartCount !== 1 ? 's' : ''}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {cartItems.length > 0 && (
                    <button onClick={clearCart} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit', transition: 'all 0.2s' }}>Clear All</button>
                  )}
                  <button 
                    onClick={() => setCartOpen(false)} 
                    style={{ background: 'hsl(var(--bg-dark))', border: '1px solid hsl(var(--border-color))', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '8px', width: '28px', height: '28px', transition: 'all 0.2s' }}
                  >
                    <X size={15} strokeWidth={2.5} color="hsl(var(--text-primary))" />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: '16px' }}>
              {cartItems.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '220px', gap: '12px', color: 'hsl(var(--text-muted))', textAlign: 'center' }}>
                  <ShoppingCart size={40} strokeWidth={1.5} color="hsl(var(--text-dim))" />
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0, fontFamily: 'Outfit', color: 'hsl(var(--text-primary))' }}>Your cart is empty</p>
                  <p style={{ fontSize: '0.72rem', margin: 0, maxWidth: '220px', lineHeight: 1.5 }}>Please add some products from the catalog first.</p>
                </div>
              ) : (
                cartItems.map(({ product: p, qty }) => {
                  const cs = catConfig[p.category] || DEFAULT_CAT;
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'hsl(var(--bg-dark))', borderRadius: 14, border: '1px solid hsl(var(--border-color))' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: cs.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{cs.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'hsl(var(--text-primary))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', marginTop: 1 }}>₹{p.price?.toLocaleString('en-IN')}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button 
                          className="qty-btn"
                          onClick={() => removeFromCart(p.id)} 
                        >
                          <Minus size={11} strokeWidth={2.5} />
                        </button>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, minWidth: 16, textAlign: 'center', fontFamily: 'Outfit' }}>{qty}</span>
                        <button 
                          className="qty-btn"
                          onClick={() => addToCart(p)} 
                          disabled={p.stock_qty !== null && p.stock_qty !== undefined && qty >= p.stock_qty}
                        >
                          <Plus size={11} strokeWidth={2.5} />
                        </button>
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'hsl(var(--primary))', minWidth: 60, textAlign: 'right', fontFamily: 'Outfit' }}>
                        ₹{(qty * p.price).toLocaleString('en-IN')}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {cartItems.length > 0 && (
              <div style={{ padding: '16px 20px 20px', borderTop: '1px solid hsl(var(--border-color))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', background: 'hsl(var(--bg-dark))' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Amount</span>
                  <span style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.3rem', color: 'hsl(var(--primary))' }}>₹{(cartTotal * 1.12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  <span style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))' }}>Incl. 12% GST</span>
                </div>
                <button
                  onClick={placeOrder} disabled={placing}
                  style={{ 
                    padding: '12px 22px', 
                    borderRadius: 12, 
                    border: 'none', 
                    background: placing ? 'hsl(var(--border-color))' : 'linear-gradient(135deg, hsl(var(--primary)), #6366f1)', 
                    color: '#fff', 
                    fontSize: '0.85rem', 
                    fontWeight: 800, 
                    cursor: placing ? 'not-allowed' : 'pointer', 
                    fontFamily: 'Outfit', 
                    boxShadow: placing ? 'none' : '0 6px 18px rgba(14,165,233,0.3)', 
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {placing ? 'Placing...' : 'Place Order'}
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (() => {
        const images = getProductImages(selectedProduct);
        const inCart = (cart || {})[selectedProduct.id];
        const outOfStock = selectedProduct.stock_qty === null || selectedProduct.stock_qty === undefined || selectedProduct.stock_qty <= 0;
        const lowStock = !outOfStock && selectedProduct.stock_qty <= 5;
        const cs = catConfig[selectedProduct.category] || DEFAULT_CAT;

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, boxSizing: 'border-box' }}>
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
              style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', animation: 'fadeIn 0.2s ease-out' }} 
            />
            
            <div style={{ position: 'relative', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 24, width: '100%', maxWidth: 440, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(15, 23, 42, 0.25)', animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)', zIndex: 1 }}>
              
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
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: 0.45 }}>
                    <div style={{ fontSize: '4rem' }}>{cs.icon}</div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'hsl(var(--text-muted))', fontFamily: 'Outfit' }}>No images uploaded</span>
                  </div>
                )}

                {/* Close Button overlay */}
                <button 
                  className="modal-close-btn dark-overlay"
                  onClick={() => { setSelectedProduct(null); setCarouselIndex(0); }} 
                  style={{ 
                    position: 'absolute', 
                    top: 14, 
                    right: 14, 
                    zIndex: 10
                  }}
                >
                  <X size={15} strokeWidth={2.5} />
                </button>

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

              {/* Product Info */}
              <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: cs.color, background: cs.bg, padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'inline-block', marginBottom: 6 }}>
                      {selectedProduct.category || 'General'}
                    </span>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', margin: 0, lineHeight: 1.3, wordBreak: 'break-word' }}>
                      {(selectedProduct.name || '').replace(/`/g, '')}
                    </h2>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.25rem', color: '#0ea5e9' }}>
                      ₹{selectedProduct.price?.toLocaleString('en-IN')}
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
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: outOfStock ? 'rgba(239,68,68,0.1)' : lowStock ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', color: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981' }}>
                    {outOfStock ? 'Out of Stock' : lowStock ? `Only ${selectedProduct.stock_qty} left` : 'In Stock'}
                  </span>
                  {selectedProduct.sku && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'hsl(var(--bg-dark))', border: '1px solid hsl(var(--border-color))', color: 'hsl(var(--text-muted))' }}>
                      SKU: {selectedProduct.sku}
                    </span>
                  )}
                  {selectedProduct.is_serialized && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: 'rgba(168,85,247,0.08)', color: '#a855f7' }}>
                      Tracked by Serial
                    </span>
                  )}
                </div>

                {/* B2C Product Details Grid */}
                <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: 12 }}>
                  <h4 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px 0' }}>Product Details</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'hsl(var(--bg-dark))', padding: 12, borderRadius: 12, border: '1px solid hsl(var(--border-color))' }}>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Stock Qty</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981', marginTop: 2 }}>
                        {outOfStock ? '0 (Out)' : `${selectedProduct.stock_qty} units`}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Availability</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: outOfStock ? '#ef4444' : lowStock ? '#f59e0b' : '#10b981', marginTop: 2 }}>
                        {outOfStock ? 'Out of Stock' : lowStock ? `Low — ${selectedProduct.stock_qty} left` : '✅ Available'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Category</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: cs.color, marginTop: 2 }}>{selectedProduct.category || 'General'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Listing Status</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: selectedProduct.active === false ? '#ef4444' : '#10b981', marginTop: 2 }}>
                        {selectedProduct.active === false ? 'Inactive ❌' : 'Active ✅'}
                      </div>
                    </div>
                    {selectedProduct.sku && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>SKU / Product Code</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 2, fontFamily: 'monospace' }}>{selectedProduct.sku}</div>
                      </div>
                    )}
                    {selectedProduct.unit && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '0.6rem', color: 'hsl(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase' }}>Unit</div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'hsl(var(--text-primary))', marginTop: 2 }}>per {selectedProduct.unit}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedProduct.description && (
                  <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: 12 }}>
                    <h4 style={{ fontSize: '0.72rem', fontWeight: 800, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px 0' }}>Description</h4>
                    <p style={{ fontSize: '0.78rem', color: 'hsl(var(--text-primary))', lineHeight: 1.5, margin: 0, maxHeight: 110, overflowY: 'auto' }}>
                      {selectedProduct.description}
                    </p>
                  </div>
                )}

                {/* Action Footer */}
                <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: 16, marginTop: 4 }}>
                  {outOfStock ? (
                    <div style={{ padding: '12px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, color: '#ef4444', fontSize: '0.78rem', textAlign: 'center', fontWeight: 800, fontFamily: 'Outfit' }}>
                      🚫 Currently Out of Stock
                    </div>
                  ) : inCart ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(14,165,233,0.08)', borderRadius: 14, padding: '8px 12px', border: '1.5px solid #0ea5e9' }}>
                      <button 
                        className="qty-btn"
                        onClick={() => removeFromCart(selectedProduct.id)} 
                      >
                        <Minus size={14} strokeWidth={2.5} />
                      </button>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span 
                          onClick={() => { setSelectedProduct(null); setCartOpen(true); }}
                          style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0ea5e9', fontFamily: 'Outfit', cursor: 'pointer', padding: '2px 8px', borderRadius: 6, transition: 'background 0.15s' }}
                          title="View Cart"
                        >{inCart.qty}</span>
                        <span style={{ fontSize: '0.58rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>IN CART</span>
                      </div>
                      <button 
                        className="qty-btn"
                        onClick={() => addToCart(selectedProduct)} 
                        disabled={selectedProduct.stock_qty !== null && selectedProduct.stock_qty !== undefined && inCart.qty >= selectedProduct.stock_qty}
                      >
                        <Plus size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => addToCart(selectedProduct)} 
                      style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'Outfit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 16px rgba(14,165,233,0.3)' }}
                    >
                      <Plus size={16} /> Add to Cart
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
