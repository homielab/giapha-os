# Gia Phả OS - Agent Instructions

## Project Overview

Vietnamese family tree management application with Next.js, Supabase, and modern UI. Built for cloud deployment with self-hosted data ownership.

## Development Commands

```bash
# Install dependencies
bun install

# Development server
bun run dev

# Build for production  
bun run build

# Start production server
bun run start

# Lint code
bun run lint
```

## Tech Stack

- **Framework**: Next.js 16.2.1 (App Router)
- **Language**: TypeScript 5.9.3
- **UI**: React 19.2.4, Framer Motion, Tailwind CSS 4.2.2
- **Database**: Supabase (PostgreSQL) + @supabase/ssr
- **Package Manager**: Bun (required for setup)
- **Styling**: Tailwind CSS with PostCSS

## Key Architecture Notes

### Project Structure
- `/app` - Next.js App Router pages and layout components
- `/components` - Reusable UI components (38 components)
- `/utils` - Utility functions including Supabase helpers, date calculations, kinship logic
- `/types` - TypeScript type definitions
- `/hooks` - React hooks (e.g., pan/zoom functionality)
- `/docs` - Documentation and screenshots

### Supabase Integration
- **Auth**: User registration/login with role-based access (Admin, Editor, Member)
- **Database**: Three main tables - `persons`, `custom_events`, `user_roles`
- **Environment Variables Required**:
  ```env
  NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="your-anon-key"
  SITE_NAME="Gia Phả OS"
  ```

### Critical Setup Requirements
1. **Database Setup**: Must create Supabase project first, then configure auth URL redirects
2. **Package Manager**: Must use Bun (not npm/yarn) for installation
3. **First User**: Automatically gets Admin role; subsequent users get Member role by default
4. **Demo Domain**: Auto-detects `giapha-os.homielab.com` and pre-fills demo credentials

### User Roles & Permissions
- **Admin**: Full system access, user management, data export/import
- **Editor**: Add/edit/delete member info and relationships
- **Member**: View-only access to family tree and statistics

## Special Features

### Kinship System
- Complex Vietnamese kinship terminology (Bác, Chú, Cô, Dì...)
- Handles special cases like multi-spouse relationships
- Uses lunar calendar for traditional Vietnamese events

### Data Management
- Export/Import: JSON, CSV, GEDCOM formats
- Auto-computed events (birthdays, death anniversaries)
- Lunar calendar integration for traditional events

### UI Components
- Tree view and mindmap visualization with D3.js
- Responsive design optimized for both desktop and mobile
- iOS zoom fix for input fields (16px minimum font size)

## Development Workflow

### Testing and Validation
- ESLint only (no test suite found)
- Type checking via TypeScript
- Build verification with `bun run build`

### Build Process
- Uses Next.js 16.2.1 with default configuration
- Static assets optimized for production
- PostCSS processing for Tailwind CSS

### Common Issues
- **Auth Errors**: Must configure Supabase auth URL redirects for deployment domain
- **Build Failures**: Ensure all environment variables are set
- **Missing Dependencies**: Use `bun install` (not npm/yarn)

## Deployment

### Vercel (Recommended)
- Use the deploy button with environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

### Self-Hosting
- Requires Node.js + Bun
- Must configure Supabase auth URL for deployment domain
- Database schema must be created in Supabase first

## Privacy & Security
- No data collection by the project authors
- All data stored in user's Supabase instance
- Demo site uses fictional data only