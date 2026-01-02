import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flag, CheckCircle, XCircle, AlertTriangle, MessageCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ContentModeration() {
  const queryClient = useQueryClient();
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const { data: posts = [] } = useQuery({
    queryKey: ['admin-posts'],
    queryFn: () => base44.entities.CommunityPost.list('-created_date'),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 100),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['admin-comments'],
    queryFn: () => base44.entities.PostComment.list('-created_date', 100),
  });

  const updatePostMutation = useMutation({
    mutationFn: async ({ postId, status, reason }) => {
      await base44.entities.CommunityPost.update(postId, {
        moderation_status: status,
        moderation_reason: reason || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-posts']);
      toast.success('Post moderated');
    },
  });

  const flaggedPosts = posts.filter(p => p.moderation_status === 'flagged');
  const pendingPosts = posts.filter(p => p.moderation_status === 'pending');

  const generateAISummary = async () => {
    setLoadingSummary(true);
    try {
      const flaggedContent = flaggedPosts.slice(0, 10).map(p => ({
        user: p.user_name,
        content: p.content.substring(0, 200),
        reason: p.moderation_reason,
        sentiment: p.ai_sentiment
      }));

      const summary = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these flagged community posts and provide a moderation summary:

${JSON.stringify(flaggedContent, null, 2)}

Provide:
1. Common patterns or themes in flagged content
2. Risk assessment (low/medium/high)
3. Recommended actions
4. Any false positives you detect

Be concise and actionable.`,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            patterns: { type: "string" },
            risk_level: { type: "string" },
            recommendations: { type: "string" },
            false_positives: { type: "string" }
          }
        }
      });

      setAiSummary(summary);
    } catch (error) {
      toast.error('Failed to generate AI summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Moderation Summary */}
      {flaggedPosts.length > 0 && (
        <div className="bg-black border-2 border-[#FF1493] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FF1493]" />
              <h3 className="font-black uppercase">AI Moderation Insights</h3>
            </div>
            <Button
              onClick={generateAISummary}
              disabled={loadingSummary}
              className="bg-[#FF1493] hover:bg-white text-black font-black"
            >
              {loadingSummary ? 'Analyzing...' : 'Generate Summary'}
            </Button>
          </div>

          {aiSummary && (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">PATTERNS</p>
                <p className="text-white/80">{aiSummary.patterns}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">RISK LEVEL</p>
                <span className={`px-2 py-1 font-black uppercase text-xs border-2 ${
                  aiSummary.risk_level === 'high' ? 'bg-red-600/20 border-red-600 text-red-400' :
                  aiSummary.risk_level === 'medium' ? 'bg-[#FFEB3B]/20 border-[#FFEB3B] text-[#FFEB3B]' :
                  'bg-green-600/20 border-green-600 text-green-400'
                }`}>
                  {aiSummary.risk_level}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">RECOMMENDATIONS</p>
                <p className="text-white/80">{aiSummary.recommendations}</p>
              </div>
              {aiSummary.false_positives && (
                <div>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">FALSE POSITIVES</p>
                  <p className="text-white/80">{aiSummary.false_positives}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-black border-2 border-white p-6">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">TOTAL POSTS</p>
          <p className="text-4xl font-black">{posts.length}</p>
        </div>
        <div className="bg-black border-2 border-red-600 p-6">
          <p className="text-[10px] text-red-400 uppercase tracking-widest mb-2">FLAGGED</p>
          <p className="text-4xl font-black text-red-500">{flaggedPosts.length}</p>
        </div>
        <div className="bg-black border-2 border-[#FFEB3B] p-6">
          <p className="text-[10px] text-[#FFEB3B] uppercase tracking-widest mb-2">PENDING</p>
          <p className="text-4xl font-black text-[#FFEB3B]">{pendingPosts.length}</p>
        </div>
        <div className="bg-black border-2 border-white p-6">
          <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">MESSAGES</p>
          <p className="text-4xl font-black">{messages.length}</p>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="flagged" className="w-full">
        <TabsList className="bg-black border-2 border-white mb-6">
          <TabsTrigger value="flagged" className="data-[state=active]:bg-red-600 data-[state=active]:text-white font-black uppercase text-xs">
            <Flag className="w-3 h-3 mr-2" />
            Flagged ({flaggedPosts.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-[#FFEB3B] data-[state=active]:text-black font-black uppercase text-xs">
            <AlertTriangle className="w-3 h-3 mr-2" />
            Pending ({pendingPosts.length})
          </TabsTrigger>
          <TabsTrigger value="all-posts" className="data-[state=active]:bg-[#FF1493] data-[state=active]:text-black font-black uppercase text-xs">
            All Posts ({posts.length})
          </TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-[#00D9FF] data-[state=active]:text-black font-black uppercase text-xs">
            <MessageCircle className="w-3 h-3 mr-2" />
            Messages ({messages.length})
          </TabsTrigger>
        </TabsList>

        {/* Flagged Posts */}
        <TabsContent value="flagged">
          <div className="space-y-4">
            {flaggedPosts.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-black border-2 border-red-600 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-black uppercase">{post.user_name}</p>
                      <span className="text-xs text-white/40 font-mono">
                        {format(new Date(post.created_date), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <p className="text-white/80 mb-2">{post.content}</p>
                    {post.moderation_reason && (
                      <div className="bg-red-600/20 border-2 border-red-600/40 p-2 mt-2">
                        <p className="text-xs text-red-400 uppercase font-bold">
                          Reason: {post.moderation_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => updatePostMutation.mutate({ 
                      postId: post.id, 
                      status: 'approved' 
                    })}
                    className="bg-green-600 hover:bg-green-700 text-white border-2 border-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    APPROVE
                  </Button>
                  <Button
                    onClick={() => updatePostMutation.mutate({ 
                      postId: post.id, 
                      status: 'removed',
                      reason: 'Removed by admin'
                    })}
                    className="bg-red-600 hover:bg-red-700 text-white border-2 border-white"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    REMOVE
                  </Button>
                </div>
              </motion.div>
            ))}
            {flaggedPosts.length === 0 && (
              <div className="text-center py-20 bg-black border-2 border-white">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-white/60 uppercase text-sm">NO FLAGGED CONTENT</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Pending Posts */}
        <TabsContent value="pending">
          <div className="space-y-4">
            {pendingPosts.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-black border-2 border-[#FFEB3B] p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-black uppercase">{post.user_name}</p>
                      <span className="text-xs text-white/40 font-mono">
                        {format(new Date(post.created_date), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <p className="text-white/80">{post.content}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => updatePostMutation.mutate({ 
                      postId: post.id, 
                      status: 'approved' 
                    })}
                    className="bg-green-600 hover:bg-green-700 text-white border-2 border-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    APPROVE
                  </Button>
                  <Button
                    onClick={() => updatePostMutation.mutate({ 
                      postId: post.id, 
                      status: 'flagged',
                      reason: 'Needs review'
                    })}
                    className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-black border-2 border-white"
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    FLAG
                  </Button>
                </div>
              </motion.div>
            ))}
            {pendingPosts.length === 0 && (
              <div className="text-center py-20 bg-black border-2 border-white">
                <p className="text-white/60 uppercase text-sm">NO PENDING POSTS</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* All Posts */}
        <TabsContent value="all-posts">
          <div className="bg-black border-2 border-white divide-y-2 divide-white/10">
            {posts.slice(0, 50).map((post, idx) => (
              <div key={post.id} className="p-4 hover:bg-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-sm">{post.user_name}</p>
                    <p className="text-xs text-white/60 line-clamp-1">{post.content}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-black uppercase border-2 ${
                    post.moderation_status === 'approved' ? 'bg-green-600/20 border-green-600 text-green-400' :
                    post.moderation_status === 'flagged' ? 'bg-red-600/20 border-red-600 text-red-400' :
                    post.moderation_status === 'removed' ? 'bg-red-900/20 border-red-900 text-red-600' :
                    'bg-[#FFEB3B]/20 border-[#FFEB3B] text-[#FFEB3B]'
                  }`}>
                    {post.moderation_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Messages */}
        <TabsContent value="messages">
          <div className="bg-black border-2 border-white p-6">
            <p className="text-white/60 text-sm uppercase font-mono mb-4">
              RECENT MESSAGES (E2E ENCRYPTED - CONTENT NOT ACCESSIBLE)
            </p>
            <div className="space-y-2">
              {messages.slice(0, 30).map(msg => (
                <div key={msg.id} className="bg-white/5 border-2 border-white/10 p-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">{msg.sender_email}</span>
                    <span className="text-white/40">{format(new Date(msg.created_date), 'MMM d, HH:mm')}</span>
                  </div>
                  <p className="text-white/40 mt-1">Type: {msg.message_type}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}