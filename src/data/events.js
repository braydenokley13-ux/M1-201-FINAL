export const RANDOM_EVENTS = [
  {
    id: "injury",
    title: "Injury Alert",
    briefing: "A rotation guard tweaks a hamstring. You need a short-term depth move.",
    options: [
      {
        id: "sign-vet",
        label: "Sign a veteran minimum stopgap",
        effects: { payroll_delta: 2100000, performance_delta: 3, flexibility_delta: -1, roster_slots_delta: -1 }
      },
      {
        id: "internal-minutes",
        label: "Use internal depth, no signing",
        effects: { payroll_delta: 0, performance_delta: -2, flexibility_delta: 2, roster_slots_delta: 0 }
      }
    ]
  },
  {
    id: "buyout",
    title: "Buyout Market Surprise",
    briefing: "A proven bench shooter clears waivers and wants to join now.",
    options: [
      {
        id: "take-shooter",
        label: "Add shooter on minimum deal",
        effects: { payroll_delta: 2000000, performance_delta: 4, flexibility_delta: -1, roster_slots_delta: -1 }
      },
      {
        id: "pass-shooter",
        label: "Pass and keep room for later",
        effects: { payroll_delta: 0, performance_delta: 0, flexibility_delta: 2, roster_slots_delta: 0 }
      }
    ]
  },
  {
    id: "owner-warning",
    title: "Owner Spending Warning",
    briefing: "Ownership asks you to control spending in the final stretch.",
    options: [
      {
        id: "honor-owner",
        label: "Freeze spending unless legally required",
        effects: { payroll_delta: 0, performance_delta: -1, flexibility_delta: 4, spend_guardrail_delta: -3000000 }
      },
      {
        id: "ignore-owner",
        label: "Push talent anyway",
        effects: { payroll_delta: 2500000, performance_delta: 3, flexibility_delta: -3, spend_guardrail_delta: 0 }
      }
    ]
  },
  {
    id: "role-trade-demand",
    title: "Role Player Trade Request",
    briefing: "A bench veteran asks out for minutes. Locker room risk rises.",
    options: [
      {
        id: "move-player",
        label: "Trade for lower-cost depth",
        effects: { payroll_delta: -1800000, performance_delta: -1, flexibility_delta: 3, roster_slots_delta: 0 }
      },
      {
        id: "keep-player",
        label: "Keep player and absorb friction",
        effects: { payroll_delta: 0, performance_delta: 1, flexibility_delta: -2, roster_slots_delta: 0 }
      }
    ]
  }
];
