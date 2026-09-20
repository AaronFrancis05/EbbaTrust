/**
 * Joins Tailwind class strings, dropping falsy values.
 *
 * Deliberately not `clsx` + `tailwind-merge`: components in this repo compose their classes
 * from fixed token maps rather than merging arbitrary overrides, so there is nothing to
 * de-duplicate. Keeping the classes as flat literal strings is also what lets `/imprint`
 * read them verbatim. See ui-registry.md.
 */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
