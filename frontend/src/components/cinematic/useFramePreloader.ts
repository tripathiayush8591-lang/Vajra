import { useState, useEffect, useRef, useCallback } from "react";

export const TOTAL_FRAMES = 240;

export function getFrameUrl(frameIndex: number): string {
  // frameIndex is 0-based (0 to 239), files are 1-based (001 to 240)
  const num = Math.min(Math.max(frameIndex + 1, 1), TOTAL_FRAMES);
  const padded = String(num).padStart(3, "0");
  return `/ezgif-frame-${padded}.jpg`;
}

interface PreloaderOptions {
  concurrency?: number;
  priorityRange?: number;
  onFrameReady?: (index: number) => void;
}

export function useFramePreloader({
  concurrency = 4,
  priorityRange = 6,
  onFrameReady,
}: PreloaderOptions = {}) {
  const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(TOTAL_FRAMES).fill(null));
  const loadedFlagsRef = useRef<boolean[]>(new Array(TOTAL_FRAMES).fill(false));
  const [firstFrameLoaded, setFirstFrameLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  // Active requests counter and priority queue
  const activeRequestsRef = useRef(0);
  const queueRef = useRef<number[]>([]);
  const isCancelledRef = useRef(false);

  const onFrameReadyRef = useRef(onFrameReady);
  onFrameReadyRef.current = onFrameReady;

  // Load a single frame
  const loadSingleFrame = useCallback((index: number): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      if (imagesRef.current[index] && loadedFlagsRef.current[index]) {
        resolve(imagesRef.current[index]!);
        return;
      }

      const img = new Image();
      img.decoding = "async";
      img.src = getFrameUrl(index);

      img.onload = () => {
        if (isCancelledRef.current) return;
        imagesRef.current[index] = img;
        loadedFlagsRef.current[index] = true;
        setLoadedCount((prev) => prev + 1);
        if (index === 0) {
          setFirstFrameLoaded(true);
        }
        if (onFrameReadyRef.current) {
          onFrameReadyRef.current(index);
        }
        resolve(img);
      };

      img.onerror = (err) => {
        console.warn(`Failed to load frame ${index + 1}:`, err);
        reject(err);
      };
    });
  }, []);

  // Process the queue with concurrency limit
  const processQueue = useCallback(() => {
    if (isCancelledRef.current) return;

    while (activeRequestsRef.current < concurrency && queueRef.current.length > 0) {
      const nextIndex = queueRef.current.shift();
      if (nextIndex === undefined) break;

      // Skip if already loaded or loading
      if (loadedFlagsRef.current[nextIndex]) {
        continue;
      }

      activeRequestsRef.current++;
      loadSingleFrame(nextIndex)
        .catch(() => {})
        .finally(() => {
          activeRequestsRef.current--;
          processQueue();
        });
    }
  }, [concurrency, loadSingleFrame]);

  // Request high priority for a specific frame and its immediate neighborhood
  const prioritizeNeighborhood = useCallback((centerIndex: number) => {
    const indicesToPrioritize: number[] = [];
    const min = Math.max(0, centerIndex - priorityRange);
    const max = Math.min(TOTAL_FRAMES - 1, centerIndex + priorityRange);

    for (let i = min; i <= max; i++) {
      if (!loadedFlagsRef.current[i]) {
        indicesToPrioritize.push(i);
      }
    }

    if (indicesToPrioritize.length > 0) {
      // Remove any existing occurrences in queue and prepend at head
      const filtered = queueRef.current.filter((idx) => !indicesToPrioritize.includes(idx));
      queueRef.current = [...indicesToPrioritize, ...filtered];
      processQueue();
    }
  }, [priorityRange, processQueue]);

  // Initial load orchestrator
  useEffect(() => {
    isCancelledRef.current = false;

    // Detect mobile / low concurrency
    const isMobile = window.innerWidth < 768;
    const effectiveConcurrency = isMobile ? 2 : concurrency;

    // Phase 1: Load frame 0 immediately
    loadSingleFrame(0).then(() => {
      if (isCancelledRef.current) return;

      // Phase 2: High priority anchor frames (first 12 frames + final frame 239)
      const initialBatch: number[] = [];
      for (let i = 1; i <= Math.min(15, TOTAL_FRAMES - 1); i++) {
        initialBatch.push(i);
      }
      initialBatch.push(TOTAL_FRAMES - 1); // Last frame

      // Phase 3: All remaining frames in sequence
      const remaining: number[] = [];
      for (let i = 16; i < TOTAL_FRAMES - 1; i++) {
        remaining.push(i);
      }

      queueRef.current = [...initialBatch, ...remaining];
      processQueue();
    });

    return () => {
      isCancelledRef.current = true;
      queueRef.current = [];
    };
  }, [concurrency, loadSingleFrame, processQueue]);

  // Gracefully retrieve closest loaded frame
  const getClosestLoadedFrame = useCallback((targetIndex: number): HTMLImageElement | null => {
    const clamped = Math.min(Math.max(targetIndex, 0), TOTAL_FRAMES - 1);

    // Exact match
    if (loadedFlagsRef.current[clamped] && imagesRef.current[clamped]) {
      return imagesRef.current[clamped];
    }

    // Search outwards for nearest loaded frame
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = clamped - offset;
      if (prev >= 0 && loadedFlagsRef.current[prev] && imagesRef.current[prev]) {
        return imagesRef.current[prev];
      }
      const next = clamped + offset;
      if (next < TOTAL_FRAMES && loadedFlagsRef.current[next] && imagesRef.current[next]) {
        return imagesRef.current[next];
      }
    }

    return imagesRef.current[0] || null;
  }, []);

  return {
    firstFrameLoaded,
    loadedCount,
    totalFrames: TOTAL_FRAMES,
    getClosestLoadedFrame,
    prioritizeNeighborhood,
  };
}
