# Shared clients list: Vercel Blob

"Clients / projects using this version" reads from, and adds to, one JSON file stored in a **private Vercel Blob store**.
The dashboard never talks to the store directly. It calls a small serverless function, `api/projects.ts`:

- `GET /api/projects` returns the list.
- `POST /api/projects` adds one entry (client, project, version).

Until the first entry is added, the function returns the built-in default list (`DEFAULTS` in `api/_core.ts`).
The first time someone adds a project, the defaults and the new entry are saved together to the JSON file.

If the function or the store is not available (for example under `npm run dev`, or before you finish the setup below),
the dashboard shows the built-in list from `src/data/clients.ts` and keeps new entries in the visitor's browser only.

Blob is free on Vercel's Hobby plan within its limits (1 GB storage, 2,000 writes and 10,000 reads a month).
This list is a few kilobytes, so the limits are far away. Vercel's terms limit Hobby to personal, non-commercial use,
so check which plan your Vercel account is on.

---

## One-time setup

1. Open the project in the Vercel dashboard (`evoke-npm-dashboard`).
2. Go to **Storage** → **Create Database** → **Blob** (the wording can differ slightly).
   - Name: `evoke-ui-kit-data`
   - Access: **Private**
   - Connect it to this project for **Production** (and **Preview** if you want it there too).
   Vercel adds the environment variable `BLOB_READ_WRITE_TOKEN` to the project for you.
3. **Redeploy** the project (Deployments → the latest one → ⋯ → Redeploy), so the function picks up the token.
4. Open the live site, click a version, then **Get NPM**, fill in a client and project, and submit.
   The dialog should say **Saved to the shared list.** Reload the page: the entry is still there.

You can see the file in the Vercel dashboard under **Storage → your store**: `evoke-ui-kit/projects.json`.

---

## The file

```json
{
  "projects": [
    { "version": "", "client": "Axalta", "project": "colordata" },
    { "version": "0.2.1", "client": "Globex", "project": "Billing App", "addedAt": "2026-11-17T12:49:48.623Z" }
  ]
}
```

The `version` field decides where an entry shows:

| `version` | Shows on |
|---|---|
| empty or `*` | every version |
| `0.2.1` | 0.2.1 only |
| `0.2.0, 0.2.1` | both (separate with commas) |

Entries added through the **Get NPM** button get the version of the row that was clicked.

### Edit or delete an entry

There is no admin screen. To change the list:
1. In the Vercel dashboard open the store, download `evoke-ui-kit/projects.json`, edit it, and upload it again under the same name
   (replace the existing file).
2. Keep the JSON valid: a missing comma or bracket makes the function return an error, and the dashboard falls back to the built-in list.

(Browsing the store in the dashboard counts toward the Blob operations, which is not an issue at this size.)

### Change the default list

- `DEFAULTS` in `api/_core.ts`: shown until the first entry is added.
- `src/data/clients.ts`: shown when the function cannot be reached. Keep both lists the same.
- Once the first entry has been added, the list lives in the saved file, so changing `DEFAULTS` no longer has an effect. Edit the file instead (see above).

---

## What to know

- **Anyone with the link can add entries.** No sign-in. The function accepts adds only from the dashboard's own site (it checks the
  request's origin), limits names to 100 characters, ignores exact duplicates and stops at 2,000 entries. That stops casual misuse from
  other websites; it does not stop someone from using the form on the dashboard itself.
- **Two people adding at the same instant** can overwrite each other (the file is read, changed and written back). For a handful of
  additions a day this is very unlikely. If it happens, the missing entry can simply be added again.
- **Others see a new entry on their next page load.** The page does not refresh itself.
- **The store belongs to your Vercel project.** If the project is deleted, the data goes with it. Download `projects.json` now and then as a backup.
- **Local development.** The `/api` functions exist only on Vercel, so `npm run dev` forwards `/api` to the deployed dashboard
  (`vite.config.ts`). You see the real shared list locally. It is read-only in practice: adding a project from `localhost` is
  refused by the function (wrong site), so the dialog says it was saved in this browser only.
  - To forward to a different address, or turn forwarding off, set `API_PROXY_TARGET` in `.env.local` (empty value = off).
  - To run the function itself locally, with write access to the real store, use the
    [Vercel CLI](https://vercel.com/docs/cli) (`vercel dev`) after `vercel link` and `vercel env pull`. Entries added that way go into
    the live store.
