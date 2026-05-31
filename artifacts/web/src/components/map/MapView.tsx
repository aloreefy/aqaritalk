import { useCallback, useRef, useState } from "react";
import Map, { NavigationControl, GeolocateControl } from "react-map-gl/mapbox";
import type { MapRef, ViewStateChangeEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import PropertyMarker from "./PropertyMarker";
import type { Property } from "@workspace/api-client-react";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

const INITIAL_VIEW = {
  longitude: 35.9106,
  latitude: 31.9539,
  zoom: 11,
};

interface Props {
  properties?: Property[];
  onBoundsChange?: (center: { lat: number; lng: number }, zoom: number) => void;
}

export default function MapView({ properties = [], onBoundsChange }: Props) {
  const mapRef = useRef<MapRef>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const handleMoveEnd = useCallback(
    (e: ViewStateChangeEvent) => {
      if (!onBoundsChange) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const { latitude, longitude, zoom } = e.viewState;
        onBoundsChange({ lat: latitude, lng: longitude }, zoom);
      }, 500);
    },
    [onBoundsChange],
  );

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm flex-col gap-2">
        <span className="text-3xl">🗺️</span>
        <p>يحتاج Mapbox إلى مفتاح API</p>
        <p className="text-xs text-gray-400">أضف VITE_MAPBOX_TOKEN للمتابعة</p>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      initialViewState={INITIAL_VIEW}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      mapboxAccessToken={MAPBOX_TOKEN}
      onLoad={() => setMapLoaded(true)}
      onMoveEnd={handleMoveEnd}
      localIdeographFontFamily="'Noto Sans Arabic', sans-serif"
      attributionControl={false}
    >
      <NavigationControl position="bottom-left" showCompass={false} />
      <GeolocateControl
        position="bottom-left"
        trackUserLocation
        showUserHeading
      />
      {mapLoaded &&
        properties.map((p) => <PropertyMarker key={p.id} property={p} />)}
    </Map>
  );
}
