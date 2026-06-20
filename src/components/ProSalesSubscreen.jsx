import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../utils/db';
import { supabase } from '../utils/supabase';
import { Trash2, UserPlus, Edit3, X, ClipboardList, TrendingUp, Landmark, Truck, ShoppingBag, FileText, Users, Download, Camera, Sparkles, Mic, MicOff, Printer, Search, BarChart2 } from 'lucide-react';
import PremiumSelect from './ui/PremiumSelect';
import { t } from '../utils/i18n';
import EmptyStateCard from './EmptyStateCard';
import SalesAnalytics from './SalesAnalytics';

const ALL_INDIAN_STATES_AND_UTS = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const getCurrentTimestamp = () => Date.now();
const getRandomTxnId = () => Math.floor(Math.random() * 1000000000);

const calculateCategoryForecast = (orders, products, category) => {
  const catOrders = orders.filter(o => {
    const prod = products.find(p => p.id === o.productIds[0]);
    return prod && (prod.category || 'Other') === category;
  });
  
  if (catOrders.length === 0) return 0;
  
  // Group by month
  const monthlySales = {};
  catOrders.forEach(o => {
    const date = new Date(o.orderDate);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    monthlySales[key] = (monthlySales[key] || 0) + (o.finalAmount || 0);
  });
  
  const salesArray = Object.keys(monthlySales)
    .sort()
    .map(key => monthlySales[key]);
    
  if (salesArray.length < 2) {
    // Single data point, project 15% increase
    return Math.round(salesArray[0] * 1.15);
  }
  
  // Linear Regression: y = mx + b
  const n = salesArray.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += salesArray[i];
    sumXY += i * salesArray[i];
    sumXX += i * i;
  }
  
  const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const b = (sumY - m * sumX) / n;
  
  // Project for next month (index n)
  const forecast = m * n + b;
  return Math.round(Math.max(forecast, salesArray[n - 1] * 0.9)); // floor at 90% of last month to be realistic
};

