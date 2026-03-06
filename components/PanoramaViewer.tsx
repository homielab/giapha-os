"use client";

import dynamic from "next/dynamic";

const PanoramaViewerInner = dynamic(
  () => import("@/components/PanoramaViewerInner"),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center bg-stone-100 rounded-xl" style={{ height: 400 }}>
      <span className="text-stone-400 text-sm">Đang tải toàn cảnh 360°...</span>
    </div>
  ) }
);

interface PanoramaViewerProps {
  imageUrl: string;
  height?: number;
}

export default function PanoramaViewer({ imageUrl, height }: PanoramaViewerProps) {
  return <PanoramaViewerInner imageUrl={imageUrl} height={height} />;
}
