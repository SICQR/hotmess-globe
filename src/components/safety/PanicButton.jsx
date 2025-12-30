import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { base44 } from '@/api/base44Client';

export default function PanicButton() {
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePanic = async () => {
    try {
      // Sign out
      await base44.auth.logout();
      
      // Clear local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to neutral site
      window.location.href = 'https://www.google.com';
    } catch (error) {
      console.error('Panic exit failed:', error);
      // Force redirect anyway
      window.location.href = 'https://www.google.com';
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowConfirm(true)}
        variant="ghost"
        size="sm"
        className="fixed bottom-4 right-4 z-50 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-500"
      >
        <AlertTriangle className="w-4 h-4 mr-2" />
        PANIC
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-black border-red-500">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Emergency Exit
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/80">
              This will immediately sign you out, clear all local data, and redirect you to Google.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 border-white/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePanic}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Exit Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}