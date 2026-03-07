# Giapha OS — Frontend Architecture & Changes

**Version:** v1.7.0-beta.1  
**Technology:** React 19 + Next.js 15 + TypeScript + Tailwind CSS  
**Last Updated:** March 2026

---

## 🎨 Frontend Stack

### Core Technologies
- **Framework:** Next.js 15 (App Router, Server Components)
- **UI Framework:** React 19 + Hooks
- **Styling:** Tailwind CSS 4 with dark mode
- **Visualization:** D3.js (tree), Leaflet (map)
- **Internationalization:** next-intl (Vietnamese, English, Chinese)
- **State Management:** Context API + useCallback
- **Forms:** React Hook Form + Zod validation

### Project Structure
```
components/
├── Dashboard/
│   ├── DashboardContext.tsx     # Global state (views, filters)
│   ├── DashboardViews.tsx       # Main dashboard container
│   ├── DashboardMemberList.tsx  # Member list + family groups (NEW v1.7)
│   ├── DashboardHeader.tsx      # Top bar with theme/filter
│   └── TreeToolbar.tsx          # Tree controls (zoom, print, etc.)
│
├── Tree/
│   ├── FamilyTree.tsx           # D3 tree visualization
│   ├── FamilyNodeCard.tsx       # Single node card (NEW: vertical name)
│   ├── MindmapTree.tsx          # Radial mindmap view
│   └── MindmapNode.tsx          # Mindmap node component
│
├── Forms/
│   ├── MemberForm.tsx           # Create/edit member
│   ├── CustomEventModal.tsx     # Add event (NEW: lunar dates v1.7.1)
│   ├── GraveEventForm.tsx       # Grave maintenance event
│   └── RelationshipManager.tsx  # Add/edit relationships
│
├── Admin/
│   ├── AdminUserList.tsx        # User management
│   ├── ResendEmailSettings.tsx  # Email notification config
│   └── [other admin components]
│
├── Public/
│   ├── PublicHeader.tsx         # Public page header
│   ├── PublicTreeView.tsx       # Public family tree (NEW v1.5)
│   └── Footer.tsx               # Footer with version
│
├── Map/
│   ├── CemeteryMap.tsx          # Cemetery map with markers
│   ├── FamilyMap.tsx            # Member birthplace map
│   └── MapToolbar.tsx           # Map controls
│
├── Export/
│   ├── FamilyBookExport.tsx     # PDF export by branch (ENHANCED v1.7)
│   └── [other export components]
│
└── [other shared components]

pages/
├── dashboard/                   # Protected routes
│   ├── members/
│   │   ├── page.tsx            # Member list
│   │   ├── [id]/page.tsx       # Member detail
│   │   ├── [id]/edit/page.tsx  # Member edit
│   │   └── new/page.tsx        # New member
│   ├── lineage/page.tsx        # Tree view
│   ├── kinship/page.tsx        # Kinship calculator
│   ├── events/page.tsx         # Events calendar
│   ├── cemetery-map/page.tsx   # Cemetery map
│   ├── map/page.tsx            # Member map
│   ├── settings/page.tsx       # User settings
│   └── [other pages]
│
├── public/
│   ├── [token]/page.tsx        # Public family tree (no auth)
│   ├── [token]/tree/page.tsx   # Public tree view
│   └── [token]/memorial/...    # Public memorial pages
│
└── auth/
    ├── login/page.tsx
    ├── signup/page.tsx
    └── join/[token]/page.tsx   # Invitation join
```

---

## 🎯 v1.7.0 Recent Frontend Changes

### 1. Lunar Events (v1.7.1)
**Component:** `CustomEventModal.tsx`

```typescript
export function CustomEventModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: Props) {
  const [eventDate, setEventDate] = useState<Date | null>(initialData?.event_date);
  const [lunarMonth, setLunarMonth] = useState(initialData?.lunar_month);
  const [lunarDay, setLunarDay] = useState(initialData?.lunar_day);
  const [isLunarOnly, setIsLunarOnly] = useState(!eventDate && lunarMonth);
  
  // Allow both solar date OR lunar date (or both)
  // If lunar_only, event_date is null
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <DatePicker
        selected={eventDate}
        onChange={setEventDate}
        disabled={isLunarOnly}
      />
      
      <Checkbox
        label="Lunar Date Only"
        checked={isLunarOnly}
        onChange={setIsLunarOnly}
      />
      
      {(isLunarOnly || lunarMonth) && (
        <LunarDatePicker
          month={lunarMonth}
          day={lunarDay}
          onMonthChange={setLunarMonth}
          onDayChange={setLunarDay}
        />
      )}
      
      <button onClick={() => onSave({
        event_date: isLunarOnly ? null : eventDate,
        lunar_month: lunarMonth,
        lunar_day: lunarDay,
      })}>Save</button>
    </Modal>
  );
}
```

