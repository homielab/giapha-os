"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePanZoom } from "@/hooks/usePanZoom";
import { Person, Relationship } from "@/types";
import { Minus, Plus } from "lucide-react";
import { useDashboard } from "./DashboardContext";
import FamilyNodeCard from "./FamilyNodeCard";
import TreeToolbar from "./TreeToolbar";

import { buildAdjacencyLists, getFilteredTreeData } from "@/utils/treeHelpers";

const DEFAULT_AUTO_COLLAPSE_LEVEL = 2;

export default function FamilyTree({
  personsMap,
  relationships,
  roots,
  canEdit,
}: {
  personsMap: Map<string, Person>;
  relationships: Relationship[];
  roots: Person[];
  canEdit?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hideDaughtersInLaw, setHideDaughtersInLaw] = useState(false);
  const [hideSonsInLaw, setHideSonsInLaw] = useState(false);
  const [hideDaughters, setHideDaughters] = useState(false);
  const [hideSons, setHideSons] = useState(false);
  const [hideMales, setHideMales] = useState(false);
  const [hideFemales, setHideFemales] = useState(false);

  // Tập hợp các personId đang bị đóng (collapsed)
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [hideExpandButtons, setHideExpandButtons] = useState(false);
  const [autoCollapseLevel, setAutoCollapseLevel] = useState(
    DEFAULT_AUTO_COLLAPSE_LEVEL,
  );

  const { showAvatar } = useDashboard();

  const {
    scale,
    isPressed,
    isDragging,
    handlers: {
      handleMouseDown,
      handleMouseMove,
      handleMouseUpOrLeave,
      handleClickCapture,
      handleZoomIn,
      handleZoomOut,
      handleResetZoom,
    },
  } = usePanZoom(containerRef);

  // Center the scroll area horizontally
  const centerTree = useCallback(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const inner = el.querySelector("#export-container");
    if (inner) {
      const innerRect = inner.getBoundingClientRect();
      const containerRect = el.getBoundingClientRect();
      el.scrollLeft +=
        innerRect.left +
        innerRect.width / 2 -
        (containerRect.left + containerRect.width / 2);
    } else {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    }
  }, []);

  useEffect(() => {
    const equalizeHeights = () => {
      if (!containerRef.current) return;
      const nodes = containerRef.current.querySelectorAll(".node-container");
      const levelMap: Record<string, HTMLElement[]> = {};

      nodes.forEach((node) => {
        const level = node.getAttribute("data-level");
        if (level != null) {
          if (!levelMap[level]) levelMap[level] = [];
          levelMap[level].push(node as HTMLElement);
        }
      });

      Object.values(levelMap).forEach((levelNodes) => {
        // Reset min-height first to get natural height
        levelNodes.forEach((node) => {
          const innerFlex = node.firstElementChild as HTMLElement;
          if (innerFlex) innerFlex.style.minHeight = "0px";
        });

        let maxHeight = 0;
        // Find the maximum height in this level
        levelNodes.forEach((node) => {
          const innerFlex = node.firstElementChild as HTMLElement;
          if (innerFlex) {
            maxHeight = Math.max(maxHeight, innerFlex.offsetHeight);
          }
        });

        // Apply max height to all nodes in this level
        levelNodes.forEach((node) => {
          const innerFlex = node.firstElementChild as HTMLElement;
          if (innerFlex && maxHeight > 0) {
            innerFlex.style.minHeight = `${maxHeight}px`;
          }
        });
      });
    };

    const timeoutId = setTimeout(equalizeHeights, 50);
    window.addEventListener("resize", equalizeHeights);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", equalizeHeights);
    };
  }, [
    roots,
    personsMap,
    relationships,
    showAvatar,
    scale,
    hideDaughtersInLaw,
    hideSonsInLaw,
    hideDaughters,
    hideSons,
    hideMales,
    hideFemales,
    collapsedNodes,
  ]);

  const adj = useMemo(
    () => buildAdjacencyLists(relationships, personsMap),
    [relationships, personsMap],
  );

  const getTreeData = (personId: string) =>
    getFilteredTreeData(personId, personsMap, adj, {
      hideDaughtersInLaw,
      hideSonsInLaw,
      hideDaughters,
      hideSons,
      hideMales,
      hideFemales,
    });

  // Tự động đóng các nhánh từ đời autoCollapseLevel trở đi + căn giữa sau khi layout ổn định
  useEffect(() => {
    const autoCollapsed = new Set<string>();

    const walk = (personId: string, visited: Set<string>, level: number) => {
      if (visited.has(personId)) return;
      visited.add(personId);

      const data = getTreeData(personId);
      if (!data.person) return;

      if (
        autoCollapseLevel > 0 &&
        level >= autoCollapseLevel &&
        data.children.length > 0
      ) {
        autoCollapsed.add(personId);
      }

      data.children.forEach((child) =>
        walk(child.id, new Set(visited), level + 1),
      );
    };

    roots.forEach((root) => walk(root.id, new Set(), 0));
    setCollapsedNodes(autoCollapsed);

    // Double rAF: wait for React to re-render with collapsed state, then center
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(centerTree);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roots, personsMap, relationships, autoCollapseLevel]);

  const toggleCollapse = useCallback((personId: string) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) {
        next.delete(personId);
      } else {
        next.add(personId);
      }
      return next;
    });
  }, []);

  const handleCenter = centerTree;

  // Recursive function for rendering nodes
  // Tracks visited IDs to prevent infinite loops from circular relationships
  const renderTreeNode = (
    personId: string,
    visited: Set<string> = new Set(),
    level: number = 0,
  ): React.ReactNode => {
    if (visited.has(personId)) return null; // cycle guard
    visited.add(personId);

    const data = getTreeData(personId);
    if (!data.person) return null;

    const hasChildren = data.children.length > 0;
    const isCollapsed = collapsedNodes.has(personId);

    return (
      <li>
        <div
          className="node-container inline-flex flex-col items-center"
          data-level={level}
        >
          {/* Main Person & Spouses Row */}
          <div
            className={`flex relative z-10 items-stretch h-full${showAvatar ? " bg-white rounded-2xl shadow-md border border-stone-200/80 transition-opacity" : ""}`}
          >
            <FamilyNodeCard person={data.person} level={level} />

            {data.spouses.length > 0 &&
              data.spouses.map((spouseData, idx) => (
                <div key={spouseData.person.id} className="flex relative">
                  <FamilyNodeCard
                    isRingVisible={idx === 0}
                    isPlusVisible={idx > 0}
                    person={spouseData.person}
                    role={spouseData.person.gender === "male" ? "Chồng" : "Vợ"}
                    note={spouseData.note}
                    level={level}
                  />
                </div>
              ))}

            {/* Expand/Collapse Toggle – centered on the row */}
            {!hideExpandButtons && hasChildren && (
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  toggleCollapse(personId);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleCollapse(personId);
                  }
                }}
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white border border-stone-200/80 rounded-full size-6 flex items-center justify-center shadow-md z-100 text-stone-500 hover:text-amber-600 hover:border-amber-300 transition-colors cursor-pointer"
                title={isCollapsed ? "Mở rộng" : "Thu gọn"}
              >
                {isCollapsed ? (
                  <Plus className="w-3.5 h-3.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Render Children (if any and not collapsed) */}
        {hasChildren && !isCollapsed && (
          <ul>
            {data.children.map((child) => (
              <React.Fragment key={child.id}>
                {renderTreeNode(child.id, new Set(visited), level + 1)}
              </React.Fragment>
            ))}
          </ul>
        )}
      </li>
    );
  };

  if (roots.length === 0)
    return (
      <div className="text-center p-10 text-stone-500">
        Không tìm thấy dữ liệu.
      </div>
    );

  return (
    <div className="w-full h-full relative">
      <TreeToolbar
        scale={scale}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleResetZoom={handleResetZoom}
        handleCenter={handleCenter}
        hideExpandButtons={hideExpandButtons}
        setHideExpandButtons={setHideExpandButtons}
        autoCollapseLevel={autoCollapseLevel}
        setAutoCollapseLevel={setAutoCollapseLevel}
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
        canEdit={canEdit}
      />

      <div
        ref={containerRef}
        className={`w-full h-full overflow-auto bg-stone-50 ${isPressed ? "cursor-grabbing" : "cursor-grab"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => e.preventDefault()} // Prevent browser default dragging of links/images
      >
        {/* We use a style block to inject the CSS logic for the family tree lines */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
        .css-tree ul {
          padding-top: 30px; 
          position: relative;
          display: flex;
          justify-content: center;
          padding-left: 0;
          user-select: none;
        }

        .css-tree li {
          float: left; text-align: center;
          list-style-type: none;
          position: relative;
          padding: 30px 5px 0 5px;
        }

        /* Connecting lines */
        .css-tree li::before, .css-tree li::after {
          content: '';
          position: absolute; top: 0; right: 50%;
          border-top: 2px solid #d6d3d1;
          width: 50%; height: 30px;
        }
        .css-tree li::after {
          right: auto; left: 50%;
          border-left: 2px solid #d6d3d1;
        }

        /* Remove left-right connectors from elements without siblings */
        .css-tree li:only-child::after {
          display: none;
        }
        .css-tree li:only-child::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          border-left: 2px solid #d6d3d1;
          width: 0;
          height: 30px;
        }

        /* Remove top connector from first child */
        .css-tree ul:first-child > li {
          padding-top: 0px;
        }
        .css-tree ul:first-child > li::before {
          display: none;
        }

        /* Remove left connector from first child and right connector from last child */
        .css-tree li:first-child::before, .css-tree li:last-child::after {
          border: 0 none;
        }

        /* Add back the vertical connector to the last nodes */
        .css-tree li:last-child::before {
          border-right: 2px solid #d6d3d1;
          border-radius: 0 12px 0 0;
        }
        .css-tree li:first-child::after {
          border-radius: 12px 0 0 0;
        }

        /* Downward connectors from parents */
        .css-tree ul ul::before {
          content: '';
          position: absolute; top: 0; left: 50%;
          border-left: 2px solid #d6d3d1;
          width: 0; height: 30px;
        }
      `,
          }}
        />

        {/* 
        Use w-max to prevent wrapping and allow scrolling. 
        mx-auto centers it if smaller than screen. 
        p-8 adds padding inside scroll area.
      */}
        <div
          id="export-container"
          className={`w-max min-w-full mx-auto p-4 css-tree transition-all duration-200 ${isDragging ? "opacity-90" : ""}`}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          <ul>
            {roots.map((root) => (
              <React.Fragment key={root.id}>
                {renderTreeNode(root.id)}
              </React.Fragment>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
