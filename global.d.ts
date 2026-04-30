/**
 * Ambient module declarations for packages that don't ship types for subpaths
 * we import (GraphQL mode, Monaco themes JSON, etc.).
 * These keep TypeScript happy while allowing us to import the modules we need.
 */

declare module "monaco-graphql";
declare module "monaco-graphql/initializeMode";
declare module "monaco-graphql/esm/monaco.contribution";

/**
 * Optimized Monaco build provided by monaco-graphql that only includes
 * JSON + GraphQL languages. Useful to avoid bundling 80+ languages by mistake.
 */
declare module "monaco-graphql/esm/monaco-editor" {
  export * from "monaco-editor";
}

/**
 * Allow importing Monaco theme JSON files as proper theme data.
 * Example: import monokai from "monaco-themes/themes/Monokai.json";
 */
declare module "monaco-themes/themes/*.json" {
  import type { editor } from "monaco-editor";
  const theme: editor.IStandaloneThemeData;
  export default theme;
}

/**
 * Optional: Vite-style worker query support (harmless in Next/Webpack).
 * If you ever import something like `import W from './my.worker?worker'`.
 */
declare module "*?worker" {
  const WorkerConstructor: {
    new (): Worker;
  };
  export default WorkerConstructor;
}
