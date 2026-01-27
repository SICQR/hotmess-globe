/**
 * TicketVerificationQueue - Admin panel for reviewing ticket verification requests
 * Only accessible to admins and moderators
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  User,
  Calendar,
  MapPin,
  Ticket,
  FileText,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Flag,
  MessageSquare,
  Loader2,
  Image,
  QrCode
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '../../lib/AuthContext';
import { VERIFICATION_LEVELS } from './TicketVerification';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending Review', color: 'yellow' },
  { value: 'approved', label: 'Approved', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'flagged', label: 'Flagged', color: 'orange' },
];

export default function TicketVerificationQueue() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // Fetch verification requests
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['verification-queue', statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/ticket-reseller/admin/verification-queue?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch queue');
      return res.json();
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ requestId, verificationLevel, notes }) => {
      const res = await fetch('/api/ticket-reseller/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          request_id: requestId,
          action: 'approve',
          verification_level: verificationLevel,
          notes,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Ticket verified and approved!');
      queryClient.invalidateQueries(['verification-queue']);
      setSelectedRequest(null);
      setReviewNotes('');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason, notes }) => {
      const res = await fetch('/api/ticket-reseller/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          request_id: requestId,
          action: 'reject',
          reject_reason: reason,
          notes,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Verification request rejected');
      queryClient.invalidateQueries(['verification-queue']);
      setSelectedRequest(null);
      setRejectReason('');
      setReviewNotes('');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Flag mutation
  const flagMutation = useMutation({
    mutationFn: async ({ requestId, flagReason }) => {
      const res = await fetch('/api/ticket-reseller/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          request_id: requestId,
          action: 'flag',
          flag_reason: flagReason,
        }),
      });
      if (!res.ok) throw new Error('Failed to flag');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Request flagged for further review');
      queryClient.invalidateQueries(['verification-queue']);
    },
  });

  const filteredRequests = requests.filter(req => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      req.listing?.event_name?.toLowerCase().includes(query) ||
      req.seller?.email?.toLowerCase().includes(query) ||
      req.confirmation_details?.order_reference?.toLowerCase().includes(query)
    );
  });

  const RequestCard = ({ request }) => {
    const isExpanded = expandedId === request.id;
    const listing = request.listing || {};
    const seller = request.seller || {};
    const proofs = request.proofs || [];
    const fraudCheck = request.fraud_check_result || {};

    return (
      <motion.div
        layout
        className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div
          onClick={() => setExpandedId(isExpanded ? null : request.id)}
          className="p-4 cursor-pointer hover:bg-gray-800/70 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold truncate">{listing.event_name || 'Unknown Event'}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  request.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                  request.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                  'bg-orange-500/20 text-orange-400'
                }`}>
                  {request.status}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {seller.email?.split('@')[0] || 'Unknown'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(request.submitted_at), { addSuffix: true })}
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {proofs.length} proofs
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Fraud Risk Indicator */}
              {fraudCheck.risk_score !== undefined && (
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  fraudCheck.risk_score > 70 ? 'bg-red-500/20 text-red-400' :
                  fraudCheck.risk_score > 40 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  Risk: {fraudCheck.risk_score}%
                </div>
              )}
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-700"
            >
              <div className="p-4 space-y-4">
                {/* Event Details */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-400">Event Details</h5>
                    <div className="bg-gray-900/50 rounded-lg p-3 space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-pink-400" />
                        <span className="capitalize">{listing.ticket_type?.replace('_', ' ')}</span>
                        <span className="text-gray-500">×{listing.ticket_quantity}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{listing.event_venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{listing.event_date && format(new Date(listing.event_date), 'PPp')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Price:</span>
                        <span>£{listing.asking_price_gbp} (orig: £{listing.original_price_gbp})</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-400">Confirmation Details</h5>
                    <div className="bg-gray-900/50 rounded-lg p-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Order Ref:</span>
                        <span className="font-mono">{request.confirmation_details?.order_reference || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Platform:</span>
                        <span className="capitalize">
                          {request.confirmation_details?.ticketing_platform?.replace('_', ' ') || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Purchaser Email:</span>
                        <span className="truncate max-w-[150px]">
                          {request.confirmation_details?.original_purchaser_email || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proofs Gallery */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-400">Uploaded Proofs</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {proofs.map((proof, idx) => (
                      <a
                        key={idx}
                        href={proof.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden group"
                      >
                        <img
                          src={proof.file_url}
                          alt={proof.proof_type}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ExternalLink className="w-6 h-6 text-white" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-2 py-1">
                          <span className="text-xs capitalize">
                            {proof.proof_type?.replace('_', ' ')}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Fraud Check Details */}
                {fraudCheck && Object.keys(fraudCheck).length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-400">Fraud Check Results</h5>
                    <div className={`bg-gray-900/50 rounded-lg p-3 border ${
                      fraudCheck.passed ? 'border-green-500/30' : 'border-yellow-500/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {fraudCheck.passed ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        )}
                        <span className={fraudCheck.passed ? 'text-green-400' : 'text-yellow-400'}>
                          {fraudCheck.message}
                        </span>
                      </div>
                      {fraudCheck.checks && (
                        <div className="space-y-1 text-sm">
                          {fraudCheck.checks.map((check, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              {check.passed ? (
                                <CheckCircle className="w-3 h-3 text-green-400" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-400" />
                              )}
                              <span className="text-gray-300">{check.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {fraudCheck.warnings?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-700">
                          <p className="text-xs text-gray-500 mb-1">Warnings:</p>
                          <ul className="space-y-1">
                            {fraudCheck.warnings.map((w, idx) => (
                              <li key={idx} className="text-xs text-yellow-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Seller Info */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-400">Seller Information</h5>
                  <div className="bg-gray-900/50 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium">{seller.full_name || seller.email?.split('@')[0]}</p>
                        <p className="text-sm text-gray-400">{seller.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-bold">{seller.total_sales || 0}</p>
                        <p className="text-xs text-gray-500">Sales</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold">{seller.average_rating?.toFixed(1) || '—'}</p>
                        <p className="text-xs text-gray-500">Rating</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold">{seller.trust_score || 0}%</p>
                        <p className="text-xs text-gray-500">Trust</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {request.status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => setSelectedRequest({ ...request, action: 'approve' })}
                      className="flex-1 py-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Approve
                    </button>
                    <button
                      onClick={() => setSelectedRequest({ ...request, action: 'reject' })}
                      className="flex-1 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Reject
                    </button>
                    <button
                      onClick={() => flagMutation.mutate({ requestId: request.id, flagReason: 'needs_review' })}
                      className="py-3 px-4 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-colors"
                    >
                      <Flag className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-cyan-400" />
            Verification Queue
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Review and approve ticket verification requests
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">
            {requests.filter(r => r.status === 'pending').length} pending
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                statusFilter === filter.value
                  ? 'bg-pink-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by event, seller, or order..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Queue List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/30 rounded-xl">
          <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No verification requests found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}

      {/* Approval/Rejection Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedRequest(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900 rounded-2xl overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  {selectedRequest.action === 'approve' ? (
                    <>
                      <CheckCircle className="w-6 h-6 text-green-400" />
                      Approve Verification
                    </>
                  ) : (
                    <>
                      <XCircle className="w-6 h-6 text-red-400" />
                      Reject Verification
                    </>
                  )}
                </h3>

                {selectedRequest.action === 'approve' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Verification Level
                      </label>
                      <select
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg"
                        defaultValue="verified"
                      >
                        <option value="basic">Basic Verified</option>
                        <option value="verified">Verified</option>
                        <option value="premium">Premium Verified</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedRequest.action === 'reject' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Rejection Reason *
                      </label>
                      <select
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg"
                      >
                        <option value="">Select reason...</option>
                        <option value="invalid_proof">Invalid or unclear proof</option>
                        <option value="mismatched_info">Information doesn't match</option>
                        <option value="duplicate_listing">Ticket already listed elsewhere</option>
                        <option value="suspected_fraud">Suspected fraud</option>
                        <option value="invalid_ticket">Ticket appears to be fake</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm text-gray-400 mb-2">
                    Internal Notes (Optional)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Notes for other moderators..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="flex-1 py-3 border border-gray-600 rounded-lg hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  {selectedRequest.action === 'approve' ? (
                    <button
                      onClick={() => approveMutation.mutate({
                        requestId: selectedRequest.id,
                        verificationLevel: 'verified',
                        notes: reviewNotes
                      })}
                      disabled={approveMutation.isPending}
                      className="flex-1 py-3 bg-green-500 text-black font-medium rounded-lg hover:bg-green-400 disabled:opacity-50"
                    >
                      {approveMutation.isPending ? 'Approving...' : 'Approve'}
                    </button>
                  ) : (
                    <button
                      onClick={() => rejectMutation.mutate({
                        requestId: selectedRequest.id,
                        reason: rejectReason,
                        notes: reviewNotes
                      })}
                      disabled={rejectMutation.isPending || !rejectReason}
                      className="flex-1 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-400 disabled:opacity-50"
                    >
                      {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
