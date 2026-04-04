/**
 * L2DataExportSheet -- GDPR data export request
 */

import { useState } from 'react';
import { Download, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

export default function L2DataExportSheet() {
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        toast.error('Please sign in');
        setLoading(false);
        return;
      }

      // Record the export request
      await supabase.from('notifications').insert({
        user_email: 'admin',
        type: 'admin_alert',
        title: 'Data Export Request',
        message: `User ${session.user.email} requested a GDPR data export`,
        link: 'AdminDashboard',
      });

      setRequested(true);
      toast.success('Export request submitted');
    } catch {
      toast.error('Failed to submit request. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pt-4 pb-6">
      <div className="text-center py-8">
        {requested ? (
          <>
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-[#30D158]" />
            <h2 className="text-white font-black text-lg mb-2">Request Submitted</h2>
            <p className="text-white/50 text-sm max-w-xs mx-auto">
              We will prepare your data export and email it to you within 30 days, as required by GDPR.
            </p>
          </>
        ) : (
          <>
            <Download className="w-12 h-12 mx-auto mb-4 text-[#C8962C]" />
            <h2 className="text-white font-black text-lg mb-2">Export Your Data</h2>
            <p className="text-white/50 text-sm max-w-xs mx-auto mb-6">
              Request a copy of all your personal data stored by HOTMESS. This includes your profile, messages, orders, and activity.
            </p>
            <button
              onClick={handleRequest}
              disabled={loading}
              className="h-12 px-8 rounded-2xl font-bold text-sm text-black active:scale-95 transition-transform disabled:opacity-50"
              style={{ backgroundColor: '#C8962C' }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Request Data Export'
              )}
            </button>
            <p className="text-white/30 text-xs mt-4 max-w-xs mx-auto">
              You will receive an email with a download link within 30 days.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
