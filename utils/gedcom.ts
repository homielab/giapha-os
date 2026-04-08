export interface GedcomPerson {
  id?: string;
  full_name?: string | null;
  gender?: "male" | "female" | "other" | string;
  birth_year?: number | null;
  birth_month?: number | null;
  birth_day?: number | null;
  death_year?: number | null;
  death_month?: number | null;
  death_day?: number | null;
  is_deceased?: boolean;
  is_in_law?: boolean;
  birth_order?: number | null;
  generation?: number | null;
  avatar_url?: string | null;
  note?: string | null;
}

export interface GedcomRelationship {
  type?: string;
  person_a?: string;
  person_b?: string;
}

export function exportToGedcom(data: {
  persons: GedcomPerson[];
  relationships: GedcomRelationship[];
}): string {
  let gedcom = "";

  // Header (GEDCOM 7.0)
  gedcom += "0 HEAD\n";
  gedcom += "1 GEDC\n";
  gedcom += "2 VERS 7.0\n";
  gedcom += "1 SOUR Giapha_OS\n";
  gedcom += "2 NAME Giapha OS\n";
  gedcom += "2 VERS 0.1.0\n";

  const personMap = new Map(
    data.persons.filter((p) => !!p.id).map((p) => [p.id!, p]),
  );

  // Map original IDs to short export IDs (to satisfy 20-char XREF limit)
  const exportIdMap = new Map<string, string>();
  let personCounter = 1;
  for (const person of data.persons) {
    if (person.id) {
      exportIdMap.set(person.id, `I${personCounter++}`);
    }
  }

  const getIndiXref = (id: string | undefined) =>
    id ? `@${exportIdMap.get(id) || id.replace(/-/g, "")}@` : "";

  // Helper formatting Date
  const formatNum = (n: number | null) =>
    n && n > 0 ? String(n).padStart(2, "0") : "";

  // Pre-process Families
  let familyCounter = 1;
  const marriages = data.relationships.filter((r) => r.type === "marriage");
  const childrenRels = data.relationships.filter(
    (r) => r.type === "biological_child" || r.type === "adopted_child",
  );

  const families: {
    id: string;
    husb?: string;
    wife?: string;
    children: string[];
  }[] = [];

  for (const marriage of marriages) {
    if (!marriage.person_a || !marriage.person_b) continue;
    const pA = personMap.get(marriage.person_a);
    const pB = personMap.get(marriage.person_b);
    if (!pA || !pB || !pA.id || !pB.id) continue;

    const fam = {
      id: `F${familyCounter++}`,
      husb: pA.gender === "male" ? pA.id : pB.gender === "male" ? pB.id : pA.id,
      wife:
        pA.gender === "female" ? pA.id : pB.gender === "female" ? pB.id : pB.id,
      children: [] as string[],
    };
    families.push(fam);
  }

  // Assign children to families
  for (const childRel of childrenRels) {
    const parentId = childRel.person_a;
    const childId = childRel.person_b;
    if (!parentId || !childId) continue;

    let fam = families.find((f) => f.husb === parentId || f.wife === parentId);

    if (!fam) {
      const pP = personMap.get(parentId);
      if (!pP) continue;
      fam = {
        id: `F${familyCounter++}`,
        husb: pP.gender === "male" ? parentId : undefined,
        wife: pP.gender === "female" ? parentId : undefined,
        children: [],
      };
      families.push(fam);
    }

    if (!fam.children.includes(childId)) {
      fam.children.push(childId);
    }
  }

  // Map persons to their families (for FAMC and FAMS)
  const personFamc = new Map<string, string[]>();
  const personFams = new Map<string, string[]>();

  for (const fam of families) {
    if (fam.husb) {
      const current = personFams.get(fam.husb) || [];
      if (!current.includes(fam.id))
        personFams.set(fam.husb, [...current, fam.id]);
    }
    if (fam.wife) {
      const current = personFams.get(fam.wife) || [];
      if (!current.includes(fam.id))
        personFams.set(fam.wife, [...current, fam.id]);
    }
    for (const childId of fam.children) {
      const current = personFamc.get(childId) || [];
      if (!current.includes(fam.id))
        personFamc.set(childId, [...current, fam.id]);
    }
  }

  // Export Individuals
  for (const person of data.persons) {
    if (!person.id) continue;
    gedcom += `0 ${getIndiXref(person.id)} INDI\n`;

    // Name
    if (person.full_name) {
      const parts = person.full_name.trim().split(" ");
      const lastName = parts.length > 1 ? parts.pop() : "";
      const firstName = parts.join(" ");
      gedcom += `1 NAME ${firstName} /${lastName}/\n`;
    } else {
      gedcom += `1 NAME Unknown /Unknown/\n`;
    }

    // Sex
    if (person.gender === "male") gedcom += "1 SEX M\n";
    else if (person.gender === "female") gedcom += "1 SEX F\n";
    else gedcom += "1 SEX U\n";

    // Birth
    if (person.birth_year || person.birth_month || person.birth_day) {
      gedcom += "1 BIRT\n";
      const day = formatNum(person.birth_day ?? null);
      const mont = getMonthName(person.birth_month ?? null);
      const yea = person.birth_year ? String(person.birth_year) : "";
      const dateParts = [day, mont, yea].filter(Boolean);
      if (dateParts.length > 0) {
        gedcom += `2 DATE ${dateParts.join(" ")}\n`;
      }
    }

    // Death
    if (person.is_deceased) {
      gedcom += "1 DEAT Y\n";
      if (person.death_year || person.death_month || person.death_day) {
        const day = formatNum(person.death_day ?? null);
        const mont = getMonthName(person.death_month ?? null);
        const yea = person.death_year ? String(person.death_year) : "";
        const dateParts = [day, mont, yea].filter(Boolean);
        if (dateParts.length > 0) {
          gedcom += `2 DATE ${dateParts.join(" ")}\n`;
        }
      }
    }

    // Family Links
    const famcs = personFamc.get(person.id) || [];
    for (const famId of famcs) {
      gedcom += `1 FAMC @${famId}@\n`;
    }
    const famss = personFams.get(person.id) || [];
    for (const famId of famss) {
      gedcom += `1 FAMS @${famId}@\n`;
    }

    // Note
    if (person.note) {
      const lines = person.note.split("\n");
      gedcom += `1 NOTE ${lines[0]}\n`;
      for (let i = 1; i < lines.length; i++) {
        gedcom += `2 CONT ${lines[i]}\n`;
      }
    }
  }

  for (const fam of families) {
    gedcom += `0 @${fam.id}@ FAM\n`;
    if (fam.husb) gedcom += `1 HUSB ${getIndiXref(fam.husb)}\n`;
    if (fam.wife) gedcom += `1 WIFE ${getIndiXref(fam.wife)}\n`;
    for (const childId of fam.children) {
      gedcom += `1 CHIL ${getIndiXref(childId)}\n`;
    }
  }

  gedcom += "0 TRLR\n";
  return gedcom;
}

