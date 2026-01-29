import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, Plus, Edit, Trash2, GitBranch, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

/**
 * DomainManagement Component
 * Allows users to manage domain-to-git-branch mappings
 */
export default function DomainManagement() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form state for new domain
  const [newDomain, setNewDomain] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [newEnvironment, setNewEnvironment] = useState('preview');

  // Form state for editing
  const [editBranch, setEditBranch] = useState('');
  const [editEnvironment, setEditEnvironment] = useState('preview');

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const session = await base44.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error('Please log in to manage domains');
        return;
      }

      const response = await fetch('/api/domains', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch domains');
      }

      const result = await response.json();
      setDomains(result.data || []);
    } catch (error) {
      console.error('Error fetching domains:', error);
      toast.error('Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newDomain.trim() || !newBranch.trim()) {
      toast.error('Domain and branch are required');
      return;
    }

    try {
      const session = await base44.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/domains', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: newDomain.trim(),
          git_branch: newBranch.trim(),
          environment: newEnvironment,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add domain');
      }

      const result = await response.json();
      setDomains([result.data, ...domains]);
      setNewDomain('');
      setNewBranch('');
      setNewEnvironment('preview');
      setIsAdding(false);
      toast.success('Domain added successfully');
    } catch (error) {
      console.error('Error adding domain:', error);
      toast.error(error.message);
    }
  };

  const handleUpdate = async (id) => {
    try {
      const session = await base44.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/domains', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          git_branch: editBranch.trim(),
          environment: editEnvironment,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update domain');
      }

      const result = await response.json();
      setDomains(domains.map(d => d.id === id ? result.data : d));
      setEditingId(null);
      toast.success('Domain updated successfully');
    } catch (error) {
      console.error('Error updating domain:', error);
      toast.error(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this domain mapping?')) {
      return;
    }

    try {
      const session = await base44.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/domains?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete domain');
      }

      setDomains(domains.filter(d => d.id !== id));
      toast.success('Domain deleted successfully');
    } catch (error) {
      console.error('Error deleting domain:', error);
      toast.error('Failed to delete domain');
    }
  };

  const startEdit = (domain) => {
    setEditingId(domain.id);
    setEditBranch(domain.git_branch);
    setEditEnvironment(domain.environment);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBranch('');
    setEditEnvironment('preview');
  };

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="text-white/60 text-center">Loading domains...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="bg-white/5 border border-white/10 rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-[#FF1493]" />
          <h2 className="text-xl font-bold uppercase tracking-wider">Domain Management</h2>
        </div>
        {!isAdding && (
          <Button
            onClick={() => setIsAdding(true)}
            className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Domain
          </Button>
        )}
      </div>

      <p className="text-sm text-white/60 mb-6">
        Assign custom domains to specific Git branches. Production domains are automatically assigned to your main branch, while preview domains can be assigned to any branch.
      </p>

      {/* Add New Domain Form */}
      {isAdding && (
        <div className="bg-black/30 border border-[#FF1493]/30 rounded-lg p-4 mb-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                Domain
              </label>
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="example.com"
                className="bg-black border-white/20 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                Git Branch
              </label>
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-white/40" />
                <Input
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  placeholder="main, develop, feature/new-ui"
                  className="bg-black border-white/20 text-white flex-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                Environment
              </label>
              <Select value={newEnvironment} onValueChange={setNewEnvironment}>
                <SelectTrigger className="bg-black border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="preview">Preview</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAdd}
                className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Domain
              </Button>
              <Button
                onClick={() => {
                  setIsAdding(false);
                  setNewDomain('');
                  setNewBranch('');
                  setNewEnvironment('preview');
                }}
                variant="outline"
                className="border-white/20 text-white"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Domain List */}
      {domains.length === 0 ? (
        <div className="text-center py-8 text-white/40">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No domains configured yet.</p>
          <p className="text-sm mt-1">Add a domain to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map((domain) => (
            <div
              key={domain.id}
              className="bg-black/30 border border-white/10 rounded-lg p-4"
            >
              {editingId === domain.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                      Domain
                    </label>
                    <div className="text-white font-mono">{domain.domain}</div>
                  </div>

                  <div>
                    <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                      Git Branch
                    </label>
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-white/40" />
                      <Input
                        value={editBranch}
                        onChange={(e) => setEditBranch(e.target.value)}
                        className="bg-black border-white/20 text-white flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                      Environment
                    </label>
                    <Select value={editEnvironment} onValueChange={setEditEnvironment}>
                      <SelectTrigger className="bg-black border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="preview">Preview</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleUpdate(domain.id)}
                      className="bg-[#39FF14] hover:bg-[#39FF14]/90 text-black"
                      size="sm"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      onClick={cancelEdit}
                      variant="outline"
                      className="border-white/20 text-white"
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Globe className="w-4 h-4 text-[#FF1493]" />
                      <span className="font-mono text-white">{domain.domain}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        domain.environment === 'production'
                          ? 'bg-[#39FF14]/20 text-[#39FF14]'
                          : 'bg-[#00D9FF]/20 text-[#00D9FF]'
                      }`}>
                        {domain.environment}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <GitBranch className="w-4 h-4" />
                      <span className="font-mono">{domain.git_branch}</span>
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      Added {new Date(domain.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => startEdit(domain)}
                      variant="outline"
                      className="border-white/20 text-white"
                      size="sm"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(domain.id)}
                      variant="outline"
                      className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
