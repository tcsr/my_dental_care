import { create } from 'zustand';
import { supabase } from './supabase';

export const useStore = create((set, get) => ({
  products: [],
  orders: [],
  profiles: [],
  categories: [],
  loading: false,
  feedback: {},

  fetchProducts: async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_variants(*)')
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
        .select('*, order_items(qty, unit_price, size, product_id, variant_id, product:products(name, category), variant:product_variants(sku, diameter, length))')
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

  fetchFeedback: async (productId) => {
    try {
      const { data, error } = await supabase
        .from('product_feedback')
        .select('*, profiles(name)')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        set(state => ({
          feedback: {
            ...state.feedback,
            [productId]: data
          }
        }));
      }
    } catch (e) {
      console.warn('Zustand: fetch feedback failed:', e);
    }
  },

  submitFeedback: async (productId, rating, comment, userId) => {
    try {
      const { data, error } = await supabase
        .from('product_feedback')
        .insert({
          product_id: productId,
          user_id: userId,
          rating,
          comment
        })
        .select('*, profiles(name)');
      if (error) {
        throw error;
      }
      if (data && data[0]) {
        set(state => {
          const currentList = state.feedback[productId] || [];
          return {
            feedback: {
              ...state.feedback,
              [productId]: [data[0], ...currentList]
            }
          };
        });
        return { success: true };
      }
    } catch (e) {
      console.warn('Zustand: submit feedback failed:', e);
      return { success: false, error: e.message || e };
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
    set({ orders: [], profiles: [] });
  }
}));
