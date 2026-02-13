import { getClaimCodeMapForClass } from "../config/claimCodes.js";
import { getClassProfile, listClassProfiles } from "../config/classProfiles.js";

const fmtMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
let modalFocusCleanup = null;
let lastFocusedElement = null;

function listFocusable(container) {
  return Array.from(
    container.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")
  ).filter((node) => !node.disabled && !node.hasAttribute("aria-hidden"));
}

function trapModalFocus(dom) {
  if (modalFocusCleanup) {
    modalFocusCleanup();
  }

  const modalCard = dom.missionModal.querySelector(".modal-card");
  const onKeyDown = (event) => {
    if (dom.missionModal.classList.contains("hidden")) {
      return;
    }

    if (event.key === "Escape") {
      if (dom.modalClose.disabled) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      dom.modalClose.click();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusables = listFocusable(modalCard);
    if (!focusables.length) {
      event.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !modalCard.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !modalCard.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  };

  document.addEventListener("keydown", onKeyDown);
  modalFocusCleanup = () => {
    document.removeEventListener("keydown", onKeyDown);
    modalFocusCleanup = null;
  };
}

function renderOwnerContext(dom, modalContext) {
  const ownerState = {
    index: Number.isInteger(modalContext.defaultOwnerIndex) ? modalContext.defaultOwnerIndex : 0,
    note: modalContext.defaultOwnerNote || ""
  };

  const participants = modalContext.participants || [];
  if (!participants.length) {
    return ownerState;
  }

  const wrap = document.createElement("div");
  wrap.className = "owner-context";

  const ownerLabel = document.createElement("label");
  ownerLabel.textContent = "Mission Owner (Pairs):";
  ownerLabel.setAttribute("for", "owner-select");
  wrap.appendChild(ownerLabel);

  const ownerSelect = document.createElement("select");
  ownerSelect.id = "owner-select";
  participants.forEach((name, idx) => {
    const option = document.createElement("option");
    option.value = String(idx);
    option.textContent = `Player ${idx + 1}: ${name}`;
    ownerSelect.appendChild(option);
  });
  ownerSelect.value = String(Math.max(0, Math.min(ownerState.index, participants.length - 1)));
  ownerState.index = Number(ownerSelect.value);
  ownerSelect.addEventListener("change", () => {
    ownerState.index = Number(ownerSelect.value);
  });
  wrap.appendChild(ownerSelect);

  const noteLabel = document.createElement("label");
  noteLabel.textContent = "Owner Note (optional):";
  noteLabel.setAttribute("for", "owner-note");
  wrap.appendChild(noteLabel);

  const noteInput = document.createElement("textarea");
  noteInput.id = "owner-note";
  noteInput.maxLength = 180;
  noteInput.placeholder = "What did this owner focus on for this mission?";
  noteInput.value = ownerState.note;
  noteInput.addEventListener("input", () => {
    ownerState.note = noteInput.value.trim();
  });
  wrap.appendChild(noteInput);

  dom.modalContext.appendChild(wrap);
  return ownerState;
}

export function getDomRefs() {
  return {
    teamSelectWrap: document.getElementById("team-select"),
    classProfile: document.getElementById("class-profile"),
    team: document.getElementById("team"),
    runMode: document.getElementById("run-mode"),
    pairFields: document.getElementById("pair-fields"),
    playerOne: document.getElementById("player-one"),
    playerTwo: document.getElementById("player-two"),
    startFeedback: document.getElementById("start-feedback"),
    quality: document.getElementById("quality"),
    start: document.getElementById("start-run"),
    status: document.getElementById("status"),
    missionProgress: document.getElementById("mission-progress"),
    modeState: document.getElementById("mode-state"),
    qualityState: document.getElementById("quality-state"),
    legalState: document.getElementById("legal-state"),
    taxState: document.getElementById("tax-state"),
    repeaterState: document.getElementById("repeater-state"),
    apronState: document.getElementById("apron-state"),
    spendTotal: document.getElementById("spend-total"),
    perfScore: document.getElementById("perf-score"),
    flexScore: document.getElementById("flex-score"),
    results: document.getElementById("results"),
    missionModal: document.getElementById("mission-modal"),
    modalTitle: document.getElementById("modal-title"),
    modalBrief: document.getElementById("modal-brief"),
    modalFeedback: document.getElementById("modal-feedback"),
    modalContext: document.getElementById("modal-context"),
    modalOptions: document.getElementById("modal-options"),
    modalClose: document.getElementById("modal-close"),
    dataPanel: document.getElementById("data-panel"),
    dataPack: document.getElementById("data-pack"),
    teacherPanel: document.getElementById("teacher-panel"),
    strictLockToggle: document.getElementById("strict-lock-toggle"),
    strictLockState: document.getElementById("strict-lock-state"),
    teacherClassProfile: document.getElementById("teacher-class-profile"),
    codeTier1: document.getElementById("code-tier-1"),
    codeTier2: document.getElementById("code-tier-2"),
    codeTier3: document.getElementById("code-tier-3"),
    saveClaimCodes: document.getElementById("save-claim-codes"),
    resetClaimCodes: document.getElementById("reset-claim-codes"),
    claimCodeFeedback: document.getElementById("claim-code-feedback"),
    teacherSummary: document.getElementById("teacher-summary"),
    teacherAudit: document.getElementById("teacher-audit"),
    teacherToggle: document.getElementById("teacher-toggle"),
    resetAttempt: document.getElementById("reset-attempt"),
    copySummary: document.getElementById("copy-summary"),
    interactionHint: document.getElementById("interaction-hint"),
    qualityNotice: document.getElementById("quality-notice")
  };
}

export function renderHud(dom, state, missionCount) {
  dom.missionProgress.textContent = `${state.current_index} / ${missionCount}`;
  dom.modeState.textContent = state.run_mode;
  dom.qualityState.textContent = state.current_quality_mode || "high";
  dom.legalState.textContent = state.legal_state ? "YES" : "NO";
  dom.legalState.className = state.legal_state ? "good" : "bad";
  dom.taxState.textContent = state.tax_status;
  dom.repeaterState.textContent = state.repeater_status;
  dom.apronState.textContent = state.apron_status;
  dom.spendTotal.textContent = fmtMoney.format(state.total_spend || state.payroll_total);
  dom.perfScore.textContent = String(state.performance_score);
  dom.flexScore.textContent = String(state.flexibility_score);
}

export function renderDataPack(dom, team) {
  const rows = team.players
    .map(
      (p) => `<tr>
<td>${team.name}</td>
<td>${p.player}</td>
<td>${p.contract_type}</td>
<td>${fmtMoney.format(p.salary_2024_25)}</td>
<td>${p.rights_tag}</td>
<td>${p.tax_apron_relevance}</td>
<td><a href="${p.source_link}" target="_blank" rel="noreferrer">Source</a></td>
<td>${team.verified_date}</td>
<td>${p.assumption_flag}</td>
</tr>`
    )
    .join("");

  dom.dataPack.innerHTML = `
    <p class="tiny"><strong>Team Source:</strong> <a href="${team.source}" target="_blank" rel="noreferrer">${team.source}</a></p>
    <table>
      <thead>
        <tr>
          <th>Team</th>
          <th>Player</th>
          <th>Contract</th>
          <th>2024-25 Cap Hit</th>
          <th>Rights/Exception</th>
          <th>Tax/Apron Relevance</th>
          <th>Source</th>
          <th>Verified Date</th>
          <th>Assumption</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export function openChoiceModal(dom, title, brief, options, onChoice, feedback = "", modalContext = {}) {
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dom.modalTitle.textContent = title;
  dom.modalBrief.textContent = brief;
  dom.modalFeedback.textContent = feedback;
  dom.modalContext.innerHTML = "";
  dom.modalOptions.innerHTML = "";
  const ownerState = modalContext.pairMode ? renderOwnerContext(dom, modalContext) : null;

  options.forEach((option) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = option.label;
    btn.addEventListener("click", () => {
      const ownerMeta = ownerState
        ? {
            ownerIndex: ownerState.index,
            ownerName: (modalContext.participants || [])[ownerState.index] || "",
            ownerNote: ownerState.note || ""
          }
        : null;
      onChoice(option, ownerMeta);
    });
    dom.modalOptions.appendChild(btn);
  });

  dom.missionModal.classList.remove("hidden");
  trapModalFocus(dom);
  const modalCard = dom.missionModal.querySelector(".modal-card");
  const focusables = listFocusable(modalCard);
  if (focusables.length) {
    focusables[0].focus();
  }
}

export function closeModal(dom) {
  dom.missionModal.classList.add("hidden");
  dom.modalContext.innerHTML = "";
  if (modalFocusCleanup) {
    modalFocusCleanup();
  }
  if (lastFocusedElement && document.contains(lastFocusedElement)) {
    lastFocusedElement.focus();
  }
  lastFocusedElement = null;
}

export function showStartState(dom) {
  dom.teamSelectWrap.classList.remove("hidden");
  dom.status.classList.add("hidden");
  dom.results.classList.add("hidden");
  dom.dataPanel.classList.add("hidden");
  dom.startFeedback.classList.add("hidden");
}

export function showRunState(dom) {
  dom.teamSelectWrap.classList.add("hidden");
  dom.status.classList.remove("hidden");
  dom.dataPanel.classList.remove("hidden");
  dom.results.classList.add("hidden");
}

export function renderResults(dom, result) {
  const lines = [
    `<p><strong>Status:</strong> <span class="${result.status === "CLEARED" ? "good" : "bad"}">${result.status}</span></p>`,
    `<p><strong>Tier:</strong> ${result.tier.replaceAll("_", " ")}</p>`,
    `<p><strong>Weighted Score:</strong> ${result.weighted_score}</p>`,
    `<p><strong>Legal Pass:</strong> ${result.legal_pass ? "YES" : "NO"}</p>`,
    `<p><strong>Performance Pass:</strong> ${result.performance_pass ? "YES" : "NO"}</p>`,
    `<p><strong>Spend Pass:</strong> ${result.spend_pass ? "YES" : "NO"}</p>`,
    `<p><strong>Flexibility Pass:</strong> ${result.flexibility_pass ? "YES" : "NO"}</p>`,
    `<p><strong>XP Awarded:</strong> ${result.xp_awarded}</p>`,
    `<p><strong>Claim Code:</strong> ${result.claim_code || "No code (did not clear all checks)."}</p>`
  ];

  dom.results.innerHTML = lines.join("\n");
  dom.results.classList.remove("hidden");
}

function fillClassProfileSelect(selectNode, selectedId = "default") {
  if (!selectNode) return;
  const classes = listClassProfiles();
  selectNode.innerHTML = classes
    .map((profile) => `<option value="${profile.id}">${profile.label}</option>`)
    .join("");
  selectNode.value = getClassProfile(selectedId).id;
}

export function initClassProfileSelects(dom, selectedId = "default") {
  fillClassProfileSelect(dom.classProfile, selectedId);
  fillClassProfileSelect(dom.teacherClassProfile, selectedId);
}

export function renderClaimCodeEditor(dom, classProfileId = "default") {
  const profile = getClassProfile(classProfileId);
  const map = getClaimCodeMapForClass(profile.id);
  if (dom.teacherClassProfile) dom.teacherClassProfile.value = profile.id;
  if (dom.codeTier1) dom.codeTier1.value = map.TIER_1_CLEAR || "";
  if (dom.codeTier2) dom.codeTier2.value = map.TIER_2_STRONG || "";
  if (dom.codeTier3) dom.codeTier3.value = map.TIER_3_ELITE || "";
}

export function setClaimCodeFeedback(dom, message = "", type = "info") {
  const hasMessage = Boolean(message);
  dom.claimCodeFeedback.textContent = message;
  dom.claimCodeFeedback.classList.toggle("hidden", !hasMessage);
  dom.claimCodeFeedback.classList.remove("good", "bad");
  if (type === "good") dom.claimCodeFeedback.classList.add("good");
  if (type === "bad") dom.claimCodeFeedback.classList.add("bad");
}

export function bindTeacherPanel(dom, handlers = {}) {
  const {
    onResetAttempt,
    onStrictLockToggle,
    onTeacherClassChange,
    onSaveClaimCodes,
    onResetClaimCodes,
    initialStrictLockEnabled = false
  } = handlers;

  if (dom.strictLockToggle) {
    dom.strictLockToggle.checked = Boolean(initialStrictLockEnabled);
  }
  setStrictLockState(dom, Boolean(initialStrictLockEnabled), "Loaded");

  dom.teacherToggle.addEventListener("click", () => {
    dom.teacherPanel.classList.toggle("hidden");
  });

  dom.resetAttempt.addEventListener("click", () => {
    if (onResetAttempt) onResetAttempt();
  });

  if (dom.strictLockToggle) {
    dom.strictLockToggle.addEventListener("change", () => {
      const enabled = dom.strictLockToggle.checked;
      if (onStrictLockToggle) onStrictLockToggle(enabled);
    });
  }

  if (dom.teacherClassProfile) {
    dom.teacherClassProfile.addEventListener("change", () => {
      if (onTeacherClassChange) onTeacherClassChange(dom.teacherClassProfile.value);
    });
  }

  if (dom.saveClaimCodes) {
    dom.saveClaimCodes.addEventListener("click", () => {
      if (!onSaveClaimCodes) return;
      onSaveClaimCodes({
        TIER_1_CLEAR: dom.codeTier1.value.trim(),
        TIER_2_STRONG: dom.codeTier2.value.trim(),
        TIER_3_ELITE: dom.codeTier3.value.trim()
      });
    });
  }

  if (dom.resetClaimCodes) {
    dom.resetClaimCodes.addEventListener("click", () => {
      if (onResetClaimCodes) onResetClaimCodes();
    });
  }

  dom.copySummary.addEventListener("click", async () => {
    const text = dom.teacherSummary.textContent || "";
    try {
      await navigator.clipboard.writeText(text);
      dom.copySummary.textContent = "Copied";
      setTimeout(() => {
        dom.copySummary.textContent = "Copy Summary";
      }, 1200);
    } catch {
      dom.copySummary.textContent = "Copy failed";
      setTimeout(() => {
        dom.copySummary.textContent = "Copy Summary";
      }, 1200);
    }
  });
}

export function renderTeacherSummary(dom, state, result) {
  const classProfileId = result.class_profile_id || state.class_profile_id || "default";
  const classCodes = getClaimCodeMapForClass(classProfileId);
  const claimLegend = [
    `Tier 1 CLEAR: ${classCodes.TIER_1_CLEAR}`,
    `Tier 2 STRONG: ${classCodes.TIER_2_STRONG}`,
    `Tier 3 ELITE: ${classCodes.TIER_3_ELITE}`
  ].join(" | ");

  const participantLine = state.participants?.length
    ? state.participants.map((name, idx) => `P${idx + 1}:${name}`).join(", ")
    : "Not set";
  const perfLine = result.perf_stats ? `FPS:${result.perf_stats.fps} (min ${result.perf_stats.minFps})` : "FPS:Not captured";
  const ownershipEntries = Object.values(state.mission_ownership || {}).sort((a, b) => a.missionId - b.missionId);
  const ownershipLine = ownershipEntries.length
    ? ownershipEntries
        .map(
          (entry) =>
            `M${entry.missionId}:${entry.ownerName || "Unassigned"} -> ${entry.chosenOptionLabel || "n/a"}${
              entry.ownerNote ? ` [${entry.ownerNote}]` : ""
            }`
        )
        .join(" | ")
    : "None";
  const qualityEvents = result.quality_events || [];
  const qualityLine = qualityEvents.length
    ? qualityEvents
        .map((event) => {
          const ts = new Date(event.timestamp).toLocaleTimeString();
          return `[${ts}] ${event.from} -> ${event.to} @ ${event.fps}fps`;
        })
        .join(" | ")
    : "None";

  dom.teacherSummary.textContent = [
    `Team: ${state.team_name}`,
    `Class: ${classProfileId}`,
    `Mode: ${state.run_mode}`,
    `Strict Lock: ${result.strict_lock_enabled ? "ON" : "OFF"}`,
    `Participants: ${participantLine}`,
    `Mission Progress: ${state.current_index}/8`,
    `Status: ${result.status}`,
    `Tier: ${result.tier}`,
    `Score: ${result.weighted_score}`,
    `Legal: ${result.legal_pass}`,
    `Performance: ${result.performance_pass}`,
    `Spend: ${result.spend_pass}`,
    `Flexibility: ${result.flexibility_pass}`,
    `Claim Code: ${result.claim_code || "NONE"}`,
    perfLine,
    `Mission Ownership: ${ownershipLine}`,
    `Quality Events: ${qualityLine}`,
    `Legal Log: ${state.legal_log.length ? state.legal_log.join(" || ") : "None"}`,
    `Tier Codes: ${claimLegend}`
  ].join("\n");
}

export function setInteractionHint(dom, text, visible) {
  dom.interactionHint.textContent = text;
  dom.interactionHint.classList.toggle("hidden", !visible);
}

export function setQualityNotice(dom, text, visible, style = "good") {
  dom.qualityNotice.textContent = text;
  dom.qualityNotice.classList.toggle("hidden", !visible);
  dom.qualityNotice.classList.remove("good", "bad");
  if (visible) {
    dom.qualityNotice.classList.add(style === "bad" ? "bad" : "good");
  }
}

export function bindRunSetup(dom) {
  const applyMode = () => {
    const pairMode = dom.runMode.value === "pairs";
    dom.pairFields.classList.toggle("hidden", !pairMode);
    if (!pairMode) {
      dom.playerOne.value = "";
      dom.playerTwo.value = "";
    }
  };
  dom.runMode.addEventListener("change", applyMode);
  applyMode();
}

export function collectRunSetup(dom) {
  const mode = dom.runMode.value;
  const participants = [];
  const class_profile_id = dom.classProfile?.value || "default";

  if (mode === "pairs") {
    const p1 = dom.playerOne.value.trim();
    const p2 = dom.playerTwo.value.trim();
    if (p1) participants.push(p1);
    if (p2) participants.push(p2);
  }

  return { mode, participants, class_profile_id };
}

export function setStartFeedback(dom, message = "", type = "info") {
  const hasMessage = Boolean(message);
  dom.startFeedback.textContent = message;
  dom.startFeedback.classList.toggle("hidden", !hasMessage);
  dom.startFeedback.classList.remove("good", "bad");
  if (type === "good") dom.startFeedback.classList.add("good");
  if (type === "bad") dom.startFeedback.classList.add("bad");
}

export function setStrictLockState(dom, enabled, source = "Teacher") {
  if (dom.strictLockToggle && dom.strictLockToggle.checked !== enabled) {
    dom.strictLockToggle.checked = enabled;
  }

  if (dom.strictLockState) {
    const byline = source ? ` (${source})` : "";
    dom.strictLockState.textContent = `Strict lock mode: ${enabled ? "ON" : "OFF"}${byline}`;
    dom.strictLockState.classList.remove("good", "bad");
    dom.strictLockState.classList.add(enabled ? "good" : "bad");
  }
}

export function renderAttemptAudit(dom, teamName, entries) {
  if (!entries.length) {
    dom.teacherAudit.textContent = `No attempt-lock audit entries for ${teamName}.`;
    return;
  }

  dom.teacherAudit.textContent = entries
    .map((entry) => {
      const stamp = new Date(entry.timestamp).toLocaleString();
      const action = entry.action || "UNKNOWN";
      const actor = entry.actor || "system";
      const status = entry.status || "UNKNOWN";
      const tier = entry.tier || "NONE";
      const code = entry.claimCode ? ` code:${entry.claimCode}` : "";
      const note = entry.note ? ` | ${entry.note}` : "";
      return `${stamp} | ${action} | actor:${actor} | status:${status} | tier:${tier}${code}${note}`;
    })
    .join("\n");
}
