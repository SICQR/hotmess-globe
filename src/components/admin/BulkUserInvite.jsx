import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function BulkUserInvite() {
  const [inviting, setInviting] = useState(false);
  const [results, setResults] = useState([]);

  const testUsers = [
    'alex@example.com',
    'jordan@example.com',
    'sam@example.com',
    'casey@example.com',
    'riley@example.com',
    'morgan@example.com',
    'taylor@example.com',
    'avery@example.com',
  ];

  const handleBulkInvite = async () => {
    setInviting(true);
    setResults([]);
    const inviteResults = [];

    for (const email of testUsers) {
      try {
        await base44.users.inviteUser(email, 'user');
        inviteResults.push({ email, success: true });
      } catch (error) {
        inviteResults.push({ email, success: false, error: error.message });
      }
    }

    setResults(inviteResults);
    setInviting(false);
    
    const successCount = inviteResults.filter(r => r.success).length;
    toast.success(`Invited ${successCount}/${testUsers.length} users`);
  };

  return (
    <div className="bg-white/5 border-2 border-white/10 p-6">
      <div className="flex items-center gap-3 mb-6">
        <UserPlus className="w-6 h-6 text-[#00D9FF]" />
        <div>
          <h2 className="text-xl font-black uppercase">Bulk User Invite</h2>
          <p className="text-xs text-white/60">Quick setup for testing</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-black/50 border border-white/10 p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Test Users ({testUsers.length})</p>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {testUsers.map(email => (
              <div key={email} className="text-white/60">{email}</div>
            ))}
          </div>
        </div>

        <Button
          onClick={handleBulkInvite}
          disabled={inviting}
          className="w-full bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black font-black"
        >
          {inviting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Inviting...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite All {testUsers.length} Users
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="bg-black/50 border border-white/10 p-4 max-h-64 overflow-y-auto">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Results</p>
            <div className="space-y-2">
              {results.map((result, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-white/60">{result.email}</span>
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-[#39FF14]" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 text-[10px]">{result.error}</span>
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-[#FFEB3B]/10 border border-[#FFEB3B]/30 p-3">
          <p className="text-xs text-[#FFEB3B]">
            ⚠️ Invited users must check their email and complete registration before appearing in Connect.
          </p>
        </div>
      </div>
    </div>
  );
}