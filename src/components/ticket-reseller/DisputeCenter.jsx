/**
 * DisputeCenter - Manage and view ticket disputes
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  MessageCircle,
  ChevronRight,
  ArrowLeft,
  Image
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '../../lib/AuthContext';

const DISPUTE_REASONS = {
  ticket_not_received: 'Ticket Not Received',
  ticket_invalid: 'Ticket Invalid',
  wrong_ticket: 'Wrong Ticket',
  event_cancelled: 'Event Cancelled',
  seller_unresponsive: 'Seller Unresponsive',
  buyer_unresponsive: 'Buyer Unresponsive',
  other: 'Other',
};

const STATUS_DISPLAY = {
  open: { label: 'Open', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  under_review: { label: 'Under Review', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  awaiting_seller: { label: 'Awaiting Seller', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  awaiting_buyer: { label: 'Awaiting Buyer', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  escalated: { label: 'Escalated', color: 'text-red-400', bg: 'bg-red-500/20' },
  resolved_buyer_favor: { label: 'Resolved - Buyer Refunded', color: 'text-green-400', bg: 'bg-green-500/20' },
  resolved_seller_favor: { label: 'Resolved - Seller Paid', color: 'text-green-400', bg: 'bg-green-500/20' },
  resolved_partial: { label: 'Resolved - Partial Refund', color: 'text-green-400', bg: 'bg-green-500/20' },
  closed: { label: 'Closed', color: 'text-gray-400', bg: 'bg-gray-500/20' },
};

export default function DisputeCenter() {
  const { token, user } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [statement, setStatement] = useState('');
  const [evidence, setEvidence] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const fetchDisputes = async () => {
    try {
      const res = await fetch('/api/ticket-reseller/disputes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setDisputes(data.disputes || []);
      }
    } catch (error) {
      console.error('Failed to fetch disputes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!statement.trim()) {
      toast.error('Please provide your statement');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/ticket-reseller/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'respond',
          dispute_id: selectedDispute.id,
          statement,
          evidence,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message || 'Response submitted');
      setShowResponseForm(false);
      setStatement('');
      setEvidence([]);
      fetchDisputes();

    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddEvidence = async () => {
    if (evidence.length === 0) {
      toast.error('Please add evidence URLs');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/ticket-reseller/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'add_evidence',
          dispute_id: selectedDispute.id,
          evidence,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Evidence added');
      setEvidence([]);
      fetchDisputes();

    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Dispute Detail View
  if (selectedDispute) {
    const dispute = disputes.find(d => d.id === selectedDispute.id) || selectedDispute;
    const statusInfo = STATUS_DISPLAY[dispute.status] || STATUS_DISPLAY.open;
    const isBuyer = dispute.buyer_id === user?.id;
    const hasResponded = isBuyer ? dispute.buyer_submitted_at : dispute.seller_submitted_at;
    const myStatement = isBuyer ? dispute.buyer_statement : dispute.seller_statement;
    const myEvidence = isBuyer ? dispute.buyer_evidence : dispute.seller_evidence;
    const otherStatement = isBuyer ? dispute.seller_statement : dispute.buyer_statement;
    const otherEvidence = isBuyer ? dispute.seller_evidence : dispute.buyer_evidence;

    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-gray-800">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedDispute(null)} 
                className="p-2 hover:bg-gray-800 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-semibold">Dispute #{dispute.id.slice(0, 8)}</h1>
                <div className={`text-sm ${statusInfo.color}`}>{statusInfo.label}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Role Badge */}
          <div className={`inline-block px-3 py-1 rounded-full text-sm ${
            isBuyer ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'
          }`}>
            You are the {isBuyer ? 'buyer' : 'seller'}
          </div>

          {/* Dispute Info */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              Dispute Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Reason</span>
                <span>{DISPUTE_REASONS[dispute.reason] || dispute.reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Opened</span>
                <span>{format(new Date(dispute.created_at), 'MMM d, yyyy HH:mm')}</span>
              </div>
              {dispute.response_deadline && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Response Deadline</span>
                  <span className="text-orange-400">
                    {formatDistanceToNow(new Date(dispute.response_deadline), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-1">Initial Description:</p>
              <p className="text-sm">{dispute.description}</p>
            </div>
          </div>

          {/* Order Info */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <h3 className="font-medium mb-3">Order Details</h3>
            <div className="text-sm space-y-1">
              <p>{dispute.order?.listing?.event_name}</p>
              <p className="text-gray-400">Total: £{dispute.order?.total_gbp?.toFixed(2)}</p>
            </div>
          </div>

          {/* Your Response */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Your Response
            </h3>
            
            {hasResponded ? (
              <div>
                <p className="text-sm">{myStatement}</p>
                {myEvidence?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-400 mb-2">Your evidence:</p>
                    <div className="flex flex-wrap gap-2">
                      {myEvidence.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-gray-800 rounded text-xs flex items-center gap-1 hover:bg-gray-700"
                        >
                          <Image className="w-3 h-3" />
                          Evidence {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Add More Evidence */}
                {!['resolved_buyer_favor', 'resolved_seller_favor', 'resolved_partial', 'closed'].includes(dispute.status) && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400 mb-2">Add more evidence:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Evidence URL"
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.target.value) {
                            setEvidence([...evidence, e.target.value]);
                            e.target.value = '';
                          }
                        }}
                      />
                      <button
                        onClick={handleAddEvidence}
                        disabled={evidence.length === 0 || actionLoading}
                        className="px-4 py-2 bg-pink-500 rounded-lg text-sm disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                    {evidence.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {evidence.map((url, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-800 rounded text-xs flex items-center gap-1">
                            <Image className="w-3 h-3" />
                            New {i + 1}
                            <button onClick={() => setEvidence(evidence.filter((_, j) => j !== i))}>
                              <XCircle className="w-3 h-3 text-red-400" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : showResponseForm ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Your Statement</label>
                  <textarea
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    placeholder="Explain your side of the situation..."
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Evidence (URLs)</label>
                  <input
                    type="text"
                    placeholder="Paste evidence URL and press Enter"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value) {
                        setEvidence([...evidence, e.target.value]);
                        e.target.value = '';
                      }
                    }}
                  />
                  {evidence.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {evidence.map((url, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-800 rounded text-xs flex items-center gap-1">
                          <Image className="w-3 h-3" />
                          Evidence {i + 1}
                          <button onClick={() => setEvidence(evidence.filter((_, j) => j !== i))}>
                            <XCircle className="w-3 h-3 text-red-400" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResponseForm(false)}
                    className="flex-1 py-2 border border-gray-600 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRespond}
                    disabled={!statement.trim() || actionLoading}
                    className="flex-1 py-2 bg-pink-500 rounded-lg disabled:opacity-50"
                  >
                    {actionLoading ? 'Submitting...' : 'Submit Response'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-400 mb-4">
                  You haven't responded yet. Submit your statement and evidence.
                </p>
                <button
                  onClick={() => setShowResponseForm(true)}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg font-medium"
                >
                  Submit Response
                </button>
              </div>
            )}
          </div>

          {/* Other Party's Response */}
          {(otherStatement || otherEvidence?.length > 0) && (
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                {isBuyer ? "Seller's" : "Buyer's"} Response
              </h3>
              {otherStatement && <p className="text-sm">{otherStatement}</p>}
              {otherEvidence?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-2">Their evidence:</p>
                  <div className="flex flex-wrap gap-2">
                    {otherEvidence.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 bg-gray-800 rounded text-xs flex items-center gap-1 hover:bg-gray-700"
                      >
                        <Image className="w-3 h-3" />
                        Evidence {i + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resolution */}
          {dispute.resolution && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
              <h3 className="font-medium text-green-400 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Resolution
              </h3>
              <p className="text-sm">{dispute.resolution}</p>
              {dispute.resolution_notes && (
                <p className="text-sm text-gray-400 mt-2">{dispute.resolution_notes}</p>
              )}
              {(dispute.refund_amount_gbp > 0 || dispute.seller_payout_gbp > 0) && (
                <div className="mt-3 pt-3 border-t border-green-500/30 text-sm">
                  {dispute.refund_amount_gbp > 0 && (
                    <p>Refund to buyer: £{dispute.refund_amount_gbp.toFixed(2)}</p>
                  )}
                  {dispute.seller_payout_gbp > 0 && (
                    <p>Payout to seller: £{dispute.seller_payout_gbp.toFixed(2)}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Disputes List View
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Dispute Center</h1>
          <p className="text-gray-400">Manage disputes for your ticket transactions</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {disputes.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Disputes</h3>
            <p className="text-gray-400">You don't have any disputes. Keep it that way!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {disputes.map((dispute) => {
                const statusInfo = STATUS_DISPLAY[dispute.status] || STATUS_DISPLAY.open;
                const isActionNeeded = 
                  (dispute.userRole === 'buyer' && dispute.status === 'awaiting_buyer' && !dispute.buyer_submitted_at) ||
                  (dispute.userRole === 'seller' && dispute.status === 'awaiting_seller' && !dispute.seller_submitted_at) ||
                  (['open', 'under_review'].includes(dispute.status) && 
                   ((dispute.userRole === 'buyer' && !dispute.buyer_submitted_at) ||
                    (dispute.userRole === 'seller' && !dispute.seller_submitted_at)));

                return (
                  <motion.div
                    key={dispute.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => setSelectedDispute(dispute)}
                    className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-pink-500/50 transition-all"
                  >
                    {/* Action Needed Banner */}
                    {isActionNeeded && (
                      <div className="mb-3 px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">Response needed</span>
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            dispute.userRole === 'buyer'
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {dispute.userRole === 'buyer' ? 'Buyer' : 'Seller'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${statusInfo.bg} ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>

                        <h3 className="font-semibold line-clamp-1">
                          {dispute.order?.listing?.event_name || 'Order Dispute'}
                        </h3>

                        <p className="text-sm text-gray-400 mt-1">
                          {DISPUTE_REASONS[dispute.reason] || dispute.reason}
                        </p>

                        <p className="text-xs text-gray-500 mt-2">
                          Opened {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
                        </p>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-600 shrink-0" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
