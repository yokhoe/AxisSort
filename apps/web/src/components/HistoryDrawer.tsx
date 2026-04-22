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
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-md touch-none"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, x: 20 }}
          animate={{ scale: 1, opacity: 1, x: 0 }}
          exit={{ scale: 0.95, opacity: 0, x: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white/80 dark:bg-slate-900/80 w-full max-w-md h-[80vh] rounded-[2.5rem] border border-white/20 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl transition-colors duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-7 border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 dark:bg-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400">
                <History size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Session History</h2>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-slate-400">
              <X size={24} />
            </button>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-10 space-y-5">
                <div className="p-6 bg-white/40 dark:bg-slate-800/50 rounded-full text-slate-300 dark:text-slate-700">
                  <Clock size={48} />
                </div>
                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">No actions performed yet this session.</p>
              </div>
            ) : (
              [...history].reverse().map((action) => (
                <div
                  key={action.id}
                  className="p-5 bg-white/40 dark:bg-slate-800/30 rounded-3xl border border-black/5 dark:border-white/5 flex flex-col gap-4 group hover:bg-white/60 dark:hover:bg-slate-800/50 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      {action.actionType === 'trash' ? (
                        <Trash2 size={12} className="text-red-500 dark:text-red-400" />
                      ) : action.actionType === 'event' ? (
                        <Clock size={12} className="text-blue-500 dark:text-blue-400" />
                      ) : (
                        <CheckCircle2 size={12} className="text-green-600 dark:text-green-400" />
                      )}
                      <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${action.actionType === 'event' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {action.actionType === 'trash' ? 'Moved to Trash' :
                         action.actionType === 'event' ? 'System Event' :
                         `Moved to ${action.direction}`}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                      {new Date(action.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex gap-5 items-start">
                    {/* Thumbnail */}
                    <div className="relative w-20 h-20 rounded-2xl bg-black/5 dark:bg-black/40 overflow-hidden flex-shrink-0 border border-black/5 dark:border-white/5 shadow-inner">
                      {action.actionType !== 'event' ? (
                        <img
                          src={`/api/history/thumbnail/${action.id}`}
                          alt=""
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Clock size={24} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      {/* 1. Filename (Lighter Font Weight) */}
                      <span
                        title={action.sourcePath}
                        className={`text-sm font-bold truncate tracking-tight ${action.actionType === 'event' ? 'text-blue-800 dark:text-blue-200' : 'text-slate-900 dark:text-white'}`}
                      >
                        {action.sourcePath.split(/[\\/]/).pop()}
                      </span>

                      {/* Path Stack */}
                      <div className="flex flex-col gap-1 font-mono leading-tight">
                        {action.actionType === 'event' ? (
                          <span className="truncate italic text-slate-400 dark:text-slate-600 text-[10px]">System Notification</span>
                        ) : (
                          <>
                            {/* 2. Source Path (Small) */}
                            <div className="text-[9px] text-slate-400 dark:text-slate-500 truncate opacity-70" title={`Source: ${action.sourcePath}`}>
                              {(() => {
                                const sourceDir = action.sourcePath.split(/[\\/]/).slice(0, -1).join('\\');
                                return sourceDir.length > 55 ? `...${sourceDir.slice(-52)}` : sourceDir;
                              })()}
                            </div>
                            {/* 3. Destination Path (Slightly Larger) */}
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <ArrowRight size={12} className="text-blue-500/70 flex-shrink-0" />
                              <span
                                title={`Destination: ${action.destinationPath}`}
                                className="truncate text-blue-600 dark:text-blue-400/90 font-bold text-[11px]"
                              >
                                {action.destinationPath === 'SYSTEM DELETE'
                                  ? 'PERMANENT DELETE'
                                  : (action.destinationPath.length > 55 ? `...${action.destinationPath.slice(-52)}` : action.destinationPath)
                                }
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
