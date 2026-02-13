export const CLASS_PROFILES = {
  default: {
    id: "default",
    label: "Default Class",
    scenario_id: "default"
  },
  "period-1": {
    id: "period-1",
    label: "Period 1",
    scenario_id: "period-1"
  },
  "period-2": {
    id: "period-2",
    label: "Period 2",
    scenario_id: "period-2"
  }
};

export function listClassProfiles() {
  return Object.values(CLASS_PROFILES);
}

export function getClassProfile(classProfileId = "default") {
  return CLASS_PROFILES[classProfileId] || CLASS_PROFILES.default;
}