**Database Flow:**
```
User selects "Lunar Only" + 1st lunar month, 15th day
  ↓
event_date = null
lunar_month = 1
lunar_day = 15
  ↓
Server computes next solar date annually: Lunar(current_year, 1, 15).toSolar()
  ↓
Cron job sends reminders on that solar date each year
```

### 2. PDF Export by Branch (v1.7)
**Component:** `FamilyBookExport.tsx`

```typescript
export function FamilyBookExport({ familyId }: Props) {
  const [selectedAncestor, setSelectedAncestor] = useState<Person | null>(null);
  const [maxDepth, setMaxDepth] = useState(5);
  const [loading, setLoading] = useState(false);
  
  async function exportBranch() {
    // 1. Get all persons in family
    const allPersons = await getFamily Persons(familyId);
    
    // 2. Filter subtree from selectedAncestor using BFS
    const subtree = getSubtree(selectedAncestor, maxDepth, allPersons, relationships);
    
    // 3. Generate PDF with jsPDF + html2canvas
    const pdf = new jsPDF();
    const html = renderSubtreeHTML(subtree);
    html2canvas(html).then(canvas => {
      const image = canvas.toDataURL('image/png');
      pdf.addImage(image, 'PNG', 0, 0, 210, 297);  // A4 size
      pdf.save(`family-book-${selectedAncestor.full_name}.pdf`);
    });
  }
  
  return (
    <div>
      <select
        value={selectedAncestor?.id || ''}
        onChange={(e) => setSelectedAncestor(...)}
      >
        <option>Select ancestor to export...</option>
        {allPersons.map(p => <option key={p.id}>{p.full_name}</option>)}
      </select>
      
      <input
        type="number"
        value={maxDepth}
        onChange={(e) => setMaxDepth(Number(e.target.value))}
        max="10"
        min="1"
      />
      
      <button onClick={exportBranch} disabled={loading}>
        {loading ? 'Generating...' : 'Export PDF'}
      </button>
    </div>
  );
}
```

### 3. Family Group View (v1.7)
**Component:** `DashboardMemberList.tsx`

```typescript
export function DashboardMemberList({
  persons,
  relationships,
  showFamilyGroups,
}: Props) {
  if (!showFamilyGroups) {
    return <PersonGrid persons={persons} />;
  }
  
  // Group children under parents
  const grouped = groupByParent(persons, relationships);
  
  return (
    <div className="space-y-4">
      {grouped.map(({ parent, children }) => (
        <Collapsible key={parent.id}>
          <CollapsibleTrigger>
            <FamilyNodeCard person={parent} isHead />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-2 gap-2 ml-4">
              {children.map(child => (
                <FamilyNodeCard key={child.id} person={child} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
```

**Toggle Button:**
```typescript
// In BaseToolbar.tsx
<button
  onClick={() => dispatch({ type: 'TOGGLE_FAMILY_GROUPS' })}
  className={showFamilyGroups ? 'bg-blue-500' : ''}
>
  👨‍👩‍👧‍👦 Theo gia đình
</button>
```

### 4. Vertical Name Display (v1.7)
**Component:** `FamilyNodeCard.tsx`

```typescript
export function FamilyNodeCard({
  person,
  verticalName = false,
  showAvatar = true,
}: Props) {
  return (
    <div className={verticalName ? 'writing-mode: vertical-rl' : ''}>
      {showAvatar && <img src={person.avatar_url} />}
      <span className="text-sm font-bold">{person.full_name}</span>
    </div>
  );
}
```

**Toggle in Toolbar:**
```typescript
// BaseToolbar.tsx
<button
  onClick={() => dispatch({ type: 'TOGGLE_VERTICAL_NAME' })}
  title="Tên dọc (Vertical Name)"
>
  ⬇️ Tên dọc
</button>
```

### 5. Print Mode (v1.7)
**CSS:** `globals.css`

