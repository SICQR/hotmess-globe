import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Flag, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function ReportButton({ itemType, itemId, variant = 'ghost' }) {
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const reportMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      await base44.entities.Report.create({
        reporter_email: user.email,
        reported_item_type: itemType,
        reported_item_id: itemId,
        reason: data.reason,
        details: data.details
      });

      // Notify admins
      await base44.entities.Notification.create({
        user_email: 'admin',
        type: 'admin_alert',
        title: 'New Report',
        message: `${user.full_name || user.email} reported a ${itemType}`,
        link: 'AdminDashboard'
      });
    },
    onSuccess: () => {
      toast.success('Report submitted');
      setShowDialog(false);
      setReason('');
      setDetails('');
    },
    onError: () => {
      toast.error('Failed to submit report');
    }
  });

  const handleSubmit = () => {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }
    reportMutation.mutate({ reason, details });
  };

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        variant={variant}
        size="sm"
        className="text-white/60 hover:text-red-400"
      >
        <Flag className="w-4 h-4" />
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-black border-2 border-white text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              Report {itemType}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-white/60 uppercase mb-2 block">Reason</label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                  <SelectItem value="fake">Fake/misleading</SelectItem>
                  <SelectItem value="safety_concern">Safety concern</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-white/60 uppercase mb-2 block">Additional details (optional)</label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Help us understand the issue..."
                className="bg-white/5 border-white/20 text-white h-24"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowDialog(false)}
                variant="outline"
                className="flex-1 border-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={reportMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black"
              >
                {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}