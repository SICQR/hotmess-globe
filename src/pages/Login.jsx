import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const getSafeNext = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return '/';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return '/';
};

export default function Login() {
  const location = useLocation();
  const params = new URLSearchParams(location.search || '');
  const next = getSafeNext(params.get('returnUrl') || params.get('next') || '/');

  return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
}
