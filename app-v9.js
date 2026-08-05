let settings = {};
let projects = [];
let pairs = [];
let responses = [];
let current = 0;
let participant = "";
let sessionId = "";
let pairStartedAt = 0;
let countdownTimer = null;

const $ = (id) => document.getElementById(id);
const ui = {
  accessScreen: $("accessScreen"), testScreen: $("testScreen"), accessForm: $("accessForm"),
  accessTitle: $("accessTitle"), participantId: $("participantId"), accessError: $("accessError"),
  title: $("title"), instructions: $("instructions"), progress: $("progress"), progressBar: $("progressBar"),
  comparisonArea: $("comparisonArea"), leftImage: $("leftImage"), rightImage: $("rightImage"),
  leftName: $("leftName"), rightName: $("rightName"), leftCard: $("leftCard"), rightCard: $("rightCard"),
  preference: $("preference"), preferenceText: $("preferenceText"), comment: $("comment"),
  nextButton: $("nextButton"), saveExitButton: $("saveExitButton"), saveStatus: $("saveStatus"),
  finish: $("finish"), rankingPreview: $("rankingPreview"), exportCSV: $("exportCSV"), restartButton: $("restartButton")
};

function showOnly(screen) {
  ui.accessScreen.hidden = screen !== "access";
  ui.testScreen.hidden = screen === "access";
  ui.comparisonArea.hidden = screen !== "test";
  ui.finish.hidden = screen !== "finish";
}

showOnly("access");
initialize();

async function initialize() {
  try {
    settings = await loadKeyValueCsv("settings.csv", "field", "value");
    const manifest = await loadCsv("projects.csv");
    const projectIds = manifest.map((row) => String(row.project_id || "").trim()).filter(Boolean);
    if (!projectIds.length) throw new Error("projects.csv does not list any project folders.");
    projects = (await Promise.all(projectIds.map(loadProject))).filter((project) => project.items.length >= 2);
    if (!projects.length) throw new Error("Each project needs at least two images.");
    ui.accessTitle.textContent = settings.study_title || "Preference Tests";
    ui.instructions.textContent = settings.instructions || "Compare each pair and rate your preference.";
    ui.participantId.value = localStorage.getItem("pairwise-last-participant") || "";
    buildPairs();
  } catch (error) {
    ui.accessError.textContent = error.message;
  }
}

async function loadProject(projectId) {
  const basePath = `projects/${projectId}/`;
  const rows = await loadCsv(`${basePath}project.csv`);
  let title = `Project ${projectId}`;
  const items = [];
  rows.forEach((row, index) => {
    const type = String(row.type || "").trim().toLowerCase();
    const value = String(row.value || "").trim();
    if (type === "title" && value) title = value;
    if (type === "image" && value) items.push({
      id: `${projectId}-${index + 1}`,
      file: value.split("/").pop(),
      image: new URL(value, new URL(basePath, window.location.href)).href
    });
  });
  return { id: projectId, title, items };
}

function buildPairs() {
  pairs = [];
  projects.forEach((project) => {
    for (let i = 0; i < project.items.length; i += 1) {
      for (let j = i + 1; j < project.items.length; j += 1) {
        let left = project.items[i];
        let right = project.items[j];
        if (Math.random() < 0.5) [left, right] = [right, left];
        pairs.push({ projectId: project.id, projectTitle: project.title, left, right });
      }
    }
  });
  shuffle(pairs);
}

function projectSignature() {
  return projects.map((p) => `${p.id}:${p.items.map((i) => i.image).join("|")}`).join("||");
}

function storageKey() {
  return `pairwise-progress:${projectSignature()}:${participant.toLowerCase()}`;
}

ui.accessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  ui.accessError.textContent = "";
  participant = ui.participantId.value.trim();
  if (!participant) return void (ui.accessError.textContent = "Enter your name.");
  localStorage.setItem("pairwise-last-participant", participant);
  restoreProgress();
  if (!sessionId) sessionId = new Date().toISOString();
  current >= pairs.length ? finishTest() : showPair();
});

function showPair() {
  if (current >= pairs.length) return finishTest();
  showOnly("test");
  const pair = pairs[current];
  ui.title.textContent = pair.projectTitle;
  ui.leftImage.src = pair.left.image;
  ui.rightImage.src = pair.right.image;
  ui.leftName.textContent = "A";
  ui.rightName.textContent = "B";
  ui.progress.textContent = `${current + 1} / ${pairs.length}`;
  ui.progressBar.style.width = `${((current + 1) / pairs.length) * 100}%`;
  ui.preference.value = "0";
  ui.comment.value = "";
  ui.saveStatus.textContent = "";
  updatePreferenceUI();
  pairStartedAt = performance.now();
  startCountdown();
}

function startCountdown() {
  clearInterval(countdownTimer);
  const minimumMs = Math.max(0, Number(settings.minimum_view_seconds || 0) * 1000);
  ui.nextButton.disabled = minimumMs > 0;
  const update = () => {
    const remaining = Math.max(0, Math.ceil((minimumMs - (performance.now() - pairStartedAt)) / 1000));
    ui.nextButton.textContent = remaining ? `Review options (${remaining}s)` : "Submit & continue";
    ui.nextButton.disabled = remaining > 0;
    if (!remaining) clearInterval(countdownTimer);
  };
  update();
  countdownTimer = setInterval(update, 200);
}

