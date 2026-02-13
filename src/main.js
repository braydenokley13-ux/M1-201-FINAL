import { createWorld } from "./3d/world.js";
import {
  applyEventOption,
  applyMissionOption,
  createInitialState,
  finishRun,
  listMissions,
  maybeGetEvent
} from "./engine/game.js";
import {
  canStartAttemptSecure,
  clearAttemptLockSecure,
  getAttemptAuditLogSecure,
  getAttemptLockPolicySecure,
  setAttemptLockPolicySecure,
  setAttemptLockSecure
} from "./engine/attemptLock.js";
import { GAME_RULES } from "./config/gameConfig.js";
import { getClassProfile } from "./config/classProfiles.js";
import { resetClaimCodeMapForClass, saveClaimCodeMapForClass } from "./config/claimCodes.js";
import { TEAMS } from "./data/teams.js";
import {
  bindRunSetup,
  bindTeacherPanel,
  collectRunSetup,
  closeModal,
  getDomRefs,
  initClassProfileSelects,
  openChoiceModal,
  renderClaimCodeEditor,
  renderAttemptAudit,
  renderDataPack,
  renderHud,
  renderResults,
  setClaimCodeFeedback,
  setInteractionHint,
  setQualityNotice,
  setStartFeedback,
  setStrictLockState,
  renderTeacherSummary,
  showRunState,
  showStartState
} from "./ui/dom.js";

const dom = getDomRefs();
let strictLockEnabled = GAME_RULES.enforceSingleAttemptLock;
let startPending = false;
const DEFAULT_CLASS_PROFILE_ID = "default";

initClassProfileSelects(dom, DEFAULT_CLASS_PROFILE_ID);
renderClaimCodeEditor(dom, DEFAULT_CLASS_PROFILE_ID);

showStartState(dom);
bindTeacherPanel(dom, {
  initialStrictLockEnabled: strictLockEnabled,
  onResetAttempt: async () => {
    const teamId = dom.team.value;
    const classProfileId = dom.classProfile?.value || DEFAULT_CLASS_PROFILE_ID;
    try {
      const reset = await clearAttemptLockSecure(teamId, {
        actor: "teacher",
        note: "Manual reset from teacher panel.",
        classProfileId
      }, classProfileId);
      if (reset.hadLock) {
        setStartFeedback(dom, `Attempt lock cleared for ${TEAMS[teamId].name} (${classProfileId}).`, "good");
      } else {
        setStartFeedback(dom, `No lock existed for ${TEAMS[teamId].name} (${classProfileId}).`, "bad");
      }
      await refreshAttemptAudit(teamId, classProfileId);
    } catch (error) {
      setStartFeedback(
        dom,
        `Could not reset attempt lock. ${error instanceof Error ? error.message : "Unknown error."}`,
        "bad"
      );
    }
  },
  onStrictLockToggle: async (enabled) => {
    const classProfileId = dom.classProfile?.value || DEFAULT_CLASS_PROFILE_ID;
    const previous = strictLockEnabled;
    strictLockEnabled = enabled;
    setStrictLockState(dom, enabled, `Teacher/${classProfileId}`);
    try {
      await setAttemptLockPolicySecure(enabled, {
        actor: "teacher",
        teamId: "global",
        classProfileId,
        note: `Teacher set strict one-attempt lock ${enabled ? "ON" : "OFF"}.`
      }, classProfileId);
      setStartFeedback(
        dom,
        `Strict lock is now ${enabled ? "ON" : "OFF"} for ${classProfileId}.`,
        enabled ? "good" : "bad"
      );
      await refreshAttemptAudit(dom.team.value, classProfileId);
    } catch (error) {
      strictLockEnabled = previous;
      setStrictLockState(dom, previous, "Reverted");
      setStartFeedback(
        dom,
        `Strict lock update failed. ${error instanceof Error ? error.message : "Unknown error."}`,
        "bad"
      );
    }
  },
  onTeacherClassChange: async (classProfileId) => {
    const profile = getClassProfile(classProfileId);
    dom.classProfile.value = profile.id;
    renderClaimCodeEditor(dom, profile.id);
    setClaimCodeFeedback(dom, "", "info");
    await hydrateServerAttemptLockState(profile.id);
  },
  onSaveClaimCodes: (nextCodes) => {
    const classProfileId = dom.teacherClassProfile?.value || DEFAULT_CLASS_PROFILE_ID;
    saveClaimCodeMapForClass(classProfileId, nextCodes);
    renderClaimCodeEditor(dom, classProfileId);
    setClaimCodeFeedback(dom, `Saved claim code overrides for ${classProfileId}.`, "good");
  },
  onResetClaimCodes: () => {
    const classProfileId = dom.teacherClassProfile?.value || DEFAULT_CLASS_PROFILE_ID;
    resetClaimCodeMapForClass(classProfileId);
    renderClaimCodeEditor(dom, classProfileId);
    setClaimCodeFeedback(dom, `Reset claim code overrides for ${classProfileId}.`, "good");
  }
});
bindRunSetup(dom);

