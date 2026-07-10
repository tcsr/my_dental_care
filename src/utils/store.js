import { create } from 'zustand';
import { supabase } from './supabase';

export const useStore = create((set, get) => ({
  products: [],
  orders: [],
  profiles: [],
  categories: [],
  loading: false,

  fetchProducts: async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      console.log('Zustand fetchProducts:', { data, error });
      if (!error && data) set({ products: data });
    } catch (e) {
      console.warn('Zustand: fetch products failed:', e);
    }
  },

  fetchOrders: async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(qty, unit_price, size, product_id, product:products(name, category))')
        .order('created_at', { ascending: false });
      if (!error && data) set({ orders: data });
    } catch (e) {
      console.warn('Zustand: fetch orders failed:', e);
    }
  },

  fetchProfiles: async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data) set({ profiles: data });
    } catch (e) {
      console.warn('Zustand: fetch profiles failed:', e);
    }
  },

  fetchCategories: async () => {
    try {
      const { data, error } = await supabase.from('product_categories').select('*').eq('active', true);
      if (!error && data) set({ categories: data });
    } catch (e) {
      console.warn('Zustand: fetch categories failed:', e);
    }
  },

  initData: async (isLoggedIn) => {
    set({ loading: true });
    try {
      const fetchers = [get().fetchProducts(), get().fetchCategories()];
      if (isLoggedIn) {
        fetchers.push(get().fetchOrders(), get().fetchProfiles());
      }
      await Promise.all(fetchers);
    } catch (err) {
      console.error('Zustand: init failed:', err);
    } finally {
      set({ loading: false });
    }
  },

  refresh: async (table = 'all') => {
    if (table === 'all' || table === 'products') await get().fetchProducts();
    if (table === 'all' || table === 'orders' || table === 'order_items') await get().fetchOrders();
    if (table === 'all' || table === 'profiles') await get().fetchProfiles();
    if (table === 'all' || table === 'categories') await get().fetchCategories();
  },

  clearData: () => {
    set({ products: [], orders: [], profiles: [], categories: [] });
  }
}));
