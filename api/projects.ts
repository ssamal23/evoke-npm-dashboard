import { get, put } from '@vercel/blob';
import { handle, type Row, type Store } from './_core.js';

/**
 * GET  /api/projects  -> { projects: [{ version, client, project }] }
 * POST /api/projects  -> adds { version, client, project }
 *
 * The list is one JSON file in a private Vercel Blob store. Setup: docs/vercel-blob-setup.md
 * (needs the BLOB_READ_WRITE_TOKEN environment variable, which Vercel adds when the store is connected).
 */
const PATH = 'evoke-ui-kit/projects.json';

const store: Store = {
  async read() {
    const result = await get(PATH, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200) return null;
    const data = JSON.parse(await new Response(result.stream).text()) as { projects?: Row[] };
    return Array.isArray(data.projects) ? data.projects : null;
  },
  async write(rows) {
    await put(PATH, JSON.stringify({ projects: rows }, null, 2), {
      access: 'private',
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: 'application/json',
    });
  },
};

export const GET = (request: Request) => handle(request, store);
export const POST = (request: Request) => handle(request, store);
