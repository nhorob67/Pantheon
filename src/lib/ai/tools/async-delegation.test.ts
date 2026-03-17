import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canExposeDelegationTool, MAX_DELEGATION_DEPTH } from "./delegation-helpers.ts";
import { isChildBudgetAccountedToParent } from "../../runtime/async-delegation-utils.ts";

describe("async delegation helpers", () => {
  it("uses the same depth gating as sync delegation", () => {
    assert.equal(canExposeDelegationTool(true, 0), true);
    assert.equal(canExposeDelegationTool(true, MAX_DELEGATION_DEPTH - 1), true);
    assert.equal(canExposeDelegationTool(true, MAX_DELEGATION_DEPTH), false);
  });

  it("treats parent-accounted children as already charged back", () => {
    assert.equal(
      isChildBudgetAccountedToParent(
        { budget_accounted_to_parent_run_id: "run-parent" },
        "run-parent"
      ),
      true
    );
    assert.equal(
      isChildBudgetAccountedToParent(
        { budget_accounted_to_parent_run_id: "run-other" },
        "run-parent"
      ),
      false
    );
  });
});
