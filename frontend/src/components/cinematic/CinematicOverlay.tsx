import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";

interface CinematicOverlayProps {
  scrollProgress: number; // 0.0 to 1.0
}

export default function CinematicOverlay({ scrollProgress }: CinematicOverlayProps) {
  const navigate = useNavigate();

  // Helper smoothstep function for clean opacity curves
  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
  const mapRange = (val: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
    const t = clamp((val - inMin) / (inMax - inMin), 0, 1);
    return outMin + t * (outMax - outMin);
  };

  // 1. Scroll Indicator (0% - 5%)
  const scrollIndicatorOpacity = mapRange(scrollProgress, 0.0, 0.04, 1, 0);

  // 2. Hero Text Phase (0% - 16%)
  // Fully visible at 0 - 8%, fades out by 16%
  const heroOpacity = mapRange(scrollProgress, 0.07, 0.16, 1, 0);
  const heroTranslateY = mapRange(scrollProgress, 0.0, 0.16, 0, -28);
  const heroBlur = mapRange(scrollProgress, 0.07, 0.16, 0, 8);

  // 3. Middle Narrative Reveal: FROM SIGNAL TO INTELLIGENCE (73% - 87%)
  // Fades in 73% -> 78%, stays 78% -> 83%, fades out 83% -> 88%
  let signalOpacity = 0;
  let signalTranslateY = 0;
  if (scrollProgress >= 0.71 && scrollProgress <= 0.88) {
    if (scrollProgress < 0.77) {
      signalOpacity = mapRange(scrollProgress, 0.71, 0.77, 0, 1);
      signalTranslateY = mapRange(scrollProgress, 0.71, 0.77, 24, 0);
    } else if (scrollProgress <= 0.83) {
      signalOpacity = 1;
      signalTranslateY = 0;
    } else {
      signalOpacity = mapRange(scrollProgress, 0.83, 0.88, 1, 0);
      signalTranslateY = mapRange(scrollProgress, 0.83, 0.88, 0, -20);
    }
  }

  // 4. Final Reveal & CTA (88% - 100%)
  // Fades in smoothly from 88% -> 94%, stays pinned through 100%
  const finalOpacity = mapRange(scrollProgress, 0.88, 0.94, 0, 1);
  const finalTranslateY = mapRange(scrollProgress, 0.88, 0.94, 30, 0);
  const finalScale = mapRange(scrollProgress, 0.88, 0.95, 0.96, 1.0);

  const handleEnterApp = () => {
    navigate("/login");
  };

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none z-10 flex flex-col justify-between overflow-hidden">
      {/* ====================================================================
          MINIMAL FLOATING HEADER
          ==================================================================== */}
      <header className="w-full px-6 py-6 md:px-10 md:py-8 flex items-center justify-between pointer-events-auto">
        {/* Brand Mark */}
        <div
          onClick={handleEnterApp}
          className="group cursor-pointer flex items-center gap-3 transition-opacity duration-300 hover:opacity-90"
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-black/60 border border-blue-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)] animate-pulse" />
            <div className="absolute inset-0 rounded-lg border border-cyan-400/20 group-hover:border-cyan-400/50 transition-colors" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm md:text-base font-bold tracking-tight text-white/95">
                CivicPulse
              </span>
              <span className="text-[10px] font-extrabold tracking-widest uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-cyan-300 border border-blue-400/30">
                AI
              </span>
            </div>
            <span className="text-[10px] tracking-wider uppercase text-slate-400 font-medium hidden sm:inline">
              Indore Smart City
            </span>
          </div>
        </div>

        {/* Top-Right Quick Entry */}
        <button
          onClick={handleEnterApp}
          aria-label="Enter CivicPulse Login"
          className="group px-4 py-2 rounded-full text-xs font-semibold tracking-wider text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 hover:border-blue-400/50 backdrop-blur-md transition-all duration-300 flex items-center gap-2 shadow-xs hover:shadow-[0_0_16px_rgba(59,130,246,0.25)]"
        >
          <span>ENTER APP</span>
          <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform duration-200" />
        </button>
      </header>

      {/* ====================================================================
          PHASE 1: CINEMATIC HERO (0% - 16%)
          ==================================================================== */}
      {heroOpacity > 0.01 && (
        <div
          style={{
            opacity: heroOpacity,
            transform: `translateY(${heroTranslateY}px)`,
            filter: heroBlur > 0.5 ? `blur(${heroBlur}px)` : "none",
            pointerEvents: heroOpacity > 0.4 ? "auto" : "none",
          }}
          className="my-auto px-6 sm:px-12 text-center max-w-4xl mx-auto flex flex-col items-center justify-center transition-all duration-75 ease-out"
        >
          {/* Subtle Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/25 backdrop-blur-md text-[11px] font-bold tracking-[0.25em] text-cyan-300 uppercase mb-5 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>Autonomous Civic Fabric</span>
          </div>

          {/* Main Title: Sleek, architectural, cool */}
          <h1 className="font-display text-2xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-[0.14em] sm:tracking-[0.22em] md:tracking-[0.26em] uppercase text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)] leading-none select-none whitespace-nowrap pl-[0.14em] sm:pl-[0.22em] md:pl-[0.26em]">
            <span className="font-extralight text-white/90">CIVIC</span>
            <span className="font-medium bg-gradient-to-r from-blue-200 via-cyan-200 to-white bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(56,189,248,0.4)]">
              PULSE
            </span>
            <span className="ml-2 sm:ml-4 text-cyan-400 font-light drop-shadow-[0_0_18px_rgba(34,211,238,0.9)]">
              AI
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 sm:mt-7 text-xs sm:text-base md:text-lg font-light text-cyan-100/90 tracking-[0.3em] uppercase drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] pl-[0.3em]">
            The City Has A Pulse.
          </p>

          {/* Supporting line */}
          <div className="mt-3.5 flex items-center gap-3.5 text-[11px] sm:text-xs font-medium tracking-[0.35em] text-slate-400 uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] pl-[0.35em]">
            <span>Listen</span>
            <span className="text-cyan-400 font-bold">•</span>
            <span>Understand</span>
            <span className="text-cyan-400 font-bold">•</span>
            <span>Act</span>
          </div>
        </div>
      )}

      {/* ====================================================================
          PHASE 3: FROM SIGNAL TO INTELLIGENCE (73% - 87%)
          ==================================================================== */}
      {signalOpacity > 0.01 && (
        <div
          style={{
            opacity: signalOpacity,
            transform: `translateY(${signalTranslateY}px)`,
            pointerEvents: "none",
          }}
          className="my-auto px-6 sm:px-12 text-center max-w-3xl mx-auto flex flex-col items-center justify-center transition-all duration-75 ease-out"
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black/60 border border-cyan-400/30 backdrop-blur-md text-[11px] font-bold tracking-[0.2em] text-cyan-300 uppercase mb-4 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Neural Synthesis</span>
          </div>

          <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-light tracking-[0.18em] sm:tracking-[0.24em] text-white uppercase leading-tight drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)] pl-[0.18em] sm:pl-[0.24em]">
            <span className="font-extralight text-slate-200">FROM SIGNAL</span>
            <br />
            <span className="font-medium bg-gradient-to-r from-cyan-300 via-blue-300 to-white bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(59,130,246,0.6)]">
              TO INTELLIGENCE.
            </span>
          </h2>

          <p className="mt-4 text-xs sm:text-sm md:text-base text-slate-200 font-normal max-w-lg leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
            Every citizen voice, image sensor, and spatial grievance synthesized into real-time municipal clarity.
          </p>
        </div>
      )}

      {/* ====================================================================
          PHASE 4: FINAL REVEAL & CALL TO ACTION (88% - 100%)
          ==================================================================== */}
      {finalOpacity > 0.01 && (
        <div
          style={{
            opacity: finalOpacity,
            transform: `translateY(${finalTranslateY}px) scale(${finalScale})`,
            pointerEvents: finalOpacity > 0.5 ? "auto" : "none",
          }}
          className="my-auto px-6 sm:px-12 text-center max-w-2xl mx-auto flex flex-col items-center justify-center transition-all duration-100 ease-out"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/60 border border-cyan-500/40 backdrop-blur-md text-[10px] sm:text-[11px] font-bold tracking-[0.25em] text-cyan-300 uppercase mb-4 shadow-[0_0_24px_rgba(6,182,212,0.3)]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.9)]" />
            <span>Civic Intelligence Active</span>
          </div>

          <h2 className="font-display text-2xl sm:text-5xl md:text-6xl font-light tracking-[0.14em] sm:tracking-[0.2em] md:tracking-[0.26em] uppercase text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)] leading-tight select-none whitespace-nowrap pl-[0.14em] sm:pl-[0.2em] md:pl-[0.26em]">
            <span className="font-extralight text-white/90">CIVIC</span>
            <span className="font-medium bg-gradient-to-r from-blue-200 via-cyan-200 to-white bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(56,189,248,0.4)]">
              PULSE
            </span>
            <span className="ml-2 sm:ml-3 text-cyan-400 font-light drop-shadow-[0_0_18px_rgba(34,211,238,0.9)]">
              AI
            </span>
          </h2>

          <p className="mt-4 text-xs sm:text-base text-slate-100 font-light tracking-wide max-w-md drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
            Turning citizen signals into actionable civic intelligence.
          </p>

          <p className="mt-1 text-xs text-slate-300/90 font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            Experience the civic intelligence platform.
          </p>

          {/* Premium Glass CTA Button */}
          <div className="mt-8">
            <button
              onClick={handleEnterApp}
              aria-label="Enter CivicPulse application login"
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 sm:px-10 sm:py-4.5 rounded-2xl bg-black/50 hover:bg-black/70 text-white text-sm sm:text-base font-bold tracking-wider uppercase border border-blue-400/50 hover:border-cyan-400/80 backdrop-blur-xl shadow-[0_0_35px_rgba(37,99,235,0.35)] hover:shadow-[0_0_45px_rgba(6,182,212,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              <span className="relative z-10">ENTER CIVICPULSE</span>
              <ArrowRight className="relative z-10 w-4 h-4 text-cyan-400 group-hover:translate-x-1.5 transition-transform duration-300" />

              {/* Ambient radial glow inside button on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-blue-500/25 to-indigo-500/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>

          {/* Role pills helper */}
          <div className="mt-5 flex items-center justify-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] text-slate-300/90 font-medium drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            <span>Resident Grievances</span>
            <span className="text-cyan-400/60">•</span>
            <span>IMC Command Center</span>
            <span className="text-cyan-400/60">•</span>
            <span>Live AI Trace</span>
          </div>
        </div>
      )}

      {/* ====================================================================
          SCROLL INDICATOR (Bottom of viewport at 0% - 5%)
          ==================================================================== */}
      <footer className="w-full pb-8 px-6 flex flex-col items-center justify-center pointer-events-none">
        {scrollIndicatorOpacity > 0.02 && (
          <div
            style={{ opacity: scrollIndicatorOpacity }}
            className="flex flex-col items-center gap-2 text-[11px] font-semibold tracking-[0.25em] text-slate-400 uppercase transition-opacity duration-150"
          >
            <span>SCROLL TO EXPLORE</span>
            <ChevronDown className="w-4 h-4 text-cyan-400 animate-bounce" />
          </div>
        )}
      </footer>
    </div>
  );
}
