import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Flag, Check, X, Eye, User, MapPin, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { getProfileUrl, getDisplayName } from '@/lib/userPrivacy';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ModerationQueue() {
  const [filter, setFilter] = useState('pending');
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', filter],
    queryFn: async () => {
      if (filter === 'pending') {
        return base44.entities.Report.filter({ status: 'pending' }, '-created_date');
      }
      return base44.entities.Report.list('-created_date');
    },
    refetchInterval: 10000
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-moderation'],
    queryFn: () => base44.entities.User.list()
  });

  const resolveReportMutation = useMutation({
    mutationFn: async ({ reportId, action, notes }) => {
      await base44.entities.Report.update(reportId, {
        status: action === 'approve' ? 'resolved' : 'dismissed',
        admin_notes: notes,
        resolved_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      toast.success('Report resolved');
    }
  });

  const banUserMutation = useMutation({
    mutationFn: async (userEmail) => {
      const user = allUsers.find(u => u.email === userEmail);
      if (!user?.id) {
        throw new Error('User not found');
      }

      await base44.entities.User.update(user.id, { role: 'banned' });
      await base44.entities.NotificationOutbox.create({
        user_email: userEmail,
        notification_type: 'system',
        title: 'Account Suspended',
        message: 'Your account has been suspended due to violations of community guidelines.'
      });
    },
    onSuccess: () => {
      toast.success('User banned');
    }
  });

  const getReporter = (email) => allUsers.find(u => u.email === email);

  const getItemIcon = (type) => {
    switch (type) {
      case 'user': return User;
      case 'beacon': return MapPin;
      case 'product': return Package;
      default: return Flag;
    }
  };

  const reasonColors = {
    spam: 'bg-yellow-500/20 text-yellow-500',
    harassment: 'bg-red-500/20 text-red-500',
    inappropriate: 'bg-orange-500/20 text-orange-500',
    fake: 'bg-purple-500/20 text-purple-500',
    safety_concern: 'bg-red-600/20 text-red-600',
    other: 'bg-gray-500/20 text-gray-500'
  };

  if (isLoading) {
    return <div className="text-white/60">Loading reports...</div>;
  }

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase">Moderation Queue</h2>
          <p className="text-white/60 text-sm">
            {pendingCount} pending report{pendingCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
            <TabsTrigger value="all">All Reports</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="text-center py-12 border-2 border-white/10">
            <Flag className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No reports to review</p>
          </div>
        ) : (
          reports.map((report) => {
            const reporter = getReporter(report.reporter_email);
            const ItemIcon = getItemIcon(report.reported_item_type);

            return (
              <div
                key={report.id}
                className="bg-white/5 border border-white/10 p-6 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                      <ItemIcon className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={reasonColors[report.reason] || reasonColors.other}>
                          {report.reason}
                        </Badge>
                        <Badge variant="outline" className="border-white/20">
                          {report.reported_item_type}
                        </Badge>
                        {report.status !== 'pending' && (
                          <Badge className={report.status === 'resolved' ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'}>
                            {report.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-white/60 mb-1">
                        Reported by: {reporter?.full_name || 'Unknown user'}
                      </p>
                      <p className="text-xs text-white/40">
                        {format(new Date(report.created_date), 'MMM d, yyyy h:mm a')}
                      </p>
                      {report.details && (
                        <p className="text-sm text-white/80 mt-3 bg-white/5 p-3 border border-white/10">
                          {report.details}
                        </p>
                      )}
                      {report.admin_notes && (
                        <p className="text-xs text-white/40 mt-2 italic">
                          Admin notes: {report.admin_notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {report.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => resolveReportMutation.mutate({ 
                          reportId: report.id, 
                          action: 'dismiss',
                          notes: 'Reviewed - no action needed'
                        })}
                        variant="outline"
                        size="sm"
                        className="border-white/20"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Dismiss
                      </Button>
                      <Button
                        onClick={() => resolveReportMutation.mutate({ 
                          reportId: report.id, 
                          action: 'approve',
                          notes: 'Content removed/User warned'
                        })}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Take Action
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-white/10">
                  {report.reported_item_type === 'user' && (
                    <>
                      <Link to={getProfileUrl(user)}>
                        <Button variant="outline" size="sm" className="border-white/20">
                          <Eye className="w-3 h-3 mr-1" />
                          View Profile
                        </Button>
                      </Link>
                      <Button
                        onClick={() => {
                          if (confirm('Ban this user?')) {
                            banUserMutation.mutate(report.reported_item_id);
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="border-red-500/40 text-red-400 hover:bg-red-500/20"
                      >
                        <Flag className="w-3 h-3 mr-1" />
                        Ban User
                      </Button>
                    </>
                  )}
                  {report.reported_item_type === 'beacon' && (
                    <Link to={createPageUrl(`BeaconDetail?id=${report.reported_item_id}`)}>
                      <Button variant="outline" size="sm" className="border-white/20">
                        <Eye className="w-3 h-3 mr-1" />
                        View Beacon
                      </Button>
                    </Link>
                  )}
                  {report.reported_item_type === 'product' && (
                    <Link to={createPageUrl(`ProductDetail?id=${report.reported_item_id}`)}>
                      <Button variant="outline" size="sm" className="border-white/20">
                        <Eye className="w-3 h-3 mr-1" />
                        View Product
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}