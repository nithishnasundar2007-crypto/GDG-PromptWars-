// Owner: Shruthi (lead) + Reshma. The PRD §8.3 demo path, on mocks:
// setup -> probe -> amber -> confirm -> red -> drill -> re-test -> green ->
// Project Defense. Skipped until the real S1-S4/P1-P4 screens exist (M1) —
// this file is the skeleton their steps go into, not a passing assertion
// about screens that aren't built yet.
import { expect, test } from "@playwright/test";

test.skip("demo path: setup through Project Defense (mocks)", async ({ page }) => {
  await page.goto("/setup");
  await expect(page.getByText("Code runner:")).toBeVisible();

  // TODO(Shruthi/Reshma, M1): fill in each real step once its screen exists:
  //  1. Pick company + drive date -> Build my plan
  //  2. Start today's first task -> Probe: pick BFS, run buggy code, submit
  //  3. Assert the Graphs/Apply cell is amber (suspected gap)
  //  4. Confirmation probe on a second graph question -> cell turns red
  //  5. Debug drill -> fix the bug -> re-test on a fresh question -> green
  //  6. Project Defense: paste README, answer, see the readiness card
});
