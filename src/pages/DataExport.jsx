import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/components/utils/supabaseClient';
import { Link } from 'react-router-dom';
import { 
  Download, 
  FileJson, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Shield,
  Database,
  User,
  MessageSquare,
  Calendar,
  ShoppingBag,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createPageUrl } from '../utils';

const DATA_CATEGORIES = [
  { 
    id: 'profile', 
    name: 'Profile Information', 
    icon: User,
    description: 'Your account details, preferences, and settings',
    tables: ['profiles']
  },
  { 
    id: 'messages', 
    name: 'Messages & Conversations', 
    icon: MessageSquare,
    description: 'All your direct messages and group chats',
    tables: ['message', 'conversation']
  },
  { 
    id: 'events', 
    name: 'Events & RSVPs', 
    icon: Calendar,
    description: 'Events you created or attended',
    tables: ['beacons', 'event_rsvps']
  },
  { 
    id: 'marketplace', 
    name: 'Marketplace Activity', 
    icon: ShoppingBag,
    description: 'Your orders, purchases, and saved items',
    tables: ['marketplace_order', 'cart_items']
  },
  { 
    id: 'social', 
    name: 'Social Connections', 
    icon: MapPin,
    description: 'Your follows, connections, and social activity',
    tables: ['user_follows', 'handshake']
  },
];

