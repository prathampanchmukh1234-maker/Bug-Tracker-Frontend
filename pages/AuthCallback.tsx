import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiUrl } from '../utils/api';
import { supabase } from '../utils/supabaseClient';

async function ensureProfile(accessToken: string, user: { email?: string; user_metadata?: Record<string, any> }) {
  const response = await fetch(apiUrl('/api/me'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Google User',
      email: user.email || ''
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to prepare user profile');
  }
}

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const finishAuth = async () => {
      if (!supabase) {
        toast.error('Frontend auth is not configured.');
        navigate('/login', { replace: true });
        return;
      }

      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const errorDescription = params.get('error_description');
        const errorCode = params.get('error');

        if (errorCode || errorDescription) {
          throw new Error(errorDescription || errorCode || 'Google authentication failed');
        }

        let accessToken: string | null = null;
        let authUser: { email?: string; user_metadata?: Record<string, any> } | null = null;

        // Supabase with detectSessionInUrl=true may already consume the PKCE code
        // before this route runs, so prefer the active session first.
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        accessToken = sessionData.session?.access_token ?? null;
        authUser = (sessionData.session?.user ?? null) as typeof authUser;

        if ((!accessToken || !authUser) && code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          accessToken = data.session?.access_token ?? null;
          authUser = (data.user ?? data.session?.user ?? null) as typeof authUser;
        }

        if (!accessToken || !authUser) {
          throw new Error('Google sign-in did not create a session. Check Supabase redirect URLs and Google provider settings.');
        }

        await ensureProfile(accessToken, authUser);
        toast.success('Signed in with Google!');
        navigate('/dashboard', { replace: true });
      } catch (error: any) {
        toast.error(error.message || 'Google authentication failed');
        navigate('/login', { replace: true });
      }
    };

    finishAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Signing you in with Google...</p>
      </div>
    </div>
  );
};