let world = null;
let runState = null;
let missions = [];
let runEnded = false;
let modalLocked = false;
let hintLoopActive = false;
let qualityEvents = [];

async function refreshAttemptAudit(teamId = dom.team.value, classProfileId = dom.classProfile?.value || DEFAULT_CLASS_PROFILE_ID) {
  const team = TEAMS[teamId];
  try {
    const entries = await getAttemptAuditLogSecure(teamId, 14, classProfileId);
    renderAttemptAudit(dom, team.name, entries);
  } catch {
    renderAttemptAudit(dom, team.name, []);
  }
}

async function hydrateServerAttemptLockState(classProfileId = dom.classProfile?.value || DEFAULT_CLASS_PROFILE_ID) {
  try {
    strictLockEnabled = await getAttemptLockPolicySecure(GAME_RULES.enforceSingleAttemptLock, classProfileId);
    setStrictLockState(dom, strictLockEnabled, `Server/${classProfileId}`);
  } catch (error) {
    strictLockEnabled = GAME_RULES.enforceSingleAttemptLock;
    setStrictLockState(dom, strictLockEnabled, `Local/${classProfileId}`);
    setStartFeedback(
      dom,
      `Server lock policy unavailable, using local policy. ${error instanceof Error ? error.message : ""}`.trim(),
      "bad"
    );
  }

  await refreshAttemptAudit(dom.team.value, classProfileId);
}

function ensureWorld(qualityMode) {
  if (!world) {
    world = createWorld(document.getElementById("world"), qualityMode);
    return;
  }
  if (typeof world.setQualityMode === "function") {
    world.setQualityMode(qualityMode);
  }
}

function syncHud() {
  if (!runState) return;
  consumeWorldQualityEvents();
  const perfStats = world?.getPerfStats?.();
  if (perfStats) {
    runState.current_quality_mode = perfStats.qualityMode;
  }
  renderHud(dom, runState, missions.length);
}

function getDefaultOwnerIndex(missionId) {
  return missionId % 2 === 1 ? 0 : 1;
}

function buildMissionModalContext(missionId) {
  if (!runState || runState.run_mode !== "pairs") {
    return {};
  }

  const existing = runState.mission_ownership?.[missionId];
  return {
    pairMode: true,
    participants: runState.participants || [],
    defaultOwnerIndex: existing?.ownerIndex ?? getDefaultOwnerIndex(missionId),
    defaultOwnerNote: existing?.ownerNote || ""
  };
}

function recordMissionOwnership(mission, option, ownerMeta) {
  if (!runState || runState.run_mode !== "pairs") {
    return;
  }

  const fallbackIndex = getDefaultOwnerIndex(mission.mission_id);
  const ownerIndex = Number.isInteger(ownerMeta?.ownerIndex) ? ownerMeta.ownerIndex : fallbackIndex;
  const ownerName = ownerMeta?.ownerName || runState.participants?.[ownerIndex] || "Unassigned";

  runState.mission_ownership[mission.mission_id] = {
    missionId: mission.mission_id,
    missionTitle: mission.title,
    ownerIndex,
    ownerName,
    ownerNote: ownerMeta?.ownerNote || "",
    chosenOptionId: option.id,
    chosenOptionLabel: option.label
  };
}

function consumeWorldQualityEvents() {
  if (!world || !runState || runEnded) {
    return 0;
  }

  const events = world.consumeQualityEvents?.() || [];
  if (!events.length) {
    return 0;
  }

  for (const event of events) {
    qualityEvents.push(event);
    runState.current_quality_mode = event.to;
    const timeLabel = new Date(event.timestamp).toLocaleTimeString();
    const msg = `Auto quality shift ${event.from.toUpperCase()} -> ${event.to.toUpperCase()} at ${timeLabel} (${event.fps} FPS).`;
    setQualityNotice(dom, msg, true, "bad");
  }
  return events.length;
}

