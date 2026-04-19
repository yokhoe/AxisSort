/**
 * File: SettingsDrawer.tsx
 * Purpose: Displays application parameters and configuration.
 * Main exports: SettingsDrawer
 * Dependencies: React, Framer Motion, Lucide
 * Notes: Shown when the gear icon is clicked.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Folder, MoveHorizontal, MoveVertical, ShieldCheck, ShieldAlert, AlertCircle, CheckCircle2, Sun, Moon, Monitor } from 'lucide-react';

interface SettingsDrawerProps {
  settings: any;
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ settings, isOpen, onClose, theme, setTheme }) => {
  if (!isOpen || !settings) return null;

  const ThemeButton = ({ mode, label, icon: Icon }: { mode: 'light' | 'dark' | 'system'; label: string; icon: any }) => (
    <button
      onClick={() => setTheme(mode)}
      className={`flex flex-1 flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
        theme === mode
          ? 'bg-blue-600/10 dark:bg-blue-600/20 border-blue-500/50 text-blue-600 dark:text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
          : 'bg-slate-100 dark:bg-slate-800/40 border-black/5 dark:border-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800/60'
      }`}
    >
      <Icon size={18} />
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );

  const PathItem = ({ label, path, icon, exists, isDelete }: { label: string; path: string | null; icon: React.ReactNode; exists: boolean; isDelete?: boolean }) => (
    <div className={`flex flex-col gap-1.5 p-3 rounded-xl border transition-colors ${exists ? 'bg-slate-50 dark:bg-slate-800/50 border-black/5 dark:border-slate-700/50' : 'bg-red-500/10 border-red-500/30'}`}>
      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </div>
        {isDelete ? (
          <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-tighter bg-orange-500/10 px-2 py-0.5 rounded-full">Direct Delete</span>
        ) : exists ? (
          <CheckCircle2 size={12} className="text-green-500" />
        ) : (
          <div className="flex items-center gap-1">
            <AlertCircle size={12} className="text-red-500" />
            <span className="text-[9px] font-bold text-red-500 uppercase">Missing</span>
          </div>
        )}
      </div>
      <span title={path || ''} className={`text-xs break-all font-mono p-2 rounded-lg ${exists ? 'text-slate-700 dark:text-slate-300 bg-slate-200/50 dark:bg-black/20' : 'text-red-600 dark:text-red-400 bg-red-500/10'}`}>
        {path || 'Filesystem Delete'}
      </span>
    </div>
  );

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
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-black/5 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden transition-colors duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/5 bg-slate-50 dark:bg-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400">
                <Settings size={20} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">App Settings</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
            {/* Theme Selector */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-black/5 dark:border-slate-800 pb-2">Appearance</h3>
              <div className="flex gap-3">
                <ThemeButton mode="light" label="Light" icon={Sun} />
                <ThemeButton mode="dark" label="Dark" icon={Moon} />
                <ThemeButton mode="system" label="Auto" icon={Monitor} />
              </div>
            </div>

            {/* Mode & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-black/5 dark:border-slate-700 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Style</span>
                <div className="flex items-center justify-center gap-2 text-slate-900 dark:text-white">
                  {settings.mode === 'TinderPlus' ? <MoveVertical size={14} /> : <MoveHorizontal size={14} />}
                  <span className="text-sm font-bold truncate">
                    {settings.mode === 'TinderPlus' ? 'Tinder Plus' : 'Tinder'}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-xl border flex flex-col gap-1 ${settings.dryRun ? 'bg-orange-500/5 dark:bg-orange-500/10 border-orange-500/30 dark:border-orange-500/50' : 'bg-green-500/5 dark:bg-green-500/10 border-green-500/30 dark:border-green-500/50'}`}>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Safety</span>
                <div className={`flex items-center justify-center gap-2 ${settings.dryRun ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                  {settings.dryRun ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                  <span className="text-sm font-bold uppercase">{settings.dryRun ? 'Dry Run' : 'Live'}</span>
                </div>
              </div>
            </div>

            {/* Paths */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] border-b border-black/5 dark:border-slate-800 pb-2">Directories</h3>

              <PathItem
                label="Source Library"
                path={settings.sourceRoot.path}
                icon={<Folder size={14} />}
                exists={settings.sourceRoot.exists}
              />

              <div className="grid grid-cols-1 gap-3">
                <PathItem
                  label="Left Destination"
                  path={settings.destinations.left.path}
                  icon={<MoveHorizontal size={14} className="rotate-180" />}
                  exists={settings.destinations.left.exists}
                />
                <PathItem
                  label="Right Destination"
                  path={settings.destinations.right.path}
                  icon={<MoveHorizontal size={14} />}
                  exists={settings.destinations.right.exists}
                />

                {settings.mode === 'TinderPlus' && (
                  <>
                    <PathItem
                      label="Top Destination"
                      path={settings.destinations.up.path}
                      icon={<MoveVertical size={14} />}
                      exists={settings.destinations.up.exists}
                    />
                    <PathItem
                      label="Bottom Destination"
                      path={settings.destinations.down.path}
                      icon={<MoveVertical size={14} className="rotate-180" />}
                      exists={settings.destinations.down.exists}
                    />
                  </>
                )}

                <PathItem
                  label="Trash Destination"
                  path={settings.destinations.trash.path}
                  icon={<Folder size={14} className="text-red-500/50 dark:text-red-400/50" />}
                  exists={settings.destinations.trash.exists}
                  isDelete={settings.destinations.trash.isDelete}
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-black/5 dark:border-white/5">
            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl font-bold transition-colors text-sm uppercase tracking-widest text-slate-900 dark:text-slate-300 border border-black/5 dark:border-slate-600 shadow-sm"
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
