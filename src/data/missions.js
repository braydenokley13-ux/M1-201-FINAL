export const MISSIONS = [
  {
    mission_id: 1,
    key: "roster-lock",
    title: "Mission 1 - Roster Lock-In",
    briefing_text: "Confirm opening payroll and dead-money posture before you make any new move.",
    options: [
      {
        id: "conservative-audit",
        label: "Audit and waive non-rotation partial guarantee",
        effects: { payroll_delta: -1200000, performance_delta: 0, flexibility_delta: 2 },
        rule_checks: [],
        transaction: {
          type: "trade_exception_create",
          trade_exception_id: "EX-M1-AUDIT",
          trade_exception_create_amount: 1200000,
          expires_after_year: 2026
        }
      },
      {
        id: "keep-all",
        label: "Keep all contracts intact",
        effects: { payroll_delta: 0, performance_delta: 1, flexibility_delta: -1 },
        rule_checks: []
      }
    ]
  },
  {
    mission_id: 2,
    key: "bird-rights",
    title: "Mission 2 - Bird Rights Call",
    briefing_text: "An internal free agent can be retained using Bird Rights even above the cap.",
    options: [
      {
        id: "bird-full",
        label: "Use Bird Rights to retain at market value",
        effects: { payroll_delta: 14500000, performance_delta: 8, flexibility_delta: -4 },
        rule_checks: [{ type: "requires_exception", value: "Bird Rights" }]
      },
      {
        id: "bird-discount",
        label: "Use Bird Rights on a shorter discount deal",
        effects: { payroll_delta: 9300000, performance_delta: 5, flexibility_delta: -1 },
        rule_checks: [{ type: "requires_exception", value: "Bird Rights" }]
      },
      {
        id: "let-walk",
        label: "Let player walk and keep flexibility",
        effects: { payroll_delta: 0, performance_delta: -6, flexibility_delta: 7 },
        rule_checks: []
      }
    ]
  },
  {
    mission_id: 3,
    key: "mle-fork",
    title: "Mission 3 - MLE Fork",
    briefing_text: "Pick your free-agent tool under current apron restrictions.",
    options: [
      {
        id: "full-mle",
        label: "Use full MLE for two-way wing",
        effects: { payroll_delta: 12000000, performance_delta: 6, flexibility_delta: -5 },
        rule_checks: [{ type: "blocked_if_second_apron", reason: "Second Apron teams cannot use MLE." }]
      },
      {
        id: "taxpayer-mle",
        label: "Use taxpayer MLE-style smaller add",
        effects: { payroll_delta: 5600000, performance_delta: 3, flexibility_delta: -2 },
        rule_checks: [{ type: "requires_not_second_apron", reason: "Taxpayer MLE unavailable at Second Apron in this assessment." }]
      },
      {
        id: "skip-mle",
        label: "Skip MLE and preserve optionality",
        effects: { payroll_delta: 0, performance_delta: -1, flexibility_delta: 4 },
        rule_checks: []
      }
    ]
  },
  {
    mission_id: 4,
    key: "vet-minimum",
    title: "Mission 4 - Vet Minimum Depth",
    briefing_text: "Fill depth with veteran minimum strategy.",
    options: [
      {
        id: "two-vets",
        label: "Sign two veteran minimum role players",
        effects: { payroll_delta: 4200000, performance_delta: 4, flexibility_delta: -2, roster_slots_delta: -2 },
        rule_checks: [{ type: "requires_roster_slots", value: 2 }]
      },
      {
        id: "one-vet",
        label: "Sign one veteran minimum defender",
        effects: { payroll_delta: 2100000, performance_delta: 2, flexibility_delta: 0, roster_slots_delta: -1 },
        rule_checks: [{ type: "requires_roster_slots", value: 1 }]
      }
    ]
  },
  {
    mission_id: 5,
    key: "tax-line",
    title: "Mission 5 - Tax Line Pressure",
    briefing_text: "You are near major spend thresholds. Pick your direction.",
    options: [
      {
        id: "push-talent",
        label: "Add immediate talent despite tax hit",
        effects: { payroll_delta: 7600000, performance_delta: 6, flexibility_delta: -4 },
        rule_checks: []
      },
      {
        id: "trim-contract",
        label: "Trade down to trim salary",
        effects: { payroll_delta: -5400000, performance_delta: -2, flexibility_delta: 5 },
        rule_checks: [
          { type: "requires_cash_trade_budget", value: 1200000 },
          { type: "blocked_cash_trade_if_second_apron", reason: "Second Apron teams cannot send cash in trades." }
        ],
        transaction: {
          type: "cash_trade",
          cash_sent: 1200000
        }
      }
    ]
  },
  {
    mission_id: 6,
    key: "second-apron",
    title: "Mission 6 - Second Apron Trap",
    briefing_text: "A trade path appears. Apron rules decide if the tool is legal.",
    options: [
      {
        id: "aggregate-trade",
        label: "Aggregate two salaries to chase one higher salary player",
        effects: { payroll_delta: 3000000, performance_delta: 5, flexibility_delta: -4 },
        rule_checks: [
          { type: "blocked_if_second_apron", reason: "Second Apron teams cannot aggregate outgoing salaries in this simulation." },
          { type: "requires_not_second_apron_for_sign_and_trade", reason: "Sign-and-trade incoming is blocked at the Second Apron." }
        ],
        transaction: {
          type: "sign_and_trade_incoming",
          incoming_salary: 16500000,
          outgoing_salary: 13500000
        }
      },
      {
        id: "small-trade",
        label: "Execute one-for-one legal salary match move",
        effects: { payroll_delta: 800000, performance_delta: 2, flexibility_delta: 0 },
        rule_checks: [],
        transaction: {
          type: "trade_exception_use",
          trade_exception_id_by_team: {
            warriors: "EX-WAR-01",
            knicks: "EX-KNY-01"
          },
          trade_exception_use_amount: 2400000
        }
      },
      {
        id: "no-trade",
        label: "Keep roster and avoid restriction risk",
        effects: { payroll_delta: 0, performance_delta: -1, flexibility_delta: 2 },
        rule_checks: []
      }
    ]
  },
  {
    mission_id: 7,
    key: "repeater",
    title: "Mission 7 - Repeater Consequence",
    briefing_text: "Choose a path that balances this year vs future repeater pressure.",
    options: [
      {
        id: "extend-core",
        label: "Extend key contributor now",
        effects: { payroll_delta: 9500000, performance_delta: 4, flexibility_delta: -6 },
        rule_checks: []
      },
      {
        id: "delay-extension",
        label: "Delay extension and keep future room",
        effects: { payroll_delta: 0, performance_delta: -1, flexibility_delta: 5 },
        rule_checks: []
      }
    ]
  },
  {
    mission_id: 8,
    key: "deadline-shock",
    title: "Mission 8 - Deadline Shock",
    briefing_text: "Final move window. You must close the run with legal and balanced outcomes.",
    options: [
      {
        id: "all-in",
        label: "Final aggressive add",
        effects: { payroll_delta: 6800000, performance_delta: 5, flexibility_delta: -5 },
        rule_checks: [{ type: "blocked_if_frozen_pick", reason: "Future pick freeze risk blocks this route at critical flexibility." }],
        transaction: {
          type: "trade",
          uses_future_pick: true,
          pick_year: 2032
        }
      },
      {
        id: "balanced-close",
        label: "Small upgrade + preserve future flexibility",
        effects: { payroll_delta: 2800000, performance_delta: 2, flexibility_delta: 2 },
        rule_checks: []
      },
      {
        id: "stand-pat",
        label: "No move, protect spend line",
        effects: { payroll_delta: 0, performance_delta: 0, flexibility_delta: 3 },
        rule_checks: []
      }
    ]
  }
];
