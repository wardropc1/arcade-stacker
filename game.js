const COLS = 13;
const ROWS = 16;
const FINAL_LEVEL = 15;
const MINOR_LEVEL = 10;

const grid = document.querySelector("#grid");
const screen = document.querySelector("#screen");
const levelReadout = document.querySelector("#levelReadout");
const prizeReadout = document.querySelector("#prizeReadout");
const moneyReadout = document.querySelector("#moneyReadout");
const bettingToggle = document.querySelector("#bettingToggle");
const betInput = document.querySelector("#betInput");
const statusText = document.querySelector("#statusText");
const stopButton = document.querySelector("#stopButton");
const minorButton = document.querySelector("#minorButton");
const moneyRules = document.querySelector(".money-rules");
const difficultyButtons = document.querySelectorAll(".difficulty-button");

const DIFFICULTY_SPEEDS = {
  easy: 1,
  medium: 0.85,
  hard: 0.72,
};

let cells = [];
let lockedRows = new Map();
let currentLevel = 1;
let currentBlocks = [];
let position = 0;
let direction = 1;
let timerId = null;
let state = "ready";
let currentDifficulty = "easy";
let moneyTotal = 10;
let roundBet = 0;

function blockCountForLevel(level) {
  if (level >= 10) return 1;
  if (level >= 4) return 2;
  return 3;
}

function rowForLevel(level) {
  return ROWS - level;
}

function speedForLevel(level) {
  const easySpeed = 310 - level * 18;
  const difficulty = DIFFICULTY_SPEEDS[currentDifficulty] ?? DIFFICULTY_SPEEDS.easy;
  return Math.max(55, easySpeed * difficulty);
}

function prizeForLevel(level) {
  if (state === "minor") return "Minor prize ready";
  if (state === "paused") return "Paused";
  if (state === "ready") return "Ready";
  if (level > FINAL_LEVEL) return "Major prize";
  if (level > MINOR_LEVEL) return "Major run";
  if (level === MINOR_LEVEL) return "Minor prize row";
  return "Keep stacking";
}

function createGrid() {
  grid.innerHTML = "";
  cells = [];

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      grid.append(cell);
      cells.push(cell);
    }
  }
}

function cellAt(row, col) {
  return cells[row * COLS + col];
}

function setReadouts(message) {
  levelReadout.textContent = `${Math.min(currentLevel, FINAL_LEVEL)} / ${FINAL_LEVEL}`;
  prizeReadout.textContent = prizeForLevel(currentLevel);
  statusText.textContent = message;
}

function formatMoney(amount) {
  const absoluteAmount = Math.abs(amount);
  const formattedAmount = Number.isInteger(absoluteAmount)
    ? String(absoluteAmount)
    : absoluteAmount.toFixed(2);

  return `${amount < 0 ? "-" : ""}$${formattedAmount}`;
}

function updateMoney(amount) {
  moneyTotal += amount;
  moneyReadout.textContent = formatMoney(moneyTotal);
  updateBetControls();
}

function selectedBet() {
  return Math.min(Math.max(Number(betInput.value) || 0, 0), Math.max(moneyTotal, 0));
}

function updateBetRules() {
  if (roundBet > 0 || bettingToggle.checked) {
    moneyRules.innerHTML = "<span>Minor +100%</span><span>Major +150%</span><span>Miss -Bet</span>";
    return;
  }

  moneyRules.innerHTML = "<span>Minor +$10</span><span>Major +$50</span><span>Miss -$1</span>";
}

function updateBetControls() {
  const maxBet = Math.max(Math.floor(moneyTotal), 0);
  const requestedBet = Number(betInput.value) || 0;

  betInput.max = String(maxBet);
  betInput.disabled = !bettingToggle.checked || maxBet === 0;

  if (!bettingToggle.checked || maxBet === 0) {
    betInput.value = "0";
  } else if (requestedBet <= 0) {
    betInput.value = "1";
  } else if (requestedBet > maxBet) {
    betInput.value = String(maxBet);
  }

  updateBetRules();
}

function lockRoundBet() {
  roundBet = bettingToggle.checked ? selectedBet() : 0;
  updateBetRules();
}

function payoutForMinorPrize() {
  return roundBet > 0 ? roundBet : 10;
}

function payoutForMajorPrize() {
  return roundBet > 0 ? roundBet * 1.5 : 50;
}

function penaltyForMiss() {
  return roundBet > 0 ? -roundBet : -1;
}

function clearBoardClasses() {
  for (const cell of cells) {
    cell.className = "cell";
  }
}

function paintPrizeMarkers() {
  for (let col = 0; col < COLS; col += 1) {
    cellAt(rowForLevel(MINOR_LEVEL), col).classList.add("minor");
    cellAt(rowForLevel(FINAL_LEVEL), col).classList.add("major");
  }
}

function render() {
  clearBoardClasses();
  paintPrizeMarkers();

  for (const [level, blocks] of lockedRows) {
    const row = rowForLevel(level);
    for (const col of blocks) {
      cellAt(row, col).classList.add("locked");
    }
  }

  if (state === "playing" || state === "ready" || state === "paused") {
    const row = rowForLevel(currentLevel);
    for (const col of currentBlocks) {
      cellAt(row, col).classList.add("block");
    }
  }
}

function setPrimaryButtonLabel() {
  if (state === "playing") {
    stopButton.textContent = "Stop";
    return;
  }

  if (state === "minor") {
    stopButton.textContent = "Continue";
    return;
  }

  stopButton.textContent = "Begin";
}

