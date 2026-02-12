import { CLAIM_CODES_BY_TIER } from "../config/claimCodes.js";

const fmtMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function getDomRefs() {
  return {
    teamSelectWrap: document.getElementById("team-select"),
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
    modalOptions: document.getElementById("modal-options"),
    modalClose: document.getElementById("modal-close"),
    dataPanel: document.getElementById("data-panel"),
    dataPack: document.getElementById("data-pack"),
    teacherPanel: document.getElementById("teacher-panel"),
    teacherSummary: document.getElementById("teacher-summary"),
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

let priorFocusElement = null;
let focusTrapHandler = null;

function getFocusableElements(container) {
  return [...container.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
}

export function openChoiceModal(dom, title, brief, options, onChoice, feedback = "") {
  priorFocusElement = document.activeElement;

  dom.modalTitle.textContent = title;
  dom.modalBrief.textContent = brief;
  dom.modalFeedback.textContent = feedback;
  dom.modalOptions.innerHTML = "";

  options.forEach((option) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = option.label;
    btn.addEventListener("click", () => onChoice(option));
    dom.modalOptions.appendChild(btn);
  });

  dom.missionModal.classList.remove("hidden");
  dom.missionModal.setAttribute("role", "dialog");
  dom.missionModal.setAttribute("aria-modal", "true");

  requestAnimationFrame(() => {
    const firstFocusable = getFocusableElements(dom.missionModal.querySelector(".modal-card"))[0];
    if (firstFocusable) firstFocusable.focus();
  });

  if (focusTrapHandler) {
    document.removeEventListener("keydown", focusTrapHandler);
  }

  focusTrapHandler = (e) => {
    if (dom.missionModal.classList.contains("hidden")) return;

    if (e.key === "Escape") {
      if (!dom.modalClose.disabled) {
        e.preventDefault();
        dom.modalClose.click();
      }
      return;
    }

    if (e.key === "Tab") {
      const card = dom.missionModal.querySelector(".modal-card");
      const focusable = getFocusableElements(card);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };
  document.addEventListener("keydown", focusTrapHandler);
}

export function closeModal(dom) {
  dom.missionModal.classList.add("hidden");

  if (focusTrapHandler) {
    document.removeEventListener("keydown", focusTrapHandler);
    focusTrapHandler = null;
  }

  if (priorFocusElement && typeof priorFocusElement.focus === "function") {
    priorFocusElement.focus();
    priorFocusElement = null;
  }
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

export function bindTeacherPanel(dom, onResetAttempt) {
  dom.teacherToggle.addEventListener("click", () => {
    dom.teacherPanel.classList.toggle("hidden");
  });

  dom.resetAttempt.addEventListener("click", () => {
    if (onResetAttempt) onResetAttempt();
  });

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
  const claimLegend = [
    `Tier 1 CLEAR: ${CLAIM_CODES_BY_TIER.TIER_1_CLEAR}`,
    `Tier 2 STRONG: ${CLAIM_CODES_BY_TIER.TIER_2_STRONG}`,
    `Tier 3 ELITE: ${CLAIM_CODES_BY_TIER.TIER_3_ELITE}`
  ].join(" | ");

  const participantLine = state.participants?.length
    ? state.participants.map((name, idx) => `P${idx + 1}:${name}`).join(", ")
    : "Not set";
  const perfLine = result.perf_stats ? `FPS:${result.perf_stats.fps} (min ${result.perf_stats.minFps})` : "FPS:Not captured";

  const downgrades = result.perf_stats?.downgradeLog || [];
  const downgradeLine = downgrades.length
    ? downgrades.map((d) => `${d.from}->${d.to} @FPS${d.fps} (${new Date(d.timestamp).toLocaleTimeString()})`).join(" || ")
    : "None";

  const ownershipLine = state.mission_ownership
    ? Object.entries(state.mission_ownership).map(([m, o]) => `M${m}:${o}`).join(", ")
    : "N/A";

  dom.teacherSummary.textContent = [
    `Team: ${state.team_name}`,
    `Mode: ${state.run_mode}`,
    `Participants: ${participantLine}`,
    `Ownership: ${ownershipLine}`,
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
    `Quality Downgrades: ${downgradeLine}`,
    `Legal Log: ${state.legal_log.length ? state.legal_log.join(" || ") : "None"}`,
    `Tier Codes: ${claimLegend}`
  ].join("\n");
}

export function setInteractionHint(dom, text, visible) {
  dom.interactionHint.textContent = text;
  dom.interactionHint.classList.toggle("hidden", !visible);
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

  if (mode === "pairs") {
    const p1 = dom.playerOne.value.trim();
    const p2 = dom.playerTwo.value.trim();
    if (p1) participants.push(p1);
    if (p2) participants.push(p2);
  }

  return { mode, participants };
}

let qualityNoticeTimer = null;

export function showQualityNotice(dom, entry) {
  if (!dom.qualityNotice) return;
  const time = new Date(entry.timestamp).toLocaleTimeString();
  dom.qualityNotice.textContent = `Quality adjusted: ${entry.from} \u2192 ${entry.to} (FPS: ${entry.fps}) at ${time}`;
  dom.qualityNotice.classList.remove("hidden", "fade-out");
  clearTimeout(qualityNoticeTimer);
  qualityNoticeTimer = setTimeout(() => {
    dom.qualityNotice.classList.add("fade-out");
    setTimeout(() => dom.qualityNotice.classList.add("hidden"), 500);
  }, 4000);
}

export function setStartFeedback(dom, message = "", type = "info") {
  const hasMessage = Boolean(message);
  dom.startFeedback.textContent = message;
  dom.startFeedback.classList.toggle("hidden", !hasMessage);
  dom.startFeedback.classList.remove("good", "bad");
  if (type === "good") dom.startFeedback.classList.add("good");
  if (type === "bad") dom.startFeedback.classList.add("bad");
}

