import { create } from "zustand";
import type { Notification } from "@/types";

interface NotificationState {
  notifications: Notification[];
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string | number) => void;
  markAllAsRead: () => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) => set((state) => ({
    notifications: state.notifications.some((item) => item.id === notification.id)
      ? state.notifications
      : [notification, ...state.notifications],
  })),
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map((item) => item.id === id ? { ...item, is_read: true } : item),
  })),
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map((item) => ({ ...item, is_read: true })),
  })),
  clear: () => set({ notifications: [] }),
}));
