"use client";

import "@photo-sphere-viewer/core/index.css";
import { useEffect, useRef } from "react";

interface PanoramaViewerInnerProps {
  imageUrl: string;
  height?: number;
}

export default function PanoramaViewerInner({ imageUrl, height = 400 }: PanoramaViewerInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;

    import("@photo-sphere-viewer/core").then(({ Viewer }) => {
      if (destroyed || !containerRef.current) return;

      viewerRef.current = new Viewer({
        container: containerRef.current,
        panorama: imageUrl,
        defaultZoomLvl: 50,
        navbar: ["zoom", "fullscreen"],
        touchmoveTwoFingers: true,
        mousewheel: true,
      });
    });

    return () => {
      destroyed = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [imageUrl]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%", borderRadius: "12px", overflow: "hidden" }}
    />
  );
}
