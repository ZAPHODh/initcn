# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**initcn** is an infrastructure and configuration registry for Next.js applications, built on the shadcn registry architecture. Unlike traditional UI component libraries, initcn provides ready-to-use setup configurations for common infrastructure concerns: authentication, internationalization, payments, database integrations, and more.

**Tech Stack:**
- Next.js 16.1.1 with React 19.2.3 and TypeScript 5.9.3
- Fumadocs for MDX-based documentation
- Fumadocs Registry for distributing infrastructure configs
- Tailwind CSS 4.1.17 for styling
- Biome 2.3.8 for linting and formatting
- pnpm for package management

## Common Commands

```bash
# Development
pnpm dev              # Start Next.js dev server
pnpm build            # Build for production (infra registry → fumadocs-registry → next build)
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run Biome linter
pnpm format           # Format code with Biome
pnpm types:check      # Type check (runs fumadocs-mdx && next typegen && tsc --noEmit)

# Registry
pnpm build:registry   # Build all registry files (infra + components)
pnpm test:registry    # Test registry JSON generation
```

## Architecture

### Registry System

The core of initcn is a **hybrid registry system** that distributes infrastructure configurations similar to how shadcn/ui distributes components:

```
Build Flow:
1. Source: src/registry/ contains three types of items:
   - lib/   → Simple utilities (fumadocs-registry)
   - ui/    → UI components (fumadocs-registry)
   - infra/ → Infrastructure configs (custom script + metadata)

2. Build Process:
   a. build-infra-registry.ts → Processes multi-file infra configs
   b. fumadocs-registry → Processes single-file lib/ui components
   c. next build → Builds Next.js application

3. Output: public/r/*.json (shadcn-compatible registry format)
4. Distribution: Served via https://initcn.vercel.app/r/config-name.json
5. Installation: Users install via npx shadcn@latest add [url]
```

**Registry JSON Format:**
```json
{
  "name": "config-name",
  "type": "lib",
  "files": [
    {
      "target": "lib/auth/config.ts",
      "content": "...TypeScript code..."
    }
  ],
  "dependencies": ["next-auth", "..."],
  "registryDependencies": []
}
```

### Directory Structure

```
initcn/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (home)/            # Homepage
│   │   ├── docs/              # Documentation pages
│   │   ├── api/               # API routes
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Website UI components
│   ├── registry/              # Registry source files (3-tier structure)
│   │   ├── lib/              # Simple utilities (auto-discovered by fumadocs-registry)
│   │   │   ├── utils.ts
│   │   │   └── use-controllable-state.ts
│   │   ├── ui/               # UI components (auto-discovered by fumadocs-registry)
│   │   │   └── input-otp.tsx
│   │   └── infra/            # Infrastructure configs (custom build script)
│   │       ├── auth-otp-shared/
│   │       │   ├── config.json       # Registry metadata
│   │       │   ├── components/       # React components
│   │       │   ├── client/           # Client utilities
│   │       │   └── server/           # Server utilities
│   │       ├── auth-otp-prisma/
│   │       │   ├── config.json
│   │       │   └── ...
│   │       └── auth-otp-drizzle/
│   │           ├── config.json
│   │           └── ...
│   └── lib/                   # Shared utilities
├── content/docs/              # MDX documentation
│   ├── index.mdx             # Docs homepage
│   ├── components/           # Component docs (legacy from billui)
│   └── [feature]/            # Feature-specific docs (auth, i18n, payments, etc.)
├── public/r/                  # Generated registry JSON files (gitignored)
├── scripts/                   # Build and test scripts
│   ├── build-infra-registry.ts  # Custom builder for infra/ configs
│   └── test-registry.js         # Registry validation
├── registry.config.ts         # Registry configuration
├── source.config.ts          # Fumadocs MDX configuration
└── components.json           # shadcn/ui configuration
```

### Key Configuration Files

- **[registry.config.ts](registry.config.ts)** - Defines registry name, base URL, and component directories
- **[source.config.ts](source.config.ts)** - Configures Fumadocs MDX processing and collections
- **[components.json](components.json)** - shadcn/ui configuration (style, aliases, paths)
- **[next.config.mjs](next.config.mjs)** - Next.js configuration with MDX support
- **[biome.json](biome.json)** - Linting and formatting rules

## Development Patterns

### Component/Config API Design

All configurations and components follow these patterns (from `.cursor/rules/`):

**Controlled/Uncontrolled Support:**
```tsx
interface ConfigProps {
  value?: string;           // Controlled
  defaultValue?: string;    // Uncontrolled
  onValueChange?: (value: string) => void;
}

// Use useControllableState from src/registry/lib/use-controllable-state.ts
const [currentValue, setValue] = useControllableState(
  value,
  defaultValue,
  onValueChange,
);
```

