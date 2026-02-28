/**
 * AgriVision Global State (Zustand)
 * Manages auth, selected farm, cart, and UI state.
 */

import { create } from "zustand";
import api from "./api";

export const useStore = create((set, get) => ({
  // Auth
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,

  // Farm
  farms: [],
  selectedFarm: null,

  // Cart / Order
  cart: null,        // configurator result
  order: null,       // created order

  // UI
  sidebarOpen: true,

  // ============================================================
  // AUTH ACTIONS
  // ============================================================
  initAuth: async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("agrivision_token") : null;
    if (!token) { set({ loading: false }); return; }
    try {
      const user = await api.auth.me();
      set({ user, token, isAuthenticated: true, loading: false });
    } catch {
      localStorage.removeItem("agrivision_token");
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    const data = await api.auth.login(email, password);
    const user = await api.auth.me();
    set({ user, token: data.access_token, isAuthenticated: true });
    return user;
  },

  signup: async (formData) => {
    const data = await api.auth.signup(formData);
    return data;
  },

  logout: () => {
    api.auth.logout();
    set({ user: null, token: null, isAuthenticated: false, farms: [], selectedFarm: null });
  },

  // ============================================================
  // FARM ACTIONS
  // ============================================================
  loadFarms: async () => {
    const farms = await api.farms.list();
    set({ farms, selectedFarm: farms[0] || null });
  },

  selectFarm: (farm) => set({ selectedFarm: farm }),

  createFarm: async (data) => {
    const farm = await api.farms.create(data);
    const farms = [...get().farms, farm];
    set({ farms, selectedFarm: farm });
    return farm;
  },

  // ============================================================
  // CART ACTIONS
  // ============================================================
  setCart: (result) => set({ cart: result }),
  clearCart: () => set({ cart: null, order: null }),
  setOrder: (order) => set({ order }),

  // ============================================================
  // UI
  // ============================================================
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
}));