export default function ProSalesSubscreen({ lang, profile }) {
  const isDoctor = profile?.activeRole === 'doctor';
  const actingClientId = profile?.actingClientId ? parseInt(profile.actingClientId) : null;

  const [activeSubTab, setActiveSubTab] = useState('orders'); // 'orders' | 'quotes' | 'clients' | 'dashboard'
  const [showForecasting, setShowForecasting] = useState(false);
  const [dynamicStatesList, setDynamicStatesList] = useState([]);

  // Reset scroll to top on sub-tab change
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0 });
    }
  }, [activeSubTab]);

  // Queries
  const clients = useLiveQuery(() => db.b2bClients.toArray()) || [];
  const products = useLiveQuery(() => db.b2bProducts.toArray()) || [];
  const orders = useLiveQuery(async () => {
    if (!db || !db.b2bOrders) return [];
    const allOrders = await db.b2bOrders.toArray();
    if (isDoctor && actingClientId) {
      return allOrders.filter(o => o.clientId === actingClientId);
    }
    return allOrders;
  }, [isDoctor, actingClientId]) || [];
  // const cases = useLiveQuery(() => db.implantCases.toArray()) || [];
  const quotes = useLiveQuery(async () => {
    if (!db || !db.b2bQuotes) return [];
    const allQuotes = await db.b2bQuotes.toArray();
    if (isDoctor && actingClientId) {
      return allQuotes.filter(q => q.clientId === actingClientId);
    }
    return allQuotes;
  }, [isDoctor, actingClientId]) || [];
  const challans = useLiveQuery(() => db.deliveryChallans.toArray()) || [];
  // const creditNotes = useLiveQuery(() => db.creditNotes.toArray()) || [];
  const crmLogs = useLiveQuery(() => db.crmLogs.toArray()) || [];
  const states = useLiveQuery(() => db.b2bStates.toArray()) || [];

  const dbStateNames = states.map(s => s.name);
  const allStatesUnique = Array.from(new Set([...ALL_INDIAN_STATES_AND_UTS, ...dynamicStatesList, ...dbStateNames])).sort();


  // Form states - New Client
  const [clientName, setClientName] = useState('');
  const [clientType, setClientType] = useState('Doctor');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [discountTier, setDiscountTier] = useState('Standard');
  const [clientState, setClientState] = useState('Telangana');
  const [customCreditLimit, setCustomCreditLimit] = useState('200000');
  const [clientImage, setClientImage] = useState('');

  // Edit Client States
  const [editingClient, setEditingClient] = useState(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientType, setEditClientType] = useState('Doctor');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDiscountTier, setEditDiscountTier] = useState('Standard');
  const [editClientState, setEditClientState] = useState('Telangana');
  const [editCreditLimit, setEditCreditLimit] = useState('200000');
  const [editClientImage, setEditClientImage] = useState('');

  const handleFileChange = (e, callback) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert('Image size too big! Please select an image under 1MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // New Order placement states
  const [selectedClientId, setSelectedClientId] = useState(() => {
    const isDoc = profile?.activeRole === 'doctor';
    const actId = profile?.actingClientId ? parseInt(profile.actingClientId) : null;
    return isDoc && actId ? actId.toString() : '';
  });
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customDiscount, setCustomDiscount] = useState('');
  const [selectedBatchNo, setSelectedBatchNo] = useState('');

  // Invoice Modal State
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

  // Collect Payment Modal State
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');

  // Dispatch Challan Form State
  const [challanOrderId, setChallanOrderId] = useState(null);
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  // Quotes Form State
  const [quoteClientId, setQuoteClientId] = useState(() => {
    const isDoc = profile?.activeRole === 'doctor';
    const actId = profile?.actingClientId ? parseInt(profile.actingClientId) : null;
    return isDoc && actId ? actId.toString() : '';
  });
  const [quoteProductId, setQuoteProductId] = useState('');
  const [quoteQty, setQuoteQty] = useState(1);

  // GST Rates States
  const [gstRates, setGstRates] = useState(profile?.gstRates || [5, 12, 18, 28]);
  const [selectedGstRate, setSelectedGstRate] = useState(() => profile?.defaultGstRate || 12);
  const [quoteGstRate, setQuoteGstRate] = useState(() => profile?.defaultGstRate || 12);

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const { data, error } = await supabase.from('gst_rates').select('*').order('rate');
        if (error) throw error;
        if (data && data.length > 0) {
          const rates = data.map(r => r.rate);
          setGstRates(rates);
          const def = data.find(r => r.is_default);
          if (def) {
            setSelectedGstRate(def.rate);
            setQuoteGstRate(def.rate);
          }
        }
      } catch (e) {
        console.warn('Fallback to local GST rates:', e);
      }

      try {
        const { data, error } = await supabase.from('states').select('*').eq('active', true).order('name');
        if (error) throw error;
        if (data && data.length > 0) {
          setDynamicStatesList(data.map(s => s.name));
        }
      } catch (e) {
        console.warn('Fallback to local states:', e);
      }
    };
    fetchLookups();
  }, [profile]);



  // CRM logs state
  const [selectedCrmClientId, setSelectedCrmClientId] = useState(null);
  const [crmNote, setCrmNote] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedChallan, setSelectedChallan] = useState(null);

  const handleStartVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onerror = (event) => {
      console.error(event);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setCrmNote(prev => prev ? prev + ' ' + transcript : transcript);
    };

    recognition.start();
  };

  const exportOrdersToCSV = () => {
    try {
      const headers = ['Order ID', 'Client Name', 'Product SKU', 'Qty', 'Base Amount', 'GST Paid', 'Amount Paid', 'Status', 'Payment Status', 'Order Date'];
      const rows = orders.map(order => {
        const client = clients.find(c => c.id === order.clientId);
        const firstProd = products.find(p => p.id === order.productIds[0]);
        return [
          order.id,
          client ? `"${client.name.replace(/"/g, '""')}"` : 'Unknown Client',
          firstProd ? firstProd.sku : 'N/A',
          order.qty || 1,
          order.finalAmount,
          order.gstPaid || 0,
          order.amountPaid || 0,
          order.status || 'Pending',
          order.paymentStatus || 'Unpaid',
          new Date(order.orderDate).toLocaleDateString()
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "lal_dental_sales_orders.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("CSV Export error", err);
    }
  };

  // Directory Search, Filter, and Pagination States
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientFilterType, setClientFilterType] = useState('All');
  const [clientFilterTier, setClientFilterTier] = useState('All');
  const [clientFilterState, setClientFilterState] = useState('All');
  const [clientCurrentPage, setClientCurrentPage] = useState(1);
  const clientsPerPage = 4;

  // Search & Pagination for Orders and Quotes
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('all'); // 'all' | 'Paid' | 'Unpaid'
  const [orderDispatchFilter, setOrderDispatchFilter] = useState('all'); // 'all' | 'Pending' | 'Dispatched' | 'Transit' | 'Delivered'
  const [quoteSearchQuery, setQuoteSearchQuery] = useState('');
  const [quoteCurrentPage, setQuoteCurrentPage] = useState(1);
  const ordersPerPage = 5;
  const quotesPerPage = 5;

  const filteredOrders = orders.filter(order => {
    const client = clients.find(c => c.id === order.clientId);
    const product = products.find(p => p.id === order.productIds[0]);
    const challan = challans.find(ch => ch.orderId === order.id);
    const query = orderSearchQuery.toLowerCase();
    
    const matchesQuery = (
      (client?.name || '').toLowerCase().includes(query) ||
      (product?.name || '').toLowerCase().includes(query) ||
      order.id.toString().includes(query) ||
      order.status.toLowerCase().includes(query)
    );

    const matchesPayment = orderPaymentFilter === 'all' || order.paymentStatus === orderPaymentFilter;
    
    let matchesDispatch = true;
    if (orderDispatchFilter !== 'all') {
      const challanStatus = challan ? challan.status : 'Pending';
      if (orderDispatchFilter === 'Pending') {
        matchesDispatch = !challan || challanStatus === 'Pending';
      } else {
        matchesDispatch = challanStatus === orderDispatchFilter;
      }
    }

    return matchesQuery && matchesPayment && matchesDispatch;
  });
  const totalOrdersCount = filteredOrders.length;
  const totalOrderPages = Math.ceil(totalOrdersCount / ordersPerPage) || 1;
  const displayedOrders = filteredOrders.slice((orderCurrentPage - 1) * ordersPerPage, orderCurrentPage * ordersPerPage);

  const filteredQuotes = quotes.filter(q => {
    const client = clients.find(c => c.id === q.clientId);
    const product = products.find(p => p.id === q.productIds[0]);
    const query = quoteSearchQuery.toLowerCase();
    return (
      (client?.name || '').toLowerCase().includes(query) ||
      (product?.name || '').toLowerCase().includes(query) ||
      q.id.toString().includes(query) ||
      q.status.toLowerCase().includes(query)
    );
  });
  const totalQuotesCount = filteredQuotes.length;
  const totalQuotePages = Math.ceil(totalQuotesCount / quotesPerPage) || 1;
  const displayedQuotes = filteredQuotes.slice((quoteCurrentPage - 1) * quotesPerPage, quoteCurrentPage * quotesPerPage);

  // Helper: Calculate Outstanding Balance for a client
  const getClientOutstanding = (clientId) => {
    const clientOrders = orders.filter(o => o.clientId === clientId);
    return clientOrders.reduce((acc, curr) => {
      const orderTotal = (curr.finalAmount || 0) + (curr.gstPaid || 0);
      const outstanding = orderTotal - (curr.amountPaid || 0);
      return acc + outstanding;
    }, 0);
  };

  // Compute KPI Vitals
  // const totalSalesVal = orders.reduce((acc, curr) => acc + (curr.finalAmount || 0), 0);
  // const pendingCollectionVal = orders.reduce((acc, curr) => {
  //   const totalOrder = (curr.finalAmount || 0) + (curr.gstPaid || 0);
  //   return acc + (totalOrder - (curr.amountPaid || 0));
  // }, 0);
  // const activeCasesVal = cases.filter(c => c.stage !== 'Completed').length;

  const handleAddClient = async (e) => {
    e.preventDefault();
    if (!clientName) return;
    await db.b2bClients.add({
      name: clientName,
      type: clientType,
      contactPerson,
      email,
      phone,
      address,
      discountTier,
      state: clientState,
      creditLimit: parseFloat(customCreditLimit) || 200000,
      image: clientImage
    });
    setClientName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCustomCreditLimit('200000');
    setClientImage('');
    alert('Client registered successfully!');
  };

  const startEditClient = (client) => {
    setEditingClient(client);
    setEditClientName(client.name || '');
    setEditClientType(client.type || 'Doctor');
    setEditContactPerson(client.contactPerson || '');
    setEditEmail(client.email || '');
    setEditPhone(client.phone || '');
    setEditAddress(client.address || '');
    setEditDiscountTier(client.discountTier || 'Standard');
    setEditClientState(client.state || 'Telangana');
    setEditCreditLimit(client.creditLimit ? String(client.creditLimit) : '200000');
    setEditClientImage(client.image || '');

    // Reset scroll position of modal to top
    setTimeout(() => {
      const modalOverlay = document.querySelector('.modal-overlay-container');
      if (modalOverlay) {
        modalOverlay.scrollTop = 0;
      }
    }, 50);
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    if (!editingClient || !editClientName) return;
    await db.b2bClients.update(editingClient.id, {
      name: editClientName,
      type: editClientType,
      contactPerson: editContactPerson,
      email: editEmail,
      phone: editPhone,
      address: editAddress,
      discountTier: editDiscountTier,
      state: editClientState,
      creditLimit: parseFloat(editCreditLimit) || 200000,
      image: editClientImage
    });
    setEditingClient(null);
    setEditClientImage('');
    alert('Client details updated successfully!');
  };

  const handleDeleteOrder = async (id) => {
    if (await confirm('Are you sure you want to delete this sales order permanently?')) {
      await db.b2bOrders.delete(id);
      alert('Sales order deleted successfully.');
    }
  };

  const handleDeleteQuote = async (id) => {
    if (await confirm('Are you sure you want to delete this quotation permanently?')) {
      await db.b2bQuotes.delete(id);
      alert('Quotation deleted successfully.');
    }
  };

  // Place B2B Sales Order with limits checking
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!selectedClientId || !selectedProductId || quantity <= 0) {
      alert('Please fill out client, product, and quantity details.');
      return;
    }

    const client = clients.find(c => c.id === parseInt(selectedClientId));
    const product = products.find(p => p.id === parseInt(selectedProductId));
    if (!client || !product) return;

    // Apply Tiered Discount
    let tierRate = 0;
    if (client.discountTier === 'Gold') tierRate = 0.10;
    else if (client.discountTier === 'Platinum') tierRate = 0.15;
    else if (client.discountTier === 'VIP') tierRate = 0.20;

    const baseTotal = product.price * quantity;
    let discountAmt = baseTotal * tierRate;
    if (customDiscount !== '') {
      discountAmt = parseFloat(customDiscount);
    }

    const finalAmount = Math.max(0, baseTotal - discountAmt);
    const gstPaid = finalAmount * (selectedGstRate / 100);
    const grossOrderCost = finalAmount + gstPaid;

    // Check Credit Limit Enforcement
    const currentOutstanding = getClientOutstanding(client.id);
    const limit = client.creditLimit || 200000;
    if (currentOutstanding + grossOrderCost > limit) {
      alert(`${t('creditBlockMsg', lang)}\nOutstanding: ₹${currentOutstanding.toLocaleString('en-IN')} + New Order: ₹${grossOrderCost.toLocaleString('en-IN')} exceeds limit of ₹${limit.toLocaleString('en-IN')}.`);
      return;
    }

    // Deduct stock from selected batch
    let updatedBatches = [...(product.batches || [])];
    if (selectedBatchNo) {
      const matchIndex = updatedBatches.findIndex(b => b.batchNo === selectedBatchNo);
      if (matchIndex > -1) {
        if (updatedBatches[matchIndex].stock < quantity) {
          alert(`Selected batch has insufficient stock. Only ${updatedBatches[matchIndex].stock} units available.`);
          return;
        }
        updatedBatches[matchIndex].stock -= quantity;
      }
    } else if (updatedBatches.length > 0) {
      // Automatic FIFO batch allocation
      let rem = quantity;
      for (let i = 0; i < updatedBatches.length; i++) {
        if (updatedBatches[i].stock >= rem) {
          updatedBatches[i].stock -= rem;
          rem = 0;
          break;
        } else {
          rem -= updatedBatches[i].stock;
          updatedBatches[i].stock = 0;
        }
      }
      if (rem > 0) {
        alert('Insufficient stock in all batches combined.');
        return;
      }
    }

    if (!(await confirm(`Confirm and place this B2B Sales Order for ₹${grossOrderCost.toLocaleString('en-IN')}?`))) return;

    // Update Product Stock
    await db.b2bProducts.update(product.id, {
      stock: Math.max(0, product.stock - quantity),
      batches: updatedBatches
    });

    // Calculate order profit
    const orderCostPrice = product.purchaseCost || (product.price * 0.5);
    const orderProfit = finalAmount - (orderCostPrice * quantity);

    await db.b2bOrders.add({
      clientId: client.id,
      productIds: [product.id],
      qty: quantity,
      discountAmount: discountAmt,
      finalAmount: finalAmount,
      gstRate: selectedGstRate,
      gstPaid: gstPaid,
      amountPaid: 0,
      profit: orderProfit,
      batchNo: selectedBatchNo || (product.batches?.[0]?.batchNo || 'DEFAULT'),
      status: 'In Production',
      paymentStatus: 'Unpaid',
      orderDate: Date.now(),
      dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000
    });

    setSelectedProductId('');
    setQuantity(1);
    setCustomDiscount('');
    setSelectedBatchNo('');
    alert('B2B Sales order generated and stock deducted successfully!');
  };

  // RMA - Return Merchandise Authorization / Credit Note Generator
  const handleProcessReturn = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (!(await confirm('Process return and generate credit note for this order?'))) return;

    // Generate credit note
    const refundVal = order.finalAmount + (order.gstPaid || 0);
    await db.creditNotes.add({
      clientId: order.clientId,
      orderId: order.id,
      amount: refundVal,
      date: getCurrentTimestamp()
    });

    // Return stock to product catalog
    const product = products.find(p => p.id === order.productIds[0]);
    if (product) {
      let updatedBatches = [...(product.batches || [])];
      if (updatedBatches.length > 0) {
        const batchIdx = updatedBatches.findIndex(b => b.batchNo === order.batchNo);
        if (batchIdx > -1) {
          updatedBatches[batchIdx].stock += order.qty;
        } else {
          updatedBatches[0].stock += order.qty;
        }
      }
      await db.b2bProducts.update(product.id, {
        stock: product.stock + order.qty,
        batches: updatedBatches
      });
    }

    // Set order status to returned/cancelled and write-off payment
    await db.b2bOrders.update(orderId, {
      status: 'Returned',
      amountPaid: refundVal, // sets outstanding balance to 0
      paymentStatus: 'Paid'
    });

    alert(`Credit Note of ₹${refundVal.toLocaleString('en-IN')} issued. Stock returned to inventory!`);
  };

  // Dispatch Delivery Challan
  const handleCreateChallan = async (e) => {
    e.preventDefault();
    if (!challanOrderId || !courierName) return;

    await db.deliveryChallans.add({
      orderId: parseInt(challanOrderId),
      courierName,
      trackingNumber,
      status: 'Dispatched',
      dispatchDate: Date.now()
    });

    // Update order shipping status
    await db.b2bOrders.update(parseInt(challanOrderId), { status: 'Dispatched' });

    setChallanOrderId(null);
    setCourierName('');
    setTrackingNumber('');
    alert('Delivery Challan generated. Courier information registered!');
  };

  // Add CRM Log
  const handleAddCrmLog = async (e) => {
    e.preventDefault();
    if (!selectedCrmClientId || !crmNote) return;

    await db.crmLogs.add({
      clientId: parseInt(selectedCrmClientId),
      notes: crmNote,
      date: Date.now()
    });

    setCrmNote('');
    alert('Interaction log added successfully!');
  };

  // Add Sales Quotation
  const handleCreateQuote = async (e) => {
    e.preventDefault();
    if (!quoteClientId || !quoteProductId || quoteQty <= 0) return;

    const client = clients.find(c => c.id === parseInt(quoteClientId));
    const product = products.find(p => p.id === parseInt(quoteProductId));
    if (!client || !product) return;

    // Apply Tiered Discount
    let tierRate = 0;
    if (client.discountTier === 'Gold') tierRate = 0.10;
    else if (client.discountTier === 'Platinum') tierRate = 0.15;
    else if (client.discountTier === 'VIP') tierRate = 0.20;

    const baseVal = product.price * quoteQty;
    const discountVal = baseVal * tierRate;
    const finalVal = baseVal - discountVal;

    if (!(await confirm(`Confirm and generate this B2B Sales Quote for ₹${finalVal.toLocaleString('en-IN')}?`))) return;

    await db.b2bQuotes.add({
      clientId: client.id,
      productIds: [product.id],
      qty: quoteQty,
      discountAmount: discountVal,
      finalAmount: finalVal,
      gstRate: quoteGstRate,
      status: 'Draft',
      dateCreated: Date.now()
    });

    setQuoteClientId('');
    setQuoteProductId('');
    setQuoteQty(1);
    alert('Sales quote generated successfully!');
  };

  // Convert Quote to active B2B order
  const handleConvertQuoteToOrder = async (quoteId) => {
    const q = quotes.find(qt => qt.id === quoteId);
    if (!q) return;

    if (!(await confirm('Are you sure you want to convert this quote to an active invoice order?'))) return;

    const client = clients.find(c => c.id === q.clientId);
    const product = products.find(p => p.id === q.productIds[0]);
    if (!client || !product) return;

    // Enforce credit check
    const rateFraction = (q.gstRate || 12) / 100;
    const totalOrder = q.finalAmount + (q.finalAmount * rateFraction);
    const currentOutstanding = getClientOutstanding(client.id);
    const limit = client.creditLimit || 200000;

    if (currentOutstanding + totalOrder > limit) {
      alert(`Checkout Blocked: This quote of ₹${totalOrder.toLocaleString('en-IN')} pushes client over their ₹${limit.toLocaleString('en-IN')} credit limit.`);
      return;
    }

    if (product.stock < q.qty) {
      alert(`Cannot convert quote: Insufficient inventory stock for ${product.name}.`);
      return;
    }

    // Deduct stock
    let updatedBatches = [...(product.batches || [])];
    if (updatedBatches.length > 0) {
      let rem = q.qty;
      for (let i = 0; i < updatedBatches.length; i++) {
        if (updatedBatches[i].stock >= rem) {
          updatedBatches[i].stock -= rem;
          break;
        } else {
          rem -= updatedBatches[i].stock;
          updatedBatches[i].stock = 0;
        }
      }
    }

    await db.b2bProducts.update(product.id, {
      stock: Math.max(0, product.stock - q.qty),
      batches: updatedBatches
    });

    const orderCostPrice = product.purchaseCost || (product.price * 0.5);
    const orderProfit = q.finalAmount - (orderCostPrice * q.qty);

    await db.b2bOrders.add({
      clientId: q.clientId,
      productIds: q.productIds,
      qty: q.qty,
      discountAmount: q.discountAmount,
      finalAmount: q.finalAmount,
      gstRate: q.gstRate || 12,
      gstPaid: q.finalAmount * rateFraction,
      amountPaid: 0,
      profit: orderProfit,
      batchNo: product.batches?.[0]?.batchNo || 'DEFAULT',
      status: 'In Production',
      paymentStatus: 'Unpaid',
      orderDate: getCurrentTimestamp(),
      dueDate: getCurrentTimestamp() + 7 * 24 * 60 * 60 * 1000
    });

    await db.b2bQuotes.update(quoteId, { status: 'Converted' });
    alert('Quote converted to Active Sales Invoice Order!');
  };

  // Record Payment Collect Modal Submission
  const handleCollectPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentOrder || !collectAmount) return;

    const amt = parseFloat(collectAmount);
    const currentPaid = paymentOrder.amountPaid || 0;
    const orderTotal = paymentOrder.finalAmount + (paymentOrder.gstPaid || 0);

    const nextPaid = Math.min(orderTotal, currentPaid + amt);
    const nextPaymentStatus = nextPaid >= orderTotal ? 'Paid' : 'Unpaid';

    await db.b2bOrders.update(paymentOrder.id, {
      amountPaid: nextPaid,
      paymentStatus: nextPaymentStatus
    });

    setPaymentOrder(null);
    setCollectAmount('');
    alert('Payment details recorded and outstanding balance updated.');
  };

  /* ── GST PDF Invoice Download ── */
  const handleDownloadPDF = async (order) => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const client = clients.find(c => c.id === order.clientId);
    const product = products.find(p => p.id === order.productIds?.[0]);
    if (!client || !product) return;

    const isLocalState = (client.state || 'Telangana') === 'Telangana';
    const appliedGstRate = order.gstRate || 12;
    const taxRate = appliedGstRate / 100;
    const subtotal = order.finalAmount || 0;
    const taxVal = order.gstPaid !== undefined ? order.gstPaid : subtotal * taxRate;
    const totalAmt = subtotal + taxVal;
    const paidAmt = order.amountPaid || 0;
    const outstanding = totalAmt - paidAmt;
    const invoiceDate = new Date(order.orderDate).toLocaleDateString('en-IN');
    const companyName = profile?.clinicName || 'My Dental Care';
    const companyAddress = profile?.clinicAddress || 'Hyderabad, Telangana';
    const gstNo = profile?.gstNumber || '36AAAAA1111A1Z1';

    // Amount in words helper
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const numToWords = (n) => {
      n = Math.round(n);
      if (n === 0) return 'Zero';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + numToWords(n % 100) : '');
      if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + numToWords(n % 1000) : '');
      if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + numToWords(n % 100000) : '');
      return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + numToWords(n % 10000000) : '');
    };
    const amountInWords = numToWords(Math.round(totalAmt)) + ' Rupees Only';

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW = 210, M = 14;

    // ── Header band
    doc.setFillColor(14, 165, 233); // sky-500
    doc.rect(0, 0, PW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('🦷 ' + companyName, M, 11);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text(`GSTIN: ${gstNo}   |   ${companyAddress}`, M, 17);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('TAX INVOICE', PW - M, 11, { align: 'right' });
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text(`Invoice No: DPC-${order.id}`, PW - M, 17, { align: 'right' });
    doc.text(`Date: ${invoiceDate}`, PW - M, 22, { align: 'right' });

    // Status badge
    const statusColor = outstanding <= 0 ? [16, 185, 129] : [239, 68, 68];
    doc.setFillColor(...statusColor);
    doc.roundedRect(PW - M - 24, 3, 24, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.text(outstanding <= 0 ? 'PAID' : 'DUE', PW - M - 12, 8.5, { align: 'center' });

    // ── Bill From / Bill To
    doc.setTextColor(30, 41, 59);
    let y = 36;
    doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('BILL FROM', M, y); doc.text('BILL TO', PW / 2 + 2, y);
    y += 4;
    doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59); doc.setFontSize(9);
    doc.text(companyName, M, y); doc.text(client.name, PW / 2 + 2, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(71, 85, 105);
    const fromLines = doc.splitTextToSize(companyAddress, 86);
    doc.text(fromLines, M, y + 4);
    const toLines = doc.splitTextToSize((client.address || '') + (client.state ? ', ' + client.state : ''), 86);
    doc.text(toLines, PW / 2 + 2, y + 4);
    y += Math.max(fromLines.length, toLines.length) * 4 + 10;

    // ── Line separator
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3); doc.line(M, y, PW - M, y); y += 5;

    // ── Items table
    autoTable(doc, {
      startY: y,
      head: [['Item Description', 'HSN/SAC', 'Rate (₹)', 'Qty', 'Disc (₹)', 'Amount (₹)']],
      body: [[
        product.name,
        '9021',
        product.price?.toLocaleString('en-IN') || '0',
        order.qty,
        (order.discountAmount || 0).toLocaleString('en-IN'),
        subtotal.toLocaleString('en-IN'),
      ]],
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 70 }, 1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 28, halign: 'right' }, 3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 22, halign: 'right' }, 5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: M, right: M },
    });
    y = doc.lastAutoTable.finalY + 6;

    // ── Tax summary (right-aligned box)
    const boxX = PW - M - 76, boxW = 76;
    const taxRows = isLocalState ? [
      ['Subtotal', `₹${subtotal.toLocaleString('en-IN')}`],
      ...(order.discountAmount > 0 ? [['Discount', `-₹${order.discountAmount.toLocaleString('en-IN')}`]] : []),
      ['Taxable Value', `₹${subtotal.toLocaleString('en-IN')}`],
      [`CGST @ ${appliedGstRate / 2}%`, `₹${(taxVal / 2).toFixed(2)}`],
      [`SGST @ ${appliedGstRate / 2}%`, `₹${(taxVal / 2).toFixed(2)}`],
    ] : [
      ['Subtotal', `₹${subtotal.toLocaleString('en-IN')}`],
      ...(order.discountAmount > 0 ? [['Discount', `-₹${order.discountAmount.toLocaleString('en-IN')}`]] : []),
      ['Taxable Value', `₹${subtotal.toLocaleString('en-IN')}`],
      [`IGST @ ${appliedGstRate}%`, `₹${taxVal.toFixed(2)}`],
    ];

    taxRows.forEach(([label, val], i) => {
      doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
      doc.text(label + ':', boxX + 2, y + i * 5);
      doc.text(val, boxX + boxW - 2, y + i * 5, { align: 'right' });
    });
    y += taxRows.length * 5 + 2;
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3); doc.line(boxX, y, boxX + boxW, y); y += 4;
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(14, 165, 233);
    doc.text('Gross Total:', boxX + 2, y); doc.text(`₹${totalAmt.toLocaleString('en-IN')}`, boxX + boxW - 2, y, { align: 'right' });
    y += 5;
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(16, 185, 129);
    doc.text('Amount Paid:', boxX + 2, y); doc.text(`₹${paidAmt.toLocaleString('en-IN')}`, boxX + boxW - 2, y, { align: 'right' });
    y += 5;
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.setTextColor(outstanding <= 0 ? 16 : 239, outstanding <= 0 ? 185 : 68, outstanding <= 0 ? 129 : 68);
    doc.text('Balance Due:', boxX + 2, y); doc.text(`₹${outstanding.toLocaleString('en-IN')}`, boxX + boxW - 2, y, { align: 'right' });
    y += 8;

    // ── Amount in words
    doc.setFontSize(7.5); doc.setFont('helvetica', 'italic'); doc.setTextColor(71, 85, 105);
    doc.text(`Amount in Words: ${amountInWords}`, M, y);
    y += 10;

    // ── Signature line
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3);
    doc.line(PW - M - 50, y, PW - M, y);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
    doc.text('Authorised Signature', PW - M - 25, y + 4, { align: 'center' });
    doc.text(companyName, PW - M - 25, y + 8, { align: 'center' });

    // ── Footer band
    doc.setFillColor(241, 245, 249);
    doc.rect(0, 280, PW, 17, 'F');
    doc.setFontSize(6.5); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal');
    doc.text('This is a computer-generated invoice and does not require a physical signature.', PW / 2, 287, { align: 'center' });
    doc.text(`Generated by My Dental Care App  |  ${new Date().toLocaleString('en-IN')}`, PW / 2, 292, { align: 'center' });

    doc.save(`Invoice-DPC-${order.id}.pdf`);
  };

  // Selected product batches lookup
  const currentSelectedProduct = products.find(p => p.id === parseInt(selectedProductId));

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '30px' }}>

      {/* Modern Sub-Tab Navigation Bar */}
      <div className="tab-group">
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`tab-btn ${activeSubTab === 'orders' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ShoppingBag size={14} /> {t('navSales', lang)}
        </button>
        <button
          onClick={() => setActiveSubTab('quotes')}
          className={`tab-btn ${activeSubTab === 'quotes' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FileText size={14} /> {t('tabQuotations', lang)}
        </button>
        {!isDoctor && (
          <button
            onClick={() => setActiveSubTab('clients')}
            className={`tab-btn ${activeSubTab === 'clients' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Users size={14} /> {t('manageClients', lang)}
          </button>
        )}
        {!isDoctor && (
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`tab-btn ${activeSubTab === 'dashboard' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <TrendingUp size={14} /> Stats
          </button>
        )}
        {!isDoctor && (
          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`tab-btn ${activeSubTab === 'analytics' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <BarChart2 size={14} /> Analytics
          </button>
        )}
      </div>

      {/* 1. Orders subscreen */}
      {activeSubTab === 'orders' && (
        <>
          {/* Create Sales Order */}
          <div className="glass-card" style={{ padding: '18px 20px', marginBottom: '20px', border: '1px solid hsl(var(--border-color))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))' }}>
                <ShoppingBag size={16} />
              </div>
              <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', fontWeight: '800', margin: 0 }}>
                {t('newOrder', lang)}
              </h3>
            </div>

            <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{t('selectClient', lang)}</label>
                <PremiumSelect 
                  value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} required
                  disabled={isDoctor}
                  style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))', cursor: isDoctor ? 'not-allowed' : 'default' }}
                >
                  <option value="">-- Choose Clinic --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.discountTier} Tier • {c.state || 'Telangana'})</option>
                  ))}
                </PremiumSelect>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{t('selectProduct', lang)}</label>
                  <PremiumSelect 
                    value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} required
                    style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.sku} ({p.name} - ₹{p.price})</option>
                    ))}
                  </PremiumSelect>
                </div>

                <div style={{ width: '70px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{t('quantity', lang)}</label>
                  <input 
                    type="number" min="1" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} required
                    style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} 
                  />
                </div>

                <div style={{ width: '90px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>GST %</label>
                  <PremiumSelect 
                    value={selectedGstRate} onChange={(e) => setSelectedGstRate(parseInt(e.target.value))} required
                    style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                  >
                    {gstRates.map((rate, idx) => (
                      <option key={idx} value={rate}>{rate}%</option>
                    ))}
                  </PremiumSelect>
                </div>
              </div>

              {/* Batch selection drop-down */}
              {currentSelectedProduct && currentSelectedProduct.batches && currentSelectedProduct.batches.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{t('selectBatch', lang)}</label>
                  <PremiumSelect
                    value={selectedBatchNo} onChange={(e) => setSelectedBatchNo(e.target.value)}
                    style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                  >
                    <option value="">-- Auto-Allocate (FIFO) --</option>
                    {currentSelectedProduct.batches.map((b, idx) => (
                      <option key={idx} value={b.batchNo} disabled={b.stock <= 0}>
                        {b.batchNo} (Qty: {b.stock} left in {b.location})
                      </option>
                    ))}
                  </PremiumSelect>
                </div>
              )}

              {!isDoctor && (
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{t('customDiscount', lang)}</label>
                  <input 
                    type="number" placeholder="Override standard tier rate discount" 
                    value={customDiscount} onChange={(e) => setCustomDiscount(e.target.value)}
                    style={{ width: '100%', padding: '10px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} 
                  />
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ padding: '12px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '6px', fontFamily: 'Outfit' }}>
                {t('confirmOrder', lang)}
              </button>
            </form>
          </div>

          {/* Active sales orders list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '8px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))' }}>
                  <ClipboardList size={16} />
                </div>
                <h3 style={{ fontSize: '0.88rem', fontWeight: '800', fontFamily: 'Outfit', margin: 0 }}>{t('activeOrders', lang)}</h3>
              </div>
              <button
                onClick={exportOrdersToCSV}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', fontSize: '0.68rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
              >
                <Download size={12} /> Export CSV
              </button>
            </div>

            {/* Premium Full-Width Filters Row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginBottom: '14px' }}>
              {/* Search Container - 100% Full Width */}
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-dim))', pointerEvents: 'none' }} />
                <input 
                  type="text" 
                  placeholder="Search orders..." 
                  value={orderSearchQuery} 
                  onChange={(e) => { setOrderSearchQuery(e.target.value); setOrderCurrentPage(1); }}
                  className="form-input"
                  style={{ 
                    width: '100%', 
                    height: '44px',
                    paddingLeft: '40px', 
                    paddingRight: orderSearchQuery ? '40px' : '16px',
                    borderRadius: '10px',
                    fontSize: '0.88rem'
                  }}
                />
                {orderSearchQuery && (
                  <button
                    onClick={() => { setOrderSearchQuery(''); setOrderCurrentPage(1); }}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'hsl(var(--text-muted))',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px'
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Dropdowns on the Right */}
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <PremiumSelect
                  value={orderPaymentFilter}
                  onChange={(e) => { setOrderPaymentFilter(e.target.value); setOrderCurrentPage(1); }}
                  className="form-select-sm"
                  style={{ flex: 1 }}
                >
                  <option value="all">💳 All Payments</option>
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                </PremiumSelect>
                <PremiumSelect
                  value={orderDispatchFilter}
                  onChange={(e) => { setOrderDispatchFilter(e.target.value); setOrderCurrentPage(1); }}
                  className="form-select-sm"
                  style={{ flex: 1 }}
                >
                  <option value="all">📦 All Shipping</option>
                  <option value="Pending">Pending Dispatch</option>
                  <option value="Dispatched">Dispatched</option>
                  <option value="Transit">Transit</option>
                  <option value="Delivered">Delivered</option>
                </PremiumSelect>
              </div>
            </div>
            {filteredOrders.length === 0 ? (
              <EmptyStateCard 
                icon={ShoppingBag} 
                title="No Orders Found" 
                message="No orders match your search or exist in the system." 
              />
            ) : (
              displayedOrders.map(order => {
                const client = clients.find(c => c.id === order.clientId);
                const product = products.find(p => p.id === order.productIds[0]);
              const challan = challans.find(ch => ch.orderId === order.id);

              if (!client || !product) return null;

              const totalOrderAmt = order.finalAmount + (order.gstPaid || 0);
              const remainingDue = totalOrderAmt - (order.amountPaid || 0);

              return (
                <div key={order.id} className="glass-card" style={{ padding: '14px', border: '1px solid hsl(var(--border-color))' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.55rem', color: 'hsl(var(--text-muted))' }}>Order #{order.id} • Batch: {order.batchNo}</span>
                      <h4 style={{ fontSize: '0.82rem', fontWeight: 'bold', margin: '2px 0 0' }}>{client.name}</h4>
                      <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', margin: '2px 0' }}>
                        {order.qty}x {product.sku} ({product.name})
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'hsl(var(--secondary))', display: 'block' }}>₹{totalOrderAmt.toLocaleString('en-IN')}</span>
                      <span style={{ fontSize: '0.58rem', color: 'orange' }}>Due: ₹{remainingDue.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Delivery Challan Shipping details */}
                  {challan ? (
                    <div style={{ marginTop: '8px', background: 'hsl(var(--border-color) / 15%)', padding: '6px 8px', borderRadius: '6px', fontSize: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ color: 'hsl(var(--text-primary))', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Truck size={12} /> Dispatch Status: {challan.status}
                        </span>
                        <div style={{ color: 'hsl(var(--text-muted))', marginTop: '2px' }}>
                          Carrier: {challan.courierName} • Tracking: {challan.trackingNumber || 'N/A'}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedChallan({ challan, order })}
                        style={{ border: '1px solid hsl(var(--primary))', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.6rem', fontWeight: 'bold' }}
                      >
                        Print Challan
                      </button>
                    </div>
                  ) : (
                    !isDoctor && order.status !== 'Returned' && (
                      <button
                        onClick={() => {
                          setChallanOrderId(order.id);
                        }}
                        style={{
                          marginTop: '8px', border: 'none', background: 'none', color: 'hsl(var(--primary))', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                        }}
                      >
                        <Truck size={10} /> Dispatch Delivery Challan
                      </button>
                    )
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid hsl(var(--border-color))' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setSelectedInvoiceOrder(order)}
                        className="btn-primary"
                        style={{ padding: '4px 8px', fontSize: '0.62rem', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                      >
                        {t('viewInvoice', lang)}
                      </button>
                      {!isDoctor && remainingDue > 0 && order.status !== 'Returned' && (
                        <button
                          onClick={() => {
                            setPaymentOrder(order);
                            setCollectAmount(remainingDue);
                          }}
                          style={{
                            background: 'hsl(var(--secondary) / 10%)', color: 'hsl(var(--secondary))', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 'bold', cursor: 'pointer'
                          }}
                        >
                          {t('collectPayment', lang)}
                        </button>
                      )}
                      {isDoctor && remainingDue > 0 && order.status !== 'Returned' && (
                        <button
                          onClick={() => {
                            setPaymentOrder(order);
                            setCollectAmount(remainingDue.toString());
                          }}
                          style={{
                            background: 'hsl(var(--secondary) / 10%)', color: 'hsl(var(--secondary))', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 'bold', cursor: 'pointer'
                          }}
                        >
                          💳 Pay Now
                        </button>
                      )}
                    </div>

                    {!isDoctor && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {order.status !== 'Returned' && (
                          <button
                            onClick={() => handleProcessReturn(order.id)}
                            style={{ background: 'none', border: 'none', color: 'orange', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            RMA Return
                          </button>
                        )}
                        <button onClick={() => handleDeleteOrder(order.id)} style={{ background: 'none', border: 'none', color: 'hsl(var(--color-hyper))', cursor: 'pointer' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
            )}

            {filteredOrders.length > ordersPerPage && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  disabled={orderCurrentPage === 1}
                  onClick={() => setOrderCurrentPage(prev => Math.max(1, prev - 1))}
                  style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: orderCurrentPage === 1 ? 'hsl(var(--text-muted))' : 'hsl(var(--text-primary))', cursor: orderCurrentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Prev
                </button>
                <span style={{ fontSize: '0.72rem', alignSelf: 'center', color: 'hsl(var(--text-muted))' }}>
                  Page {orderCurrentPage} of {totalOrderPages}
                </span>
                <button
                  type="button"
                  disabled={orderCurrentPage === totalOrderPages}
                  onClick={() => setOrderCurrentPage(prev => Math.min(totalOrderPages, prev + 1))}
                  style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: orderCurrentPage === totalOrderPages ? 'hsl(var(--text-muted))' : 'hsl(var(--text-primary))', cursor: orderCurrentPage === totalOrderPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* 2. Quotations subscreen */}
      {activeSubTab === 'quotes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-card" style={{ padding: '16px', border: '1px solid hsl(var(--border-color))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))' }}>
                <FileText size={16} />
              </div>
              <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', fontWeight: '800', margin: 0 }}>
                {t('createQuote', lang)}
              </h3>
            </div>
            <form onSubmit={handleCreateQuote} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('selectClient', lang)}</label>
                <PremiumSelect value={quoteClientId} onChange={(e) => setQuoteClientId(e.target.value)} required
                  disabled={isDoctor}
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', cursor: isDoctor ? 'not-allowed' : 'default' }}>
                  <option value="">-- Choose Clinic --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </PremiumSelect>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Select Product Item:</label>
                  <PremiumSelect value={quoteProductId} onChange={(e) => setQuoteProductId(e.target.value)} required
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                    <option value="">-- Choose --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.sku} ({p.name})</option>)}
                  </PremiumSelect>
                </div>
                <div style={{ width: '70px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Qty:</label>
                  <input type="number" min="1" value={quoteQty} onChange={(e) => setQuoteQty(parseInt(e.target.value) || 1)} required
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
                <div style={{ width: '95px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>GST %</label>
                  <PremiumSelect value={quoteGstRate} onChange={(e) => setQuoteGstRate(parseInt(e.target.value))} required
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                    {gstRates.map((rate, idx) => (
                      <option key={idx} value={rate}>{rate}%</option>
                    ))}
                  </PremiumSelect>
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Outfit' }}>
                Generate B2B Quotation Quote
              </button>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '8px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))' }}>
                  <ClipboardList size={16} />
                </div>
                <h3 style={{ fontSize: '0.88rem', fontWeight: '800', fontFamily: 'Outfit', margin: 0 }}>Active Quotations</h3>
              </div>
              <input 
                type="text" 
                placeholder="Search quotes..." 
                value={quoteSearchQuery} 
                onChange={(e) => { setQuoteSearchQuery(e.target.value); setQuoteCurrentPage(1); }}
                style={{ padding: '6px 10px', fontSize: '0.72rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))', width: '150px' }}
              />
            </div>
            {filteredQuotes.length === 0 ? (
              <EmptyStateCard 
                icon={FileText} 
                title="No Quotes Found" 
                message="No proforma sales quotations match your search criteria." 
              />
            ) : (
              displayedQuotes.map(q => {
                const client = clients.find(c => c.id === q.clientId);
                const product = products.find(p => p.id === q.productIds[0]);
              if (!client || !product) return null;

              return (
                <div key={q.id} className="glass-card" style={{ padding: '12px', border: '1px solid hsl(var(--border-color))' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.55rem', color: 'hsl(var(--text-dim))' }}>Quote #{q.id} • {new Date(q.dateCreated).toLocaleDateString()}</span>
                      <h4 style={{ fontSize: '0.8rem', fontWeight: 'bold', margin: '2px 0 0' }}>{client.name}</h4>
                    </div>
                    <span style={{
                      fontSize: '0.58rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '6px',
                      background: q.status === 'Converted' ? 'hsl(var(--secondary) / 10%)' : 'hsl(var(--primary) / 10%)',
                      color: q.status === 'Converted' ? 'hsl(var(--secondary))' : 'hsl(var(--primary))'
                    }}>{q.status}</span>
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: '8px', fontSize: '0.72rem', color: 'hsl(var(--text-muted))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      Qty: {q.qty}x {product.sku} ({product.name})
                      <br />
                      Total value: <strong style={{ color: 'hsl(var(--text-primary))' }}>₹{q.finalAmount.toLocaleString('en-IN')}</strong>
                    </div>

                    {q.status === 'Draft' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleConvertQuoteToOrder(q.id)}
                          className="btn-primary"
                          style={{ padding: '4px 8px', fontSize: '0.62rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          {t('convertToOrder', lang)}
                        </button>
                        <button
                          onClick={() => handleDeleteQuote(q.id)}
                          style={{ background: 'none', border: 'none', color: 'hsl(var(--color-hyper))', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
            )}

            {filteredQuotes.length > quotesPerPage && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  disabled={quoteCurrentPage === 1}
                  onClick={() => setQuoteCurrentPage(prev => Math.max(1, prev - 1))}
                  style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: quoteCurrentPage === 1 ? 'hsl(var(--text-muted))' : 'hsl(var(--text-primary))', cursor: quoteCurrentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  Prev
                </button>
                <span style={{ fontSize: '0.72rem', alignSelf: 'center', color: 'hsl(var(--text-muted))' }}>
                  Page {quoteCurrentPage} of {totalQuotePages}
                </span>
                <button
                  type="button"
                  disabled={quoteCurrentPage === totalQuotePages}
                  onClick={() => setQuoteCurrentPage(prev => Math.min(totalQuotePages, prev + 1))}
                  style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: quoteCurrentPage === totalQuotePages ? 'hsl(var(--text-muted))' : 'hsl(var(--text-primary))', cursor: quoteCurrentPage === totalQuotePages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Clients subscreen */}
      {activeSubTab === 'clients' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Register Client Form */}
          <div className="glass-card" style={{ padding: '16px', border: '1px solid hsl(var(--border-color))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))' }}>
                <UserPlus size={16} />
              </div>
              <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', fontWeight: '800', margin: 0 }}>
                {t('registerClient', lang)}
              </h3>
            </div>
            <form onSubmit={handleAddClient} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('clientName', lang)}</label>
                  <input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Clinic name"
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
                <div style={{ width: '100px' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('clientType', lang)}</label>
                  <PremiumSelect value={clientType} onChange={(e) => setClientType(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                    <option value="Doctor">Doctor</option>
                    <option value="Hospital">Hospital</option>
                  </PremiumSelect>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('discountTier', lang)}</label>
                  <PremiumSelect value={discountTier} onChange={(e) => setDiscountTier(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                    <option value="Standard">Standard (0%)</option>
                    <option value="Gold">Gold (10%)</option>
                    <option value="Platinum">Platinum (15%)</option>
                    <option value="VIP">VIP (20%)</option>
                  </PremiumSelect>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('creditLimit', lang)} (₹):</label>
                  <input type="number" value={customCreditLimit} onChange={(e) => setCustomCreditLimit(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('email', lang)}</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('phone', lang)}</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('address', lang)}</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('clinicState', lang)}</label>
                  <PremiumSelect value={clientState} onChange={(e) => setClientState(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                    {allStatesUnique.map((stateName, idx) => (
                      <option key={idx} value={stateName}>{stateName}</option>
                    ))}
                  </PremiumSelect>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Logo / Photo</label>
                  <div style={{
                    border: '2px dashed hsl(var(--border-color))',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'hsl(var(--bg-dark))',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.25s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'hsl(var(--primary))'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'hsl(var(--border-color))'}
                  >
                    <Camera size={16} style={{ color: 'hsl(var(--text-muted))' }} />
                    <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', fontWeight: 'bold' }}>
                      Drag or Select Image
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e, setClientImage)}
                      style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        opacity: 0, cursor: 'pointer'
                      }}
                    />
                  </div>
                </div>
              </div>

              {clientImage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <img src={clientImage} alt="Preview" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', border: '1px solid hsl(var(--border-color))' }} />
                  <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))' }}>Image Loaded</span>
                  <button 
                    type="button" 
                    onClick={() => setClientImage('')} 
                    style={{ 
                      border: 'none', background: 'hsl(var(--color-hyper) / 10%)', color: 'hsl(var(--color-hyper))', 
                      padding: '6px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'transform 0.2s ease, background 0.2s ease, color 0.2s ease',
                      marginLeft: '12px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.15) rotate(5deg)';
                      e.currentTarget.style.background = 'hsl(var(--color-hyper))';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                      e.currentTarget.style.background = 'hsl(var(--color-hyper) / 10%)';
                      e.currentTarget.style.color = 'hsl(var(--color-hyper))';
                    }}
                    title="Remove Image"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="submit" className="btn-primary" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Outfit' }}>
                  {t('registerBtn', lang)}
                </button>
              </div>
            </form>
          </div>

          {/* Client directory list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))' }}>
                <Users size={16} />
              </div>
              <h3 style={{ fontSize: '0.88rem', fontWeight: '800', fontFamily: 'Outfit', margin: 0 }}>{t('clientDirectory', lang)}</h3>
            </div>
            
            {/* Search and Filters Controls */}
            <div className="glass-card" style={{ padding: '12px 14px', background: 'hsl(var(--bg-card) / 50%)', border: '1px solid hsl(var(--border-color))', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <input
                  type="text"
                  placeholder="🔍 Search name, contact, phone..."
                  value={clientSearchQuery}
                  onChange={(e) => {
                    setClientSearchQuery(e.target.value);
                    setClientCurrentPage(1); // reset to page 1
                  }}
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '80px' }}>
                  <label style={{ fontSize: '0.58rem', fontWeight: 'bold', display: 'block', marginBottom: '2px', color: 'hsl(var(--text-muted))' }}>Type</label>
                  <PremiumSelect
                    value={clientFilterType}
                    onChange={(e) => {
                      setClientFilterType(e.target.value);
                      setClientCurrentPage(1);
                    }}
                    style={{ width: '100%', padding: '6px', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                  >
                    <option value="All">All Types</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Hospital">Hospital</option>
                  </PremiumSelect>
                </div>

                <div style={{ flex: 1, minWidth: '80px' }}>
                  <label style={{ fontSize: '0.58rem', fontWeight: 'bold', display: 'block', marginBottom: '2px', color: 'hsl(var(--text-muted))' }}>Tier</label>
                  <PremiumSelect
                    value={clientFilterTier}
                    onChange={(e) => {
                      setClientFilterTier(e.target.value);
                      setClientCurrentPage(1);
                    }}
                    style={{ width: '100%', padding: '6px', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                  >
                    <option value="All">All Tiers</option>
                    <option value="Standard">Standard</option>
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                    <option value="VIP">VIP</option>
                  </PremiumSelect>
                </div>

                <div style={{ flex: 1, minWidth: '80px' }}>
                  <label style={{ fontSize: '0.58rem', fontWeight: 'bold', display: 'block', marginBottom: '2px', color: 'hsl(var(--text-muted))' }}>State</label>
                  <PremiumSelect
                    value={clientFilterState}
                    onChange={(e) => {
                      setClientFilterState(e.target.value);
                      setClientCurrentPage(1);
                    }}
                    style={{ width: '100%', padding: '6px', fontSize: '0.7rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }}
                  >
                    <option value="All">All States</option>
                    {allStatesUnique.map((stateName, idx) => (
                      <option key={idx} value={stateName}>{stateName}</option>
                    ))}
                  </PremiumSelect>
                </div>
              </div>
            </div>

            {/* Filtered mapping & Pagination calculations */}
            {(() => {
              const filteredClients = clients.filter(c => {
                const query = clientSearchQuery.toLowerCase();
                const matchesSearch = 
                  c.name.toLowerCase().includes(query) || 
                  (c.contactPerson && c.contactPerson.toLowerCase().includes(query)) ||
                  (c.phone && c.phone.includes(query)) ||
                  (c.email && c.email.toLowerCase().includes(query));

                const matchesType = clientFilterType === 'All' || c.type === clientFilterType;
                const matchesTier = clientFilterTier === 'All' || c.discountTier === clientFilterTier;
                const matchesState = clientFilterState === 'All' || c.state === clientFilterState;

                return matchesSearch && matchesType && matchesTier && matchesState;
              });

              const totalClients = filteredClients.length;
              const totalPages = Math.ceil(totalClients / clientsPerPage);
              const idxLast = clientCurrentPage * clientsPerPage;
              const idxFirst = idxLast - clientsPerPage;
              const paginatedClients = filteredClients.slice(idxFirst, idxLast);

              return (
                <>
                  {paginatedClients.length === 0 ? (
                    <EmptyStateCard 
                      icon={Users} 
                      title="No Clinics Found" 
                      message="No clinics or doctor directories match the search criteria. Register a client below." 
                    />
                  ) : (
                    paginatedClients.map(c => {
                        const outstanding = getClientOutstanding(c.id);
                        const limit = c.creditLimit || 200000;
                        const pctUsed = Math.min(100, (outstanding / limit) * 100);
                        const clientNotes = crmLogs.filter(log => log.clientId === c.id);

                        return (
                        <div key={c.id} className="glass-card" style={{ padding: '14px', border: '1px solid hsl(var(--border-color))' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flex: 1 }}>
                              {c.image ? (
                                <img src={c.image} alt={c.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid hsl(var(--border-color))', flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0 }}>
                                  {c.name.charAt(0)}
                                </div>
                              )}
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '0.55rem', color: 'hsl(var(--text-dim))' }}>Client ID: #{c.id} • State: {c.state || 'Telangana'}</span>
                                <h4 style={{ fontSize: '0.82rem', fontWeight: 'bold', margin: '2px 0 0' }}>{c.name}</h4>
                                <p style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', margin: '2px 0' }}>
                                  Tier: <strong style={{ color: 'hsl(var(--primary))' }}>{c.discountTier}</strong> • Contact: {c.contactPerson}
                                </p>
                              </div>
                            </div>
                            
                            {/* Circular Credit utilization Dial */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', marginRight: '8px' }}>
                              <div style={{ position: 'relative', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="40" height="40" viewBox="0 0 36 36">
                                  <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="hsl(var(--border-color))"
                                    strokeWidth="4"
                                  />
                                  <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke={pctUsed > 85 ? 'hsl(var(--color-hyper))' : 'hsl(var(--secondary))'}
                                    strokeWidth="4"
                                    strokeDasharray={`${pctUsed}, 100`}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <div style={{ position: 'absolute', fontSize: '0.58rem', fontWeight: '800', color: 'hsl(var(--text-primary))' }}>
                                  {pctUsed.toFixed(0)}%
                                </div>
                              </div>
                              <span style={{ fontSize: '0.5rem', color: 'hsl(var(--text-muted))', fontWeight: 'bold' }}>Credit Used</span>
                            </div>

                            <button onClick={() => startEditClient(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--primary))' }}>
                              <Edit3 size={13} />
                            </button>
                          </div>

                          {/* Credit limit numerical tracking */}
                          <div style={{ marginTop: 'auto', borderTop: '1px dotted hsl(var(--border-color))', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'hsl(var(--text-muted))' }}>
                            <span>Outstanding: <strong style={{ color: 'hsl(var(--text-primary))' }}>₹{outstanding.toLocaleString('en-IN')}</strong></span>
                            <span>Limit: <strong>₹{limit.toLocaleString('en-IN')}</strong></span>
                          </div>

                          {/* CRM logs timeline */}
                          <div style={{ marginTop: '10px', background: 'hsl(var(--border-color) / 10%)', padding: '8px', borderRadius: '8px' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'hsl(var(--text-muted))', display: 'block', marginBottom: '4px' }}>Timeline Notes (CRM):</span>
                          {clientNotes.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '6px' }}>
                              {clientNotes.map((note, idx) => (
                                <div key={idx} style={{ fontSize: '0.62rem', borderLeft: '2px solid hsl(var(--primary))', paddingLeft: '6px' }}>
                                  <span style={{ color: 'hsl(var(--text-dim))', fontSize: '0.52rem' }}>{new Date(note.date).toLocaleDateString()}:</span>
                                  <div style={{ color: 'hsl(var(--text-primary))' }}>{note.notes}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.6rem', color: 'hsl(var(--text-dim))', display: 'block', marginBottom: '6px' }}>No visit logs recorded.</span>
                          )}

                          <button
                            onClick={() => setSelectedCrmClientId(c.id)}
                            style={{ border: 'none', background: 'none', color: 'hsl(var(--primary))', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            + Log Interaction
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', background: 'hsl(var(--bg-card))', padding: '8px 12px', borderRadius: '12px', border: '1px solid hsl(var(--border-color))' }}>
                      <button
                        onClick={() => setClientCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={clientCurrentPage === 1}
                        style={{
                          border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', cursor: clientCurrentPage === 1 ? 'not-allowed' : 'pointer',
                          background: 'hsl(var(--border-color))', color: 'hsl(var(--text-muted))'
                        }}
                      >
                        Previous
                      </button>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'hsl(var(--text-muted))' }}>
                        Page {clientCurrentPage} of {totalPages} ({totalClients} total)
                      </span>
                      <button
                        onClick={() => setClientCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={clientCurrentPage === totalPages}
                        style={{
                          border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', cursor: clientCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                          background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))'
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}


      {/* 4. Sales Rep Dashboard stats subscreen */}
      {activeSubTab === 'dashboard' && (() => {
        // Calculate dashboard analytics
        const finalSalesVal = orders.reduce((acc, curr) => acc + (curr.finalAmount || 0), 0);
        const marginVal = orders.reduce((acc, curr) => acc + (curr.profit || 0), 0);
        const overallMarginPct = finalSalesVal ? ((marginVal / finalSalesVal) * 100).toFixed(1) : '0';

        const unpaidList = orders.filter(o => {
          const totalOrder = (o.finalAmount || 0) + (o.gstPaid || 0);
          return (totalOrder - (o.amountPaid || 0)) > 0 && o.status !== 'Returned';
        });

        const targetQuotaVal = 500000;
        const repQuotaPct = Math.min(100, (finalSalesVal / targetQuotaVal) * 100);
        const commissionEarned = finalSalesVal * 0.05; // 5% flat commission

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '16px', border: '1px solid hsl(var(--border-color))' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ padding: '6px', borderRadius: '8px', background: 'hsl(var(--primary-glow))', color: 'hsl(var(--primary))' }}>
                    <TrendingUp size={16} />
                  </div>
                  <h3 style={{ fontSize: '0.92rem', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit', fontWeight: '800', margin: 0 }}>
                    {t('repDashboard', lang)}
                  </h3>
                </div>
                {/* Offline Sync Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(34, 197, 94, 0.1)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.2)' }} title="Offline Storage Active (Dexie)">
                  <span style={{ width: '5px', height: '5px', background: '#22c55e', borderRadius: '50%', display: 'inline-block', animation: 'dotPulse 1.8s infinite' }} />
                  <span style={{ fontSize: '0.55rem', fontWeight: 'bold', color: '#22c55e', letterSpacing: '0.02em', textTransform: 'uppercase' }}>Synced</span>
                </div>
              </div>
              
              {/* Target progress - Radial Circle */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '16px', background: 'hsl(var(--border-color) / 10%)', padding: '16px', borderRadius: '16px' }}>
                <div style={{ position: 'relative', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="70" height="70" viewBox="0 0 36 36">
                    {/* Background Circle */}
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="hsl(var(--border-color))"
                      strokeWidth="3.5"
                    />
                    {/* Foreground Circle */}
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="url(#quotaGradient)"
                      strokeWidth="3.5"
                      strokeDasharray={`${repQuotaPct}, 100`}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="quotaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" />
                        <stop offset="100%" stopColor="hsl(var(--secondary))" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div style={{ position: 'absolute', fontSize: '0.78rem', fontWeight: '800', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>
                    {repQuotaPct.toFixed(0)}%
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', display: 'block', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                    Quota Performance
                  </span>
                  <div style={{ fontSize: '0.82rem', fontWeight: '800', fontFamily: 'Outfit', marginTop: '2px' }}>
                    ₹{finalSalesVal.toLocaleString('en-IN')} achieved
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'hsl(var(--text-dim))', marginTop: '1px' }}>
                    Target: ₹{targetQuotaVal.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' }}>
                <div style={{ background: 'hsl(var(--border-color) / 10%)', padding: '10px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', display: 'block' }}>{t('commissionEarned', lang)} (5%)</span>
                  <strong style={{ fontSize: '0.9rem', color: 'hsl(var(--secondary))', fontFamily: 'Outfit' }}>₹{commissionEarned.toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ background: 'hsl(var(--border-color) / 10%)', padding: '10px', borderRadius: '10px' }}>
                  <span style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', display: 'block' }}>Average Gross Margin</span>
                  <strong style={{ fontSize: '0.9rem', color: 'hsl(var(--primary))', fontFamily: 'Outfit' }}>{overallMarginPct}%</strong>
                </div>
              </div>

              {/* Categories breakdown visual chart */}
              {(() => {
                const salesByCategory = orders.reduce((acc, order) => {
                  const product = products.find(p => p.id === order.productIds[0]);
                  if (product) {
                    const cat = product.category || 'Other';
                    acc[cat] = (acc[cat] || 0) + (order.finalAmount || 0);
                  }
                  return acc;
                }, {});

                const categoriesList = Object.keys(salesByCategory);
                const maxSalesVal = Math.max(...Object.values(salesByCategory), 1);

                return (
                  <div style={{ marginTop: '20px', borderTop: '1px solid hsl(var(--border-color) / 15%)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h4 style={{ fontSize: '0.78rem', fontWeight: '800', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--text-dim))' }}>
                        Category Performance Chart
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowForecasting(!showForecasting)}
                        style={{
                          border: '1px solid ' + (showForecasting ? 'hsl(var(--secondary))' : 'hsl(var(--border-color))'),
                          background: showForecasting ? 'hsl(var(--secondary-glow))' : 'transparent',
                          color: showForecasting ? 'hsl(var(--secondary))' : 'hsl(var(--text-muted))',
                          fontSize: '0.62rem', fontWeight: 'bold', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.25s'
                        }}
                      >
                        <Sparkles size={11} /> {showForecasting ? 'Hide AI Forecast' : 'AI Trend Projection'}
                      </button>
                    </div>

                    {categoriesList.length === 0 ? (
                      <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))' }}>No sales logged yet.</span>
                    ) : (
                      <div style={{ width: '100%', overflowX: 'auto', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: '16px', padding: '16px 12px' }}>
                        <svg width="100%" height="230" viewBox="0 0 400 230" preserveAspectRatio="xMidYMid meet">
                          <defs>
                            <linearGradient id="barGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                              <stop offset="0%" stopColor="hsl(var(--primary))" />
                              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.85" />
                            </linearGradient>
                            <linearGradient id="forecastGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.85" />
                            </linearGradient>
                            <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
                              <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.06" />
                            </filter>
                          </defs>
                          {/* Grid Lines */}
                          <line x1="40" y1="30" x2="380" y2="30" stroke="hsl(var(--border-color) / 18%)" strokeDasharray="3,3" />
                          <line x1="40" y1="90" x2="380" y2="90" stroke="hsl(var(--border-color) / 18%)" strokeDasharray="3,3" />
                          <line x1="40" y1="150" x2="380" y2="150" stroke="hsl(var(--border-color) / 18%)" strokeDasharray="3,3" />
                          
                          {/* Axis */}
                          <line x1="40" y1="180" x2="380" y2="180" stroke="hsl(var(--border-color))" strokeWidth="1.5" />
                          
                          {categoriesList.map((cat, idx) => {
                            const salesAmt = salesByCategory[cat];
                            const forecastAmt = calculateCategoryForecast(orders, products, cat);
                            const maxValInChart = showForecasting ? Math.max(maxSalesVal, forecastAmt) : maxSalesVal;
                            
                            const heightScale = 140; // max height of bar
                            const barHeight = (salesAmt / maxValInChart) * heightScale;
                            const forecastHeight = (forecastAmt / maxValInChart) * heightScale;
                            
                            const barWidth = showForecasting ? 16 : 36;
                            const groupWidth = showForecasting ? 36 : 36;
                            
                            const spacing = (320 - (categoriesList.length * groupWidth)) / (categoriesList.length + 1);
                            const x = 40 + spacing + idx * (groupWidth + spacing);
                            
                            const y = 180 - barHeight;
                            const yForecast = 180 - forecastHeight;
                            
                            return (
                              <g key={cat}>
                                {/* Actual Sales Bar */}
                                <rect
                                  x={x}
                                  y={y}
                                  width={barWidth}
                                  height={Math.max(barHeight, 4)}
                                  rx="4"
                                  fill="url(#barGrad)"
                                  filter="url(#shadow)"
                                  style={{
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                                />
                                
                                {/* Circle dot marker at peak */}
                                <circle
                                  cx={x + barWidth / 2}
                                  cy={y}
                                  r="3.5"
                                  fill="hsl(var(--primary))"
                                  stroke="hsl(var(--bg-card))"
                                  strokeWidth="1.5"
                                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                                />

                                {!showForecasting && (
                                  <text
                                    x={x + barWidth / 2}
                                    y={y - 10}
                                    textAnchor="middle"
                                    fill="hsl(var(--text-primary))"
                                    fontSize="10"
                                    fontWeight="800"
                                    fontFamily="Outfit"
                                  >
                                    ₹{(salesAmt >= 1000 ? (salesAmt / 1000).toFixed(0) + 'k' : salesAmt)}
                                  </text>
                                )}

                                {/* AI Forecast Bar */}
                                {showForecasting && (
                                  <>
                                    <rect
                                      x={x + barWidth + 4}
                                      y={yForecast}
                                      width={barWidth}
                                      height={Math.max(forecastHeight, 4)}
                                      rx="4"
                                      fill="url(#forecastGrad)"
                                      stroke="hsl(var(--secondary))"
                                      strokeWidth="1"
                                      strokeDasharray="2,2"
                                      filter="url(#shadow)"
                                      style={{
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer'
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                                    />
                                    {/* Forecast Label */}
                                    <text
                                      x={x + barWidth + 4 + barWidth / 2}
                                      y={yForecast - 8}
                                      textAnchor="middle"
                                      fill="hsl(var(--secondary))"
                                      fontSize="8.5"
                                      fontWeight="800"
                                      fontFamily="Outfit"
                                    >
                                      ₹{(forecastAmt >= 1000 ? (forecastAmt / 1000).toFixed(0) + 'k' : forecastAmt)}
                                    </text>
                                  </>
                                )}

                                {/* Category Axis Label */}
                                <text
                                  x={x + groupWidth / 2}
                                  y="198"
                                  textAnchor="middle"
                                  fill="hsl(var(--text-muted))"
                                  fontSize="9.5"
                                  fontWeight="600"
                                  fontFamily="Inter"
                                >
                                  {cat}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                        
                        {/* Forecast Legend */}
                        {showForecasting && (
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '4px', fontSize: '0.62rem', fontWeight: 'bold' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0284c7' }}>
                              <span style={{ width: '8px', height: '8px', background: 'url(#barGrad) #0284c7', borderRadius: '2px' }} /> Actual Sales
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'hsl(var(--secondary))' }}>
                              <span style={{ width: '8px', height: '8px', background: 'hsl(var(--secondary-glow))', border: '1px dashed hsl(var(--secondary))', borderRadius: '2px' }} /> AI Projected Next Month (Linear Regression)
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Unpaid invoices collections ledger */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '800', fontFamily: 'Outfit', color: 'hsl(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Landmark size={15} style={{ color: '#f59e0b' }} /> Outstanding Invoice Ledger
              </h3>
              {unpaidList.length === 0 ? (
                <EmptyStateCard 
                  icon={Landmark} 
                  title="No Outstanding Invoices" 
                  message="All B2B invoices are fully paid. The outstanding collections ledger is clear!" 
                />
              ) : (
                unpaidList.map(o => {
                  const client = clients.find(c => c.id === o.clientId);
                  if (!client) return null;
                  const totalInvoice = o.finalAmount + (o.gstPaid || 0);
                  const outstanding = totalInvoice - (o.amountPaid || 0);

                  return (
                    <div key={o.id} className="glass-card animate-fade-in" style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      border: '1px solid hsl(var(--border-color))', 
                      padding: '12px 16px', 
                      borderRadius: '12px',
                      borderLeft: '4px solid #f59e0b',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.01)'
                    }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.62rem', color: 'hsl(var(--text-dim))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Invoice #DPC-{o.id} • Due: {new Date(o.dueDate).toLocaleDateString('en-IN')}</span>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'hsl(var(--text-primary))', margin: '4px 0 0', fontFamily: 'Outfit' }}>{client.name}</h4>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: '800', color: 'hsl(var(--color-hyper))', display: 'block', fontFamily: 'Outfit' }}>₹{outstanding.toLocaleString('en-IN')}</span>
                        <button
                          onClick={() => {
                            setPaymentOrder(o);
                            setCollectAmount(outstanding);
                          }}
                          style={{ 
                            border: 'none', 
                            background: 'none', 
                            color: 'hsl(var(--primary))', 
                            fontSize: '0.68rem', 
                            fontWeight: 'bold', 
                            cursor: 'pointer', 
                            fontFamily: 'Outfit', 
                            padding: '4px 0 0',
                            textDecoration: 'underline',
                            transition: 'color 0.2s' 
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = 'hsl(var(--secondary))'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = 'hsl(var(--primary))'; }}
                        >
                          Collect Payment
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

      {/* Collect Payment Modal Overlay */}
      {paymentOrder && isDoctor ? (
        <PaymentGatewayModal
          order={paymentOrder}
          amount={collectAmount}
          onClose={() => setPaymentOrder(null)}
          onSuccess={async (amt) => {
            const parsedAmt = parseFloat(amt);
            const currentPaid = paymentOrder.amountPaid || 0;
            const orderTotal = paymentOrder.finalAmount + (paymentOrder.gstPaid || 0);
            const nextPaid = Math.min(orderTotal, currentPaid + parsedAmt);
            const nextPaymentStatus = nextPaid >= orderTotal ? 'Paid' : 'Unpaid';

            await db.b2bOrders.update(paymentOrder.id, {
              amountPaid: nextPaid,
              paymentStatus: nextPaymentStatus
            });
            setPaymentOrder(null);
            setCollectAmount('');
            alert('Invoice Payment Settled Successfully via Secure Gateway!');
          }}
        />
      ) : paymentOrder && (
        <div className="modal-overlay-container">
          <div className="modal-content-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>💸 {t('collectPayment', lang)}</h3>
              <button onClick={() => setPaymentOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
              Recording partial collection payment details for order invoice <strong>#DPC-{paymentOrder.id}</strong>.
            </p>
            <form onSubmit={handleCollectPaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Collection Amount (₹):</label>
                <input type="number" required value={collectAmount} onChange={(e) => setCollectAmount(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px' }}>
                Apply Payment Receipt
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Dispatch Challan Modal */}
      {challanOrderId && (
        <div className="modal-overlay-container">
          <div className="modal-content-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>🚚 {t('createChallan', lang)}</h3>
              <button onClick={() => setChallanOrderId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateChallan} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Courier Partner Name:</label>
                <input type="text" required placeholder="e.g. Blue Dart, Professional Couriers" value={courierName} onChange={(e) => setCourierName(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 'bold', display: 'block', marginBottom: '2px' }}>Tracking Number / Airway Bill:</label>
                <input type="text" placeholder="e.g. BD-99882772" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px' }}>
                Generate Challan & Mark Dispatched
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CRM Log Modal Overlay */}
      {selectedCrmClientId && (
        <div className="modal-overlay-container">
          <div className="modal-content-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>📝 {t('addCrmLog', lang)}</h3>
              <button onClick={() => setSelectedCrmClientId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddCrmLog} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 'bold', margin: 0 }}>{t('crmNotes', lang)}</label>
                  <button
                    type="button"
                    onClick={handleStartVoice}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: isListening ? 'hsl(var(--destructive-glow))' : 'hsl(var(--border-color) / 20%)',
                      border: '1px solid ' + (isListening ? 'hsl(var(--destructive))' : 'hsl(var(--border-color))'),
                      color: isListening ? 'hsl(var(--destructive))' : 'hsl(var(--text-primary))',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isListening ? (
                      <>
                        <MicOff size={11} className="animate-pulse" /> Listening...
                      </>
                    ) : (
                      <>
                        <Mic size={11} /> Dictate Note
                      </>
                    )}
                  </button>
                </div>
                <textarea required rows="4" value={crmNote} onChange={(e) => setCrmNote(e.target.value)} placeholder="Enter details about phone calls, doctor visits, quotes discussed, or custom requests..."
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', outline: 'none', resize: 'vertical' }} />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '10px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '6px' }}>
                Save CRM Note
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. Analytics Tab */}
      {activeSubTab === 'analytics' && (
        <SalesAnalytics />
      )}

      {/* Printable Tax Invoice Modal */}
      {selectedInvoiceOrder && (() => {
        const order = selectedInvoiceOrder;
        const client = clients.find(c => c.id === order.clientId);
        const product = products.find(p => p.id === order.productIds[0]);
        if (!client || !product) return null;

        const isLocalState = (client.state || 'Telangana') === 'Telangana';
        const appliedGstRate = order.gstRate || 12;
        const taxRate = appliedGstRate / 100;
        const subtotal = order.finalAmount;
        const taxVal = order.gstPaid !== undefined ? order.gstPaid : (subtotal * taxRate);
        const totalInvoiceAmt = subtotal + taxVal;
        const paidAmt = order.amountPaid || 0;
        const outstanding = totalInvoiceAmt - paidAmt;

        return (
          <div className="modal-overlay-container">
            <div className="modal-content-card animate-fade-in" id="printable-invoice" style={{
              background: '#fff', color: '#1e293b'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'hsl(var(--primary))', margin: 0, fontFamily: 'Outfit' }}>
                    🦷 {t('portalTitle', lang)}
                  </h2>
                  <span style={{ fontSize: '0.6rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    {t('gstNumber', lang)}: 36AAAAA1111A1Z1
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: '800', padding: '4px 10px', borderRadius: '100px',
                    background: outstanding <= 0 ? '#d1fae5' : '#fee2e2',
                    color: outstanding <= 0 ? '#065f46' : '#991b1b', textTransform: 'uppercase', fontFamily: 'Outfit'
                  }}>
                    {outstanding <= 0 ? 'PAID' : 'DUE'}
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: '800', display: 'block', marginTop: '10px' }}>
                    {t('taxInvoice', lang)}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: '#64748b', display: 'block' }}>
                    #{t('orderNumber', lang)}: DPC-{order.id}
                  </span>
                </div>
              </div>

              {/* Bill Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.7rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <div>
                  <strong style={{ color: '#475569', textTransform: 'uppercase', fontSize: '0.6rem' }}>{t('invoiceShipFrom', lang)}</strong>
                  <p style={{ fontWeight: 'bold', margin: '2px 0 0' }}>{profile?.clinicName || 'Lal Dental Care Ltd.'}</p>
                  <p style={{ margin: 0, color: '#64748b' }}>{profile?.clinicAddress || 'Hitech City, Hyderabad, 500081'}</p>
                </div>
                <div>
                  <strong style={{ color: '#475569', textTransform: 'uppercase', fontSize: '0.6rem' }}>{t('invoiceBillTo', lang)}</strong>
                  <p style={{ fontWeight: 'bold', margin: '2px 0 0' }}>{client.name}</p>
                  <p style={{ margin: 0, color: '#64748b' }}>{client.address}</p>
                  <p style={{ margin: 0, color: '#64748b' }}>State: {client.state || 'Telangana'}</p>
                </div>
              </div>

              {/* Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem', marginTop: '6px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ textAlign: 'left', padding: '6px 0' }}>Item Description</th>
                    <th style={{ textAlign: 'center', padding: '6px 0' }}>HSN</th>
                    <th style={{ textAlign: 'right', padding: '6px 0' }}>Rate</th>
                    <th style={{ textAlign: 'center', padding: '6px 0' }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: '6px 0' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>{product.name}</td>
                    <td style={{ padding: '8px 0', textAlign: 'center', color: '#64748b' }}>9021</td>
                    <td style={{ padding: '8px 0', textAlign: 'right' }}>₹{product.price}</td>
                    <td style={{ padding: '8px 0', textAlign: 'center' }}>{order.qty}</td>
                    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 'bold' }}>₹{product.price * order.qty}</td>
                  </tr>
                </tbody>
              </table>

              {/* Tax Calculations */}
              <div style={{ marginLeft: 'auto', width: '220px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.7rem', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Subtotal:</span>
                  <span style={{ fontWeight: 'bold' }}>₹{(product.price * order.qty).toLocaleString('en-IN')}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#991b1b' }}>
                    <span>Discount:</span>
                    <span>-₹{order.discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                  <span style={{ color: '#64748b' }}>Taxable Value:</span>
                  <span style={{ fontWeight: 'bold' }}>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                
                {isLocalState ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>{t('cgst', lang)} ({appliedGstRate / 2}%):</span>
                      <span>₹{(taxVal / 2).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>{t('sgst', lang)} ({appliedGstRate / 2}%):</span>
                      <span>₹{(taxVal / 2).toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>{t('igst', lang)} ({appliedGstRate}%):</span>
                    <span>₹{taxVal.toFixed(2)}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  <span>Gross Invoice Total:</span>
                  <span style={{ color: 'hsl(var(--primary))' }}>₹{totalInvoiceAmt.toLocaleString('en-IN')}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'green' }}>
                  <span>{t('amountPaid', lang)}:</span>
                  <span>₹{paidAmt.toLocaleString('en-IN')}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e2e8f0', paddingTop: '6px', fontSize: '0.78rem', fontWeight: 'bold', color: 'hsl(var(--color-hyper))' }}>
                  <span>{t('balanceDue', lang)}:</span>
                  <span>₹{outstanding.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Footer Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <button 
                  onClick={() => window.print()}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 'bold', border: 'none',
                    background: 'linear-gradient(135deg, hsl(var(--primary)), #0284c7)', color: '#fff', cursor: 'pointer', fontFamily: 'Outfit',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Printer size={14} /> {t('invoicePrint', lang)}
                </button>
                <button 
                  onClick={() => handleDownloadPDF(order)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 'bold', border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', cursor: 'pointer', fontFamily: 'Outfit',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Download size={14} /> Download PDF
                </button>
                <button 
                  onClick={() => setSelectedInvoiceOrder(null)}
                  style={{
                    padding: '10px 14px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 'bold', border: '1px solid #cbd5e1',
                    background: '#f8fafc', color: '#475569', cursor: 'pointer', fontFamily: 'Outfit'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Printable Delivery Challan Modal */}
      {selectedChallan && (() => {
        const { challan, order } = selectedChallan;
        const client = clients.find(c => c.id === order.clientId);
        const product = products.find(p => p.id === order.productIds[0]);
        if (!client || !product) return null;

        return (
          <div className="modal-overlay-container">
            <div className="modal-content-card animate-fade-in" id="printable-challan" style={{
              background: '#fff', color: '#1e293b'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'hsl(var(--primary))', margin: 0, fontFamily: 'Outfit' }}>
                    🦷 {t('portalTitle', lang)}
                  </h2>
                  <span style={{ fontSize: '0.6rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                    {t('gstNumber', lang)}: 36AAAAA1111A1Z1
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: '800', padding: '4px 10px', borderRadius: '100px',
                    background: '#e0f2fe', color: '#0369a1', textTransform: 'uppercase', fontFamily: 'Outfit'
                  }}>
                    CHALLAN
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: '800', display: 'block', marginTop: '10px' }}>
                    DELIVERY CHALLAN
                  </span>
                  <span style={{ fontSize: '0.6rem', color: '#64748b', display: 'block' }}>
                    No: DC-{challan.id || order.id}
                  </span>
                </div>
              </div>

              {/* Bill Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.7rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginTop: '10px' }}>
                <div>
                  <strong style={{ color: '#475569', textTransform: 'uppercase', fontSize: '0.6rem' }}>Sender (Dispatch From)</strong>
                  <p style={{ fontWeight: 'bold', margin: '2px 0 0' }}>{profile?.clinicName || 'Lal Dental Care Ltd.'}</p>
                  <p style={{ margin: 0, color: '#64748b' }}>{profile?.clinicAddress || 'Hitech City, Hyderabad, 500081'}</p>
                </div>
                <div>
                  <strong style={{ color: '#475569', textTransform: 'uppercase', fontSize: '0.6rem' }}>Consignee (Ship To)</strong>
                  <p style={{ fontWeight: 'bold', margin: '2px 0 0' }}>{client.name}</p>
                  <p style={{ margin: 0, color: '#64748b' }}>{client.address}</p>
                  <p style={{ margin: 0, color: '#64748b' }}>State: {client.state || 'Telangana'}</p>
                </div>
              </div>

              {/* Courier Details */}
              <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '0.7rem', margin: '10px 0', border: '1px solid #e2e8f0' }}>
                <strong style={{ color: '#475569', textTransform: 'uppercase', fontSize: '0.6rem', display: 'block', marginBottom: '2px' }}>Transport/Courier Information</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <span><strong>Carrier:</strong> {challan.courierName}</span>
                  <span><strong>Tracking No:</strong> {challan.trackingNumber || 'N/A'}</span>
                  <span><strong>Dispatch Date:</strong> {new Date(challan.dispatchDate || order.orderDate).toLocaleDateString()}</span>
                  <span><strong>Status:</strong> {challan.status}</span>
                </div>
              </div>

              {/* Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem', marginTop: '6px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ textAlign: 'left', padding: '6px 0' }}>Item Description</th>
                    <th style={{ textAlign: 'center', padding: '6px 0' }}>HSN</th>
                    <th style={{ textAlign: 'center', padding: '6px 0' }}>Batch No</th>
                    <th style={{ textAlign: 'center', padding: '6px 0' }}>Qty (Pcs)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 0', fontWeight: 'bold' }}>{product.name} ({product.sku})</td>
                    <td style={{ padding: '8px 0', textAlign: 'center', color: '#64748b' }}>9021</td>
                    <td style={{ padding: '8px 0', textAlign: 'center', color: '#64748b' }}>{order.batchNo || 'N/A'}</td>
                    <td style={{ padding: '8px 0', textAlign: 'center', fontWeight: 'bold' }}>{order.qty}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                <p style={{ margin: '0 0 4px 0' }}><strong>Declaration:</strong> The goods described above are supplied for clinical/medical applications only. Please verify batch compatibility upon receipt.</p>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', fontSize: '0.7rem' }}>
                <div>
                  <div style={{ width: '120px', borderBottom: '1px solid #cbd5e1', height: '24px' }}></div>
                  <span style={{ display: 'block', marginTop: '4px', color: '#64748b' }}>Receiver's Signature</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 'bold', display: 'block' }}>For {profile?.clinicName || 'Lal Dental Care Ltd.'}</span>
                  <div style={{ width: '150px', height: '24px' }}></div>
                  <span style={{ display: 'block', marginTop: '4px', color: '#64748b' }}>Authorized Signatory</span>
                </div>
              </div>

              {/* Footer Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <button 
                  onClick={() => window.print()}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 'bold', border: 'none',
                    background: 'linear-gradient(135deg, hsl(var(--primary)), #0284c7)', color: '#fff', cursor: 'pointer', fontFamily: 'Outfit',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Printer size={14} /> Print Challan
                </button>
                <button 
                  onClick={() => setSelectedChallan(null)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 'bold', border: '1px solid #cbd5e1',
                    background: '#f8fafc', color: '#475569', cursor: 'pointer', fontFamily: 'Outfit'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Client Modal Overlay */}
      {editingClient && (
        <div className="modal-overlay-container">
          <div className="modal-content-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'hsl(var(--text-primary))', fontFamily: 'Outfit' }}>
                ✏️ {t('editClientTitle', lang)}
              </h3>
              <button onClick={() => setEditingClient(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateClient} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('clientName', lang)}</label>
                <input type="text" value={editClientName} onChange={(e) => setEditClientName(e.target.value)} required
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('clientType', lang)}</label>
                  <PremiumSelect value={editClientType} onChange={(e) => setEditClientType(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                    <option value="Doctor">Doctor</option>
                    <option value="Hospital">Hospital</option>
                  </PremiumSelect>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('discountTier', lang)}</label>
                  <PremiumSelect value={editDiscountTier} onChange={(e) => setEditDiscountTier(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                    <option value="Standard">Standard (0%)</option>
                    <option value="Gold">Gold (10%)</option>
                    <option value="Platinum">Platinum (15%)</option>
                    <option value="VIP">VIP (20%)</option>
                  </PremiumSelect>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('creditLimit', lang)} (₹):</label>
                  <input type="number" value={editCreditLimit} onChange={(e) => setEditCreditLimit(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('contactPerson', lang)}</label>
                  <input type="text" value={editContactPerson} onChange={(e) => setEditContactPerson(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('email', lang)}</label>
                  <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('phone', lang)}</label>
                  <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>{t('address', lang)}</label>
                <input type="text" value={editAddress} onChange={(e) => setEditAddress(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{t('clinicState', lang)}</label>
                <PremiumSelect value={editClientState} onChange={(e) => setEditClientState(e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '0.78rem', borderRadius: '8px', border: '1px solid hsl(var(--border-color))', outline: 'none', background: 'transparent', color: 'hsl(var(--text-primary))' }}>
                  {(() => {
                    const ALL_INDIAN_STATES_AND_UTS = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"];
                    const allStatesUnique = Array.from(new Set([...ALL_INDIAN_STATES_AND_UTS, ...states.map(s => s.name)])).sort();
                    return allStatesUnique.map((stateName, idx) => (
                      <option key={idx} value={stateName}>{stateName}</option>
                    ));
                  })()}
                </PremiumSelect>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Logo / Photo</label>
                  <div style={{
                    border: '2px dashed hsl(var(--border-color))',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'hsl(var(--bg-dark))',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.25s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'hsl(var(--primary))'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'hsl(var(--border-color))'}
                  >
                    <Camera size={16} style={{ color: 'hsl(var(--text-muted))' }} />
                    <span style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', fontWeight: 'bold' }}>
                      Drag or Select Image
                    </span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e, setEditClientImage)}
                      style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        opacity: 0, cursor: 'pointer'
                      }}
                    />
                  </div>
                </div>
                {editClientImage && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingTop: '16px' }}>
                    <img src={editClientImage} alt="Preview" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', border: '1px solid hsl(var(--border-color))' }} />
                    <button 
                      type="button" 
                      onClick={() => setEditClientImage('')} 
                      style={{ 
                        border: 'none', background: 'hsl(var(--color-hyper) / 10%)', color: 'hsl(var(--color-hyper))', 
                        padding: '6px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'transform 0.2s ease, background 0.2s ease, color 0.2s ease',
                        marginLeft: '12px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.15) rotate(5deg)';
                        e.currentTarget.style.background = 'hsl(var(--color-hyper))';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                        e.currentTarget.style.background = 'hsl(var(--color-hyper) / 10%)';
                        e.currentTarget.style.color = 'hsl(var(--color-hyper))';
                      }}
                      title="Remove Image"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <button type="submit" className="btn-primary" style={{ padding: '12px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer', marginTop: '6px', fontFamily: 'Outfit' }}>
                {t('saveChanges', lang)}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function PaymentGatewayModal({ order, amount, onClose, onSuccess }) {
  const [method, setMethod] = useState('upi'); // 'upi' | 'card' | 'netbanking'
  const [status, setStatus] = useState('idle'); // 'idle' | 'processing' | 'success'
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [cardName, setCardName] = useState('Dr. Smith');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus('processing');
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => {
        onSuccess(amount);
      }, 1500);
    }, 1800);
  };

  return (
    <div className="modal-overlay-container" style={{ zIndex: 999999 }}>
      <div className="modal-content-card animate-fade-in">
        {status === 'idle' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'hsl(var(--primary))', fontWeight: '800', letterSpacing: '0.05em' }}>Secure Gateway</span>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '800', fontFamily: 'Outfit', margin: 0 }}>Razorpay & Stripe Simulator</h3>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--text-muted))' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'hsl(var(--primary-glow))', padding: '12px 16px', borderRadius: '12px', border: '1px solid hsl(var(--primary) / 10%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'hsl(var(--text-muted))', display: 'block' }}>Paying Invoice #DPC-{order.id}</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 'bold' }}>Amount Due</span>
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'hsl(var(--primary))', fontFamily: 'Outfit' }}>₹{parseFloat(amount).toLocaleString('en-IN')}</span>
            </div>

            {/* Tabs for payment methods */}
            <div style={{ display: 'flex', background: 'hsl(var(--bg-dark))', padding: '3px', borderRadius: '8px', border: '1px solid hsl(var(--border-color))' }}>
              {['upi', 'card', 'netbanking'].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  style={{
                    flex: 1, padding: '6px', border: 'none', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer',
                    background: method === m ? 'hsl(var(--bg-card))' : 'transparent',
                    color: method === m ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))',
                    transition: 'all 0.2s', textTransform: 'uppercase'
                  }}
                >
                  {m === 'upi' ? 'UPI / QR' : m === 'card' ? 'Card' : 'NetBank'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {method === 'upi' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                  {/* Simulated QR Code using SVG */}
                  <svg width="120" height="120" viewBox="0 0 100 100" style={{ background: '#fff', padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <rect x="10" y="10" width="20" height="20" fill="#0f172a" />
                    <rect x="15" y="15" width="10" height="10" fill="#fff" />
                    <rect x="70" y="10" width="20" height="20" fill="#0f172a" />
                    <rect x="75" y="15" width="10" height="10" fill="#fff" />
                    <rect x="10" y="70" width="20" height="20" fill="#0f172a" />
                    <rect x="15" y="75" width="10" height="10" fill="#fff" />
                    <rect x="40" y="40" width="20" height="20" fill="#0f172a" />
                    {/* Random noise dots */}
                    <rect x="35" y="15" width="5" height="10" fill="#0f172a" />
                    <rect x="50" y="20" width="10" height="5" fill="#0f172a" />
                    <rect x="15" y="45" width="10" height="5" fill="#0f172a" />
                    <rect x="45" y="75" width="15" height="5" fill="#0f172a" />
                    <rect x="75" y="45" width="10" height="10" fill="#0f172a" />
                  </svg>
                  <span style={{ fontSize: '0.62rem', color: 'hsl(var(--text-muted))', textAlign: 'center' }}>
                    Scan QR code using Google Pay, PhonePe or BHIM UPI app
                  </span>
                  <div style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'hsl(var(--secondary))', background: 'hsl(var(--secondary-glow))', padding: '4px 10px', borderRadius: '100px' }}>
                    UPI ID: dpc@kotak
                  </div>
                </div>
              )}

              {method === 'card' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.58rem', fontWeight: 'bold', display: 'block', marginBottom: '2px', color: 'hsl(var(--text-muted))' }}>CARD NUMBER</label>
                    <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} required
                      style={{ width: '100%', padding: '8px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.58rem', fontWeight: 'bold', display: 'block', marginBottom: '2px', color: 'hsl(var(--text-muted))' }}>EXPIRY DATE</label>
                      <input type="text" value={cardExpiry} placeholder="MM/YY" onChange={(e) => setCardExpiry(e.target.value)} required
                        style={{ width: '100%', padding: '8px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                    </div>
                    <div style={{ width: '70px' }}>
                      <label style={{ fontSize: '0.58rem', fontWeight: 'bold', display: 'block', marginBottom: '2px', color: 'hsl(var(--text-muted))' }}>CVV</label>
                      <input type="password" value={cardCvv} maxLength="3" onChange={(e) => setCardCvv(e.target.value)} required
                        style={{ width: '100%', padding: '8px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.58rem', fontWeight: 'bold', display: 'block', marginBottom: '2px', color: 'hsl(var(--text-muted))' }}>CARDHOLDER NAME</label>
                    <input type="text" value={cardName} onChange={(e) => setCardName(e.target.value)} required
                      style={{ width: '100%', padding: '8px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))' }} />
                  </div>
                </div>
              )}

              {method === 'netbanking' && (
                <div>
                  <label style={{ fontSize: '0.58rem', fontWeight: 'bold', display: 'block', marginBottom: '4px', color: 'hsl(var(--text-muted))' }}>CHOOSE BANK</label>
                  <PremiumSelect value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)}
                    style={{ width: '100%', padding: '10px', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-primary))', outline: 'none' }}>
                    <option value="HDFC Bank">HDFC Bank</option>
                    <option value="ICICI Bank">ICICI Bank</option>
                    <option value="State Bank of India">State Bank of India (SBI)</option>
                    <option value="Axis Bank">Axis Bank</option>
                    <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                  </PremiumSelect>
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                Simulate Payment Settlement
              </button>
            </form>
          </>
        )}

        {status === 'processing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '40px 0', textAlign: 'center' }}>
            <div className="spinner" style={{
              width: '40px', height: '40px', border: '4px solid hsl(var(--primary-glow))', borderTop: '4px solid hsl(var(--primary))',
              borderRadius: '50%', animation: 'spin 1s linear infinite'
            }} />
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', margin: 0 }}>Contacting Payment Gateway...</h4>
              <p style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>Please do not close or refresh this page.</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '40px 0', textAlign: 'center' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%', background: 'hsl(var(--secondary-glow))',
              color: 'hsl(var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem'
            }}>
              ✓
            </div>
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: 'hsl(var(--secondary))', margin: 0 }}>Payment Successful!</h4>
              <p style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>Transaction ID: TXN-{getRandomTxnId()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