async function finishIfNeeded() {
  if (!runState || runEnded || runState.current_index < missions.length) {
    return;
  }

  consumeWorldQualityEvents();
  runEnded = true;
  const result = finishRun(runState);
  const perfStats = world?.getPerfStats?.();
  if (perfStats) {
    result.perf_stats = perfStats;
  }
  result.quality_events = [...qualityEvents];

  if (runState.strict_lock_enabled) {
    try {
      await setAttemptLockSecure(
        runState.team_id,
        {
          status: result.status,
          tier: result.tier,
          claimCode: result.claim_code
        },
        {
          actor: "system",
          note: `Run completed: ${result.status}.`,
          classProfileId: runState.class_profile_id
        },
        runState.class_profile_id
      );
      await refreshAttemptAudit(runState.team_id, runState.class_profile_id);
    } catch (error) {
      setStartFeedback(
        dom,
        `Run ended but lock save failed. ${error instanceof Error ? error.message : "Unknown error."}`,
        "bad"
      );
    }
  }

  renderResults(dom, result);
  renderTeacherSummary(dom, runState, result);
}

function maybeHandleRandomEvent() {
  const eventCard = maybeGetEvent(runState);
  if (!eventCard) {
    return;
  }

  modalLocked = true;
  dom.modalClose.disabled = true;
  dom.modalClose.textContent = "Event Choice Required";
  openChoiceModal(
    dom,
    `Random Event: ${eventCard.title}`,
    eventCard.briefing,
    eventCard.options,
    (option) => {
      applyEventOption(runState, option);
      syncHud();
      closeModal(dom);
      modalLocked = false;
      dom.modalClose.disabled = false;
      dom.modalClose.textContent = "Close";
    },
    "Random event checkpoint. Choose one option."
  );
}

function launchMissionModal() {
  if (!runState || runEnded || modalLocked) {
    return;
  }

  const activeMissionIndex = runState.current_index;
  const mission = missions[activeMissionIndex];
  if (!mission) {
    void finishIfNeeded();
    return;
  }

  if (!world.isNearMission(activeMissionIndex)) {
    return;
  }

  modalLocked = true;

  const openMissionDecision = (feedbackMessage, contextOverride = null) => {
    const modalContext = buildMissionModalContext(mission.mission_id);
    if (modalContext.pairMode && contextOverride) {
      modalContext.defaultOwnerIndex = Number.isInteger(contextOverride.ownerIndex)
        ? contextOverride.ownerIndex
        : modalContext.defaultOwnerIndex;
      modalContext.defaultOwnerNote = contextOverride.ownerNote || modalContext.defaultOwnerNote;
    }

    openChoiceModal(
      dom,
      mission.title,
      mission.briefing_text,
      mission.options,
      async (option, ownerMeta) => {
        const result = applyMissionOption(runState, mission, option);
        if (!result.ok) {
          syncHud();
          openMissionDecision(`Illegal move blocked: ${result.reason}`, ownerMeta);
          return;
        }

        recordMissionOwnership(mission, option, ownerMeta);
        closeModal(dom);
        world.setActiveMission(runState.current_index);
        syncHud();
        modalLocked = false;
        maybeHandleRandomEvent();
        await finishIfNeeded();
      },
      feedbackMessage,
      modalContext
    );
  };

  openMissionDecision("Exam mode: no hints. Make the best legal decision.");
}

