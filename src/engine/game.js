import { MISSIONS } from "../data/missions.js";
import { RANDOM_EVENTS } from "../data/events.js";
import { TEAMS, THRESHOLDS_2024_25 } from "../data/teams.js";
import { GAME_RULES, getScenarioRules } from "../config/gameConfig.js";
import { applyEffects, evaluateRuleChecks, evaluateRun, buildClaimCode } from "./rules.js";

export function createInitialState(teamId, runSetup = {}) {
  const team = TEAMS[teamId];
  const scenarioRules = getScenarioRules(runSetup.scenario_id || "default");
  const spendGuardrailBase = scenarioRules.spend_guardrail_by_team?.[teamId] || (teamId === "warriors" ? 435000000 : 365000000);

  const state = {
    team_id: team.id,
    team_name: team.name,
    class_profile_id: runSetup.class_profile_id || "default",
    scenario_id: scenarioRules.id,
    scenario_rules: scenarioRules,
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
    current_season_year: team.current_season_year || 2025,
    trade_exceptions: (team.trade_exceptions || []).map((item) => ({ ...item })),
    cash_trade_budget_remaining: team.cash_trade_budget_remaining || 0,
    second_apron_history: [...(team.second_apron_history || [])],
    future_pick_status: { ...(team.future_pick_status || {}) },
    run_mode: runSetup.mode || "solo",
    participants: runSetup.participants || [],
    mission_ownership: {},
    strict_lock_enabled: Boolean(runSetup.strictLockEnabled)
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
  applyTransactionEffects(state, option.transaction);
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
  const claim_code = buildClaimCode(result.tier, result.status === "CLEARED", state.class_profile_id);
  return {
    ...result,
    claim_code,
    legal_log: state.legal_log,
    team_name: state.team_name,
    class_profile_id: state.class_profile_id,
    scenario_id: state.scenario_id,
    run_mode: state.run_mode,
    participants: state.participants,
    strict_lock_enabled: state.strict_lock_enabled,
    mission_ownership: state.mission_ownership,
    total_spend: state.total_spend,
    spend_guardrail: state.spend_guardrail,
    final_performance: state.performance_score,
    final_flexibility: state.flexibility_score
  };
}

function resolveTradeExceptionId(state, transaction = {}) {
  if (transaction.trade_exception_id) {
    return transaction.trade_exception_id;
  }
  return transaction.trade_exception_id_by_team?.[state.team_id] || "";
}

function applyTransactionEffects(state, transaction = null) {
  if (!transaction || typeof transaction !== "object") {
    return;
  }

  if (transaction.type === "trade_exception_create") {
    const id = transaction.trade_exception_id || `EX-${state.team_id.toUpperCase()}-${Date.now()}`;
    const amount = Number(transaction.trade_exception_create_amount || 0);
    const expires = Number(transaction.expires_after_year || (state.current_season_year + 1));
    const existingIndex = state.trade_exceptions.findIndex((item) => item.id === id);
    const payload = {
      id,
      amount,
      expires_after_year: expires,
      source: "Mission-generated trade exception"
    };
    if (existingIndex >= 0) {
      state.trade_exceptions[existingIndex] = payload;
    } else {
      state.trade_exceptions.push(payload);
    }
  }

  if (transaction.type === "trade_exception_use") {
    const id = resolveTradeExceptionId(state, transaction);
    const amount = Number(transaction.trade_exception_use_amount || 0);
    if (id && amount > 0) {
      const match = state.trade_exceptions.find((item) => item.id === id);
      if (match) {
        match.amount = Math.max(0, Number(match.amount || 0) - amount);
      }
      state.trade_exceptions = state.trade_exceptions.filter((item) => Number(item.amount || 0) > 0);
    }
  }

  if (transaction.type === "cash_trade") {
    const cashSent = Number(transaction.cash_sent || 0);
    state.cash_trade_budget_remaining = Math.max(0, state.cash_trade_budget_remaining - cashSent);
  }

  if (transaction.uses_future_pick) {
    const pickYear = String(transaction.pick_year || "future");
    state.future_pick_status[pickYear] = "committed";
  }

  if (state.payroll_total >= state.thresholds.second_apron && !state.second_apron_history.includes(state.current_season_year)) {
    state.second_apron_history.push(state.current_season_year);
  }
}