function readyMessage() {
  if (roundBet > 0) {
    return `Betting mode active: ${formatMoney(roundBet)} wager locked. Press Begin to start.`;
  }

  if (bettingToggle.checked) {
    return "Betting mode is on, but you need money before a wager can be locked.";
  }

  return "Press Begin or Space to start.";
}

function makeBlocks(start, count) {
  return Array.from({ length: count }, (_, index) => start + index);
}

function startRowTimer(count) {
  window.clearInterval(timerId);

  timerId = window.setInterval(() => {
    if (position + direction < 0 || position + direction + count > COLS) {
      direction *= -1;
    }

    position += direction;
    currentBlocks = makeBlocks(position, count);
    render();
  }, speedForLevel(currentLevel));
}

function setStartingBlocks() {
  const count = blockCountForLevel(currentLevel);
  position = Math.floor((COLS - count) / 2);
  direction = 1;
  currentBlocks = makeBlocks(position, count);
}

function startMovingRow() {
  const count = blockCountForLevel(currentLevel);
  setStartingBlocks();
  startRowTimer(count);
  render();
}

function applyDifficultyChange() {
  if (state !== "playing") return;
  startRowTimer(blockCountForLevel(currentLevel));
}

function setDifficulty(difficulty) {
  currentDifficulty = difficulty;

  for (const button of difficultyButtons) {
    const isActive = button.dataset.difficulty === difficulty;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }

  applyDifficultyChange();
}

function prepareRound() {
  window.clearInterval(timerId);
  lockedRows = new Map();
  currentLevel = 1;
  state = "ready";
  lockRoundBet();
  screen.classList.remove("win");
  minorButton.disabled = true;
  stopButton.disabled = false;
  setStartingBlocks();
  setPrimaryButtonLabel();
  setReadouts(readyMessage());
  render();
}

function startRound() {
  if (state !== "ready") return;
  state = "playing";
  setPrimaryButtonLabel();
  startMovingRow();
}

function pauseRound() {
  if (state !== "playing") return;
  window.clearInterval(timerId);
  state = "paused";
  setPrimaryButtonLabel();
  setReadouts("Paused. Press Begin to resume, or Space to lock this row.");
  render();
}

function resumeRound() {
  if (state !== "paused") return;
  state = "playing";
  setPrimaryButtonLabel();
  setReadouts("Row moving. Press Space to lock it.");
  startRowTimer(blockCountForLevel(currentLevel));
}

function pauseForMinorPrize() {
  window.clearInterval(timerId);
  state = "minor";
  minorButton.disabled = false;
  setPrimaryButtonLabel();
  setReadouts("Minor prize reached. Take it, or press Continue / Space to go for the major prize.");
  render();
}

function finishGame(message, won = false) {
  window.clearInterval(timerId);
  state = won ? "won" : "over";
  roundBet = 0;
  stopButton.disabled = false;
  minorButton.disabled = true;
  screen.classList.toggle("win", won);
  updateBetControls();
  setPrimaryButtonLabel();
  setReadouts(message);
  render();
}

function continuePastMinorPrize() {
  if (state !== "minor") return;
  state = "playing";
  currentLevel += 1;
  minorButton.disabled = true;
  setPrimaryButtonLabel();
  setReadouts("Going for the major prize.");
  startMovingRow();
}

function lockCurrentRow() {
  if (state === "paused") {
    state = "playing";
    setPrimaryButtonLabel();
  }

  if (state !== "playing") return;

  window.clearInterval(timerId);

  const previousBlocks = lockedRows.get(currentLevel - 1);
  const alignedBlocks = previousBlocks
    ? currentBlocks.filter((col) => previousBlocks.includes(col))
    : [...currentBlocks];

  if (alignedBlocks.length === 0) {
    updateMoney(penaltyForMiss());
    finishGame("Game over. The row missed the stack.");
    return;
  }

  lockedRows.set(currentLevel, alignedBlocks);

  if (currentLevel === FINAL_LEVEL) {
    currentLevel += 1;
    updateMoney(payoutForMajorPrize());
    finishGame("Major prize won.", true);
    return;
  }

  if (currentLevel === MINOR_LEVEL) {
    pauseForMinorPrize();
    return;
  }

  currentLevel += 1;
  minorButton.disabled = true;
  const message = currentLevel === MINOR_LEVEL
    ? "Lock this row to reach the minor prize."
    : "Nice lock. The next row is faster.";
  setReadouts(message);
  startMovingRow();
}

function handlePrimaryAction() {
  if (state === "over" || state === "won") {
    prepareRound();
    startRound();
    return;
  }

  if (state === "ready") {
    startRound();
    return;
  }

  if (state === "minor") {
    continuePastMinorPrize();
    return;
  }

  if (state === "paused") {
    resumeRound();
    return;
  }

  pauseRound();
}

function takeMinorPrize() {
  if (state !== "minor") return;
  updateMoney(payoutForMinorPrize());
  finishGame("Minor prize accepted. Game complete.");
}

stopButton.addEventListener("click", () => {
  stopButton.blur();
  handlePrimaryAction();
});
minorButton.addEventListener("click", takeMinorPrize);
bettingToggle.addEventListener("change", updateBetControls);
betInput.addEventListener("input", updateBetControls);

for (const button of difficultyButtons) {
  button.addEventListener("click", () => {
    setDifficulty(button.dataset.difficulty);
  });
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    if (event.target.closest("button, input, summary")) return;
    event.preventDefault();
    if (state === "ready" || state === "over" || state === "won") {
      handlePrimaryAction();
    } else if (state === "minor") {
      continuePastMinorPrize();
    } else {
      lockCurrentRow();
    }
  }

  if (event.key.toLowerCase() === "r") {
    prepareRound();
  }
});

createGrid();
updateBetControls();
prepareRound();
