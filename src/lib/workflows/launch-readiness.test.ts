import assert from "node:assert/strict";
import test from "node:test";
import {
  WORKFLOW_ROLLOUT_RINGS,
  assignWorkflowBuilderRolloutRing,
  getWorkflowBuilderRolloutTargetRing,
  isWorkflowBuilderRolledOutToCustomer,
} from "./launch-readiness.ts";

test("assignWorkflowBuilderRolloutRing returns a stable ring", () => {
  const customerId = "9b709de5-6d58-4b8d-9bd2-e87f3f6f7d25";
  const first = assignWorkflowBuilderRolloutRing(customerId);
  const second = assignWorkflowBuilderRolloutRing(customerId);

  assert.equal(first, second);
  assert.ok(WORKFLOW_ROLLOUT_RINGS.includes(first));
});

test("getWorkflowBuilderRolloutTargetRing defaults to delayed for invalid env values", () => {
  assert.equal(getWorkflowBuilderRolloutTargetRing(""), "delayed");
  assert.equal(getWorkflowBuilderRolloutTargetRing("beta"), "delayed");
  assert.equal(getWorkflowBuilderRolloutTargetRing("standard"), "standard");
});

test("isWorkflowBuilderRolledOutToCustomer honors ring order", () => {
  const customerIds = [
    "95fab2af-99dc-41cd-a2d2-c52ad43f8086",
    "0e324ee8-f13d-42f1-bbd4-5e595ca6a966",
    "73550c4d-b46f-4ea4-90ec-3bc0f591b317",
  ];

  for (const customerId of customerIds) {
    const canaryEligibility = isWorkflowBuilderRolledOutToCustomer(
      customerId,
      "canary"
    );
    const standardEligibility = isWorkflowBuilderRolledOutToCustomer(
      customerId,
      "standard"
    );
    const delayedEligibility = isWorkflowBuilderRolledOutToCustomer(
      customerId,
      "delayed"
    );

    if (canaryEligibility) {
      assert.equal(standardEligibility, true);
      assert.equal(delayedEligibility, true);
      continue;
    }

    if (standardEligibility) {
      assert.equal(delayedEligibility, true);
      continue;
    }

    assert.equal(delayedEligibility, true);
  }
});
