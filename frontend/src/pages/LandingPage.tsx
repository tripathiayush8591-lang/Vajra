import { useState, useEffect, useRef, useCallback } from "react";
import CinematicCanvas from "../components/cinematic/CinematicCanvas";
import CinematicOverlay from "../components/cinematic/CinematicOverlay";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const navigate = useNavigate();

  // Check user prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Ensure body background is pitch black while on landing page for seamless overscroll
  useEffect(() => {
    const originalBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "#000000";
    return () => {
      document.body.style.backgroundColor = originalBg;
    };
  }, []);

  // Optimized scroll handler via requestAnimationFrame
  const tickingRef = useRef(false);

  const updateScrollProgress = useCallback(() => {
    if (!containerRef.current) return;

    const scrollTop = window.scrollY;
    const containerHeight = containerRef.current.offsetHeight;
    const windowHeight = window.innerHeight;
    const maxScroll = containerHeight - windowHeight;

    if (maxScroll <= 0) {
      setScrollProgress(0);
      return;
    }

    const progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
    setScrollProgress(progress);
    tickingRef.current = false;
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      if (!tickingRef.current) {
        tickingRef.current = true;
        requestAnimationFrame(updateScrollProgress);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateScrollProgress, { passive: true });

    // Initial check
    updateScrollProgress();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateScrollProgress);
    };
  }, [prefersReducedMotion, updateScrollProgress]);

  // Reduced motion accessible fallback view
  if (prefersReducedMotion) {
    return (
      <div className="relative min-h-screen w-full bg-black text-white flex flex-col justify-between overflow-hidden">
        {/* Static background frame */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 pointer-events-none"
          style={{ backgroundImage: "url('/ezgif-frame-240.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/90 pointer-events-none" />

        {/* Minimal header */}
        <header className="relative z-10 w-full px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg text-white">CivicPulse AI</span>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all"
          >
            ENTER APP →
          </button>
        </header>

        {/* Main Content */}
        <main className="relative z-10 my-auto px-6 py-12 text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-xs font-bold text-cyan-300">
            Autonomous Civic Fabric
          </div>
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white">
            The City Has A Pulse.
          </h1>
          <p className="text-base sm:text-xl text-slate-300 font-light max-w-xl mx-auto leading-relaxed">
            CivicPulse AI synthesizes real-time citizen signals into actionable municipal intelligence.
          </p>
          <div className="pt-4">
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm sm:text-base tracking-wider uppercase shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all"
            >
              <span>ENTER CIVICPULSE</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        <footer className="relative z-10 w-full py-6 text-center text-xs text-slate-500">
          Indore Municipal Corporation • CivicPulse AI Platform
        </footer>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black text-white"
      style={{ height: "600vh" }}
    >
      {/* Sticky Fullscreen Cinematic Viewport */}
      <div className="sticky top-0 left-0 w-full h-screen h-[100dvh] overflow-hidden">
        {/* Canvas Engine */}
        <CinematicCanvas scrollProgress={scrollProgress} />

        {/* Minimal Floating UI & Narrative Overlay */}
        <CinematicOverlay scrollProgress={scrollProgress} />
      </div>
    </div>
  );
}
