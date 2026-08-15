"use client";

import { useEffect, useState } from 'react';

export function usePermissions() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserFromStorage = () => {
      if (typeof window === 'undefined') return null;
      try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (!token || !userStr) return null;
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    };

    setUser(getUserFromStorage());
    setLoading(false);
  }, []);

  const role = user?.role || null;
  const isSudo = role === 'SUDO_ADMIN';
  const isAdmin = role === 'ADMIN' || isSudo;
  const userPermissions = user?.permissions || {};

  /**
   * Check if current user has permission for module and action
   * Sudo Admins have bypass access to everything.
   * Admins have access to standard modules by default.
   */
  const hasPermission = (moduleName: string, action: string = 'view'): boolean => {
    if (isSudo) return true;

    // Default module access rules for regular Admins vs Users
    if (isAdmin && !['vault', 'settings', 'team'].includes(moduleName)) {
      return true;
    }

    if (!userPermissions) return false;

    const modulePerms = userPermissions[moduleName];
    if (Array.isArray(modulePerms)) {
      return modulePerms.includes(action);
    }

    return false;
  };

  return {
    role,
    isSudo,
    isAdmin,
    loading,
    permissions: userPermissions,
    hasPermission
  };
}
