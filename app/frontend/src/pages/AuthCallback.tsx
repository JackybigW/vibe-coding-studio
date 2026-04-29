import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { resetClient } from '@/lib/api';

export default function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessedCallbackRef = useRef(false);

  useEffect(() => {
    if (hasProcessedCallbackRef.current) return;
    hasProcessedCallbackRef.current = true;

    const fragment = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(fragment);
    const token = params.get('token');

    if (token) {
      localStorage.setItem('token', token);
      resetClient();
      window.history.replaceState(null, '', '/dashboard');
      navigate('/dashboard', { replace: true });
      return;
    }

    const errorPath = '/auth/error?msg=Missing%20authentication%20token';
    window.history.replaceState(null, '', errorPath);
    navigate(errorPath, { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing authentication...</p>
      </div>
    </div>
  );
}
