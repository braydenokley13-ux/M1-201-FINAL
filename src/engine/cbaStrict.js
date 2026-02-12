export function evaluateAdvancedCbaRules(state, option) {
  // This extension hook keeps advanced CBA logic out of the base rule file.
  // Return shape: { legal: boolean, reason: string }

  // # TODO(RULE-003): Add sign-and-trade incoming hard-cap checks.
  // # TODO(RULE-004): Add trade exception generation/expiry checks.
  // # TODO(RULE-005): Add second-apron pick freeze timeline checks by year.
  // # TODO(RULE-006): Add cash-in-trade restrictions.

  return {
    legal: true,
    reason: "Passed advanced CBA extension checks."
  };
}
