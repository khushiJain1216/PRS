import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { DisasterScenario, IncidentReport, RescueTeam } from '../types/disaster';
import {
  Layers,
  MapPin,
  Filter,
  Navigation,
  Compass,
  AlertOctagon,
  Shield,
  LifeBuoy,
  Maximize2,
} from 'lucide-react';

interface DisasterMapProps {
  scenario: DisasterScenario;
  incidents: IncidentReport[];
  rescueFleet: RescueTeam[];
  selectedIncident: IncidentReport | null;
  onSelectIncident: (incident: IncidentReport) => void;
  onQuickDispatch: (incident: IncidentReport) => void;
}

export const DisasterMap: React.FC<DisasterMapProps> = ({
  scenario,
  incidents,
  rescueFleet,
  selectedIncident,
  onSelectIncident,
  onQuickDispatch,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const hazardsLayerRef = useRef<L.LayerGroup | null>(null);
  const fleetLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);

  // Map Filter State
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'P1_ONLY' | 'P2_ONLY' | 'P3_ONLY'>('ALL');
  const [showHazards, setShowHazards] = useState(true);
  const [showFleet, setShowFleet] = useState(true);
  const [showHeatCircles, setShowHeatCircles] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [scenario.centerCoordinates.lat, scenario.centerCoordinates.lng],
        zoom: scenario.zoomLevel,
        zoomControl: false,
      });

      // Carto Voyager high-contrast light map tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> & OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Custom Zoom control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Create Layer Groups
      hazardsLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      fleetLayerRef.current = L.layerGroup().addTo(map);
      routesLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView(
        [scenario.centerCoordinates.lat, scenario.centerCoordinates.lng],
        scenario.zoomLevel
      );
    }

    // Resize observer
    const resizeTimer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(resizeTimer);
    };
  }, [scenario.id]);

  // Render Hazard Polygons
  useEffect(() => {
    if (!hazardsLayerRef.current) return;
    hazardsLayerRef.current.clearLayers();

    if (!showHazards) return;

    scenario.hazardZones.forEach((zone) => {
      const polygon = L.polygon(zone.coordinates, {
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: zone.fillOpacity,
        weight: 2,
        dashArray: '4, 6',
      });

      polygon.bindTooltip(`
        <div style="font-family: sans-serif; font-size: 12px; padding: 2px;">
          <strong style="color: ${zone.color}; font-weight: 700;">${zone.name}</strong><br/>
          <span style="color: #334155;">${zone.description}</span>
        </div>
      `);

      polygon.addTo(hazardsLayerRef.current!);
    });
  }, [scenario, showHazards]);

  // Render Incident Distress Markers with Smart Collision Avoidance
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    markersLayerRef.current.clearLayers();

    const filtered = incidents.filter((inc) => {
      if (priorityFilter === 'P1_ONLY') return inc.priorityLevel === 'P1_CRITICAL';
      if (priorityFilter === 'P2_ONLY') return inc.priorityLevel === 'P2_HIGH';
      if (priorityFilter === 'P3_ONLY') return inc.priorityLevel === 'P3_STANDARD';
      return true;
    });

    // 1. Group nearby markers that share overlapping coordinates (< 0.003 deg ~ 300m)
    const proximityClusters: IncidentReport[][] = [];
    filtered.forEach((inc) => {
      let added = false;
      for (const cluster of proximityClusters) {
        const leader = cluster[0];
        const distLat = Math.abs(leader.coordinates.lat - inc.coordinates.lat);
        const distLng = Math.abs(leader.coordinates.lng - inc.coordinates.lng);
        if (distLat < 0.0035 && distLng < 0.0035) {
          cluster.push(inc);
          added = true;
          break;
        }
      }
      if (!added) {
        proximityClusters.push([inc]);
      }
    });

    // 2. Disperse overlapping markers in an orbital fan layout
    interface RenderMarkerInfo {
      incident: IncidentReport;
      origLatLng: { lat: number; lng: number };
      renderLatLng: { lat: number; lng: number };
      isOffset: boolean;
    }

    const resolvedRenderList: RenderMarkerInfo[] = [];

    proximityClusters.forEach((cluster) => {
      if (cluster.length === 1) {
        resolvedRenderList.push({
          incident: cluster[0],
          origLatLng: cluster[0].coordinates,
          renderLatLng: cluster[0].coordinates,
          isOffset: false,
        });
      } else {
        const centerLat = cluster.reduce((sum, i) => sum + i.coordinates.lat, 0) / cluster.length;
        const centerLng = cluster.reduce((sum, i) => sum + i.coordinates.lng, 0) / cluster.length;
        const radiusDegree = 0.0045; // ~450m orbital offset

        cluster.forEach((inc, idx) => {
          const angle = (2 * Math.PI * idx) / cluster.length - Math.PI / 2;
          const offsetLat = centerLat + radiusDegree * Math.sin(angle);
          const offsetLng = centerLng + (radiusDegree * 1.25) * Math.cos(angle);

          resolvedRenderList.push({
            incident: inc,
            origLatLng: inc.coordinates,
            renderLatLng: { lat: offsetLat, lng: offsetLng },
            isOffset: true,
          });
        });
      }
    });

    // 3. Place Leaflet Markers
    resolvedRenderList.forEach(({ incident, origLatLng, renderLatLng, isOffset }) => {
      const isSelected = selectedIncident?.id === incident.id;
      const isDispatched = incident.status === 'DISPATCHED' || incident.status === 'ON_SCENE';
      const isResolved = incident.status === 'RESOLVED_SAVED';

      let bgGradient = 'from-emerald-600 to-teal-700';
      let borderColor = 'border-emerald-200';
      let pingColor = 'bg-emerald-400';
      let priorityText = 'P3';

      if (incident.priorityLevel === 'P1_CRITICAL') {
        bgGradient = 'from-red-600 to-rose-700';
        borderColor = 'border-red-200';
        pingColor = 'bg-red-500';
        priorityText = 'P1';
      } else if (incident.priorityLevel === 'P2_HIGH') {
        bgGradient = 'from-amber-500 to-orange-600';
        borderColor = 'border-amber-200';
        pingColor = 'bg-amber-400';
        priorityText = 'P2';
      }

      if (isResolved) {
        bgGradient = 'from-slate-500 to-slate-600';
        borderColor = 'border-slate-300';
        priorityText = '✓';
      }

      // If displaced by collision resolution, draw subtle tactical leader line to ground zero
      if (isOffset) {
        const leaderLine = L.polyline(
          [
            [origLatLng.lat, origLatLng.lng],
            [renderLatLng.lat, renderLatLng.lng],
          ],
          {
            color: '#64748b',
            weight: 1.5,
            dashArray: '2, 3',
            opacity: 0.8,
          }
        );
        leaderLine.addTo(markersLayerRef.current!);

        // Ground anchor marker
        const anchorDot = L.circleMarker([origLatLng.lat, origLatLng.lng], {
          radius: 2.5,
          color: '#94a3b8',
          fillColor: '#64748b',
          fillOpacity: 0.9,
          weight: 1,
        });
        anchorDot.addTo(markersLayerRef.current!);
      }

      // Custom HTML Marker Element with collision-safe badge
      const iconHtml = `
        <div class="relative cursor-pointer group transition-transform ${isSelected ? 'scale-125 z-50' : 'hover:scale-115'}">
          ${
            incident.priorityLevel === 'P1_CRITICAL' && !isResolved
              ? `<span class="absolute -inset-1 rounded-full ${pingColor} opacity-75 animate-ping"></span>`
              : ''
          }
          <div class="relative w-8 h-8 rounded-full bg-gradient-to-br ${bgGradient} border-2 ${borderColor} shadow-md flex items-center justify-center text-white font-mono font-bold text-xs">
            ${priorityText}
            ${
              incident.peopleAffectedCount > 1
                ? `<span class="absolute -top-2 -right-2.5 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded-full text-[9px] text-amber-300 font-mono font-bold shadow-md z-20 whitespace-nowrap">
                    ${incident.peopleAffectedCount} Civilians
                   </span>`
                : ''
            }
          </div>
          ${
            isDispatched
              ? `<span class="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white"></span>`
              : ''
          }
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-disaster-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([renderLatLng.lat, renderLatLng.lng], {
        icon: customIcon,
      });

      // Marker click opens inspector
      marker.on('click', () => {
        onSelectIncident(incident);
      });

      marker.addTo(markersLayerRef.current!);

      // Casualty heat radius circle for P1 and high count (centered at true geographic location)
      if (showHeatCircles && !isResolved) {
        const radiusMeters = incident.priorityLevel === 'P1_CRITICAL' ? 240 : 120;
        const circleColor =
          incident.priorityLevel === 'P1_CRITICAL'
            ? '#ef4444'
            : incident.priorityLevel === 'P2_HIGH'
            ? '#f59e0b'
            : '#10b981';

        const circle = L.circle([origLatLng.lat, origLatLng.lng], {
          radius: radiusMeters,
          color: circleColor,
          fillColor: circleColor,
          fillOpacity: incident.priorityLevel === 'P1_CRITICAL' ? 0.18 : 0.08,
          weight: 1.5,
          dashArray: '4, 4',
        });
        circle.addTo(markersLayerRef.current!);
      }
    });
  }, [incidents, priorityFilter, selectedIncident, showHeatCircles]);

  // Render Rescue Fleet Markers & Vectors
  useEffect(() => {
    if (!fleetLayerRef.current || !routesLayerRef.current) return;
    fleetLayerRef.current.clearLayers();
    routesLayerRef.current.clearLayers();

    if (!showFleet) return;

    rescueFleet.forEach((team) => {
      const isDispatched = team.status === 'DISPATCHED' || team.status === 'ON_SCENE';
      const typeIcon =
        team.type === 'WATER_RESCUE'
          ? '🚤'
          : team.type === 'MEDEVAC_AIR'
          ? '🚁'
          : team.type === 'URBAN_SAR'
          ? '🚜'
          : '🚑';

      const iconHtml = `
        <div class="relative group cursor-pointer">
          <div class="w-8 h-8 rounded-full ${
            isDispatched ? 'bg-blue-600 border-2 border-white' : 'bg-emerald-600 border-2 border-white'
          } shadow-md flex items-center justify-center text-sm">
            ${typeIcon}
          </div>
          <span class="absolute -bottom-4 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-white border border-slate-300 rounded text-[8px] font-mono text-slate-800 font-bold whitespace-nowrap shadow-sm">
            ${team.callsign}
          </span>
        </div>
      `;

      const fleetIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-fleet-pin',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([team.coordinates.lat, team.coordinates.lng], {
        icon: fleetIcon,
      });

      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <div style="font-weight: 700; color: #1e3a8a; font-size: 13px;">
            ${team.name} (${team.callsign})
          </div>
          <div style="font-size: 11px; color: #475569; margin: 2px 0;">
            Base: ${team.baseName}
          </div>
          <div style="font-size: 11px; font-weight: 600; color: ${isDispatched ? '#0284c7' : '#16a34a'};">
            Status: ${team.status} • Rescued: ${team.rescuedCount} Civilians
          </div>
        </div>
      `);

      marker.addTo(fleetLayerRef.current!);

      // Draw Tactical Polyline Vector if unit is dispatched to an incident
      if (showRoutes && isDispatched && team.currentMissionIncidentId) {
        const assignedIncident = incidents.find((i) => i.id === team.currentMissionIncidentId);
        if (assignedIncident) {
          const polyline = L.polyline(
            [
              [team.coordinates.lat, team.coordinates.lng],
              [assignedIncident.coordinates.lat, assignedIncident.coordinates.lng],
            ],
            {
              color: '#0284c7',
              weight: 3,
              dashArray: '6, 8',
              opacity: 0.85,
            }
          );

          polyline.bindTooltip(`SAR Mission Vector: ${team.callsign} ➔ ${assignedIncident.locationName}`, {
            sticky: true,
          });

          polyline.addTo(routesLayerRef.current!);
        }
      }
    });
  }, [rescueFleet, incidents, showFleet, showRoutes]);

  // Center on selected incident if changes
  useEffect(() => {
    if (selectedIncident && mapInstanceRef.current) {
      mapInstanceRef.current.setView(
        [selectedIncident.coordinates.lat, selectedIncident.coordinates.lng],
        Math.max(14, mapInstanceRef.current.getZoom()),
        { animate: true }
      );
    }
  }, [selectedIncident]);

  const handleCenterGroundZero = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(
        [scenario.centerCoordinates.lat, scenario.centerCoordinates.lng],
        scenario.zoomLevel,
        { animate: true }
      );
    }
  };

  return (
    <div id="disaster-map-wrapper" className="relative w-full h-full min-h-[480px] bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm flex flex-col font-mono">
      {/* Map Tactical Toolbar */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Priority Filter Badges */}
        <div className="bg-white/95 border border-slate-200 rounded-lg p-1.5 backdrop-blur-md shadow-md flex items-center gap-1.5 pointer-events-auto text-xs">
          <button
            id="filter-all"
            onClick={() => setPriorityFilter('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
              priorityFilter === 'ALL'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All ({incidents.length})
          </button>
          <button
            id="filter-p1"
            onClick={() => setPriorityFilter('P1_ONLY')}
            className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${
              priorityFilter === 'P1_ONLY'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-red-700 hover:bg-red-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
            P1 Critical ({incidents.filter((i) => i.priorityLevel === 'P1_CRITICAL').length})
          </button>
          <button
            id="filter-p2"
            onClick={() => setPriorityFilter('P2_ONLY')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
              priorityFilter === 'P2_ONLY'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            P2 High ({incidents.filter((i) => i.priorityLevel === 'P2_HIGH').length})
          </button>
          <button
            id="filter-p3"
            onClick={() => setPriorityFilter('P3_ONLY')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
              priorityFilter === 'P3_ONLY'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            P3 Standard ({incidents.filter((i) => i.priorityLevel === 'P3_STANDARD').length})
          </button>
        </div>

        {/* Tactical Layer Toggles & Re-center */}
        <div className="bg-white/95 border border-slate-200 rounded-lg p-1.5 backdrop-blur-md shadow-md flex items-center gap-1.5 pointer-events-auto text-xs">
          <button
            id="toggle-hazards"
            onClick={() => setShowHazards(!showHazards)}
            className={`px-2.5 py-1 rounded flex items-center gap-1 transition-colors font-bold ${
              showHazards ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Hazard Zones & Inundation Polygons"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hazard Zones</span>
          </button>

          <button
            id="toggle-fleet"
            onClick={() => setShowFleet(!showFleet)}
            className={`px-2.5 py-1 rounded flex items-center gap-1 transition-colors font-bold ${
              showFleet ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Rescue Fleet GPS Locations"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fleet</span>
          </button>

          <button
            id="toggle-routes"
            onClick={() => setShowRoutes(!showRoutes)}
            className={`px-2.5 py-1 rounded flex items-center gap-1 transition-colors font-bold ${
              showRoutes ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Mission Vectors"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vectors</span>
          </button>

          <button
            id="btn-recenter"
            onClick={handleCenterGroundZero}
            className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-300"
            title="Re-center map on ground zero"
          >
            <Compass className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map Leaflet Canvas */}
      <div id="disaster-leaflet-container" ref={mapContainerRef} className="w-full h-full flex-1" />

      {/* Map Bottom Tactical Status Bar */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-700 font-mono gap-2 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
            <span className="font-semibold text-red-700">P1 Critical (Immediate Danger)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
            <span className="font-semibold text-amber-700">P2 High (Vulnerable / Urgent)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span className="font-semibold text-emerald-700">P3 Standard (Relief / Support)</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium">
          <span>Click any marker to inspect distress details and dispatch rescue assets</span>
        </div>
      </div>
    </div>
  );
};
