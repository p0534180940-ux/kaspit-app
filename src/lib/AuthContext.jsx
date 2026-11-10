import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { base44, supabase } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const userIdRef = useRef(null);

  const checkUserAuth = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingAuth(true);
    try {
      const u = await base44.auth.me();
      userIdRef.current = u?.id || null;
      setUser(u);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch {
      userIdRef.current = null;
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkUserAuth();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase שולח SIGNED_IN שוב כשחוזרים לחלון (למשל אחרי בחירת קובץ). לאותו משתמש לא טוענים מחדש,
      // כדי לא לסגור חלונות פתוחים כמו ייבוא קובץ.
      if (event === 'SIGNED_IN' && session?.user?.id && session.user.id === userIdRef.current) return;
      if (event === 'SIGNED_IN') checkUserAuth(!!userIdRef.current);
      else if (event === 'SIGNED_OUT') checkUserAuth();
      else if (event === 'USER_UPDATED') checkUserAuth(true);
      if (event === 'PASSWORD_RECOVERY') window.location.hash = '#/reset-password';
    });
    return () => data.subscription.unsubscribe();
  }, [checkUserAuth]);

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    base44.auth.logout(shouldRedirect ? '' : undefined);
  };

  const navigateToLogin = () => base44.auth.redirectToLogin();

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        appPublicSettings: null,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState: checkUserAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
