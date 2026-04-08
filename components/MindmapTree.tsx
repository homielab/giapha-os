"use client";

import { Person, Relationship } from "@/types";
import { Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useDashboard } from "./DashboardContext";
import { MindmapContextData, MindmapNode } from "./MindmapNode";
import MindmapToolbar from "./MindmapToolbar";

import { buildAdjacencyLists } from "@/utils/treeHelpers";

const DEFAULT_AUTO_COLLAPSE_LEVEL = 2;

interface MindmapTreeProps {
  personsMap: Map<string, Person>;
  relationships: Relationship[];
  roots: Person[];
  canEdit?: boolean;
}

export default function MindmapTree({
  personsMap,
  relationships,
  roots,
  canEdit,
}: MindmapTreeProps) {
  const { showAvatar, setMemberModalId } = useDashboard();
  const [hideDaughtersInLaw, setHideDaughtersInLaw] = useState(false);
  const [hideSonsInLaw, setHideSonsInLaw] = useState(false);
  const [hideDaughters, setHideDaughters] = useState(false);
  const [hideSons, setHideSons] = useState(false);
  const [hideMales, setHideMales] = useState(false);
  const [hideFemales, setHideFemales] = useState(false);
  const [hideExpandButtons, setHideExpandButtons] = useState(false);
  const [autoCollapseLevel, setAutoCollapseLevel] = useState(
    DEFAULT_AUTO_COLLAPSE_LEVEL,
  );
  const [expandSignal, setExpandSignal] = useState<{
    type: "expand" | "collapse";
    ts: number;
  } | null>(null);

  const ctx: MindmapContextData = useMemo(() => {
    const adj = buildAdjacencyLists(relationships, personsMap);

    return {
      personsMap,
      relationships,
      adj,
      hideDaughtersInLaw,
      hideSonsInLaw,
      hideDaughters,
      hideSons,
      hideMales,
      hideFemales,
      showAvatar,
      hideExpandButtons,
      autoCollapseLevel,
      expandSignal,
      setMemberModalId,
    };
  }, [
    personsMap,
    relationships,
    hideDaughtersInLaw,
    hideSonsInLaw,
    hideDaughters,
    hideSons,
    hideMales,
    hideFemales,
    showAvatar,
    hideExpandButtons,
    autoCollapseLevel,
    expandSignal,
    setMemberModalId,
  ]);

  if (roots.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-100 mb-4">
          <Share2 className="size-8 text-stone-300" />
        </div>
        <p className="text-stone-500 font-medium tracking-wide">
          Gia phả trống
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-140px)] flex justify-start lg:justify-center overflow-x-auto">
      <MindmapToolbar
        hideDaughtersInLaw={hideDaughtersInLaw}
        setHideDaughtersInLaw={setHideDaughtersInLaw}
        hideSonsInLaw={hideSonsInLaw}
        setHideSonsInLaw={setHideSonsInLaw}
        hideDaughters={hideDaughters}
        setHideDaughters={setHideDaughters}
        hideSons={hideSons}
        setHideSons={setHideSons}
        hideMales={hideMales}
        setHideMales={setHideMales}
        hideFemales={hideFemales}
        setHideFemales={setHideFemales}
        hideExpandButtons={hideExpandButtons}
        setHideExpandButtons={setHideExpandButtons}
        autoCollapseLevel={autoCollapseLevel}
        setAutoCollapseLevel={setAutoCollapseLevel}
        setExpandSignal={setExpandSignal}
        canEdit={canEdit}
      />

      {/* Root Container */}
      <div
        id="export-container"
        className="font-sans min-w-max pb-20 p-10 px-0 sm:px-8"
      >
        {roots.map((root, index) => (
          <MindmapNode
            key={root.id}
            personId={root.id}
            level={0}
            isLast={index === roots.length - 1}
            ctx={ctx}
          />
        ))}
      </div>
    </div>
  );
}
