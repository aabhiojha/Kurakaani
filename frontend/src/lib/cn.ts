/**
 * Tiny classname joiner — filters out falsy values and joins with spaces.
 * Deliberately dependency-free (no clsx/tailwind-merge) to keep the bundle lean;
 * the primitives are structured so later classes win by ordering, not merging.
 */
export type ClassValue = string | number | false | null | undefined

export function cn(...values: ClassValue[]): string {
	return values.filter(Boolean).join(" ")
}