ui.preference.addEventListener("input", updatePreferenceUI);
function updatePreferenceUI() {
  const value = Number(ui.preference.value);
  ui.leftCard.classList.toggle("selected", value < 0);
  ui.rightCard.classList.toggle("selected", value > 0);
  if (value === 0) ui.preferenceText.textContent = "No preference";
  else {
    const wording = Math.abs(value) >= 4 ? "Strongly prefer" : Math.abs(value) >= 2 ? "Prefer" : "Slightly prefer";
    ui.preferenceText.textContent = `${wording} ${value < 0 ? "A" : "B"}`;
  }
}

ui.nextButton.addEventListener("click", () => {
  if (ui.nextButton.disabled) return;
  const pair = pairs[current];
  const value = Number(ui.preference.value);
  responses.push({
    sessionId, participant, comparison: current + 1, projectId: pair.projectId, projectTitle: pair.projectTitle,
    leftLabel: "A", leftId: pair.left.id, leftImage: pair.left.file,
    rightLabel: "B", rightId: pair.right.id, rightImage: pair.right.file,
    preference: value, winner: value < 0 ? "A" : value > 0 ? "B" : "Tie", strength: Math.abs(value),
    comment: ui.comment.value.trim(), responseTimeMs: Math.round(performance.now() - pairStartedAt),
    timestamp: new Date().toISOString()
  });
  current += 1;
  saveProgress();
  showPair();
});

ui.saveExitButton.addEventListener("click", () => {
  saveProgress();
  ui.saveStatus.textContent = "Progress saved in this browser.";
});

function saveProgress() {
  if (!participant) return;
  localStorage.setItem(storageKey(), JSON.stringify({ participant, sessionId, current, pairs, responses }));
}

function restoreProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey()) || "null");
    if (data && data.participant === participant && Array.isArray(data.pairs) && data.pairs.length === pairs.length) {
      sessionId = data.sessionId || "";
      current = Number(data.current) || 0;
      pairs = data.pairs;
      responses = Array.isArray(data.responses) ? data.responses : [];
    }
  } catch {
    localStorage.removeItem(storageKey());
  }
}

function finishTest() {
  clearInterval(countdownTimer);
  showOnly("finish");
  ui.title.textContent = settings.study_title || "Preference Tests";
  ui.progress.textContent = `${pairs.length} / ${pairs.length}`;
  ui.progressBar.style.width = "100%";
  renderRankings();
  saveProgress();
}

function calculateRankings() {
  return projects.map((project) => {
    const scores = new Map(project.items.map((item) => [item.file, 0]));
    responses.filter((r) => r.projectId === project.id).forEach((r) => {
      scores.set(r.leftImage, (scores.get(r.leftImage) || 0) - r.preference);
      scores.set(r.rightImage, (scores.get(r.rightImage) || 0) + r.preference);
    });
    return { title: project.title, items: [...scores].map(([file, score]) => ({ file, score })).sort((a, b) => b.score - a.score) };
  });
}

function renderRankings() {
  ui.rankingPreview.innerHTML = calculateRankings().map((project) => {
    const rows = project.items.map((item, index) => `<div class="rank-row"><span class="rank-number">${index + 1}</span><strong>${escapeHtml(item.file)}</strong><span class="rank-score">${item.score}</span></div>`).join("");
    return `<div class="project-ranking"><h3>${escapeHtml(project.title)}</h3>${rows}</div>`;
  }).join("");
}

ui.exportCSV.addEventListener("click", () => {
  const rows = [["Session ID","Participant","Comparison","Project ID","Project Title","Left Label","Left ID","Left Image","Right Label","Right ID","Right Image","Preference","Winner","Strength","Comment","Response Time (ms)","Timestamp"]];
  responses.forEach((r) => rows.push([r.sessionId,r.participant,r.comparison,r.projectId,r.projectTitle,r.leftLabel,r.leftId,r.leftImage,r.rightLabel,r.rightId,r.rightImage,r.preference,r.winner,r.strength,r.comment,r.responseTimeMs,r.timestamp]));
  const date = (sessionId || new Date().toISOString()).slice(0, 10);
  const count = responses.length;
  downloadCsv(rows, `${safeFileName(participant)} - ${date} - ${count} comparisons.csv`);
});

ui.restartButton.addEventListener("click", () => {
  if (participant) localStorage.removeItem(storageKey());
  responses = [];
  current = 0;
  participant = "";
  sessionId = "";
  buildPairs();
  ui.participantId.value = "";
  showOnly("access");
});

async function loadCsv(path) {
  const response = await fetch(`${path}?ts=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return parseCsv(await response.text());
}

async function loadKeyValueCsv(path, keyColumn, valueColumn) {
  const rows = await loadCsv(path);
  return Object.fromEntries(rows.map((row) => [String(row[keyColumn] || "").trim(), String(row[valueColumn] || "").trim()]).filter(([key]) => key));
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const clean = rows.filter((r) => r.some((cell) => String(cell).trim() !== ""));
  const headers = (clean.shift() || []).map((header) => header.trim());
  return clean.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function downloadCsv(rows, filename) {
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeFileName(value) {
  return String(value || "participant").trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").replace(/\s+/g, " ") || "participant";
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
