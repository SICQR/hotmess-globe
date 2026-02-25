import React, { useState, useEffect } from 'react';
import { Edit, Save, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function EmergencyMessageEditor() {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      setMessage(user.emergency_message || '');
    };
    fetchUser();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ emergency_message: message });
      toast.success('Emergency message saved');
      setEditing(false);
    } catch (error) {
      toast.error('Failed to save message');
    } finally {
      setSaving(false);
    }
  };

  const defaultMessage = currentUser ? 
    `🚨 EMERGENCY ALERT from ${currentUser.full_name}: I need help!` : 
    '🚨 EMERGENCY ALERT: I need help!';

  return (
    <div className="bg-white/5 border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-black uppercase flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#C8962C]" />
          Emergency Message
        </h3>
        {!editing && (
          <Button
            onClick={() => setEditing(true)}
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white"
          >
            <Edit className="w-4 h-4" />
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={defaultMessage}
            className="bg-white/5 border-white/20 text-white h-32"
          />
          <p className="text-xs text-white/40">
            This message will be sent to your trusted contacts when you activate the panic button.
            Your location will be automatically included.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setMessage(currentUser?.emergency_message || '');
                setEditing(false);
              }}
              variant="outline"
              className="flex-1 border-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-[#C8962C] hover:bg-white text-white hover:text-black font-black"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Message'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-white/60 bg-white/5 p-4 rounded border border-white/10">
          {message || defaultMessage}
        </div>
      )}
    </div>
  );
}