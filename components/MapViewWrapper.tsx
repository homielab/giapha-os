"use client";

import dynamic from "next/dynamic";
import type { Person } from "@/types";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface MapViewWrapperProps {
  persons: Person[];
}

export default function MapViewWrapper({ persons }: MapViewWrapperProps) {
  return <MapView persons={persons} />;
}
