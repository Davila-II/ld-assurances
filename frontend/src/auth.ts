import type { AdminUser } from './types';

const KEY = 'ld_admin_token';
const USER_KEY = 'ld_admin_user';

export const getToken = (): string | null => sessionStorage.getItem(KEY);

export const setToken = (token: string): void => sessionStorage.setItem(KEY, token);

export const getAdminUser = (): AdminUser | null => {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
};

export const setAdminUser = (user: AdminUser): void => {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearToken = (): void => {
  sessionStorage.removeItem(KEY);
  sessionStorage.removeItem(USER_KEY);
};

export const hasPermission = (permission: string): boolean => {
  const user = getAdminUser();
  if (!user) return false;
  if (user.is_admin || user.role === 'admin') return true;
  if (!user.permissions) return false;
  return user.permissions.includes('*') || user.permissions.includes(permission);
};

export const hasAnyPermission = (permissions: string[]): boolean => {
  return permissions.some((perm) => hasPermission(perm));
};