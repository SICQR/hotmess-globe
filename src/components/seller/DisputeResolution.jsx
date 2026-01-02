import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, MessageSquare, Upload, Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function DisputeResolution({ sellerEmail, isBuyer = false }) {
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [response, setResponse] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const { data: disputes = [] } = useQuery({
    queryKey: ['disputes', sellerEmail],
    queryFn: () => {
      const filter = isBuyer 
        ? { initiator_email: sellerEmail }
        : { respondent_email: sellerEmail };
      return base44.entities.OrderDispute.filter(filter, '-created_date');
    },
    enabled: !!sellerEmail
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders-disputes'],
    queryFn: () => base44.entities.Order.list()
  });

  const respondMutation = useMutation({
    mutationFn: async ({ disputeId, responseText, evidenceUrl }) => {
      await base44.entities.OrderDispute.update(disputeId, {
        status: 'under_review',
        admin_notes: `${response}\nEvidence: ${evidenceUrl || 'None provided'}`
      });
      
      // Notify other party
      const dispute = disputes.find(d => d.id === disputeId);
      await base44.entities.NotificationOutbox.create({
        user_email: isBuyer ? dispute.respondent_email : dispute.initiator_email,
        notification_type: 'dispute_update',
        title: 'Dispute Response',
        message: `The other party has responded to your dispute`,
        metadata: { dispute_id: disputeId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['disputes']);
      setResponse('');
      setEvidenceFile(null);
      toast.success('Response submitted');
    }
  });

  const handleUploadEvidence = async () => {
    if (!evidenceFile) return null;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: evidenceFile });
      return file_url;
    } catch (error) {
      toast.error('Failed to upload evidence');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitResponse = async (disputeId) => {
    const evidenceUrl = await handleUploadEvidence();
    respondMutation.mutate({ disputeId, responseText: response, evidenceUrl });
  };

  const statusColors = {
    open: 'bg-yellow-500/20 text-yellow-500',
    under_review: 'bg-blue-500/20 text-blue-500',
    resolved_buyer: 'bg-green-500/20 text-green-500',
    resolved_seller: 'bg-green-500/20 text-green-500',
    resolved_partial: 'bg-purple-500/20 text-purple-500',
    closed: 'bg-gray-500/20 text-gray-500'
  };

  const disputeTypeLabels = {
    not_received: 'Item Not Received',
    not_as_described: 'Not As Described',
    damaged: 'Damaged Item',
    wrong_item: 'Wrong Item',
    payment_issue: 'Payment Issue',
    other: 'Other'
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black uppercase flex items-center gap-2">
        <AlertTriangle className="w-6 h-6 text-[#FF6B35]" />
        Disputes
      </h2>

      {disputes.length === 0 ? (
        <div className="text-center py-12 border-2 border-white/10">
          <Check className="w-16 h-16 text-green-500/40 mx-auto mb-4" />
          <p className="text-white/40">No active disputes</p>
        </div>
      ) : (
        disputes.map((dispute) => {
          const order = orders.find(o => o.id === dispute.order_id);
          
          return (
            <div
              key={dispute.id}
              className="bg-white/5 border border-white/10 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={statusColors[dispute.status]}>
                      {dispute.status.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline">
                      {disputeTypeLabels[dispute.dispute_type]}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-lg">
                    Order #{dispute.order_id.slice(0, 8)}
                  </h3>
                  <p className="text-sm text-white/60">
                    Opened {format(new Date(dispute.created_date), 'MMM d, yyyy')}
                  </p>
                </div>
                {order && (
                  <div className="text-right">
                    <div className="text-xl font-black text-[#FFEB3B]">
                      {order.total_xp.toLocaleString()} XP
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white/5 p-4 border border-white/10 mb-4">
                <p className="text-sm text-white/80">{dispute.description}</p>
                {dispute.evidence_urls?.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {dispute.evidence_urls.map((url, idx) => (
                      <img key={idx} src={url} alt="Evidence" className="w-20 h-20 object-cover rounded" />
                    ))}
                  </div>
                )}
              </div>

              {dispute.status === 'open' && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Your response..."
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    className="bg-white/5 border-white/20 text-white"
                  />
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEvidenceFile(e.target.files[0])}
                      className="hidden"
                      id={`evidence-${dispute.id}`}
                    />
                    <label htmlFor={`evidence-${dispute.id}`}>
                      <Button variant="outline" className="border-white/20" as="span">
                        <Upload className="w-4 h-4 mr-2" />
                        {evidenceFile ? 'File Selected' : 'Upload Evidence'}
                      </Button>
                    </label>
                    
                    <Button
                      onClick={() => handleSubmitResponse(dispute.id)}
                      disabled={!response.trim() || uploading || respondMutation.isPending}
                      className="bg-[#00D9FF] hover:bg-white text-black font-black"
                    >
                      {uploading ? 'Uploading...' : 'Submit Response'}
                    </Button>
                  </div>
                </div>
              )}

              {dispute.status === 'under_review' && (
                <div className="flex items-center gap-2 text-sm text-blue-400">
                  <Clock className="w-4 h-4" />
                  <span>Under admin review</span>
                </div>
              )}

              {dispute.resolution && (
                <div className="bg-green-500/10 border border-green-500/30 p-4 mt-4">
                  <h4 className="font-bold text-green-400 mb-2">Resolution</h4>
                  <p className="text-sm text-white/80">{dispute.resolution}</p>
                  {dispute.refund_amount_xp > 0 && (
                    <p className="text-sm text-green-400 mt-2">
                      Refund: {dispute.refund_amount_xp.toLocaleString()} XP
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}