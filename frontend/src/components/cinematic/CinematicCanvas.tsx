import { useEffect, useRef, useCallback } from "react";
import { useFramePreloader, TOTAL_FRAMES } from "./useFramePreloader";

interface CinematicCanvasProps {
  scrollProgress: number; // 0.0 to 1.0
  onFirstFrameReady?: () => void;
}

export default function CinematicCanvas({
  scrollProgress,
  onFirstFrameReady,
}: CinematicCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Preloader with frame arrival callback
  const renderFrameRef = useRef<() => void>(() => {});

  const handleFrameReady = useCallback((_frameIdx: number) => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      renderFrameRef.current();
    });
  }, []);

  const {
    firstFrameLoaded,
    getClosestLoadedFrame,
    prioritizeNeighborhood,
  } = useFramePreloader({
    onFrameReady: handleFrameReady,
  });

  // Keep track of current dimensions and frame
  const lastRenderedIndexRef = useRef<number>(-1);
  const lastDimensionsRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 1,
  });
  const rafIdRef = useRef<number | null>(null);

  // Notify parent and render when first frame is ready
  useEffect(() => {
    if (firstFrameLoaded) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        renderFrameRef.current();
      });
      if (onFirstFrameReady) {
        onFirstFrameReady();
      }
    }
  }, [firstFrameLoaded, onFirstFrameReady]);

  // Target frame calculation from scroll progress
  // Progress 0.0 -> frame 0, 1.0 -> frame 239
  // Clamped and held smoothly at the end
  const targetFrameIndex = Math.min(
    Math.max(Math.floor(scrollProgress * (TOTAL_FRAMES - 1)), 0),
    TOTAL_FRAMES - 1
  );

  // Render function
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for mobile battery & memory

    const dimensionsChanged =
      lastDimensionsRef.current.width !== width ||
      lastDimensionsRef.current.height !== height ||
      lastDimensionsRef.current.dpr !== dpr;

    if (dimensionsChanged) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      lastDimensionsRef.current = { width, height, dpr };
    }

    const img = getClosestLoadedFrame(targetFrameIndex);
    if (!img || !img.complete || img.naturalWidth === 0) {
      return;
    }

    // Object-fit: cover calculation
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = width / height;

    let drawWidth = width;
    let drawHeight = height;
    let drawX = 0;
    let drawY = 0;

    if (canvasAspect > imgAspect) {
      // Screen is wider than image (ultrawide or 16:9 monitor)
      drawWidth = width;
      drawHeight = width / imgAspect;
      drawY = (height - drawHeight) / 2;
    } else {
      // Screen is taller than image (mobile portrait, tablet)
      drawHeight = height;
      drawWidth = height * imgAspect;
      drawX = (width - drawWidth) / 2;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw the cover frame
    ctx.drawImage(
      img,
      0,
      0,
      img.naturalWidth,
      img.naturalHeight,
      Math.round(drawX * dpr),
      Math.round(drawY * dpr),
      Math.round(drawWidth * dpr),
      Math.round(drawHeight * dpr)
    );

    lastRenderedIndexRef.current = targetFrameIndex;
  }, [getClosestLoadedFrame, targetFrameIndex]);

  renderFrameRef.current = renderFrame;

  // Schedule render on scroll progress or frame updates
  useEffect(() => {
    prioritizeNeighborhood(targetFrameIndex);

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [renderFrame, targetFrameIndex, prioritizeNeighborhood]);

  // Resize handling
  useEffect(() => {
    const handleResize = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(renderFrame);
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [renderFrame]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden bg-black select-none pointer-events-none"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full object-cover transform-gpu"
      />

      {/* Subtle cinematic gradient overlays for depth and text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />
    </div>
  );
}
