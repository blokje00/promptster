import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { hasValidAccess } from '@/components/lib/subscriptionUtils';

export default function RequireSubscription({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { navigateToLogin } = useAuth();
  
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
         navigateToLogin();
      } else {
         // Check trial or subscription using centralized utility
         if (!hasValidAccess(user)) {
            navigate('/Subscription');
         }
      }
    }
  }, [user, isLoading, navigate, location]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!hasValidAccess(user)) {
    return null; // Will redirect
  }

  return children;
}