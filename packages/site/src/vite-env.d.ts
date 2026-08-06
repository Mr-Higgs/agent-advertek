/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Optional URL to POST rail-access requests to as JSON. When unset, the
   * form falls back to opening a prefilled mailto: link so a submission is
   * never silently lost with no backend wired up.
   */
  readonly VITE_RAIL_ACCESS_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
