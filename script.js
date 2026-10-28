
"use strict";

/* ===========================================
   MIND — BRAIN TRAINING WEB APPLICATION
   JavaScript — Version autonome
   =========================================== */

// 1. OUTILS

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const rand = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = array => array[rand(0, array.length - 1)];

const shuffle = array => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

const normalize = value =>
  String(value ?? "").trim().toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

const formatNumber = number =>
  Number(number).toLocaleString("fr-FR");

// 2. CATÉGORIES

const categories = [
  ["memory", "Mind Memory", "▦", "Mémoire visuelle et numérique"],
  ["focus", "Mind Focus", "◎", "Attention et observation"],
  ["calcul", "Mind Calcul", "+", "Calcul mental"],
  ["iq", "Mind IQ", "◇", "Raisonnement abstrait"],
  ["logic", "Mind Logic", "⌘", "Déduction et énigmes"],
  ["speed", "Mind Speed", "ϟ", "Réflexes et rapidité"],
  ["words", "Mind Words", "Aa", "Vocabulaire français et anglais"],
  ["spatial", "Mind Spatial", "⬡", "Visualisation spatiale"],
  ["strategy", "Mind Strategy", "♜", "Planification et stratégie"],
  ["dual", "Mind Dual Task", "∞", "Deux tâches simultanées"]
];

const games = [
  ["grid", "memory", "Memory Grid", 3],
  ["sequence", "memory", "Number Sequence", 5],
  ["images", "memory", "Image Recall", 5],
  ["calcul", "calcul", "Mind Calcul", 4],
  ["focus", "focus", "Find the Difference", 5],
  ["iq", "iq", "Visual IQ", 5],
  ["logic", "logic", "Logic Challenge", 5],
  ["speed", "speed", "Speed Challenge", 2],
  ["words", "words", "Vocabulary Master", 5],
  ["spatial", "spatial", "Spatial Intelligence", 5],
  ["strategy", "strategy", "Strategy Master", 5],
  ["time", "strategy", "Time Travel Strategy", 5],
  ["dual", "dual", "Dual Task", 5]
].map(([id, cat, name, levels]) => ({
  id, cat, name, levels
}));

// 3. BASE DE DONNÉES LOCALE

const STORAGE_KEY = "mind_full_web_v2";

const defaultData = () => ({
  name: "Joueur MIND",
  xp: 0,
  sessions: [],
  progress: {},
  settings: { language: "fr", reduceMotion: false },
  created: Date.now()
});

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...defaultData(), ...saved } : defaultData();
  } catch {
    return defaultData();
  }
}

let data = loadData();

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn("Sauvegarde indisponible", error);
  }
}

function progressFor(id) {
  return data.progress[id] || {
    level: 1,
    best: 0,
    played: 0
  };
}

// 4. ÉTAT DE L'APPLICATION

let page = "home";
let currentCategory = null;
let currentGame = null;
let level = 1;
let mode = "qcm";
let operation = "mix";
let language = "fr";

let round = 0;
let totalRounds = 5;
let score = 0;
let usedHelp = 0;
let challenge = null;
let board = null;
let feedback = null;
let helpIndex = 0;
let timer = null;
let timerStart = 0;
let timeLeft = 0;

const app = $("#app");

if (!app) {
  throw new Error("Élément #app introuvable dans index.html");
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

function toast(message) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => el.classList.remove("visible"), 2600);
}

// 5. NAVIGATION PRINCIPALE

