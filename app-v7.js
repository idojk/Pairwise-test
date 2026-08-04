let config;
let pairs = [];
let responses = [];
let current = 0;
let participant = "";
let pairStartedAt = 0;
let countdownTimer = null;

const MIN_VIEW_TIME_MS = 10000;
const $ = (id) => document.getElementById(id);
const ui = {
  accessScreen: $("accessScreen"), testScreen: $("testScreen"), accessForm: $("accessForm"),
  accessTitle: $("accessTitle"), participantId: $("participantId"), accessCode: $("accessCode"),
  accessError: $("accessError"), title: $("title"), instructions: $("instructions"), progress: $("progress"),
  progressBar: $("progressBar"), comparisonArea: $("comparisonArea"), leftImage: $("leftImage"),
  rightImage: $("rightImage"), leftName: $("leftName"), rightName: $("rightName"), leftCard: $("leftCard"),
  rightCard: $("rightCard"), preference: $("preference"), preferenceText: $("preferenceText"), comment: $("comment"),
  nextButton: $("nextButton"), saveExitButton: $("saveExitButton"), saveStatus: $("saveStatus"), finish: $("finish"),
  rankingPreview: $("rankingPreview"), exportCSV: $("exportCSV"), restartButton: $("restartButton")
};

function showOnly(screen) {
  ui.accessScreen.hidden = screen !== "access";
  ui.testScreen.hidden = screen === "access";
  ui.comparisonArea.hidden = screen !== "test";
  ui.finish.hidden = screen !== "finish";
}

showOnly("access");

fetch(`config.json?ts=${Date.now()}`, { cache: "no-store" })
  .then((r) => { if (!r.ok) throw new Error("Could not load config.json"); return r.json(); })
  .then((data) => {
    config = data;
    ui.accessTitle.textContent = config.testName || "Preference Test";
    ui.title.textContent = config.testName || "Preference Test";
    ui.instructions.textContent = config.instructions || "Compare each pair and rate your preference.";
    buildPairs();
    ui.participantId.value = localStorage.getItem("pairwise-last-participant") || "";
  })
  .catch((error) => { ui.accessError.textContent = error.message; });

function buildPairs() {
  pairs = [];
  const items = Array.isArray(config?.items) ? config.items : [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) pairs.push([items[i], items[j]]);
  }
  for (let i = pairs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
}

function storageKey() {
  const itemSignature = (config.items || []).map((item) => `${item.id}:${item.image}`).join("|");
  return `pairwise-progress:${config.testName}:${itemSignature}`;
}

ui.accessForm.addEventListener("submit", (event) => {
  event.preventDefault();
  ui.accessError.textContent = "";
  if (!config) return;
  participant = ui.participantId.value.trim();
  const requiredCode = String(config.accessCode || "").trim();
  if (!participant) return void (ui.accessError.textContent = "Enter a participant name or ID.");
  if (requiredCode && ui.accessCode.value.trim() !== requiredCode) return void (ui.accessError.textContent = "That access code is not correct.");
  localStorage.setItem("pairwise-last-participant", participant);
  restoreProgress();
  current >= pairs.length && pairs.length ? finishTest() : showPair();
});

