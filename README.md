# Evoke UI Kit – version dashboard

Shows every npm version of `@evoke-tech/stencil-ui-kit`, with the frameworks and styling libraries each one works with.

```bash
npm install
npm run dev     # http://localhost:5173
npm run build
```

## Where the data comes from

| What | Source |
| --- | --- |
| Version list, dates, sizes, Stencil version, deprecated flag | npm registry, fetched live |
| Frameworks, styling libraries, components per version | `src/data/compat.ts` (edit at each release) |
| Release notes (the **Download .md** file) | `changelogs/<version>.md` |

## Reusable slide-over panel

`src/components/SlideOver.tsx` is a generic panel that slides in from the right. Render it only while it should be open:

```tsx
import { SlideOver } from './components/SlideOver';

{open && (
  <SlideOver
    title="Edit project"
    eyebrow="Settings"          // optional small label above the title
    subtitle="Last saved today" // optional
    width="480px"               // optional, default 560px
    onClose={() => setOpen(false)}
    returnFocusTo={buttonEl}    // optional, defaults to whatever had focus when it opened
    footer={<button onClick={save}>Save</button>} // optional fixed bottom bar
  >
    …any content…
  </SlideOver>
)}
```

It handles Esc and click-outside to close, keeps keyboard focus inside the panel, returns focus on close, locks page scroll and respects reduced motion. Colors can be changed with the `--slideover-*` custom properties in `SlideOver.css`.

## Adding release notes for a new version

1. Publish the new version to npm, for example `0.3.0`.
2. Create `changelogs/0.3.0.md`. The file name must match the npm version exactly.
3. Add the version to `src/data/compat.ts` (frameworks, styling, components).
4. Commit and push. Nothing needs to be published to npm.

If a version has no `changelogs/<version>.md`, **Download .md** falls back to a summary generated from `compat.ts`.
Pre-release versions (a dash in the version, such as `0.3.0-beta`) are hidden from the table.
