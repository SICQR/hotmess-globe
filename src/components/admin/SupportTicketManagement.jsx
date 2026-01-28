import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import { 
  MessageSquare, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Mail,
  Filter,
  Search,
  Send,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Shield,
  HelpCircle,
  CreditCard,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const CATEGORY_ICONS = {
  general: MessageSquare,
  technical: HelpCircle,
  billing: CreditCard,
  safety: Shield,
  feedback: MessageCircle,
  business: Mail,
  other: MessageSquare,
};

const STATUS_COLORS = {
  open: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  waiting_response: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  resolved: 'bg-green-500/20 text-green-400 border-green-500/40',
  closed: 'bg-white/10 text-white/40 border-white/20',
};

const PRIORITY_COLORS = {
  low: 'text-white/40',
  normal: 'text-white/60',
  high: 'text-orange-400',
  urgent: 'text-red-500',
};

export default function SupportTicketManagement() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [responses, setResponses] = useState([]);
  const [newResponse, setNewResponse] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    priority: 'all',
    search: '',
  });
  const [stats, setStats] = useState({
    open: 0,
    in_progress: 0,
    resolved: 0,
    urgent: 0,
  });

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [filters.status, filters.category, filters.priority]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: allTickets } = await supabase
        .from('support_tickets')
        .select('status, priority');

      if (allTickets) {
        setStats({
          open: allTickets.filter(t => t.status === 'open').length,
          in_progress: allTickets.filter(t => t.status === 'in_progress').length,
          resolved: allTickets.filter(t => t.status === 'resolved').length,
          urgent: allTickets.filter(t => t.priority === 'urgent').length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchResponses = async (ticketId) => {
    try {
      const { data, error } = await supabase
        .from('ticket_responses')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setResponses(data || []);
    } catch (error) {
      console.error('Failed to fetch responses:', error);
    }
  };

  const handleTicketSelect = async (ticket) => {
    setSelectedTicket(ticket);
    await fetchResponses(ticket.id);
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const updates = { 
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw error;

      toast.success(`Ticket marked as ${newStatus.replace('_', ' ')}`);
      fetchTickets();
      fetchStats();

      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update ticket status');
    }
  };

  const handlePriorityChange = async (ticketId, newPriority) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          priority: newPriority,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast.success(`Priority set to ${newPriority}`);
      fetchTickets();
      fetchStats();
    } catch (error) {
      console.error('Failed to update priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const handleSendResponse = async () => {
    if (!newResponse.trim() || !selectedTicket) return;

    setSendingResponse(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Insert response
      const { error: responseError } = await supabase
        .from('ticket_responses')
        .insert({
          ticket_id: selectedTicket.id,
          responder_id: user?.id,
          responder_type: 'admin',
          message: newResponse,
        });

      if (responseError) throw responseError;

      // Update ticket status if it was open
      if (selectedTicket.status === 'open') {
        await supabase
          .from('support_tickets')
          .update({ 
            status: 'in_progress',
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedTicket.id);
      }

      // Update admin_response field
      await supabase
        .from('support_tickets')
        .update({ 
          admin_response: newResponse,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTicket.id);

      toast.success('Response sent successfully');
      setNewResponse('');
      fetchResponses(selectedTicket.id);
      fetchTickets();
    } catch (error) {
      console.error('Failed to send response:', error);
      toast.error('Failed to send response');
    } finally {
      setSendingResponse(false);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      ticket.subject?.toLowerCase().includes(searchLower) ||
      ticket.user_email?.toLowerCase().includes(searchLower) ||
      ticket.message?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black border-2 border-blue-500 p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <p className="text-[10px] text-white/40 uppercase tracking-widest">OPEN</p>
          </div>
          <p className="text-3xl font-black text-blue-400">{stats.open}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-black border-2 border-yellow-500 p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-5 h-5 text-yellow-400" />
            <p className="text-[10px] text-white/40 uppercase tracking-widest">IN PROGRESS</p>
          </div>
          <p className="text-3xl font-black text-yellow-400">{stats.in_progress}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-black border-2 border-green-500 p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-[10px] text-white/40 uppercase tracking-widest">RESOLVED</p>
          </div>
          <p className="text-3xl font-black text-green-400">{stats.resolved}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-black border-2 border-red-500 p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-[10px] text-white/40 uppercase tracking-widest">URGENT</p>
          </div>
          <p className="text-3xl font-black text-red-400">{stats.urgent}</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-black border-2 border-white/20 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search tickets..."
              className="pl-10 bg-black border-white/20"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="bg-black border-2 border-white/20 text-white px-4 py-2 text-sm uppercase tracking-wider"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_response">Waiting Response</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="bg-black border-2 border-white/20 text-white px-4 py-2 text-sm uppercase tracking-wider"
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="technical">Technical</option>
            <option value="billing">Billing</option>
            <option value="safety">Safety</option>
            <option value="feedback">Feedback</option>
            <option value="business">Business</option>
          </select>

          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="bg-black border-2 border-white/20 text-white px-4 py-2 text-sm uppercase tracking-wider"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          <Button 
            onClick={() => { fetchTickets(); fetchStats(); }}
            variant="outline"
            className="border-white/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket List */}
        <div className="bg-black border-2 border-white/20 p-4 max-h-[600px] overflow-y-auto">
          <h3 className="text-lg font-black uppercase tracking-tighter mb-4">
            Support Tickets ({filteredTickets.length})
          </h3>

          {loading ? (
            <div className="text-center py-8 text-white/40">Loading tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-8 text-white/40">No tickets found</div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => {
                const CategoryIcon = CATEGORY_ICONS[ticket.category] || MessageSquare;
                const isSelected = selectedTicket?.id === ticket.id;

                return (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => handleTicketSelect(ticket)}
                    className={`p-4 border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#FF1493] bg-[#FF1493]/10'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <CategoryIcon className={`w-5 h-5 mt-0.5 ${PRIORITY_COLORS[ticket.priority]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate">{ticket.subject}</p>
                          <p className="text-xs text-white/40 truncate">{ticket.user_email}</p>
                          <p className="text-xs text-white/60 mt-1 line-clamp-2">{ticket.message}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-[10px] uppercase px-2 py-1 border ${STATUS_COLORS[ticket.status]}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-white/40">
                          {formatDate(ticket.created_at)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ticket Detail */}
        <div className="bg-black border-2 border-white/20 p-4 max-h-[600px] overflow-y-auto">
          {selectedTicket ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black uppercase tracking-tighter">Ticket Detail</h3>
                <div className="flex gap-2">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                    className={`bg-black border-2 text-xs uppercase px-2 py-1 ${STATUS_COLORS[selectedTicket.status]}`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_response">Waiting Response</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <select
                    value={selectedTicket.priority}
                    onChange={(e) => handlePriorityChange(selectedTicket.id, e.target.value)}
                    className={`bg-black border-2 border-white/20 text-xs uppercase px-2 py-1 ${PRIORITY_COLORS[selectedTicket.priority]}`}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white/60">{selectedTicket.user_email}</span>
                </div>
                <h4 className="font-bold text-lg mb-2">{selectedTicket.subject}</h4>
                <p className="text-white/80 text-sm whitespace-pre-wrap">{selectedTicket.message}</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-white/40">
                  <span>Category: {selectedTicket.category}</span>
                  <span>Created: {formatDate(selectedTicket.created_at)}</span>
                </div>
              </div>

              {/* Response Thread */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-white/60">
                  Conversation ({responses.length})
                </h4>
                
                {responses.map((response) => (
                  <div
                    key={response.id}
                    className={`p-3 border-l-4 ${
                      response.responder_type === 'admin'
                        ? 'border-[#FF1493] bg-[#FF1493]/5'
                        : 'border-[#00D9FF] bg-[#00D9FF]/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase">
                        {response.responder_type === 'admin' ? 'Support Team' : 'User'}
                      </span>
                      <span className="text-xs text-white/40">{formatDate(response.created_at)}</span>
                    </div>
                    <p className="text-sm text-white/80 whitespace-pre-wrap">{response.message}</p>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <div className="pt-4 border-t border-white/10">
                <label className="text-sm font-bold uppercase tracking-wider text-white/60 mb-2 block">
                  Send Reply
                </label>
                <textarea
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  placeholder="Type your response..."
                  className="w-full bg-black border-2 border-white/20 p-3 text-white resize-none h-24 focus:border-[#FF1493] outline-none"
                />
                <Button
                  onClick={handleSendResponse}
                  disabled={!newResponse.trim() || sendingResponse}
                  className="mt-2 bg-[#FF1493] hover:bg-[#FF1493]/80 text-black font-bold"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendingResponse ? 'Sending...' : 'Send Response'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-white/40">
              <MessageSquare className="w-12 h-12 mb-4" />
              <p className="text-sm uppercase tracking-wider">Select a ticket to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
