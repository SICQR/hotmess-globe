import React from 'react';
import { ArrowLeft, MoreVertical, Search, Lock, Users as UsersIcon, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Chat thread header component
 * Displays participant info, encryption status, and actions
 */
export default function ChatHeader({
  thread,
  otherUsers,
  isGroupChat,
  isTelegramEncrypted,
  isMuted,
  showSearch,
  onBack,
  onToggleSearch,
  onToggleMute,
}) {
  return (
    <div className="bg-black border-b-2 border-white/20 p-4 flex items-center gap-3">
      <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden text-white hover:bg-white/10">
        <ArrowLeft className="w-5 h-5" />
      </Button>
      
      <div className="flex items-center gap-3 flex-1">
        {!isGroupChat ? (
          <>
            <div className="w-10 h-10 bg-gradient-to-br from-[#E62020] to-[#B026FF] flex items-center justify-center border-2 border-white">
              {otherUsers[0]?.avatar_url ? (
                <img src={otherUsers[0].avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-sm">{otherUsers[0]?.full_name?.[0] || 'U'}</span>
              )}
            </div>
            <div>
              <p className="font-black uppercase tracking-tight">{otherUsers[0]?.full_name || 'Unknown'}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-mono flex items-center gap-1">
                {thread.thread_type}
                {isTelegramEncrypted && (
                  <>
                    <span>•</span>
                    <Lock className="w-3 h-3 text-[#00D9FF]" />
                    <span className="text-[#00D9FF]">E2E</span>
                  </>
                )}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 bg-white/10 border-2 border-white flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-white/60" />
            </div>
            <div>
              <p className="font-black uppercase tracking-tight">{otherUsers.slice(0, 2).map(u => u.full_name).join(', ')}</p>
              {otherUsers.length > 2 && (
                <p className="text-[10px] text-white/60">+{otherUsers.length - 2} more</p>
              )}
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-mono flex items-center gap-1">
                GROUP • {thread.thread_type}
                {isTelegramEncrypted && (
                  <>
                    <span>•</span>
                    <Lock className="w-3 h-3 text-[#00D9FF]" />
                    <span className="text-[#00D9FF]">E2E</span>
                  </>
                )}
              </p>
            </div>
          </>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSearch}
        className="text-white/60 hover:text-white hover:bg-white/10"
      >
        <Search className="w-5 h-5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-black border-2 border-white text-white">
          <DropdownMenuItem onClick={onToggleMute} className="hover:bg-white/10 cursor-pointer">
            {isMuted ? (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Unmute Conversation
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4 mr-2" />
                Mute Conversation
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
