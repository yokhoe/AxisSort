/**
 * File: SettingsDrawer.tsx
 * Purpose: Displays application parameters and configuration.
 * Main exports: SettingsDrawer
 * Dependencies: React, Framer Motion, Lucide
 * Notes: Shown when the gear icon is clicked.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Folder, MoveHorizontal, MoveVertical, ShieldCheck, ShieldAlert } from 'lucide-react';

interface SettingsDrawerProps {
  settings: any;
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ settings, isOpen, onClose }) => {
  if (!isOpen || !settings) return null;

  const PathItem = ({ label, path, icon }: { label: string; path: string; icon: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-xs text-slate-300 break-all font-mono bg-black/20 p-2 rounded-lg">{path}</span>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 w-full max-w-md rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                <Settings size={20} />
              </div>
              <h2 className="text-lg font-bold">App Settings</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
            {/* Mode & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Style</span>
                <div className="flex items-center justify-center gap-2 text-white">
                  {settings.mode === '4-way' || settings.mode === 'Tinder Plus' ? <MoveVertical size={14} /> : <MoveHorizontal size={14} />}
                  <span className="text-sm font-bold truncate">
                    {settings.mode === '4-way' || settings.mode === 'Tinder Plus' ? 'Tinder Plus' : 'Tinder'}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-xl border flex flex-col gap-1 ${settings.dryRun ? 'bg-orange-500/10 border-orange-500/50' : 'bg-green-500/10 border-green-500/50'}`}>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Safety</span>
                <div className={`flex items-center justify-center gap-2 ${settings.dryRun ? 'text-orange-400' : 'text-green-400'}`}>
                  {settings.dryRun ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                  <span className="text-sm font-bold uppercase">{settings.dryRun ? 'Dry Run' : 'Live'}</span>
                </div>
              </div>
            </div>

            {/* Paths */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800 pb-2">Directories</h3>

              <PathItem label="Source Library" path={settings.sourceRoot} icon={<Folder size={14} />} />

              <div className="grid grid-cols-1 gap-3">
                <PathItem label="Left Destination" path={settings.destinations.left.path} icon={<MoveHorizontal size={14} className="rotate-180" />} />
                <PathItem label="Right Destination" path={settings.destinations.right.path} icon={<MoveHorizontal size={14} />} />

                {settings.mode === 'Tinder Plus' && (
                  <>
                    <PathItem label="Top Destination" path={settings.destinations.up.path} icon={<MoveVertical size={14} />} />
                    <PathItem label="Bottom Destination" path={settings.destinations.down.path} icon={<MoveVertical size={14} className="rotate-180" />} />
                  </>
                )}

                <PathItem label="Trash Destination" path={settings.destinations.trash.path} icon={<Folder size={14} className="text-red-400/50" />} />
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-800/30 border-t border-slate-800">
            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-colors text-sm uppercase tracking-widest"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