async function startRun() {
  if (startPending) {
    return;
  }

  const teamId = dom.team.value;
  const qualityMode = dom.quality.value;
  const runSetup = collectRunSetup(dom);
  const classProfile = getClassProfile(runSetup.class_profile_id || DEFAULT_CLASS_PROFILE_ID);
  const classProfileId = classProfile.id;
  const lockEnabledForRun = strictLockEnabled;

  if (runSetup.mode === "pairs" && runSetup.participants.length < 2) {
    setStartFeedback(dom, "Pairs mode needs both names before starting.", "bad");
    return;
  }

  startPending = true;
  dom.start.disabled = true;

  try {
    const lockState = await canStartAttemptSecure(teamId, lockEnabledForRun, classProfileId);
    if (!lockState.ok) {
      const createdAt = lockState.lock?.createdAt ? new Date(lockState.lock.createdAt).toLocaleString() : "unknown time";
      const codePart = lockState.lock?.claimCode ? ` Claim code: ${lockState.lock.claimCode}.` : "";
      setStartFeedback(
        dom,
        `Attempt already used for ${TEAMS[teamId].name} (${classProfileId}) on this browser (${createdAt}).${codePart} Teacher reset required.`,
        "bad"
      );
      await refreshAttemptAudit(teamId, classProfileId);
      dom.start.disabled = false;
      return;
    }

    setStartFeedback(dom, "", "info");

    ensureWorld(qualityMode);

    runState = createInitialState(teamId, {
      ...runSetup,
      class_profile_id: classProfileId,
      scenario_id: classProfile.scenario_id,
      strictLockEnabled: lockEnabledForRun
    });
    missions = listMissions();
    runEnded = false;
    modalLocked = false;
    qualityEvents = [];

    world.setActiveMission(0);

    showRunState(dom);
    renderDataPack(dom, TEAMS[teamId]);
    const perfStats = world?.getPerfStats?.();
    runState.current_quality_mode = perfStats?.qualityMode || qualityMode;
    setQualityNotice(dom, "", false);
    syncHud();
    setStartFeedback(
      dom,
      `Run started for ${classProfileId}. Strict lock for this run: ${lockEnabledForRun ? "ON" : "OFF"}. Walk to Mission 1 and press E.`,
      lockEnabledForRun ? "good" : "info"
    );

    dom.start.disabled = true;
    dom.classProfile.disabled = true;
    dom.team.disabled = true;
    dom.runMode.disabled = true;
    dom.playerOne.disabled = true;
    dom.playerTwo.disabled = true;
    dom.quality.disabled = true;

    if (!hintLoopActive) {
      hintLoopActive = true;
      updateInteractionHint();
    }
  } catch (error) {
    setStartFeedback(
      dom,
      `Could not start run. ${error instanceof Error ? error.message : "Unknown error."}`,
      "bad"
    );
    dom.start.disabled = false;
  } finally {
    startPending = false;
  }
}

dom.start.addEventListener("click", () => {
  void startRun();
});
dom.team.addEventListener("change", () => {
  void refreshAttemptAudit(dom.team.value, dom.classProfile?.value || DEFAULT_CLASS_PROFILE_ID);
});
dom.quality.addEventListener("change", () => {
  try {
    ensureWorld(dom.quality.value);
  } catch (error) {
    setStartFeedback(
      dom,
      `3D preview could not update quality. ${error instanceof Error ? error.message : "Unknown error."}`,
      "bad"
    );
  }
});
dom.classProfile.addEventListener("change", () => {
  const selected = dom.classProfile.value || DEFAULT_CLASS_PROFILE_ID;
  dom.teacherClassProfile.value = selected;
  renderClaimCodeEditor(dom, selected);
  void hydrateServerAttemptLockState(selected);
});
setStrictLockState(dom, strictLockEnabled, "Loaded");
void hydrateServerAttemptLockState(DEFAULT_CLASS_PROFILE_ID);
try {
  ensureWorld(dom.quality.value);
} catch (error) {
  setStartFeedback(
    dom,
    `3D preview could not load. ${error instanceof Error ? error.message : "Unknown error."}`,
    "bad"
  );
}
dom.modalClose.addEventListener("click", () => {
  if (dom.modalClose.disabled) {
    return;
  }
  closeModal(dom);
  modalLocked = false;
});

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "e") {
    launchMissionModal();
  }
});

function updateInteractionHint() {
  if (!hintLoopActive) return;
  const newQualityEvents = consumeWorldQualityEvents();
  if (newQualityEvents > 0 && runState) {
    renderHud(dom, runState, missions.length);
  }

  if (!world || !runState || runEnded || modalLocked) {
    setInteractionHint(dom, "Press E to enter mission zone", false);
    requestAnimationFrame(updateInteractionHint);
    return;
  }

  const nearMission = world.isNearMission(runState.current_index);
  const missionNumber = runState.current_index + 1;
  setInteractionHint(
    dom,
    nearMission ? `Mission ${missionNumber} ready. Press E.` : `Walk to glowing Mission ${missionNumber} zone.`,
    true
  );
  requestAnimationFrame(updateInteractionHint);
}
