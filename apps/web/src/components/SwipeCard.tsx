/**
 * File: SwipeCard.tsx
 * Purpose: Displays a sortable photo card and handles swipe-related UI state.
 * Main exports: SwipeCard
 * Dependencies: React, Framer Motion
 * Notes: Used by App/CardStack to render the current image in the sorting queue.
 */

import React, { useState } from 'react';
import { motion, PanInfo, useMotionValue, useTransform, animate } from 'framer-motion';
import { ImageRecord, SwipeDirection } from '@coord-sort/shared';

interface SwipeCardProps {
  image: ImageRecord;
  onSwipe: (direction: SwipeDirection) => void;
  onClick: () => void;
  leftLabel?: string;
  rightLabel?: string;
  upLabel?: string;
  downLabel?: string;
  resetTrigger?: number; // Used to force reset from parent
}

const SWIPE_THRESHOLD = 250;

/**
 * Renders a draggable photo for image sorting.
 */
export const SwipeCard: React.FC<SwipeCardProps> = ({
  image,
  onSwipe,
  onClick,
  leftLabel,
  rightLabel,
  upLabel,
  downLabel,
  resetTrigger = 0
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [isSwiped, setIsSwiped] = useState(false);

  // Fallbacks for display
  const displayLeft = leftLabel || 'LEFT';
  const displayRight = rightLabel || 'RIGHT';
  const displayUp = upLabel || 'UP';
  const displayDown = downLabel || 'DOWN';

  // Transformations for visual feedback during drag
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  // Calculate dominant axis to prevent multiple overlays
  const leftOpacity = useTransform([x, y], ([latestX, latestY]) => {
    const val = latestX as number;
    const other = Math.abs(latestY as number);
    if (val >= 0 || Math.abs(val) <= other) return 0;
    // Map -150 to 1, -50 to 0
    return Math.min(1, Math.max(0, (Math.abs(val) - 50) / 100));
  });

  const rightOpacity = useTransform([x, y], ([latestX, latestY]) => {
    const val = latestX as number;
    const other = Math.abs(latestY as number);
    if (val <= 0 || val <= other) return 0;
    return Math.min(1, Math.max(0, (val - 50) / 100));
  });

  const upOpacity = useTransform([x, y], ([latestX, latestY]) => {
    const val = latestY as number;
    const other = Math.abs(latestX as number);
    if (val >= 0 || Math.abs(val) <= other) return 0;
    return Math.min(1, Math.max(0, (Math.abs(val) - 50) / 100));
  });

  const downOpacity = useTransform([x, y], ([latestX, latestY]) => {
    const val = latestY as number;
    const other = Math.abs(latestX as number);
    if (val <= 0 || val <= other) return 0;
    return Math.min(1, Math.max(0, (val - 50) / 100));
  });

  /**
   * Handles the end of a drag gesture.
   */
  const handleDragEnd = (_e: any, info: PanInfo) => {
    if (isSwiped) return;

    const absX = Math.abs(info.offset.x);
    const absY = Math.abs(info.offset.y);

    // Determine which axis was dominant
    if (absX > absY && absX > SWIPE_THRESHOLD) {
      setIsSwiped(true);
      onSwipe(info.offset.x > 0 ? 'right' : 'left');
    } else if (absY > absX && absY > SWIPE_THRESHOLD) {
      setIsSwiped(true);
      onSwipe(info.offset.y > 0 ? 'down' : 'up');
    } else {
      // Snap back to origin if threshold not met or ambiguous
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 20 });
      animate(y, 0, { type: 'spring', stiffness: 300, damping: 20 });
    }
  };

  return (
    <motion.div
      style={{ x, y, rotate }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      onTap={() => {
        // Only trigger click if the card hasn't been dragged far
        if (Math.abs(x.get()) < 10 && Math.abs(y.get()) < 10) {
          onClick();
        }
      }}
      whileTap={{ scale: 1.02 }}
      className="relative w-[90vw] max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center border border-black/5 dark:border-white/5 transition-colors duration-300"
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
          <span className="text-lg uppercase">{displayLeft}</span>
        </div>
      </motion.div>

      <motion.div
        style={{ opacity: rightOpacity }}
        className="absolute inset-0 bg-green-500/20 flex flex-col items-center justify-center pointer-events-none"
      >
        <div className="bg-green-600 text-white px-6 py-3 rounded-full font-bold border-2 border-white shadow-xl flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest opacity-80">Send to</span>
          <span className="text-lg uppercase">{displayRight}</span>
        </div>
      </motion.div>

      <motion.div
        style={{ opacity: upOpacity }}
        className="absolute inset-0 bg-blue-500/20 flex flex-col items-center justify-center pointer-events-none"
      >
        <div className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold border-2 border-white shadow-xl flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest opacity-80">Send to</span>
          <span className="text-lg uppercase">{displayUp}</span>
        </div>
      </motion.div>

      <motion.div
        style={{ opacity: downOpacity }}
        className="absolute inset-0 bg-orange-500/20 flex flex-col items-center justify-center pointer-events-none"
      >
        <div className="bg-orange-600 text-white px-6 py-3 rounded-full font-bold border-2 border-white shadow-xl flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest opacity-80">Send to</span>
          <span className="text-lg uppercase">{displayDown}</span>
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
        <p
          title={image.filename}
          className="text-xs truncate font-medium text-slate-300 text-center"
        >
          {image.filename}
        </p>
      </div>
    </motion.div>
  );

};