```css
@media print {
  aside,
  .sidebar,
  .toolbar,
  footer {
    display: none;
  }
  
  .tree-container {
    overflow: visible;
    page-break-inside: avoid;
  }
  
  .family-node {
    page-break-inside: avoid;
  }
}
```

**Component:**
```typescript
// TreeToolbar.tsx
<button
  onClick={() => window.print()}
  title="Print tree (Ctrl+P)"
>
  🖨️ Print
</button>
```

---

## 🎛️ Global State Management

### DashboardContext
```typescript
interface DashboardContextType {
  // View mode
  viewMode: 'tree' | 'mindmap' | 'list' | 'admin' | 'map' | 'timeline' | 'kinship' | 'events';
  
  // Filters
  hideSpouses: boolean;
  hideFemales: boolean;
  hideMales: boolean;
  rootPersonId?: string;
  branchId?: string;
  
  // Display options
  showAvatars: boolean;
  verticalName: boolean;
  showFamilyGroups: boolean;
  
  // Theme
  darkMode: boolean;
  
  // Pagination
  currentPage: number;
  itemsPerPage: number;
}
```

### Usage
```typescript
const { state, dispatch } = useContext(DashboardContext);

// Change view
dispatch({ type: 'SET_VIEW_MODE', payload: 'mindmap' });

// Toggle filter
dispatch({ type: 'TOGGLE_HIDE_SPOUSES' });

// Set root person
dispatch({ type: 'SET_ROOT_PERSON', payload: personId });
```

---

## 📱 Responsive Design

### Breakpoints (Tailwind)
```
sm: 640px   (phone)
md: 768px   (tablet)
lg: 1024px  (desktop)
xl: 1280px  (large desktop)
```

### Mobile-First Patterns
```typescript
// Stack vertically on mobile, side-by-side on desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>

// Hide on mobile
<aside className="hidden lg:block">
  <Sidebar />
</aside>

// Full width on mobile
<input className="w-full md:w-64" />
```

---

## 🌓 Dark Mode

### Implementation
```typescript
// app/layout.tsx
<html>
  <head>
    <script>
      const dark = localStorage.getItem('dark-mode') !== 'false';
      if (dark) document.documentElement.classList.add('dark');
    </script>
  </head>
  <body className="dark:bg-slate-900 dark:text-white">
    <ThemeProvider>
      {children}
    </ThemeProvider>
  </body>
</html>
```

### CSS
```css
/* Tailwind dark: modifier */
.card {
  @apply bg-white dark:bg-slate-800;
  @apply text-black dark:text-white;
}
```

---

## 🌍 Internationalization (i18n)

### Message Structure
```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "loading": "Loading..."
  },
  "members": {
    "title": "Danh sách thành viên",
    "add": "Thêm thành viên",
    "edit": "Chỉnh sửa"
  },
  "kinship": {
    "uncle": "Chú",
    "aunt": "Cô",
    "nephew": "Cháu trai"
  }
}
```

### Usage
```typescript
'use client';
import { useTranslations } from 'next-intl';

export function MemberForm() {
  const t = useTranslations('members');
  
  return (
    <form>
      <label>{t('title')}</label>
      <input placeholder={t('name')} />
      <button>{t('add')}</button>
    </form>
  );
}
```

### Language Switcher
```typescript
// components/LanguageSwitcher.tsx
export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  
  return (
    <select
      value={locale}
      onChange={(e) => router.push(`/${e.target.value}`)}
    >
      <option value="vi">Tiếng Việt</option>
      <option value="en">English</option>
      <option value="zh">中文</option>
    </select>
  );
}
```

---

## 📊 Data Visualization

### D3 Tree
```typescript
// FamilyTree.tsx
import * as d3 from 'd3';

const width = 800;
const height = 600;

const hierarchy = d3.hierarchy(root);
const tree = d3.tree().size([width, height]);
tree(hierarchy);

// Render nodes and links
```

### Leaflet Map
```typescript
// CemeteryMap.tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

<MapContainer center={[20.8, 106.7]} zoom={13}>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='© OpenStreetMap'
  />
  {graves.map(grave => (
    <Marker key={grave.id} position={[grave.lat, grave.lng]}>
      <Popup>{grave.person.full_name}</Popup>
    </Marker>
  ))}
</MapContainer>
```

---

## 📚 Related Documentation
- **DATABASE_ARCHITECTURE.md** — Backend database schema
- **BACKEND_ARCHITECTURE.md** — Backend APIs
- **MOBILE_APP_PLAN.md** — Mobile app architecture (upcoming)

