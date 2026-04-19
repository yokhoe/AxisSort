/**
 * File: HistoryDrawer.tsx
 * Purpose: Displays a log of sorting actions performed during the current session.
 * Main exports: HistoryDrawer
 * Dependencies: React, Framer Motion, Lucide
 * Notes: Provides visual confirmation of what has been sorted.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, CheckCircle2, Trash2, ArrowRight, Clock } from 'lucide-react';
import { ActionIntent } from '@coord-sort/shared';

interface HistoryDrawerProps {
  history: ActionIntent[];
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ history, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm touch-none"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, x: 20 }}
          animate={{ scale: 1, opacity: 1, x: 0 }}
          exit={{ scale: 0.95, opacity: 0, x: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 w-full max-w-md h-[80vh] rounded-3xl border border-black/5 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden transition-colors duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/5 bg-slate-50 dark:bg-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg text-purple-600 dark:text-purple-400">
                <History size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Session History</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
              <X size={24} />
            </button>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-full text-slate-400 dark:text-slate-600">
                  <Clock size={32} />
                </div>
                <p className="text-sm text-slate-500 font-medium">No actions performed yet this session.</p>
              </div>
            ) : (
              [...history].reverse().map((action) => (
                <div
                  key={action.id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col gap-3 group hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {action.actionType === 'trash' ? (
                        <Trash2 size={14} className="text-red-500 dark:text-red-400" />
                      ) : action.actionType === 'event' ? (
                        <Clock size={14} className="text-blue-500 dark:text-blue-400" />
                      ) : (
                        <CheckCircle2 size={14} className="text-green-600 dark:text-green-400" />
                      )}
                      <span className={`text-[10px] font-black uppercase tracking-widest ${action.actionType === 'event' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {action.actionType === 'trash' ? 'Trashed' :
                         action.actionType === 'event' ? 'System Event' :
                         `Moved to ${action.direction}`}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-600">
                      {new Date(action.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span
                      title={action.sourcePath}
                      className={`text-xs font-bold truncate ${action.actionType === 'event' ? 'text-blue-800 dark:text-blue-200' : 'text-slate-700 dark:text-slate-200'}`}
                    >
                      {action.sourcePath}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 overflow-hidden">
                      {action.actionType === 'event' ? (
                        <span className="truncate italic text-slate-400 dark:text-slate-600">System Notification</span>
                      ) : (
                        <>
                          <span className="truncate flex-1">Source</span>
                          <ArrowRight size={10} className="flex-shrink-0" />
                          <span
                            title={action.destinationPath}
                            className="truncate flex-1 text-blue-600 dark:text-blue-400/80 font-medium"
                          >
                            {action.destinationPath}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-black/5 dark:border-white/5">
            <button
              onClick={onClose}
              className="w-full py-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-300 rounded-xl font-bold transition-colors text-xs uppercase tracking-widest border border-black/5 dark:border-white/5 shadow-sm"
            >
              Close Log
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
