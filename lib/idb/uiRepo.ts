"use client";
import { idbGet, idbSet } from "./core";

/**
 * UI Repository
 * Persists UI flags and numeric values in the "ui" object store.
 */

export type UIKey =
  | "sidebar:width"
  | "sidebar:collapsed"
  | "requestpane:width"
  | "ui:language"
  | "ui:envvars";

/** Internal on-disk row format for the "ui" store. */
interface UIRowNumber {
  key: Extract<UIKey, "sidebar:width" | "requestpane:width">;
  value: number;
}
interface UIRowBool {
  key: Extract<UIKey, "sidebar:collapsed">;
  /** 1 = true, 0 = false */
  value: 1 | 0;
}
interface UIRowString {
  key: Extract<UIKey, "ui:language" | "ui:envvars">;
  value: string;
}
type UIRow = UIRowNumber | UIRowBool | UIRowString;

export const UIRepo = {
  /**
   * Reads a numeric UI value.
   * @returns Number if present, otherwise undefined.
   */
  async getNumber(
    key: Extract<UIKey, "sidebar:width" | "requestpane:width">
  ): Promise<number | undefined> {
    const row = await idbGet<UIRow>("ui", key);
    if (!row) return undefined;
    return typeof (row as any).value === "number"
      ? (row as any).value
      : undefined;
  },

  /**
   * Reads a boolean UI value (stored as 0/1).
   * @returns Boolean if present, otherwise undefined.
   */
  async getBoolean(
    key: Extract<UIKey, "sidebar:collapsed">
  ): Promise<boolean | undefined> {
    const row = await idbGet<UIRow>("ui", key);
    if (!row) return undefined;
    const v = (row as any).value;
    return v === 1 ? true : v === 0 ? false : undefined;
  },

  /** Sets a numeric UI value. */
  async setNumber(
    key: Extract<UIKey, "sidebar:width" | "requestpane:width">,
    value: number
  ) {
    const row: UIRowNumber = { key, value };
    await idbSet("ui", row);
  },

  /** Sets a boolean UI value. */
  async setBoolean(key: Extract<UIKey, "sidebar:collapsed">, value: boolean) {
    const row: UIRowBool = { key, value: value ? 1 : 0 };
    await idbSet("ui", row);
  },

  async getString(
    key: Extract<UIKey, "ui:language" | "ui:envvars">
  ): Promise<string | undefined> {
    const row = await idbGet<UIRow>("ui", key);
    if (!row) return undefined;
    return typeof (row as any).value === "string"
      ? (row as any).value
      : undefined;
  },

  async setString(
    key: Extract<UIKey, "ui:language" | "ui:envvars">,
    value: string
  ) {
    const row: UIRowString = { key, value };
    await idbSet("ui", row);
  },
};
