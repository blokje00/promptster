import { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  const {
    data: user = null,
    isLoading: isLoadingUser,
  } = useQuery({
    queryKey: ['authUser'],
    // The SDK manages its own session storage; me() must always run so a
    // plain visit/refresh (no ?access_token= in the URL) still resolves the user.
    queryFn: async () => {
      try {
        const me = await base44.auth.me();
        if (!me) return null;
        // Explicit defaults (false, not undefined) so every useAuth() consumer
        // sees the same shape, regardless of whether the platform ever set these.
        return {
          ...me,
          tier_advisor_features_enabled: me.tier_advisor_features_enabled ?? false,
          tier_advisor_subscription_enabled: me.tier_advisor_subscription_enabled ?? false,
        };
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const isAuthenticated = !!user;
  const isLoadingAuth = isLoadingUser;

  const refreshUser = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['authUser'] });
  }, [queryClient]);

  const checkAppState = useCallback(async () => {
    // Safety timeout: never hang longer than 8 seconds
    const timeout = setTimeout(() => {
      setIsLoadingPublicSettings(false);
    }, 8000);

    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `${appParams.serverUrl}/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);

        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    checkAppState();
  }, [checkAppState]);

  /**
   * Log out via the SDK (token cleanup + redirect).
   * @param {boolean|string} [redirect=true] true → back to the current URL,
   *   a string → to that URL, false → no redirect.
   */
  const logout = useCallback((redirect = true) => {
    queryClient.removeQueries({ queryKey: ['authUser'] });

    if (typeof redirect === 'string') {
      base44.auth.logout(redirect);
    } else if (redirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  }, [queryClient]);

  const navigateToLogin = useCallback(() => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  }, []);

  /** Start the OAuth flow for a provider, returning to `returnTo` afterwards. */
  const loginWithProvider = useCallback((provider, returnTo) => {
    return base44.auth.loginWithProvider(provider, returnTo);
  }, []);

  /** Update fields on the signed-in user and refresh the shared auth cache. */
  const updateMe = useCallback(async (data) => {
    const updated = await base44.auth.updateMe(data);
    refreshUser();
    return updated;
  }, [refreshUser]);

  const value = useMemo(() => ({
    user,
    currentUser: user,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    appPublicSettings,
    logout,
    navigateToLogin,
    loginWithProvider,
    updateMe,
    checkAppState,
    refreshUser
  }), [
    user,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    appPublicSettings,
    logout,
    navigateToLogin,
    loginWithProvider,
    updateMe,
    checkAppState,
    refreshUser
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
