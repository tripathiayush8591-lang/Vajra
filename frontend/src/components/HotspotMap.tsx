import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Circle, Tooltip, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Hotspot, ComplaintItem } from "../services/api";

const INDORE: [number, number] = [22.7196, 75.8577];

function FitBounds({ hotspots, complaints }: { hotspots: Hotspot[]; complaints: ComplaintItem[] }) {
  const map = useMap();

  useEffect(() => {
    const pts: [number, number][] = [];
    hotspots.forEach((h) => {
      if (h.centroid?.lat && h.centroid?.lng) {
        pts.push([h.centroid.lat, h.centroid.lng]);
      }
    });
    complaints.forEach((c) => {
      if (c.lat && c.lng) {
        pts.push([c.lat, c.lng]);
      }
    });

    if (pts.length > 0) {
      const lats = pts.map((p) => p[0]);
      const lngs = pts.map((p) => p[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      // Safe padding so all markers are within viewport
      const latPad = Math.max((maxLat - minLat) * 0.15, 0.02);
      const lngPad = Math.max((maxLng - minLng) * 0.15, 0.02);

      map.fitBounds(
        [
          [minLat - latPad, minLng - lngPad],
          [maxLat + latPad, maxLng + lngPad],
        ],
        { padding: [28, 28], maxZoom: 14 }
      );
    }
  }, [hotspots, complaints, map]);

  return null;
}

export function scoreColor(score: number): string {
  return score >= 80 ? "#DC2626" : score >= 60 ? "#D97706" : score >= 40 ? "#1D4ED8" : "#64748B";
}

export function severityColor(score: number, status?: string): string {
  if (status === "Resolved") return "#10B981"; // Emerald green
  if (score >= 5) return "#EF4444"; // Vivid red
  if (score >= 4) return "#F97316"; // Bright orange
  if (score >= 3) return "#F59E0B"; // Amber
  return "#0EA5E9"; // Sky blue
}

export default function HotspotMap({
  hotspots,
  complaints = [],
  onSelect,
  onSelectComplaint,
  showHotspots = true,
  showComplaints = true,
  vectorMode = false,
}: {
  hotspots: Hotspot[];
  complaints?: ComplaintItem[];
  onSelect?: (h: Hotspot) => void;
  onSelectComplaint?: (c: ComplaintItem) => void;
  showHotspots?: boolean;
  showComplaints?: boolean;
  vectorMode?: boolean;
}) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 dark:border-white/10 shadow-card">
      <MapContainer
        center={INDORE}
        zoom={12}
        className="h-[530px] w-full"
        scrollWheelZoom
        style={{ background: vectorMode ? "#f8fafc" : "#e2e8f0" }}
      >
        {!vectorMode && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        <FitBounds hotspots={showHotspots ? hotspots : []} complaints={showComplaints ? complaints : []} />

        {/* Combined Map Legend Overlay */}
        <div className="leaflet-top leaflet-right !mt-3 !mr-3 z-[400] pointer-events-none">
          <div className="bg-white/95 dark:bg-black/90 backdrop-blur-md border border-slate-200/90 dark:border-white/10 rounded-xl px-3 py-2.5 shadow-md pointer-events-auto text-[11px] font-bold text-slate-700 dark:text-[#94a3b8] space-y-2">
            {/* Hotspot legend */}
            {showHotspots && (
              <div className="space-y-1">
                <div className="text-[10px] font-extrabold text-slate-500 dark:text-[#64748b] uppercase tracking-wider">
                  Hotspot Priority (HPI)
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> &lt;40 Low</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 40-70 Mod</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> &gt;70 High</span>
                </div>
              </div>
            )}

            {/* Problem Locations legend */}
            {showComplaints && (
              <div className="space-y-1 pt-1 border-t border-slate-200/80 dark:border-white/10">
                <div className="text-[10px] font-extrabold text-slate-500 dark:text-[#64748b] uppercase tracking-wider">
                  Problem Locations ({complaints.length})
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Sev 5 Emerg</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Sev 4 High</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Sev 3 Med</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Resolved</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 1. RENDER HOTSPOT CLUSTERS */}
        {showHotspots &&
          hotspots.map((h) => {
            const isCritical = h.priority_score >= 75;
            const color = scoreColor(h.priority_score);

            return (
              <div key={`hotspot-${h.id}`}>
                {/* Outer boundary radius */}
                <Circle
                  center={[h.centroid.lat, h.centroid.lng]}
                  radius={h.radius_m}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: isCritical ? 0.12 : 0.06,
                    weight: isCritical ? 2 : 1.5,
                    dashArray: isCritical ? undefined : "4, 4",
                  }}
                />

                {/* Pulsing halo for critical hotspots */}
                {isCritical && (
                  <Circle
                    center={[h.centroid.lat, h.centroid.lng]}
                    radius={h.radius_m * 0.4}
                    pathOptions={{
                      color: color,
                      fillColor: color,
                      fillOpacity: 0.22,
                      weight: 0,
                    }}
                  />
                )}

                {/* Main centroid interactive cluster marker */}
                <CircleMarker
                  center={[h.centroid.lat, h.centroid.lng]}
                  radius={12 + Math.min(h.complaint_count, 8)}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 2.5,
                    fillColor: color,
                    fillOpacity: 0.92,
                  }}
                  eventHandlers={{ click: () => onSelect?.(h) }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                    <div className="p-1 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">🔥</span>
                        <span className="font-bold text-xs leading-tight text-white">{h.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-300">
                        <span>{h.ward.name}</span>
                        <span>•</span>
                        <span className="font-semibold text-amber-300">{h.complaint_count} reports clustered</span>
                        <span>•</span>
                        <span className="font-bold text-white">Score: {h.priority_score.toFixed(0)}/100</span>
                      </div>
                      {h.status === "Under Intervention" && (
                        <div className="text-[10px] text-purple-300 font-bold bg-purple-900/60 px-1.5 py-0.5 rounded">
                          Intervention In Progress
                        </div>
                      )}
                    </div>
                  </Tooltip>
                </CircleMarker>
              </div>
            );
          })}

        {/* 2. RENDER ALL INDIVIDUAL PROBLEM LOCATIONS */}
        {showComplaints &&
          complaints.map((c) => {
            if (!c.lat || !c.lng) return null;
            const isEmergency = c.severity >= 5 || c.urgency === "Emergency";
            const isResolved = c.status === "Resolved";
            const color = severityColor(c.severity, c.status);

            return (
              <div key={`complaint-${c.id}`}>
                {/* Emergency outer warning ring */}
                {isEmergency && !isResolved && (
                  <Circle
                    center={[c.lat, c.lng]}
                    radius={90}
                    pathOptions={{
                      color: "#EF4444",
                      fillColor: "#EF4444",
                      fillOpacity: 0.2,
                      weight: 1,
                    }}
                  />
                )}

                {/* Pinpoint Problem Marker */}
                <CircleMarker
                  center={[c.lat, c.lng]}
                  radius={isEmergency ? 6.5 : 5}
                  pathOptions={{
                    color: isResolved ? "#065F46" : "#ffffff",
                    weight: 2,
                    fillColor: color,
                    fillOpacity: 0.95,
                  }}
                  eventHandlers={{
                    click: () => onSelectComplaint?.(c),
                  }}
                >
                  {/* Hover tooltip */}
                  <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                    <div className="p-1 space-y-0.5 max-w-[220px]">
                      <div className="flex items-center justify-between gap-2 font-mono text-[10px] font-bold text-sky-400">
                        <span>{c.tracking_code}</span>
                        <span className={isEmergency ? "text-rose-400 font-black" : "text-amber-300"}>
                          Sev {c.severity}/5
                        </span>
                      </div>
                      <div className="font-bold text-xs leading-tight text-white line-clamp-2">
                        {c.summary || c.category}
                      </div>
                      <div className="text-[10px] text-slate-300">
                        📍 {c.ward || "Indore"} • <span className="text-amber-300">{c.status}</span>
                      </div>
                    </div>
                  </Tooltip>

                  {/* Click popup with rich details */}
                  <Popup className="civic-map-popup" closeButton={true}>
                    <div className="p-2 text-slate-900 dark:text-white space-y-2 min-w-[240px] max-w-[300px]">
                      {/* Header tracking code + status */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700/80 pb-1.5">
                        <span className="font-mono text-xs font-black tracking-wider text-blue-600 dark:text-sky-400">
                          {c.tracking_code}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
                            c.status === "Resolved"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : c.status === "In Progress"
                              ? "bg-purple-100 text-purple-800 border border-purple-300"
                              : c.status === "Work Scheduled"
                              ? "bg-blue-100 text-blue-800 border border-blue-300"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>

                      {/* Category & Urgency */}
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate">
                          {c.category}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isEmergency
                              ? "bg-rose-600 text-white"
                              : c.severity >= 4
                              ? "bg-orange-500 text-white"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          Sev {c.severity}/5 • {c.urgency}
                        </span>
                      </div>

                      {/* Citizen summary */}
                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug line-clamp-3 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700/60 font-medium">
                        "{c.summary || c.raw_text}"
                      </p>

                      {/* Location & Channel */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                        <span>📍 {c.ward || "Indore"}</span>
                        <span className="capitalize font-semibold">📡 via {c.channel || "Web"}</span>
                      </div>

                      {/* Clustered hotspot link */}
                      {c.cluster_id ? (
                        <button
                          type="button"
                          onClick={() => {
                            const h = hotspots.find((item) => item.id === c.cluster_id);
                            if (h && onSelect) onSelect(h);
                          }}
                          className="w-full text-center text-xs font-bold text-blue-600 dark:text-sky-400 hover:text-blue-700 bg-blue-50 dark:bg-sky-950/40 hover:bg-blue-100 dark:hover:bg-sky-900/60 border border-blue-200 dark:border-sky-800 py-1.5 px-2 rounded-lg transition-colors cursor-pointer"
                        >
                          🔥 Focus Clustered Hotspot Dossier →
                        </button>
                      ) : (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 italic text-center">
                          Single reported location (Unclustered)
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              </div>
            );
          })}
      </MapContainer>
    </div>
  );
}
