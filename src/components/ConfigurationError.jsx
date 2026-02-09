import React from 'react';
import { isSupabaseConfigured } from '@/components/utils/supabaseClient';

/**
 * ConfigurationError - Shows a helpful error banner when Supabase is misconfigured
 * 
 * This component appears at the top of the page when environment variables are missing,
 * providing clear instructions on how to fix the issue.
 */
export default function ConfigurationError() {
  // Only show if Supabase is not configured
  if (isSupabaseConfigured) return null;

  const isDev = import.meta.env.MODE === 'development';

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-4 shadow-lg">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2">Database Configuration Error</h3>
            <p className="mb-3">
              The application cannot connect to Supabase because environment variables are missing or invalid.
            </p>
            {isDev ? (
              <div className="bg-red-700/50 p-3 rounded text-sm space-y-2">
                <p className="font-semibold">For local development:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Create a <code className="bg-black/30 px-1 py-0.5 rounded">.env.local</code> file in the project root</li>
                  <li>Copy values from <code className="bg-black/30 px-1 py-0.5 rounded">.env.production</code> or <code className="bg-black/30 px-1 py-0.5 rounded">.env.example</code></li>
                  <li>Add:
                    <pre className="bg-black/50 p-2 rounded mt-1 overflow-x-auto">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here`}
                    </pre>
                  </li>
                  <li>Restart the dev server: <code className="bg-black/30 px-1 py-0.5 rounded">npm run dev</code></li>
                </ol>
              </div>
            ) : (
              <div className="bg-red-700/50 p-3 rounded text-sm space-y-2">
                <p className="font-semibold">For production deployment:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Go to your Vercel Dashboard</li>
                  <li>Navigate to Project Settings → Environment Variables</li>
                  <li>Add these variables:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li><code className="bg-black/30 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code></li>
                      <li><code className="bg-black/30 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code></li>
                    </ul>
                  </li>
                  <li>Redeploy the application</li>
                </ol>
              </div>
            )}
            <p className="mt-3 text-sm opacity-90">
              Check the browser console for more details about the current configuration status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
