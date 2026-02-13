function resolveTradeExceptionId(state, transaction = {}) {
  if (transaction.trade_exception_id) {
    return transaction.trade_exception_id;
  }

  const byTeam = transaction.trade_exception_id_by_team || {};
  return byTeam[state.team_id] || "";
}

function findTradeException(state, transaction = {}) {
  const id = resolveTradeExceptionId(state, transaction);
  if (!id) return null;
  return (state.trade_exceptions || []).find((item) => item.id === id) || null;
}

function projectPayrollAfterOption(state, option = {}) {
  return state.payroll_total + (option.effects?.payroll_delta || 0);
}

function shouldFreezeFuturePick(state, option, transaction = {}) {
  if (!transaction.uses_future_pick) {
    return false;
  }

  const projectedPayroll = projectPayrollAfterOption(state, option);
  const projectedSecondApron = projectedPayroll >= state.thresholds.second_apron;
  const lookback = new Set(state.second_apron_history || []);
  if (projectedSecondApron) {
    lookback.add(state.current_season_year);
  }

  const years = [state.current_season_year - 2, state.current_season_year - 1, state.current_season_year];
  const secondApronHits = years.filter((year) => lookback.has(year)).length;
  return secondApronHits >= 2;
}

export function evaluateAdvancedCbaRules(state, option) {
  // This extension hook keeps advanced CBA logic out of the base rule file.
  // Return shape: { legal: boolean, reason: string }
  const transaction = option.transaction || {};

  if (transaction.type === "sign_and_trade_incoming") {
    const projectedPayroll = projectPayrollAfterOption(state, option);
    if (projectedPayroll > state.thresholds.first_apron) {
      return {
        legal: false,
        reason: "Sign-and-trade incoming would hard-cap the team above the First Apron."
      };
    }
  }

  if (transaction.type === "trade_exception_use") {
    const tradeException = findTradeException(state, transaction);
    if (!tradeException) {
      return {
        legal: false,
        reason: "Trade exception was not found for this move."
      };
    }

    if (state.current_season_year > tradeException.expires_after_year) {
      return {
        legal: false,
        reason: `Trade exception ${tradeException.id} is expired.`
      };
    }

    const useAmount = transaction.trade_exception_use_amount || 0;
    if (tradeException.amount < useAmount) {
      return {
        legal: false,
        reason: `Trade exception ${tradeException.id} is too small for this salary match.`
      };
    }
  }

  if (transaction.type === "cash_trade") {
    if (state.apron_status === "Second Apron") {
      return {
        legal: false,
        reason: "Second Apron teams cannot send cash in trades."
      };
    }

    const cashSent = transaction.cash_sent || 0;
    if (cashSent > (state.cash_trade_budget_remaining || 0)) {
      return {
        legal: false,
        reason: "Cash-in-trade amount exceeds remaining budget."
      };
    }
  }

  if (shouldFreezeFuturePick(state, option, transaction)) {
    const targetYear = transaction.pick_year || "future";
    return {
      legal: false,
      reason: `Projected Second Apron timeline freezes the ${targetYear} pick in this simulation.`
    };
  }

  return {
    legal: true,
    reason: "Passed advanced CBA extension checks."
  };
}
