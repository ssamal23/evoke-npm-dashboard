/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional: full URL of the /api/projects endpoint to use instead of the same-site one */
  readonly VITE_PROJECTS_API_URL?: string;
}
