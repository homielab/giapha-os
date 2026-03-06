"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { Person } from "@/types";

// Fix Leaflet's broken default marker icons in webpack/Next.js
L.Icon.Default.mergeOptions({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

interface NominatimResult {
  lat: string;
  lon: string;
}

async function geocodePlace(place: string): Promise<[number, number] | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "GiaphaOS/1.0 (genealogy app)",
      },
    });
    if (!res.ok) return null;
    const data: NominatimResult[] = await res.json();
    if (data.length === 0) return null;
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {
    return null;
  }
}

interface MapViewProps {
  persons: Person[];
}

export default function MapView({ persons }: MapViewProps) {
  const [coords, setCoords] = useState<Record<string, [number, number]>>({});

  useEffect(() => {
    let cancelled = false;
    const inFlight = new Set<string>();

    async function loadCoords() {
      const placesToFetch = Array.from(
        new Set(
          persons
            .map((p) => p.place_of_birth)
            .filter((p): p is string => Boolean(p)),
        ),
      );

      for (const place of placesToFetch) {
        if (cancelled) break;

        // Skip if already cached or request is in-flight
        setCoords((prev) => {
          if (prev[place] || inFlight.has(place)) return prev;
          inFlight.add(place);

          geocodePlace(place).then((result) => {
            inFlight.delete(place);
            if (result && !cancelled) {
              setCoords((c) => ({ ...c, [place]: result }));
            }
          });

          return prev;
        });

        // Respect Nominatim 1 req/sec policy
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    }

    loadCoords();
    return () => {
      cancelled = true;
    };
  }, [persons]);

  const mappedPersons = persons.filter(
    (p) => p.place_of_birth && coords[p.place_of_birth],
  );

  // Default center: Vietnam
  const defaultCenter: [number, number] = [16.047079, 108.20623];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={6}
      className="h-[calc(100vh-200px)] w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mappedPersons.map((person) => {
        const place = person.place_of_birth as string;
        const position = coords[place];
        return (
          <Marker key={person.id} position={position}>
            <Popup>
              <div className="text-sm space-y-0.5 min-w-[160px]">
                <p className="font-semibold text-stone-800">{person.full_name}</p>
                {person.birth_year && (
                  <p className="text-stone-500">Sinh: {person.birth_year}</p>
                )}
                <p className="text-stone-500 italic">{place}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
