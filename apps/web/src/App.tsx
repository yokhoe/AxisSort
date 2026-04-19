/**
 * File: App.tsx
 * Purpose: Top-level application shell. Contains layout structure and major providers.
 * Main exports: App
 * Dependencies: React
 * Notes: Implements the core UX layout (gear menu top-left, trash top-right, photo stack center).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { ImageRecord, SwipeDirection } from '@coord-sort/shared';
import { SwipeCard } from './components/SwipeCard';
import { MetadataDrawer } from './components/MetadataDrawer';
import { SettingsDrawer } from './components/SettingsDrawer';

const App: React.FC = () => {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [imagesRes, settingsRes] = await Promise.all([
        fetch('/api/images/next'),
        fetch('/api/settings')
      ]);
      const imagesData = await imagesRes.json();
      const settingsData = await settingsRes.json();

      setImages(imagesData);
      setSettings(settingsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSwipe = useCallback((direction: SwipeDirection) => {
    const dest = settings?.destinations?.[direction]?.label || direction;
    console.log(`Swiped: ${direction} (${dest}) for ${images[0]?.filename}`);
    // For now, just remove the image from the list to show the next one
    setImages((prev) => prev.slice(1));
  }, [images, settings]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (images.length === 0) return;

      switch (e.key) {
        case 'ArrowLeft':
          handleSwipe('left');
          break;
        case 'ArrowRight':
          handleSwipe('right');
          break;
        case 't':
        case 'T':
        case 'Backspace':
          handleSwipe('trash');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images, handleSwipe]);

  const currentImage = images[0];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-white overflow-hidden relative">
      {/* Floating Top Controls & Branding */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-40">
        <button
          className="p-3 bg-slate-800/40 hover:bg-slate-700/60 rounded-2xl transition-all text-slate-300 backdrop-blur-md border border-white/5 shadow-xl"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings size={24} />
        </button>

        {/* Integrated Watermark Branding */}
        <div className="flex flex-col items-center opacity-30 pointer-events-none select-none">
          <h1 className="text-xl font-black tracking-[0.2em] leading-none text-slate-100">COORD-SORT</h1>
          <span className="text-[9px] font-bold tracking-[0.4em] mt-1.5 text-slate-400">VERSION 1.0.0</span>
        </div>

        <button
          className="p-3 bg-slate-800/40 hover:bg-slate-700/60 rounded-2xl transition-all text-red-400 backdrop-blur-md border border-white/5 shadow-xl"
          onClick={() => handleSwipe('trash')}
        >
          <Trash2 size={24} />
        </button>
      </div>
      {/* Main Content Area */}
      <main className="flex-1 relative flex items-center justify-center z-10">
        {loading ? (
          <div className="text-slate-500 animate-pulse font-bold tracking-widest uppercase text-xs">Initializing...</div>
        ) : currentImage ? (
          <div className="relative flex items-center justify-center w-full h-full p-4 sm:p-8">
            <SwipeCard
              key={currentImage.id}
              image={currentImage}
              onSwipe={handleSwipe}
              onClick={() => setIsDrawerOpen(true)}
              leftLabel={settings?.destinations?.left?.label}
              rightLabel={settings?.destinations?.right?.label}
            />
          </div>
        ) : (
          <div className="w-full max-w-md aspect-[3/4] bg-slate-900/50 rounded-3xl flex items-center justify-center border border-white/5 backdrop-blur-sm">
            <div className="text-center p-8">
              <p className="text-slate-400 text-lg font-semibold uppercase tracking-tight">Stack Depleted</p>
              <p className="text-slate-600 text-xs mt-2 uppercase tracking-widest">Add more files to source</p>
              <button
                onClick={fetchData}
                className="mt-8 px-6 py-2.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
              >
                Sync Library
              </button>
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
      />

      {/* Floating Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-between items-end pointer-events-none z-40">
        <div className="px-4 py-2 bg-slate-900/40 backdrop-blur-md rounded-full border border-white/5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
          {images.length} REMAINING
        </div>

        <div className="flex flex-col gap-2 items-end">
          <div className="px-4 py-2 bg-slate-900/40 backdrop-blur-md rounded-full border border-white/5 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">LIVE SCAN</span>
          </div>
          {settings?.dryRun && (
            <div className="px-4 py-2 bg-orange-500/10 backdrop-blur-md rounded-full border border-orange-500/20 text-[10px] font-bold tracking-wider text-orange-400/80 uppercase">
              DRY RUN ACTIVE
            </div>
          )}
        </div>
      </div>
    </div>
  );

};
export default App;
