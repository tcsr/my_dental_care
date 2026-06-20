import { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, Sparkles } from 'lucide-react';
import { t } from '../utils/i18n';
import { db } from '../utils/db';

export default function AiAssistant({ lang, isOpen, onClose }) {
  const [messages, setMessages] = useState(() => [
    {
      id: 1,
      sender: 'bot',
      text: t('aiWelcome', lang)
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const idRef = useRef(2);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const faqs = [
    { q: t('faqQ1', lang), a: t('faqA1', lang) },
    { q: t('faqQ2', lang), a: t('faqA2', lang) },
    { q: t('faqQ3', lang), a: t('faqA3', lang) },
    { q: t('faqQ4', lang), a: t('faqA4', lang) }
  ];

  const handleSend = (text) => {
    if (!text.trim()) return;

    // User Message
    const userMsg = {
      id: idRef.current++,
      sender: 'user',
      text
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    // Dynamic database querying response generator
    setTimeout(async () => {
      let replyText = '';
      const query = text.toLowerCase().trim();
      
      try {
        if (query.includes('stock') || query.includes('inventory') || query.includes('minstock') || query.includes('low')) {
          const products = await db.b2bProducts.toArray();
          const lowStockItems = products.filter(p => p.stock < p.minStock);
          if (lowStockItems.length > 0) {
            replyText = `Live Catalog Status: There are ${lowStockItems.length} products below safety levels. Critical items: ${lowStockItems.map(p => `${p.name} (Stock: ${p.stock}/${p.minStock})`).join(', ')}. Restocking POs recommended.`;
          } else {
            replyText = `Live Catalog Status: All product stock levels are fully optimized and exceed safety thresholds.`;
          }
        } 
        else if (query.includes('sales') || query.includes('revenue') || query.includes('order') || query.includes('invoice') || query.includes('money') || query.includes('rupee') || query.includes('₹')) {
          const orders = await db.b2bOrders.toArray();
          const totalSales = orders.reduce((sum, o) => sum + (o.finalAmount || 0), 0);
          const unpaid = orders.filter(o => o.paymentStatus === 'Unpaid');
          replyText = `Live Orders Status: Registered ${orders.length} invoices. Total volume: ₹${totalSales.toLocaleString('en-IN')}. Outstanding balance unpaid: ${unpaid.length} invoices needing collection action.`;
        } 
        else if (query.includes('client') || query.includes('clinic') || query.includes('doctor') || query.includes('hospital')) {
          const clients = await db.b2bClients.toArray();
          replyText = `Live Clinic Register: ${clients.length} active Doctor/Hospital clinics registered in the directory with distinct regional discount tiers.`;
        } 
        else if (query.includes('case') || query.includes('implant') || query.includes('timeline') || query.includes('patient')) {
          const cases = await db.implantCases.toArray();
          const planning = cases.filter(c => c.stage === 'Planning').length;
          const surgical = cases.filter(c => c.stage === 'Surgical (Fixture)').length;
          const healing = cases.filter(c => c.stage === 'Healing (Abutment)').length;
          const prosthetic = cases.filter(c => c.stage === 'Prosthetic (Crown)').length;
          const completed = cases.filter(c => c.stage === 'Completed').length;
          replyText = `Live Implant Pipelines: Tracking ${cases.length} cases. Pipeline Breakdown - Planning: ${planning}, Surgical (Fixture): ${surgical}, Healing (Abutment): ${healing}, Prosthetic (Crown): ${prosthetic}, Completed: ${completed}.`;
        }
        else {
          const matchedFaq = faqs.find(f => f.q.toLowerCase().includes(query) || query.includes(f.q.toLowerCase()));
          if (matchedFaq) {
            replyText = matchedFaq.a;
          } else {
            replyText = `I am your Lal Dental Care AI assistant, connected to your live local B2B database. You can ask me queries like:
- "Show me outstanding sales and unpaid invoices"
- "Are there any low stock inventory items?"
- "What is the status of patient implant cases?"
- "List our registered doctor clinics count"`;
          }
        }
      } catch (err) {
        console.error(err);
        replyText = `Database query error: ${err.message}`;
      }

      setMessages(prev => [...prev, {
        id: idRef.current++,
        sender: 'bot',
        text: replyText
      }]);
      setIsTyping(false);
    }, 1000);
  };

  return (
    <>
      {/* Full height Chat Panel Modal */}
      {isOpen && (
        <div className="modal-overlay-container" style={{ zIndex: 999999 }}>
          <div className="modal-content-card animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
            padding: '14px 18px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={18} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: '800', margin: 0, fontFamily: 'Outfit' }}>
                  {t('aiAssistantTitle', lang)}
                </h4>
                <span style={{ fontSize: '0.62rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <Sparkles size={8} /> Active Dental Support
                </span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>

          {/* Messages List Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: 'hsl(var(--bg-dark) / 30%)'
          }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, hsl(var(--primary)), #0284c7)' : 'hsl(var(--bg-card))',
                  color: msg.sender === 'user' ? '#fff' : 'hsl(var(--text-primary))',
                  border: msg.sender === 'user' ? 'none' : '1px solid hsl(var(--border-color))',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.02)',
                  fontSize: '0.78rem',
                  lineHeight: 1.4
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '16px 16px 16px 2px',
                  background: 'hsl(var(--bg-card))',
                  border: '1px solid hsl(var(--border-color))',
                  fontSize: '0.72rem',
                  color: 'hsl(var(--text-muted))',
                  display: 'flex',
                  gap: '4px',
                  alignItems: 'center'
                }}>
                  <div style={{ width: '5px', height: '5px', background: 'hsl(var(--text-muted))', borderRadius: '50%', animation: 'dotPulse 1.2s infinite' }} />
                  <div style={{ width: '5px', height: '5px', background: 'hsl(var(--text-muted))', borderRadius: '50%', animation: 'dotPulse 1.2s infinite 0.2s' }} />
                  <div style={{ width: '5px', height: '5px', background: 'hsl(var(--text-muted))', borderRadius: '50%', animation: 'dotPulse 1.2s infinite 0.4s' }} />
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Suggested Prompts Grid */}
          <div style={{
            padding: '10px 12px 6px',
            background: 'hsl(var(--bg-card))',
            borderTop: '1px solid hsl(var(--border-color))'
          }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '6px' }}>
              💡 {t('aiSuggestedQueries', lang)}
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {faqs.map((faq, index) => (
                <button
                  key={index}
                  onClick={() => handleSend(faq.q)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'hsl(var(--bg-dark))',
                    border: '1px solid hsl(var(--border-color))',
                    color: 'hsl(var(--text-primary))',
                    fontSize: '0.68rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'hsl(var(--primary))';
                    e.currentTarget.style.background = 'hsl(var(--primary-glow))';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'hsl(var(--border-color))';
                    e.currentTarget.style.background = 'hsl(var(--bg-dark))';
                  }}
                >
                  {faq.q}
                </button>
              ))}
            </div>
          </div>

          {/* Form Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputVal);
            }}
            style={{
              padding: '10px 12px',
              background: 'hsl(var(--bg-card))',
              borderTop: '1px solid hsl(var(--border-color))',
              display: 'flex',
              gap: '8px'
            }}
          >
            <input
              type="text"
              placeholder={t('aiAskPlaceholder', lang)}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: '0.78rem',
                borderRadius: '12px',
                border: '1px solid hsl(var(--border-color))',
                background: 'hsl(var(--bg-dark))',
                outline: 'none',
                color: 'hsl(var(--text-primary))'
              }}
            />
            <button
              type="submit"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, #0284c7 100%)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(139, 92, 246, 0.2)'
              }}
            >
              <Send size={15} />
            </button>
          </form>
          </div>
        </div>
      )}
    </>
  );
}
