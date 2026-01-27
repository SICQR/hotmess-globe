/**
 * TicketOrderDetail - Detailed view of a ticket order with transfer actions
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Ticket,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Upload,
  MessageCircle,
  Star,
  ExternalLink,
  Copy,
  Image,
  Send
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '../../lib/AuthContext';

const STATUS_DISPLAY = {
  pending: { label: 'Pending Payment', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  confirmed: { label: 'Payment Confirmed', color: 'text-green-400', bg: 'bg-green-500/20' },
  transfer_pending: { label: 'Awaiting Transfer', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  transferred: { label: 'Transferred', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  completed: { label: 'Completed', color: 'text-green-400', bg: 'bg-green-500/20' },
  disputed: { label: 'Disputed', color: 'text-red-400', bg: 'bg-red-500/20' },
  refunded: { label: 'Refunded', color: 'text-gray-400', bg: 'bg-gray-500/20' },
  cancelled: { label: 'Cancelled', color: 'text-gray-400', bg: 'bg-gray-500/20' },
};

export default function TicketOrderDetail({ orderId, onBack }) {
  const { user, token } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showProofUpload, setShowProofUpload] = useState(false);
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [proofUrls, setProofUrls] = useState([]);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/ticket-reseller/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setOrder(data);
      } else {
        toast.error(data.error || 'Failed to fetch order');
      }
    } catch (error) {
      toast.error('Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferAction = async (action) => {
    if (action === 'submit_proof' && proofUrls.length === 0) {
      toast.error('Please upload proof of transfer');
      return;
    }

    if (action === 'report_issue' && !notes) {
      toast.error('Please describe the issue');
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch('/api/ticket-reseller/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          action,
          proof_urls: proofUrls,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Action failed');
      }

      toast.success(data.message || 'Action completed');
      setShowProofUpload(false);
      setProofUrls([]);
      setNotes('');
      fetchOrder();

    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      const res = await fetch('/api/ticket-reseller/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      setMessage('');
      fetchOrder();
      toast.success('Message sent');

    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <p className="text-gray-400 mb-4">Order not found</p>
        <button onClick={onBack} className="text-pink-400 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const { order: orderData, userRole, timeline, actions, counterparty } = order;
  const listing = orderData.listing;
  const transfer = orderData.transfer?.[0];
  const dispute = orderData.dispute?.[0];
  const messages = orderData.messages || [];
  const statusInfo = STATUS_DISPLAY[orderData.status] || STATUS_DISPLAY.pending;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold">Order #{orderId.slice(0, 8)}</h1>
              <div className={`text-sm ${statusInfo.color}`}>
                {statusInfo.label}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Role Badge */}
        <div className={`inline-block px-3 py-1 rounded-full text-sm ${
          userRole === 'buyer' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-purple-500/20 text-purple-400'
        }`}>
          You are the {userRole}
        </div>

        {/* Event Info Card */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
          <h3 className="font-semibold text-lg mb-3">{listing?.event_name}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>{listing?.event_venue}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="w-4 h-4" />
              <span>{listing?.event_date && format(new Date(listing.event_date), 'MMM d, yyyy HH:mm')}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Ticket className="w-4 h-4" />
              <span className="capitalize">{listing?.ticket_type?.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
          <h4 className="font-medium mb-4">Order Timeline</h4>
          <div className="space-y-4">
            {timeline?.map((step, i) => (
              <div key={step.status} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  step.completed ? 'bg-green-500' : 'bg-gray-700'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-xs">{i + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={step.completed ? 'text-white' : 'text-gray-400'}>
                    {step.label}
                  </p>
                  {step.timestamp && (
                    <p className="text-xs text-gray-500">
                      {format(new Date(step.timestamp), 'MMM d, HH:mm')}
                    </p>
                  )}
                  {step.deadline && !step.completed && (
                    <p className="text-xs text-orange-400 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      Deadline: {formatDistanceToNow(new Date(step.deadline), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transfer Actions (for seller) */}
        {userRole === 'seller' && orderData.status === 'confirmed' && (
          <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4">
            <h4 className="font-medium text-orange-400 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Action Required: Transfer Ticket
            </h4>
            <p className="text-sm text-gray-300 mb-4">
              Please transfer the ticket to the buyer and upload proof of transfer.
            </p>
            
            {!showProofUpload ? (
              <button
                onClick={() => setShowProofUpload(true)}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg font-medium"
              >
                Upload Transfer Proof
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Proof Screenshots (URLs)
                  </label>
                  <input
                    type="text"
                    placeholder="Paste image URL"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value) {
                        setProofUrls([...proofUrls, e.target.value]);
                        e.target.value = '';
                      }
                    }}
                  />
                  {proofUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {proofUrls.map((url, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-800 rounded text-xs flex items-center gap-1">
                          <Image className="w-3 h-3" />
                          Proof {i + 1}
                          <button onClick={() => setProofUrls(proofUrls.filter((_, j) => j !== i))}>
                            <XCircle className="w-3 h-3 text-red-400" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Notes for buyer (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., I've transferred via email, check your inbox"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                    rows={2}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowProofUpload(false)}
                    className="flex-1 py-2 border border-gray-600 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleTransferAction('submit_proof')}
                    disabled={actionLoading || proofUrls.length === 0}
                    className="flex-1 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg disabled:opacity-50"
                  >
                    {actionLoading ? 'Submitting...' : 'Submit Proof'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Buyer Confirmation Actions */}
        {userRole === 'buyer' && transfer?.status === 'proof_submitted' && (
          <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-xl p-4">
            <h4 className="font-medium text-cyan-400 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Seller has submitted transfer proof
            </h4>
            
            {transfer.seller_proof_urls?.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">Proof of transfer:</p>
                <div className="flex gap-2">
                  {transfer.seller_proof_urls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-gray-800 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-700"
                    >
                      <Image className="w-4 h-4" />
                      View Proof {i + 1}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {transfer.seller_notes && (
              <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">Seller's note:</p>
                <p className="text-sm">{transfer.seller_notes}</p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => handleTransferAction('confirm_receipt')}
                disabled={actionLoading}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm Receipt'}
              </button>
              <button
                onClick={() => {
                  setNotes('');
                  handleTransferAction('report_issue');
                }}
                disabled={actionLoading}
                className="flex-1 py-3 border border-red-500 text-red-400 rounded-lg font-medium disabled:opacity-50"
              >
                Report Issue
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-3 text-center">
              Only confirm if you have received a valid ticket. Payment will be released to the seller.
            </p>
          </div>
        )}

        {/* Dispute Info */}
        {dispute && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
            <h4 className="font-medium text-red-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Dispute Open
            </h4>
            <p className="text-sm text-gray-300 mb-2">
              Reason: {dispute.reason.replace('_', ' ')}
            </p>
            <p className="text-sm text-gray-400">
              Status: {dispute.status.replace('_', ' ')}
            </p>
          </div>
        )}

        {/* Payment Summary */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
          <h4 className="font-medium mb-3">Payment Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Ticket Price</span>
              <span>£{orderData.subtotal_gbp?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Service Fee</span>
              <span>£{orderData.platform_fee_gbp?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-cyan-400">Buyer Protection</span>
              <span>£{orderData.buyer_protection_fee_gbp?.toFixed(2)}</span>
            </div>
            <div className="h-px bg-gray-700 my-2" />
            <div className="flex justify-between font-semibold">
              <span>{userRole === 'buyer' ? 'You paid' : 'Buyer paid'}</span>
              <span>£{orderData.total_gbp?.toFixed(2)}</span>
            </div>
            {userRole === 'seller' && (
              <div className="flex justify-between text-green-400">
                <span>You receive</span>
                <span>£{orderData.seller_payout_amount_gbp?.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Messages
          </h4>
          
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm">No messages yet</p>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto mb-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg ${
                    msg.sender_id === user?.id
                      ? 'bg-pink-500/20 ml-8'
                      : 'bg-gray-800 mr-8'
                  }`}
                >
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(msg.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
              ))}
            </div>
          )}
          
          {!['completed', 'refunded', 'cancelled'].includes(orderData.status) && (
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className="px-4 py-2 bg-pink-500 rounded-lg disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
