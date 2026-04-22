/**
 * File: index.ts
 * Purpose: Central export point for shared types and constants.
 * Main exports: SwipeDirection, ImageRecord, DestinationConfig, ActionIntent, QueueConfig, QueueStatus
 * Dependencies: None
 * Notes: Used by both frontend and backend to ensure type consistency.
 */

/**
 * Centralized list of supported photo and video file extensions.
 */
export const SUPPORTED_EXTENSIONS = {
  PHOTOS: ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.gif'],
  VIDEOS: ['.mp4'],
};

/**
 * Returns a combined list of all supported file extensions.
 */
export const ALL_SUPPORTED_EXTENSIONS = [
  ...SUPPORTED_EXTENSIONS.PHOTOS,
  ...SUPPORTED_EXTENSIONS.VIDEOS
];

/**
 * Defines the directions supported by the sorting interface.
 */
export type SwipeDirection = "left" | "right" | "up" | "down" | "trash";

/**
 * Describes one image record known to the application.
 */
export interface ImageRecord {
  id: string;
  sourcePath: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  modifiedAt?: string;
  exifTakenAt?: string;
}

/**
 * Describes a user-configurable destination bucket.
 */
export interface DestinationConfig {
  id: string;
  label: string;
  direction: SwipeDirection;
  destinationPath: string;
  actionType: "move" | "copy" | "trash" | "mark";
  isEnabled: boolean;
}

/**
 * Represents one pending or completed filesystem action.
 */
export interface ActionIntent {
  id: string;
  imageId: string;
  sourcePath: string;
  destinationPath: string;
  actionType: "move" | "copy" | "trash" | "event";
  direction: SwipeDirection | "system";
  status: "pending" | "processing" | "completed" | "failed" | "info";
  createdAt: string;
  isDryRun?: boolean;
  errorMessage?: string;
}

/**
 * Defines queue control settings for filesystem back-pressure.
 */
export interface QueueConfig {
  softThreshold: number;
  hardThreshold: number;
  resumeThreshold: number;
  batchSize: number;
  workerConcurrency: number;
}

/**
 * Summarizes current queue state for the frontend.
 */
export interface QueueStatus {
  pendingCount: number;
  processingCount: number;
  failedCount: number;
  isPaused: boolean;
  isDraining: boolean;
}
