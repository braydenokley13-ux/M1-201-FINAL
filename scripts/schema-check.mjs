import { GAME_RULES } from "../src/config/gameConfig.js";
import { RANDOM_EVENTS } from "../src/data/events.js";
import { MISSIONS } from "../src/data/missions.js";
import { TEAMS, THRESHOLDS_2024_25 } from "../src/data/teams.js";

const errors = [];

const ALLOWED_RULE_CHECK_TYPES = new Set([
  "requires_exception",
  "blocked_if_second_apron",
  "requires_not_second_apron",
  "requires_roster_slots",
  "blocked_if_frozen_pick",
  "requires_not_second_apron_for_sign_and_trade",
  "blocked_cash_trade_if_second_apron",
  "requires_cash_trade_budget"
]);

const ALLOWED_TRANSACTION_TYPES = new Set([
  "trade",
  "sign_and_trade_incoming",
  "cash_trade",
  "trade_exception_create",
  "trade_exception_use"
]);

function fail(path, reason) {
  errors.push(`${path}: ${reason}`);
}

function isNum(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function assertNum(path, value, { min = null } = {}) {
  if (!isNum(value)) {
    fail(path, "must be a finite number");
    return;
  }
  if (min !== null && value < min) {
    fail(path, `must be >= ${min}`);
  }
}

function validateThresholds() {
  assertNum("THRESHOLDS_2024_25.salary_cap", THRESHOLDS_2024_25.salary_cap, { min: 1 });
  assertNum("THRESHOLDS_2024_25.luxury_tax_line", THRESHOLDS_2024_25.luxury_tax_line, { min: 1 });
  assertNum("THRESHOLDS_2024_25.first_apron", THRESHOLDS_2024_25.first_apron, { min: 1 });
  assertNum("THRESHOLDS_2024_25.second_apron", THRESHOLDS_2024_25.second_apron, { min: 1 });
}

function validateTeams() {
  const requiredTeams = ["warriors", "knicks"];
  for (const teamId of requiredTeams) {
    if (!TEAMS[teamId]) {
      fail(`TEAMS.${teamId}`, "missing required team");
    }
  }

  Object.entries(TEAMS).forEach(([teamId, team]) => {
    if (!team || typeof team !== "object") {
      fail(`TEAMS.${teamId}`, "must be an object");
      return;
    }

    assertNum(`TEAMS.${teamId}.payroll_total`, team.payroll_total, { min: 1 });
    assertNum(`TEAMS.${teamId}.roster_slots_open`, team.roster_slots_open, { min: 0 });
    assertNum(`TEAMS.${teamId}.performance_score`, team.performance_score, { min: 0 });
    assertNum(`TEAMS.${teamId}.flexibility_score`, team.flexibility_score, { min: 0 });
    assertNum(`TEAMS.${teamId}.current_season_year`, team.current_season_year, { min: 2024 });
    assertNum(`TEAMS.${teamId}.cash_trade_budget_remaining`, team.cash_trade_budget_remaining, { min: 0 });

    if (!Array.isArray(team.trade_exceptions)) {
      fail(`TEAMS.${teamId}.trade_exceptions`, "must be an array");
    } else {
      team.trade_exceptions.forEach((ex, idx) => {
        if (!ex?.id) fail(`TEAMS.${teamId}.trade_exceptions[${idx}].id`, "missing");
        assertNum(`TEAMS.${teamId}.trade_exceptions[${idx}].amount`, ex?.amount, { min: 0 });
        assertNum(`TEAMS.${teamId}.trade_exceptions[${idx}].expires_after_year`, ex?.expires_after_year, { min: 2024 });
      });
    }

    if (!Array.isArray(team.players) || !team.players.length) {
      fail(`TEAMS.${teamId}.players`, "must be a non-empty array");
    }
  });
}

function validateMissionOption(missionPath, option, idx) {
  const optionPath = `${missionPath}.options[${idx}]`;
  if (!option?.id) fail(`${optionPath}.id`, "missing");
  if (!option?.label) fail(`${optionPath}.label`, "missing");
  if (!option?.effects || typeof option.effects !== "object") fail(`${optionPath}.effects`, "missing object");

  const effectKeys = ["payroll_delta", "performance_delta", "flexibility_delta", "roster_slots_delta", "spend_guardrail_delta"];
  for (const key of effectKeys) {
    const value = option.effects?.[key];
    if (value !== undefined && !isNum(value)) {
      fail(`${optionPath}.effects.${key}`, "must be a number when present");
    }
  }

  const checks = option.rule_checks || [];
  if (!Array.isArray(checks)) {
    fail(`${optionPath}.rule_checks`, "must be an array");
  } else {
    checks.forEach((check, checkIdx) => {
      const checkPath = `${optionPath}.rule_checks[${checkIdx}]`;
      if (!ALLOWED_RULE_CHECK_TYPES.has(check.type)) {
        fail(`${checkPath}.type`, `unsupported type "${check.type}"`);
      }
      if (check.type === "requires_exception" && typeof check.value !== "string") {
        fail(`${checkPath}.value`, "requires_exception requires a string value");
      }
      if (check.type === "requires_roster_slots" && !isNum(check.value)) {
        fail(`${checkPath}.value`, "requires_roster_slots requires numeric value");
      }
      if (check.type === "requires_cash_trade_budget" && !isNum(check.value)) {
        fail(`${checkPath}.value`, "requires_cash_trade_budget requires numeric value");
      }
    });
  }

  if (option.transaction !== undefined) {
    if (!option.transaction || typeof option.transaction !== "object") {
      fail(`${optionPath}.transaction`, "must be an object");
      return;
    }
    if (!ALLOWED_TRANSACTION_TYPES.has(option.transaction.type)) {
      fail(`${optionPath}.transaction.type`, `unsupported type "${option.transaction.type}"`);
    }
    if (option.transaction.type === "cash_trade") {
      assertNum(`${optionPath}.transaction.cash_sent`, option.transaction.cash_sent, { min: 0 });
    }
    if (option.transaction.type === "trade_exception_use") {
      assertNum(`${optionPath}.transaction.trade_exception_use_amount`, option.transaction.trade_exception_use_amount, { min: 0 });
    }
    if (option.transaction.type === "trade_exception_create") {
      assertNum(`${optionPath}.transaction.trade_exception_create_amount`, option.transaction.trade_exception_create_amount, { min: 0 });
      assertNum(`${optionPath}.transaction.expires_after_year`, option.transaction.expires_after_year, { min: 2024 });
    }
  }
}

function validateMissions() {
  if (!Array.isArray(MISSIONS)) {
    fail("MISSIONS", "must be an array");
    return;
  }
  if (MISSIONS.length !== GAME_RULES.missionCount) {
    fail("MISSIONS.length", `must equal GAME_RULES.missionCount (${GAME_RULES.missionCount})`);
  }

  const seenIds = new Set();
  MISSIONS.forEach((mission, idx) => {
    const missionPath = `MISSIONS[${idx}]`;
    if (!isNum(mission.mission_id)) fail(`${missionPath}.mission_id`, "must be numeric");
    if (!mission.title) fail(`${missionPath}.title`, "missing");
    if (!Array.isArray(mission.options) || !mission.options.length) fail(`${missionPath}.options`, "must be a non-empty array");
    if (seenIds.has(mission.mission_id)) fail(`${missionPath}.mission_id`, "must be unique");
    seenIds.add(mission.mission_id);

    mission.options?.forEach((option, optionIdx) => validateMissionOption(missionPath, option, optionIdx));
  });
}

function validateEvents() {
  if (!Array.isArray(RANDOM_EVENTS) || !RANDOM_EVENTS.length) {
    fail("RANDOM_EVENTS", "must be a non-empty array");
    return;
  }
  RANDOM_EVENTS.forEach((eventCard, idx) => {
    const cardPath = `RANDOM_EVENTS[${idx}]`;
    if (!eventCard.id) fail(`${cardPath}.id`, "missing");
    if (!eventCard.title) fail(`${cardPath}.title`, "missing");
    if (!Array.isArray(eventCard.options) || !eventCard.options.length) {
      fail(`${cardPath}.options`, "must be non-empty array");
      return;
    }
    eventCard.options.forEach((option, optionIdx) => {
      const optionPath = `${cardPath}.options[${optionIdx}]`;
      if (!option.id) fail(`${optionPath}.id`, "missing");
      if (!option.label) fail(`${optionPath}.label`, "missing");
      if (!option.effects || typeof option.effects !== "object") fail(`${optionPath}.effects`, "missing object");
    });
  });
}

validateThresholds();
validateTeams();
validateMissions();
validateEvents();

if (errors.length) {
  console.error("Schema validation failed:");
  errors.forEach((err) => console.error(`- ${err}`));
  process.exit(1);
}

console.log("Schema check passed.");
