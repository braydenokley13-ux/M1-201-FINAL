export const QUALITY_PRESETS = {
  high: {
    pixelRatioMax: 2,
    shadowMapSize: 2048,
    cityDensity: 90,
    missionBloom: true,
    fogDensity: 0.016,
    shadows: true,
    downshiftThresholdFps: 42
  },
  balanced: {
    pixelRatioMax: 1.5,
    shadowMapSize: 1024,
    cityDensity: 56,
    missionBloom: false,
    fogDensity: 0.018,
    shadows: true,
    downshiftThresholdFps: 30
  },
  chromebook: {
    pixelRatioMax: 1.2,
    shadowMapSize: 512,
    cityDensity: 34,
    missionBloom: false,
    fogDensity: 0.021,
    shadows: false,
    downshiftThresholdFps: 0
  }
};

export const WORLD_ADAPTIVE_QUALITY = {
  sampleWindowMs: 1000,
  warmupMs: 4500,
  sustainMs: 6000,
  cooldownMs: 12000
};

export const GAME_RULES = {
  missionCount: 8,
  eventTriggerMissions: [5, 8],
  illegalMovePenaltyPoints: 15,
  enforceSingleAttemptLock: false
};

export const SCENARIO_RULESETS = {
  default: {
    id: "default",
    label: "Baseline Exam",
    spend_guardrail_by_team: {
      warriors: 435000000,
      knicks: 365000000
    },
    repeater_over_tax_guardrail_cap_by_team: {
      warriors: 433931000,
      knicks: 398000000
    }
  },
  "period-1": {
    id: "period-1",
    label: "Period 1",
    spend_guardrail_by_team: {
      warriors: 432000000,
      knicks: 362000000
    },
    repeater_over_tax_guardrail_cap_by_team: {
      warriors: 431000000,
      knicks: 395000000
    }
  },
  "period-2": {
    id: "period-2",
    label: "Period 2",
    spend_guardrail_by_team: {
      warriors: 438000000,
      knicks: 368000000
    },
    repeater_over_tax_guardrail_cap_by_team: {
      warriors: 436000000,
      knicks: 401000000
    }
  }
};

export function getScenarioRules(scenarioId = "default") {
  return SCENARIO_RULESETS[scenarioId] || SCENARIO_RULESETS.default;
}
