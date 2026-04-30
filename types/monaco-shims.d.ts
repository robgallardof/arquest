declare module "monaco-themes/themes/*.json" {
  const theme: import("monaco-editor").editor.IStandaloneThemeData;
  export default theme;
}