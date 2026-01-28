/**
 * TicketReseller - Main page for the ticket reseller platform
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket,
  ShoppingBag,
  Package,
  AlertTriangle,
  Plus,
  ArrowLeft,
  Search,
  User
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  TicketMarketplace,
  TicketOrders,
  TicketOrderDetail,
  SellerDashboard,
  DisputeCenter,
  TicketListingForm
} from '../components/ticket-reseller';

const TABS = [
  { id: 'browse', label: 'Browse', icon: Search },
  { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
  { id: 'selling', label: 'Selling', icon: Package },
  { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
];

export default function TicketReseller() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'browse');
  const [selectedOrderId, setSelectedOrderId] = useState(searchParams.get('order') || null);
  const [showListingForm, setShowListingForm] = useState(false);

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    const order = searchParams.get('order');
    
    if (tab && TABS.some(t => t.id === tab)) {
      setActiveTab(tab);
    }
    if (order) {
      setSelectedOrderId(order);
    }
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSelectedOrderId(null);
    setSearchParams({ tab: tabId });
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrderId(orderId);
    setSearchParams({ tab: activeTab, order: orderId });
  };

  const handleBackFromOrder = () => {
    setSelectedOrderId(null);
    setSearchParams({ tab: activeTab });
  };

  // If viewing order detail
  if (selectedOrderId) {
    return (
      <TicketOrderDetail
        orderId={selectedOrderId}
        onBack={handleBackFromOrder}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-800 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-pink-500" />
                  Ticket Resale
                </h1>
                <p className="text-xs text-gray-400">Secure P2P ticket marketplace</p>
              </div>
            </div>
            
            {isAuthenticated && (
              <button
                onClick={() => setShowListingForm(true)}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg font-medium text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Sell Ticket
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-[73px] z-30 bg-black/95 backdrop-blur-xl border-b border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              // Hide purchases/selling/disputes tabs if not authenticated
              if (['purchases', 'selling', 'disputes'].includes(tab.id) && !isAuthenticated) {
                return null;
              }
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-pink-500/20 text-pink-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'browse' && (
            <TicketMarketplace />
          )}
          
          {activeTab === 'purchases' && (
            isAuthenticated ? (
              <TicketOrders onSelectOrder={handleSelectOrder} />
            ) : (
              <AuthPrompt message="Sign in to view your purchases" />
            )
          )}
          
          {activeTab === 'selling' && (
            isAuthenticated ? (
              <SellerDashboard />
            ) : (
              <AuthPrompt message="Sign in to sell tickets" />
            )
          )}
          
          {activeTab === 'disputes' && (
            isAuthenticated ? (
              <DisputeCenter />
            ) : (
              <AuthPrompt message="Sign in to view disputes" />
            )
          )}
        </motion.div>
      </AnimatePresence>

      {/* Listing Form Modal */}
      <AnimatePresence>
        {showListingForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowListingForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] overflow-y-auto"
            >
              <TicketListingForm
                onSuccess={(listing) => {
                  setShowListingForm(false);
                  handleTabChange('selling');
                }}
                onCancel={() => setShowListingForm(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Banner for non-authenticated users */}
      {!isAuthenticated && activeTab === 'browse' && (
        <div className="fixed bottom-20 left-4 right-4 z-30">
          <div className="container mx-auto max-w-lg">
            <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-sm text-center">
                <span className="text-white font-medium">Sign in</span>
                <span className="text-gray-300"> to buy or sell tickets securely</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Auth prompt component
function AuthPrompt({ message }) {
  const navigate = useNavigate();
  
  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
      <h3 className="text-xl font-semibold mb-2">{message}</h3>
      <p className="text-gray-400 mb-6">
        Create an account or sign in to access this feature
      </p>
      <button
        onClick={() => navigate('/auth')}
        className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg font-medium"
      >
        Sign In
      </button>
    </div>
  );
}