function getMonthName(month: number | null): string {
  if (!month) return "";
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  return months[month - 1] || "";
}

function parseMonthName(name: string): number | null {
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const index = months.findIndex((m) => m === name.toUpperCase());
  return index !== -1 ? index + 1 : null;
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function parseGedcom(gedcom: string): {
  persons: GedcomPerson[];
  relationships: GedcomRelationship[];
} {
  const lines = gedcom.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const persons: GedcomPerson[] = [];
  const relationships: GedcomRelationship[] = [];
  const idMap = new Map<string, string>();

  type ParseRecord = {
    type: "INDI" | "FAM";
    id: string;
    lines: string[];
  };

  const records: ParseRecord[] = [];
  let currentRecord: ParseRecord | null = null;

  for (const line of lines) {
    if (line.startsWith("0 ")) {
      if (currentRecord) records.push(currentRecord);
      const match = line.match(/^0\s+@([^@]+)@\s+(INDI|FAM)/);
      if (match) {
        currentRecord = {
          id: match[1],
          type: match[2] as "INDI" | "FAM",
          lines: [],
        };
      } else {
        currentRecord = null;
      }
    } else if (currentRecord) {
      currentRecord.lines.push(line.trim());
    }
  }
  if (currentRecord) records.push(currentRecord);

  // Parse Individuals
  for (const record of records.filter((r) => r.type === "INDI")) {
    const uuid = generateUUID();
    idMap.set(record.id, uuid);

    let fullName = "Unknown";
    let gender: "male" | "female" | "other" = "other";
    let is_deceased = false;
    let birth_day = null;
    let birth_month = null;
    let birth_year = null;
    let death_day = null;
    let death_month = null;
    let death_year = null;
    let note = "";

    let currentTag = "";

    for (let i = 0; i < record.lines.length; i++) {
      const line = record.lines[i];
      const match = line.match(/^(\d+)\s+([A-Z0-9_]+)(?:\s+(.*))?$/);
      if (!match) continue;

      const level = parseInt(match[1]);
      const tag = match[2];
      const val = match[3] || "";

      if (level === 1) {
        currentTag = tag;
        if (tag === "NAME") {
          fullName = val.replace(/\//g, "").trim();
        } else if (tag === "SEX") {
          if (val === "M") gender = "male";
          else if (val === "F") gender = "female";
        } else if (tag === "DEAT") {
          is_deceased = val.trim().length === 0 || val === "Y";
        } else if (tag === "NOTE") {
          note = val;
        }
      } else if (level === 2) {
        if (currentTag === "NOTE" && tag === "CONT") {
          note += "\n" + val;
        } else if (currentTag === "BIRT" && tag === "DATE") {
          const cleanVal = val.replace(/^(ABT|EST|AFT|BEF|CAL)\s+/i, "");
          const parts = cleanVal.split(" ");
          if (parts.length === 3) {
            birth_day = parseInt(parts[0]) || null;
            birth_month = parseMonthName(parts[1]);
            birth_year = parseInt(parts[2]) || null;
          } else if (parts.length === 1) {
            birth_year = parseInt(parts[0]) || null;
          } else if (parts.length === 2) {
            birth_month = parseMonthName(parts[0]);
            birth_year = parseInt(parts[1]) || null;
          }
        } else if (currentTag === "DEAT" && tag === "DATE") {
          is_deceased = true;
          const cleanVal = val.replace(/^(ABT|EST|AFT|BEF|CAL)\s+/i, "");
          const parts = cleanVal.split(" ");
          if (parts.length === 3) {
            death_day = parseInt(parts[0]) || null;
            death_month = parseMonthName(parts[1]);
            death_year = parseInt(parts[2]) || null;
          } else if (parts.length === 1) {
            death_year = parseInt(parts[0]) || null;
          } else if (parts.length === 2) {
            death_month = parseMonthName(parts[0]);
            death_year = parseInt(parts[1]) || null;
          }
        }
      }
    }

    persons.push({
      id: uuid,
      full_name: fullName,
      gender,
      is_deceased,
      birth_day: Number.isNaN(birth_day) ? null : birth_day,
      birth_month,
      birth_year: Number.isNaN(birth_year) ? null : birth_year,
      death_day: Number.isNaN(death_day) ? null : death_day,
      death_month,
      death_year: Number.isNaN(death_year) ? null : death_year,
      is_in_law: false,
      birth_order: null,
      generation: null,
      avatar_url: null,
      note: note.length > 0 ? note : null,
    });
  }

  // Parse Families
  for (const record of records.filter((r) => r.type === "FAM")) {
    let husb = null;
    let wife = null;
    const children: string[] = [];

    for (const line of record.lines) {
      const match = line.match(/^1\s+(HUSB|WIFE|CHIL)\s+@([^@]+)@/);
      if (match) {
        const tag = match[1];
        const refId = match[2];
        const uuid = idMap.get(refId);
        if (!uuid) continue;

        if (tag === "HUSB") husb = uuid;
        else if (tag === "WIFE") wife = uuid;
        else if (tag === "CHIL") children.push(uuid);
      }
    }

    if (husb && wife && husb !== wife) {
      relationships.push({
        type: "marriage",
        person_a: husb,
        person_b: wife,
      });
    }

    // Assigning children to the first available parent
    const parentA = husb || wife;
    if (parentA) {
      for (const childId of children) {
        if (parentA === childId) continue;
        relationships.push({
          type: "biological_child",
          person_a: parentA,
          person_b: childId,
        });
      }
    }
  }

  return { persons, relationships };
}
