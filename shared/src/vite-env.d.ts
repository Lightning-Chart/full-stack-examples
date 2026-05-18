interface ImportMetaEnv {
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly VITE_LCJS_LICENSE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}