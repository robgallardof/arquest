// utils/json.ts

/**
 * Pretty-prints JSON when the input is a valid JSON string.
 * Falls back to the original text otherwise.
 * @param text Raw text possibly containing JSON.
 */
export function prettyMaybe(text: string): string {
  try {
    const obj = JSON.parse(text);
    return JSON.stringify(obj, null, 2);
  } catch {
    return text;
  }
}