function layout(content) {
  const navigation = [
    ["home", "⌂", "Accueil"],
    ["games", "▦", "Jeux"],
    ["daily", "◷", "Daily"],
    ["progress", "▥", "Progression"],
    ["profile", "♙", "Profil"]
  ];

  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-icon">✧</span>
          <div>
            <strong>MIND</strong>
            <small>TRAIN YOUR MIND</small>
          </div>
        </div>
        <nav class="nav">
          ${navigation.map(([id, icon, label]) => `
            <button data-page="${id}"
              class="${page === id ? "active" : ""}">
              <span class="ico">${icon}</span>
              <span class="navtext">${label}</span>
            </button>
          `).join("")}
        </nav>
        <div class="sideprofile">
          <div class="avatar">${escapeHTML(data.name[0] || "M")}</div>
          <div class="profilename">
            <strong>${escapeHTML(data.name)}</strong>
            <small>${data.xp} XP</small>
          </div>
        </div>
      </aside>

      <main class="main">${content}</main>

      <nav class="mobile-nav">
        ${navigation.map(([id, icon, label]) => `
          <button data-page="${id}"
            class="${page === id ? "active" : ""}">
            <span>${icon}</span>${label}
          </button>
        `).join("")}
      </nav>
    </div>
  `;

  $$("[data-page]").forEach(button => {
    button.onclick = () => navigate(button.dataset.page);
  });
}

function topbar() {
  const globalLevel = Math.floor(Math.sqrt(data.xp / 80)) + 1;
  return `
    <div class="topbar">
      <div class="eyebrow">MIND / BRAIN TRAINING</div>
      <div class="pill">✦ ${data.xp} XP · Niveau ${globalLevel}</div>
    </div>
  `;
}

function navigate(destination) {
  stopTimer();
  page = destination;
  render();
  window.scrollTo(0, 0);
}

function render() {
  switch (page) {
    case "home": renderHome(); break;
    case "games": renderGames(); break;
    case "category": renderCategory(); break;
    case "play": renderPlay(); break;
    case "result": renderResult(); break;
    case "progress": renderProgress(); break;
    case "profile": renderProfile(); break;
    case "daily": renderDaily(); break;
  }
}

function gameCard(game) {
  const progress = progressFor(game.id);
  return `
    <button class="gamecard" data-game="${game.id}">
      <div class="tileicon">✦</div>
      <h3>${escapeHTML(game.name)}</h3>
      <p>${game.levels} niveaux de difficulté</p>
      <div class="foot">Niveau ${progress.level} · Jouer →</div>
    </button>
  `;
}

function bindGameCards() {
  $$("[data-game]").forEach(button => {
    button.onclick = () => selectGame(button.dataset.game);
  });
}

function renderHome() {
  const stats = `
    <div class="statsgrid">
      <div class="stat"><small>✦ XP</small><div class="number">${data.xp}</div></div>
      <div class="stat"><small>◷ Sessions</small><div class="number">${data.sessions.length}</div></div>
      <div class="stat"><small>✓ Précision</small><div class="number">${globalAccuracy()}%</div></div>
      <div class="stat"><small>♜ Niveau</small><div class="number">${Math.floor(Math.sqrt(data.xp / 80)) + 1}</div></div>
    </div>
  `;

  layout(`
    ${topbar()}
    <div class="hero">
      <div class="eyebrow">✦ TON ESPACE D'ENTRAÎNEMENT</div>
      <h1>Train your mind.<br>Unlock your potential.</h1>
      <p>13 mini-jeux, 10 catégories et des défis renouvelés.</p>
      <div class="actions">
        <button class="btn primary" id="explore">Explorer les jeux →</button>
        <button class="btn" id="dailyBtn">Défi du jour</button>
      </div>
    </div>
    ${stats}
    <div class="sectionhead"><h2>Choisis une catégorie</h2></div>
    <div class="cardgrid">
      ${categories.map(([id, name, icon, description]) => `
        <button class="catcard" data-cat="${id}">
          <div class="tileicon">${icon}</div>
          <h3>${name}</h3>
          <p>${description}</p>
          <div class="foot">Explorer →</div>
        </button>
      `).join("")}
    </div>
  `);

  $("#explore").onclick = () => navigate("games");
  $("#dailyBtn").onclick = () => navigate("daily");

  $$("[data-cat]").forEach(button => {
    button.onclick = () => {
      currentCategory = button.dataset.cat;
      navigate("category");
    };
  });
}

function renderGames() {
  layout(`
    ${topbar()}
    <div class="sectionhead">
      <div><h1>Tous les jeux</h1><p>Choisis ton entraînement.</p></div>
    </div>
    <div class="cardgrid">${games.map(gameCard).join("")}</div>
  `);
  bindGameCards();
}

function renderCategory() {
  const category = categories.find(c => c[0] === currentCategory);

  layout(`
    ${topbar()}
    <button class="back" id="back">← Retour</button>
    <div class="hero">
      <div class="eyebrow">CATÉGORIE</div>
      <h1>${category[2]} ${category[1]}</h1>
      <p>${category[3]}</p>
    </div>
    <div class="cardgrid">
      ${games.filter(g => g.cat === currentCategory)
        .map(gameCard).join("")}
    </div>
  `);

  $("#back").onclick = () => navigate("home");
  bindGameCards();
}

function globalAccuracy() {
  const correct = data.sessions.reduce((s, x) => s + x.correct, 0);
  const total = data.sessions.reduce((s, x) => s + x.total, 0);
  return total ? Math.round(correct / total * 100) : 0;
}

// 6. MOTEUR COMMUN DES JEUX

function selectGame(id) {
  currentGame = games.find(g => g.id === id);
  if (!currentGame) return;

  level = Math.min(progressFor(id).level, currentGame.levels);
  mode = "qcm";
  operation = "mix";
  language = "fr";
  round = 0;
  score = 0;
  usedHelp = 0;

  page = "play";
  newChallenge();
  render();
}

function newChallenge() {
  stopTimer();
  feedback = null;
  helpIndex = 0;

  challenge = generateChallenge();
  board = {
    phase: ["grid", "sequence", "images", "dual"].includes(currentGame.id)
      ? "memorize" : "answer",
    selected: [],
    position: 0,
    moves: 0,
    path: [0],
    history: [],
    rewinds: 0,
    hasKey: false
  };

  if (currentGame.id === "images") {
    challenge.targets = challenge.options
      .map((item, i) => challenge.observed.includes(item) ? i : -1)
      .filter(i => i >= 0);
  }

  if (currentGame.id === "speed") {
    timeLeft = level === 1 ? 5 : 1;
  }
}

function generateChallenge() {
  switch (currentGame.id) {
    case "grid": return genGrid();
    case "sequence": return genSequence();
    case "images": return genImages();
    case "calcul": return genCalcul();
    case "focus": return genFocus();
    case "iq": return genIQ();
    case "logic": return genLogic();
    case "speed": return genSpeed();
    case "words": return genWords();
    case "spatial": return genSpatial();
    case "strategy": return genMaze(false);
    case "time": return genMaze(true);
    case "dual": return genDual();
  }
}

function renderPlay() {
  layout(`
    ${topbar()}
    <button class="back" id="back">← Retour aux jeux</button>
    <div class="gameheader">
      <div>
        <div class="eyebrow">${currentGame.cat.toUpperCase()}</div>
        <h2 class="gametitle">${currentGame.name}</h2>
      </div>
      <span class="badge">${round + 1} / ${totalRounds}</span>
    </div>

    <div class="panel gamepanel">
      <div class="gameheader">
        <span class="mini">Défi ${round + 1}</span>
        <span class="mini">${score} bonne(s) réponse(s)</span>
      </div>
      <div class="progress">
        <i style="width:${round / totalRounds * 100}%"></i>
      </div>
      <div id="config"></div>
      <div id="challenge" class="gamebody"></div>
      <div id="feedback"></div>
      <div id="helpbox"></div>

      <div class="buttons" style="justify-content:space-between;margin-top:24px">
        <button class="btn ghost" id="helptrigger">💡 Help · Indice</button>
        <button class="btn" id="skip">Passer →</button>
      </div>
    </div>
  `);

  $("#back").onclick = () => {
    currentCategory = currentGame.cat;
    navigate("category");
  };

  $("#helptrigger").onclick = () => {
    helpIndex = Math.min(3, helpIndex + 1);
    drawHelp();
  };

  $("#skip").onclick = () => submit(null, true);

  drawConfig();
  drawChallenge();
  drawHelp();

  if (currentGame.id === "speed") startSpeedTimer();
}

function drawConfig() {
  const game = currentGame;
  const responseModes = ["calcul", "logic", "words", "spatial", "iq"].includes(game.id);

  $("#config").innerHTML = `
    <div class="controls">
      <div class="controlgroup">
        <label>Niveau</label>
        <select id="levelselect" class="field">
          ${Array.from({ length: game.levels }, (_, i) => `
            <option value="${i + 1}" ${level === i + 1 ? "selected" : ""}>
              Niveau ${i + 1}
            </option>
          `).join("")}
        </select>
      </div>

      ${responseModes ? `
        <div class="controlgroup">
          <label>Réponses</label>
          <div class="seg">
            <button data-mode="qcm" class="${mode === "qcm" ? "active" : ""}">QCM</button>
            <button data-mode="free" class="${mode === "free" ? "active" : ""}">Sans suggestions</button>
          </div>
        </div>` : ""}

      ${game.id === "calcul" ? `
        <div class="controlgroup">
          <label>Opération</label>
          <select id="operation" class="field">
            <option value="mix">Mélangées</option>
            <option value="+">Addition</option>
            <option value="-">Soustraction</option>
            <option value="×">Multiplication</option>
            <option value="÷" ${level < 3 ? "disabled" : ""}>Division</option>
          </select>
        </div>` : ""}

      ${game.id === "words" ? `
        <div class="controlgroup">
          <label>Langue</label>
          <select id="wordlanguage" class="field">
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>` : ""}
    </div>
  `;

  $("#levelselect").onchange = e => {
    level = Number(e.target.value);
    operation = level < 3 && operation === "÷" ? "mix" : operation;
    round = 0;
    score = 0;
    usedHelp = 0;
    newChallenge();
    renderPlay();
  };

  $$("[data-mode]").forEach(btn => {
    btn.onclick = () => {
      mode = btn.dataset.mode;
      newChallenge();
      renderPlay();
    };
  });

  if ($("#operation")) {
    $("#operation").value = operation;
    $("#operation").onchange = e => {
      operation = e.target.value;
      newChallenge();
      renderPlay();
    };
  }

  if ($("#wordlanguage")) {
    $("#wordlanguage").value = language;
    $("#wordlanguage").onchange = e => {
      language = e.target.value;
      newChallenge();
      renderPlay();
    };
  }
}

function optionButtons(options) {
  return `<div class="options">${options.map((option, i) => `
    <button class="option" data-option="${i}">${escapeHTML(option)}</button>
  `).join("")}</div>`;
}

function answerView(c) {
  return `
    <div class="subprompt">${escapeHTML(c.label || "Trouve la réponse")}</div>
    <div class="prompt">${escapeHTML(c.question)}</div>
    ${mode === "qcm"
      ? optionButtons(c.options)
      : `<div class="inputline">
           <input id="answer" class="field center" placeholder="Ta réponse" autocomplete="off"/>
           <button id="check" class="btn primary">Valider</button>
         </div>`}
  `;
}

function drawChallenge() {
  if (!$("#challenge")) return;

  const id = currentGame.id;
  const c = challenge;

  if (id === "grid") $("#challenge").innerHTML = renderGrid(c);
  else if (id === "sequence") $("#challenge").innerHTML = renderSequence(c);
  else if (id === "images") $("#challenge").innerHTML = renderImages(c);
  else if (id === "focus") $("#challenge").innerHTML = renderFocus(c);
  else if (id === "iq") $("#challenge").innerHTML = renderIQ(c);
  else if (["calcul", "logic", "words", "spatial"].includes(id))
    $("#challenge").innerHTML = answerView(c);
  else if (id === "speed") $("#challenge").innerHTML = `
    <div class="timer" id="timeleft">${timeLeft.toFixed(2)} s</div>
    <div class="subprompt">${escapeHTML(c.label)}</div>
    <div class="prompt">${escapeHTML(c.question)}</div>
    ${optionButtons(c.options)}
  `;
  else if (["strategy", "time"].includes(id))
    $("#challenge").innerHTML = renderMaze(c);
  else if (id === "dual")
    $("#challenge").innerHTML = renderDual(c);

  bindChallenge();
}

function bindChallenge() {
  $$("[data-option]").forEach(btn => {
    btn.onclick = () => {
      if (!feedback) {
        submit(challenge.options[Number(btn.dataset.option)]);
      }
    };
  });

  if ($("#check")) {
    $("#check").onclick = () => submit($("#answer").value);
    $("#answer").onkeydown = e => {
      if (e.key === "Enter") submit($("#answer").value);
    };
  }

  if ($("#ready")) {
    $("#ready").onclick = () => {
      board.phase = "answer";
      drawChallenge();
    };
  }

  $$("[data-cell]").forEach(btn => {
    btn.onclick = () => {
      const index = Number(btn.dataset.cell);
      if (currentGame.id === "focus") {
        submit(index);
      } else if (!feedback && board.phase === "answer") {
        const i = board.selected.indexOf(index);
        if (i >= 0) board.selected.splice(i, 1);
        else board.selected.push(index);
        drawChallenge();
      }
    };
  });

  if ($("#verify")) {
    $("#verify").onclick = () => {
      submit([...board.selected]);
    };
  }

  if ($("#dualcheck")) {
    $("#dualcheck").onclick = () => {
      const sum = $("#sum").value;
      const seq = $("#memory").value.replace(/\s/g, "");
      submit(`${sum}|${seq}`);
    };
  }

  $$("[data-move]").forEach(btn => {
    btn.onclick = () => movePlayer(btn.dataset.move);
  });

  if ($("#undo")) $("#undo").onclick = undoMove;
  if ($("#finishmaze")) {
    $("#finishmaze").onclick = () => submit(board.moves);
  }
}

function drawHelp() {
  const el = $("#helpbox");
  if (!el) return;

  if (!helpIndex) {
    el.innerHTML = "";
    return;
  }

  const hints = challenge.hints || [];

  el.innerHTML = `
    <div class="help">
      <h4>💡 Help — ${helpIndex}/3</h4>
      ${hints.slice(0, helpIndex).map((hint, i) => `
        <p><strong>Indice ${i + 1} :</strong> ${escapeHTML(hint)}</p>
      `).join("")}
    </div>
  `;
}

function submit(value, skipped = false) {
  if (feedback) return;

  stopTimer();

  let correct = false;
  const c = challenge;
  const id = currentGame.id;

  if (!skipped) {
    if (["grid", "images"].includes(id)) {
      correct = Array.isArray(value) &&
        value.length === c.targets.length &&
        value.every(index => c.targets.includes(index));

      if (id === "grid" && c.numeric && correct) {
        const expected = [...c.targets].sort((a, b) => a - b)
          .map(i => c.numbers[i]).join(" ");
        const entered = ($("#digits")?.value || "")
          .trim().split(/[\s,;]+/).filter(Boolean).join(" ");
        correct = entered === expected;
      }
    } else if (["strategy", "time"].includes(id)) {
      correct = board.position === c.goal &&
        (id !== "time" || board.hasKey);
    } else if (id === "words") {
      correct = c.accepted.some(x => normalize(x) === normalize(value));
    } else if (id === "sequence") {
      const numbers = String(value).trim()
        .split(/[\s,;·-]+/).filter(Boolean).join(" ");
      correct = numbers === c.answer;
    } else {
      correct = normalize(value) === normalize(c.answer);
    }
  }

  if (correct) score++;
  if (helpIndex) usedHelp++;

  feedback = {
    correct,
    skipped,
    explanation: c.explanation || `Réponse : ${c.answer ?? "voir les cases"}`
  };

  $("#feedback").innerHTML = `
    <div class="notice ${correct ? "good" : "bad"}">
      <strong>${correct ? "✓ Bonne réponse !" :
        skipped ? "↷ Défi passé" : "✕ Réponse incorrecte"}</strong>
      <p>${escapeHTML(feedback.explanation)}</p>
    </div>
    <button class="btn primary" id="next" style="width:100%">
      ${round + 1 === totalRounds ? "Voir le bilan" : "Défi suivant"} →
    </button>
  `;

  $$("#challenge button").forEach(btn => btn.disabled = true);
  $("#skip").disabled = true;
  $("#helptrigger").disabled = true;
  $("#next").onclick = nextRound;
}

function nextRound() {
  round++;
  if (round >= totalRounds) endSession();
  else {
    newChallenge();
    renderPlay();
  }
}

function endSession() {
  const xp = score * 20 + level * 5 - usedHelp * 2;
  data.xp += Math.max(0, xp);

  const id = currentGame.id;
  const previous = progressFor(id);

  data.progress[id] = {
    level: score >= 4
      ? Math.min(currentGame.levels, Math.max(previous.level, level + 1))
      : previous.level,
    best: Math.max(previous.best, score),
    played: previous.played + 1
  };

  data.sessions.push({
    game: id,
    level,
    correct: score,
    total: totalRounds,
    helped: usedHelp,
    xp: Math.max(0, xp),
    date: Date.now(),
    mode
  });

  data.sessions = data.sessions.slice(-300);
  saveData();
  page = "result";
  render();
}

function renderResult() {
  const p = progressFor(currentGame.id);
  layout(`
    ${topbar()}
    <div class="panel gamepanel result">
      <span class="badge green">✦ SESSION TERMINÉE</span>
      <h1>${currentGame.name}</h1>
      <div class="big">${score} / ${totalRounds}</div>
      <h2>${score >= 4 ? "Excellent travail !" : "Continue à progresser !"}</h2>
      <p>Précision : ${score * 20}%</p>
      <p>Niveau atteint : ${p.level} / ${currentGame.levels}</p>
      <div class="actions" style="justify-content:center">
        <button class="btn primary" id="again">Rejouer</button>
        <button class="btn" id="gamesBtn">Tous les jeux</button>
        <button class="btn" id="statsBtn">Statistiques</button>
      </div>
    </div>
  `);

  $("#again").onclick = () => selectGame(currentGame.id);
  $("#gamesBtn").onclick = () => navigate("games");
  $("#statsBtn").onclick = () => navigate("progress");
}

// 7. MEMORY GRID

function genGrid() {
  const sizes = level === 1 ? [5] : level === 2 ? [7] : [3, 2, 4];
  const boards = sizes.map(n => {
    const count = Math.ceil(n * n * (0.17 + level * 0.03));
    return {
      n,
      targets: shuffle([...Array(n * n).keys()]).slice(0, count)
    };
  });

  const targets = [];
  let offset = 0;

  boards.forEach(b => {
    b.targets.forEach(index => targets.push(offset + index));
    offset += b.n * b.n;
  });

  const numeric = Math.random() < 0.4;
  const numbers = {};
  targets.forEach(i => numbers[i] = rand(1, level * 25));

  return {
    boards, targets, numeric, numbers,
    hints: [
      "Repère les lignes et colonnes contenant des cases colorées.",
      "Découpe la grille en plusieurs petits groupes.",
      "Associe chaque nombre à sa position exacte."
    ],
    explanation: `Il fallait retrouver ${targets.length} cases.`
  };
}

function renderGrid(c) {
  let offset = 0;

  const html = c.boards.map((b, index) => {
    const start = offset;
    offset += b.n * b.n;

    return `
      <div>
        <p class="mini">Matrice ${index + 1} · ${b.n}×${b.n}</p>
        <div class="grid-board" style="grid-template-columns:repeat(${b.n},1fr)">
          ${Array.from({ length: b.n * b.n }, (_, i) => {
            const cell = start + i;
            const active = c.targets.includes(cell);
            const selected = board.selected.includes(cell);
            return `
              <button data-cell="${cell}"
                ${board.phase === "memorize" ? "disabled" : ""}
                class="${board.phase === "memorize"
                  ? active ? "lit" : ""
                  : selected ? "chosen" : ""}">
                ${board.phase === "memorize" && active && c.numeric
                  ? c.numbers[cell] : ""}
              </button>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }).join("");

  return `
    <h2>Memory Grid</h2>
    <p class="subprompt">${board.phase === "memorize"
      ? "Mémorise les positions et les nombres."
      : "Retrouve toutes les cases colorées."}</p>
    <div class="multi-board">${html}</div>
    ${board.phase === "memorize"
      ? `<button id="ready" class="btn primary">J'ai mémorisé →</button>`
      : `<p class="mini">${board.selected.length}/${c.targets.length} cases</p>
         ${c.numeric ? `<input id="digits" class="field center"
           placeholder="Nombres dans l'ordre des cases"/>` : ""}
         <button id="verify" class="btn primary">Vérifier</button>`}
  `;
}

// 8. NUMBER SEQUENCE

function genSequence() {
  const lengths = [4, 7, 5, 7, 9];
  const maximums = [9, 9, 99, 999, 9999];
  const count = lengths[level - 1];
  const maximum = maximums[level - 1];

  const values = Array.from({ length: count },
    () => rand(0, maximum));

  const reverse = level === 5 && Math.random() < 0.5;
  const expected = reverse ? [...values].reverse() : values;

  return {
    values, reverse,
    answer: expected.join(" "),
    hints: [
      "Regroupe les nombres en petits blocs.",
      "Crée des associations mentales entre les chiffres.",
      "Pour l'ordre inverse, commence par le dernier élément."
    ],
    explanation: `Séquence attendue : ${expected.join(" · ")}`
  };
}

function renderSequence(c) {
  if (board.phase === "memorize") {
    return `
      <h2>Number Sequence</h2>
      <p class="subprompt">Mémorise la séquence.</p>
      <div class="prompt">${c.values.join(" · ")}</div>
      <p>${c.reverse ? "Restitution inversée" : "Restitution normale"}</p>
      <button class="btn primary" id="ready">J'ai mémorisé →</button>
    `;
  }

  return `
    <h2>Reproduis la séquence</h2>
    <p class="subprompt">Sépare les nombres par des espaces.</p>
    <div class="inputline">
      <input id="answer" class="field center" placeholder="5 8 2 9"/>
      <button id="check" class="btn primary">Vérifier</button>
    </div>
  `;
}

// 9. IMAGE RECALL

const imagePool = [
  "🍎","🚗","🐈","⌚","🌻","🎸","🚀","🦊",
  "🏀","🍋","🐳","🍄","🛵","🎨","🔑","🐢",
  "🍓","🐧","💎","🦋","🎲","☂️","⚽","🎈",
  "🌙","🍉","🦄","🧭","🚲","🌵"
];

function genImages() {
  const count = [4, 6, 8, 10, 12][level - 1];
  const items = shuffle(imagePool).slice(0, count + 5);
  const observed = items.slice(0, count);
  const options = shuffle(items);

  return {
    observed, options,
    hints: [
      "Regroupe les images par catégories.",
      "Crée une histoire reliant les objets.",
      "Souviens-toi des détails distinctifs."
    ],
    explanation: `Images mémorisées : ${observed.join(" ")}`
  };
}

function renderImages(c) {
  if (board.phase === "memorize") {
    return `
      <h2>Image Recall</h2>
      <p class="subprompt">Mémorise ces images.</p>
      <div class="options">
        ${c.observed.map(img => `<div class="option emojiitem">${img}</div>`).join("")}
      </div>
      <button class="btn primary" id="ready">J'ai mémorisé →</button>
    `;
  }

  return `
    <h2>Retrouve les images</h2>
    <p>Sélectionne les ${c.observed.length} images mémorisées.</p>
    <div class="options">
      ${c.options.map((img, i) => `
        <button class="option emojiitem
          ${board.selected.includes(i) ? "correct" : ""}"
          data-cell="${i}">${img}</button>
      `).join("")}
    </div>
    <button id="verify" class="btn primary">Vérifier</button>
  `;
}

// 10. MIND CALCUL

function genCalcul() {
  let op = operation === "mix"
    ? pick(level < 3 ? ["+", "-", "×"] : ["+", "-", "×", "÷"])
    : operation;

  let a, b, answer;

  if (op === "+") {
    const ranges = [[0,20],[20,100],[100,1000],[1000,99999]];
    const [min,max] = ranges[level-1];
    a=rand(min,max); b=rand(min,max); answer=a+b;
  } else if (op === "-") {
    const ranges = [[0,20],[20,100],[100,1000],[1000,99999]];
    const [min,max] = ranges[level-1];
    a=rand(min,max); b=rand(min,max);
    if (b>a) [a,b]=[b,a];
    answer=a-b;
  } else if (op === "×") {
    const ranges = [[0,10,0,10],[11,29,2,12],
                    [12,65,11,25],[101,999,16,99]];
    const [x,y,z,w] = ranges[level-1];
    a=rand(x,y); b=rand(z,w); answer=a*b;
  } else {
    b=rand(2,level===3?12:40);
    answer=rand(2,level===3?25:200);
    a=b*answer;
  }

  return {
    label:"Résous cette opération",
    question:`${a} ${op} ${b} = ?`,
    answer:String(answer),
    options:numericOptions(answer).map(String),
    hints:calculationHints(a,b,op),
    explanation:`${a} ${op} ${b} = ${answer}`
  };
}

function numericOptions(answer) {
  const options=new Set([answer]);
  while(options.size<4) {
    const step=Math.max(1,Math.floor(Math.abs(answer)*0.1));
    const value=answer+pick([-2,-1,1,2])*rand(1,step+2);
    options.add(value);
  }
  return shuffle([...options]);
}

function calculationHints(a,b,op) {
  if(op==="+") {
    const rounded=Math.round(b/10)*10;
    return [
      "Cherche une dizaine ou une centaine proche.",
      `Remplace ${b} par ${rounded}, puis compense.`,
      `${a} + ${rounded} + (${b-rounded}) = ${a+b}`
    ];
  }
  if(op==="-") {
    const rounded=Math.round(b/10)*10;
    return [
      "Soustrais d'abord un nombre rond.",
      `Soustrais ${rounded}, puis corrige la différence.`,
      `${a} - ${rounded} + ${rounded-b} = ${a-b}`
    ];
  }
  if(op==="×") {
    const tens=Math.floor(b/10)*10;
    return [
      "Décompose un facteur en dizaines et unités.",
      `Écris ${b} comme ${tens} + ${b-tens}.`,
      `${a} × ${tens} + ${a} × ${b-tens} = ${a*b}`
    ];
  }
  return [
    "Pense à l'opération inverse.",
    `Cherche quel nombre multiplié par ${b} donne ${a}.`,
    `${b} × ${a/b} = ${a}`
  ];
}

// 11. FIND THE DIFFERENCE

function genFocus() {
  const sizes=[6,9,10,12,15];
  const symbols=[
    ["◇","◈"],["○","◌"],["△","▵"],
    ["□","▢"],["◉","◎"],["◐","◑"],
    ["↗","↖"],["8","B"],["0","O"]
  ];

  const n=sizes[level-1];
  const [normal,different]=pick(symbols.slice(0,level+4));
  const odd=rand(0,n*n-1);

  return {
    n,normal,different,odd,
    answer:String(odd),
    hints:[
      "Compare les contours des symboles.",
      "Balaye la grille ligne par ligne.",
      "Cherche une petite différence de forme ou d'orientation."
    ],
    explanation:`L'intrus était ligne ${Math.floor(odd/n)+1}, colonne ${odd%n+1}.`
  };
}

function renderFocus(c) {
  return `
    <h2>Find the Difference</h2>
    <p class="subprompt">Trouve l'intrus parmi ${c.n*c.n} symboles.</p>
    <div class="grid-board"
      style="grid-template-columns:repeat(${c.n},minmax(0,1fr));max-width:600px">
      ${Array.from({length:c.n*c.n},(_,i)=>`
        <button data-cell="${i}" style="font-size:clamp(10px,1.8vw,23px)">
          ${i===c.odd?c.different:c.normal}
        </button>
      `).join("")}
    </div>
  `;
}

// 12. VISUAL IQ

function genIQ() {
  const symbols=["●","▲","■","◆","★","⬢"];
  const type=pick(level===1?["count","shape"]:
    ["count","shape","rotation"]);

  let cells=[],answer,options,hints;

  if(type==="count") {
    const symbol=pick(symbols);
    const base=rand(1,2);
    cells=Array.from({length:9},(_,i)=>
      symbol.repeat(base+i%3));
    answer=cells[8];
    options=shuffle([
      symbol.repeat(base),
      symbol.repeat(base+1),
      symbol.repeat(base+2),
      symbol.repeat(base+3)
    ]);
    hints=[
      "Observe le nombre de symboles.",
      "Compare les trois colonnes.",
      "Le nombre augmente de 1 à chaque colonne."
    ];
  } else if(type==="shape") {
    const seq=shuffle(symbols).slice(0,3);
    cells=Array.from({length:9},(_,i)=>
      seq[(i%3+Math.floor(i/3))%3]);
    answer=cells[8];
    options=shuffle([answer,...symbols.filter(x=>x!==answer).slice(0,3)]);
    hints=[
      "Compare les formes dans les lignes.",
      "La séquence se décale à chaque ligne.",
      "La dernière case respecte le même décalage."
    ];
  } else {
    const arrows=["↑","→","↓","←"];
    const start=rand(0,3);
    cells=Array.from({length:9},(_,i)=>
      arrows[(start+i%3+Math.floor(i/3))%4]);
    answer=cells[8];
    options=shuffle(arrows);
    hints=[
      "Observe les orientations.",
      "Chaque étape est une rotation.",
      "Avancer à droite ou en bas fait tourner de 90°."
    ];
  }

  cells[8]="?";

  return {
    cells,answer,options,hints,
    explanation:`La case manquante est ${answer}.`
  };
}

function renderIQ(c) {
  return `
    <h2>Visual IQ</h2>
    <p class="subprompt">Complète la matrice logique.</p>
    <div class="matrix">
      ${c.cells.map((symbol,i)=>`
        <div class="matrixcell ${i===8?"question":""}">${symbol}</div>
      `).join("")}
    </div>
    ${mode==="qcm" ? optionButtons(c.options) : `
      <div class="inputline">
        <input id="answer" class="field center" placeholder="Symboles"/>
        <button id="check" class="btn primary">Valider</button>
      </div>
    `}
  `;
}

// 13. MIND LOGIC

function genLogic() {
  const type=level===1?"missing":
    pick(["missing","sequence","symbols","pyramid","code"]);

  if(type==="missing") {
    const a=rand(3,level*20+10),b=rand(2,25);
    return {
      label:"Nombre manquant",
      question:`${a} + ? = ${a+b}`,
      answer:String(b),
      options:numericOptions(b).map(String),
      hints:[
        "Utilise l'opération inverse.",
        "Soustrais le nombre connu.",
        `${a+b} - ${a} = ${b}`
      ],
      explanation:`La réponse est ${b}.`
    };
  }

  if(type==="sequence") {
    const start=rand(1,20),step=rand(2,15);
    const seq=Array.from({length:4},(_,i)=>start+i*step);
    const answer=start+4*step;
    return {
      label:"Trouve la règle",
      question:seq.join(" · ")+" · ?",
      answer:String(answer),
      options:numericOptions(answer).map(String),
      hints:[
        "Observe les différences entre les termes.",
        "La différence est constante.",
        `Chaque terme augmente de ${step}.`
      ],
      explanation:`Réponse : ${answer}.`
    };
  }

  if(type==="symbols") {
    const x=rand(3,15),y=rand(2,12);
    return {
      label:"Équations de symboles",
      question:`◆ + ◆ = ${2*x}\n◆ + ● = ${x+y}\n● = ?`,
      answer:String(y),
      options:numericOptions(y).map(String),
      hints:[
        "Commence par trouver ◆.",
        "Divise la première équation par deux.",
        `◆ = ${x}, donc ● = ${y}.`
      ],
      explanation:`● vaut ${y}.`
    };
  }

  if(type==="pyramid") {
    const a=rand(1,15),b=rand(1,15),c=rand(1,15);
    const answer=a+2*b+c;
    return {
      label:"Pyramide numérique",
      question:`Base : ${a} ${b} ${c}\nChaque case supérieure est la somme des deux cases inférieures.\nSommet = ?`,
      answer:String(answer),
      options:numericOptions(answer).map(String),
      hints:[
        "Commence par les deux cases du milieu.",
        "Additionne les nombres voisins.",
        `(${a}+${b}) + (${b}+${c}) = ${answer}`
      ],
      explanation:`Sommet = ${answer}.`
    };
  }

  const a=rand(1,7),b=rand(1,7),last=(a+b)%10;
  const code=`${a}${b}${last}`;
  const wrong=new Set([code]);
  while(wrong.size<4) {
    wrong.add(`${rand(0,9)}${rand(0,9)}${rand(0,9)}`);
  }

  return {
    label:"Code Breaker",
    question:`Le premier chiffre est ${a}.\nLe deuxième est ${b}.\nLe troisième est le chiffre des unités de leur somme.`,
    answer:code,
    options:shuffle([...wrong]),
    hints:[
      "Lis attentivement chaque indice.",
      "Le troisième chiffre dépend des deux premiers.",
      `Le chiffre des unités de ${a}+${b} est ${last}.`
    ],
    explanation:`Code secret : ${code}`
  };
}

// 14. MIND SPEED

function genSpeed() {
  const type=pick(["comparison","pair","color","math"]);

  if(type==="comparison") {
    const a=rand(1,99),b=rand(1,99);
    const sign=pick(["<",">"]);
    const valid=sign==="<"?a<b:a>b;
    return {
      label:"Vrai ou faux ?",
      question:`${a} ${sign} ${b}`,
      answer:valid?"Vrai":"Faux",
      options:["Vrai","Faux"],
      hints:[
        "Observe les nombres.",
        "Compare d'abord les dizaines.",
        "Vérifie le sens du signe."
      ],
      explanation:`Cette comparaison est ${valid?"vraie":"fausse"}.`
    };
  }

  if(type==="pair") {
    const a=rand(1,99),even=a%2===0;
    return {
      label:"Ce nombre est-il pair ?",
      question:String(a),
      answer:even?"Oui":"Non",
      options:["Oui","Non"],
      hints:["Observe le dernier chiffre.","Pense à la divisibilité par deux.",
        "Les chiffres pairs sont 0, 2, 4, 6 et 8."],
      explanation:`${a} est ${even?"pair":"impair"}.`
    };
  }

  if(type==="color") {
    const colors={
      "🔴":"Rouge","🔵":"Bleu","🟢":"Vert","🟡":"Jaune"
    };
    const emoji=pick(Object.keys(colors));
    return {
      label:"Quelle est cette couleur ?",
      question:emoji,
      answer:colors[emoji],
      options:shuffle(Object.values(colors)),
      hints:["Observe le cercle.","Identifie sa couleur.",
        "Ne te laisse pas distraire."],
      explanation:`La couleur est ${colors[emoji]}.`
    };
  }

  const a=rand(1,9),b=rand(1,9);
  const proposed=a+b+pick([-1,0,0,1]);
  return {
    label:"Calcul vrai ou faux",
    question:`${a} + ${b} = ${proposed}`,
    answer:proposed===a+b?"Vrai":"Faux",
    options:["Vrai","Faux"],
    hints:["Additionne les deux nombres.","Compare le résultat.",
      "Vérifie toute l'égalité."],
    explanation:`${a}+${b}=${a+b}.`
  };
}

function startSpeedTimer() {
  stopTimer();
  timerStart=performance.now();
  const duration=level===1?5000:1000;

  timer=setInterval(()=>{
    const elapsed=performance.now()-timerStart;
    timeLeft=Math.max(0,(duration-elapsed)/1000);
    if($("#timeleft")) $("#timeleft").textContent=timeLeft.toFixed(2)+" s";

    if(elapsed>=duration) {
      stopTimer();
      if(!feedback && page==="play") submit(null,true);
    }
  },25);
}

// 15. MIND WORDS

// Corpus initial de démonstration.
// À remplacer par une grande base lexicale validée.

const dictionary={
  fr:[
    ["heureux","joyeux","triste"],
    ["rapide","véloce","lent"],
    ["calme","paisible","agité"],
    ["fragile","délicat","solide"],
    ["ancien","vieux","récent"],
    ["généreux","altruiste","avare"],
    ["prudent","circonspect","imprudent"],
    ["intense","puissant","faible"],
    ["éphémère","fugace","durable"],
    ["lucide","clairvoyant","confus"],
    ["prolixe","verbeux","laconique"],
    ["sibyllin","énigmatique","explicite"],
    ["inéluctable","inévitable","évitable"],
    ["apathique","indifférent","enthousiaste"],
    ["pérenne","durable","passager"],
    ["loquace","bavard","taciturne"],
    ["austère","sévère","orné"],
    ["prosaïque","banal","poétique"],
    ["vif","alerte","lent"],
    ["vaste","immense","exigu"]
  ],
  en:[
    ["happy","glad","sad"],
    ["fast","quick","slow"],
    ["calm","peaceful","agitated"],
    ["fragile","delicate","strong"],
    ["ancient","old","recent"],
    ["generous","giving","stingy"],
    ["cautious","careful","reckless"],
    ["intense","powerful","weak"],
    ["fleeting","brief","lasting"],
    ["lucid","clear","confused"],
    ["verbose","wordy","concise"],
    ["enigmatic","mysterious","obvious"],
    ["inevitable","unavoidable","avoidable"],
    ["apathetic","indifferent","eager"],
    ["perennial","lasting","temporary"],
    ["loquacious","talkative","reticent"],
    ["austere","severe","ornate"],
    ["mundane","ordinary","extraordinary"],
    ["bright","luminous","dim"],
    ["large","vast","tiny"]
  ]
};

function genWords() {
  const list=dictionary[language];
  const start=(level-1)*4;
  const [word,synonym,antonym]=pick(list.slice(start,start+4));
  const isAntonym=Math.random()<0.35;
  const answer=isAntonym?antonym:synonym;

  const others=shuffle([...new Set(list.flatMap(row=>[row[1],row[2]]))])
    .filter(x=>x!==answer).slice(0,3);

  return {
    label:isAntonym
      ?"Trouve le contraire / Find the antonym"
      :"Trouve le synonyme / Find the synonym",
    question:word,
    answer,accepted:[answer],
    options:shuffle([answer,...others]),
    hints:[
      "Réfléchis au sens du mot.",
      "Compare les nuances de sens.",
      `Dans cet exercice, le mot attendu est ${answer}.`
    ],
    explanation:`${word} → ${answer}`
  };
}

// 16. MIND SPATIAL

const directions=["↑","↗","→","↘","↓","↙","←","↖"];

function genSpatial() {
  const start=rand(0,7);
  const steps=pick([2,4,6]);
  const clockwise=pick([true,false]);
  const final=(start+(clockwise?steps:-steps)+16)%8;
  const answer=directions[final];

  return {
    label:"Rotation mentale",
    question:`${directions[start]} → rotation ${steps*45}° ${clockwise?"horaire":"antihoraire"} → ?`,
    answer,
    options:shuffle([answer,...shuffle(directions.filter(d=>d!==answer)).slice(0,3)]),
    hints:[
      "Imagine une horloge autour de la flèche.",
      "90° correspond à deux directions de 45°.",
      `Déplace-toi de ${steps} positions dans le sens indiqué.`
    ],
    explanation:`Direction finale : ${answer}.`
  };
}

// 17. MIND STRATEGY & TIME TRAVEL

function neighbors(index,n) {
  const r=Math.floor(index/n),c=index%n;
  return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]
    .filter(([x,y])=>x>=0&&x<n&&y>=0&&y<n)
    .map(([x,y])=>x*n+y);
}

function genMaze(timeTravel) {
  const n=[4,5,6,7,8][level-1];
  const goal=n*n-1;
  const walls=new Set();

  for(let i=1;i<goal;i++) {
    if(i%n!==0 && Math.floor(i/n)!==n-1 && Math.random()<0.13) {
      walls.add(i);
    }
  }

  const keyCell=timeTravel ? Math.floor(n/2)*n+1 : -1;
  const gateCell=timeTravel ? Math.floor(n/2)*n+2 : -1;
  walls.delete(keyCell);
  walls.delete(gateCell);

  // Vérifier qu'il existe un chemin valide.
  const reachable=(from,to,blocked)=>{
    const queue=[from],visited=new Set([from]);
    while(queue.length) {
      const current=queue.shift();
      if(current===to)return true;
      for(const next of neighbors(current,n)) {
        if(!blocked.has(next)&&!visited.has(next)) {
          visited.add(next);queue.push(next);
        }
      }
    }
    return false;
  };

  if(timeTravel) {
    const blocked=new Set([...walls,gateCell]);
    if(!reachable(0,keyCell,blocked) ||
       !reachable(keyCell,goal,walls)) walls.clear();
  } else if(!reachable(0,goal,walls)) {
    walls.clear();
  }

  return {
    n,goal,timeTravel,
    walls:[...walls],keyCell,gateCell,
    hints:[
      "Observe les obstacles avant de te déplacer.",
      timeTravel?"Récupère la clé avant la porte.":"Évite les détours inutiles.",
      "Reviens à une bifurcation si un chemin se termine en impasse."
    ],
    explanation:"Mission accomplie !"
  };
}

function renderMaze(c) {
  const b=board;

  return `
    <h2>${c.timeTravel?"Time Travel Strategy":"Strategy Master"}</h2>
    <p class="subprompt">
      ${c.timeTravel?"Récupère la clé puis atteins l'arrivée.":
        "Atteins le drapeau en évitant les murs."}
    </p>
    <p class="mini">${b.moves} mouvements
      ${c.timeTravel?`· ${b.rewinds} retours · Clé : ${b.hasKey?"oui":"non"}`:""}
    </p>

    <div class="maze" style="--cols:${c.n}">
      ${Array.from({length:c.n*c.n},(_,i)=>{
        const wall=c.walls.includes(i);
        const icon=i===b.position?"🧠":
          wall?"▩":
          i===c.goal?"🏁":
          c.timeTravel&&i===c.keyCell&&!b.hasKey?"🔑":
          c.timeTravel&&i===c.gateCell?"🚪":
          i===0?"S":"";
        const cls=i===b.position?"current":
          wall?"wall":
          i===c.goal?"goal":
          c.timeTravel&&i===c.keyCell&&!b.hasKey?"keycell":
          c.timeTravel&&i===c.gateCell?"door":
          b.path.includes(i)?"visited":"";
        return `<button class="${cls}" ${wall?"disabled":""}>${icon}</button>`;
      }).join("")}
    </div>

    <div class="dpad">
      <span></span><button data-move="up">↑</button><span></span>
      <button data-move="left">←</button>
      <button data-move="down">↓</button>
      <button data-move="right">→</button>
      <span></span>
    </div>

    ${c.timeTravel?`
      <div class="buttons" style="justify-content:center">
        <button class="btn" id="undo" ${b.history.length?"":"disabled"}>
          ↶ Rewind Time
        </button>
      </div>
      <div class="timeline">
        ${b.path.slice(-10).map((p,i)=>`<span>${i+1}. case ${p+1}</span>`).join("")}
      </div>`:""}

    ${b.position===c.goal?`
      <button class="btn primary" id="finishmaze">Valider la mission ✓</button>`:""}
  `;
}

function movePlayer(direction) {
  if(feedback)return;

  const c=challenge,b=board,n=c.n;
  const r=Math.floor(b.position/n),col=b.position%n;

  const offsets={
    up:[-1,0],down:[1,0],left:[0,-1],right:[0,1]
  };
  const [dr,dc]=offsets[direction];
  const nr=r+dr,nc=col+dc;

  if(nr<0||nr>=n||nc<0||nc>=n)return;

  const next=nr*n+nc;

  if(c.walls.includes(next)) {
    toast("Un mur bloque le passage.");
    return;
  }

  if(c.timeTravel && next===c.gateCell && !b.hasKey) {
    toast("Il faut d'abord récupérer la clé.");
    return;
  }

  b.history.push({
    position:b.position,
    moves:b.moves,
    path:[...b.path],
    hasKey:b.hasKey
  });

  b.position=next;
  b.moves++;
  b.path.push(next);

  if(c.timeTravel&&next===c.keyCell)b.hasKey=true;

  drawChallenge();

  if(next===c.goal)toast("Destination atteinte !");
}

function undoMove() {
  const previous=board.history.pop();
  if(!previous)return;

  board.position=previous.position;
  board.moves=previous.moves;
  board.path=previous.path;
  board.hasKey=previous.hasKey;
  board.rewinds++;
  drawChallenge();
}

// 18. DUAL TASK

function genDual() {
  const sequence=Array.from({length:level+3},()=>rand(0,9));
  const a=rand(3,10+level*10);
  const b=rand(2,8+level*5);

  return {
    sequence,a,b,
    answer:`${a+b}|${sequence.join("")}`,
    hints:[
      "Mémorise les chiffres en petits groupes.",
      "Effectue le calcul séparément.",
      "Restitue la somme puis la séquence dans l'ordre."
    ],
    explanation:`${a}+${b}=${a+b}, séquence : ${sequence.join("")}`
  };
}

function renderDual(c) {
  if(board.phase==="memorize")return `
    <h2>Dual Task</h2>
    <p class="subprompt">Mémorise les chiffres.</p>
    <div class="prompt">${c.sequence.join(" · ")}</div>
    <button id="ready" class="btn primary">J'ai mémorisé →</button>
  `;

  return `
    <h2>Deux tâches, un défi</h2>
    <div class="prompt">${c.a} + ${c.b} = ?</div>
    <p>Écris la somme puis la séquence mémorisée.</p>
    <div class="inputline">
      <input id="sum" class="field center" type="number" placeholder="Somme"/>
      <input id="memory" class="field center" inputmode="numeric"
        placeholder="Séquence"/>
    </div>
    <button id="dualcheck" class="btn primary">Vérifier</button>
  `;
}

// 19. PROGRESSION

function renderProgress() {
  const history=[...data.sessions].reverse().slice(0,25);

  layout(`
    ${topbar()}
    <div class="sectionhead">
      <div>
        <h1>Ta progression</h1>
        <p>Historique conservé sur ton appareil.</p>
      </div>
      <button class="btn" id="export">Exporter JSON</button>
    </div>

    <div class="statsgrid">
      <div class="stat"><small>XP</small><div class="number">${data.xp}</div></div>
      <div class="stat"><small>Sessions</small><div class="number">${data.sessions.length}</div></div>
      <div class="stat"><small>Précision</small><div class="number">${globalAccuracy()}%</div></div>
    </div>

    <div class="two-col">
      <div class="panel">
        <h3>Niveaux des jeux</h3>
        <div class="list">
          ${games.map(g=>{
            const p=progressFor(g.id);
            return `
              <div>
                <div style="display:flex;justify-content:space-between">
                  <span>${g.name}</span>
                  <small>Niveau ${p.level}/${g.levels}</small>
                </div>
                <div class="bar"><i style="width:${p.level/g.levels*100}%"></i></div>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div class="panel">
        <h3>Historique récent</h3>
        <div class="list">
          ${history.length?history.map(s=>`
            <div class="listitem">
              <div>
                <strong>${escapeHTML(games.find(g=>g.id===s.game)?.name||s.game)}</strong>
                <br><small>${new Date(s.date).toLocaleDateString("fr-FR")}</small>
              </div>
              <span class="badge">${s.correct}/${s.total}</span>
            </div>
          `).join(""):"<p>Aucune session enregistrée.</p>"}
        </div>
      </div>
    </div>
  `);

  $("#export").onclick=exportData;
}

function exportData() {
  const blob=new Blob([JSON.stringify(data,null,2)],
    {type:"application/json"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download="mind-progression.json";
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

// 20. PROFIL UTILISATEUR

function renderProfile() {
  layout(`
    ${topbar()}
    <div class="sectionhead">
      <h1>Mon profil</h1>
    </div>

    <div class="two-col">
      <div class="panel">
        <div class="avatar" style="width:66px;height:66px">
          ${escapeHTML(data.name[0])}
        </div>
        <h3>${escapeHTML(data.name)}</h3>
        <p class="muted">${data.xp} XP · ${data.sessions.length} sessions</p>

        <label>Nom du profil</label>
        <div class="inputline">
          <input id="nickname" class="field"
            value="${escapeHTML(data.name)}" maxlength="30"/>
          <button id="savename" class="btn primary">Enregistrer</button>
        </div>
      </div>

      <div class="panel">
        <h3>Mes données</h3>
        <p class="muted">Sauvegarde locale dans le navigateur.</p>
        <div class="buttons">
          <button class="btn" id="export">Exporter</button>
          <label class="btn">
            Importer
            <input id="import" type="file" accept="application/json" hidden/>
          </label>
          <button class="btn danger" id="reset">Effacer</button>
        </div>
        <h3>Préférences</h3>
        <div class="listitem">
          Animations réduites
          <input id="motion" type="checkbox"
            ${data.settings.reduceMotion?"checked":""}/>
        </div>
      </div>
    </div>
  `);

  $("#savename").onclick=()=>{
    const name=$("#nickname").value.trim();
    if(name) {
      data.name=name;
      saveData();
      renderProfile();
      toast("Profil enregistré.");
    }
  };

  $("#export").onclick=exportData;

  $("#import").onchange=async e=>{
    const file=e.target.files[0];
    if(!file)return;
    try {
      const imported=JSON.parse(await file.text());
      if(!Array.isArray(imported.sessions) ||
         typeof imported.xp!=="number" ||
         !imported.progress)throw Error("Format invalide");

      if(confirm("Remplacer la progression actuelle ?")) {
        data={...defaultData(),...imported};
        saveData();
        renderProfile();
        toast("Progression importée.");
      }
    } catch {
      toast("Fichier JSON invalide.");
    }
  };

  $("#reset").onclick=()=>{
    if(confirm("Supprimer toutes les données de MIND ?")) {
      data=defaultData();
      saveData();
      renderProfile();
    }
  };

  $("#motion").onchange=e=>{
    data.settings.reduceMotion=e.target.checked;
    saveData();
  };
}

// 21. DÉFI QUOTIDIEN

function renderDaily() {
  const today=new Date().toLocaleDateString("fr-FR");
  const suggested=["grid","calcul","focus","iq","speed"];

  layout(`
    ${topbar()}
    <div class="hero">
      <div class="eyebrow">DÉFI QUOTIDIEN · ${today}</div>
      <h1>5 défis pour aujourd'hui</h1>
      <p>Entraîne différentes compétences chaque jour.</p>
    </div>
    <div class="sectionhead"><h2>Ton parcours</h2></div>
    <div class="cardgrid">
      ${suggested.map(id=>gameCard(games.find(g=>g.id===id))).join("")}
    </div>
  `);
  bindGameCards();
}

// 22. DÉMARRAGE

render();