function showPair() {
  if (!pairs.length) return void (ui.accessError.textContent = "Add at least two items to config.json.");
  if (current >= pairs.length) return finishTest();
  showOnly("test");
  const [left, right] = pairs[current];
  ui.leftImage.src = left.image;
  ui.rightImage.src = right.image;
  ui.leftName.textContent = left.name;
  ui.rightName.textContent = right.name;
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
  ui.nextButton.disabled = true;
  const update = () => {
    const remaining = Math.max(0, Math.ceil((MIN_VIEW_TIME_MS - (performance.now() - pairStartedAt)) / 1000));
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
  const [left, right] = pairs[current] || [{ name: "Left" }, { name: "Right" }];
  ui.leftCard.classList.toggle("selected", value < 0);
  ui.rightCard.classList.toggle("selected", value > 0);
  if (value === 0) ui.preferenceText.textContent = "No preference";
  else {
    const wording = Math.abs(value) >= 4 ? "Strongly prefer" : Math.abs(value) >= 2 ? "Prefer" : "Slightly prefer";
    ui.preferenceText.textContent = `${wording} ${value < 0 ? left.name : right.name}`;
  }
}

ui.nextButton.addEventListener("click", () => {
  const elapsed = performance.now() - pairStartedAt;
  if (elapsed < MIN_VIEW_TIME_MS || ui.nextButton.disabled) return;
  const [left, right] = pairs[current];
  const value = Number(ui.preference.value);
  responses.push({
    participant, comparison: current + 1, leftId: left.id || "", left: left.name,
    rightId: right.id || "", right: right.name, preference: value,
    winner: value < 0 ? left.name : value > 0 ? right.name : "Tie",
    strength: Math.abs(value), comment: ui.comment.value.trim(),
    responseTimeMs: Math.round(elapsed), timestamp: new Date().toISOString()
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
  localStorage.setItem(storageKey(), JSON.stringify({ participant, current, pairs, responses }));
}

function restoreProgress() {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey()) || "null");
    if (data && data.participant === participant && Array.isArray(data.pairs) && data.pairs.length === pairs.length) {
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
  ui.progress.textContent = `${pairs.length} / ${pairs.length}`;
  ui.progressBar.style.width = "100%";
  renderRankings();
  saveProgress();
}

function calculateRankings() {
  const ratings = new Map((config.items || []).map((item) => [item.name, 1500]));
  const counts = new Map((config.items || []).map((item) => [item.name, 0]));
  responses.forEach((r) => {
    const leftRating = ratings.get(r.left) ?? 1500;
    const rightRating = ratings.get(r.right) ?? 1500;
    const expectedLeft = 1 / (1 + 10 ** ((rightRating - leftRating) / 400));
    const scoreLeft = r.preference < 0 ? 1 : r.preference > 0 ? 0 : 0.5;
    const multiplier = r.preference === 0 ? 1 : 0.75 + Math.abs(r.preference) / 5;
    const change = 32 * multiplier * (scoreLeft - expectedLeft);
    ratings.set(r.left, leftRating + change);
    ratings.set(r.right, rightRating - change);
    counts.set(r.left, (counts.get(r.left) || 0) + 1);
    counts.set(r.right, (counts.get(r.right) || 0) + 1);
  });
  return [...ratings].map(([name, rating]) => ({ name, rating: Math.round(rating), comparisons: counts.get(name) || 0 })).sort((a, b) => b.rating - a.rating);
}

function renderRankings() {
  ui.rankingPreview.innerHTML = calculateRankings().map((item, index) => `<div class="rank-row"><span class="rank-number">${index + 1}</span><strong>${escapeHtml(item.name)}</strong><span class="rank-score">${item.rating}</span></div>`).join("");
}

ui.exportCSV.addEventListener("click", () => {
  const rows = [["Participant","Comparison","Left ID","Left Option","Right ID","Right Option","Preference","Winner","Strength","Comment","Response Time (ms)","Timestamp"]];
  responses.forEach((r) => rows.push([r.participant,r.comparison,r.leftId,r.left,r.rightId,r.right,r.preference,r.winner,r.strength,r.comment,r.responseTimeMs,r.timestamp]));
  downloadCsv(rows, `${safeFileName(config.testName)}-${safeFileName(participant)}-responses.csv`);
});

ui.restartButton.addEventListener("click", () => {
  localStorage.removeItem(storageKey());
  responses = [];
  current = 0;
  participant = "";
  buildPairs();
  ui.accessCode.value = "";
  ui.participantId.value = "";
  showOnly("access");
});

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
  return String(value || "results").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "results";
}
function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
