/**
 * File: App.tsx
 * Purpose: Top-level application shell. Contains layout structure and major providers.
 * Main exports: App
 * Dependencies: React
 * Notes: Implements the core UX layout (gear menu top-left, trash top-right, photo stack center).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, Trash2, Undo2, AlertCircle, Sun, Moon, Monitor, MoveHorizontal, Move, ShieldCheck, ShieldAlert } from 'lucide-react';
import { ImageRecord, SwipeDirection, ActionIntent } from '@axissort/shared';
import { SwipeCard } from './components/SwipeCard';
import { MetadataDrawer } from './components/MetadataDrawer';
import { SettingsDrawer } from './components/SettingsDrawer';
import { PauseOverlay } from './components/PauseOverlay';
import { HistoryDrawer } from './components/HistoryDrawer';
import { AnimatePresence, motion } from 'framer-motion';

const Firework = () => {
  const style = useMemo(() => {
    const colors = ['yellow', 'khaki', 'white', 'lime', 'gold', 'mediumseagreen', 'pink', 'violet', 'fuchsia', 'orchid', 'plum', 'lavender', 'cyan', 'lightcyan', 'lightblue', 'PaleTurquoise', 'SkyBlue', 'aqua'];
    const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

    return {
      '--top': `${20 + Math.random() * 60}%`,
      '--left': `${10 + Math.random() * 80}%`,
      '--dur': `${1.5 + Math.random() * 1.5}s`,
      '--finalSize': `${30 + Math.random() * 30}vmin`,
      '--color1': getRandomColor(),
      '--color2': getRandomColor(),
      '--color3': getRandomColor(),
      '--color4': getRandomColor(),
      '--color5': getRandomColor(),
      '--color6': getRandomColor(),
      '--y': `${-20 - Math.random() * 30}vmin`,
      animationDelay: `${Math.random() * 2}s`
    } as React.CSSProperties;
  }, []);

  return <div className="firework" style={style}></div>;
};

const App: React.FC = () => {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [liveHistory, setLiveHistory] = useState<ActionIntent[]>([]);
  const [dryRunHistory, setDryRunHistory] = useState<ActionIntent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Initialize theme from localStorage immediately
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('axissort-theme') as any) || 'dark';
  });

  // Calculate if dark mode should be active
  const isDarkActive = useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return theme === 'dark';
  }, [theme]);

  // Apply theme to HTML element
  useEffect(() => {
    const html = window.document.documentElement;
    if (isDarkActive) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('axissort-theme', theme);
  }, [isDarkActive, theme]);

  const fetchData = useCallback(async () => {
    try {
      const [imagesRes, settingsRes, historyRes] = await Promise.all([
        fetch('/api/images/next'),
        fetch('/api/settings'),
        fetch('/api/history')
      ]);
      const imagesData = await imagesRes.json();
      const settingsData = await settingsRes.json();
      const historyData: ActionIntent[] = await historyRes.json();

      setImages(imagesData);
      setSettings(settingsData);

      // Note: We track session history locally only to keep counters starting at 0
      const pending = historyData.filter((a: any) => a.status === 'pending' || a.status === 'processing').length;
      setPendingCount(pending);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSettingsUpdate = useCallback(async (newSettings: any) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  }, [fetchData]);

  // Sync Pending state from server periodically if there are pending actions
  useEffect(() => {
    if (pendingCount === 0) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/history');
        const historyData: ActionIntent[] = await res.json();
        const pending = historyData.filter((a: any) => a.status === 'pending' || a.status === 'processing').length;
        setPendingCount(pending);
      } catch (err) {
        console.error('Failed to sync history:', err);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [pendingCount]);

  const handleSwipe = useCallback((direction: SwipeDirection) => {
    if (isSyncing) return;

    const currentPhoto = images[0];
    if (!currentPhoto) return;

    const destConfig = settings?.destinations?.[direction];

    if (destConfig) {
      if (!destConfig.isConfigured) {
        setErrorMessage(`The ${direction} sorting direction is not configured in your .env file.`);
        setResetTrigger(prev => prev + 1);
        return;
      }

      if (!destConfig.exists && !destConfig.isDelete) {
        setErrorMessage(`Destination "${destConfig.label}" (${destConfig.path}) is not accessible. Please ensure the path is correctly set and mounted.`);
        setResetTrigger(prev => prev + 1);
        return;
      }
    }

    const destPath = destConfig?.path || direction;
    const actionId = Math.random().toString(36).substr(2, 9);

    // Optimistically update session history
    const optimisticAction: ActionIntent = {
      id: actionId,
      imageId: currentPhoto.id,
      sourcePath: currentPhoto.filename,
      destinationPath: destConfig?.isDelete ? 'SYSTEM DELETE' : destPath,
      actionType: direction === 'trash' && destConfig?.isDelete ? 'trash' : 'move',
      direction,
      status: 'pending',
      createdAt: new Date().toISOString(),
      isDryRun: settings?.dryRun
    };

    if (settings?.dryRun) {
      setDryRunHistory(prev => [...prev, optimisticAction]);
    } else {
      setLiveHistory(prev => [...prev, optimisticAction]);
    }

    setPendingCount(prev => prev + 1);
    setImages((prev) => prev.slice(1));

    fetch('/api/images/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: actionId,
        imageId: currentPhoto.id,
        destinationPath: destConfig?.isDelete ? 'SYSTEM DELETE' : destPath,
        actionType: direction === 'trash' && destConfig?.isDelete ? 'trash' : 'move',
        direction
      })
    }).catch(err => {
      console.error('Failed to enqueue action:', err);
    });
  }, [images, settings, isSyncing]);

  const handleUndo = useCallback(async () => {
    try {
      const res = await fetch('/api/actions/undo', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        // Remove from session history
        if (settings?.dryRun) {
          setDryRunHistory(prev => prev.slice(0, -1));
        } else {
          setLiveHistory(prev => prev.slice(0, -1));
        }

        // Refresh images and settings to get the file back in the stack
        await fetchData();

        // Trigger a reset on the swipe card just in case
        setResetTrigger(prev => prev + 1);
      } else {
        setErrorMessage(data.error || 'Failed to undo last action.');
      }
    } catch (err) {
      console.error('Undo failed:', err);
      setErrorMessage('A network error occurred while trying to undo.');
    }
  }, [fetchData, settings?.dryRun]);

  const softThreshold = settings?.queue?.softThreshold || 25;
  const hardThreshold = settings?.queue?.hardThreshold || 50;
  const resumeThreshold = settings?.queue?.resumeThreshold || 10;
  const [syncMessage, setSyncMessage] = useState<string>('');

  useEffect(() => {
    if (pendingCount >= hardThreshold && !isSyncing) {
      setIsSyncing(true);
      setSyncMessage('Saving your changes... back in a second.');
    } else if (pendingCount >= softThreshold && !isSyncing) {
      setIsSyncing(true);
      setSyncMessage("You're fast! Just letting the disk catch up...");
    }

    if (isSyncing && pendingCount <= resumeThreshold) {
      setIsSyncing(false);
      setSyncMessage('');
    }
  }, [pendingCount, isSyncing, softThreshold, hardThreshold, resumeThreshold]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (images.length === 0 || isSyncing || isDrawerOpen || isSettingsOpen || isHistoryOpen || errorMessage) return;

      switch (e.key) {
        case 'ArrowLeft': handleSwipe('left'); break;
        case 'ArrowRight': handleSwipe('right'); break;
        case 'ArrowUp': if (settings?.mode === 'TinderPlus') handleSwipe('up'); break;
        case 'ArrowDown': if (settings?.mode === 'TinderPlus') handleSwipe('down'); break;
        case 'z': case 'Z': if (e.ctrlKey || e.metaKey) { e.preventDefault(); handleUndo(); } break;
        case 't': case 'T': case 'Backspace': handleSwipe('trash'); break;
        case 'h': case 'H': setIsHistoryOpen(prev => !prev); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images, handleSwipe, isSyncing, isDrawerOpen, isSettingsOpen, isHistoryOpen, settings?.mode, errorMessage]);

  const currentImage = images[0];
  const sortedCount = (settings?.dryRun ? dryRunHistory : liveHistory).filter(a => a.actionType !== 'event').length;

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500 overflow-hidden">
      {/* Animated Background Layer */}
      <motion.div
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="absolute inset-0 bg-app-gradient pointer-events-none"
      />

      {/* Floating Top Controls & Branding */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-40">
        <button
          className="p-3 bg-white/60 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-700/60 rounded-2xl transition-all text-slate-600 dark:text-slate-300 backdrop-blur-md border border-black/5 dark:border-white/5 shadow-xl"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings size={24} />
        </button>

        <div className="flex flex-col items-center opacity-30 pointer-events-none select-none">
          <h1 className="text-xl font-black tracking-[0.2em] leading-none text-slate-900 dark:text-slate-100 uppercase">AXISSORT</h1>          <span className="text-[9px] font-bold tracking-[0.4em] mt-1.5 text-slate-500 dark:text-slate-400">VERSION 1.0.0</span>
        </div>

        <div className="flex items-center gap-3">
          <AnimatePresence>
            {sortedCount > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                className="p-3 bg-white/60 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-700/60 rounded-2xl transition-all text-blue-600 dark:text-blue-400 backdrop-blur-md border border-black/5 dark:border-white/5 shadow-xl"
                onClick={handleUndo}
                title="Undo Last Action (Ctrl+Z)"
              >
                <Undo2 size={24} />
              </motion.button>
            )}
          </AnimatePresence>

          <button
            className="p-3 bg-white/60 dark:bg-slate-800/40 hover:bg-white/80 dark:hover:bg-slate-700/60 rounded-2xl transition-all text-red-500 dark:text-red-400 backdrop-blur-md border border-black/5 dark:border-white/5 shadow-xl"
            onClick={() => handleSwipe('trash')}
          >
            <Trash2 size={24} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative flex items-center justify-center z-10">
        {loading ? (
          <div className="text-slate-400 dark:text-slate-500 animate-pulse font-bold tracking-widest uppercase text-xs">Initializing...</div>
        ) : currentImage ? (
          <div className="relative flex items-center justify-center w-full h-full p-4 sm:p-8">
            <SwipeCard
              key={currentImage.id}
              image={currentImage}
              onSwipe={handleSwipe}
              onClick={() => setIsDrawerOpen(true)}
              leftLabel={settings?.destinations?.left?.label}
              rightLabel={settings?.destinations?.right?.label}
              upLabel={settings?.destinations?.up?.label}
              downLabel={settings?.destinations?.down?.label}
              resetTrigger={resetTrigger}
              mode={settings?.mode}
            />
          </div>
        ) : sortedCount > 0 ? (
          /* Mission Accomplished State */
          <div className="relative flex items-center justify-center w-full h-full">
            <div className="firework-container">
              <Firework />
              <Firework />
              <Firework />
              <Firework />
              <Firework />
            </div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white/80 dark:bg-slate-900/80 rounded-[2.5rem] p-12 border border-white/20 dark:border-white/10 backdrop-blur-2xl shadow-2xl relative z-20 text-center max-w-lg mx-4"
            >              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">Job Done!</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest mb-8">You've cleared the stack.</p>
              <div className="bg-green-500/10 text-green-600 dark:text-green-400 px-6 py-3 rounded-2xl border border-green-500/20 text-xs font-black uppercase tracking-[0.2em] mb-10">
                {sortedCount} Files Sorted
              </div>
            </motion.div>
          </div>
        ) : (
          /* Initial Empty State */
          <div className="w-full max-w-md aspect-[3/4] bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] flex items-center justify-center border border-black/5 dark:border-white/10 backdrop-blur-md shadow-xl">
            <div className="text-center p-8">
              <p className="text-slate-400 dark:text-slate-600 text-xs font-black uppercase tracking-[0.3em] mb-4">Welcome to AxisSort</p>
              <p className="text-slate-600 dark:text-slate-300 text-lg font-bold uppercase tracking-tight">Library Empty</p>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-2 uppercase tracking-widest leading-relaxed">
                Add images to your source directory<br/>
                to begin sorting.
              </p>
            </div>
          </div>
        )}
      </main>

      <MetadataDrawer
        image={currentImage}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Settings Overlay */}
      <SettingsDrawer
        settings={settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdate={handleSettingsUpdate}
        theme={theme}
        setTheme={setTheme}
      />

      {/* History Overlay */}
      <HistoryDrawer
        history={settings?.dryRun ? dryRunHistory : liveHistory}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Pause/Syncing Overlay */}
      <PauseOverlay
        isVisible={isSyncing}
        message={syncMessage || `Writing ${pendingCount} pending actions to disk...`}
        progress={100 - (pendingCount / hardThreshold * 100)}
      />

      {/* Error Modal */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 border-2 border-red-500/50 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-6 max-w-sm text-center"
            >
              <div className="p-4 bg-red-500/20 rounded-full text-red-500">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Path Error</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all text-xs uppercase tracking-widest"
              >
                Acknowledge
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-between items-end z-40 text-slate-900 dark:text-white">
        <button
          onClick={() => setIsHistoryOpen(true)}
          className="px-4 py-2 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-full border border-black/5 dark:border-white/10 text-[10px] font-bold tracking-wider text-slate-600 dark:text-slate-500 uppercase hover:bg-white/80 dark:hover:bg-slate-800/60 transition-all pointer-events-auto shadow-lg"
        >
          {(() => {
            const currentSorted = (settings?.dryRun ? dryRunHistory : liveHistory).filter(a => a.actionType !== 'event').length;
            return currentSorted > 0
              ? `${currentSorted} SORTED / ${images.length} IMAGES`
              : `${images.length} IMAGES`;
          })()}
        </button>

        <div className="flex flex-col gap-2 items-end pointer-events-none">
          {!settings?.dryRun ? (
            <div className="px-4 py-2 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-full border border-black/5 dark:border-white/10 flex items-center gap-2 shadow-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
              <span className="text-[10px] font-black tracking-wider text-slate-700 dark:text-slate-400 uppercase">LIVE</span>
            </div>
          ) : (
            <div className="px-4 py-2 bg-orange-500/10 dark:bg-orange-500/10 backdrop-blur-md rounded-full border border-orange-500/40 dark:border-orange-500/20 text-[10px] font-black tracking-wider text-orange-700 dark:text-orange-400 uppercase shadow-lg">
              DRY RUN
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
