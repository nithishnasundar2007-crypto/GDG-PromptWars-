// PRD §7.5 — output comparison for the code runner. Deliberately tolerant of
// only trailing whitespace/newline differences (a student's `print` output
// commonly has a trailing newline the expected fixture doesn't) — nothing
// about case, spacing mid-string, or number formatting is normalised here,
// since a test author who writes "4" as expected output means exactly "4".

export function outputsMatch(actual: string, expected: string): boolean {
  return actual.replace(/\s+$/, "") === expected.replace(/\s+$/, "");
}
