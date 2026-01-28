/**
 * SellerDashboard - Dashboard for ticket resellers
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Ticket,
  TrendingUp,
  Star,
  Shield,
  CheckCircle,
  AlertTriangle,
  Plus,
  Clock,
  DollarSign,
  Eye
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import TicketListingForm from './TicketListingForm';

export default function SellerDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showListingForm, setShowListingForm] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/ticket-reseller/seller/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Seller Dashboard</h1>
              <p className="text-gray-400">Manage your ticket listings</p>
            </div>
            <button
              onClick={() => setShowListingForm(true)}
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              List a Ticket
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Verification Status */}
        {stats?.verification && (
          <div className={`p-4 rounded-xl flex items-center justify-between ${
            stats.verification.status === 'verified'
              ? 'bg-green-900/20 border border-green-500/30'
              : stats.verification.status === 'pending'
              ? 'bg-yellow-900/20 border border-yellow-500/30'
              : 'bg-gray-900/50 border border-gray-800'
          }`}>
            <div className="flex items-center gap-3">
              {stats.verification.status === 'verified' ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : stats.verification.status === 'pending' ? (
                <Clock className="w-6 h-6 text-yellow-400" />
              ) : (
                <Shield className="w-6 h-6 text-gray-400" />
              )}
              <div>
                <p className="font-medium capitalize">{stats.verification.status} Seller</p>
                <p className="text-sm text-gray-400">
                  Trust Score: {stats.verification.trustScore?.toFixed(0)}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stats.verification.idVerified && (
                <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs">
                  ID Verified
                </span>
              )}
              {stats.verification.phoneVerified && (
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">
                  Phone Verified
                </span>
              )}
              {stats.verification.stripeConnected && (
                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                  Payments Connected
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Ticket className="w-4 h-4" />
              <span className="text-sm">Active Listings</span>
            </div>
            <p className="text-2xl font-bold">{stats?.listings?.active || 0}</p>
            <p className="text-xs text-gray-500">
              of {stats?.verification?.maxActiveListings || 3} allowed
            </p>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Completed Sales</span>
            </div>
            <p className="text-2xl font-bold">{stats?.orders?.completed || 0}</p>
            <p className="text-xs text-gray-500">
              {stats?.orders?.pending || 0} pending
            </p>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Total Earnings</span>
            </div>
            <p className="text-2xl font-bold">
              £{(stats?.orders?.totalRevenue || 0).toFixed(2)}
            </p>
            <p className="text-xs text-green-400">
              +£{(stats?.orders?.pendingRevenue || 0).toFixed(2)} pending
            </p>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Star className="w-4 h-4" />
              <span className="text-sm">Rating</span>
            </div>
            <p className="text-2xl font-bold">
              {stats?.reviews?.averageRating?.toFixed(1) || '-'}
            </p>
            <p className="text-xs text-gray-500">
              {stats?.reviews?.total || 0} reviews
            </p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-pink-500" />
            Last 30 Days
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-gray-400 text-sm">New Listings</p>
              <p className="text-xl font-semibold">{stats?.recent?.listings || 0}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Orders</p>
              <p className="text-xl font-semibold">{stats?.recent?.orders || 0}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Revenue</p>
              <p className="text-xl font-semibold">£{(stats?.recent?.revenue || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Views Stats */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-500" />
            Listing Performance
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Total Views</p>
              <p className="text-xl font-semibold">{stats?.listings?.totalViews || 0}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Conversion Rate</p>
              <p className="text-xl font-semibold">
                {stats?.listings?.total > 0
                  ? ((stats.listings.sold / stats.listings.total) * 100).toFixed(1)
                  : '0'
                }%
              </p>
            </div>
          </div>
        </div>

        {/* Limits & Verification CTA */}
        {!stats?.verification?.idVerified && (
          <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-pink-400 shrink-0" />
              <div>
                <h4 className="font-medium">Increase your limits</h4>
                <p className="text-sm text-gray-400 mt-1">
                  Verify your identity to list more tickets (up to 15) and higher values (up to £1000).
                </p>
                <button className="mt-3 px-4 py-2 bg-pink-500 rounded-lg text-sm font-medium hover:bg-pink-600 transition-colors">
                  Verify Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Warning if there are disputes */}
        {stats?.orders?.disputed > 0 && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
              <div>
                <h4 className="font-medium text-red-400">
                  {stats.orders.disputed} Active Dispute{stats.orders.disputed > 1 ? 's' : ''}
                </h4>
                <p className="text-sm text-gray-400 mt-1">
                  Please respond to open disputes promptly to maintain your seller status.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Listing Form Modal */}
      {showListingForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowListingForm(false)}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <TicketListingForm
              onSuccess={() => {
                setShowListingForm(false);
                fetchStats();
              }}
              onCancel={() => setShowListingForm(false)}
            />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
