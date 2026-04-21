/**
 * File: MetadataDrawer.tsx
 * Purpose: Displays image properties and EXIF metadata in an overlay.
 * Main exports: MetadataDrawer
 * Dependencies: React, Framer Motion, Lucide
 * Notes: Shown when an photo card is clicked.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, HardDrive, Maximize2, Folder, Camera, Zap, FileImage, MapPin } from 'lucide-react';
import { ImageRecord } from '@coord-sort/shared';

interface MetadataDrawerProps {
  image: ImageRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

interface MetadataResponse {
  filename: string;
  fullPath: string;
  size: number;
  modifiedAt: string;
  width?: number;
  height?: number;
  exif: Record<string, any>;
}

export const MetadataDrawer: React.FC<MetadataDrawerProps> = ({ image, isOpen, onClose }) => {
  const [data, setData] = useState<MetadataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{w: number, h: number} | null>(null);

  useEffect(() => {
    if (isOpen && image) {
      setLoading(true);
      setNaturalSize(null);

      // Fetch metadata from API
      fetch(`/api/images/${image.filename}/metadata`)
        .then((res) => res.json())
        .then((json) => {
          setData(json);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to fetch metadata:', err);
          setLoading(false);
        });

      // Also get natural size from the image element as a foolproof client-side fallback
      const img = new Image();
      img.src = `/images/${image.filename}`;
      img.onload = () => {
        setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      };
    } else {
      setData(null);
    }
  }, [isOpen, image]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !image) return null;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KiB', 'MiB', 'GiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatExposureTime = (exposureTime: any) => {
    if (!exposureTime) return null;
    if (exposureTime >= 1) return `${exposureTime}s`;
    return `1/${Math.round(1 / exposureTime)}s`;
  };

  const getEssentialMetadata = () => {
    if (!data) return [];
    const { exif } = data;

    const items = [];

    // 1. Filename (Header)
    items.push({
      icon: <FileImage size={18} className="text-blue-500 dark:text-blue-400" />,
      value: data.filename,
      isHeader: true
    });

    // 2. Dimensions (Robust fallback)
    const w = data.width || naturalSize?.w;
    const h = data.height || naturalSize?.h;
    if (w && h) {
      items.push({
        icon: <Maximize2 size={16} />,
        value: `${w} x ${h} px`
      });
    }

    // 3. File Size
    items.push({
      icon: <HardDrive size={16} />,
      value: formatSize(data.size)
    });

    // 4. Date/Time
    const date = exif.DateTimeOriginal || exif.CreateDate || data.modifiedAt;
    if (date) {
      items.push({
        icon: <Calendar size={16} />,
        value: new Date(date).toLocaleString(undefined, {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      });
    }

    // 5. Camera Info
    const cameraInfo = [
      exif.Make,
      exif.Model,
      exif.ISO ? `ISO ${exif.ISO}` : null,
      formatExposureTime(exif.ExposureTime)
    ].filter(Boolean).join(', ');

    if (cameraInfo) {
      items.push({ icon: <Camera size={16} />, value: cameraInfo });
    }

    // 6. Full Path (Unified font)
    items.push({ icon: <Folder size={16} />, value: data.fullPath, isPath: true });

    return items;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 touch-none overflow-hidden"
      >
        {/* Cinematic Frosted Background (Blurred version of the image itself) */}
        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-0 z-0 pointer-events-none"
          style={{ willChange: 'transform, opacity' }}
        >
          <img
            src={`/images/${image.filename}`}
            alt=""
            className="w-full h-full object-cover blur-[60px] opacity-40 dark:opacity-30 saturate-150"
            style={{ backfaceVisibility: 'hidden' }}
          />
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 bg-white/90 dark:bg-slate-900/90 w-full max-w-lg h-full sm:h-auto sm:rounded-[2.5rem] border-x sm:border border-white/20 dark:border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden backdrop-blur-2xl transition-colors duration-300"
        >
          {/* Close Button Header (Floating) */}
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={onClose}
              className="p-2 bg-black/5 dark:bg-black/50 hover:bg-black/10 dark:hover:bg-black/80 text-slate-900 dark:text-white rounded-full transition-colors backdrop-blur-md border border-black/5 dark:border-white/10"
            >
              <X size={20} />
            </button>
          </div>

          {/* Image Preview (Expanding from photo stack with dissolve reveal) */}
          <div className="w-full sm:flex-none flex items-center justify-center relative bg-slate-200 dark:bg-slate-950/40 overflow-hidden rounded-t-[2rem] sm:rounded-t-[2.5rem] min-h-[30vh] isolate z-0">
            <motion.img
              layoutId={`image-${image.id}`}
              src={`/images/${image.filename}`}
              alt={image.filename}
              className="max-w-full max-h-[65vh] w-auto h-auto object-contain relative z-0"
              style={{ willChange: 'transform, opacity', backfaceVisibility: 'hidden' }}
              transition={{ type: 'tween', duration: 0.5, ease: "circOut" }}
            />

            {/* The Dissolve/Reveal Layer */}
            <motion.div
              initial={{ opacity: 1, backdropFilter: "blur(20px)" }}
              animate={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ delay: 0.1, duration: 0.6, ease: "easeInOut" }}
              className="absolute inset-0 z-10 bg-white/20 dark:bg-black/20 pointer-events-none rounded-t-[2.5rem]"
              style={{ willChange: 'opacity, backdrop-filter' }}
            />
          </div>          {/* Bare Essentials Info List */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.05,
                  delayChildren: 0.2
                }
              }
            }}
            className="p-6 bg-white dark:bg-slate-900 flex-1 overflow-y-auto"
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {getEssentialMetadata().map((item: any, i) => (
                  <motion.div
                    key={i}
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      show: { opacity: 1, y: 0 }
                    }}
                    className="flex items-start gap-4 text-slate-700 dark:text-slate-300"
                  >
                    <div className="text-slate-400 dark:text-slate-500 flex-shrink-0 w-5 flex justify-center mt-1">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        title={item.value}
                        className={`block break-words ${
                        item.isHeader ? 'text-base font-bold text-slate-900 dark:text-white leading-tight' :
                        item.isPath ? 'text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-relaxed break-all' :
                        'text-sm font-medium'
                      }`}>
                        {item.value}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
