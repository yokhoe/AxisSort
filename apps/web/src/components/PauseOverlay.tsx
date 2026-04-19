/**
 * File: PauseOverlay.tsx
 * Purpose: Blocks user interaction while the backend processes a large batch of file actions.
 * Main exports: PauseOverlay
 * Dependencies: React, Framer Motion, Lucide
 * Notes: Shown when the hard threshold of the queue is reached.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, HardDriveUpload } from 'lucide-react';

interface PauseOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number;
}

export const PauseOverlay: React.FC<PauseOverlayProps> = ({
  isVisible,
  message = "Syncing with Disk...",
  progress
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-6 max-w-sm text-center"
          >
            <div className="relative">
              <div className="p-5 bg-blue-500/10 rounded-full text-blue-400">
                <HardDriveUpload size={32} />
              </div>
              <div className="absolute -top-1 -right-1">
                <Loader2 size={16} className="animate-spin text-blue-500" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight uppercase">Momentary Pause</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                {message}
              </p>
            </div>

            {progress !== undefined && (
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]"
                />
              </div>
            )}

            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] animate-pulse">
              Sorting will resume shortly
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
