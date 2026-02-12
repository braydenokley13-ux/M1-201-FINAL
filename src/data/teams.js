export const THRESHOLDS_2024_25 = {
  season: "2024-2025",
  salary_cap: 140588000,
  luxury_tax_line: 170814000,
  first_apron: 178132000,
  second_apron: 188931000,
  source: "https://www.nba.com/news/nba-salary-cap-for-2024-25-season-set-at-140-588-million",
  verified_date: "2026-02-12"
};

export const TEAMS = {
  warriors: {
    id: "warriors",
    name: "Golden State Warriors",
    tax_status: "Over Tax",
    repeater_status: "YES",
    apron_status: "Second Apron",
    payroll_total: 197400000,
    roster_slots_open: 3,
    exceptions_available: ["Bird Rights", "Veteran Minimum"],
    performance_score: 62,
    flexibility_score: 32,
    source: "https://www.spotrac.com/nba/golden-state-warriors/cap/_/year/2024",
    verified_date: "2026-02-12",
    players: [
      {
        player: "Stephen Curry",
        contract_type: "Guaranteed",
        salary_2024_25: 55761000,
        rights_tag: "N/A",
        tax_apron_relevance: "High salary anchor",
        source_link: "https://www.spotrac.com/nba/player/_/id/10812/stephen-curry",
        assumption_flag: "VERIFY BEFORE USE"
      },
      {
        player: "Draymond Green",
        contract_type: "Guaranteed",
        salary_2024_25: 24107000,
        rights_tag: "N/A",
        tax_apron_relevance: "Core rotation",
        source_link: "https://www.spotrac.com/nba/player/_/id/10816/draymond-green",
        assumption_flag: "VERIFY BEFORE USE"
      },
      {
        player: "Jonathan Kuminga",
        contract_type: "Rookie scale",
        salary_2024_25: 7630000,
        rights_tag: "Bird Rights pathway",
        tax_apron_relevance: "Future raise pressure",
        source_link: "https://www.spotrac.com/nba/player/_/id/74138/jonathan-kuminga",
        assumption_flag: "VERIFY BEFORE USE"
      }
    ]
  },
  knicks: {
    id: "knicks",
    name: "New York Knicks",
    tax_status: "Near Tax",
    repeater_status: "NO",
    apron_status: "First Apron",
    payroll_total: 183900000,
    roster_slots_open: 2,
    exceptions_available: ["Bird Rights", "Taxpayer MLE", "Veteran Minimum"],
    performance_score: 67,
    flexibility_score: 49,
    source: "https://www.spotrac.com/nba/new-york-knicks/cap/_/year/2024",
    verified_date: "2026-02-12",
    players: [
      {
        player: "Jalen Brunson",
        contract_type: "Guaranteed",
        salary_2024_25: 24960000,
        rights_tag: "N/A",
        tax_apron_relevance: "Core value deal",
        source_link: "https://www.spotrac.com/nba/player/_/id/23620/jalen-brunson",
        assumption_flag: "VERIFY BEFORE USE"
      },
      {
        player: "Karl-Anthony Towns",
        contract_type: "Guaranteed",
        salary_2024_25: 49200000,
        rights_tag: "N/A",
        tax_apron_relevance: "Apron pressure",
        source_link: "https://www.spotrac.com/nba/player/_/id/13317/karl-anthony-towns",
        assumption_flag: "VERIFY BEFORE USE"
      },
      {
        player: "OG Anunoby",
        contract_type: "Guaranteed",
        salary_2024_25: 36700000,
        rights_tag: "Bird Rights retained",
        tax_apron_relevance: "Wing cornerstone",
        source_link: "https://www.spotrac.com/nba/player/_/id/23633/og-anunoby",
        assumption_flag: "VERIFY BEFORE USE"
      }
    ]
  }
};
