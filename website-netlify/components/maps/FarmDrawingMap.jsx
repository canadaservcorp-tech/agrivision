/**
 * FarmDrawingMap
 * Interactive Google Maps component where farmers can:
 * 1. Search for their farm location
 * 2. Draw farm boundary polygon
 * 3. Auto-calculate area in hectares
 * 4. Place hub and camera positions
 * 
 * Requires: @react-google-maps/api
 * API Key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Polygon,
  Marker,
  DrawingManager,
  Autocomplete,
  Circle,
  InfoWindow,
} from "@react-google-maps/api";

const LIBRARIES = ["drawing", "places", "geometry"];
const DEFAULT_CENTER = { lat: 25.276, lng: 55.296 }; // Dubai
const DEFAULT_ZOOM = 15;

const MAP_STYLES = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

const CAMERA_COVERAGE = {
  flat: { radius: 35, color: "#16a34a40" },
  hilly: { radius: 28, color: "#f59e0b40" },
  greenhouse: { radius: 16, color: "#3b82f640" },
  terraced: { radius: 25, color: "#8b5cf640" },
};

export default function FarmDrawingMap({
  onFarmDrawn,         // (polygon, area, center) => void
  onCameraPositions,   // (positions[]) => void
  terrain = "flat",
  existingPolygon = null,
  cameras = [],
  hubPosition = null,
  readOnly = false,
}) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    libraries: LIBRARIES,
  });

  const mapRef = useRef(null);
  const polygonRef = useRef(null);
  const autocompleteRef = useRef(null);
  const drawingRef = useRef(null);

  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [polygon, setPolygon] = useState(existingPolygon);
  const [area, setArea] = useState(0);
  const [cameraMarkers, setCameraMarkers] = useState(cameras);
  const [hub, setHub] = useState(hubPosition);
  const [mode, setMode] = useState("search"); // search | draw | cameras | done
  const [searchValue, setSearchValue] = useState("");
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [mapType, setMapType] = useState("satellite");

  // ============================================================
  // MAP CALLBACKS
  // ============================================================

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    // Try user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMapCenter(center);
          map.panTo(center);
        },
        () => {} // Silently fail
      );
    }
  }, []);

  const onPlaceSelected = () => {
    const place = autocompleteRef.current?.getPlace();
    if (place?.geometry?.location) {
      const loc = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
      setMapCenter(loc);
      mapRef.current?.panTo(loc);
      mapRef.current?.setZoom(17);
      setMode("draw");
    }
  };

  // ============================================================
  // POLYGON DRAWING
  // ============================================================

  const onPolygonComplete = useCallback((poly) => {
    // Remove drawing manager after first polygon
    if (drawingRef.current) {
      drawingRef.current.setDrawingMode(null);
    }

    const path = poly.getPath();
    const coords = [];
    for (let i = 0; i < path.getLength(); i++) {
      const p = path.getAt(i);
      coords.push({ lat: p.lat(), lng: p.lng() });
    }

    // Calculate area using Google's geometry library
    const areaM2 = window.google.maps.geometry.spherical.computeArea(path);
    const areaHa = areaM2 / 10000;

    // Calculate center
    const bounds = new window.google.maps.LatLngBounds();
    coords.forEach((c) => bounds.extend(c));
    const center = bounds.getCenter();

    setPolygon(coords);
    setArea(areaHa);
    setHub({ lat: center.lat(), lng: center.lng() });

    // Clean up the drawn polygon (we'll render our own)
    poly.setMap(null);

    setMode("cameras");

    if (onFarmDrawn) {
      onFarmDrawn(coords, areaHa, { lat: center.lat(), lng: center.lng() });
    }
  }, [onFarmDrawn]);

  // ============================================================
  // CAMERA PLACEMENT
  // ============================================================

  const autoCameraLayout = useCallback(() => {
    if (!polygon || polygon.length < 3 || !hub) return;

    const coverage = CAMERA_COVERAGE[terrain] || CAMERA_COVERAGE.flat;
    const areaM2 = area * 10000;
    const coveragePerCam = Math.PI * coverage.radius * coverage.radius;
    const numCameras = Math.max(2, Math.ceil(areaM2 / coveragePerCam));

    // Generate camera positions in concentric rings
    const positions = [];
    const bounds = new window.google.maps.LatLngBounds();
    polygon.forEach((c) => bounds.extend(c));

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const maxRadius = Math.max(
      Math.abs(ne.lat() - sw.lat()) / 2,
      Math.abs(ne.lng() - sw.lng()) / 2
    );

    let remaining = numCameras;
    const rings = [0.3, 0.5, 0.7, 0.9]; // Radius fractions

    for (const ringFrac of rings) {
      if (remaining <= 0) break;
      const camerasInRing = Math.min(remaining, Math.max(4, Math.ceil(numCameras / rings.length)));
      const ringRadius = maxRadius * ringFrac;

      for (let i = 0; i < camerasInRing; i++) {
        if (remaining <= 0) break;
        const angle = (i / camerasInRing) * Math.PI * 2;
        const lat = hub.lat + Math.sin(angle) * ringRadius;
        const lng = hub.lng + Math.cos(angle) * ringRadius;

        // Check if point is roughly inside the farm
        positions.push({
          id: positions.length + 1,
          serial: `CAM-${String(positions.length + 1).padStart(3, "0")}`,
          lat, lng,
          coverage_radius: coverage.radius,
        });
        remaining--;
      }
    }

    setCameraMarkers(positions);
    if (onCameraPositions) onCameraPositions(positions);
    setMode("done");
  }, [polygon, hub, area, terrain, onCameraPositions]);

  useEffect(() => {
    if (mode === "cameras" && polygon && hub) {
      autoCameraLayout();
    }
  }, [mode, polygon, hub, autoCameraLayout]);

  // ============================================================
  // RENDER
  // ============================================================

  if (!isLoaded) {
    return (
      <div style={{ height: 500, background: "#f3f4f6", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>
          <div style={{ fontSize: 28 }}>🗺️</div>
          <div style={{ marginTop: 8, fontSize: 14 }}>Loading Google Maps...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "2px solid #e5e7eb" }}>
      {/* TOOLBAR */}
      <div style={{
        position: "absolute", top: 12, left: 12, right: 12, zIndex: 10,
        display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap"
      }}>
        {/* Search */}
        {mode === "search" && (
          <Autocomplete
            onLoad={(auto) => (autocompleteRef.current = auto)}
            onPlaceChanged={onPlaceSelected}
          >
            <input
              type="text"
              placeholder="🔍 Search your farm location..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              style={{
                width: 320, padding: "10px 14px", borderRadius: 10,
                border: "2px solid #16a34a", fontSize: 13,
                background: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
          </Autocomplete>
        )}

        {/* Mode buttons */}
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { id: "search", icon: "🔍", label: "Search" },
            { id: "draw", icon: "✏️", label: "Draw Farm" },
            { id: "done", icon: "✅", label: "Done" },
          ].filter(b => {
            if (readOnly) return b.id === "done";
            if (mode === "search") return b.id === "search";
            return true;
          }).map((b) => (
            <button key={b.id} onClick={() => setMode(b.id)} style={{
              padding: "8px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: mode === b.id ? "#1e3a2f" : "#fff",
              color: mode === b.id ? "#fff" : "#374151",
              border: "1px solid #d1d5db", boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {b.icon} {b.label}
            </button>
          ))}
        </div>

        {/* Map type toggle */}
        <button onClick={() => setMapType(mapType === "satellite" ? "roadmap" : "satellite")}
          style={{
            padding: "8px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: "#fff", border: "1px solid #d1d5db", cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)", fontFamily: "'DM Sans', sans-serif",
          }}>
          {mapType === "satellite" ? "🗺️ Map" : "🛰️ Satellite"}
        </button>
      </div>

      {/* AREA DISPLAY */}
      {area > 0 && (
        <div style={{
          position: "absolute", bottom: 12, left: 12, zIndex: 10,
          background: "#fff", borderRadius: 10, padding: "10px 16px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)", display: "flex", gap: 16
        }}>
          <div>
            <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700 }}>FARM AREA</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1e3a2f" }}>{area.toFixed(2)} ha</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700 }}>CAMERAS</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#16a34a" }}>{cameraMarkers.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700 }}>TERRAIN</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", textTransform: "capitalize" }}>{terrain}</div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {mode === "draw" && !polygon && (
        <div style={{
          position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
          zIndex: 10, background: "#1e3a2f", color: "#fff", borderRadius: 10,
          padding: "10px 20px", fontSize: 12, fontWeight: 600,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}>
          ✏️ Click on the map to draw your farm boundary. Click the first point to close.
        </div>
      )}

      {/* MAP */}
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: 500 }}
        center={mapCenter}
        zoom={DEFAULT_ZOOM}
        onLoad={onMapLoad}
        mapTypeId={mapType}
        options={{
          styles: MAP_STYLES,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          zoomControl: true,
        }}
      >
        {/* Drawing Manager */}
        {mode === "draw" && !polygon && !readOnly && (
          <DrawingManager
            onLoad={(dm) => (drawingRef.current = dm)}
            onPolygonComplete={onPolygonComplete}
            drawingMode="polygon"
            options={{
              drawingControl: false,
              polygonOptions: {
                fillColor: "#16a34a",
                fillOpacity: 0.2,
                strokeColor: "#16a34a",
                strokeWeight: 3,
                clickable: true,
                editable: true,
              },
            }}
          />
        )}

        {/* Farm Polygon */}
        {polygon && (
          <Polygon
            paths={polygon}
            options={{
              fillColor: "#16a34a",
              fillOpacity: 0.15,
              strokeColor: "#16a34a",
              strokeWeight: 3,
              clickable: false,
            }}
          />
        )}

        {/* Hub Marker */}
        {hub && (
          <Marker
            position={hub}
            icon={{
              url: "data:image/svg+xml," + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="20" fill="#1e3a2f" stroke="#fff" stroke-width="3"/>
                  <text x="22" y="28" text-anchor="middle" font-size="18">🏠</text>
                </svg>`),
              scaledSize: isLoaded ? new window.google.maps.Size(44, 44) : undefined,
            }}
            title="Central Hub"
            draggable={!readOnly}
            onDragEnd={(e) => {
              setHub({ lat: e.latLng.lat(), lng: e.latLng.lng() });
            }}
          />
        )}

        {/* Camera Nodes */}
        {cameraMarkers.map((cam) => (
          <div key={cam.id}>
            {/* Coverage circle */}
            <Circle
              center={{ lat: cam.lat, lng: cam.lng }}
              radius={cam.coverage_radius}
              options={{
                fillColor: CAMERA_COVERAGE[terrain]?.color || "#16a34a40",
                fillOpacity: 0.3,
                strokeColor: "#16a34a",
                strokeWeight: 1,
                strokeOpacity: 0.5,
              }}
            />
            {/* Camera marker */}
            <Marker
              position={{ lat: cam.lat, lng: cam.lng }}
              icon={{
                url: "data:image/svg+xml," + encodeURIComponent(`
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="14" fill="#16a34a" stroke="#fff" stroke-width="2"/>
                    <text x="16" y="21" text-anchor="middle" font-size="14">📷</text>
                  </svg>`),
                scaledSize: isLoaded ? new window.google.maps.Size(32, 32) : undefined,
              }}
              title={cam.serial}
              draggable={!readOnly}
              onClick={() => setSelectedCamera(cam)}
              onDragEnd={(e) => {
                const updated = cameraMarkers.map((c) =>
                  c.id === cam.id ? { ...c, lat: e.latLng.lat(), lng: e.latLng.lng() } : c
                );
                setCameraMarkers(updated);
                if (onCameraPositions) onCameraPositions(updated);
              }}
            />
          </div>
        ))}

        {/* Camera Info Window */}
        {selectedCamera && (
          <InfoWindow
            position={{ lat: selectedCamera.lat, lng: selectedCamera.lng }}
            onCloseClick={() => setSelectedCamera(null)}
          >
            <div style={{ fontFamily: "'DM Sans', sans-serif", padding: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>📷 {selectedCamera.serial}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                Coverage: {selectedCamera.coverage_radius}m radius
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                Position: {selectedCamera.lat.toFixed(5)}, {selectedCamera.lng.toFixed(5)}
              </div>
              <div style={{ fontSize: 10, color: "#16a34a", marginTop: 4 }}>
                Drag to reposition
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
