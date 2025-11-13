/**
 * Checkpoint Manager
 *
 * Stores dashboard snapshots for undo/redo functionality.
 * Keeps the last 5 states in memory for instant restoration.
 *
 * This is the "safety net" that lets users experiment without fear.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Layout } from 'react-grid-layout';

/**
 * Dashboard snapshot
 */
export interface DashboardSnapshot {
  timestamp: Date;
  layout: Layout[];
  widgets: Array<{
    id: string;
    type: string;
    config: Record<string, any>;
  }>;
  description?: string; // Optional: what changed
}

/**
 * Checkpoint Manager Store
 */
interface CheckpointStore {
  checkpoints: DashboardSnapshot[];
  currentIndex: number;
  maxCheckpoints: number;

  // Actions
  createCheckpoint: (snapshot: DashboardSnapshot) => void;
  undo: () => DashboardSnapshot | null;
  redo: () => DashboardSnapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  getCheckpointHistory: () => DashboardSnapshot[];
}

/**
 * Checkpoint Manager Store
 */
export const useCheckpointManager = create<CheckpointStore>()(
  devtools(
    (set, get) => ({
      checkpoints: [],
      currentIndex: -1,
      maxCheckpoints: 5,

      /**
       * Create a new checkpoint
       *
       * Removes any "future" checkpoints if we're in the middle of history
       * and adds the new snapshot.
       */
      createCheckpoint: (snapshot) => {
        const { checkpoints, currentIndex, maxCheckpoints } = get();

        // Remove any checkpoints after current index (we're creating a new branch)
        const newCheckpoints = checkpoints.slice(0, currentIndex + 1);

        // Add the new checkpoint
        newCheckpoints.push(snapshot);

        // Keep only the last N checkpoints
        const trimmedCheckpoints = newCheckpoints.slice(-maxCheckpoints);

        set({
          checkpoints: trimmedCheckpoints,
          currentIndex: trimmedCheckpoints.length - 1,
        });

        console.log('[CheckpointManager] Created checkpoint:', {
          description: snapshot.description,
          timestamp: snapshot.timestamp,
          totalCheckpoints: trimmedCheckpoints.length,
        });
      },

      /**
       * Undo to previous checkpoint
       */
      undo: () => {
        const { checkpoints, currentIndex } = get();

        if (currentIndex <= 0) {
          console.log('[CheckpointManager] Cannot undo - at beginning of history');
          return null;
        }

        const newIndex = currentIndex - 1;
        const snapshot = checkpoints[newIndex];

        set({ currentIndex: newIndex });

        console.log('[CheckpointManager] Undo to checkpoint:', {
          index: newIndex,
          timestamp: snapshot.timestamp,
          description: snapshot.description,
        });

        return snapshot;
      },

      /**
       * Redo to next checkpoint
       */
      redo: () => {
        const { checkpoints, currentIndex } = get();

        if (currentIndex >= checkpoints.length - 1) {
          console.log('[CheckpointManager] Cannot redo - at end of history');
          return null;
        }

        const newIndex = currentIndex + 1;
        const snapshot = checkpoints[newIndex];

        set({ currentIndex: newIndex });

        console.log('[CheckpointManager] Redo to checkpoint:', {
          index: newIndex,
          timestamp: snapshot.timestamp,
          description: snapshot.description,
        });

        return snapshot;
      },

      /**
       * Check if undo is available
       */
      canUndo: () => {
        const { currentIndex } = get();
        return currentIndex > 0;
      },

      /**
       * Check if redo is available
       */
      canRedo: () => {
        const { checkpoints, currentIndex } = get();
        return currentIndex < checkpoints.length - 1;
      },

      /**
       * Clear all checkpoints
       */
      clearHistory: () => {
        set({
          checkpoints: [],
          currentIndex: -1,
        });
        console.log('[CheckpointManager] Cleared history');
      },

      /**
       * Get checkpoint history (for debugging/visualization)
       */
      getCheckpointHistory: () => {
        return get().checkpoints;
      },
    }),
    { name: 'CheckpointManager' }
  )
);

/**
 * React Hook: Keyboard shortcuts for undo/redo
 */
export function useUndoRedoShortcuts(
  onUndo: () => void,
  onRedo: () => void
) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      }

      // Cmd+Shift+Z (Mac) or Ctrl+Shift+Z (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        onRedo();
      }

      // Cmd+Y (alternative redo)
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        onRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo]);
}

import React from 'react';
