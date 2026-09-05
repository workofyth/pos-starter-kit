// Shared store type & branch mode constants — single source of truth for
// the pgEnum values in db/schema/pos.ts and every form/API that accepts them.
export const STORE_TYPES = ["VAPE", "WARUNG", "MINIMARKET", "BENGKEL"] as const;
export type StoreType = (typeof STORE_TYPES)[number];

export const STORE_TYPE_LABELS: Record<StoreType, string> = {
  VAPE: "Vape Shop",
  WARUNG: "Warung",
  MINIMARKET: "Minimarket",
  BENGKEL: "Bengkel",
};

export const BRANCH_MODES = ["single", "multi"] as const;
export type BranchMode = (typeof BRANCH_MODES)[number];

export const BRANCH_MODE_LABELS: Record<BranchMode, string> = {
  single: "Single Branch (satu lokasi)",
  multi: "Multi Branch (multi cabang)",
};

export function isValidStoreType(value: unknown): value is StoreType {
  return typeof value === "string" && (STORE_TYPES as readonly string[]).includes(value);
}

export function isValidBranchMode(value: unknown): value is BranchMode {
  return typeof value === "string" && (BRANCH_MODES as readonly string[]).includes(value);
}
