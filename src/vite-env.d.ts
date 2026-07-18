/// <reference types="vite/client" />
/// <reference types="@webgpu/types" />

interface ImportMetaEnv {
  readonly VITE_GEMMA_ENABLED?: string;
  readonly VITE_PEOPLE_RESEARCH_ENABLED?: string;
  readonly VITE_CLOUD_SYNC_ENABLED?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
