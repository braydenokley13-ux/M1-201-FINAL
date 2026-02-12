import { THRESHOLDS_2024_25 } from "../data/teams.js";
import { CLAIM_CODES_BY_TIER } from "../config/claimCodes.js";
import { evaluateAdvancedCbaRules } from "./cbaStrict.js";

export function updateStatuses(state) {
  const payroll = state.payroll_total;
  state.tax_status = payroll > THRESHOLDS_2024_25.luxury_tax_line ? "Over Tax" : "Under Tax";

  if (payroll >= THRESHOLDS_2024_25.second_apron) {
    state.apron_status = "Second Apron";
  } else if (payroll >= THRESHOLDS_2024_25.first_apron) {
    state.apron_status = "First Apron";
  } else {
    state.apron_status = "Below Apron";
  }

  // # TODO(RULE-001): Replace simplified spend guardrail logic with teacher-configurable scenario rules.
  if (state.repeater_status === "YES" && state.tax_status === "Over Tax") {
    state.spend_guardrail = Math.min(state.spend_guardrail, THRESHOLDS_2024_25.second_apron + 245000000);
  }

  return state;
}

export function evaluateRuleChecks(state, option) {
  for (const check of option.rule_checks || []) {
    if (check.type === "requires_exception") {
      if (!state.exceptions_available.includes(check.value)) {
        return { legal: false, reason: `${check.value} is not available for this team state.` };
      }
    }

    if (check.type === "blocked_if_second_apron" && state.apron_status === "Second Apron") {
      return { legal: false, reason: check.reason || "Blocked by Second Apron restriction." };
    }

    if (check.type === "requires_not_second_apron" && state.apron_status === "Second Apron") {
      return { legal: false, reason: check.reason || "Option not allowed at Second Apron." };
    }

    if (check.type === "requires_roster_slots") {
      if (state.roster_slots_open < check.value) {
        return { legal: false, reason: `Need at least ${check.value} open roster slot(s).` };
      }
    }

    if (check.type === "blocked_if_frozen_pick") {
      if (state.flexibility_score <= 20 && state.apron_status === "Second Apron") {
        return { legal: false, reason: check.reason || "Blocked due to pick-freeze risk." };
      }
    }

    // # TODO(RULE-002): Add explicit sign-and-trade and cash-in-trade restrictions per CBA article refs.
  }

  const advanced = evaluateAdvancedCbaRules(state, option);
  if (!advanced.legal) {
    return advanced;
  }

  return { legal: true, reason: "Legal move." };
}

function computeTaxPenalty(payroll, repeaterStatus) {
  const overage = Math.max(0, payroll - THRESHOLDS_2024_25.luxury_tax_line);
  if (overage === 0) return 0;

  const brackets = repeaterStatus === "YES"
    ? [
        { limit: 5000000, rate: 2.5 },
        { limit: 5000000, rate: 2.75 },
        { limit: 5000000, rate: 3.5 },
        { limit: Infinity, rate: 4.25 }
      ]
    : [
        { limit: 5000000, rate: 1.5 },
        { limit: 5000000, rate: 1.75 },
        { limit: 5000000, rate: 2.5 },
        { limit: Infinity, rate: 3.25 }
      ];

  let remaining = overage;
  let penalty = 0;
  for (const bracket of brackets) {
    const taxed = Math.min(remaining, bracket.limit);
    penalty += taxed * bracket.rate;
    remaining -= taxed;
    if (remaining <= 0) break;
  }

  return Math.round(penalty);
}

export function applyEffects(state, effects) {
  state.payroll_total += effects.payroll_delta || 0;
  state.performance_score += effects.performance_delta || 0;
  state.flexibility_score += effects.flexibility_delta || 0;
  state.roster_slots_open += effects.roster_slots_delta || 0;
  state.spend_guardrail += effects.spend_guardrail_delta || 0;

  state.performance_score = Math.max(0, Math.min(100, state.performance_score));
  state.flexibility_score = Math.max(0, Math.min(100, state.flexibility_score));
  state.roster_slots_open = Math.max(0, state.roster_slots_open);

  updateStatuses(state);
  state.tax_penalty_estimate = computeTaxPenalty(state.payroll_total, state.repeater_status);
  state.total_spend = state.payroll_total + state.tax_penalty_estimate;

  return state;
}

function mapTier(weighted_score, allPass) {
  if (!allPass) return "NONE";
  if (weighted_score >= 90) return "TIER_3_ELITE";
  if (weighted_score >= 80) return "TIER_2_STRONG";
  if (weighted_score >= 70) return "TIER_1_CLEAR";
  return "NONE";
}

export function evaluateRun(state) {
  const legal_pass = state.legal_state;
  const performance_pass = state.performance_score >= state.performance_floor;
  const spend_pass = state.total_spend <= state.spend_guardrail;
  const flexibility_pass = state.flexibility_score >= state.flexibility_floor;

  const legality_bucket = legal_pass ? 40 : Math.max(0, 40 - state.legal_penalty_points);
  const perf_bucket = Math.min(20, Math.round((state.performance_score / 100) * 20));
  const spend_bucket = spend_pass ? 20 : Math.max(0, 20 - Math.round((state.total_spend - state.spend_guardrail) / 2000000));
  const flex_bucket = Math.min(20, Math.round((state.flexibility_score / 100) * 20));

  const weighted_score = legality_bucket + perf_bucket + spend_bucket + flex_bucket;
  const allPass = legal_pass && performance_pass && spend_pass && flexibility_pass;
  const tier = mapTier(weighted_score, allPass);
  const bonus_xp = Math.max(0, Math.min(25, Math.round((perf_bucket + flex_bucket + spend_bucket - 30) / 2)));
  const xp_awarded = allPass ? 50 + bonus_xp : 0;

  return {
    legal_pass,
    performance_pass,
    spend_pass,
    flexibility_pass,
    weighted_score,
    xp_awarded,
    tier,
    status: allPass ? "CLEARED" : "NOT CLEARED"
  };
}

export function buildClaimCode(tier, passed) {
  if (!passed) return "";
  return CLAIM_CODES_BY_TIER[tier] || "";
}
