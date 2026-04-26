(function () {
  const data = window.SOCCER_BRACKETOLOGY_DATA;
  if (!data) {
    document.body.innerHTML = "<p>Missing generated data.</p>";
    return;
  }

  const STORAGE_KEYS = {
    regularOverrides: "soccer-bracketology-regular-overrides-v3",
    districtOverrides: "soccer-bracketology-district-overrides-v3",
    externalOverrides: "soccer-bracketology-oos-overrides-v3",
    customGames: "soccer-bracketology-custom-games-v3",
  };

  const DISTRICT_SCHEDULE = {
    play_in: "Saturday, May 2, 2026",
    semifinal: {
      A: "Monday, May 4, 2026",
      B: "Tuesday, May 5, 2026",
    },
    final: {
      A: "Wednesday, May 6, 2026",
      B: "TBD (May 7-9, 2026)",
    },
  };

  const STATE_SCHEDULE = {
    A: {
      girls_soccer: {
        quarterfinals: [
          "Monday, May 11, 2026 - 12:00 PM",
          "Monday, May 11, 2026 - 2:00 PM",
          "Monday, May 11, 2026 - 5:30 PM",
          "Monday, May 11, 2026 - 7:30 PM",
        ],
        semifinals: [
          "Friday, May 15, 2026 - 12:00 PM",
          "Friday, May 15, 2026 - 2:00 PM",
        ],
        final: "Monday, May 18, 2026 - 8:00 PM",
      },
      boys_soccer: {
        quarterfinals: [
          "Tuesday, May 12, 2026 - 12:00 PM",
          "Tuesday, May 12, 2026 - 2:00 PM",
          "Tuesday, May 12, 2026 - 5:30 PM",
          "Tuesday, May 12, 2026 - 7:30 PM",
        ],
        semifinals: [
          "Friday, May 15, 2026 - 5:30 PM",
          "Friday, May 15, 2026 - 7:30 PM",
        ],
        final: "Tuesday, May 19, 2026 - 8:00 PM",
      },
    },
    B: {
      girls_soccer: {
        quarterfinals: [
          "Wednesday, May 13, 2026 - 12:00 PM",
          "Wednesday, May 13, 2026 - 2:00 PM",
          "Wednesday, May 13, 2026 - 5:30 PM",
          "Wednesday, May 13, 2026 - 7:30 PM",
        ],
        semifinals: [
          "Saturday, May 16, 2026 - 12:00 PM",
          "Saturday, May 16, 2026 - 2:00 PM",
        ],
        final: "Monday, May 18, 2026 - 4:30 PM",
      },
      boys_soccer: {
        quarterfinals: [
          "Thursday, May 14, 2026 - 12:00 PM",
          "Thursday, May 14, 2026 - 2:00 PM",
          "Thursday, May 14, 2026 - 5:30 PM",
          "Thursday, May 14, 2026 - 7:30 PM",
        ],
        semifinals: [
          "Saturday, May 16, 2026 - 5:30 PM",
          "Saturday, May 16, 2026 - 7:30 PM",
        ],
        final: "Tuesday, May 19, 2026 - 4:30 PM",
      },
    },
  };

  const SPORTS = [
    { id: "boys_soccer", label: "Boys" },
    { id: "girls_soccer", label: "Girls" },
  ];
  const CLASSES = ["A", "B"];
  const SETS = [
    { id: "regular_season", label: "Regular Season" },
    { id: "districts", label: "Districts" },
  ];

  function loadObject(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}");
    } catch {
      return {};
    }
  }

  function loadArray(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function clearStoredState() {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  }

  function parseIntSafe(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  function round(value, digits = 4) {
    return Number(value || 0).toFixed(digits);
  }

  function compareIso(a, b) {
    return (a || "").localeCompare(b || "");
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "custom-opponent";
  }

  function divisionFromRecord(record) {
    const games = Number(record.wins || 0) + Number(record.losses || 0) + Number(record.ties || 0);
    if (!games) return 4;
    const pct = Number(record.wins || 0) / games;
    if (pct >= 0.75) return 1;
    if (pct >= 0.5) return 2;
    if (pct >= 0.25) return 3;
    return 4;
  }

  function classBonus(opponentClass) {
    return opponentClass === "A" ? 2 : 0;
  }

  function outcomeFromScore(scoreA, scoreB) {
    if (scoreA == null || scoreB == null || scoreA === "" || scoreB === "") return null;
    if (Number(scoreA) > Number(scoreB)) return "A";
    if (Number(scoreB) > Number(scoreA)) return "B";
    return "T";
  }

  function recordText(record) {
    return `${record.wins}-${record.losses}${record.ties ? `-${record.ties}` : ""}`;
  }

  function sportLabel(sportGroup) {
    return sportGroup === "boys_soccer" ? "Boys" : "Girls";
  }

  function classLabel(classCode) {
    return classCode === "A" ? "Class A" : "Class B";
  }

  function setLabel(setId) {
    return setId === "districts" ? "Districts" : "Regular Season";
  }

  function posterContextLabel() {
    return `${sportLabel(state.sportGroup)} / ${classLabel(state.activeClass)} / ${setLabel(state.scenarioSet)}`.toUpperCase();
  }

  function boardTitle(sportGroup, classCode, scenarioSet) {
    return `${sportLabel(sportGroup)} ${classLabel(classCode)} ${scenarioSet === "districts" ? "District & State" : "Regular Season"} Poster`;
  }

  function districtRoundSchedule(round) {
    if (round === "play_in") return DISTRICT_SCHEDULE.play_in;
    if (round === "semifinal") return DISTRICT_SCHEDULE.semifinal[state.activeClass];
    if (round === "final") return DISTRICT_SCHEDULE.final[state.activeClass];
    return "";
  }

  function stateSchedule() {
    return STATE_SCHEDULE[state.activeClass]?.[state.sportGroup];
  }

  function emptySnapshotTeam(team) {
    return {
      team_id: team.team_id,
      name: team.name,
      sport_group: team.sport_group,
      class_code: team.class_code,
      team_key: team.team_key,
      is_external: team.is_external,
      is_custom: team.is_custom,
      record: { wins: 0, losses: 0, ties: 0 },
      division: 4,
      division_locked: false,
      games_played: 0,
      total_points: 0,
      average: 0,
      first_division_in_class_games: 0,
      first_division_all_games: 0,
      opponents_wins: 0,
      opponents_losses: 0,
      opponents_win_pct: 0,
      applied_games: [],
      seed: null,
    };
  }

  function makeSportClassGroup(sportGroup, classCode) {
    return data.groups.find((group) => group.sport_group === sportGroup && group.class_code === classCode);
  }

  const baseTeamsById = new Map(data.teams.map((team) => [team.team_id, team]));
  const baseGroupsById = new Map(data.groups.map((group) => [group.id, group]));
  const modelTeams = [...data.model_teams].sort((a, b) => `${a.sport_group}${a.class_code}${a.team}`.localeCompare(`${b.sport_group}${b.class_code}${b.team}`));
  const modelByKey = new Map(modelTeams.map((team) => [`${team.sport_group}:${team.team_key}`, team]));

  const state = {
    sportGroup: "boys_soccer",
    activeClass: "A",
    scenarioSet: "regular_season",
    activeView: "board",
    cutoff: data.metadata.district_seeding_cutoff,
    selectedTeamId: null,
    teamSearch: "",
    gameFilter: "pending",
    districtRoundFilter: "all",
    projectStateBracket: false,
    regularOverrides: loadObject(STORAGE_KEYS.regularOverrides),
    districtOverrides: loadObject(STORAGE_KEYS.districtOverrides),
    externalOverrides: loadObject(STORAGE_KEYS.externalOverrides),
    customGames: loadArray(STORAGE_KEYS.customGames),
    officialDrafts: {},
  };

  const teamsById = new Map(baseTeamsById);
  let customTeamIds = new Set();

  const els = {
    sportTabs: document.getElementById("sportTabs"),
    classTabs: document.getElementById("classTabs"),
    setTabs: document.getElementById("setTabs"),
    cutoffInput: document.getElementById("cutoffInput"),
    viewTabs: document.getElementById("viewTabs"),
    exportBoardButton: document.getElementById("exportBoardButton"),
    exportDistrictButton: document.getElementById("exportDistrictButton"),
    exportStateButton: document.getElementById("exportStateButton"),
    resetAllButton: document.getElementById("resetAllButton"),
    boardView: document.getElementById("boardView"),
    gamesView: document.getElementById("gamesView"),
    teamView: document.getElementById("teamView"),
    standingsView: document.getElementById("standingsView"),
    stateView: document.getElementById("stateView"),
    oosView: document.getElementById("oosView"),
    wildcardStat: document.getElementById("wildcardStat"),
    pendingGamesStat: document.getElementById("pendingGamesStat"),
    bubbleStat: document.getElementById("bubbleStat"),
    noteStat: document.getElementById("noteStat"),
  };

  function activeGroup() {
    return makeSportClassGroup(state.sportGroup, state.activeClass);
  }

  function sportTeamIds(sportGroup) {
    return Array.from(teamsById.values())
      .filter((team) => team.sport_group === sportGroup && !team.is_external)
      .map((team) => team.team_id);
  }

  function classTeamIds(sportGroup, classCode) {
    return Array.from(teamsById.values())
      .filter((team) => team.sport_group === sportGroup && !team.is_external && team.class_code === classCode)
      .map((team) => team.team_id);
  }

  function getClassTeams(sportGroup, classCode) {
    return classTeamIds(sportGroup, classCode)
      .map((teamId) => teamsById.get(teamId))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function ensureSelectedTeamIsValid() {
    const teams = getClassTeams(state.sportGroup, state.activeClass);
    if (!teams.length) {
      state.selectedTeamId = null;
      return;
    }
    if (!teams.some((team) => team.team_id === state.selectedTeamId)) {
      state.selectedTeamId = teams[0].team_id;
    }
  }

  function baseCustomOpponentTeam(teamId, customOpponent) {
    return {
      team_id: teamId,
      team_key: slugify(customOpponent.name),
      name: customOpponent.name,
      sport_group: customOpponent.sport_group,
      class_code: customOpponent.class_code || "OOS",
      is_external: true,
      is_custom: true,
      baseline: {
        wins: parseIntSafe(customOpponent.wins),
        losses: parseIntSafe(customOpponent.losses),
        division: customOpponent.division === "auto" || customOpponent.division == null
          ? divisionFromRecord({ wins: parseIntSafe(customOpponent.wins), losses: parseIntSafe(customOpponent.losses), ties: 0 })
          : parseIntSafe(customOpponent.division),
        class_code: customOpponent.class_code || "OOS",
      },
    };
  }

  function syncCustomTeamsIntoIndex() {
    customTeamIds.forEach((teamId) => teamsById.delete(teamId));
    customTeamIds = new Set();
    state.customGames.forEach((game) => {
      if (!game.custom_opponent?.team_id) return;
      const team = baseCustomOpponentTeam(game.custom_opponent.team_id, game.custom_opponent);
      teamsById.set(team.team_id, team);
      customTeamIds.add(team.team_id);
    });
  }

  function allRegularGames() {
    return [
      ...data.games.map((game) => ({
        ...game,
        set_id: "regular_season",
        stage: "regular_season",
        is_custom: false,
      })),
      ...state.customGames.map((game) => ({
        ...game,
        set_id: "regular_season",
        stage: game.stage || "regular_season",
      })),
    ];
  }

  function overrideBucket(setId) {
    return setId === "districts" ? state.districtOverrides : state.regularOverrides;
  }

  function saveOverrideBucket(setId) {
    saveJson(setId === "districts" ? STORAGE_KEYS.districtOverrides : STORAGE_KEYS.regularOverrides, overrideBucket(setId));
  }

  function computeProbability(teamAOrGame, maybeTeamB) {
    const teamA = maybeTeamB
      ? (teamAOrGame.result_rating != null ? teamAOrGame : modelByKey.get(`${teamAOrGame.sport_group}:${teamsById.get(teamAOrGame.team_id)?.team_key}`))
      : modelByKey.get(`${teamAOrGame.sport_group}:${teamsById.get(teamAOrGame.team_a_id)?.team_key}`);
    const teamB = maybeTeamB
      ? (maybeTeamB.result_rating != null ? maybeTeamB : modelByKey.get(`${maybeTeamB.sport_group}:${teamsById.get(maybeTeamB.team_id)?.team_key}`))
      : modelByKey.get(`${teamAOrGame.sport_group}:${teamsById.get(teamAOrGame.team_b_id)?.team_key}`);
    if (!teamA || !teamB || teamA.result_rating == null || teamB.result_rating == null) return null;
    const blendedGap = ((teamA.result_rating - teamB.result_rating) * 0.72) + ((teamA.margin_rating - teamB.margin_rating) * 0.28);
    return 1 / (1 + Math.exp(-(blendedGap / 1.25)));
  }

  function projectedWinner(teamA, teamB) {
    if (!teamA) return teamB;
    if (!teamB) return teamA;
    const modelA = modelByKey.get(`${teamA.sport_group}:${teamsById.get(teamA.team_id)?.team_key}`);
    const modelB = modelByKey.get(`${teamB.sport_group}:${teamsById.get(teamB.team_id)?.team_key}`);
    if (modelA && modelB) {
      return computeProbability(modelA, modelB) >= 0.5 ? teamA : teamB;
    }
    return (teamA.seed || 999) <= (teamB.seed || 999) ? teamA : teamB;
  }

  function effectiveRegularGameState(game) {
    const override = state.regularOverrides[game.id];
    if (override?.mode === "official") {
      return {
        mode: "official",
        scoreA: override.scoreA,
        scoreB: override.scoreB,
        winner: outcomeFromScore(override.scoreA, override.scoreB),
      };
    }
    if (override?.mode === "projected") return { mode: "projected", scoreA: null, scoreB: null, winner: override.winner || null };
    if (override?.mode === "cancelled") return { mode: "cancelled", scoreA: null, scoreB: null, winner: null };
    if (override?.mode === "unplayed") return { mode: "unplayed", scoreA: null, scoreB: null, winner: null };
    return {
      mode: game.source_status,
      scoreA: game.source_score_a,
      scoreB: game.source_score_b,
      winner: outcomeFromScore(game.source_score_a, game.source_score_b),
    };
  }

  function externalBaselines(sportGroup, cutoff) {
    const baselines = {};
    allRegularGames()
      .filter((game) => game.sport_group === sportGroup)
      .filter((game) => compareIso(game.date, cutoff) <= 0)
      .forEach((game) => {
        (game.source_rows || []).forEach((row) => {
          let opponentId = null;
          if (row.school === game.team_a_name) opponentId = game.team_b_id;
          if (row.school === game.team_b_name) opponentId = game.team_a_id;
          if (!opponentId) return;
          const opponent = teamsById.get(opponentId);
          if (!opponent?.is_external) return;
          const wins = parseIntSafe(row.wins_snapshot);
          const losses = parseIntSafe(row.losses_snapshot);
          const dateKey = game.date || "";
          if (!baselines[opponentId] || dateKey >= baselines[opponentId].date) {
            baselines[opponentId] = {
              date: dateKey,
              wins,
              losses,
              division: parseIntSafe(row.division_snapshot) || divisionFromRecord({ wins, losses, ties: 0 }),
              class_code: row.class_snapshot || opponent.class_code || "OOS",
            };
          }
        });
      });
    return baselines;
  }

  function buildSportSnapshot(sportGroup, regularGames, districtGames = []) {
    syncCustomTeamsIntoIndex();
    const relevantTeams = Array.from(teamsById.values()).filter((team) => team.sport_group === sportGroup);
    const snapshot = new Map(relevantTeams.map((team) => [team.team_id, emptySnapshotTeam(team)]));
    const baselineMap = externalBaselines(sportGroup, state.cutoff);

    snapshot.forEach((team) => {
      if (!team.is_external) return;
      const sourceTeam = teamsById.get(team.team_id);
      const baseline = baselineMap[team.team_id] || sourceTeam?.baseline || {};
      const override = state.externalOverrides[team.team_id] || {};
      team.record.wins = parseIntSafe(override.wins ?? baseline.wins);
      team.record.losses = parseIntSafe(override.losses ?? baseline.losses);
      team.games_played = team.record.wins + team.record.losses;
      team.class_code = override.classCode || baseline.class_code || team.class_code;
      if (override.division && override.division !== "auto") {
        team.division = Number(override.division);
      } else if (baseline.division) {
        team.division = baseline.division;
      } else {
        team.division = divisionFromRecord(team.record);
      }
      team.division_locked = true;
    });

    const scoringGames = [...regularGames, ...districtGames].filter(Boolean);

    scoringGames.forEach((game) => {
      const effective = game.effective;
      if (!["official", "projected"].includes(effective.mode)) return;
      const teamA = snapshot.get(game.team_a_id);
      const teamB = snapshot.get(game.team_b_id);
      if (!teamA || !teamB) return;
      if (!teamA.is_external) {
        if (effective.winner === "A") teamA.record.wins += 1;
        else if (effective.winner === "B") teamA.record.losses += 1;
        else if (effective.winner === "T") teamA.record.ties += 1;
        teamA.games_played += 1;
      }
      if (!teamB.is_external) {
        if (effective.winner === "B") teamB.record.wins += 1;
        else if (effective.winner === "A") teamB.record.losses += 1;
        else if (effective.winner === "T") teamB.record.ties += 1;
        teamB.games_played += 1;
      }
    });

    snapshot.forEach((team) => {
      if (!team.division_locked) team.division = divisionFromRecord(team.record);
    });

    scoringGames.forEach((game) => {
      const effective = game.effective;
      if (!["official", "projected"].includes(effective.mode)) return;
      const teamA = snapshot.get(game.team_a_id);
      const teamB = snapshot.get(game.team_b_id);
      if (!teamA || !teamB) return;

      const divisionA = teamA.division;
      const divisionB = teamB.division;
      const pointsA = effective.winner === "A"
        ? data.rules.points_for_win[divisionB] + classBonus(teamB.class_code)
        : effective.winner === "B"
          ? data.rules.points_for_loss[divisionB] + classBonus(teamB.class_code)
          : 0;
      const pointsB = effective.winner === "B"
        ? data.rules.points_for_win[divisionA] + classBonus(teamA.class_code)
        : effective.winner === "A"
          ? data.rules.points_for_loss[divisionA] + classBonus(teamA.class_code)
          : 0;

      if (!teamA.is_external) {
        teamA.total_points += pointsA;
        teamA.applied_games.push({ game_id: game.id, opponent_id: teamB.team_id, winner: effective.winner, points: pointsA, opponent_division: divisionB });
        if (divisionB === 1) {
          teamA.first_division_all_games += 1;
          if (teamA.class_code === teamB.class_code) teamA.first_division_in_class_games += 1;
        }
        teamA.opponents_wins += teamB.record.wins;
        teamA.opponents_losses += teamB.record.losses;
      }
      if (!teamB.is_external) {
        const winnerFromB = effective.winner === "A" ? "B" : effective.winner === "B" ? "A" : "T";
        teamB.total_points += pointsB;
        teamB.applied_games.push({ game_id: game.id, opponent_id: teamA.team_id, winner: winnerFromB, points: pointsB, opponent_division: divisionA });
        if (divisionA === 1) {
          teamB.first_division_all_games += 1;
          if (teamA.class_code === teamB.class_code) teamB.first_division_in_class_games += 1;
        }
        teamB.opponents_wins += teamA.record.wins;
        teamB.opponents_losses += teamA.record.losses;
      }
    });

    snapshot.forEach((team) => {
      team.average = team.games_played ? team.total_points / team.games_played : 0;
      team.opponents_win_pct = (team.opponents_wins + team.opponents_losses)
        ? team.opponents_wins / (team.opponents_wins + team.opponents_losses)
        : 0;
    });

    return snapshot;
  }

  function headToHeadDifferential(team, tieIds) {
    return team.applied_games.reduce((acc, game) => {
      if (!tieIds.has(game.opponent_id)) return acc;
      if (game.winner === "A") return acc + 1;
      if (game.winner === "B") return acc - 1;
      return acc;
    }, 0);
  }

  function breakTie(chunk, classCode) {
    if (chunk.length === 2) {
      const tieIds = new Set(chunk.map((team) => team.team_id));
      const diffA = headToHeadDifferential(chunk[0], tieIds);
      const diffB = headToHeadDifferential(chunk[1], tieIds);
      if (diffA !== diffB) return diffA > diffB ? chunk : [chunk[1], chunk[0]];
    }

    const metric = classCode === "B" ? "first_division_all_games" : "first_division_in_class_games";
    chunk.sort((a, b) => {
      if (b[metric] !== a[metric]) return b[metric] - a[metric];
      if (b.opponents_win_pct !== a.opponents_win_pct) return b.opponents_win_pct - a.opponents_win_pct;
      return a.name.localeCompare(b.name);
    });
    return chunk;
  }

  function rankSubset(teams, classCode) {
    const ranked = [...teams].sort((a, b) => {
      if (b.average !== a.average) return b.average - a.average;
      return a.name.localeCompare(b.name);
    });
    for (let index = 0; index < ranked.length;) {
      let end = index + 1;
      while (end < ranked.length && Math.abs(ranked[index].average - ranked[end].average) < 1e-9) end += 1;
      const chunk = ranked.slice(index, end);
      if (chunk.length > 1) {
        breakTie(chunk, classCode).forEach((team, offset) => {
          ranked[index + offset] = team;
        });
      }
      index = end;
    }
    return ranked.map((team, index) => ({ ...team, seed: index + 1 }));
  }

  function rankTeamsByClass(snapshot, sportGroup, classCode) {
    const teams = Array.from(snapshot.values()).filter((team) => !team.is_external && team.sport_group === sportGroup && team.class_code === classCode);
    return rankSubset(teams, classCode);
  }

  function reseedTeams(teams) {
    return teams.map((team, index) => ({ ...team, seed: index + 1 }));
  }

  function eligibleForBracket(team) {
    return Number(team?.games_played || 0) > 0 && Number(team?.average || 0) > 0;
  }

  function serpentineDistricts(rankedTeams, districtCount, classCode) {
    const districts = Array.from({ length: districtCount }, (_, index) => ({
      id: index + 1,
      code: `${classCode}${index + 1}`,
      name: `District ${index + 1}`,
      teams: [],
    }));
    rankedTeams.forEach((team, index) => {
      const row = Math.floor(index / districtCount);
      const col = index % districtCount;
      const districtIndex = row % 2 === 0 ? col : districtCount - 1 - col;
      districts[districtIndex].teams.push({ ...team, district_seed: districts[districtIndex].teams.length + 1 });
    });
    return districts;
  }

  function structureNote(teamCount) {
    if (teamCount === 4) return "Day 1: 1 vs 4, 3 vs 2. Day 2: championship.";
    if (teamCount === 5) return "Day 1: 4 vs 5. Day 2: 1 vs winner 4/5, 3 vs 2. Day 3: championship.";
    if (teamCount === 6) return "Day 1: 4 vs 5 and 3 vs 6. Day 2: 1 vs winner 4/5, 2 vs winner 3/6. Day 3: championship.";
    return "Assumed 7-team format: 4 vs 5, 3 vs 6, 2 vs 7, then seed 1 enters in the semifinal.";
  }

  function buildDistrictPlan(district) {
    const teamSeed = (seed) => district.teams.find((team) => team.district_seed === seed) || null;
    const games = [];
    const addGame = (key, round, label, slotA, slotB) => {
      games.push({
        key,
        id: `district-${state.sportGroup}-${state.activeClass}-${district.id}-${key}`,
        district_id: district.id,
        district_code: district.code,
        sport_group: state.sportGroup,
        class_code: state.activeClass,
        stage: "district",
        round,
        label,
        slotA,
        slotB,
      });
    };

    if (district.teams.length === 4) {
      addGame("q1", "semifinal", "Semifinal 1", { seed: 1 }, { seed: 4 });
      addGame("q2", "semifinal", "Semifinal 2", { seed: 3 }, { seed: 2 });
      addGame("final", "final", "District Final", { winnerOf: "q1" }, { winnerOf: "q2" });
    } else if (district.teams.length === 5) {
      addGame("p1", "play_in", "Play-In", { seed: 4 }, { seed: 5 });
      addGame("s1", "semifinal", "Semifinal 1", { seed: 1 }, { winnerOf: "p1" });
      addGame("s2", "semifinal", "Semifinal 2", { seed: 3 }, { seed: 2 });
      addGame("final", "final", "District Final", { winnerOf: "s1" }, { winnerOf: "s2" });
    } else if (district.teams.length === 6) {
      addGame("p1", "play_in", "Quarterfinal 1", { seed: 4 }, { seed: 5 });
      addGame("p2", "play_in", "Quarterfinal 2", { seed: 3 }, { seed: 6 });
      addGame("s1", "semifinal", "Semifinal 1", { seed: 1 }, { winnerOf: "p1" });
      addGame("s2", "semifinal", "Semifinal 2", { seed: 2 }, { winnerOf: "p2" });
      addGame("final", "final", "District Final", { winnerOf: "s1" }, { winnerOf: "s2" });
    } else if (district.teams.length >= 7) {
      addGame("p1", "play_in", "Quarterfinal 1", { seed: 4 }, { seed: 5 });
      addGame("p2", "play_in", "Quarterfinal 2", { seed: 3 }, { seed: 6 });
      addGame("p3", "play_in", "Quarterfinal 3", { seed: 2 }, { seed: 7 });
      addGame("s1", "semifinal", "Semifinal 1", { seed: 1 }, { winnerOf: "p1" });
      addGame("s2", "semifinal", "Semifinal 2", { winnerOf: "p2" }, { winnerOf: "p3" });
      addGame("final", "final", "District Final", { winnerOf: "s1" }, { winnerOf: "s2" });
    }

    return games;
  }

  function resolveDistrictSlot(slot, seedMap, resultsByKey) {
    if (!slot) return null;
    if (slot.seed) return seedMap.get(slot.seed) || null;
    if (slot.winnerOf) return resultsByKey.get(slot.winnerOf) || null;
    return null;
  }

  function districtSlotLabel(slot, seedMap, planByKey) {
    if (!slot) return "TBD";
    if (slot.seed) return seedMap.get(slot.seed)?.name || `Seed ${slot.seed}`;
    if (slot.winnerOf) return `Winner ${planByKey.get(slot.winnerOf)?.label || slot.winnerOf.toUpperCase()}`;
    return "TBD";
  }

  function effectiveDistrictGameState(game, teamA, teamB, includeOverrides = true) {
    const override = includeOverrides ? state.districtOverrides[game.id] : null;
    if (override?.mode === "official") {
      return {
        mode: "official",
        scoreA: override.scoreA,
        scoreB: override.scoreB,
        winner: outcomeFromScore(override.scoreA, override.scoreB),
      };
    }
    if (override?.mode === "projected") return { mode: "projected", scoreA: null, scoreB: null, winner: override.winner || null };
    if (override?.mode === "cancelled") return { mode: "cancelled", scoreA: null, scoreB: null, winner: null };
    if (override?.mode === "unplayed") return { mode: "unplayed", scoreA: null, scoreB: null, winner: null };
    if (!teamA || !teamB) return { mode: "unplayed", scoreA: null, scoreB: null, winner: null };
    return { mode: "unplayed", scoreA: null, scoreB: null, winner: null };
  }

  function buildDistrictScenarioGames(districts, { includeOverrides = true } = {}) {
    const scenarioGames = [];
    districts.forEach((district) => {
      const plan = buildDistrictPlan(district);
      const planByKey = new Map(plan.map((game) => [game.key, game]));
      const seedMap = new Map(district.teams.map((team) => [team.district_seed, team]));
      const resultsByKey = new Map();
      plan.forEach((rawGame) => {
        const teamA = resolveDistrictSlot(rawGame.slotA, seedMap, resultsByKey);
        const teamB = resolveDistrictSlot(rawGame.slotB, seedMap, resultsByKey);
        const game = {
          ...rawGame,
          team_a_id: teamA?.team_id || null,
          team_b_id: teamB?.team_id || null,
          team_a_name: teamA?.name || districtSlotLabel(rawGame.slotA, seedMap, planByKey),
          team_b_name: teamB?.name || districtSlotLabel(rawGame.slotB, seedMap, planByKey),
        };
        game.effective = effectiveDistrictGameState(game, teamA, teamB, includeOverrides);
        game.probability = teamA && teamB ? computeProbability(teamA, teamB) : null;
        const winner = game.effective.winner === "A" ? teamA : game.effective.winner === "B" ? teamB : null;
        resultsByKey.set(rawGame.key, winner || null);
        game.projected_winner = winner || null;
        scenarioGames.push(game);
      });
      district.games = scenarioGames.filter((game) => game.district_id === district.id);
      district.champion = includeOverrides
        ? district.games.find((game) => game.round === "final")?.projected_winner || null
        : null;
      district.structure = structureNote(district.teams.length);
    });
    return scenarioGames;
  }

  function regularGamesForSport(sportGroup) {
    return allRegularGames()
      .filter((game) => game.sport_group === sportGroup)
      .map((game) => ({ ...game, effective: effectiveRegularGameState(game) }));
  }

  function regularGamesThroughCutoff(sportGroup) {
    return regularGamesForSport(sportGroup).filter((game) => compareIso(game.date, state.cutoff) <= 0);
  }

  function classRelevantRegularGames(sportGroup, classCode) {
    const teamSet = new Set(classTeamIds(sportGroup, classCode));
    return regularGamesForSport(sportGroup).filter((game) => teamSet.has(game.team_a_id) || teamSet.has(game.team_b_id));
  }

  function classRelevantExternalTeams(games) {
    return games
      .flatMap((game) => [game.team_a_id, game.team_b_id])
      .filter((teamId, index, arr) => arr.indexOf(teamId) === index)
      .map((teamId) => teamsById.get(teamId))
      .filter((team) => team?.is_external)
      .map((team) => {
        const baseline = externalBaselines(team.sport_group, state.cutoff)[team.team_id] || team.baseline || {};
        const override = state.externalOverrides[team.team_id] || {};
        const wins = parseIntSafe(override.wins ?? baseline.wins);
        const losses = parseIntSafe(override.losses ?? baseline.losses);
        const division = override.division && override.division !== "auto"
          ? Number(override.division)
          : baseline.division || divisionFromRecord({ wins, losses, ties: 0 });
        return {
          ...team,
          wins,
          losses,
          division,
          class_code: override.classCode || baseline.class_code || team.class_code,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function districtBlocks(district) {
    const seed = (n) => district.teams.find((team) => team.district_seed === n);
    const blocks = [];
    blocks.push([{ type: "team", team: seed(1) }]);
    if (district.teams.length >= 5) {
      const middle = [];
      if (seed(4)) middle.push({ type: "team", team: seed(4) });
      if (seed(5)) middle.push({ type: "team", team: seed(5) });
      middle.push({ type: "note", text: "Winner of 4 vs 5" });
      blocks.push(middle);
    } else if (seed(4)) {
      blocks.push([{ type: "team", team: seed(4) }]);
    }
    if (seed(2)) blocks.push([{ type: "team", team: seed(2) }]);
    if (seed(3)) blocks.push([{ type: "team", team: seed(3) }]);
    const extras = [seed(6), seed(7)].filter(Boolean);
    if (extras.length) {
      blocks.push([
        ...extras.map((team) => ({ type: "team", team })),
        { type: "note", text: district.teams.length === 7 ? "2 vs 7 and 3 vs 6 feed the opposite semifinal." : "3 vs 6 feeds seed 2." },
      ]);
    }
    return blocks;
  }

  function teamStatusText(game, side) {
    if (game.effective.mode === "official" && game.effective.scoreA != null && game.effective.scoreB != null) {
      const own = side === "A" ? game.effective.scoreA : game.effective.scoreB;
      const opp = side === "A" ? game.effective.scoreB : game.effective.scoreA;
      return `${own}-${opp}`;
    }
    if (game.effective.mode === "projected") {
      const projectedForTeam = (side === "A" && game.effective.winner === "A") || (side === "B" && game.effective.winner === "B");
      return projectedForTeam ? "Projected win" : "Projected loss";
    }
    if (game.effective.mode === "cancelled") return "Cancelled";
    return "Unplayed";
  }

  function draftKey(setId, gameId) {
    return `${setId}:${gameId}`;
  }

  function officialDraftFor(setId, gameId) {
    return state.officialDrafts[draftKey(setId, gameId)] || null;
  }

  function hasOfficialDraft(setId, gameId) {
    return Boolean(officialDraftFor(setId, gameId));
  }

  function displayMode(setId, game) {
    return hasOfficialDraft(setId, game.id) ? "official_draft" : game.effective.mode;
  }

  function displayScores(setId, game) {
    return officialDraftFor(setId, game.id) || {
      scoreA: game.effective.scoreA ?? "",
      scoreB: game.effective.scoreB ?? "",
    };
  }

  function scoreInputsComplete(scores) {
    return scores.scoreA !== "" && scores.scoreB !== "" && scores.scoreA != null && scores.scoreB != null;
  }

  function currentViewModel() {
    syncCustomTeamsIntoIndex();
    ensureSelectedTeamIsValid();

    const group = activeGroup();
    const regularGames = regularGamesForSport(state.sportGroup);
    const regularGamesCutoff = regularGames.filter((game) => compareIso(game.date, state.cutoff) <= 0);
    const regularSnapshot = buildSportSnapshot(state.sportGroup, regularGamesCutoff);
    const regularRanked = rankTeamsByClass(regularSnapshot, state.sportGroup, state.activeClass);
    const regularEligible = regularRanked.filter((team) => eligibleForBracket(team));
    const regularDistricts = serpentineDistricts(regularEligible, group.district_count, state.activeClass);
    const districtGames = buildDistrictScenarioGames(regularDistricts, {
      includeOverrides: state.scenarioSet === "districts",
    });
    const districtSnapshot = buildSportSnapshot(state.sportGroup, regularGamesCutoff, districtGames);
    const postDistrictRanked = rankTeamsByClass(districtSnapshot, state.sportGroup, state.activeClass);
    const postDistrictEligible = postDistrictRanked.filter((team) => eligibleForBracket(team));
    const championIds = new Set(regularDistricts.map((district) => district.champion?.team_id).filter(Boolean));
    const resolvedWildcard = postDistrictEligible.find((team) => !championIds.has(team.team_id)) || null;
    const qualifierIds = new Set([...championIds, resolvedWildcard?.team_id].filter(Boolean));
    const resolvedStateField = reseedTeams(postDistrictEligible.filter((team) => qualifierIds.has(team.team_id)).slice(0, 8));
    const seededStateField = reseedTeams((state.scenarioSet === "districts" ? postDistrictEligible : regularEligible).slice(0, 8));
    const stateField = resolvedStateField.length === 8 ? resolvedStateField : seededStateField;
    const wildcard = resolvedStateField.length === 8
      ? (resolvedStateField.find((team) => team.team_id === resolvedWildcard?.team_id) || null)
      : seededStateField[7] || null;

    const scenarioGames = state.scenarioSet === "districts"
      ? districtGames
      : classRelevantRegularGames(state.sportGroup, state.activeClass);

    const selectedTeam = (state.scenarioSet === "districts" ? districtSnapshot : regularSnapshot).get(state.selectedTeamId) || null;
    const selectedTeamSchedule = state.scenarioSet === "districts"
      ? districtGames.filter((game) => game.team_a_id === state.selectedTeamId || game.team_b_id === state.selectedTeamId)
      : classRelevantRegularGames(state.sportGroup, state.activeClass).filter((game) => game.team_a_id === state.selectedTeamId || game.team_b_id === state.selectedTeamId);

    return {
      group,
      regularGames,
      regularGamesCutoff,
      regularSnapshot,
      regularRanked,
      districts: regularDistricts,
      districtGames,
      districtSnapshot,
      postDistrictRanked,
      wildcard,
      stateField,
      selectedTeam,
      selectedTeamSchedule,
      groupTeams: getClassTeams(state.sportGroup, state.activeClass),
      externalTeams: classRelevantExternalTeams(classRelevantRegularGames(state.sportGroup, state.activeClass)),
      gameCenterGames: scenarioGames,
      customGameCount: state.customGames.filter((game) => game.sport_group === state.sportGroup).length,
      warnings: data.metadata.warnings?.[state.sportGroup] || [],
    };
  }

  function filterGameCenterGames(view) {
    const roundOrder = { play_in: 0, semifinal: 1, final: 2 };
    const search = state.teamSearch.trim().toLowerCase();
    return view.gameCenterGames
      .filter((game) => {
        if (state.scenarioSet === "districts" && state.districtRoundFilter !== "all") {
          return game.round === state.districtRoundFilter;
        }
        return true;
      })
      .filter((game) => {
        if (!search) return true;
        return `${game.team_a_name} ${game.team_b_name} ${game.label || ""}`.toLowerCase().includes(search);
      })
      .filter((game) => {
        const mode = displayMode(state.scenarioSet, game);
        if (state.gameFilter === "all") return true;
        if (state.gameFilter === "pending") return mode === "unplayed" || mode === "official_draft";
        if (state.gameFilter === "official") return mode === "official";
        return mode === state.gameFilter;
      })
      .sort((a, b) => {
        if (state.scenarioSet === "districts") {
          return a.district_id - b.district_id || roundOrder[a.round] - roundOrder[b.round] || a.label.localeCompare(b.label);
        }
        return compareIso(a.date, b.date) || a.team_a_name.localeCompare(b.team_a_name);
      });
  }

  function renderSummary(view) {
    const activeGames = state.scenarioSet === "districts" ? view.districtGames : classRelevantRegularGames(state.sportGroup, state.activeClass);
    const pendingCount = activeGames.filter((game) => game.effective.mode === "unplayed").length;
    els.wildcardStat.textContent = view.wildcard ? `${view.wildcard.seed}. ${view.wildcard.name} (${round(view.wildcard.average)})` : "None";
    els.pendingGamesStat.textContent = String(pendingCount);
    els.bubbleStat.textContent = view.stateField.length ? view.stateField.map((team) => `${team.seed}. ${team.name}`).join(", ") : "Not settled yet";
    const notes = [];
    notes.push(setLabel(state.scenarioSet));
    if (view.customGameCount) notes.push(`${view.customGameCount} custom games`);
    if (view.warnings.length) notes.push(`${view.warnings.length} model warnings`);
    els.noteStat.textContent = notes.join(" | ");
  }

  function districtCardHtml(district) {
    return `
      <article class="district-card">
        <div class="district-head">
          <div class="district-code">${district.code}</div>
          <div class="district-name">${district.name}</div>
          <div class="district-stage">${district.champion ? `Projected champion: ${district.champion.name}` : "Champion TBD"}</div>
        </div>
        <div class="district-body">
          ${districtBlocks(district).map((block, index) => `
            <section class="seed-block ${index === 1 ? "seed-block--accent" : ""}">
              ${block.map((item) => item.type === "team"
                ? `
                  <div class="seed-line">
                    <div class="seed-number">${item.team?.district_seed || "-"}</div>
                    <div class="seed-team">${item.team ? `${item.team.name} (${recordText(item.team.record)})` : "TBD"}</div>
                  </div>
                  <div class="seed-sub">${item.team ? round(item.team.average) : ""}</div>
                `
                : `<span class="playin-note">${item.text}</span>`
              ).join("")}
            </section>
          `).join("")}
          <div class="district-structure">${district.structure}</div>
        </div>
      </article>
    `;
  }

  function districtGameRowHtml(game) {
    return `
      <div class="district-match-row">
        <div>
          <div class="district-match-label">${game.label}</div>
          <div class="district-match-time">${districtRoundSchedule(game.round)}</div>
        </div>
        <div class="district-match-teams">
          <div>${game.team_a_name}</div>
          <div>${game.team_b_name}</div>
        </div>
      </div>
    `;
  }

  function districtBracketCardHtml(district) {
    return `
      <article class="district-card district-card--bracket">
        <div class="district-head">
          <div class="district-code">${district.code}</div>
          <div class="district-name">${district.name}</div>
          <div class="district-stage">${district.champion ? `Projected champion: ${district.champion.name}` : "Champion TBD"}</div>
        </div>
        <div class="district-body district-body--bracket">
          <section class="seed-block">
            <div class="district-round-heading">Seeds</div>
            ${district.teams.map((team) => `
              <div class="seed-line">
                <div class="seed-number">${team.district_seed}</div>
                <div class="seed-team">${team.name}</div>
              </div>
            `).join("")}
          </section>
          <section class="seed-block seed-block--accent">
            <div class="district-round-heading">Opening Round</div>
            ${district.games.filter((game) => game.round === "play_in").length
              ? district.games.filter((game) => game.round === "play_in").map((game) => districtGameRowHtml(game)).join("")
              : '<div class="district-round-empty">No play-in round in this district.</div>'}
          </section>
          <section class="seed-block">
            <div class="district-round-heading">Semifinals</div>
            ${district.games.filter((game) => game.round === "semifinal").map((game) => districtGameRowHtml(game)).join("")}
          </section>
          <section class="seed-block seed-block--accent">
            <div class="district-round-heading">Final</div>
            ${district.games.filter((game) => game.round === "final").map((game) => districtGameRowHtml(game)).join("")}
          </section>
        </div>
      </article>
    `;
  }

  function renderBoard(view) {
    const sideRanked = state.scenarioSet === "districts" ? view.postDistrictRanked : view.regularRanked;
    els.boardView.innerHTML = `
      <section class="board-wrap">
        <div class="board-header">
          <div>
            <div class="board-kicker">${sportLabel(state.sportGroup)} Workbench / ${classLabel(state.activeClass)} / ${setLabel(state.scenarioSet)}</div>
            <div class="board-title">${boardTitle(state.sportGroup, state.activeClass, state.scenarioSet)}</div>
            <div class="board-meta">Cross-class games stay inside the shared ${sportLabel(state.sportGroup).toLowerCase()} engine. Districts inherit the current regular-season snapshot through ${state.cutoff}.</div>
          </div>
          <div class="panel-note">Use the dedicated export buttons for board, district, and state posters.</div>
        </div>
        <div class="board-summary-grid">
          <section class="panel">
            <h3>${state.scenarioSet === "districts" ? "Projected State Field" : "State Seed Line"}</h3>
            <div class="mini-list">
              ${view.stateField.length ? view.stateField.map((team) => `
                <div class="mini-row"><span>${team.seed}. ${team.name}</span><span>${round(team.average)}</span></div>
              `).join("") : '<div class="empty-state">No field yet.</div>'}
            </div>
          </section>
          <section class="panel">
            <h3>${state.scenarioSet === "districts" ? "Projected District Winners" : "Current Wildcard Points"}</h3>
            <div class="mini-list">
              ${sideRanked.slice(0, 8).map((team) => `
                <div class="mini-row"><span>${team.seed}. ${team.name}</span><span>${round(team.average)}</span></div>
              `).join("")}
            </div>
          </section>
          <section class="panel">
            <h3>Projected Wildcard</h3>
            ${view.wildcard ? `
              <div class="mini-list">
                <div class="mini-row"><span>${view.wildcard.seed}. ${view.wildcard.name}</span><span>${round(view.wildcard.average)}</span></div>
                <div class="mini-row"><span>Record</span><span>${recordText(view.wildcard.record)}</span></div>
              </div>
            ` : '<div class="empty-state">No wildcard yet.</div>'}
          </section>
        </div>
        <div class="district-grid ${state.scenarioSet === "districts" ? "district-grid--bracket" : ""}">
          ${view.districts.map((district) => state.scenarioSet === "districts" ? districtBracketCardHtml(district) : districtCardHtml(district)).join("")}
        </div>
      </section>
    `;
  }

  function gamePillClass(mode) {
    return {
      unplayed: "pill-unplayed",
      projected: "pill-projected",
      official: "pill-official",
      official_draft: "pill-draft",
      cancelled: "pill-cancelled",
    }[mode] || "pill-unplayed";
  }

  function modeSelectOptions(game) {
    const sourceLabel = state.scenarioSet === "districts" ? "Use Default Projection" : "Use Imported State";
    const modeValue = state.scenarioSet === "districts"
      ? (state.districtOverrides[game.id]?.mode === "projected"
        ? (state.districtOverrides[game.id]?.winner === "A" ? "projected_a" : "projected_b")
        : state.districtOverrides[game.id]?.mode || (game.effective.mode === "projected" ? (game.effective.winner === "A" ? "projected_a" : "projected_b") : game.effective.mode))
      : (state.regularOverrides[game.id]?.mode === "projected"
        ? (state.regularOverrides[game.id]?.winner === "A" ? "projected_a" : "projected_b")
        : state.regularOverrides[game.id]?.mode || game.effective.mode);
    if (hasOfficialDraft(state.scenarioSet, game.id)) {
      return `
        <option value="source">${sourceLabel}</option>
        <option value="projected_a">Project ${game.team_a_name}</option>
        <option value="projected_b">Project ${game.team_b_name}</option>
        <option value="official" selected>Official Score</option>
        <option value="unplayed">Unplayed</option>
        <option value="cancelled">Cancelled</option>
      `;
    }
    return `
      <option value="source" ${modeValue === "source" ? "selected" : ""}>${sourceLabel}</option>
      <option value="projected_a" ${modeValue === "projected_a" ? "selected" : ""}>Project ${game.team_a_name}</option>
      <option value="projected_b" ${modeValue === "projected_b" ? "selected" : ""}>Project ${game.team_b_name}</option>
      <option value="official" ${modeValue === "official" ? "selected" : ""}>Official Score</option>
      <option value="unplayed" ${modeValue === "unplayed" ? "selected" : ""}>Unplayed</option>
      <option value="cancelled" ${modeValue === "cancelled" ? "selected" : ""}>Cancelled</option>
    `;
  }

  function gameCardHtml(game) {
    const mode = displayMode(state.scenarioSet, game);
    const scores = displayScores(state.scenarioSet, game);
    return `
      <article class="game-card">
        <div class="game-top">
          <div>
            <div class="game-title">${game.team_a_name} vs ${game.team_b_name}</div>
            <div class="game-subtitle">
              ${state.scenarioSet === "districts"
                ? `<span>${game.district_code}</span><span>${game.label}</span>`
                : `<span>${game.date_label || game.date}</span><span>${game.tournament || "Regular season"}</span>`}
              ${game.is_custom ? "<span>Custom</span>" : ""}
            </div>
          </div>
          <span class="pill ${gamePillClass(mode)}">${mode === "official_draft" ? "official draft" : mode}</span>
        </div>
        <div class="game-subtitle">
          ${state.scenarioSet === "districts"
            ? `<span>${districtRoundSchedule(game.round)}</span><span>${game.probability != null ? `MRI ${(game.probability * 100).toFixed(1)}% ${game.team_a_name}` : "No MRI matchup found"}</span>`
            : `<span>${game.notes || "No note"}</span>`}
        </div>
        <div class="game-controls">
          <label>
            Status
            <select data-mode-select="${state.scenarioSet}:${game.id}">
              ${modeSelectOptions(game)}
            </select>
          </label>
          ${state.scenarioSet === "regular_season" && game.is_custom ? `<button type="button" class="button-secondary" data-remove-custom-game="${game.id}">Remove Custom Game</button>` : ""}
        </div>
        ${(mode === "official" || mode === "official_draft") ? `
          <div class="game-controls game-controls--official">
            <label>${game.team_a_name}<input type="number" min="0" value="${scores.scoreA ?? ""}" data-score-input="${state.scenarioSet}:${game.id}:scoreA"></label>
            <label>${game.team_b_name}<input type="number" min="0" value="${scores.scoreB ?? ""}" data-score-input="${state.scenarioSet}:${game.id}:scoreB"></label>
            <div class="score-draft-actions">
              <button type="button" data-commit-official="${state.scenarioSet}:${game.id}" ${scoreInputsComplete(scores) ? "" : "disabled"}>Save Official</button>
              <button type="button" class="button-secondary" data-cancel-official="${state.scenarioSet}:${game.id}">Cancel</button>
            </div>
          </div>
        ` : ""}
      </article>
    `;
  }

  function renderGames(view, options = {}) {
    const filtered = filterGameCenterGames(view);
    els.gamesView.innerHTML = `
      <section class="pending-wrap">
        <div class="panel">
          <h3>Game Center</h3>
          <div class="panel-note">${state.scenarioSet === "districts" ? "District games inherit the current regular-season snapshot and can be re-picked or scored here." : "Regular-season games for the active class stay visible even after projection or official scoring."}</div>
          <div class="game-toolbar">
            <label>
              Search
              <input id="gameSearchInput" type="search" value="${state.teamSearch}" placeholder="Search teams or round">
            </label>
            <label>
              Status Filter
              <select id="gameFilterSelect">
                <option value="pending" ${state.gameFilter === "pending" ? "selected" : ""}>Pending</option>
                <option value="projected" ${state.gameFilter === "projected" ? "selected" : ""}>Projected</option>
                <option value="official" ${state.gameFilter === "official" ? "selected" : ""}>Official</option>
                <option value="all" ${state.gameFilter === "all" ? "selected" : ""}>All</option>
              </select>
            </label>
            ${state.scenarioSet === "districts" ? `
              <label>
                Round
                <select id="districtRoundFilter">
                  <option value="all" ${state.districtRoundFilter === "all" ? "selected" : ""}>All rounds</option>
                  <option value="play_in" ${state.districtRoundFilter === "play_in" ? "selected" : ""}>Opening round</option>
                  <option value="semifinal" ${state.districtRoundFilter === "semifinal" ? "selected" : ""}>Semifinals</option>
                  <option value="final" ${state.districtRoundFilter === "final" ? "selected" : ""}>Final</option>
                </select>
              </label>
            ` : '<div></div>'}
            <button type="button" id="autoProjectButton">Project Visible Games</button>
            <button type="button" id="clearProjectButton" class="button-secondary">Clear Visible Projections</button>
          </div>
        </div>
        <div class="game-list">
          ${filtered.length ? filtered.map((game) => gameCardHtml(game)).join("") : '<div class="empty-state">No games match the current filters.</div>'}
        </div>
      </section>
    `;

    const searchInput = document.getElementById("gameSearchInput");
    const filterSelect = document.getElementById("gameFilterSelect");
    const roundSelect = document.getElementById("districtRoundFilter");
    if (options.restoreSearchFocus && searchInput) {
      searchInput.focus();
      const start = Number.isFinite(options.selectionStart) ? options.selectionStart : searchInput.value.length;
      const end = Number.isFinite(options.selectionEnd) ? options.selectionEnd : start;
      searchInput.setSelectionRange(start, end);
    }
    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        state.teamSearch = event.target.value;
        const nextView = currentViewModel();
        renderGames(nextView, {
          restoreSearchFocus: true,
          selectionStart: event.target.selectionStart,
          selectionEnd: event.target.selectionEnd,
        });
      });
    }
    if (filterSelect) {
      filterSelect.addEventListener("change", (event) => {
        state.gameFilter = event.target.value;
        render();
      });
    }
    if (roundSelect) {
      roundSelect.addEventListener("change", (event) => {
        state.districtRoundFilter = event.target.value;
        render();
      });
    }

    const autoBtn = document.getElementById("autoProjectButton");
    const clearBtn = document.getElementById("clearProjectButton");
    if (autoBtn) autoBtn.addEventListener("click", () => autoProjectFilteredGames(filtered));
    if (clearBtn) clearBtn.addEventListener("click", () => clearProjectedFilteredGames(filtered));
    bindGameControls(els.gamesView);
  }

  function autoProjectFilteredGames(games) {
    const bucket = overrideBucket(state.scenarioSet);
    games.forEach((game) => {
      if (!game.team_a_id || !game.team_b_id) return;
      const probability = state.scenarioSet === "districts"
        ? game.probability
        : computeProbability(game);
      const winner = probability == null ? "A" : probability >= 0.5 ? "A" : "B";
      bucket[game.id] = { ...(bucket[game.id] || {}), mode: "projected", winner };
    });
    saveOverrideBucket(state.scenarioSet);
    render();
  }

  function clearProjectedFilteredGames(games) {
    const bucket = overrideBucket(state.scenarioSet);
    games.forEach((game) => {
      if (bucket[game.id]?.mode === "projected") delete bucket[game.id];
    });
    saveOverrideBucket(state.scenarioSet);
    render();
  }

  function bindGameControls(root) {
    root.querySelectorAll("[data-mode-select]").forEach((select) => {
      select.addEventListener("change", (event) => {
        const [setId, gameId] = event.target.dataset.modeSelect.split(":");
        const value = event.target.value;
        const bucket = overrideBucket(setId);
        const current = bucket[gameId] || {};
        delete state.officialDrafts[draftKey(setId, gameId)];
        if (value === "source") delete bucket[gameId];
        else if (value === "projected_a") bucket[gameId] = { ...current, mode: "projected", winner: "A" };
        else if (value === "projected_b") bucket[gameId] = { ...current, mode: "projected", winner: "B" };
        else if (value === "official") {
          state.officialDrafts[draftKey(setId, gameId)] = {
            scoreA: current.scoreA ?? "",
            scoreB: current.scoreB ?? "",
          };
        } else bucket[gameId] = { ...current, mode: value };
        saveOverrideBucket(setId);
        render();
      });
    });

    root.querySelectorAll("[data-score-input]").forEach((input) => {
      input.addEventListener("input", (event) => {
        const [setId, gameId, side] = event.target.dataset.scoreInput.split(":");
        const key = draftKey(setId, gameId);
        const existing = officialDraftFor(setId, gameId) || displayScores(setId, { id: gameId, effective: { scoreA: "", scoreB: "" } });
        state.officialDrafts[key] = { ...existing, [side]: event.target.value };
        const commitButton = root.querySelector(`[data-commit-official="${setId}:${gameId}"]`);
        if (commitButton) commitButton.disabled = !scoreInputsComplete(state.officialDrafts[key]);
      });
    });

    root.querySelectorAll("[data-commit-official]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const [setId, gameId] = event.target.dataset.commitOfficial.split(":");
        const scores = officialDraftFor(setId, gameId);
        if (!scores || !scoreInputsComplete(scores)) return;
        const bucket = overrideBucket(setId);
        bucket[gameId] = {
          ...(bucket[gameId] || {}),
          mode: "official",
          scoreA: scores.scoreA,
          scoreB: scores.scoreB,
        };
        delete state.officialDrafts[draftKey(setId, gameId)];
        saveOverrideBucket(setId);
        render();
      });
    });

    root.querySelectorAll("[data-cancel-official]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const [setId, gameId] = event.target.dataset.cancelOfficial.split(":");
        delete state.officialDrafts[draftKey(setId, gameId)];
        render();
      });
    });

    root.querySelectorAll("[data-remove-custom-game]").forEach((button) => {
      button.addEventListener("click", (event) => {
        removeCustomGame(event.target.dataset.removeCustomGame);
      });
    });
  }

  function teamScheduleCardHtml(entry) {
    const teamIsA = entry.team_a_id === state.selectedTeamId;
    const status = teamStatusText(entry, teamIsA ? "A" : "B");
    const mode = displayMode(state.scenarioSet, entry);
    const scores = displayScores(state.scenarioSet, entry);
    return `
      <article class="team-schedule-card">
        <div class="team-schedule-top">
          <div>
            <h4>${teamIsA ? entry.team_b_name : entry.team_a_name}</h4>
            <div class="schedule-meta">
              <span>${state.scenarioSet === "districts" ? `${entry.district_code} / ${entry.label}` : (entry.date_label || entry.date)}</span>
              <span>${entry.stage === "district" ? "District game" : "Regular season"}</span>
            </div>
          </div>
          <div class="team-actions">
            <span class="pill ${gamePillClass(mode)}">${mode === "official_draft" ? "official draft" : status}</span>
            ${state.scenarioSet === "regular_season" && entry.is_custom ? `<button type="button" class="button-secondary" data-remove-custom-game="${entry.id}">Remove</button>` : ""}
          </div>
        </div>
        <div class="game-controls">
          <label>
            Status
            <select data-mode-select="${state.scenarioSet}:${entry.id}">
              ${modeSelectOptions(entry)}
            </select>
          </label>
        </div>
        ${(mode === "official" || mode === "official_draft") ? `
          <div class="game-controls game-controls--official">
            <label>${entry.team_a_name}<input type="number" min="0" value="${scores.scoreA ?? ""}" data-score-input="${state.scenarioSet}:${entry.id}:scoreA"></label>
            <label>${entry.team_b_name}<input type="number" min="0" value="${scores.scoreB ?? ""}" data-score-input="${state.scenarioSet}:${entry.id}:scoreB"></label>
            <div class="score-draft-actions">
              <button type="button" data-commit-official="${state.scenarioSet}:${entry.id}" ${scoreInputsComplete(scores) ? "" : "disabled"}>Save Official</button>
              <button type="button" class="button-secondary" data-cancel-official="${state.scenarioSet}:${entry.id}">Cancel</button>
            </div>
          </div>
        ` : ""}
      </article>
    `;
  }

  function addPotentialGame(formData) {
    if (!state.selectedTeamId) return;
    const date = String(formData.get("date") || "").trim();
    if (!date) return;
    const team = teamsById.get(state.selectedTeamId);
    if (!team) return;
    const opponentMode = formData.get("opponentMode");

    let opponentId = String(formData.get("opponentId") || "").trim();
    let opponentName = teamsById.get(opponentId)?.name || "";
    let customOpponent = null;

    if (opponentMode === "custom") {
      opponentName = String(formData.get("customName") || "").trim();
      if (!opponentName) return;
      opponentId = `custom-team-${slugify(opponentName)}-${Date.now()}`;
      customOpponent = {
        team_id: opponentId,
        name: opponentName,
        sport_group: state.sportGroup,
        class_code: formData.get("customClass") || "OOS",
        wins: parseIntSafe(formData.get("customWins")),
        losses: parseIntSafe(formData.get("customLosses")),
        division: formData.get("customDivision") || "auto",
      };
    } else if (!opponentId || opponentId === state.selectedTeamId) {
      return;
    }

    const customGame = {
      id: `custom-game-${Date.now()}`,
      sport_group: state.sportGroup,
      stage: "regular_season",
      is_custom: true,
      linked_workbench_team: opponentMode === "existing",
      date,
      date_label: date,
      tournament: String(formData.get("tournament") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
      source_status: "unplayed",
      source_score_a: null,
      source_score_b: null,
      team_a_id: state.selectedTeamId,
      team_b_id: opponentId,
      team_a_name: team.name,
      team_b_name: opponentName,
      source_rows: [],
      custom_opponent: customOpponent,
    };
    state.customGames = [...state.customGames, customGame];
    saveJson(STORAGE_KEYS.customGames, state.customGames);
    render();
  }

  function removeCustomGame(gameId) {
    delete state.regularOverrides[gameId];
    state.customGames = state.customGames.filter((game) => game.id !== gameId);
    saveJson(STORAGE_KEYS.regularOverrides, state.regularOverrides);
    saveJson(STORAGE_KEYS.customGames, state.customGames);
    render();
  }

  function resetAllLocalEdits() {
    state.regularOverrides = {};
    state.districtOverrides = {};
    state.externalOverrides = {};
    state.customGames = [];
    state.officialDrafts = {};
    state.teamSearch = "";
    state.gameFilter = "pending";
    state.districtRoundFilter = "all";
    state.projectStateBracket = false;
    clearStoredState();
    render();
  }

  function renderTeam(view) {
    const workbenchOpponents = Array.from(teamsById.values())
      .filter((team) => team.sport_group === state.sportGroup && !team.is_external && team.team_id !== state.selectedTeamId)
      .sort((a, b) => a.name.localeCompare(b.name));

    els.teamView.innerHTML = `
      <section class="team-wrap">
        <div class="team-grid">
          <aside class="panel">
            <h3>Team Focus</h3>
            <div class="team-form">
              <label>
                Team
                <select id="teamSelect">
                  ${view.groupTeams.map((team) => `<option value="${team.team_id}" ${team.team_id === state.selectedTeamId ? "selected" : ""}>${team.name}</option>`).join("")}
                </select>
              </label>
              ${view.selectedTeam ? `
                <div class="table-metrics">
                  <div class="metric"><span>Record</span><span>${recordText(view.selectedTeam.record)}</span></div>
                  <div class="metric"><span>Average</span><span>${round(view.selectedTeam.average)}</span></div>
                  <div class="metric"><span>Division</span><span>${view.selectedTeam.division}</span></div>
                </div>
              ` : '<div class="empty-state">No team selected.</div>'}
            </div>
          </aside>
          <section class="panel">
            <h3>${state.scenarioSet === "regular_season" ? "Add Regular-Season Game" : "District Schedule"}</h3>
            ${state.scenarioSet === "regular_season" ? `
              <div class="panel-note">Linked workbench games only need to be added once. External opponents still support manual class, record, and division.</div>
              <form id="addPotentialGameForm" class="team-form">
                <div class="team-form-grid">
                  <label>Date<input name="date" type="date" value="${state.cutoff}"></label>
                  <label>Tournament / Event<input name="tournament" type="text" placeholder="Metro Tournament"></label>
                </div>
                <div class="team-form-grid">
                  <label>Opponent Source
                    <select name="opponentMode" id="opponentMode">
                      <option value="existing">Workbench Team</option>
                      <option value="custom">External / Custom Opponent</option>
                    </select>
                  </label>
                  <label>Notes<input name="notes" type="text" placeholder="Semifinal placeholder"></label>
                </div>
                <div class="opponent-picker" id="existingOpponentFields">
                  <label>Opponent
                    <select name="opponentId">
                      ${workbenchOpponents.map((team) => `<option value="${team.team_id}">${team.name} (${classLabel(team.class_code)})</option>`).join("")}
                    </select>
                  </label>
                </div>
                <div class="opponent-picker is-hidden" id="customOpponentFields">
                  <div class="team-form-grid">
                    <label>Opponent Name<input name="customName" type="text" placeholder="St. Thomas More"></label>
                    <label>Class
                      <select name="customClass">
                        <option value="OOS">OOS</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                      </select>
                    </label>
                  </div>
                  <div class="team-form-grid--three">
                    <label>Wins<input name="customWins" type="number" min="0" value="0"></label>
                    <label>Losses<input name="customLosses" type="number" min="0" value="0"></label>
                    <label>Division
                      <select name="customDivision">
                        <option value="auto">Auto</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                      </select>
                    </label>
                  </div>
                </div>
                <div class="panel-actions">
                  <button type="submit">Add Game</button>
                </div>
                <div class="tiny-note">If the opponent is already in the boys or girls workbench, choose that team so the matchup is shared everywhere automatically.</div>
              </form>
            ` : `
              <div class="empty-state">District games are generated automatically from the current regular-season seed line. Use Game Center or the schedule below to pick winners or enter official scores.</div>
            `}
          </section>
        </div>
        <section class="panel">
          <h3>${view.selectedTeam?.name || "Team"} Schedule</h3>
          <div class="panel-note">${state.scenarioSet === "districts" ? "District-set schedule shown here." : "Regular-season schedule shown here, including linked custom games."}</div>
          <div class="game-list">
            ${view.selectedTeamSchedule.length ? view.selectedTeamSchedule.map((entry) => teamScheduleCardHtml(entry)).join("") : '<div class="empty-state">No games found for this team in the active set.</div>'}
          </div>
        </section>
      </section>
    `;

    const teamSelect = document.getElementById("teamSelect");
    if (teamSelect) {
      teamSelect.addEventListener("change", (event) => {
        state.selectedTeamId = event.target.value;
        render();
      });
    }

    if (state.scenarioSet === "regular_season") {
      const opponentMode = document.getElementById("opponentMode");
      const existingFields = document.getElementById("existingOpponentFields");
      const customFields = document.getElementById("customOpponentFields");
      if (opponentMode && existingFields && customFields) {
        opponentMode.addEventListener("change", () => {
          const custom = opponentMode.value === "custom";
          existingFields.classList.toggle("is-hidden", custom);
          customFields.classList.toggle("is-hidden", !custom);
        });
      }

      const form = document.getElementById("addPotentialGameForm");
      if (form) {
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          addPotentialGame(new FormData(form));
        });
      }
    }

    bindGameControls(els.teamView);
  }

  function renderStandings(view) {
    const ranked = state.scenarioSet === "districts" ? view.postDistrictRanked : view.regularRanked;
    els.standingsView.innerHTML = `
      <section class="standings-wrap">
        <div class="panel">
          <h3>${classLabel(state.activeClass)} Seeds</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Seed</th>
                  <th>Team</th>
                  <th>Record</th>
                  <th>Average</th>
                  <th>Division</th>
                  <th>1st Div In Class</th>
                  <th>Opp Win %</th>
                </tr>
              </thead>
              <tbody>
                ${ranked.map((team) => `
                  <tr>
                    <td>${team.seed}</td>
                    <td>${team.name}</td>
                    <td>${recordText(team.record)}</td>
                    <td>${round(team.average)}</td>
                    <td>${team.division}</td>
                    <td>${team.first_division_in_class_games}</td>
                    <td>${round(team.opponents_win_pct)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }

  function stateBracket(stateField, { project = false } = {}) {
    const bySeed = new Map(stateField.map((team) => [team.seed, team]));
    const q1 = { label: "Quarterfinal 1", teamA: bySeed.get(1), teamB: bySeed.get(8), teamALabel: bySeed.get(1) ? `#1 ${bySeed.get(1).name}` : "Seed 1", teamBLabel: bySeed.get(8) ? `#8 ${bySeed.get(8).name}` : "Seed 8" };
    const q2 = { label: "Quarterfinal 2", teamA: bySeed.get(4), teamB: bySeed.get(5), teamALabel: bySeed.get(4) ? `#4 ${bySeed.get(4).name}` : "Seed 4", teamBLabel: bySeed.get(5) ? `#5 ${bySeed.get(5).name}` : "Seed 5" };
    const q3 = { label: "Quarterfinal 3", teamA: bySeed.get(2), teamB: bySeed.get(7), teamALabel: bySeed.get(2) ? `#2 ${bySeed.get(2).name}` : "Seed 2", teamBLabel: bySeed.get(7) ? `#7 ${bySeed.get(7).name}` : "Seed 7" };
    const q4 = { label: "Quarterfinal 4", teamA: bySeed.get(3), teamB: bySeed.get(6), teamALabel: bySeed.get(3) ? `#3 ${bySeed.get(3).name}` : "Seed 3", teamBLabel: bySeed.get(6) ? `#6 ${bySeed.get(6).name}` : "Seed 6" };
    q1.winner = project ? projectedWinner(q1.teamA, q1.teamB) : null;
    q2.winner = project ? projectedWinner(q2.teamA, q2.teamB) : null;
    q3.winner = project ? projectedWinner(q3.teamA, q3.teamB) : null;
    q4.winner = project ? projectedWinner(q4.teamA, q4.teamB) : null;
    const s1 = {
      label: "Semifinal 1",
      teamA: project ? q1.winner : null,
      teamB: project ? q2.winner : null,
      teamALabel: project ? (q1.winner?.name || "Winner Quarterfinal 1") : "Winner Game 1",
      teamBLabel: project ? (q2.winner?.name || "Winner Quarterfinal 2") : "Winner Game 2",
    };
    const s2 = {
      label: "Semifinal 2",
      teamA: project ? q3.winner : null,
      teamB: project ? q4.winner : null,
      teamALabel: project ? (q3.winner?.name || "Winner Quarterfinal 3") : "Winner Game 3",
      teamBLabel: project ? (q4.winner?.name || "Winner Quarterfinal 4") : "Winner Game 4",
    };
    s1.winner = project ? projectedWinner(s1.teamA, s1.teamB) : null;
    s2.winner = project ? projectedWinner(s2.teamA, s2.teamB) : null;
    const f1 = {
      label: "Championship",
      teamA: project ? s1.winner : null,
      teamB: project ? s2.winner : null,
      teamALabel: project ? (s1.winner?.name || "Winner Semifinal 1") : "Winner Semifinal 1",
      teamBLabel: project ? (s2.winner?.name || "Winner Semifinal 2") : "Winner Semifinal 2",
    };
    f1.winner = project ? projectedWinner(f1.teamA, f1.teamB) : null;
    return { quarters: [q1, q2, q3, q4], semis: [s1, s2], final: f1 };
  }

  function stateGameHtml(game, scheduleLabel, resultLabel) {
    return `
      <div class="state-game">
        <div class="state-game-label">${game.label}</div>
        <div class="state-game-time">${scheduleLabel}</div>
        <div class="state-team-line">${game.teamALabel || "TBD"}</div>
        <div class="state-team-line">${game.teamBLabel || "TBD"}</div>
        ${resultLabel ? `<strong>${resultLabel}</strong>` : ""}
      </div>
    `;
  }

  function renderState(view) {
    const bracket = stateBracket(view.stateField, { project: state.projectStateBracket });
    const schedule = stateSchedule();
    els.stateView.innerHTML = `
      <section class="state-wrap">
        <div class="panel">
          <h3>${state.scenarioSet === "districts" ? "State Field" : "State Seed Line"}</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Seed</th>
                  <th>Team</th>
                  <th>Record</th>
                  <th>Average</th>
                </tr>
              </thead>
              <tbody>
                ${view.stateField.map((team) => `
                  <tr>
                    <td>${team.seed}</td>
                    <td>${team.name}</td>
                    <td>${recordText(team.record)}</td>
                    <td>${round(team.average)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
          <div class="state-site">Creighton University, Omaha</div>
        </div>
        <div class="panel">
          <div class="panel-actions">
            <h3>${state.projectStateBracket ? "Projected State Bracket" : "State Bracket"}</h3>
            <button type="button" id="toggleStateProjectionButton" class="button-secondary">${state.projectStateBracket ? "Stop Projecting State" : "Project State Bracket"}</button>
          </div>
          <div class="state-bracket">
            <div class="state-column">
              <h4>Quarterfinals</h4>
              <div class="state-game-list">${bracket.quarters.map((game, index) => stateGameHtml(game, schedule?.quarterfinals?.[index] || "", state.projectStateBracket && game.winner ? `${game.winner.name} advances` : "")).join("")}</div>
            </div>
            <div class="state-column">
              <h4>Semifinals</h4>
              <div class="state-game-list state-game-list--semis">${bracket.semis.map((game, index) => stateGameHtml(game, schedule?.semifinals?.[index] || "", state.projectStateBracket && game.winner ? `${game.winner.name} advances` : "")).join("")}</div>
            </div>
            <div class="state-column">
              <h4>Final</h4>
              <div class="state-game-list state-game-list--final">${stateGameHtml(bracket.final, schedule?.final || "", state.projectStateBracket && bracket.final.winner ? `${bracket.final.winner.name} projected champion` : "")}</div>
            </div>
          </div>
        </div>
      </section>
    `;

    const toggleStateProjectionButton = document.getElementById("toggleStateProjectionButton");
    if (toggleStateProjectionButton) {
      toggleStateProjectionButton.addEventListener("click", () => {
        state.projectStateBracket = !state.projectStateBracket;
        render();
      });
    }
  }

  function renderOOS(view) {
    els.oosView.innerHTML = `
      <section class="oos-wrap">
        <div class="panel">
          <h3>External Opponent Overrides</h3>
          <div class="panel-note">These apply to true external or manually created opponents used by the shared workbench engine.</div>
        </div>
        <div class="oos-grid">
          ${view.externalTeams.length ? view.externalTeams.map((team) => `
            <article class="oos-card">
              <h4>${team.name}</h4>
              <div class="oos-controls">
                <label>Wins<input type="text" inputmode="numeric" value="${team.wins}" data-oos-team="${team.team_id}" data-oos-field="wins"></label>
                <label>Losses<input type="text" inputmode="numeric" value="${team.losses}" data-oos-team="${team.team_id}" data-oos-field="losses"></label>
                <label>Class
                  <select data-oos-team="${team.team_id}" data-oos-field="classCode">
                    <option value="A" ${team.class_code === "A" ? "selected" : ""}>A</option>
                    <option value="B" ${team.class_code === "B" ? "selected" : ""}>B</option>
                    <option value="OOS" ${team.class_code !== "A" && team.class_code !== "B" ? "selected" : ""}>OOS</option>
                  </select>
                </label>
              </div>
              <div class="oos-controls">
                <label>Division
                  <select data-oos-team="${team.team_id}" data-oos-field="division">
                    <option value="auto" ${!(state.externalOverrides[team.team_id]?.division) || state.externalOverrides[team.team_id]?.division === "auto" ? "selected" : ""}>Auto</option>
                    <option value="1" ${state.externalOverrides[team.team_id]?.division === "1" ? "selected" : ""}>1</option>
                    <option value="2" ${state.externalOverrides[team.team_id]?.division === "2" ? "selected" : ""}>2</option>
                    <option value="3" ${state.externalOverrides[team.team_id]?.division === "3" ? "selected" : ""}>3</option>
                    <option value="4" ${state.externalOverrides[team.team_id]?.division === "4" ? "selected" : ""}>4</option>
                  </select>
                </label>
                <div class="panel-note">Current division: ${team.division}</div>
                <button type="button" data-oos-apply="${team.team_id}">Apply</button>
                <button type="button" class="button-secondary" data-oos-reset="${team.team_id}">Reset</button>
              </div>
            </article>
          `).join("") : '<div class="empty-state">No external opponents attached to this class yet.</div>'}
        </div>
      </section>
    `;

    els.oosView.querySelectorAll("[data-oos-apply]").forEach((button) => {
      button.addEventListener("click", (event) => {
        const teamId = event.target.dataset.oosApply;
        const current = state.externalOverrides[teamId] || {};
        els.oosView.querySelectorAll(`[data-oos-team="${teamId}"]`).forEach((field) => {
          current[field.dataset.oosField] = field.value;
        });
        state.externalOverrides[teamId] = current;
        saveJson(STORAGE_KEYS.externalOverrides, state.externalOverrides);
        render();
      });
    });
    els.oosView.querySelectorAll("[data-oos-reset]").forEach((button) => {
      button.addEventListener("click", (event) => {
        delete state.externalOverrides[event.target.dataset.oosReset];
        saveJson(STORAGE_KEYS.externalOverrides, state.externalOverrides);
        render();
      });
    });
  }

  function setActiveContext() {
    els.sportTabs.querySelectorAll("[data-sport]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.sport === state.sportGroup);
    });
    els.classTabs.querySelectorAll("[data-class]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.class === state.activeClass);
    });
    els.setTabs.querySelectorAll("[data-set]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.set === state.scenarioSet);
    });
    els.viewTabs.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === state.activeView);
    });
  }

  function setActiveView() {
    ["board", "games", "team", "standings", "state", "oos"].forEach((viewName) => {
      els[`${viewName}View`].classList.toggle("is-hidden", state.activeView !== viewName);
    });
  }

  function createPosterCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f5f1e8";
    ctx.fillRect(0, 0, width, height);
    return { canvas, ctx };
  }

  function downloadCanvas(canvas, filename) {
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/jpeg", 0.94);
    link.download = filename;
    link.click();
  }

  function setupExportCanvas(width, height, scale = 2) {
    const { canvas, ctx } = createPosterCanvas(width * scale, height * scale);
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;
    return { canvas, ctx, width, height, scale };
  }

  function roundRectPath(ctx, x, y, width, height, radius = 14) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function fillRoundRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle = null, lineWidth = 1) {
    roundRectPath(ctx, x, y, width, height, radius);
    ctx.fillStyle = fillStyle;
    ctx.fill();
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  function wrapLines(ctx, text, maxWidth) {
    const words = String(text || "").split(" ");
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const candidate = `${line}${word} `;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line.trim());
        line = `${word} `;
      } else {
        line = candidate;
      }
    });
    if (line.trim()) lines.push(line.trim());
    return lines.length ? lines : [""];
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, options = {}) {
    const { align = "left", color = ctx.fillStyle, font = ctx.font } = options;
    const lines = wrapLines(ctx, text, maxWidth);
    ctx.save();
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.font = font;
    lines.forEach((line, index) => {
      ctx.fillText(line, x, y + (index * lineHeight));
    });
    ctx.restore();
    return lines.length;
  }

  function measureWrappedHeight(ctx, text, maxWidth, lineHeight, minLines = 1) {
    return Math.max(minLines, wrapLines(ctx, text, maxWidth).length) * lineHeight;
  }

  function drawPanelCard(ctx, x, y, width, height) {
    fillRoundRect(ctx, x, y, width, height, 14, "#fffdfa", "#d9d1c0", 1);
  }

  function drawStateGameCard(ctx, game, scheduleLabel, x, y, width, height) {
    fillRoundRect(ctx, x, y, width, height, 12, "#fffdfa", "#d9d1c0", 2);
    ctx.fillStyle = "#676154";
    ctx.font = "800 12px Inter";
    drawWrappedText(ctx, game.label, x + 18, y + 32, width - 36, 14, { font: "800 12px Inter", color: "#676154" });

    ctx.fillStyle = "#1f5a43";
    drawWrappedText(ctx, scheduleLabel, x + 18, y + 58, width - 36, 18, { font: "700 14px Inter", color: "#1f5a43" });

    ctx.fillStyle = "#141414";
    const firstY = y + 98;
    const secondY = firstY + measureWrappedHeight(ctx, game.teamALabel || "TBD", width - 36, 20, 1) + 10;
    drawWrappedText(ctx, game.teamALabel || "TBD", x + 18, firstY, width - 36, 20, { font: "700 16px Inter", color: "#141414" });
    drawWrappedText(ctx, game.teamBLabel || "TBD", x + 18, secondY, width - 36, 20, { font: "700 16px Inter", color: "#141414" });
  }

  function renderStateViewToCanvas(view) {
    const bracket = stateBracket(view.stateField, { project: state.projectStateBracket });
    const schedule = stateSchedule();
    const width = 1560;
    const leftWidth = 340;
    const gap = 12;
    const rightWidth = width - leftWidth - gap;
    const panelPadding = 16;
    const tableHeaderHeight = 44;
    const innerTableWidth = leftWidth - (panelPadding * 2);
    const teamCol = 130;
    const { ctx } = setupExportCanvas(width, 10);

    const rowHeights = view.stateField.map((team) => {
      ctx.font = "700 16px Inter";
      const teamHeight = measureWrappedHeight(ctx, team.name, teamCol - 16, 20, 1);
      return Math.max(56, teamHeight + 24);
    });
    const leftHeight = 16 + 18 + 14 + tableHeaderHeight + rowHeights.reduce((sum, value) => sum + value, 0) + 12 + 24 + 16;

    const gameHeight = 170;
    const columnGap = 12;
    const gameGap = 18;
    const bracketInnerWidth = rightWidth - (panelPadding * 2);
    const columnWidth = (bracketInnerWidth - (columnGap * 2)) / 3;
    const quarterHeight = (gameHeight * 4) + (gameGap * 3);
    const semiPad = 120;
    const finalPad = 240;
    const semiHeight = semiPad + (gameHeight * 2) + gameGap;
    const finalHeight = finalPad + gameHeight;
    const rightHeight = panelPadding + 36 + 44 + Math.max(quarterHeight, semiHeight, finalHeight) + panelPadding;
    const height = Math.max(leftHeight, rightHeight);

    const scaled = setupExportCanvas(width, height);
    const c = scaled.ctx;
    c.fillStyle = "#f5f1e8";
    c.fillRect(0, 0, width, height);

    drawPanelCard(c, 0, 0, leftWidth, leftHeight);
    c.fillStyle = "#141414";
    c.font = "800 22px Inter";
    c.fillText(state.scenarioSet === "districts" ? "State Field" : "State Seed Line", 16, 36);

    fillRoundRect(c, 16, 58, innerTableWidth, tableHeaderHeight + rowHeights.reduce((sum, value) => sum + value, 0), 12, "#ffffff", "#d9d1c0", 1);
    c.fillStyle = "#f4efe4";
    c.fillRect(17, 59, innerTableWidth - 2, tableHeaderHeight);
    c.fillStyle = "#676154";
    c.font = "800 12px Inter";
    c.fillText("Seed", 30, 87);
    c.fillText("Team", 86, 87);
    c.fillText("Record", 218, 87);
    c.fillText("Average", 296, 87);

    let rowY = 58 + tableHeaderHeight;
    view.stateField.forEach((team, index) => {
      const rowHeight = rowHeights[index];
      c.strokeStyle = "#ece5d7";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(16, rowY);
      c.lineTo(16 + innerTableWidth, rowY);
      c.stroke();

      c.fillStyle = "#141414";
      c.font = "400 16px Inter";
      c.fillText(String(team.seed), 30, rowY + 36);
      drawWrappedText(c, team.name, 86, rowY + 32, teamCol - 16, 20, { font: "400 16px Inter", color: "#141414" });
      c.fillText(recordText(team.record), 218, rowY + 36);
      c.fillText(round(team.average), 296, rowY + 36);
      rowY += rowHeight;
    });

    c.fillStyle = "#1f5a43";
    c.font = "700 16px Inter";
    c.fillText("Creighton University, Omaha", 16, rowY + 30);

    const rightX = leftWidth + gap;
    drawPanelCard(c, rightX, 0, rightWidth, rightHeight);
    c.fillStyle = "#141414";
    c.font = "800 22px Inter";
    c.fillText(state.projectStateBracket ? "Projected State Bracket" : "State Bracket", rightX + 16, 36);

    const buttonLabel = state.projectStateBracket ? "Stop Projecting State" : "Project State Bracket";
    c.font = "700 14px Inter";
    const buttonWidth = Math.ceil(c.measureText(buttonLabel).width) + 32;
    fillRoundRect(c, rightX + 16 + 170, 10, buttonWidth, 44, 10, "#e6ebe8");
    c.fillStyle = "#141414";
    c.fillText(buttonLabel, rightX + 16 + 170 + 16, 38);

    c.fillStyle = "#676154";
    c.font = "800 12px Inter";
    const columnX = [
      rightX + panelPadding,
      rightX + panelPadding + columnWidth + columnGap,
      rightX + panelPadding + (columnWidth * 2) + (columnGap * 2),
    ];
    c.fillText("Quarterfinals", columnX[0], 98);
    c.fillText("Semifinals", columnX[1], 98);
    c.fillText("Final", columnX[2], 98);

    let gameY = 122;
    bracket.quarters.forEach((game, index) => {
      drawStateGameCard(c, game, schedule?.quarterfinals?.[index] || "", columnX[0], gameY, columnWidth, gameHeight);
      gameY += gameHeight + gameGap;
    });

    let semiY = 122 + semiPad;
    bracket.semis.forEach((game, index) => {
      drawStateGameCard(c, game, schedule?.semifinals?.[index] || "", columnX[1], semiY, columnWidth, gameHeight);
      semiY += gameHeight + gameGap;
    });

    drawStateGameCard(c, bracket.final, schedule?.final || "", columnX[2], 122 + finalPad, columnWidth, gameHeight);
    return scaled.canvas;
  }

  function districtCardHeight(ctx, district, width, bracketMode) {
    const bodyWidth = width - 28;
    if (bracketMode) {
      const sectionPadding = 14;
      const headingHeight = 24;
      const teamRowHeight = 24;
      const gameLabelHeight = 52;
      const seedsHeight = sectionPadding + headingHeight + (district.teams.length * teamRowHeight) + sectionPadding;
      const openingGames = district.games.filter((game) => game.round === "play_in");
      const semis = district.games.filter((game) => game.round === "semifinal");
      const finals = district.games.filter((game) => game.round === "final");
      const openingHeight = sectionPadding + headingHeight + (openingGames.length ? openingGames.length * gameLabelHeight : 28) + sectionPadding;
      const semiHeight = sectionPadding + headingHeight + Math.max(1, semis.length) * gameLabelHeight + sectionPadding;
      const finalHeight = sectionPadding + headingHeight + Math.max(1, finals.length) * gameLabelHeight + sectionPadding;
      return 92 + seedsHeight + openingHeight + semiHeight + finalHeight;
    }

    const blocks = districtBlocks(district);
    let bodyHeight = 0;
    blocks.forEach((block) => {
      let blockHeight = 14;
      block.forEach((item) => {
        if (item.type === "team") {
          ctx.font = "700 15px Inter";
          const lines = wrapLines(ctx, item.team ? `${item.team.name} (${recordText(item.team.record)})` : "TBD", bodyWidth - 36);
          blockHeight += 24 + (lines.length * 18);
        } else {
          blockHeight += 24;
        }
      });
      blockHeight += 14;
      bodyHeight += blockHeight;
    });
    return 92 + bodyHeight + 48;
  }

  function drawDistrictMatchRow(ctx, game, x, y, width) {
    ctx.strokeStyle = "#ebe4d5";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();

    ctx.fillStyle = "#141414";
    ctx.font = "800 14px Inter";
    ctx.fillText(game.label, x, y + 22);
    ctx.fillStyle = "#676154";
    ctx.font = "400 12px Inter";
    ctx.fillText(districtRoundSchedule(game.round), x, y + 40);

    const rightX = x + (width * 0.52);
    ctx.fillStyle = "#141414";
    ctx.font = "700 14px Inter";
    drawWrappedText(ctx, game.team_a_name, rightX, y + 18, width * 0.46, 18, { font: "700 14px Inter", color: "#141414" });
    drawWrappedText(ctx, game.team_b_name, rightX, y + 36, width * 0.46, 18, { font: "700 14px Inter", color: "#141414" });
  }

  function drawDistrictCard(ctx, district, x, y, width, height, bracketMode) {
    drawPanelCard(ctx, x, y, width, height);
    ctx.fillStyle = "#141414";
    ctx.fillRect(x, y, width, 76);
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "800 12px Inter";
    ctx.fillText(district.code, x + 14, y + 22);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 24px Inter";
    ctx.fillText(district.name, x + 14, y + 48);
    ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
    ctx.font = "400 12px Inter";
    ctx.fillText(district.champion ? `Projected champion: ${district.champion.name}` : "Champion TBD", x + 14, y + 66);

    const bodyX = x + 14;
    const bodyY = y + 76;
    const bodyWidth = width - 28;
    let cursorY = bodyY;

    if (bracketMode) {
      const drawSectionBackground = (startY, sectionHeight, accent) => {
        ctx.fillStyle = accent ? "#f1ede5" : "#fffdfa";
        ctx.fillRect(x + 1, startY, width - 2, sectionHeight);
        ctx.strokeStyle = "#d9d1c0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x + width, startY);
        ctx.stroke();
      };

      const drawSeedSection = (startY) => {
        const lineHeight = 24;
        const sectionHeight = 34 + (district.teams.length * lineHeight) + 14;
        drawSectionBackground(startY, sectionHeight, false);
        ctx.fillStyle = "#676154";
        ctx.font = "800 12px Inter";
        ctx.fillText("Seeds", bodyX, startY + 18);
        let lineY = startY + 34;
        district.teams.forEach((team) => {
          ctx.fillStyle = "#141414";
          ctx.font = "800 14px Inter";
          ctx.fillText(String(team.district_seed), bodyX, lineY + 18);
          drawWrappedText(ctx, team.name, bodyX + 28, lineY + 18, bodyWidth - 28, 18, { font: "700 15px Inter", color: "#141414" });
          lineY += lineHeight;
        });
        return sectionHeight;
      };

      const drawGamesSection = (startY, title, games, accent, emptyText = "No play-in round in this district.") => {
        const sectionHeight = 34 + (games.length ? games.length * 52 : 28) + 14;
        drawSectionBackground(startY, sectionHeight, accent);
        ctx.fillStyle = "#676154";
        ctx.font = "800 12px Inter";
        ctx.fillText(title, bodyX, startY + 18);
        let lineY = startY + 34;
        if (games.length) {
          games.forEach((game, index) => {
            drawDistrictMatchRow(ctx, game, bodyX, lineY, bodyWidth);
            lineY += 52;
            if (index === games.length - 1) {
              ctx.strokeStyle = "#ebe4d5";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(bodyX, lineY);
              ctx.lineTo(bodyX + bodyWidth, lineY);
              ctx.stroke();
            }
          });
        } else {
          ctx.fillStyle = "#676154";
          ctx.font = "400 14px Inter";
          ctx.fillText(emptyText, bodyX, lineY + 18);
        }
        return sectionHeight;
      };

      cursorY += drawSeedSection(cursorY);
      cursorY += drawGamesSection(cursorY, "Opening Round", district.games.filter((game) => game.round === "play_in"), true);
      cursorY += drawGamesSection(cursorY, "Semifinals", district.games.filter((game) => game.round === "semifinal"), false, "No semifinal games yet.");
      cursorY += drawGamesSection(cursorY, "Final", district.games.filter((game) => game.round === "final"), true, "No district final set yet.");
      return;
    }

    districtBlocks(district).forEach((block, index) => {
      const blockAccent = index === 1;
      const blockStartY = cursorY;
      let blockCursorY = cursorY + 14;
      block.forEach((item) => {
        if (item.type === "team") {
          ctx.fillStyle = "#141414";
          ctx.font = "800 14px Inter";
          ctx.fillText(item.team?.district_seed || "-", bodyX, blockCursorY + 16);
          drawWrappedText(ctx, item.team ? `${item.team.name} (${recordText(item.team.record)})` : "TBD", bodyX + 28, blockCursorY + 16, bodyWidth - 36, 18, { font: "700 15px Inter", color: "#141414" });
          ctx.fillStyle = "#676154";
          ctx.font = "400 13px Inter";
          ctx.fillText(item.team ? round(item.team.average) : "", bodyX + 28, blockCursorY + 38);
          blockCursorY += 52;
        } else {
          ctx.fillStyle = "#b17d18";
          ctx.font = "700 13px Inter";
          drawWrappedText(ctx, item.text, bodyX, blockCursorY + 14, bodyWidth, 16, { font: "700 13px Inter", color: "#b17d18" });
          blockCursorY += 24;
        }
      });
      ctx.fillStyle = blockAccent ? "#f1ede5" : "#fffdfa";
      ctx.fillRect(x + 1, blockStartY, width - 2, blockCursorY - blockStartY + 8);
      cursorY = blockStartY + 14;
      block.forEach((item) => {
        if (item.type === "team") {
          ctx.fillStyle = "#141414";
          ctx.font = "800 14px Inter";
          ctx.fillText(item.team?.district_seed || "-", bodyX, cursorY + 16);
          drawWrappedText(ctx, item.team ? `${item.team.name} (${recordText(item.team.record)})` : "TBD", bodyX + 28, cursorY + 16, bodyWidth - 36, 18, { font: "700 15px Inter", color: "#141414" });
          ctx.fillStyle = "#676154";
          ctx.font = "400 13px Inter";
          ctx.fillText(item.team ? round(item.team.average) : "", bodyX + 28, cursorY + 38);
          cursorY += 52;
        } else {
          ctx.fillStyle = "#b17d18";
          ctx.font = "700 13px Inter";
          drawWrappedText(ctx, item.text, bodyX, cursorY + 14, bodyWidth, 16, { font: "700 13px Inter", color: "#b17d18" });
          cursorY += 24;
        }
      });
      cursorY += 8;
    });

    ctx.fillStyle = "#fbf8f1";
    ctx.fillRect(x + 1, height + y - 44, width - 2, 43);
    ctx.strokeStyle = "#d9d1c0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, height + y - 44);
    ctx.lineTo(x + width, height + y - 44);
    ctx.stroke();
    ctx.fillStyle = "#676154";
    ctx.font = "400 13px Inter";
    drawWrappedText(ctx, district.structure, bodyX, height + y - 26, bodyWidth, 16, { font: "400 13px Inter", color: "#676154" });
  }

  function renderBoardViewToCanvas(view, options = {}) {
    const {
      bracketMode = state.scenarioSet === "districts",
      showHeader = true,
      showSummary = true,
      showOuterCard = true,
    } = options;
    const width = 1560;
    const outerPadding = 16;
    const innerWidth = width - (outerPadding * 2);
    const gridGap = 14;
    const columns = 4;
    const cardWidth = (innerWidth - (gridGap * (columns - 1))) / columns;
    const cardHeights = view.districts.map((district) => {
      const scratch = document.createElement("canvas").getContext("2d");
      scratch.font = "700 15px Inter";
      return districtCardHeight(scratch, district, cardWidth, bracketMode);
    });
    const rowHeights = [];
    for (let index = 0; index < cardHeights.length; index += columns) {
      rowHeights.push(Math.max(...cardHeights.slice(index, index + columns)));
    }

    const headerHeight = showHeader ? 110 : 0;
    const summaryHeight = showSummary ? 178 : 0;
    const districtHeight = rowHeights.reduce((sum, value) => sum + value, 0) + (gridGap * Math.max(0, rowHeights.length - 1));
    const sectionGapAfterHeader = showHeader && (showSummary || districtHeight) ? 16 : 0;
    const sectionGapAfterSummary = showSummary && districtHeight ? 16 : 0;
    const wrapHeight = 16 + headerHeight + sectionGapAfterHeader + summaryHeight + sectionGapAfterSummary + districtHeight + 16;
    const height = wrapHeight + (outerPadding * 2);
    const { canvas, ctx } = setupExportCanvas(width, height);
    ctx.fillStyle = "#f5f1e8";
    ctx.fillRect(0, 0, width, height);

    if (showOuterCard) {
      drawPanelCard(ctx, outerPadding, outerPadding, innerWidth, wrapHeight);
    }
    const wrapX = outerPadding;
    const wrapY = outerPadding;
    const contentX = showOuterCard ? wrapX + 16 : outerPadding;
    const contentWidth = showOuterCard ? innerWidth - 32 : innerWidth;
    let currentY = wrapY + 16;

    if (showHeader) {
      ctx.fillStyle = "#1f5a43";
      ctx.font = "800 12px Inter";
      ctx.fillText(`${sportLabel(state.sportGroup)} Workbench / ${classLabel(state.activeClass)} / ${setLabel(state.scenarioSet)}`, contentX, currentY + 16);
      ctx.fillStyle = "#141414";
      ctx.font = "700 42px Georgia";
      ctx.fillText(boardTitle(state.sportGroup, state.activeClass, state.scenarioSet), contentX, currentY + 58);
      ctx.fillStyle = "#676154";
      ctx.font = "400 15px Inter";
      drawWrappedText(ctx, `Cross-class games stay inside the shared ${sportLabel(state.sportGroup).toLowerCase()} engine. Districts inherit the current regular-season snapshot through ${state.cutoff}.`, contentX, currentY + 80, contentWidth - 250, 20, { font: "400 15px Inter", color: "#676154" });
      drawWrappedText(ctx, "Use the dedicated export buttons for board, district, and state posters.", contentX + contentWidth - 280, currentY + 80, 250, 20, { font: "400 15px Inter", color: "#676154" });
      currentY += headerHeight + sectionGapAfterHeader;
    }

    if (showSummary) {
      const summaryGap = 14;
      const summaryWidth = (contentWidth - (summaryGap * 2)) / 3;
      const sideRanked = state.scenarioSet === "districts" ? view.postDistrictRanked : view.regularRanked;
      const summaryCards = [
        {
          title: state.scenarioSet === "districts" ? "Projected State Field" : "State Seed Line",
          rows: view.stateField.length ? view.stateField.map((team) => [`${team.seed}. ${team.name}`, round(team.average)]) : [["No field yet.", ""]],
        },
        {
          title: state.scenarioSet === "districts" ? "Projected District Winners" : "Current Wildcard Points",
          rows: sideRanked.slice(0, 8).map((team) => [`${team.seed}. ${team.name}`, round(team.average)]),
        },
        {
          title: "Projected Wildcard",
          rows: view.wildcard ? [[`${view.wildcard.seed}. ${view.wildcard.name}`, round(view.wildcard.average)], ["Record", recordText(view.wildcard.record)]] : [["No wildcard yet.", ""]],
        },
      ];

      summaryCards.forEach((card, index) => {
        const cardX = contentX + index * (summaryWidth + summaryGap);
        drawPanelCard(ctx, cardX, currentY, summaryWidth, summaryHeight);
        ctx.fillStyle = "#141414";
        ctx.font = "800 14px Inter";
        ctx.fillText(card.title, cardX + 14, currentY + 24);
        let rowY = currentY + 44;
        card.rows.forEach((row) => {
          fillRoundRect(ctx, cardX + 12, rowY, summaryWidth - 24, 34, 10, "#e7f0eb");
          ctx.fillStyle = "#141414";
          ctx.font = "600 13px Inter";
          drawWrappedText(ctx, row[0], cardX + 24, rowY + 21, summaryWidth - 120, 16, { font: "600 13px Inter", color: "#141414" });
          if (row[1]) {
            ctx.fillText(row[1], cardX + summaryWidth - 62, rowY + 21);
          }
          rowY += 42;
        });
      });
      currentY += summaryHeight + sectionGapAfterSummary;
    }

    rowHeights.forEach((rowHeight, rowIndex) => {
      for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
        const districtIndex = (rowIndex * columns) + columnIndex;
        const district = view.districts[districtIndex];
        if (!district) continue;
        const cardX = contentX + columnIndex * (cardWidth + gridGap);
        drawDistrictCard(ctx, district, cardX, currentY, cardWidth, cardHeights[districtIndex], bracketMode);
      }
      currentY += rowHeight + gridGap;
    });

    return canvas;
  }

  function drawPosterHeader(ctx, title, subtitle) {
    ctx.fillStyle = "#1f5a43";
    ctx.font = "700 24px Inter";
    ctx.fillText(posterContextLabel(), 72, 72);
    ctx.fillStyle = "#111111";
    ctx.font = "700 68px Georgia";
    ctx.fillText(title, 72, 148);
    ctx.fillStyle = "#676154";
    ctx.font = "28px Inter";
    wrapText(ctx, subtitle, 72, 192, 3000, 34);
  }

  function drawPosterPanel(ctx, title, x, y, width, height, bodyLines, options = {}) {
    ctx.fillStyle = "#fffdfa";
    ctx.strokeStyle = "#d3cab8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1f5a43";
    ctx.beginPath();
    ctx.roundRect(x, y, width, 58, [18, 18, 0, 0]);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 24px Inter";
    ctx.fillText(title, x + 18, y + 38);

    ctx.fillStyle = "#111111";
    ctx.font = options.font || "600 20px Inter";
    let lineY = y + 92;
    bodyLines.forEach((line) => {
      wrapText(ctx, line, x + 18, lineY, width - 36, options.lineHeight || 26);
      lineY += options.rowGap || 36;
    });
  }

  function wrapTextAligned(ctx, text, x, y, maxWidth, lineHeight, align = "left") {
    const words = String(text || "").split(" ");
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const test = `${line}${word} `;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line.trim());
        line = `${word} `;
      } else {
        line = test;
      }
    });
    if (line.trim()) lines.push(line.trim());
    lines.forEach((entry, index) => {
      if (align === "center") {
        ctx.fillText(entry, x, y + (index * lineHeight));
      } else {
        ctx.fillText(entry, x, y + (index * lineHeight));
      }
    });
    return lines.length;
  }

  function drawDistrictSeedPosterCard(ctx, district, x, y, width, height) {
    drawPosterPanel(ctx, `${district.code} ${district.name}`, x, y, width, height, []);
    let cursorY = y + 92;
    district.teams.forEach((team) => {
      ctx.fillStyle = "#faf7f0";
      ctx.beginPath();
      ctx.roundRect(x + 18, cursorY, width - 36, 62, 12);
      ctx.fill();
      ctx.fillStyle = "#111111";
      ctx.font = "700 18px Inter";
      ctx.fillText(`${team.district_seed}. ${team.name}`, x + 32, cursorY + 27);
      ctx.fillStyle = "#676154";
      ctx.font = "600 15px Inter";
      ctx.fillText(`${recordText(team.record)}   ${round(team.average)}`, x + 32, cursorY + 48);
      cursorY += 70;
    });
    ctx.fillStyle = "#b17d18";
    ctx.font = "700 16px Inter";
    wrapText(ctx, district.structure, x + 18, y + height - 26, width - 36, 18);
  }

  function drawDistrictBracketPosterCard(ctx, district, x, y, width, height) {
    ctx.fillStyle = "#fffdfa";
    ctx.strokeStyle = "#d3cab8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#1f5a43";
    ctx.beginPath();
    ctx.roundRect(x, y, width, 56, [18, 18, 0, 0]);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 26px Inter";
    ctx.fillText(`${district.code} ${district.name}`, x + 18, y + 37);

    const playIns = district.games.filter((game) => game.round === "play_in");
    const semis = district.games.filter((game) => game.round === "semifinal");
    const finalGame = district.games.find((game) => game.round === "final") || null;

    const box = (bx, by, bw, bh, game, scheduleLabel) => {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.rect(bx, by, bw, bh);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#10a64a";
      ctx.font = "700 18px Inter";
      ctx.textAlign = "center";
      ctx.fillText(game.label, bx + bw / 2, by + 30);
      ctx.textAlign = "left";
      ctx.font = "700 13px Inter";
      wrapText(ctx, scheduleLabel, bx + 14, by + 52, bw - 28, 16);
      ctx.textAlign = "center";
      ctx.font = "700 20px Inter";
      wrapTextAligned(ctx, game.team_a_name, bx + bw / 2, by + bh - 52, bw - 36, 20, "center");
      wrapTextAligned(ctx, game.team_b_name, bx + bw / 2, by + bh - 24, bw - 36, 20, "center");
      ctx.textAlign = "left";
    };

    const leftX = x + 26;
    const midX = x + 520;
    const rightX = x + 1068;
    const openYs = playIns.length === 3 ? [y + 68, y + 186, y + 304] : playIns.length === 2 ? [y + 126, y + 264] : playIns.length === 1 ? [y + 194] : [];
    const semiYs = [y + 92, y + 252];
    const finalY = y + 170;
    const openBoxW = 410;
    const openBoxH = 98;
    const semiBoxW = 420;
    const semiBoxH = 120;
    const finalBoxW = 360;
    const finalBoxH = 128;

    playIns.forEach((game, index) => {
      box(leftX, openYs[index], openBoxW, openBoxH, game, districtRoundSchedule(game.round));
    });
    semis.forEach((game, index) => {
      box(midX, semiYs[index], semiBoxW, semiBoxH, game, districtRoundSchedule(game.round));
    });
    if (finalGame) {
      box(rightX, finalY, finalBoxW, finalBoxH, finalGame, districtRoundSchedule(finalGame.round));
    }

    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 4;
    const connect = (fromX, fromY, toX, toY) => {
      const midLine = (fromX + toX) / 2;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(midLine, fromY);
      ctx.lineTo(midLine, toY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
    };

    if (playIns.length === 1 && semis[0]) {
      connect(leftX + openBoxW, openYs[0] + openBoxH / 2, midX, semiYs[0] + semiBoxH * 0.68);
    }
    if (playIns.length === 2 && semis[0] && semis[1]) {
      connect(leftX + openBoxW, openYs[0] + openBoxH / 2, midX, semiYs[0] + semiBoxH * 0.68);
      connect(leftX + openBoxW, openYs[1] + openBoxH / 2, midX, semiYs[1] + semiBoxH * 0.68);
    }
    if (playIns.length === 3 && semis[0] && semis[1]) {
      connect(leftX + openBoxW, openYs[0] + openBoxH / 2, midX, semiYs[0] + semiBoxH * 0.68);
      connect(leftX + openBoxW, openYs[1] + openBoxH / 2, midX, semiYs[1] + semiBoxH * 0.35);
      connect(leftX + openBoxW, openYs[2] + openBoxH / 2, midX, semiYs[1] + semiBoxH * 0.78);
    }
    if (!playIns.length && semis.length === 2 && finalGame) {
      connect(midX + semiBoxW, semiYs[0] + semiBoxH / 2, rightX, finalY + finalBoxH * 0.32);
      connect(midX + semiBoxW, semiYs[1] + semiBoxH / 2, rightX, finalY + finalBoxH * 0.72);
      return;
    }
    if (semis.length === 2 && finalGame) {
      connect(midX + semiBoxW, semiYs[0] + semiBoxH / 2, rightX, finalY + finalBoxH * 0.32);
      connect(midX + semiBoxW, semiYs[1] + semiBoxH / 2, rightX, finalY + finalBoxH * 0.72);
    }
  }

  function exportBoardAsJpeg(view) {
    const canvas = renderBoardViewToCanvas(view);
    downloadCanvas(canvas, `${state.sportGroup}-${state.activeClass}-${state.scenarioSet}-board.jpeg`);
  }

  function exportDistrictPoster(view) {
    const canvas = renderBoardViewToCanvas(view, {
      bracketMode: true,
      showHeader: false,
      showSummary: false,
      showOuterCard: false,
    });
    downloadCanvas(canvas, `${state.sportGroup}-${state.activeClass}-district-poster.jpeg`);
  }

  function drawBracketBox(ctx, x, y, width, height, title, scheduleLabel, teamA, teamB, result) {
    ctx.fillStyle = "#fffdfa";
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#10a64a";
    ctx.font = "700 24px Inter";
    ctx.textAlign = "center";
    ctx.fillText(title, x + width / 2, y + 38);
    ctx.textAlign = "left";
    ctx.font = "700 15px Inter";
    wrapText(ctx, scheduleLabel, x + 18, y + 68, width - 36, 20);
    ctx.textAlign = "center";
    ctx.font = "700 24px Inter";
    wrapTextAligned(ctx, teamA || "TBD", x + width / 2, y + height - 92, width - 40, 24, "center");
    wrapTextAligned(ctx, teamB || "TBD", x + width / 2, y + height - 52, width - 40, 24, "center");
    if (result) {
      ctx.font = "700 18px Inter";
      ctx.fillText(result, x + width / 2, y + height + 32);
    }
    ctx.textAlign = "left";
  }

  function exportStatePoster(view) {
    const canvas = renderStateViewToCanvas(view);
    downloadCanvas(canvas, `${state.sportGroup}-${state.activeClass}-state-poster.jpeg`);
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text || "").split(" ");
    let line = "";
    let lineIndex = 0;
    words.forEach((word) => {
      const test = `${line}${word} `;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line.trim(), x, y + (lineIndex * lineHeight));
        line = `${word} `;
        lineIndex += 1;
      } else {
        line = test;
      }
    });
    if (line.trim()) ctx.fillText(line.trim(), x, y + (lineIndex * lineHeight));
  }

  function render() {
    const view = currentViewModel();
    renderSummary(view);
    renderBoard(view);
    renderGames(view);
    renderTeam(view);
    renderStandings(view);
    renderState(view);
    renderOOS(view);
    setActiveContext();
    setActiveView();
    els.cutoffInput.value = state.cutoff;
  }

  els.sportTabs.querySelectorAll("[data-sport]").forEach((button) => {
    button.addEventListener("click", () => {
      state.sportGroup = button.dataset.sport;
      state.projectStateBracket = false;
      ensureSelectedTeamIsValid();
      render();
    });
  });

  els.classTabs.querySelectorAll("[data-class]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeClass = button.dataset.class;
      state.projectStateBracket = false;
      ensureSelectedTeamIsValid();
      render();
    });
  });

  els.setTabs.querySelectorAll("[data-set]").forEach((button) => {
    button.addEventListener("click", () => {
      state.scenarioSet = button.dataset.set;
      state.gameFilter = "pending";
      state.projectStateBracket = false;
      render();
    });
  });

  els.viewTabs.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeView = button.dataset.view;
      render();
    });
  });

  els.cutoffInput.addEventListener("change", (event) => {
    state.cutoff = event.target.value;
    render();
  });

  els.exportBoardButton.addEventListener("click", () => {
    exportBoardAsJpeg(currentViewModel());
  });

  els.exportDistrictButton.addEventListener("click", () => {
    exportDistrictPoster(currentViewModel());
  });

  els.exportStateButton.addEventListener("click", () => {
    exportStatePoster(currentViewModel());
  });

  els.resetAllButton.addEventListener("click", () => {
    if (window.confirm("Clear all local overrides, custom games, and opponent edits?")) {
      resetAllLocalEdits();
    }
  });

  ensureSelectedTeamIsValid();
  render();
})();
