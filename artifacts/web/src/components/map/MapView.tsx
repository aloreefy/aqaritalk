/**
 * MapView — renders the appropriate map engine based on the admin-configured
 * mapProvider setting (osm | mapbox | google).
 *
 * OSM   → react-map-gl/maplibre  (free, no key required)
 * Mapbox → react-map-gl/mapbox   (existing setup, needs MAPBOX token)
 * Google → native script loader  (needs Google Maps API key)
 */
// CSS must be imported statically — Vite cannot dynamically import node_modules CSS
import "maplibre-gl/dist/maplibre-gl.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { useCallback, useRef, useState, useEffect } from "react";
import type { Property } from "@workspace/api-client-react";
import PropertyMarker from "./PropertyMarker";

// ── shared constants ──────────────────────────────────────────────────────
const INITIAL_VIEW = { longitude: 35.9106, latitude: 31.9539, zoom: 11 };

interface Props {
  properties?: Property[];
  onBoundsChange?: (center: { lat: number; lng: number }, zoom: number) => void;
  mapProvider?: string;
  mapApiKey?: string | null;
}

// ── Placeholder for missing config ────────────────────────────────────────
function MapPlaceholder({ message }: { message: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm flex-col gap-2">
      <span className="text-3xl">🗺️</span>
      <p className="text-center px-6">{message}</p>
    </div>
  );
}

// ── OSM via MapLibre GL ───────────────────────────────────────────────────
function OsmMapView({ properties = [], onBoundsChange }: Omit<Props, "mapProvider" | "mapApiKey">) {
  // Dynamic import to avoid bundling maplibre unless OSM is actually selected
  const [MapLib, setMapLib] = useState<{
    Map: React.ComponentType<any>;
    NavigationControl: React.ComponentType<any>;
  } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    import("react-map-gl/maplibre").then((lib) => {
      setMapLib({ Map: lib.Map, NavigationControl: lib.NavigationControl });
    }).catch(console.error);
  }, []);

  const handleMoveEnd = useCallback(
    (e: any) => {
      if (!onBoundsChange) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const { latitude, longitude, zoom } = e.viewState;
        onBoundsChange({ lat: latitude, lng: longitude }, zoom);
      }, 500);
    },
    [onBoundsChange],
  );

  if (!MapLib) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
        جارٍ تحميل الخريطة…
      </div>
    );
  }

  const { Map, NavigationControl } = MapLib;

  return (
    <Map
      initialViewState={INITIAL_VIEW}
      style={{ width: "100%", height: "100%" }}
      // Free OpenFreeMap vector tiles — no API key required
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
      onLoad={() => setMapLoaded(true)}
      onMoveEnd={handleMoveEnd}
      attributionControl={false}
    >
      <NavigationControl position="bottom-left" showCompass={false} />
      {mapLoaded && properties.map((p) => <PropertyMarker key={p.id} property={p} />)}
    </Map>
  );
}

// ── Mapbox ────────────────────────────────────────────────────────────────
function MapboxMapView({ properties = [], onBoundsChange, mapApiKey }: Props) {
  const [MapLib, setMapLib] = useState<{
    Map: React.ComponentType<any>;
    NavigationControl: React.ComponentType<any>;
    GeolocateControl: React.ComponentType<any>;
  } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    import("react-map-gl/mapbox").then((lib) => {
      setMapLib({
        Map: lib.Map,
        NavigationControl: lib.NavigationControl,
        GeolocateControl: lib.GeolocateControl,
      });
    }).catch(console.error);
  }, []);

  const handleMoveEnd = useCallback(
    (e: any) => {
      if (!onBoundsChange) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const { latitude, longitude, zoom } = e.viewState;
        onBoundsChange({ lat: latitude, lng: longitude }, zoom);
      }, 500);
    },
    [onBoundsChange],
  );

  if (!mapApiKey) {
    return (
      <MapPlaceholder message="يحتاج Mapbox إلى مفتاح API. أضفه في إعدادات النظام ← الإقليمية والقواعد ← مزوّد الخريطة." />
    );
  }

  if (!MapLib) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
        جارٍ تحميل الخريطة…
      </div>
    );
  }

  const { Map, NavigationControl, GeolocateControl } = MapLib;

  return (
    <Map
      initialViewState={INITIAL_VIEW}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      mapboxAccessToken={mapApiKey}
      onLoad={() => setMapLoaded(true)}
      onMoveEnd={handleMoveEnd}
      localIdeographFontFamily="'Noto Sans Arabic', sans-serif"
      attributionControl={false}
    >
      <NavigationControl position="bottom-left" showCompass={false} />
      <GeolocateControl position="bottom-left" trackUserLocation showUserHeading />
      {mapLoaded && properties.map((p) => <PropertyMarker key={p.id} property={p} />)}
    </Map>
  );
}

// ── Google Maps ───────────────────────────────────────────────────────────
function GoogleMapsView({ properties = [], onBoundsChange, mapApiKey }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapApiKey || !containerRef.current) return;

    function initMap() {
      if (!containerRef.current || !window.google?.maps) return;
      const { Map, LatLng } = window.google.maps;
      mapRef.current = new Map(containerRef.current, {
        center: { lat: INITIAL_VIEW.latitude, lng: INITIAL_VIEW.longitude },
        zoom: INITIAL_VIEW.zoom,
        disableDefaultUI: false,
      });

      mapRef.current.addListener("idle", () => {
        if (!onBoundsChange) return;
        const c = mapRef.current.getCenter();
        onBoundsChange({ lat: c.lat(), lng: c.lng() }, mapRef.current.getZoom());
      });
    }

    if ((window as any).google?.maps) {
      initMap();
    } else {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${mapApiKey}&loading=async`;
      script.async = true;
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, [mapApiKey, onBoundsChange]);

  // Update markers when properties change
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps || !properties.length) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = properties
      .filter((p) => p.latitude && p.longitude)
      .map((p) => {
        const marker = new window.google.maps.Marker({
          position: { lat: p.latitude!, lng: p.longitude! },
          map: mapRef.current,
          title: p.listingName ?? "",
        });
        return marker;
      });
  }, [properties]);

  if (!mapApiKey) {
    return (
      <MapPlaceholder message="يحتاج Google Maps إلى مفتاح API. أضفه في إعدادات النظام ← الإقليمية والقواعد ← مزوّد الخريطة." />
    );
  }

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}

// ── Main export ───────────────────────────────────────────────────────────
export default function MapView({
  properties = [],
  onBoundsChange,
  mapProvider = "osm",
  mapApiKey,
}: Props) {
  switch (mapProvider) {
    case "mapbox":
      return <MapboxMapView properties={properties} onBoundsChange={onBoundsChange} mapApiKey={mapApiKey} />;
    case "google":
      return <GoogleMapsView properties={properties} onBoundsChange={onBoundsChange} mapApiKey={mapApiKey} />;
    default:
      return <OsmMapView properties={properties} onBoundsChange={onBoundsChange} />;
  }
}
