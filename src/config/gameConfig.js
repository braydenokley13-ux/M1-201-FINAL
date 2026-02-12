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

// # TODO(CONFIG-001): Add per-class profile loading (teacher chooses defaults once).
