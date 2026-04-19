/**
 * File: SwipeCard.tsx
 * Purpose: Displays a sortable photo card and handles swipe-related UI state.
 * Main exports: SwipeCard
 * Dependencies: React, Framer Motion
 * Notes: Used by App/CardStack to render the current image in the sorting queue.
 */

import React from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { ImageRecord, SwipeDirection } from '@coord-sort/shared';

interface SwipeCardProps {
  image: ImageRecord;
  onSwipe: (direction: SwipeDirection) => void;
  onClick: () => void;
  leftLabel?: string;
  rightLabel?: string;
}

const SWIPE_THRESHOLD = 150;

/**
 * Renders a draggable photo for image sorting.
 * @param image The image record to display.
 * @param onSwipe Callback when a swipe occurs.
 * @param leftLabel Label for the left destination.
 * @param rightLabel Label for the right destination.
 */
export const SwipeCard: React.FC<SwipeCardProps> = ({
  image,
  onSwipe,
  onClick,
  leftLabel = 'LEFT',
  rightLabel = 'RIGHT'
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Transformations for visual feedback during drag
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

  const leftOpacity = useTransform(x, [-150, -50], [1, 0]);
  const rightOpacity = useTransform(x, [50, 150], [0, 1]);

  /**
   * Handles the end of a drag gesture and triggers swiping if thresholds are met.
   */
  const handleDragEnd = (_e: any, info: PanInfo) => {
    // Check if it was a simple tap/click instead of a drag
    if (Math.abs(info.offset.x) < 5 && Math.abs(info.offset.y) < 5) {
      onClick();
      return;
    }

    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipe('right');
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipe('left');
    }
  };

  return (
    <motion.div
      style={{ x, y, rotate }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      onTap={() => {
        // Alternative to handleDragEnd for tapping
        if (x.get() === 0 && y.get() === 0) {
          onClick();
        }
      }}
      whileTap={{ scale: 1.02 }}
      className="relative w-[90vw] max-w-lg bg-slate-800 rounded-2xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center border border-slate-700/50"
    >
      <motion.img
        layoutId={`image-${image.id}`}
        src={`/images/${image.filename}`}
        alt={image.filename}
        className="w-full h-auto max-h-[70vh] object-contain select-none pointer-events-none"
      />

      {/* Visual Swipe Indicators (Feedback Labels) */}
      <motion.div
        style={{ opacity: leftOpacity }}
        className="absolute inset-0 bg-red-500/20 flex flex-col items-center justify-center pointer-events-none"
      >
        <div className="bg-red-600 text-white px-6 py-3 rounded-full font-bold border-2 border-white shadow-xl flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest opacity-80">Send to</span>
          <span className="text-lg uppercase">{leftLabel}</span>
        </div>
      </motion.div>

      <motion.div
        style={{ opacity: rightOpacity }}
        className="absolute inset-0 bg-green-500/20 flex flex-col items-center justify-center pointer-events-none"
      >
        <div className="bg-green-600 text-white px-6 py-3 rounded-full font-bold border-2 border-white shadow-xl flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest opacity-80">Send to</span>
          <span className="text-lg uppercase">{rightLabel}</span>
        </div>
      </motion.div>
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
        <p className="text-xs truncate font-medium text-slate-300 text-center">{image.filename}</p>
      </div>
    </motion.div>
  );

};
