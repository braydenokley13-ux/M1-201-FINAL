import { createWorld } from "./3d/world.js";
import {
  applyEventOption,
  applyMissionOption,
  createInitialState,
  finishRun,
  listMissions,
  maybeGetEvent
} from "./engine/game.js";
import { canStartAttempt, clearAttemptLock, setAttemptLock } from "./engine/attemptLock.js";
import { GAME_RULES } from "./config/gameConfig.js";
import { TEAMS } from "./data/teams.js";
import {
  bindRunSetup,
  bindTeacherPanel,
  collectRunSetup,
  closeModal,
  getDomRefs,
  openChoiceModal,
  renderDataPack,
  renderHud,
  renderResults,
  setInteractionHint,
  setStartFeedback,
  renderTeacherSummary,
  showQualityNotice,
  showRunState,
  showStartState
} from "./ui/dom.js";

const dom = getDomRefs();
showStartState(dom);
bindTeacherPanel(dom, () => {
  const teamId = dom.team.value;
  clearAttemptLock(teamId);
  setStartFeedback(dom, `Attempt lock cleared for ${TEAMS[teamId].name}.`, "good");
});
bindRunSetup(dom);

let world = null;
let runState = null;
let missions = [];
let runEnded = false;
let modalLocked = false;
let hintLoopActive = false;
let lastDowngradeCount = 0;

function ensureWorld(qualityMode) {
  if (world) return;
  world = createWorld(document.getElementById("world"), qualityMode);
}

function syncHud() {
  if (!runState) return;
  renderHud(dom, runState, missions.length);
}

function finishIfNeeded() {
  if (!runState || runEnded || runState.current_index < missions.length) {
    return;
  }

  runEnded = true;
  const result = finishRun(runState);
  const perfStats = world?.getPerfStats?.();
  if (perfStats) {
    result.perf_stats = perfStats;
  }

  if (GAME_RULES.enforceSingleAttemptLock) {
    setAttemptLock(runState.team_id, {
      status: result.status,
      tier: result.tier,
      claimCode: result.claim_code
    });
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
    finishIfNeeded();
    return;
  }

  if (!world.isNearMission(activeMissionIndex)) {
    return;
  }

  modalLocked = true;
  openChoiceModal(
    dom,
    mission.title,
    mission.briefing_text,
    mission.options,
    (option) => {
      const result = applyMissionOption(runState, mission, option);
      if (!result.ok) {
        syncHud();
        openChoiceModal(
          dom,
          mission.title,
          mission.briefing_text,
          mission.options,
          (nextOption) => {
            const retryResult = applyMissionOption(runState, mission, nextOption);
            if (retryResult.ok) {
              closeModal(dom);
              world.setActiveMission(runState.current_index);
              syncHud();
              modalLocked = false;
              maybeHandleRandomEvent();
              finishIfNeeded();
            } else {
              syncHud();
            }
          },
          `Illegal move blocked: ${result.reason}`
        );
        return;
      }

      closeModal(dom);
      world.setActiveMission(runState.current_index);
      syncHud();
      modalLocked = false;
      maybeHandleRandomEvent();
      finishIfNeeded();
    },
    "Exam mode: no hints. Make the best legal decision."
  );
}

function startRun() {
  const teamId = dom.team.value;
  const qualityMode = dom.quality.value;
  const runSetup = collectRunSetup(dom);

  if (runSetup.mode === "pairs" && runSetup.participants.length < 2) {
    setStartFeedback(dom, "Pairs mode needs both names before starting.", "bad");
    return;
  }

  const lockState = canStartAttempt(teamId, GAME_RULES.enforceSingleAttemptLock);
  if (!lockState.ok) {
    setStartFeedback(
      dom,
      `Attempt already used for ${TEAMS[teamId].name} on this browser. Teacher reset required.`,
      "bad"
    );
    return;
  }

  setStartFeedback(dom, "", "info");

  ensureWorld(qualityMode);

  runState = createInitialState(teamId, runSetup);
  missions = listMissions();
  runEnded = false;
  modalLocked = false;

  world.setActiveMission(0);

  showRunState(dom);
  renderDataPack(dom, TEAMS[teamId]);
  syncHud();

  dom.start.disabled = true;
  dom.team.disabled = true;
  dom.runMode.disabled = true;
  dom.playerOne.disabled = true;
  dom.playerTwo.disabled = true;
  dom.quality.disabled = true;

  if (!hintLoopActive) {
    hintLoopActive = true;
    updateInteractionHint();
  }
}

dom.start.addEventListener("click", startRun);
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

function checkQualityDowngrades() {
  if (!world) return;
  const log = world.getDowngradeLog();
  if (log.length > lastDowngradeCount) {
    const newest = log[log.length - 1];
    showQualityNotice(dom, newest);
    lastDowngradeCount = log.length;
  }
}

function updateInteractionHint() {
  if (!hintLoopActive) return;

  checkQualityDowngrades();

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

// # TODO(APP-001): Expand pair-mode names into in-run role ownership notes per mission.
// # TODO(APP-002): Harden one-attempt lock flow with admin reset workflow and audit trail.
