import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

export default function RequireSubscription({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false,
  });

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
         base44.auth.redirectToLogin(location.pathname);
      } else {
         // Check subscription
         const hasActivePlan = user.plan_id === 'starter' || 
                               user.plan_id === 'pro' || 
                               (user.subscription_status === 'active' && !!user.plan_id) ||
                               user.plan_id === 'prod_TVmxD3pUgsBYrn'; // Check for specific stripe ID if used as plan_id

         if (!hasActivePlan) {
            navigate('/Features');
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

  const hasActivePlan = user.plan_id === 'starter' || 
                        user.plan_id === 'pro' || 
                        (user.subscription_status === 'active' && !!user.plan_id) ||
                        user.plan_id === 'prod_TVmxD3pUgsBYrn';

  if (!hasActivePlan) {
    return null; // Will redirect
  }

  return children;
}