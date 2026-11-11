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

## Adding release notes for a new version

1. Publish the new version to npm, for example `0.3.0`.
2. Create `changelogs/0.3.0.md`. The file name must match the npm version exactly.
3. Add the version to `src/data/compat.ts` (frameworks, styling, components).
4. Commit and push. Nothing needs to be published to npm.

If a version has no `changelogs/<version>.md`, **Download .md** falls back to a summary generated from `compat.ts`.
Pre-release versions (a dash in the version, such as `0.3.0-beta`) are hidden from the table.