**Form Compatibility:**
Must work with both legacy (controlled state) and modern (Server Actions + FormData) patterns:
```tsx
// Legacy
<form onSubmit={handleSubmit}>
  <Component value={state} onValueChange={setState} />
</form>

// Modern
<form action={serverAction}>
  <Component name="fieldName" />
</form>
```

**Naming Conventions:**
- `value` / `defaultValue` - controlled/uncontrolled value
- `onValueChange` - value change callback (not `onChange`)
- `name` - form field name for submission
- `disabled` - disabled state

### Accessibility Requirements

From `.cursor/rules/ui-guidelines.mdc`:

- Full keyboard support per [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/)
- Visible focus rings (`:focus-visible`)
- Hit targets ≥24px (mobile ≥44px)
- Correct `autocomplete` attributes on inputs
- Placeholders end with ellipsis (`…`) and show example patterns
- Icon-only buttons have descriptive `aria-label`
- Use native semantics (`button`, `a`, `label`) before ARIA
- Status not conveyed by color alone

### UX Behaviors

- Trim whitespace on blur for text inputs
- Honor `prefers-reduced-motion` for animations
- Optimistic UI updates with rollback on error
- URL reflects state (filters, tabs, pagination) - use [nuqs](https://nuqs.dev)
- Warn on unsaved changes before navigation

## Commit Convention

Follow conventional commits: `category(scope): message`

Categories:
- `feat` - new features
- `fix` - bug fixes
- `refactor` - code changes (not fix/feature)
- `docs` - documentation changes
- `build` - dependencies or build changes
- `test` - test changes
- `ci` - CI configuration changes
- `chore` - other repository changes

Example: `feat(auth): add OAuth configuration template`

## Working with the Registry

### Three-Tier Registry Architecture

The registry is organized into three categories:

1. **lib/** - Simple utilities and hooks
   - Auto-discovered by fumadocs-registry
   - Single-file exports
   - Example: `utils.ts`, `use-controllable-state.ts`
   - Output: `lib/${name}.ts`

2. **ui/** - UI components
   - Auto-discovered by fumadocs-registry
   - Single-file React components
   - Example: `input-otp.tsx`
   - Output: `components/ui/${name}.tsx`

3. **infra/** - Infrastructure configurations
   - Custom build script (build-infra-registry.ts)
   - Multi-file, multi-directory patterns
   - Metadata-driven via config.json
   - Example: `auth-otp-prisma/`, `auth-otp-drizzle/`
   - Output: Custom target paths per file

### Adding New Infrastructure Configs

For multi-file infrastructure patterns (auth, i18n, payments, etc.):

1. **Create directory structure:**
   ```
   src/registry/infra/my-feature/
   ├── config.json          # Registry metadata (required)
   ├── components/          # React components → components/
   ├── api/                 # API routes → app/api/
   ├── server/              # Server code → lib/server/auth/
   └── client/              # Client code → lib/server/auth/
   ```

2. **Create config.json:**
   ```json
   {
     "name": "my-feature",
     "type": "registry:lib",
     "title": "My Feature",
     "description": "Description of what this does",
     "dependencies": ["package1", "package2"],
     "devDependencies": ["dev-package"],
     "registryDependencies": ["other-registry-item"]
   }
   ```

3. **File Target Mapping Rules:**
   - `api/*` → `app/api/*`
   - `app/*` → `app/*`
   - `components/*` → `components/` (flattened)
   - `emails/*` → `emails/*`
   - Everything else → `lib/server/auth/*`

4. **Build and verify:**
   ```bash
   pnpm build:registry  # Generates JSON
   pnpm test:registry   # Validates schema compliance
   ```

5. **Add documentation:** Create `content/docs/[feature]/` pages

### Adding Simple Utilities or UI Components

For single-file components:

1. Add file to `src/registry/lib/` or `src/registry/ui/`
2. Run `pnpm build:registry`
3. fumadocs-registry auto-discovers and generates JSON

### Documentation Structure

Each infrastructure feature should have:
- Overview - what problem it solves
- Installation - CLI command or manual setup
- Configuration - environment variables, options
- Usage - integration examples
- Examples - real-world patterns (Server Actions, API routes, etc.)
- API Reference - configuration options in clean tables

## Path Aliases

Configured in [tsconfig.json](tsconfig.json):
```typescript
"@/*" → "./src/*"
"fumadocs-mdx:collections/*" → ".source/*"
```

Example: `@/registry/lib/auth` → `src/registry/lib/auth`

## Notes for AI Assistants

- **Currently bootstrapped from billui**: The codebase was cloned from a billing UI component library. Ignore billing-specific content in existing docs/components - it will be replaced with infrastructure configs.
- **Registry architecture is preserved**: The fumadocs-registry system and Next.js documentation framework are being reused for infrastructure distribution.
- **Focus on infrastructure**: When creating new content, focus on server-side configs, integrations, and setup patterns - not UI components.
- **Component standards apply**: Even for infrastructure code, follow the component API patterns (controlled/uncontrolled, form compatibility) when applicable.
