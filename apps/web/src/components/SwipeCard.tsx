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
  mode?: 'Tinder' | 'TinderPlus';
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
  resetTrigger = 0,
  mode = 'Tinder'
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [isSwiped, setIsSwiped] = useState(false);

  const isPlus = mode === 'TinderPlus';

  // Reset card state when parent triggers a reset (e.g., on path error)
  React.useEffect(() => {
    if (resetTrigger > 0) {
      setIsSwiped(false);
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 20 });
      animate(y, 0, { type: 'spring', stiffness: 300, damping: 20 });
    }
  }, [resetTrigger, x, y]);

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
    } else if (isPlus && absY > absX && absY > SWIPE_THRESHOLD) {
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
      style={{ x, y: isPlus ? y : 0, rotate }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1]
      }}
      drag={isPlus ? true : "x"}
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
      className="relative w-fit max-w-[85vw] sm:max-w-md bg-white dark:bg-slate-900/80 rounded-[2.5rem] photo-stack-card overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center border border-black/10 dark:border-white/10 shadow-2xl backdrop-blur-sm transition-colors duration-500"
    >
      <motion.img
        layoutId={`image-${image.id}`}
        src={`/images/${image.filename}`}
        alt={image.filename}
        className="max-w-full max-h-[65vh] w-auto h-auto object-contain select-none pointer-events-none rounded-[inherit]"
        style={{ willChange: 'transform, opacity', backfaceVisibility: 'hidden' }}
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

      {isPlus && (
        <>
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
        </>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900/40 backdrop-blur-md border-t border-white/10">
        <p
          title={image.filename}
          className="text-[10px] truncate font-bold text-white/90 text-center uppercase tracking-widest"
        >
          {image.filename}
        </p>
      </div>
    </motion.div>
  );

};
