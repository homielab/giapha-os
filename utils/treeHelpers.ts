import { Person, Relationship } from "@/types";

export interface SpouseData {
  person: Person;
  note?: string | null;
}

export interface AdjacencyLists {
  spousesByPersonId: Map<string, SpouseData[]>;
  childrenByPersonId: Map<string, Person[]>;
}

export interface TreeFilterOptions {
  hideDaughtersInLaw: boolean;
  hideSonsInLaw: boolean;
  hideDaughters: boolean;
  hideSons: boolean;
  hideMales: boolean;
  hideFemales: boolean;
}

/**
 * Xây dựng danh sách kề (adjacency lists) cho vợ/chồng và con cái từ dữ liệu thô.
 * Giúp tối ưu truy vấn từ O(N) xuống O(1).
 */
export function buildAdjacencyLists(
  relationships: Relationship[],
  personsMap: Map<string, Person>,
): AdjacencyLists {
  const spouses = new Map<string, SpouseData[]>();
  const children = new Map<string, Person[]>();

  relationships.forEach((r) => {
    if (r.type === "marriage") {
      if (!spouses.has(r.person_a)) spouses.set(r.person_a, []);
      if (!spouses.has(r.person_b)) spouses.set(r.person_b, []);

      const pB = personsMap.get(r.person_b);
      if (pB) spouses.get(r.person_a)!.push({ person: pB, note: r.note });

      const pA = personsMap.get(r.person_a);
      if (pA) spouses.get(r.person_b)!.push({ person: pA, note: r.note });
    } else if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!children.has(r.person_a)) children.set(r.person_a, []);
      const child = personsMap.get(r.person_b);
      if (child) children.get(r.person_a)!.push(child);
    }
  });

  // Sắp xếp con cái theo thứ tự sinh hoặc năm sinh
  children.forEach((childArray) => {
    childArray.sort((a, b) => {
      const aOrder = a.birth_order ?? Infinity;
      const bOrder = b.birth_order ?? Infinity;
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aYear = a.birth_year ?? Infinity;
      const bYear = b.birth_year ?? Infinity;
      return aYear - bYear;
    });
  });

  // Sắp xếp vợ/chồng theo năm sinh
  spouses.forEach((spouseArray) => {
    spouseArray.sort((a, b) => {
      const aYear = a.person.birth_year ?? Infinity;
      const bYear = b.person.birth_year ?? Infinity;
      return aYear - bYear;
    });
  });

  return { spousesByPersonId: spouses, childrenByPersonId: children };
}

/**
 * Lấy dữ liệu của một node trong cây (vợ chồng, con cái) đã qua bộ lọc.
 */
export function getFilteredTreeData(
  personId: string,
  personsMap: Map<string, Person>,
  adj: AdjacencyLists,
  filters: TreeFilterOptions,
) {
  const {
    hideDaughtersInLaw,
    hideSonsInLaw,
    hideDaughters,
    hideSons,
    hideMales,
    hideFemales,
  } = filters;

  let spousesList = adj.spousesByPersonId.get(personId) || [];
  spousesList = spousesList.filter((s) => {
    if (hideDaughtersInLaw && s.person.gender === "female") return false;
    if (hideSonsInLaw && s.person.gender === "male") return false;
    if (hideMales && s.person.gender === "male") return false;
    if (hideFemales && s.person.gender === "female") return false;
    return true;
  });

  let childrenList = adj.childrenByPersonId.get(personId) || [];
  childrenList = childrenList.filter((c) => {
    if (hideDaughters && c.gender === "female") return false;
    if (hideSons && c.gender === "male") return false;
    if (hideMales && c.gender === "male") return false;
    if (hideFemales && c.gender === "female") return false;
    return true;
  });

  return {
    person: personsMap.get(personId)!,
    spouses: spousesList,
    children: childrenList,
  };
}
