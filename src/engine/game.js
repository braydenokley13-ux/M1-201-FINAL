import { MISSIONS } from "../data/missions.js";
import { RANDOM_EVENTS } from "../data/events.js";
import { TEAMS, THRESHOLDS_2024_25 } from "../data/teams.js";
import { GAME_RULES } from "../config/gameConfig.js";
import { applyEffects, evaluateRuleChecks, evaluateRun, buildClaimCode } from "./rules.js";

export function createInitialState(teamId, runSetup = {}) {
  const team = TEAMS[teamId];
  const spendGuardrailBase = teamId === "warriors" ? 435000000 : 365000000;

  const state = {
    team_id: team.id,
    team_name: team.name,
    payroll_total: team.payroll_total,
    tax_status: team.tax_status,
    repeater_status: team.repeater_status,
    apron_status: team.apron_status,
    exceptions_available: [...team.exceptions_available],
    roster_slots_open: team.roster_slots_open,
    performance_score: team.performance_score,
    flexibility_score: team.flexibility_score,
    legal_state: true,
    legal_log: [],
    legal_penalty_points: 0,
    completed_missions: new Set(),
    current_index: 0,
    total_spend: team.payroll_total,
    tax_penalty_estimate: 0,
    spend_guardrail: spendGuardrailBase,
    performance_floor: 62,
    flexibility_floor: 26,
    events_seen: new Set(),
    thresholds: THRESHOLDS_2024_25,
    run_mode: runSetup.mode || "solo",
    participants: runSetup.participants || []
  };

  applyEffects(state, {});
  return state;
}

export function listMissions() {
  return MISSIONS;
}

function chooseEvent(state) {
  const candidates = RANDOM_EVENTS.filter((e) => !state.events_seen.has(e.id));
  if (candidates.length === 0) return null;
  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  state.events_seen.add(picked.id);
  return picked;
}

export function maybeGetEvent(state) {
  const next = state.current_index + 1;
  if (GAME_RULES.eventTriggerMissions.includes(next)) {
    return chooseEvent(state);
  }
  return null;
}

export function applyMissionOption(state, mission, option) {
  const check = evaluateRuleChecks(state, option);
  if (!check.legal) {
    state.legal_state = false;
    state.legal_penalty_points += GAME_RULES.illegalMovePenaltyPoints;
    state.legal_log.push(`Mission ${mission.mission_id}: ${check.reason}`);
    return { ok: false, reason: check.reason, state };
  }

  applyEffects(state, option.effects);
  state.completed_missions.add(mission.mission_id);
  state.current_index += 1;
  return { ok: true, reason: "Move accepted.", state };
}

export function applyEventOption(state, option) {
  applyEffects(state, option.effects);
  return state;
}

export function finishRun(state) {
  const result = evaluateRun(state);
  const claim_code = buildClaimCode(result.tier, result.status === "CLEARED");
  return {
    ...result,
    claim_code,
    legal_log: state.legal_log,
    team_name: state.team_name,
    run_mode: state.run_mode,
    participants: state.participants,
    total_spend: state.total_spend,
    spend_guardrail: state.spend_guardrail,
    final_performance: state.performance_score,
    final_flexibility: state.flexibility_score
  };
}

// # TODO(GAME-001): Add strict one-attempt exam lock toggle behavior with teacher audit hooks.