export default function DataExport() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportHistory, setExportHistory] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState('json');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Fetch export history
        const { data: history } = await supabase
          .from('data_export_requests')
          .select('*')
          .eq('user_email', currentUser.email)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (history) {
          setExportHistory(history);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExport = async () => {
    if (!user) return;
    
    setExporting(true);
    setExportProgress(0);
    
    try {
      const exportData = {
        exportedAt: new Date().toISOString(),
        format: selectedFormat,
        user: {},
        messages: [],
        events: [],
        marketplace: [],
        social: [],
      };

      // Export profile data
      setExportProgress(10);
      const { data: userData } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .single();
      
      if (userData) {
        // Remove sensitive fields
        const { auth_user_id, ...safeUserData } = userData;
        exportData.user = safeUserData;
      }

      // Export messages
      setExportProgress(25);
      const { data: messages } = await supabase
        .from('message')
        .select('*')
        .eq('sender_email', user.email);
      
      if (messages) {
        exportData.messages = messages;
      }

      // Export events/beacons created by user
      setExportProgress(40);
      const userId = user.auth_user_id || user.id;
      const { data: beacons } = await supabase
        .from('beacons')
        .select('*')
        .eq('owner_id', userId);
      
      if (beacons) {
        exportData.events = beacons;
      }

      // Export RSVPs
      setExportProgress(55);
      const { data: rsvps } = await supabase
        .from('event_rsvps')
        .select('*')
        .eq('user_email', user.email);
      
      if (rsvps) {
        exportData.rsvps = rsvps;
      }

      // Export marketplace orders
      setExportProgress(70);
      const { data: orders } = await supabase
        .from('marketplace_order')
        .select('*')
        .eq('buyer_email', user.email);
      
      if (orders) {
        exportData.marketplace = orders;
      }

      // Export social connections
      setExportProgress(85);
      const { data: follows } = await supabase
        .from('user_follows')
        .select('*')
        .or(`follower_email.eq.${user.email},following_email.eq.${user.email}`);
      
      if (follows) {
        exportData.social = follows;
      }

      // Export handshakes
      const { data: handshakes } = await supabase
        .from('handshake')
        .select('*')
        .or(`initiator_email.eq.${user.email},recipient_email.eq.${user.email}`);
      
      if (handshakes) {
        exportData.handshakes = handshakes;
      }

      setExportProgress(95);

      // Generate and download file
      let fileContent;
      let fileName;
      let mimeType;

      if (selectedFormat === 'json') {
        fileContent = JSON.stringify(exportData, null, 2);
        fileName = `hotmess-data-export-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else {
        // CSV format - flatten data
        fileContent = convertToCSV(exportData);
        fileName = `hotmess-data-export-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      }

      // Create download
      const blob = new Blob([fileContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log export request
      await supabase
        .from('data_export_requests')
        .insert({
          user_email: user.email,
          format: selectedFormat,
          status: 'completed',
          created_at: new Date().toISOString(),
        });

      setExportProgress(100);
      toast.success('Data export completed successfully');
      
      // Refresh export history
      const { data: updatedHistory } = await supabase
        .from('data_export_requests')
        .select('*')
        .eq('user_email', user.email)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (updatedHistory) {
        setExportHistory(updatedHistory);
      }

    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const convertToCSV = (data) => {
    const lines = [];
    
    // User data section
    lines.push('=== USER PROFILE ===');
    if (data.user) {
      lines.push(Object.keys(data.user).join(','));
      lines.push(Object.values(data.user).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
    }
    
    lines.push('');
    lines.push('=== MESSAGES ===');
    if (data.messages && data.messages.length > 0) {
      lines.push(Object.keys(data.messages[0]).join(','));
      data.messages.forEach(msg => {
        lines.push(Object.values(msg).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
      });
    }
    
    lines.push('');
    lines.push('=== EVENTS ===');
    if (data.events && data.events.length > 0) {
      lines.push(Object.keys(data.events[0]).join(','));
      data.events.forEach(event => {
        lines.push(Object.values(event).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
      });
    }
    
    lines.push('');
    lines.push('=== MARKETPLACE ORDERS ===');
    if (data.marketplace && data.marketplace.length > 0) {
      lines.push(Object.keys(data.marketplace[0]).join(','));
      data.marketplace.forEach(order => {
        lines.push(Object.values(order).map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));
      });
    }
    
    return lines.join('\n');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C8962C]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link 
            to={createPageUrl('Settings')} 
            className="inline-flex items-center text-white/60 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[#C8962C]/20 border border-[#C8962C]/40 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-[#C8962C]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
                Export Your Data
              </h1>
              <p className="text-white/60">Download a copy of all your HOTMESS data</p>
            </div>
          </div>
        </motion.div>

        {/* GDPR Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#00D9FF]/10 border border-[#00D9FF]/40 rounded-xl p-6 mb-6"
        >
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-[#00D9FF] mt-0.5" />
            <div>
              <h3 className="font-bold text-[#00D9FF] mb-2">Your Data Rights (GDPR)</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Under the General Data Protection Regulation (GDPR), you have the right to access 
                and receive a copy of your personal data. This export includes all data we store 
                about you in a portable format.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Data Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="text-lg font-bold uppercase tracking-wider mb-4">Included Data</h2>
          <div className="grid gap-3">
            {DATA_CATEGORIES.map((category) => (
              <div 
                key={category.id}
                className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <category.icon className="w-5 h-5 text-[#C8962C]" />
                </div>
                <div>
                  <h3 className="font-semibold">{category.name}</h3>
                  <p className="text-sm text-white/60">{category.description}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Export Format Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h2 className="text-lg font-bold uppercase tracking-wider mb-4">Export Format</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedFormat('json')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                selectedFormat === 'json' 
                  ? 'bg-[#C8962C]/20 border-[#C8962C]' 
                  : 'bg-white/5 border-white/10 hover:border-white/30'
              }`}
            >
              <FileJson className="w-8 h-8 mx-auto mb-2 text-[#C8962C]" />
              <div className="font-bold">JSON</div>
              <p className="text-xs text-white/60">Machine-readable format</p>
            </button>
            <button
              onClick={() => setSelectedFormat('csv')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                selectedFormat === 'csv' 
                  ? 'bg-[#39FF14]/20 border-[#39FF14]' 
                  : 'bg-white/5 border-white/10 hover:border-white/30'
              }`}
            >
              <FileText className="w-8 h-8 mx-auto mb-2 text-[#39FF14]" />
              <div className="font-bold">CSV</div>
              <p className="text-xs text-white/60">Spreadsheet compatible</p>
            </button>
          </div>
        </motion.div>

        {/* Export Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="w-full bg-[#C8962C] hover:bg-[#C8962C]/90 text-black font-bold py-6 text-lg"
          >
            {exporting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Exporting... {exportProgress}%
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Download My Data
              </>
            )}
          </Button>
          
          {exporting && (
            <div className="mt-4">
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#C8962C] transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Export History */}
        {exportHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-lg font-bold uppercase tracking-wider mb-4">Export History</h2>
            <div className="space-y-2">
              {exportHistory.map((request, idx) => (
                <div 
                  key={idx}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {request.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-[#39FF14]" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    )}
                    <div>
                      <div className="font-semibold">
                        {request.format?.toUpperCase() || 'JSON'} Export
                      </div>
                      <div className="text-sm text-white/60">
                        {new Date(request.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs uppercase px-2 py-1 rounded ${
                    request.status === 'completed' 
                      ? 'bg-[#39FF14]/20 text-[#39FF14]' 
                      : 'bg-yellow-500/20 text-yellow-500'
                  }`}>
                    {request.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Delete Account Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 pt-8 border-t border-white/10"
        >
          <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-bold text-red-500 mb-2">Delete Your Account</h3>
                <p className="text-sm text-white/80 mb-4">
                  If you want to permanently delete your account and all associated data, 
                  you can do so on the account deletion page. This action cannot be undone.
                </p>
                <Link to={createPageUrl('AccountDeletion')}>
                  <Button variant="outline" className="border-red-500/40 text-red-500 hover:bg-red-500/20">
                    Delete My Account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
