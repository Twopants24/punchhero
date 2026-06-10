import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js";

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x7ec8ff, 18, 48);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 5.2, 9.4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.background = new THREE.Color(0x8ed0ff);

const hemiLight = new THREE.HemisphereLight(0xfff0cf, 0x5b88c9, 1.9);
scene.add(hemiLight);

const sun = new THREE.DirectionalLight(0xfff5db, 2.4);
sun.position.set(7, 14, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -20;
sun.shadow.camera.right = 20;
sun.shadow.camera.top = 20;
sun.shadow.camera.bottom = -20;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(28, 80),
  new THREE.MeshStandardMaterial({
    color: 0x6bb36d,
    roughness: 0.95,
    metalness: 0.02,
  }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const ring = new THREE.Mesh(
  new THREE.RingGeometry(8.5, 9.1, 64),
  new THREE.MeshBasicMaterial({ color: 0xf4e1a1, side: THREE.DoubleSide }),
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.02;
scene.add(ring);

const blocks = new THREE.Group();
scene.add(blocks);

for (let i = 0; i < 20; i += 1) {
  const angle = (i / 20) * Math.PI * 2;
  const radius = 11 + (i % 3) * 1.5;
  const stone = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.6 + Math.random() * 1.2, 1.2),
    new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? 0x768e99 : 0x9ea4ad,
      roughness: 1,
    }),
  );
  stone.position.set(Math.cos(angle) * radius, stone.geometry.parameters.height / 2, Math.sin(angle) * radius);
  stone.rotation.y = Math.random() * Math.PI;
  stone.castShadow = true;
  stone.receiveShadow = true;
  blocks.add(stone);
}

const keys = new Set();
const character = buildCharacter();
scene.add(character.root);
const cpuCharacter = buildCharacter({
  bodyColor: 0x4e7dff,
  darkColor: 0x162347,
  gloveColor: 0x0d1020,
  mouthColor: 0x445a9a,
  windColor: 0xc9e3ff,
});
cpuCharacter.root.position.set(3.2, 0, -2.8);
scene.add(cpuCharacter.root);
const lockStatus = document.getElementById("lock-status");
const crosshair = document.querySelector(".crosshair");
const staminaFill = document.getElementById("stamina-fill");
const playerHealthFill = document.getElementById("player-health-fill");
const cpuHealthFill = document.getElementById("cpu-health-fill");
const gameOver = document.getElementById("game-over");
const gameOverTitle = document.getElementById("game-over-title");
const gameOverText = document.getElementById("game-over-text");
const startMenu = document.getElementById("start-menu");
const playButton = document.getElementById("play-button");
const countdownEl = document.getElementById("countdown");
const classSelect = document.getElementById("class-select");
const classButtons = Array.from(document.querySelectorAll("[data-class]"));
const modeSelect = document.getElementById("mode-select");
const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));
const cpuSelect = document.getElementById("cpu-select");
const cpuButtons = Array.from(document.querySelectorAll("[data-cpu]"));
const difficultySlider = document.getElementById("difficulty-slider");
const difficultyValue = document.getElementById("difficulty-value");
const hintE = document.getElementById("hint-e");
const hint1 = document.getElementById("hint-1");
const hint2 = document.getElementById("hint-2");
const hint3 = document.getElementById("hint-3");
const hintQ = document.getElementById("hint-q");
const hintC = document.getElementById("hint-c");
const enemyHud = document.getElementById("enemy-hud");
const enemyHudName = document.getElementById("enemy-hud-name");
const pauseMenu = document.getElementById("pause-menu");
const controlsModal = document.getElementById("controls-modal");
const resumeButton = document.getElementById("resume-button");
const controlsButton = document.getElementById("controls-button");
const startMenuButton = document.getElementById("start-menu-button");
const closeControlsButton = document.getElementById("close-controls-button");

const state = createActorState();
state.cameraYaw = 0;
state.cameraPitch = -0.22;
state.draggingCamera = false;
state.lastPointerX = 0;
state.lastPointerY = 0;
state.gameOver = false;
state.gameStarted = false;
state.roundActive = false;
state.paused = false;
state.countdownValue = 0;
state.countdownTimer = 0;

const cpuState = createActorState();
cpuState.facing = Math.PI;
cpuState.aiJumpCooldown = 1.5;
cpuState.aiPunchCooldown = 0.3;

const playerSpawn = new THREE.Vector3(-4.8, 0, 0);
const cpuSpawn = new THREE.Vector3(4.8, 0, 0);

const dummies = createDummies();
scene.add(dummies.group);
const dirtBursts = [];
const fireballs = [];
const thunderBursts = [];
let selectedClass = "warrior";
let selectedMode = "versus";
let selectedCpuSetting = "random";
let selectedDifficulty = 3;
let cpuClass = "warrior";
let cpuClassBag = [];

const dirtColors = [0x8f6b42, 0x6f5338, 0xb08a59, 0xc9ad76];
const cpuDifficultyProfiles = {
  1: {
    label: "Chill",
    maxHp: 90,
    damageMultiplier: 0.72,
    incomingDamageMultiplier: 1.5,
    regenPerSecond: 0.1,
    blockChance: 0.04,
    specialCooldownScale: 1.45,
    punchCooldownScale: 1.22,
    preferredRange: 2.15,
    runThreshold: 5.2,
    jumpCooldownScale: 1.18,
  },
  2: {
    label: "Easy",
    maxHp: 110,
    damageMultiplier: 0.86,
    incomingDamageMultiplier: 1.24,
    regenPerSecond: 0.45,
    blockChance: 0.14,
    specialCooldownScale: 1.22,
    punchCooldownScale: 1.1,
    preferredRange: 2,
    runThreshold: 4.8,
    jumpCooldownScale: 1.08,
  },
  3: {
    label: "Normal",
    maxHp: 140,
    damageMultiplier: 1,
    incomingDamageMultiplier: 1,
    regenPerSecond: 1.1,
    blockChance: 0.32,
    specialCooldownScale: 1,
    punchCooldownScale: 1,
    preferredRange: 1.9,
    runThreshold: 4.4,
    jumpCooldownScale: 1,
  },
  4: {
    label: "Hard",
    maxHp: 160,
    damageMultiplier: 1.12,
    incomingDamageMultiplier: 0.92,
    regenPerSecond: 1.45,
    blockChance: 0.46,
    specialCooldownScale: 0.84,
    punchCooldownScale: 0.92,
    preferredRange: 1.8,
    runThreshold: 4.05,
    jumpCooldownScale: 0.88,
  },
  5: {
    label: "Savage",
    maxHp: 180,
    damageMultiplier: 1.24,
    incomingDamageMultiplier: 0.84,
    regenPerSecond: 1.8,
    blockChance: 0.62,
    specialCooldownScale: 0.7,
    punchCooldownScale: 0.8,
    preferredRange: 1.7,
    runThreshold: 3.7,
    jumpCooldownScale: 0.76,
  },
};

function createActorState() {
  return {
    velocity: new THREE.Vector3(),
    facing: 0,
    moveHorizontal: 0,
    moveVertical: 0,
    verticalVelocity: 0,
    isGrounded: true,
    isRunning: false,
    isExhausted: false,
    hp: 140,
    maxHp: 140,
    hitCooldown: 0,
    stamina: 100,
    maxStamina: 100,
    isPunching: false,
    punchTimer: 0,
    punchDuration: 0.34,
    punchCooldown: 0,
    isAvalanching: false,
    avalancheTimer: 0,
    avalancheDuration: 0.9,
    avalancheCooldown: 0,
    avalancheHitTimer: 0,
    isCometDashing: false,
    cometDashTimer: 0,
    cometDashDuration: 0.42,
    cometDashCooldown: 0,
    cometDashHit: false,
    knockdownTimer: 0,
    tripTimer: 0,
    fireballCooldown: 0,
    thunderCooldown: 0,
    isBlocking: false,
    blockTimer: 0,
    blockDuration: 1,
    blockCooldown: 0,
    blockEffectTimer: 0,
    stunTimer: 0,
    skySmashActive: false,
    skySmashDive: false,
    skySmashCharge: 0,
    skySmashHoverTimer: 0,
    skySmashProcFlash: 0,
    isSpinning: false,
    spinTimer: 0,
    spinDuration: 0.62,
    spinCooldown: 0,
    spinHasHit: false,
    aiSpecialCooldown: 0,
    aiBlockWindow: 0,
    walkCycle: 0,
  };
}

function spawnDirtBurst(origin, intensity = 1) {
  const burst = new THREE.Group();
  const particles = [];
  const count = Math.round(20 + intensity * 18);

  for (let i = 0; i < count; i += 1) {
    const size = 0.08 + Math.random() * 0.16 * intensity;
    const particle = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshStandardMaterial({
        color: dirtColors[i % dirtColors.length],
        roughness: 1,
      }),
    );
    particle.castShadow = true;
    particle.position.set(
      (Math.random() - 0.5) * 0.7,
      0.06 + Math.random() * 0.18,
      (Math.random() - 0.5) * 0.7,
    );
    burst.add(particle);

    const angle = Math.random() * Math.PI * 2;
    const speed = 2.8 + Math.random() * 4.8 * intensity;
    particles.push({
      mesh: particle,
      velocity: new THREE.Vector3(
        Math.cos(angle) * speed,
        3.5 + Math.random() * 4.8 * intensity,
        Math.sin(angle) * speed,
      ),
      spin: (Math.random() - 0.5) * 14,
    });
  }

  burst.position.copy(origin);
  burst.position.y = 0.02;
  scene.add(burst);
  dirtBursts.push({
    root: burst,
    particles,
    life: 1.1,
  });
}

function updateLockStatus(message) {
  if (lockStatus) lockStatus.textContent = message;
}

function updateHudForClass() {
  if (hintE) hintE.textContent = "Attack: E";
  if (hintQ) hintQ.textContent = "Spin Attack: Q";
  if (hintC) hintC.textContent = "Timed Block: C";

  if (selectedClass === "mage") {
    if (hint1) hint1.textContent = "Arcane Burst: 1";
    if (hint2) hint2.textContent = "Thunderbolts: 2";
    if (hint3) hint3.textContent = "Special 3: --";
  } else if (selectedClass === "knight") {
    if (hint1) hint1.textContent = "Guard Break: 1";
    if (hint2) hint2.textContent = "Great Cleave: 2";
    if (hint3) hint3.textContent = "King's Quake: 3";
  } else {
    if (hint1) hint1.textContent = "Avalanche: 1";
    if (hint2) hint2.textContent = "Comet Dash: 2";
    if (hint3) hint3.textContent = "Special 3: --";
  }
}

function getCpuDifficultyProfile() {
  return cpuDifficultyProfiles[selectedDifficulty] ?? cpuDifficultyProfiles[3];
}

function updateDifficultyUi() {
  const profile = getCpuDifficultyProfile();
  if (difficultyValue) difficultyValue.textContent = profile.label;
  if (difficultySlider) difficultySlider.value = String(selectedDifficulty);
}

function applyCpuDifficulty(resetHp = false) {
  const profile = getCpuDifficultyProfile();
  cpuState.maxHp = profile.maxHp;
  if (resetHp) {
    cpuState.hp = profile.maxHp;
  } else {
    cpuState.hp = Math.min(cpuState.hp, profile.maxHp);
  }
  updateHealthBars();
}

function scaleCpuDamage(baseDamage) {
  return Math.max(1, Math.round(baseDamage * getCpuDifficultyProfile().damageMultiplier));
}

function scaleDamageAgainstCpu(baseDamage) {
  return Math.max(1, Math.round(baseDamage * getCpuDifficultyProfile().incomingDamageMultiplier));
}

function applySelectedMode() {
  const trainingMode = selectedMode === "training";
  cpuCharacter.root.visible = !trainingMode;
  if (enemyHud) {
    enemyHud.hidden = trainingMode || !state.gameStarted || state.gameOver;
  }
}

function applySelectedClass() {
  const isMage = selectedClass === "mage";
  const isKnight = selectedClass === "knight";
  character.bodyMat.color.setHex(isMage ? 0x6f54d9 : isKnight ? 0xb7c3d9 : 0xff6b57);
  character.darkMat.color.setHex(isMage ? 0x23124e : isKnight ? 0x314264 : 0x223254);
  character.gloveMat.color.setHex(isMage ? 0x9cc7ff : isKnight ? 0xe2b75c : 0x0f1320);
  character.mouthMat.color.setHex(isMage ? 0x6659b7 : isKnight ? 0x6b6d78 : 0x8e4c42);
  character.hair.visible = !isMage && !isKnight;
  character.mageHat.visible = isMage;
  character.mageBrim.visible = isMage;
  character.cape.visible = isMage;
  character.robeFront.visible = isMage;
  character.knightHelm.visible = isKnight;
  character.knightVisor.visible = isKnight;
  character.knightPlume.visible = isKnight;
  character.knightPauldronLeft.visible = isKnight;
  character.knightPauldronRight.visible = isKnight;
  character.knightShield.visible = isKnight;
  character.knightSword.visible = isKnight;
  character.windRingLow.material.color.setHex(isMage ? 0xd6a4ff : isKnight ? 0xffd36d : 0xd8f4ff);
  character.windRingHigh.material.color.setHex(isMage ? 0xd6a4ff : isKnight ? 0xffd36d : 0xd8f4ff);
  character.windSlash.material.color.setHex(isMage ? 0xf7d2ff : isKnight ? 0xfff2b4 : 0xd8f4ff);
  updateHudForClass();
}

function applyCpuClass() {
  const isMage = cpuClass === "mage";
  cpuCharacter.bodyMat.color.setHex(isMage ? 0x895cff : 0x4e7dff);
  cpuCharacter.darkMat.color.setHex(isMage ? 0x25124e : 0x162347);
  cpuCharacter.gloveMat.color.setHex(isMage ? 0xe6d9ff : 0x0d1020);
  cpuCharacter.mouthMat.color.setHex(isMage ? 0x6f59c5 : 0x445a9a);
  cpuCharacter.hair.visible = !isMage;
  cpuCharacter.mageHat.visible = isMage;
  cpuCharacter.mageBrim.visible = isMage;
  cpuCharacter.cape.visible = isMage;
  cpuCharacter.robeFront.visible = isMage;
  cpuCharacter.knightHelm.visible = false;
  cpuCharacter.knightVisor.visible = false;
  cpuCharacter.knightPlume.visible = false;
  cpuCharacter.knightPauldronLeft.visible = false;
  cpuCharacter.knightPauldronRight.visible = false;
  cpuCharacter.knightShield.visible = false;
  cpuCharacter.knightSword.visible = false;
  cpuCharacter.windRingLow.material.color.setHex(isMage ? 0xd6b7ff : 0xc9e3ff);
  cpuCharacter.windRingHigh.material.color.setHex(isMage ? 0xd6b7ff : 0xc9e3ff);
  cpuCharacter.windSlash.material.color.setHex(isMage ? 0xf2ddff : 0xc9e3ff);
}

function refillCpuClassBag() {
  cpuClassBag = Math.random() < 0.5 ? ["mage", "warrior"] : ["warrior", "mage"];
}

function rollCpuClass() {
  if (selectedCpuSetting === "mage" || selectedCpuSetting === "warrior") {
    cpuClass = selectedCpuSetting;
  } else {
    if (cpuClassBag.length === 0) {
      refillCpuClassBag();
    }
    cpuClass = cpuClassBag.pop();
  }
  applyCpuClass();
  if (enemyHudName) {
    enemyHudName.textContent = cpuClass === "mage" ? "CPU Mage" : "CPU Warrior";
  }
}

function showGameOver(title, text) {
  state.gameOver = true;
  state.paused = false;
  stopDraggingCamera();
  if (gameOver) gameOver.hidden = false;
  if (gameOverTitle) gameOverTitle.textContent = title;
  if (gameOverText) gameOverText.textContent = text;
}

function startGame() {
  applyCpuDifficulty(true);
  state.gameStarted = true;
  state.roundActive = false;
  state.paused = false;
  state.countdownValue = 3;
  state.countdownTimer = 0;
  rollCpuClass();
  if (startMenu) startMenu.hidden = true;
  if (pauseMenu) pauseMenu.hidden = true;
  if (controlsModal) controlsModal.hidden = true;
  if (countdownEl) {
    countdownEl.hidden = false;
    countdownEl.textContent = "3";
  }
  updateLockStatus("Round starts in...");
  applySelectedMode();
}

function clearActiveEffects() {
  while (dirtBursts.length > 0) {
    const burst = dirtBursts.pop();
    scene.remove(burst.root);
    burst.particles.forEach((particle) => {
      particle.mesh.geometry.dispose();
      particle.mesh.material.dispose();
    });
  }

  while (fireballs.length > 0) {
    const fireball = fireballs.pop();
    scene.remove(fireball.root);
    fireball.root.children.forEach((child) => {
      child.geometry.dispose();
      child.material.dispose();
    });
  }

  while (thunderBursts.length > 0) {
    const burst = thunderBursts.pop();
    scene.remove(burst.root);
    burst.root.children.forEach((child) => {
      child.geometry.dispose();
      child.material.dispose();
    });
  }
}

function resetActorState(actorState, position, facing = 0) {
  actorState.velocity.set(0, 0, 0);
  actorState.facing = facing;
  actorState.moveHorizontal = 0;
  actorState.moveVertical = 0;
  actorState.verticalVelocity = 0;
  actorState.isGrounded = true;
  actorState.isRunning = false;
  actorState.isExhausted = false;
  actorState.hp = actorState.maxHp;
  actorState.hitCooldown = 0;
  actorState.stamina = actorState.maxStamina;
  actorState.isPunching = false;
  actorState.punchTimer = 0;
  actorState.punchCooldown = 0;
  actorState.isAvalanching = false;
  actorState.avalancheTimer = 0;
  actorState.avalancheCooldown = 0;
  actorState.avalancheHitTimer = 0;
  actorState.isCometDashing = false;
  actorState.cometDashTimer = 0;
  actorState.cometDashCooldown = 0;
  actorState.cometDashHit = false;
  actorState.knockdownTimer = 0;
  actorState.tripTimer = 0;
  actorState.fireballCooldown = 0;
  actorState.thunderCooldown = 0;
  actorState.isBlocking = false;
  actorState.blockTimer = 0;
  actorState.blockCooldown = 0;
  actorState.blockEffectTimer = 0;
  actorState.stunTimer = 0;
  actorState.skySmashActive = false;
  actorState.skySmashDive = false;
  actorState.skySmashCharge = 0;
  actorState.skySmashHoverTimer = 0;
  actorState.skySmashProcFlash = 0;
  actorState.isSpinning = false;
  actorState.spinTimer = 0;
  actorState.spinCooldown = 0;
  actorState.spinHasHit = false;
  actorState.aiSpecialCooldown = 0;
  actorState.aiBlockWindow = 0;
  actorState.walkCycle = 0;
  position.y = 0;
}

function restartGame() {
  clearActiveEffects();
  applyCpuDifficulty(true);
  resetActorState(state, character.root.position, 0);
  resetActorState(cpuState, cpuCharacter.root.position, Math.PI);
  character.root.position.copy(playerSpawn);
  cpuCharacter.root.position.copy(selectedMode === "training" ? new THREE.Vector3(999, 0, 999) : cpuSpawn);
  character.root.rotation.y = state.facing;
  cpuCharacter.root.rotation.y = cpuState.facing;
  cpuState.aiJumpCooldown = 1.5;
  cpuState.aiPunchCooldown = 0.3;
  rollCpuClass();
  state.gameOver = false;
  state.paused = false;
  state.roundActive = false;
  state.countdownValue = 3;
  state.countdownTimer = 0;
  if (gameOver) gameOver.hidden = true;
  if (pauseMenu) pauseMenu.hidden = true;
  if (controlsModal) controlsModal.hidden = true;
  if (countdownEl) {
    countdownEl.hidden = false;
    countdownEl.textContent = "3";
  }
  updateHealthBars();
  updateStaminaBar();
  applySelectedMode();
  updateLockStatus("Round starts in...");
}

function openPauseMenu() {
  if (!state.gameStarted || state.gameOver || !state.roundActive) return;
  state.paused = true;
  stopDraggingCamera();
  if (pauseMenu) pauseMenu.hidden = false;
}

function closePauseMenu() {
  state.paused = false;
  if (pauseMenu) pauseMenu.hidden = true;
  if (controlsModal) controlsModal.hidden = true;
}

function returnToStartMenu() {
  clearActiveEffects();
  state.gameStarted = false;
  state.roundActive = false;
  state.gameOver = false;
  state.paused = false;
  applyCpuDifficulty(true);
  resetActorState(state, character.root.position, 0);
  resetActorState(cpuState, cpuCharacter.root.position, Math.PI);
  character.root.position.copy(playerSpawn);
  cpuCharacter.root.position.copy(cpuSpawn);
  character.root.rotation.y = state.facing;
  cpuCharacter.root.rotation.y = cpuState.facing;
  rollCpuClass();
  if (gameOver) gameOver.hidden = true;
  if (pauseMenu) pauseMenu.hidden = true;
  if (controlsModal) controlsModal.hidden = true;
  if (countdownEl) countdownEl.hidden = true;
  if (startMenu) startMenu.hidden = false;
  updateHealthBars();
  updateStaminaBar();
  applySelectedMode();
  updateLockStatus("Camera: Hold click and drag to look");
}

function updateEnemyHud() {
  if (!enemyHud) return;
  if (selectedMode === "training" || !state.gameStarted || state.gameOver || cpuState.hp <= 0) {
    enemyHud.hidden = true;
    return;
  }

  const world = cpuCharacter.root.position.clone();
  world.y += 3.1;
  world.project(camera);
  if (world.z < -1 || world.z > 1) {
    enemyHud.hidden = true;
    return;
  }

  enemyHud.hidden = false;
  if (enemyHudName) {
    enemyHudName.textContent = cpuClass === "mage" ? "CPU Mage" : "CPU Warrior";
  }
  const x = (world.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-world.y * 0.5 + 0.5) * window.innerHeight;
  enemyHud.style.left = `${x}px`;
  enemyHud.style.top = `${y}px`;
}

function stopDraggingCamera() {
  state.draggingCamera = false;
  document.body.classList.remove("is-dragging");
  updateLockStatus("Camera: Hold click and drag to look");
}

renderer.domElement.addEventListener("mousedown", (event) => {
  if (!state.gameStarted || state.gameOver) return;
  if (event.button !== 0) return;

  state.draggingCamera = true;
  state.lastPointerX = event.clientX;
  state.lastPointerY = event.clientY;
  document.body.classList.add("is-dragging");
  updateLockStatus("Camera: Dragging");
});

if (playButton) {
  playButton.addEventListener("click", () => {
    startGame();
  });
}

if (resumeButton) {
  resumeButton.addEventListener("click", () => {
    closePauseMenu();
  });
}

if (controlsButton) {
  controlsButton.addEventListener("click", () => {
    if (controlsModal) controlsModal.hidden = false;
  });
}

if (closeControlsButton) {
  closeControlsButton.addEventListener("click", () => {
    if (controlsModal) controlsModal.hidden = true;
  });
}

if (startMenuButton) {
  startMenuButton.addEventListener("click", () => {
    returnToStartMenu();
  });
}

if (classSelect) {
  classSelect.addEventListener("click", (event) => {
    const button = event.target.closest("[data-class]");
    if (!button) return;
    selectedClass =
      button.dataset.class === "mage"
        ? "mage"
        : button.dataset.class === "knight"
          ? "knight"
          : "warrior";
    classButtons.forEach((entry) => {
      entry.classList.toggle("class-select__button--active", entry === button);
    });
    applySelectedClass();
  });
}

if (modeSelect) {
  modeSelect.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button) return;
    selectedMode = button.dataset.mode === "training" ? "training" : "versus";
    modeButtons.forEach((entry) => {
      entry.classList.toggle("mode-select__button--active", entry === button);
    });
    applySelectedMode();
  });
}

if (cpuSelect) {
  cpuSelect.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cpu]");
    if (!button) return;
    selectedCpuSetting = button.dataset.cpu === "mage"
      ? "mage"
      : button.dataset.cpu === "warrior"
        ? "warrior"
        : "random";
    cpuClassBag = [];
    cpuButtons.forEach((entry) => {
      entry.classList.toggle("cpu-select__button--active", entry === button);
    });
  });
}

if (difficultySlider) {
  difficultySlider.addEventListener("input", () => {
    selectedDifficulty = Number.parseInt(difficultySlider.value, 10) || 3;
    updateDifficultyUi();
    applyCpuDifficulty(true);
  });
}

applySelectedClass();
applySelectedMode();
updateDifficultyUi();
applyCpuDifficulty(true);

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === "Escape") {
    if (!pauseMenu?.hidden && controlsModal && !controlsModal.hidden) {
      controlsModal.hidden = true;
      return;
    }
    if (!state.gameStarted || state.gameOver) return;
    if (state.paused) {
      closePauseMenu();
    } else {
      openPauseMenu();
    }
    return;
  }

  if (state.gameOver) {
    if (event.code === "KeyR") {
      restartGame();
    }
    return;
  }

  if (state.paused) return;
  if (!state.gameStarted || !state.roundActive) return;

  keys.add(event.code);

  if (event.code === "Space" && state.isGrounded) {
    state.verticalVelocity = 7.6;
    state.isGrounded = false;
  }

  if (event.code === "KeyE" && state.skySmashActive && !state.isGrounded) {
    if (!trySpendStamina(2)) return;
    state.skySmashCharge = Math.min(state.skySmashCharge + 1, 18);
    state.skySmashHoverTimer = Math.min(state.skySmashHoverTimer + 0.08, 2.2);
    state.skySmashProcFlash = Math.max(state.skySmashProcFlash, 0.18);
    updateLockStatus(`Sky smash x${state.skySmashCharge}`);
    return;
  }

  if (event.code === "KeyE" && state.punchCooldown <= 0) {
    state.isPunching = true;
    state.punchTimer = state.punchDuration;
    state.punchCooldown = 0.5;
    tryPunch();
  }

  if (event.code === "Digit1") {
    if (selectedClass === "mage") {
      if (state.fireballCooldown <= 0 && !state.skySmashActive && trySpendStamina(18)) {
        castArcaneBurst();
      }
    } else if (
      selectedClass === "knight" &&
      state.fireballCooldown <= 0 &&
      !state.skySmashActive &&
      trySpendStamina(20)
    ) {
      castKnightGuardBreak();
    } else if (state.avalancheCooldown <= 0 && !state.isAvalanching && !state.skySmashActive && trySpendStamina(26)) {
      state.isAvalanching = true;
      state.avalancheTimer = state.avalancheDuration;
      state.avalancheCooldown = 3.2;
      state.avalancheHitTimer = 0;
      state.isPunching = false;
      state.punchTimer = 0;
      updateLockStatus("Avalanche!");
      tryAvalanche();
    }
  }

  if (event.code === "Digit2") {
    if (selectedClass === "mage") {
      if (state.thunderCooldown <= 0 && !state.skySmashActive && trySpendStamina(24)) {
        castThunderBurst();
      }
    } else if (selectedClass === "knight") {
      if (state.avalancheCooldown <= 0 && !state.skySmashActive && trySpendStamina(22)) {
        castKnightRoyalCleave();
      }
    } else if (
      state.cometDashCooldown <= 0 &&
      !state.isCometDashing &&
      !state.skySmashActive &&
      trySpendStamina(32)
    ) {
      state.isCometDashing = true;
      state.cometDashTimer = state.cometDashDuration;
      state.cometDashCooldown = 2.6;
      state.cometDashHit = false;
      state.isPunching = false;
      state.punchTimer = 0;
      state.isAvalanching = false;
      state.avalancheTimer = 0;
      state.avalancheHitTimer = 0;
      updateLockStatus("Comet dash!");
    }
  }

  if (event.code === "Digit3" && selectedClass === "knight") {
    if (state.thunderCooldown <= 0 && !state.skySmashActive && trySpendStamina(30)) {
      castKnightKingsQuake();
    }
  }

  if (event.code === "KeyC" && state.blockCooldown <= 0 && !state.isBlocking) {
    state.isBlocking = true;
    state.blockTimer = state.blockDuration;
    state.blockCooldown = 1.2;
  }

  if (event.code === "KeyQ" && state.spinCooldown <= 0 && !state.isSpinning && trySpendStamina(14)) {
    state.isSpinning = true;
    state.spinTimer = state.spinDuration;
    state.spinCooldown = 1.6;
    state.spinHasHit = false;
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

window.addEventListener("mouseup", () => {
  if (state.draggingCamera) stopDraggingCamera();
});

window.addEventListener("mouseleave", () => {
  if (state.draggingCamera) stopDraggingCamera();
});

window.addEventListener("mousemove", (event) => {
  if (!state.draggingCamera) return;

  const deltaX = event.clientX - state.lastPointerX;
  const deltaY = event.clientY - state.lastPointerY;
  state.lastPointerX = event.clientX;
  state.lastPointerY = event.clientY;

  state.cameraYaw -= deltaX * 0.012;
  state.cameraPitch -= deltaY * 0.008;
  state.cameraPitch = THREE.MathUtils.clamp(state.cameraPitch, -0.75, 0.35);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function buildCharacter(options = {}) {
  const root = new THREE.Group();
  root.position.set(0, 0, 0);

  const bodyMat = new THREE.MeshStandardMaterial({
    color: options.bodyColor ?? 0xff6b57,
    roughness: 0.65,
    metalness: 0.08,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: options.darkColor ?? 0x223254,
    roughness: 0.8,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xffd2b1,
    roughness: 0.85,
  });
  const gloveMat = new THREE.MeshStandardMaterial({
    color: options.gloveColor ?? 0x0f1320,
    roughness: 0.45,
  });

  const hips = new THREE.Group();
  hips.position.y = 1.15;
  root.add(hips);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.6, 0.72), bodyMat);
  torso.castShadow = true;
  torso.position.y = 0.85;
  hips.add(torso);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.18, 0.8), darkMat);
  belt.position.y = 0.16;
  belt.castShadow = true;
  hips.add(belt);

  const headPivot = new THREE.Group();
  headPivot.position.y = 1.95;
  hips.add(headPivot);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), skinMat);
  head.castShadow = true;
  head.position.y = 0.15;
  headPivot.add(head);

  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x121826,
    roughness: 0.45,
  });
  const mouthMat = new THREE.MeshStandardMaterial({
    color: options.mouthColor ?? 0x8e4c42,
    roughness: 0.65,
  });

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.28, 0.96), darkMat);
  hair.position.y = 0.56;
  hair.castShadow = true;
  head.add(hair);

  const eyeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.05), eyeMat);
  eyeLeft.position.set(-0.18, 0.12, -0.43);
  head.add(eyeLeft);

  const eyeRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.05), eyeMat);
  eyeRight.position.set(0.18, 0.12, -0.43);
  head.add(eyeRight);

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.04), mouthMat);
  mouth.position.set(0, -0.12, -0.43);
  head.add(mouth);

  const mageBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.56, 0.05, 18),
    darkMat,
  );
  mageBrim.position.y = 0.54;
  mageBrim.visible = false;
  mageBrim.castShadow = true;
  head.add(mageBrim);

  const mageHat = new THREE.Mesh(
    new THREE.ConeGeometry(0.4, 1.1, 18),
    bodyMat,
  );
  mageHat.position.y = 1.02;
  mageHat.rotation.z = -0.08;
  mageHat.visible = false;
  mageHat.castShadow = true;
  head.add(mageHat);

  const knightHelm = new THREE.Mesh(
    new THREE.BoxGeometry(0.98, 0.34, 0.98),
    bodyMat,
  );
  knightHelm.position.y = 0.5;
  knightHelm.visible = false;
  knightHelm.castShadow = true;
  head.add(knightHelm);

  const knightVisor = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.16, 0.08),
    darkMat,
  );
  knightVisor.position.set(0, 0.1, -0.48);
  knightVisor.visible = false;
  head.add(knightVisor);

  const knightPlume = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.5, 0.18),
    gloveMat,
  );
  knightPlume.position.set(0, 0.92, 0.02);
  knightPlume.rotation.z = -0.1;
  knightPlume.visible = false;
  knightPlume.castShadow = true;
  head.add(knightPlume);

  const armLeft = createLimb(bodyMat, gloveMat, skinMat);
  armLeft.shoulder.position.set(-0.88, 1.45, 0);
  hips.add(armLeft.shoulder);

  const armRight = createLimb(bodyMat, gloveMat, skinMat);
  armRight.shoulder.position.set(0.88, 1.45, 0);
  hips.add(armRight.shoulder);

  const legLeft = createLeg(darkMat, bodyMat);
  legLeft.hip.position.set(-0.4, 0.16, 0);
  hips.add(legLeft.hip);

  const legRight = createLeg(darkMat, bodyMat);
  legRight.hip.position.set(0.4, 0.16, 0);
  hips.add(legRight.hip);

  const knightPauldronLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.26, 0.58),
    bodyMat,
  );
  knightPauldronLeft.position.set(-0.88, 1.68, 0);
  knightPauldronLeft.rotation.z = 0.18;
  knightPauldronLeft.visible = false;
  knightPauldronLeft.castShadow = true;
  hips.add(knightPauldronLeft);

  const knightPauldronRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.26, 0.58),
    bodyMat,
  );
  knightPauldronRight.position.set(0.88, 1.68, 0);
  knightPauldronRight.rotation.z = -0.18;
  knightPauldronRight.visible = false;
  knightPauldronRight.castShadow = true;
  hips.add(knightPauldronRight);

  const knightShield = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.86, 0.7),
    darkMat,
  );
  knightShield.position.set(0, -0.38, -0.18);
  knightShield.rotation.z = 0.14;
  knightShield.visible = false;
  knightShield.castShadow = true;
  armLeft.elbow.add(knightShield);

  const knightSword = new THREE.Group();
  knightSword.visible = false;
  armRight.elbow.add(knightSword);

  const knightSwordGrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.28, 0.12),
    gloveMat,
  );
  knightSwordGrip.position.set(0, -0.84, 0.06);
  knightSwordGrip.castShadow = true;
  knightSword.add(knightSwordGrip);

  const knightSwordGuard = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.08, 0.12),
    gloveMat,
  );
  knightSwordGuard.position.set(0, -0.98, 0.06);
  knightSwordGuard.castShadow = true;
  knightSword.add(knightSwordGuard);

  const knightSwordBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 1.45, 0.05),
    bodyMat,
  );
  knightSwordBlade.position.set(0, -1.72, 0.06);
  knightSwordBlade.castShadow = true;
  knightSword.add(knightSwordBlade);

  const knightSwordTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.28, 4),
    bodyMat,
  );
  knightSwordTip.position.set(0, -2.5, 0.06);
  knightSwordTip.rotation.z = Math.PI;
  knightSwordTip.castShadow = true;
  knightSword.add(knightSwordTip);

  knightSword.position.set(0.02, 0.02, -0.02);
  knightSword.rotation.z = 0.04;

  const cape = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 1.8, 0.12),
    darkMat,
  );
  cape.position.set(0, 0.78, 0.4);
  cape.visible = false;
  cape.castShadow = true;
  hips.add(cape);

  const robeFront = new THREE.Mesh(
    new THREE.BoxGeometry(0.84, 1.18, 0.12),
    bodyMat,
  );
  robeFront.position.set(0, 0.02, -0.34);
  robeFront.visible = false;
  robeFront.castShadow = true;
  hips.add(robeFront);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  root.add(shadow);

  const blockBurst = new THREE.Mesh(
    new THREE.RingGeometry(0.72, 1.22, 28),
    new THREE.MeshBasicMaterial({
      color: options.blockColor ?? 0x9ce9ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    }),
  );
  blockBurst.rotation.x = Math.PI / 2;
  blockBurst.position.y = 1.45;
  blockBurst.visible = false;
  root.add(blockBurst);

  const windGroup = new THREE.Group();
  windGroup.visible = false;
  root.add(windGroup);

  const windRingLow = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.08, 10, 40),
    new THREE.MeshBasicMaterial({
      color: options.windColor ?? 0xd8f4ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    }),
  );
  windRingLow.rotation.x = Math.PI / 2;
  windRingLow.position.y = 1.05;
  windGroup.add(windRingLow);

  const windRingHigh = new THREE.Mesh(
    new THREE.TorusGeometry(0.88, 0.06, 10, 40),
    new THREE.MeshBasicMaterial({
      color: options.windColor ?? 0xd8f4ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    }),
  );
  windRingHigh.rotation.x = Math.PI / 2;
  windRingHigh.position.y = 1.95;
  windGroup.add(windRingHigh);

  const windSlash = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.55, 32, 1, 0, Math.PI * 1.35),
    new THREE.MeshBasicMaterial({
      color: options.windColor ?? 0xd8f4ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    }),
  );
  windSlash.rotation.set(Math.PI / 2, 0, Math.PI / 4);
  windSlash.position.y = 1.45;
  windGroup.add(windSlash);

  return {
    root,
    bodyMat,
    darkMat,
    gloveMat,
    mouthMat,
    hair,
    mageHat,
    mageBrim,
    knightHelm,
    knightVisor,
    knightPlume,
    knightPauldronLeft,
    knightPauldronRight,
    knightShield,
    knightSword,
    cape,
    robeFront,
    hips,
    torso,
    headPivot,
    armLeft,
    armRight,
    legLeft,
    legRight,
    blockBurst,
    windGroup,
    windRingLow,
    windRingHigh,
    windSlash,
  };
}

function createLimb(sleeveMat, gloveMat, skinMat) {
  const shoulder = new THREE.Group();

  const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.95, 0.42), sleeveMat);
  upperArm.castShadow = true;
  upperArm.position.y = -0.48;
  shoulder.add(upperArm);

  const elbow = new THREE.Group();
  elbow.position.y = -0.95;
  shoulder.add(elbow);

  const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.85, 0.35), skinMat);
  forearm.castShadow = true;
  forearm.position.y = -0.42;
  elbow.add(forearm);

  const glove = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.6), gloveMat);
  glove.castShadow = true;
  glove.position.set(0, -0.9, 0.06);
  elbow.add(glove);

  return { shoulder, elbow };
}

function createLeg(pantsMat, bootMat) {
  const hip = new THREE.Group();

  const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.05, 0.5), pantsMat);
  thigh.castShadow = true;
  thigh.position.y = -0.52;
  hip.add(thigh);

  const knee = new THREE.Group();
  knee.position.y = -1.04;
  hip.add(knee);

  const shin = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.96, 0.38), pantsMat);
  shin.castShadow = true;
  shin.position.y = -0.48;
  knee.add(shin);

  const boot = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.24, 0.8), bootMat);
  boot.castShadow = true;
  boot.position.set(0, -1.02, 0.16);
  knee.add(boot);

  return { hip, knee };
}

function createDummies() {
  const group = new THREE.Group();
  const entries = [];
  const positions = [
    new THREE.Vector3(4.6, 0, -4.2),
    new THREE.Vector3(-4.8, 0, -3.7),
    new THREE.Vector3(4.2, 0, 4.8),
    new THREE.Vector3(-4.4, 0, 4.1),
  ];

  positions.forEach((position, index) => {
    const dummy = new THREE.Group();
    dummy.position.copy(position);

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, 2.6, 16),
      new THREE.MeshStandardMaterial({ color: 0x7d4d2a, roughness: 0.9 }),
    );
    pole.position.y = 1.3;
    pole.castShadow = true;
    dummy.add(pole);

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56, 0.56, 0.95, 20),
      new THREE.MeshStandardMaterial({ color: index % 2 === 0 ? 0xf4dd8f : 0xd4e8f2, roughness: 0.72 }),
    );
    top.position.y = 2.3;
    top.castShadow = true;
    dummy.add(top);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.82, 0.18, 20),
      new THREE.MeshStandardMaterial({ color: 0x8a99ab, roughness: 1 }),
    );
    base.position.y = 0.09;
    base.receiveShadow = true;
    dummy.add(base);

    entries.push({
      root: dummy,
      top,
      home: position.clone(),
      wobble: 0,
      hitFlash: 0,
    });
    group.add(dummy);
  });

  return { group, entries };
}

function getMoveInput() {
  state.moveHorizontal = 0;
  state.moveVertical = 0;

  if (keys.has("KeyA") || keys.has("ArrowLeft")) state.moveHorizontal -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) state.moveHorizontal += 1;
  if (keys.has("KeyW") || keys.has("ArrowUp")) state.moveVertical += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) state.moveVertical -= 1;

  const moveForward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    state.cameraYaw,
  );
  const moveRight = new THREE.Vector3().crossVectors(moveForward, new THREE.Vector3(0, 1, 0)).normalize();
  const input = moveForward
    .multiplyScalar(state.moveVertical)
    .add(moveRight.multiplyScalar(state.moveHorizontal));
  if (input.lengthSq() > 1) input.normalize();
  return input;
}

function dampAngle(current, target, smoothing, dt) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * (1 - Math.exp(-smoothing * dt));
}

function getPunchableDummies() {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(character.root.quaternion).normalize();
  const punchOrigin = character.root.position.clone();
  punchOrigin.y = 1.4;

  return dummies.entries.filter((dummy) => {
    const toDummy = dummy.top.position.clone();
    dummy.root.localToWorld(toDummy);
    toDummy.sub(punchOrigin);
    const distance = toDummy.length();
    if (distance > 2.3) return false;

    toDummy.normalize();
    if (forward.dot(toDummy) < 0.72) return false;

    return true;
  });
}

function updateCrosshair() {
  if (!crosshair) return;
  crosshair.classList.toggle("crosshair--hot", getPunchableDummies().length > 0);
}

function updateStaminaBar() {
  if (!staminaFill) return;

  const ratio = THREE.MathUtils.clamp(state.stamina / state.maxStamina, 0, 1);
  staminaFill.style.transform = `scaleX(${ratio})`;
  staminaFill.style.background =
    ratio < 0.25 ? "linear-gradient(90deg, #ff7a6b, #ffb46b)" : "linear-gradient(90deg, #66e08a, #ffd15f)";
}

function trySpendStamina(cost) {
  if (state.stamina < cost) {
    updateLockStatus("Need more stamina");
    return false;
  }

  state.stamina = Math.max(0, state.stamina - cost);
  updateStaminaBar();
  return true;
}

function updateHealthBars() {
  if (playerHealthFill) {
    playerHealthFill.style.transform = `scaleX(${THREE.MathUtils.clamp(state.hp / state.maxHp, 0, 1)})`;
  }
  if (cpuHealthFill && selectedMode !== "training") {
    cpuHealthFill.style.transform = `scaleX(${THREE.MathUtils.clamp(cpuState.hp / cpuState.maxHp, 0, 1)})`;
  }
}

function triggerSkySmashCounter() {
  if (state.skySmashActive || !state.isGrounded || state.hp <= 0) return;

  state.skySmashActive = true;
  state.skySmashDive = false;
  state.skySmashCharge = 0;
  state.skySmashHoverTimer = 1.6;
  state.skySmashProcFlash = 0.75;
  state.verticalVelocity = 19.4;
  state.isGrounded = false;
  state.isPunching = false;
  state.punchTimer = 0;
  state.isSpinning = false;
  state.spinTimer = 0;
  state.spinHasHit = false;
  state.isRunning = false;
  state.velocity.multiplyScalar(0.18);
  updateLockStatus("Sky smash! Mash E");
}

function triggerMageTeleportEscape() {
  if (state.hp <= 0) return;

  const away = character.root.position.clone().sub(cpuCharacter.root.position);
  away.y = 0;
  if (away.lengthSq() < 0.001) {
    away.set(1, 0, 0);
  } else {
    away.normalize();
  }

  const side = new THREE.Vector3(-away.z, 0, away.x).multiplyScalar((Math.random() - 0.5) * 1.2);
  const targetPosition = away.clone().multiplyScalar(7.1).add(side);

  const arenaLimit = 7.4;
  targetPosition.x = THREE.MathUtils.clamp(targetPosition.x, -arenaLimit, arenaLimit);
  targetPosition.z = THREE.MathUtils.clamp(targetPosition.z, -arenaLimit, arenaLimit);
  targetPosition.y = 0;

  character.root.position.copy(targetPosition);
  state.velocity.set(0, 0, 0);
  state.verticalVelocity = 0;
  state.isGrounded = true;
  state.blockEffectTimer = 0.34;
  state.skySmashActive = false;
  state.skySmashDive = false;
  state.skySmashCharge = 0;
  state.skySmashHoverTimer = 0;
  state.skySmashProcFlash = 0.75;
  updateLockStatus("Mage blink!");
}

function resolveSkySmash() {
  const chargeDamage = 16 + state.skySmashCharge * 4;
  const trainingMode = selectedMode === "training";
  const cpuDistance = cpuCharacter.root.position.distanceTo(character.root.position);
  const wasMaxSkySmash = state.skySmashCharge >= 18;

  if (!trainingMode && cpuDistance <= 3.1) {
    const landed = applyHit(character, cpuCharacter, cpuState, chargeDamage);
    if (landed) {
      const blast = cpuCharacter.root.position.clone().sub(character.root.position);
      blast.y = 0;
      if (blast.lengthSq() > 0.0001) {
        blast.normalize();
        cpuState.velocity.addScaledVector(blast, 2 + state.skySmashCharge * 0.18);
      }
      cpuState.stunTimer = Math.max(cpuState.stunTimer, 0.5 + state.skySmashCharge * 0.03);
    }
  }

  dummies.entries.forEach((dummy) => {
    const planarDistance = dummy.root.position.distanceTo(character.root.position);
    if (planarDistance > 3.3) return;
    dummy.wobble = Math.max(dummy.wobble, 1.2 + state.skySmashCharge * 0.06);
    dummy.hitFlash = 0.34;
    const knockback = dummy.root.position.clone().sub(character.root.position).normalize();
    dummy.root.position.addScaledVector(knockback, 0.22 + state.skySmashCharge * 0.02);
  });

  if (wasMaxSkySmash) {
    spawnDirtBurst(character.root.position.clone(), 1.45);
  }

  state.blockEffectTimer = 0.3;
  state.skySmashActive = false;
  state.skySmashDive = false;
  state.skySmashCharge = 0;
  state.skySmashHoverTimer = 0;
  state.skySmashProcFlash = 0;
  updateLockStatus("Camera: Hold click and drag to look");
}

function applyHit(attacker, target, targetState, damage) {
  if (state.gameOver || targetState.hitCooldown > 0 || targetState.hp <= 0) return false;
  if (selectedMode === "training" && target === cpuCharacter) return false;

  const adjustedDamage =
    target === cpuCharacter && attacker === character
      ? scaleDamageAgainstCpu(damage)
      : damage;
  const wasBlocked = targetState.isBlocking;
  const blockedDamage = wasBlocked ? Math.ceil(adjustedDamage * 0.15) : adjustedDamage;
  targetState.hp = Math.max(0, targetState.hp - blockedDamage);
  targetState.hitCooldown = 0.45;
  if (wasBlocked) {
    targetState.blockEffectTimer = 0.24;
  }
  const knockback = target.root.position.clone().sub(attacker.root.position).normalize();
  const knockbackScale = wasBlocked ? 0.12 : 0.35;
  const velocityScale = wasBlocked ? 0.45 : 1.4;
  target.root.position.addScaledVector(knockback, knockbackScale);
  targetState.velocity.addScaledVector(knockback, velocityScale);

  if (wasBlocked && attacker === cpuCharacter && target === character && cpuState.hp > 0) {
    cpuState.stunTimer = Math.max(cpuState.stunTimer, 0.8);
    cpuState.isPunching = false;
    cpuState.punchTimer = 0;
    cpuState.isSpinning = false;
    cpuState.spinTimer = 0;
    cpuState.spinHasHit = false;
    cpuState.isRunning = false;
    cpuState.velocity.addScaledVector(knockback, -2.1);
    if (Math.random() < 0.25) {
      if (selectedClass === "mage") {
        triggerMageTeleportEscape();
      } else {
        triggerSkySmashCounter();
      }
    }
  }

  updateHealthBars();

  if (targetState.hp === 0) {
    if (target === cpuCharacter) {
      showGameOver("You Win", "CPU knocked out. Press R to restart");
    } else if (target === character) {
      showGameOver("CPU Wins", "You were knocked out. Press R to restart");
    }
  }
  return true;
}

function tryPunch() {
  getPunchableDummies().forEach((dummy) => {
    dummy.wobble = Math.max(dummy.wobble, 0.9);
    dummy.hitFlash = 0.22;
    const knockback = dummy.root.position.clone().sub(character.root.position).normalize();
    dummy.root.position.addScaledVector(knockback, 0.22);
  });

  if (selectedMode !== "training") {
    const toCpu = cpuCharacter.root.position.clone().sub(character.root.position);
    const distance = toCpu.length();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(character.root.quaternion).normalize();
    if (distance <= 2.3 && forward.dot(toCpu.normalize()) >= 0.72) {
      applyHit(character, cpuCharacter, cpuState, 14);
    }
  }
}

function trySpinAttack() {
  if (state.spinHasHit) return;

  dummies.entries.forEach((dummy) => {
    const toDummy = dummy.root.position.clone().sub(character.root.position);
    if (toDummy.length() > 2.9) return;

    dummy.wobble = Math.max(dummy.wobble, 1.15);
    dummy.hitFlash = 0.28;
    dummy.root.position.addScaledVector(toDummy.normalize(), 0.32);
  });

  if (selectedMode !== "training") {
    const toCpu = cpuCharacter.root.position.clone().sub(character.root.position);
    if (toCpu.length() <= 2.75) {
      applyHit(character, cpuCharacter, cpuState, 18);
    }
  }

  state.spinHasHit = true;
}

function castArcaneBurst() {
  state.fireballCooldown = 1.1;
  state.isPunching = true;
  state.punchTimer = state.punchDuration * 0.6;
  updateLockStatus("Arcane burst!");

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(character.root.quaternion).normalize();
  const burstOrigin = character.root.position.clone().add(new THREE.Vector3(0, 1.55, 0));
  const burstCenter = burstOrigin.clone().addScaledVector(forward, 1.7);

  getPunchableDummies().forEach((dummy) => {
    dummy.wobble = Math.max(dummy.wobble, 1.15);
    dummy.hitFlash = 0.3;
    const knockback = dummy.root.position.clone().sub(character.root.position).normalize();
    dummy.root.position.addScaledVector(knockback, 0.42);
  });

  dummies.entries.forEach((dummy) => {
    if (getPunchableDummies().includes(dummy)) return;
    const toDummy = dummy.root.position.clone().sub(character.root.position);
    const distance = toDummy.length();
    if (distance > 3.5) return;
    toDummy.y = 0;
    if (toDummy.lengthSq() < 0.0001) return;
    toDummy.normalize();
    if (forward.dot(toDummy) < 0.52) return;
    dummy.wobble = Math.max(dummy.wobble, 1.15);
    dummy.hitFlash = 0.3;
    dummy.root.position.addScaledVector(toDummy, 0.42);
  });

  if (selectedMode !== "training") {
    const toCpu = cpuCharacter.root.position.clone().sub(character.root.position);
    const distance = toCpu.length();
    const planar = toCpu.clone();
    planar.y = 0;
    if (distance <= 3.55 && planar.lengthSq() > 0.0001) {
      planar.normalize();
      if (forward.dot(planar) >= 0.52) {
        const landed = applyHit(character, cpuCharacter, cpuState, 24);
        if (landed) {
          cpuState.velocity.addScaledVector(planar, 3.2);
          cpuState.stunTimer = Math.max(cpuState.stunTimer, 0.55);
        }
      }
    }
  }

  const root = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 18, 18),
    new THREE.MeshBasicMaterial({ color: 0xa979ff, transparent: true, opacity: 0.82 }),
  );
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 18, 18),
    new THREE.MeshBasicMaterial({ color: 0xe7cbff, transparent: true, opacity: 0.42 }),
  );
  const ringA = new THREE.Mesh(
    new THREE.TorusGeometry(0.66, 0.08, 10, 30),
    new THREE.MeshBasicMaterial({ color: 0xd4b0ff, transparent: true, opacity: 0.72 }),
  );
  ringA.rotation.y = Math.PI / 2;
  const ringB = new THREE.Mesh(
    new THREE.TorusGeometry(0.44, 0.06, 10, 28),
    new THREE.MeshBasicMaterial({ color: 0x7fd7ff, transparent: true, opacity: 0.6 }),
  );
  ringB.rotation.x = Math.PI / 2;
  const slash = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.78, 0.18, 18, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xe9deff, transparent: true, opacity: 0.52 }),
  );
  slash.rotation.z = Math.PI / 2;
  slash.rotation.x = Math.PI / 2;
  root.add(core);
  root.add(flash);
  root.add(ringA);
  root.add(ringB);
  root.add(slash);
  root.position.copy(burstCenter);
  root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), forward);
  scene.add(root);
  fireballs.push({
    type: "arcaneBurst",
    root,
    core,
    flash,
    ringA,
    ringB,
    slash,
    forward,
    speed: 2.8,
    life: 0.34,
    maxLife: 0.34,
  });
}

function castThunderBurst() {
  state.thunderCooldown = 2.8;
  state.blockEffectTimer = 0.34;
  updateLockStatus("Thunderbolts!");

  const offsets = [
    new THREE.Vector3(1.8, 0, 0.4),
    new THREE.Vector3(-1.5, 0, -0.8),
    new THREE.Vector3(0.3, 0, 1.9),
    new THREE.Vector3(-0.4, 0, -2.1),
    new THREE.Vector3(2.1, 0, -1.5),
  ];

  offsets.forEach((offset, index) => {
    const root = new THREE.Group();
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.15, 4.8, 6),
      new THREE.MeshBasicMaterial({ color: 0xe9f7ff }),
    );
    bolt.position.y = 2.4;
    bolt.rotation.z = (Math.random() - 0.5) * 0.35;
    root.add(bolt);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.9, 20),
      new THREE.MeshBasicMaterial({ color: 0xb993ff, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    root.add(ring);

    root.position.copy(character.root.position).add(offset);
    scene.add(root);
    thunderBursts.push({
      root,
      ring,
      life: 0.32 + index * 0.015,
    });
  });

  const cpuDistance = cpuCharacter.root.position.distanceTo(character.root.position);
  if (selectedMode !== "training" && cpuDistance <= 3.4) {
    const landed = applyHit(character, cpuCharacter, cpuState, 24);
    if (landed) {
      cpuState.stunTimer = Math.max(cpuState.stunTimer, 0.72);
      const knockback = cpuCharacter.root.position.clone().sub(character.root.position);
      knockback.y = 0;
      if (knockback.lengthSq() > 0.0001) {
        knockback.normalize();
        cpuState.velocity.addScaledVector(knockback, 3.2);
      }
    }
  }
}

function castKnightGuardBreak() {
  state.fireballCooldown = 1.45;
  state.isPunching = true;
  state.punchTimer = state.punchDuration;
  state.blockEffectTimer = 0.18;
  updateLockStatus("Guard break!");

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(character.root.quaternion).normalize();

  dummies.entries.forEach((dummy) => {
    const toDummy = dummy.root.position.clone().sub(character.root.position);
    const distance = toDummy.length();
    if (distance > 2.85) return;
    toDummy.y = 0;
    if (toDummy.lengthSq() < 0.0001) return;
    toDummy.normalize();
    if (forward.dot(toDummy) < 0.64) return;
    dummy.wobble = Math.max(dummy.wobble, 1.18);
    dummy.hitFlash = 0.32;
    dummy.root.position.addScaledVector(toDummy, 0.52);
  });

  if (selectedMode !== "training") {
    const toCpu = cpuCharacter.root.position.clone().sub(character.root.position);
    const distance = toCpu.length();
    const planar = toCpu.clone();
    planar.y = 0;
    if (distance <= 2.8 && planar.lengthSq() > 0.0001) {
      planar.normalize();
      if (forward.dot(planar) >= 0.64) {
        const landed = applyHit(character, cpuCharacter, cpuState, 24);
        if (landed) {
          cpuState.velocity.addScaledVector(planar, 4.1);
          cpuState.stunTimer = Math.max(cpuState.stunTimer, 0.72);
        }
      }
    }
  }

  const root = new THREE.Group();
  const stab = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 1.6, 0.08),
    new THREE.MeshBasicMaterial({
      color: 0xffefc8,
      transparent: true,
      opacity: 0.72,
    }),
  );
  stab.rotation.x = Math.PI / 2;
  const shock = new THREE.Mesh(
    new THREE.RingGeometry(0.24, 0.62, 20),
    new THREE.MeshBasicMaterial({
      color: 0xffc867,
      transparent: true,
      opacity: 0.62,
      side: THREE.DoubleSide,
    }),
  );
  shock.rotation.x = Math.PI / 2;
  shock.position.z = -0.78;
  root.add(stab);
  root.add(shock);
  root.position.copy(character.root.position).add(new THREE.Vector3(0, 1.42, 0)).addScaledVector(forward, 1.15);
  root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), forward);
  scene.add(root);
  fireballs.push({
    type: "knightStab",
    root,
    stab,
    shock,
    forward,
    speed: 1.8,
    life: 0.22,
    maxLife: 0.22,
  });
}

function castKnightRoyalCleave() {
  state.avalancheCooldown = 1.9;
  state.isPunching = true;
  state.punchTimer = state.punchDuration * 0.9;
  state.blockEffectTimer = 0.22;
  updateLockStatus("Royal cleave!");

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(character.root.quaternion).normalize();

  dummies.entries.forEach((dummy) => {
    const toDummy = dummy.root.position.clone().sub(character.root.position);
    const distance = toDummy.length();
    if (distance > 3.9) return;
    toDummy.y = 0;
    if (toDummy.lengthSq() < 0.0001) return;
    toDummy.normalize();
    if (forward.dot(toDummy) < 0.08) return;
    dummy.wobble = Math.max(dummy.wobble, 1.42);
    dummy.hitFlash = 0.38;
    dummy.root.position.addScaledVector(toDummy, 0.6);
  });

  if (selectedMode !== "training") {
    const toCpu = cpuCharacter.root.position.clone().sub(character.root.position);
    const distance = toCpu.length();
    const planar = toCpu.clone();
    planar.y = 0;
    if (distance <= 3.85 && planar.lengthSq() > 0.0001) {
      planar.normalize();
      if (forward.dot(planar) >= 0.08) {
        const landed = applyHit(character, cpuCharacter, cpuState, 32);
        if (landed) {
          cpuState.velocity.addScaledVector(planar, 4.7);
          cpuState.stunTimer = Math.max(cpuState.stunTimer, 0.82);
        }
      }
    }
  }

  const root = new THREE.Group();
  const arc = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 2.28, 40, 1, Math.PI * 0.02, Math.PI * 1.1),
    new THREE.MeshBasicMaterial({
      color: 0xffecad,
      transparent: true,
      opacity: 0.86,
      side: THREE.DoubleSide,
    }),
  );
  arc.rotation.set(Math.PI / 2, 0, -Math.PI / 4);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.08, 10, 30),
    new THREE.MeshBasicMaterial({
      color: 0xffc55f,
      transparent: true,
      opacity: 0.68,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.scale.set(1.25, 1, 1.25);
  root.add(arc);
  root.add(ring);
  root.position.copy(character.root.position).add(new THREE.Vector3(0, 1.56, 0)).addScaledVector(forward, 1.4);
  root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), forward);
  scene.add(root);
  fireballs.push({
    type: "knightCleave",
    root,
    arc,
    ring,
    forward,
    speed: 1.6,
    life: 0.28,
    maxLife: 0.28,
  });
}

function castKnightKingsQuake() {
  state.thunderCooldown = 3.1;
  state.isPunching = true;
  state.punchTimer = state.punchDuration * 0.72;
  state.blockEffectTimer = 0.34;
  updateLockStatus("King's quake!");

  dummies.entries.forEach((dummy) => {
    const toDummy = dummy.root.position.clone().sub(character.root.position);
    const distance = toDummy.length();
    if (distance > 3.2) return;
    dummy.wobble = Math.max(dummy.wobble, 1.35);
    dummy.hitFlash = 0.36;
    dummy.root.position.addScaledVector(toDummy.normalize(), 0.54);
  });

  if (selectedMode !== "training") {
    const toCpu = cpuCharacter.root.position.clone().sub(character.root.position);
    const distance = toCpu.length();
    if (distance <= 3.15) {
      const hitLanded = applyHit(character, cpuCharacter, cpuState, 30);
      if (hitLanded) {
        const knockback = cpuCharacter.root.position.clone().sub(character.root.position);
        knockback.y = 0;
        if (knockback.lengthSq() > 0.0001) {
          knockback.normalize();
          cpuState.velocity.addScaledVector(knockback, 4.4);
        }
        cpuState.stunTimer = Math.max(cpuState.stunTimer, 0.9);
        cpuState.knockdownTimer = Math.max(cpuState.knockdownTimer, 0.9);
      }
    }
  }

  const root = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 28),
    new THREE.MeshBasicMaterial({
      color: 0xffd46a,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.05;
  root.add(disc);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1.45, 28),
    new THREE.MeshBasicMaterial({
      color: 0xfff1b5,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.07;
  root.add(ring);

  root.position.copy(character.root.position);
  scene.add(root);
  thunderBursts.push({
    type: "knightQuake",
    root,
    ring,
    life: 0.42,
    maxLife: 0.42,
  });
}

function tryAvalanche() {
  getPunchableDummies().forEach((dummy) => {
    dummy.wobble = Math.max(dummy.wobble, 1.05);
    dummy.hitFlash = 0.28;
    const knockback = dummy.root.position.clone().sub(character.root.position).normalize();
    dummy.root.position.addScaledVector(knockback, 0.24);
  });

  if (selectedMode !== "training") {
    const toCpu = cpuCharacter.root.position.clone().sub(character.root.position);
    const distance = toCpu.length();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(character.root.quaternion).normalize();
    if (distance <= 3.05 && forward.dot(toCpu.normalize()) >= 0.42) {
      const hitLanded = applyHit(character, cpuCharacter, cpuState, 10);
      if (hitLanded) {
        const knockback = cpuCharacter.root.position.clone().sub(character.root.position);
        knockback.y = 0;
        if (knockback.lengthSq() > 0.0001) {
          knockback.normalize();
          cpuState.velocity.addScaledVector(knockback, 2.2);
        }
        cpuState.stunTimer = Math.max(cpuState.stunTimer, 0.5);
      }
    }
  }
}

function tryCometDash() {
  if (state.cometDashHit) return;
  const isKnight = selectedClass === "knight";

  dummies.entries.forEach((dummy) => {
    const toDummy = dummy.root.position.clone().sub(character.root.position);
    if (toDummy.length() > (isKnight ? 2.7 : 2.4)) return;
    dummy.wobble = Math.max(dummy.wobble, isKnight ? 1.52 : 1.4);
    dummy.hitFlash = isKnight ? 0.42 : 0.36;
    dummy.root.position.addScaledVector(toDummy.normalize(), isKnight ? 0.5 : 0.42);
  });

  if (selectedMode !== "training") {
    const toCpu = cpuCharacter.root.position.clone().sub(character.root.position);
    const distance = toCpu.length();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(character.root.quaternion).normalize();
    if (distance <= (isKnight ? 3.05 : 2.9) && forward.dot(toCpu.normalize()) >= 0.42) {
      const hitLanded = applyHit(character, cpuCharacter, cpuState, isKnight ? 29 : 34);
      if (hitLanded) {
        const knockback = cpuCharacter.root.position.clone().sub(character.root.position);
        knockback.y = 0;
        if (knockback.lengthSq() > 0.0001) {
          knockback.normalize();
          cpuState.velocity.addScaledVector(knockback, isKnight ? 5 : 5.8);
        }
        cpuState.stunTimer = Math.max(cpuState.stunTimer, isKnight ? 0.95 : 1.1);
        cpuState.knockdownTimer = Math.max(cpuState.knockdownTimer, 1.2);
        state.cometDashHit = true;
      }
    }
  }
}

function updateActor(actor, actorState, input, faceTarget, dt, elapsed) {
  const stunned = actorState.stunTimer > 0;
  const knockedDown = actorState.knockdownTimer > 0;
  const tripped = actorState.tripTimer > 0;
  const effectiveInput = stunned ? new THREE.Vector3() : input.clone();
  if (actorState.isAvalanching) {
    effectiveInput.multiplyScalar(0.2);
  }
  if (actorState.isCometDashing || knockedDown || tripped) {
    effectiveInput.set(0, 0, 0);
  }
  const isMoving = effectiveInput.lengthSq() > 0;
  const usingSkySmash = actor === character && actorState.skySmashActive;

  if (actorState.isExhausted && actorState.stamina >= 30) {
    actorState.isExhausted = false;
  }

  const moveSpeed = actorState.isRunning ? 8.2 : 5.5;
  const targetVelocity = effectiveInput.clone().multiplyScalar(moveSpeed);
  if (actorState.isCometDashing) {
    const dashForward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), actorState.facing);
    targetVelocity.copy(dashForward.multiplyScalar(16));
  }

  actorState.velocity.lerp(targetVelocity, 1 - Math.exp(-dt * 10));
  actor.root.position.addScaledVector(actorState.velocity, dt);
  actorState.verticalVelocity -= 18 * dt;

  if (usingSkySmash && !actorState.skySmashDive && actorState.verticalVelocity <= 0) {
    actorState.skySmashHoverTimer = Math.max(0, actorState.skySmashHoverTimer - dt);
    actorState.verticalVelocity = 0;
  }

  actor.root.position.y += actorState.verticalVelocity * dt;

  if (actor.root.position.y <= 0) {
    const landedFromSkySmash = usingSkySmash && actorState.skySmashDive;
    actor.root.position.y = 0;
    actorState.verticalVelocity = 0;
    actorState.isGrounded = true;
    if (landedFromSkySmash) {
      resolveSkySmash();
    }
  }

  const arenaLimit = 8;
  actor.root.position.x = THREE.MathUtils.clamp(actor.root.position.x, -arenaLimit, arenaLimit);
  actor.root.position.z = THREE.MathUtils.clamp(actor.root.position.z, -arenaLimit, arenaLimit);

  if (isMoving) {
    actorState.facing = dampAngle(actorState.facing, faceTarget, 10, dt);
  }
  actor.root.rotation.y = actorState.facing;

  if (actorState.isRunning) {
    actorState.stamina = Math.max(0, actorState.stamina - 20 * dt);
    if (actorState.stamina === 0) {
      actorState.isRunning = false;
      actorState.isExhausted = true;
    }
  } else {
    const staminaRegen = isMoving ? 10 : 18;
    actorState.stamina = Math.min(actorState.maxStamina, actorState.stamina + staminaRegen * dt);
  }
  if (actorState.hp > 0 && actorState.hitCooldown <= 0) {
    const healthRegen = actor === cpuCharacter ? getCpuDifficultyProfile().regenPerSecond : 1.6;
    actorState.hp = Math.min(actorState.maxHp, actorState.hp + dt * healthRegen);
  }

  actorState.walkCycle += dt * (isMoving ? (actorState.isRunning ? 12.5 : 9.5) : 2.2);
  actorState.punchCooldown = Math.max(0, actorState.punchCooldown - dt);
  actorState.avalancheCooldown = Math.max(0, actorState.avalancheCooldown - dt);
  actorState.cometDashCooldown = Math.max(0, actorState.cometDashCooldown - dt);
  actorState.fireballCooldown = Math.max(0, actorState.fireballCooldown - dt);
  actorState.thunderCooldown = Math.max(0, actorState.thunderCooldown - dt);
  actorState.blockCooldown = Math.max(0, actorState.blockCooldown - dt);
  actorState.blockEffectTimer = Math.max(0, actorState.blockEffectTimer - dt);
  actorState.stunTimer = Math.max(0, actorState.stunTimer - dt);
  actorState.knockdownTimer = Math.max(0, actorState.knockdownTimer - dt);
  actorState.tripTimer = Math.max(0, actorState.tripTimer - dt);
  actorState.skySmashProcFlash = Math.max(0, actorState.skySmashProcFlash - dt);
  actorState.spinCooldown = Math.max(0, actorState.spinCooldown - dt);
  actorState.hitCooldown = Math.max(0, actorState.hitCooldown - dt);
  actorState.aiSpecialCooldown = Math.max(0, actorState.aiSpecialCooldown - dt);
  actorState.aiBlockWindow = Math.max(0, actorState.aiBlockWindow - dt);

  if (usingSkySmash && !actorState.skySmashDive && actorState.verticalVelocity <= 0 && actorState.skySmashHoverTimer <= 0) {
    actorState.skySmashDive = true;
    actorState.verticalVelocity = -8.4 - actorState.skySmashCharge * 0.18;
    updateLockStatus("Sky smash!");
  }

  if (actorState.isPunching) {
    actorState.punchTimer -= dt;
    if (actorState.punchTimer <= 0) {
      actorState.isPunching = false;
      actorState.punchTimer = 0;
    }
  }

  if (actorState.isAvalanching) {
    actorState.avalancheTimer -= dt;
    actorState.avalancheHitTimer -= dt;
    if (actorState.avalancheHitTimer <= 0 && actor === character) {
      actorState.avalancheHitTimer = 0.038;
      tryAvalanche();
    } else if (actorState.avalancheHitTimer <= 0 && actor === cpuCharacter) {
      actorState.avalancheHitTimer = 0.038;
      tryCpuAvalanche();
    }
    if (actorState.avalancheTimer <= 0) {
      actorState.isAvalanching = false;
      actorState.avalancheTimer = 0;
      actorState.avalancheHitTimer = 0;
      updateLockStatus("Camera: Hold click and drag to look");
    }
  }

  if (actorState.isCometDashing) {
    actorState.cometDashTimer -= dt;
    if (actor === character && actorState.cometDashTimer <= actorState.cometDashDuration * 0.65) {
      tryCometDash();
    } else if (actor === cpuCharacter && actorState.cometDashTimer <= actorState.cometDashDuration * 0.65) {
      tryCpuCometDash();
    }
    if (actorState.cometDashTimer <= 0) {
      if (actor === character && !actorState.cometDashHit) {
        actorState.tripTimer = Math.max(actorState.tripTimer, 0.9);
        actorState.stunTimer = Math.max(actorState.stunTimer, 0.55);
        actorState.velocity.multiplyScalar(0.2);
        updateLockStatus("You tripped!");
      } else if (actor === cpuCharacter && !actorState.cometDashHit) {
        actorState.tripTimer = Math.max(actorState.tripTimer, 0.9);
        actorState.stunTimer = Math.max(actorState.stunTimer, 0.45);
        actorState.velocity.multiplyScalar(0.2);
      } else {
        updateLockStatus("Camera: Hold click and drag to look");
      }
      actorState.isCometDashing = false;
      actorState.cometDashTimer = 0;
      actorState.cometDashHit = false;
    }
  }

  if (actorState.isBlocking) {
    actorState.blockTimer -= dt;
    if (actorState.blockTimer <= 0) {
      actorState.isBlocking = false;
      actorState.blockTimer = 0;
    }
  }

  if (actorState.isSpinning) {
    actorState.spinTimer -= dt;
    if (actorState.spinTimer <= actorState.spinDuration * 0.45 && actor === character) {
      trySpinAttack();
    } else if (actorState.spinTimer <= actorState.spinDuration * 0.45 && actor === cpuCharacter) {
      tryCpuSpinAttack();
    }
    if (actorState.spinTimer <= 0) {
      actorState.isSpinning = false;
      actorState.spinTimer = 0;
      actorState.spinHasHit = false;
    }
  }

  const idleBob = Math.sin(elapsed * 2.4) * 0.06;
  const walk = Math.sin(actorState.walkCycle);
  const walkOpp = Math.sin(actorState.walkCycle + Math.PI);
  const stride = isMoving ? 1 : 0;
  const strafe = stunned ? 0 : actorState.moveHorizontal;
  const forwardMove = stunned ? 0 : actorState.moveVertical;
  const strideDirection = forwardMove >= 0 ? 1 : -1;
  const airborne = actorState.isGrounded ? 0 : 1;
  const punchProgress = actorState.isPunching ? 1 - actorState.punchTimer / actorState.punchDuration : 0;
  const punchPhase = Math.min(punchProgress, 1);
  const punchReach = punchPhase < 0.38 ? punchPhase / 0.38 : 1 - (punchPhase - 0.38) / 0.62;
  const punchSwing = THREE.MathUtils.clamp(punchReach, 0, 1);
  const punchSnap = Math.sin(punchPhase * Math.PI);
  const avalancheProgress = actorState.isAvalanching ? 1 - actorState.avalancheTimer / actorState.avalancheDuration : 0;
  const avalancheBurst = actorState.isAvalanching ? Math.sin(avalancheProgress * Math.PI * 26) : 0;
  const avalancheArc = actorState.isAvalanching ? Math.sin(avalancheProgress * Math.PI) : 0;
  const cometDashProgress = actorState.isCometDashing ? 1 - actorState.cometDashTimer / actorState.cometDashDuration : 0;
  const cometDashArc = actorState.isCometDashing ? Math.sin(cometDashProgress * Math.PI) : 0;
  const knockdownArc = knockedDown ? Math.sin((actorState.knockdownTimer / 1.2) * Math.PI) : 0;
  const tripArc = tripped ? Math.sin((actorState.tripTimer / 0.9) * Math.PI) : 0;
  const blockArc = actorState.isBlocking ? Math.sin((1 - actorState.blockTimer / actorState.blockDuration) * Math.PI) : 0;
  const spinProgress = actorState.isSpinning ? 1 - actorState.spinTimer / actorState.spinDuration : 0;
  const spinArc = actorState.isSpinning ? Math.sin(spinProgress * Math.PI) : 0;
  const spinTurn = actorState.isSpinning ? spinProgress * Math.PI * 4.6 : 0;
  const skySmashArc = usingSkySmash ? 1 : 0;
  const skySmashChargeTilt = usingSkySmash ? Math.min(actorState.skySmashCharge / 10, 1.4) : 0;
  const skySmashHoverGlow = usingSkySmash && !actorState.skySmashDive
    ? 0.35 + Math.min(actorState.skySmashCharge / 18, 0.65)
    : 0;

  actor.hips.position.y = 1.15 + idleBob + Math.abs(walk) * 0.08 * stride + airborne * 0.1 - knockdownArc * 0.7 - tripArc * 0.38;
  actor.hips.rotation.z =
    Math.sin(elapsed * 1.2) * 0.03 + walk * 0.04 * stride * strideDirection - strafe * 0.12 - punchSwing * 0.05 + spinArc * 0.08 + avalancheBurst * 0.1 + cometDashArc * 0.16 - knockdownArc * 1.25 + tripArc * 0.55;
  actor.torso.rotation.y = walk * 0.04 * stride * strideDirection + strafe * 0.18 - punchSwing * 0.42 + spinArc * 0.6 + avalancheBurst * 0.32;
  actor.torso.rotation.x =
    0.05 + Math.abs(walk) * 0.05 * stride + punchSnap * 0.12 + spinArc * 0.18 - airborne * 0.15 - blockArc * 0.08 + (stunned ? 0.18 : 0) + skySmashArc * (actorState.skySmashDive ? 0.7 : -0.42) + avalancheArc * 0.18 + cometDashArc * 0.8 + knockdownArc * 1.2 + tripArc * 1.05;
  actor.headPivot.rotation.z = -walk * 0.04 * stride + Math.sin(elapsed * 1.6) * 0.02 + (stunned ? 0.08 : 0) - avalancheBurst * 0.06 + knockdownArc * 0.22 - tripArc * 0.16;
  actor.headPivot.rotation.y = punchSwing * 0.12 - spinArc * 0.35 + blockArc * 0.08 + avalancheBurst * 0.14 - knockdownArc * 0.35;

  actor.armLeft.shoulder.rotation.x =
    walkOpp * 0.7 * stride * strideDirection - 0.32 - punchSwing * 0.42 + spinArc * 1.25 - Math.abs(strafe) * 0.1 - airborne * 0.25 - blockArc * 0.35 + (stunned ? 0.45 : 0) - skySmashArc * (actorState.skySmashDive ? 0.55 : 1.2 + skySmashChargeTilt * 0.12) - avalancheBurst * 2.3 + avalancheArc * 0.5 - cometDashArc * 0.9 + knockdownArc * 1.3 + tripArc * 0.7;
  actor.armLeft.shoulder.rotation.y = -punchSwing * 0.15 - spinArc * 0.7 + blockArc * 0.35 - avalancheBurst * 0.32 + cometDashArc * 0.2 - knockdownArc * 0.2;
  actor.armLeft.shoulder.rotation.z = -0.32 - strafe * 0.18 - spinArc * 0.85 - blockArc * 0.42 - avalancheArc * 0.55 - cometDashArc * 0.35 - knockdownArc * 0.55 + tripArc * 0.25;
  actor.armLeft.elbow.rotation.x = 0.55 + Math.max(0, -walkOpp) * 0.18 * stride + punchSwing * 0.2 + spinArc * 0.4 + blockArc * 0.8 + skySmashArc * (actorState.skySmashDive ? 0.55 : 0.9) + avalancheArc * 1.15 + cometDashArc * 0.6 + knockdownArc * 0.75;

  actor.armRight.shoulder.rotation.x =
    walk * 0.25 * stride * strideDirection - 0.45 + punchSwing * 2.15 + spinArc * 1.1 - Math.abs(strafe) * 0.08 - airborne * 0.25 - blockArc * 0.35 + (stunned ? 0.45 : 0) - skySmashArc * (actorState.skySmashDive ? 0.55 : 1.2 + skySmashChargeTilt * 0.12) + avalancheBurst * 2.3 + avalancheArc * 0.5 - cometDashArc * 1.35 + knockdownArc * 0.5 + tripArc * 1.15;
  actor.armRight.shoulder.rotation.y = -0.18 - punchSwing * 0.55 + spinArc * 0.9 - blockArc * 0.35 - cometDashArc * 0.45 + avalancheBurst * 0.32 + knockdownArc * 0.18 - tripArc * 0.2;
  actor.armRight.shoulder.rotation.z = 0.34 + punchSwing * 0.08 - strafe * 0.18 + spinArc * 0.7 + blockArc * 0.42 + avalancheArc * 0.55 + cometDashArc * 0.22 + knockdownArc * 0.22 + tripArc * 0.4;
  actor.armRight.elbow.rotation.x = 0.95 - punchSwing * 1.55 + spinArc * 0.2 + blockArc * 0.8 + skySmashArc * (actorState.skySmashDive ? 0.55 : 0.9) + avalancheArc * 1.15 + cometDashArc * 0.2 + tripArc * 0.95;

  if (actor.knightSword) {
    actor.knightSword.rotation.x = selectedClass === "knight" && actor === character ? 0.08 + punchSwing * 0.28 + cometDashArc * 0.18 : 0;
    actor.knightSword.rotation.y = selectedClass === "knight" && actor === character ? 0.1 + spinArc * 0.22 : 0;
    actor.knightSword.rotation.z = selectedClass === "knight" && actor === character ? 0.04 + punchSwing * 0.12 : 0.04;
  }

  actor.legLeft.hip.rotation.x = walk * 0.8 * stride * strideDirection - strafe * 0.18 + airborne * 0.25;
  actor.legLeft.hip.rotation.z = -strafe * 0.14;
  actor.legLeft.knee.rotation.x = Math.max(0, -walk * strideDirection) * 0.65 * stride + airborne * 0.35;
  actor.legRight.hip.rotation.x = walkOpp * 0.8 * stride * strideDirection - strafe * 0.18 + airborne * 0.25;
  actor.legRight.hip.rotation.z = -strafe * 0.14;
  actor.legRight.knee.rotation.x = Math.max(0, -walkOpp * strideDirection) * 0.65 * stride + airborne * 0.35;

  actor.root.rotation.y = actorState.facing + spinTurn;

  const blockFlash = actorState.blockEffectTimer > 0 ? actorState.blockEffectTimer / 0.24 : 0;
  const procFlash = actorState.skySmashProcFlash > 0 ? actorState.skySmashProcFlash / 0.75 : 0;
  actor.blockBurst.visible = blockFlash > 0 || procFlash > 0;
  if (actor.blockBurst.visible) {
    const flashStrength = Math.max(blockFlash * 0.9, procFlash * 0.95);
    actor.blockBurst.material.opacity = flashStrength;
    actor.blockBurst.material.color.setHex(procFlash > blockFlash ? 0xfff37a : 0x9ce9ff);
    actor.blockBurst.rotation.z = elapsed * (procFlash > blockFlash ? 16 : 10);
    actor.blockBurst.scale.setScalar(1 + (1 - Math.max(blockFlash, procFlash)) * (procFlash > blockFlash ? 2.1 : 1.4));
  }

  actor.windGroup.visible = spinArc > 0.01 || usingSkySmash;
  if (actor.windGroup.visible) {
    const smashWind = usingSkySmash ? 0.16 + Math.min(actorState.skySmashCharge / 14, 0.45) : 0;
    actor.windRingLow.material.opacity = 0.18 + spinArc * 0.3 + smashWind;
    actor.windRingHigh.material.opacity = 0.12 + spinArc * 0.24 + smashWind * 0.8;
    actor.windSlash.material.opacity = 0.16 + spinArc * 0.38 + smashWind * 1.15;
    actor.windRingLow.rotation.z = elapsed * 12;
    actor.windRingHigh.rotation.z = -elapsed * 15;
    actor.windSlash.rotation.z = elapsed * 18;
    actor.windRingLow.scale.setScalar(1 + spinArc * 0.45 + smashWind * 0.55);
    actor.windRingHigh.scale.setScalar(1 + spinArc * 0.32 + smashWind * 0.45);
    actor.windSlash.scale.setScalar(1 + spinArc * 0.55 + smashWind * 0.7);
  }

  if (usingSkySmash && !actorState.skySmashDive) {
    actor.blockBurst.visible = true;
    actor.blockBurst.material.opacity = Math.max(actor.blockBurst.material.opacity, skySmashHoverGlow);
    actor.blockBurst.material.color.setHex(0xffef88);
    actor.blockBurst.rotation.z = elapsed * 7;
    actor.blockBurst.scale.setScalar(1.35 + skySmashHoverGlow * 1.4);
    actor.windRingLow.material.opacity = Math.max(actor.windRingLow.material.opacity, 0.28 + skySmashHoverGlow * 0.45);
    actor.windRingHigh.material.opacity = Math.max(actor.windRingHigh.material.opacity, 0.2 + skySmashHoverGlow * 0.35);
    actor.windSlash.material.opacity = Math.max(actor.windSlash.material.opacity, 0.24 + skySmashHoverGlow * 0.4);
  }

  if (actorState.isAvalanching) {
    actor.blockBurst.visible = true;
    actor.blockBurst.material.opacity = Math.max(actor.blockBurst.material.opacity, 0.38 + avalancheArc * 0.26);
    actor.blockBurst.material.color.setHex(0xffdf9a);
    actor.blockBurst.rotation.z = elapsed * 32;
    actor.blockBurst.scale.setScalar(1.2 + avalancheArc * 0.65);
    actor.windGroup.visible = true;
    actor.windRingLow.material.opacity = Math.max(actor.windRingLow.material.opacity, 0.42 + avalancheArc * 0.28);
    actor.windRingHigh.material.opacity = Math.max(actor.windRingHigh.material.opacity, 0.34 + avalancheArc * 0.24);
    actor.windSlash.material.opacity = Math.max(actor.windSlash.material.opacity, 0.46 + avalancheArc * 0.3);
    actor.windRingLow.rotation.z = elapsed * 30;
    actor.windRingHigh.rotation.z = -elapsed * 36;
    actor.windSlash.rotation.z = elapsed * 44;
    actor.windRingLow.scale.setScalar(1.15 + avalancheArc * 0.8);
    actor.windRingHigh.scale.setScalar(1.08 + avalancheArc * 0.65);
    actor.windSlash.scale.setScalar(1.22 + avalancheArc * 0.9);
  }

  if (actorState.isCometDashing) {
    actor.blockBurst.visible = true;
    actor.blockBurst.material.opacity = Math.max(actor.blockBurst.material.opacity, 0.55 + cometDashArc * 0.25);
    actor.blockBurst.material.color.setHex(0xffb35c);
    actor.blockBurst.rotation.z = elapsed * 24;
    actor.blockBurst.scale.setScalar(1.45 + cometDashArc * 0.8);
    actor.windGroup.visible = true;
    actor.windRingLow.material.opacity = Math.max(actor.windRingLow.material.opacity, 0.5 + cometDashArc * 0.3);
    actor.windRingHigh.material.opacity = Math.max(actor.windRingHigh.material.opacity, 0.38 + cometDashArc * 0.24);
    actor.windSlash.material.opacity = Math.max(actor.windSlash.material.opacity, 0.58 + cometDashArc * 0.28);
    actor.windRingLow.rotation.z = elapsed * 22;
    actor.windRingHigh.rotation.z = -elapsed * 28;
    actor.windSlash.rotation.z = elapsed * 34;
    actor.windRingLow.scale.setScalar(1.25 + cometDashArc * 0.85);
    actor.windRingHigh.scale.setScalar(1.15 + cometDashArc * 0.6);
    actor.windSlash.scale.setScalar(1.35 + cometDashArc * 0.95);
  }
}

function updateCharacter(dt, elapsed) {
  const input = getMoveInput();
  const isMoving = input.lengthSq() > 0;
  const wantsRun = keys.has("ShiftLeft") || keys.has("ShiftRight");

  state.isRunning =
    !state.skySmashActive && wantsRun && isMoving && state.isGrounded;
  updateActor(character, state, input, state.cameraYaw, dt, elapsed);
  updateStaminaBar();
}

function tryCpuPunch() {
  const toPlayer = character.root.position.clone().sub(cpuCharacter.root.position);
  const distance = toPlayer.length();
  if (distance > 2.35) return false;

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cpuCharacter.root.quaternion).normalize();
  if (forward.dot(toPlayer.normalize()) < 0.72) return false;

  return applyHit(cpuCharacter, character, state, scaleCpuDamage(10));
}

function tryCpuSpinAttack() {
  if (cpuState.spinHasHit) return;
  const toPlayer = character.root.position.clone().sub(cpuCharacter.root.position);
  if (toPlayer.length() <= 2.75) {
    applyHit(cpuCharacter, character, state, scaleCpuDamage(18));
  }
  cpuState.spinHasHit = true;
}

function castCpuArcaneBurst() {
  cpuState.fireballCooldown = 1.1;
  cpuState.isPunching = true;
  cpuState.punchTimer = cpuState.punchDuration * 0.6;

  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cpuCharacter.root.quaternion).normalize();
  const burstCenter = cpuCharacter.root.position.clone().add(new THREE.Vector3(0, 1.55, 0)).addScaledVector(forward, 1.7);
  const toPlayer = character.root.position.clone().sub(cpuCharacter.root.position);
  const distance = toPlayer.length();
  const planar = toPlayer.clone();
  planar.y = 0;
  if (distance <= 3.55 && planar.lengthSq() > 0.0001) {
    planar.normalize();
    if (forward.dot(planar) >= 0.52) {
      const landed = applyHit(cpuCharacter, character, state, scaleCpuDamage(24));
      if (landed) {
        state.velocity.addScaledVector(planar, 3.2);
        state.stunTimer = Math.max(state.stunTimer, 0.55);
      }
    }
  }

  const root = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 18, 18),
    new THREE.MeshBasicMaterial({ color: 0x78b2ff, transparent: true, opacity: 0.82 }),
  );
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 18, 18),
    new THREE.MeshBasicMaterial({ color: 0xe5efff, transparent: true, opacity: 0.42 }),
  );
  const ringA = new THREE.Mesh(
    new THREE.TorusGeometry(0.66, 0.08, 10, 30),
    new THREE.MeshBasicMaterial({ color: 0xc7deff, transparent: true, opacity: 0.72 }),
  );
  ringA.rotation.y = Math.PI / 2;
  const ringB = new THREE.Mesh(
    new THREE.TorusGeometry(0.44, 0.06, 10, 28),
    new THREE.MeshBasicMaterial({ color: 0x9fc9ff, transparent: true, opacity: 0.6 }),
  );
  ringB.rotation.x = Math.PI / 2;
  const slash = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.78, 0.18, 18, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xecf4ff, transparent: true, opacity: 0.52 }),
  );
  slash.rotation.z = Math.PI / 2;
  slash.rotation.x = Math.PI / 2;
  root.add(core);
  root.add(flash);
  root.add(ringA);
  root.add(ringB);
  root.add(slash);
  root.position.copy(burstCenter);
  root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), forward);
  scene.add(root);
  fireballs.push({
    type: "arcaneBurst",
    root,
    core,
    flash,
    ringA,
    ringB,
    slash,
    forward,
    speed: 2.8,
    life: 0.34,
    maxLife: 0.34,
  });
}

function castCpuThunderBurst() {
  cpuState.thunderCooldown = 2.8;
  cpuState.blockEffectTimer = 0.34;
  const offsets = [
    new THREE.Vector3(1.8, 0, 0.4),
    new THREE.Vector3(-1.5, 0, -0.8),
    new THREE.Vector3(0.3, 0, 1.9),
    new THREE.Vector3(-0.4, 0, -2.1),
    new THREE.Vector3(2.1, 0, -1.5),
  ];

  offsets.forEach((offset, index) => {
    const root = new THREE.Group();
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.15, 4.8, 6),
      new THREE.MeshBasicMaterial({ color: 0xe9f7ff }),
    );
    bolt.position.y = 2.4;
    bolt.rotation.z = (Math.random() - 0.5) * 0.35;
    root.add(bolt);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.9, 20),
      new THREE.MeshBasicMaterial({ color: 0x8eb8ff, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    root.add(ring);

    root.position.copy(cpuCharacter.root.position).add(offset);
    scene.add(root);
    thunderBursts.push({
      root,
      ring,
      life: 0.32 + index * 0.015,
    });
  });

  const playerDistance = character.root.position.distanceTo(cpuCharacter.root.position);
  if (playerDistance <= 3.4) {
    const landed = applyHit(cpuCharacter, character, state, scaleCpuDamage(24));
    if (landed) {
      state.stunTimer = Math.max(state.stunTimer, 0.72);
      const knockback = character.root.position.clone().sub(cpuCharacter.root.position);
      knockback.y = 0;
      if (knockback.lengthSq() > 0.0001) {
        knockback.normalize();
        state.velocity.addScaledVector(knockback, 3.2);
      }
    }
  }
}

function tryCpuAvalanche() {
  const toPlayer = character.root.position.clone().sub(cpuCharacter.root.position);
  const distance = toPlayer.length();
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cpuCharacter.root.quaternion).normalize();
  if (distance <= 3.05 && forward.dot(toPlayer.normalize()) >= 0.42) {
    const hitLanded = applyHit(cpuCharacter, character, state, scaleCpuDamage(10));
    if (hitLanded) {
      const knockback = character.root.position.clone().sub(cpuCharacter.root.position);
      knockback.y = 0;
      if (knockback.lengthSq() > 0.0001) {
        knockback.normalize();
        state.velocity.addScaledVector(knockback, 2.2);
      }
      state.stunTimer = Math.max(state.stunTimer, 0.5);
    }
  }
}

function tryCpuCometDash() {
  if (cpuState.cometDashHit) return;

  const toPlayer = character.root.position.clone().sub(cpuCharacter.root.position);
  const distance = toPlayer.length();
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cpuCharacter.root.quaternion).normalize();
  if (distance <= 2.9 && forward.dot(toPlayer.normalize()) >= 0.42) {
    const hitLanded = applyHit(cpuCharacter, character, state, scaleCpuDamage(34));
    if (hitLanded) {
      const knockback = character.root.position.clone().sub(cpuCharacter.root.position);
      knockback.y = 0;
      if (knockback.lengthSq() > 0.0001) {
        knockback.normalize();
        state.velocity.addScaledVector(knockback, 5.8);
      }
      state.stunTimer = Math.max(state.stunTimer, 1.1);
      state.knockdownTimer = Math.max(state.knockdownTimer, 1.2);
      cpuState.cometDashHit = true;
    }
  }
}

function updateCpu(dt, elapsed) {
  if (selectedMode === "training") return;
  const cpuDifficulty = getCpuDifficultyProfile();
  if (cpuState.stunTimer > 0) {
    cpuState.moveHorizontal = 0;
    cpuState.moveVertical = 0;
    cpuState.isRunning = false;
    cpuState.aiJumpCooldown = Math.max(0, cpuState.aiJumpCooldown - dt);
    cpuState.aiPunchCooldown = Math.max(0, cpuState.aiPunchCooldown - dt);
    updateActor(cpuCharacter, cpuState, new THREE.Vector3(), cpuState.facing, dt, elapsed);
    return;
  }

  const toPlayer = character.root.position.clone().sub(cpuCharacter.root.position);
  const distance = toPlayer.length();
  const planar = toPlayer.clone();
  planar.y = 0;
  if (planar.lengthSq() > 0.0001) planar.normalize();

  const faceTarget = Math.atan2(-planar.x, -planar.z);
  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cpuState.facing);
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  const playerThreatening =
    state.punchTimer > 0.08 ||
    state.isSpinning ||
    state.isAvalanching ||
    state.isCometDashing ||
    state.skySmashDive;
  if (
    cpuState.blockCooldown <= 0 &&
    !cpuState.isBlocking &&
    cpuState.aiBlockWindow <= 0 &&
    distance <= 2.8 &&
    playerThreatening &&
    forward.dot(planar) > 0.38 &&
    (
      state.isCometDashing ||
      state.isSpinning ||
      state.isAvalanching ||
      Math.random() < cpuDifficulty.blockChance
    )
  ) {
    cpuState.isBlocking = true;
    cpuState.blockTimer = cpuState.blockDuration;
    cpuState.blockCooldown = 1.15 * cpuDifficulty.punchCooldownScale;
    cpuState.aiBlockWindow = 0.45;
  }

  let desiredMove = new THREE.Vector3();
  if (distance > cpuDifficulty.preferredRange) {
    desiredMove.copy(planar);
  } else {
    desiredMove.copy(right).multiplyScalar(Math.sin(elapsed * 1.7) > 0 ? 1 : -1).add(planar.multiplyScalar(-0.2));
  }
  if (desiredMove.lengthSq() > 1) desiredMove.normalize();

  cpuState.moveHorizontal = THREE.MathUtils.clamp(desiredMove.dot(right), -1, 1);
  cpuState.moveVertical = THREE.MathUtils.clamp(desiredMove.dot(forward), -1, 1);

  if (cpuState.isGrounded && cpuState.aiJumpCooldown <= 0 && distance > 3.2 && distance < 6.2) {
    cpuState.verticalVelocity = 7.3;
    cpuState.isGrounded = false;
    cpuState.aiJumpCooldown = (2.5 + Math.random() * 1.5) * cpuDifficulty.jumpCooldownScale;
  }

  cpuState.aiJumpCooldown = Math.max(0, cpuState.aiJumpCooldown - dt);
  cpuState.aiPunchCooldown = Math.max(0, cpuState.aiPunchCooldown - dt);

  cpuState.isRunning =
    distance > cpuDifficulty.runThreshold && cpuState.isGrounded && desiredMove.lengthSq() > 0;

  const canUseSpecial =
    cpuState.aiSpecialCooldown <= 0 &&
    !cpuState.isBlocking &&
    !cpuState.isPunching &&
    !cpuState.isSpinning &&
    !cpuState.isAvalanching &&
    !cpuState.isCometDashing &&
    cpuState.isGrounded &&
    cpuState.stamina >= 20;

  if (canUseSpecial) {
    if (distance <= 2.35 && cpuState.spinCooldown <= 0 && cpuState.aiPunchCooldown > 0.15) {
      cpuState.isSpinning = true;
      cpuState.spinTimer = cpuState.spinDuration;
      cpuState.spinCooldown = 1.9;
      cpuState.spinHasHit = false;
      cpuState.aiSpecialCooldown = 1.4 * cpuDifficulty.specialCooldownScale;
    } else if (cpuClass === "mage") {
      if (distance >= 2.15 && distance <= 3.7 && cpuState.fireballCooldown <= 0 && cpuState.stamina >= 18) {
        cpuState.stamina = Math.max(0, cpuState.stamina - 18);
        castCpuArcaneBurst();
        cpuState.aiSpecialCooldown = 1.5 * cpuDifficulty.specialCooldownScale;
      } else if (distance <= 2.9 && cpuState.thunderCooldown <= 0 && cpuState.stamina >= 24) {
        cpuState.stamina = Math.max(0, cpuState.stamina - 24);
        castCpuThunderBurst();
        cpuState.aiSpecialCooldown = 2.2 * cpuDifficulty.specialCooldownScale;
      }
    } else if (distance <= 2.95 && cpuState.avalancheCooldown <= 0 && cpuState.stamina >= 26) {
      cpuState.stamina = Math.max(0, cpuState.stamina - 26);
      cpuState.isAvalanching = true;
      cpuState.avalancheTimer = cpuState.avalancheDuration;
      cpuState.avalancheCooldown = 3.2;
      cpuState.avalancheHitTimer = 0;
      cpuState.isPunching = false;
      cpuState.punchTimer = 0;
      cpuState.aiSpecialCooldown = 2 * cpuDifficulty.specialCooldownScale;
    } else if (distance > 2.5 && distance <= 5.4 && cpuState.cometDashCooldown <= 0 && cpuState.stamina >= 32) {
      cpuState.stamina = Math.max(0, cpuState.stamina - 32);
      cpuState.isCometDashing = true;
      cpuState.cometDashTimer = cpuState.cometDashDuration;
      cpuState.cometDashCooldown = 2.8;
      cpuState.cometDashHit = false;
      cpuState.isPunching = false;
      cpuState.punchTimer = 0;
      cpuState.isAvalanching = false;
      cpuState.avalancheTimer = 0;
      cpuState.avalancheHitTimer = 0;
      cpuState.aiSpecialCooldown = 2.1 * cpuDifficulty.specialCooldownScale;
    }
  }

  if (cpuState.punchCooldown <= 0 && cpuState.aiPunchCooldown <= 0 && tryCpuPunch()) {
    cpuState.isPunching = true;
    cpuState.punchTimer = cpuState.punchDuration;
    cpuState.punchCooldown = 0.65 * cpuDifficulty.punchCooldownScale;
    cpuState.aiPunchCooldown = 1.1 * cpuDifficulty.punchCooldownScale;
  }

  updateActor(cpuCharacter, cpuState, desiredMove, faceTarget, dt, elapsed);
}

function updateDummies(dt) {
  dummies.entries.forEach((dummy) => {
    dummy.wobble = Math.max(0, dummy.wobble - dt * 1.8);
    dummy.hitFlash = Math.max(0, dummy.hitFlash - dt);

    dummy.top.rotation.z = Math.sin(clock.elapsedTime * 22) * dummy.wobble * 0.16;
    dummy.top.rotation.x = Math.cos(clock.elapsedTime * 18) * dummy.wobble * 0.12;
    dummy.top.material.emissive = new THREE.Color(0x402010).multiplyScalar(dummy.hitFlash * 1.5);

    dummy.root.position.lerp(dummy.home, 1 - Math.exp(-dt * 2.6));
  });
}

function updateDirtBursts(dt) {
  for (let i = dirtBursts.length - 1; i >= 0; i -= 1) {
    const burst = dirtBursts[i];
    burst.life -= dt;

    burst.particles.forEach((particle) => {
      particle.velocity.y -= 14 * dt;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.mesh.rotation.x += particle.spin * dt;
      particle.mesh.rotation.y += particle.spin * 0.8 * dt;
      if (particle.mesh.position.y <= 0) {
        particle.mesh.position.y = 0;
        particle.velocity.x *= 0.9;
        particle.velocity.z *= 0.9;
        particle.velocity.y *= -0.18;
      }
      particle.mesh.material.opacity = Math.max(0, Math.min(1, burst.life / 0.7));
      particle.mesh.material.transparent = true;
    });

    if (burst.life <= 0) {
      scene.remove(burst.root);
      burst.particles.forEach((particle) => {
        particle.mesh.geometry.dispose();
        particle.mesh.material.dispose();
      });
      dirtBursts.splice(i, 1);
    }
  }
}

function updateFireballs(dt) {
  for (let i = fireballs.length - 1; i >= 0; i -= 1) {
    const fireball = fireballs[i];
    fireball.life -= dt;
    if (fireball.type === "arcaneBurst") {
      const burstProgress = 1 - Math.max(fireball.life, 0) / fireball.maxLife;
      fireball.root.position.addScaledVector(fireball.forward, fireball.speed * dt);
      fireball.root.rotation.z += dt * 18;
      fireball.core.material.opacity = Math.max(0, 0.82 - burstProgress * 0.72);
      fireball.flash.material.opacity = Math.max(0, 0.42 - burstProgress * 0.36);
      fireball.ringA.material.opacity = Math.max(0, 0.72 - burstProgress * 0.62);
      fireball.ringB.material.opacity = Math.max(0, 0.6 - burstProgress * 0.52);
      fireball.slash.material.opacity = Math.max(0, 0.52 - burstProgress * 0.46);
      fireball.core.scale.setScalar(1 + burstProgress * 1.4);
      fireball.flash.scale.setScalar(1 + burstProgress * 2.1);
      fireball.ringA.rotation.z += dt * 16;
      fireball.ringB.rotation.y += dt * 20;
      fireball.ringA.scale.setScalar(1 + burstProgress * 2.4);
      fireball.ringB.scale.setScalar(1 + burstProgress * 2.9);
      fireball.slash.scale.set(1 + burstProgress * 1.6, 1 + burstProgress * 0.6, 1 + burstProgress * 2.8);
    } else if (fireball.type === "knightStab") {
      const stabProgress = 1 - Math.max(fireball.life, 0) / fireball.maxLife;
      fireball.root.position.addScaledVector(fireball.forward, fireball.speed * dt);
      fireball.stab.material.opacity = Math.max(0, 0.72 - stabProgress * 0.56);
      fireball.shock.material.opacity = Math.max(0, 0.62 - stabProgress * 0.5);
      fireball.stab.scale.set(1, 1 + stabProgress * 0.8, 1);
      fireball.shock.rotation.z += dt * 12;
      fireball.shock.scale.setScalar(1 + stabProgress * 1.8);
    } else if (fireball.type === "knightCleave") {
      const cleaveProgress = 1 - Math.max(fireball.life, 0) / fireball.maxLife;
      fireball.root.position.addScaledVector(fireball.forward, fireball.speed * dt);
      fireball.root.rotation.z += dt * 10;
      fireball.arc.material.opacity = Math.max(0, 0.74 - cleaveProgress * 0.62);
      fireball.ring.material.opacity = Math.max(0, 0.54 - cleaveProgress * 0.46);
      fireball.arc.scale.setScalar(1 + cleaveProgress * 0.95);
      fireball.ring.rotation.z += dt * 14;
      fireball.ring.scale.setScalar(1.18 + cleaveProgress * 0.95);
    }

    if (fireball.life <= 0 || fireball.root.position.length() > 40) {
      scene.remove(fireball.root);
      fireball.root.children.forEach((child) => {
        child.geometry.dispose();
        child.material.dispose();
      });
      fireballs.splice(i, 1);
    }
  }
}

function updateThunderBursts(dt) {
  for (let i = thunderBursts.length - 1; i >= 0; i -= 1) {
    const burst = thunderBursts[i];
    burst.life -= dt;
    if (burst.type === "knightQuake") {
      const pulseProgress = 1 - Math.max(burst.life, 0) / burst.maxLife;
      burst.root.children[0].material.opacity = Math.max(0, 0.45 - pulseProgress * 0.36);
      burst.root.children[0].material.transparent = true;
      burst.root.children[0].scale.setScalar(1 + pulseProgress * 3.1);
      burst.ring.material.opacity = Math.max(0, 0.72 - pulseProgress * 0.6);
      burst.ring.scale.setScalar(1 + pulseProgress * 3.8);
    } else {
      burst.root.children[0].material.opacity = Math.max(0, burst.life / 0.32);
      burst.root.children[0].material.transparent = true;
      burst.ring.material.opacity = Math.max(0, burst.life / 0.32);
      burst.ring.scale.setScalar(1 + (0.32 - Math.max(burst.life, 0)) * 2.4);
    }

    if (burst.life <= 0) {
      scene.remove(burst.root);
      burst.root.children.forEach((child) => {
        child.geometry.dispose();
        child.material.dispose();
      });
      thunderBursts.splice(i, 1);
    }
  }
}

function updateCamera(dt) {
  const cameraRotation = new THREE.Euler(state.cameraPitch, state.cameraYaw, 0, "YXZ");
  const cameraQuaternion = new THREE.Quaternion().setFromEuler(cameraRotation);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraQuaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraQuaternion);
  const shoulderOffset = new THREE.Vector3(2.6, 3.1, 7.2).applyQuaternion(cameraQuaternion);
  const targetPosition = character.root.position.clone().add(shoulderOffset);
  camera.position.lerp(targetPosition, 1 - Math.exp(-dt * 4));

  const lookTarget = character.root.position
    .clone()
    .addScaledVector(forward, 3.4)
    .addScaledVector(right, 0.7);
  lookTarget.y += 2.2;
  camera.lookAt(lookTarget);
}

function updateCountdown(dt) {
  if (!state.gameStarted || state.roundActive || state.gameOver) return;

  state.countdownTimer += dt;

  const nextValue =
    state.countdownTimer < 1 ? 3 :
    state.countdownTimer < 2 ? 2 :
    state.countdownTimer < 3 ? 1 :
    state.countdownTimer < 3.8 ? "GO" : null;

  if (nextValue !== null) {
    if (countdownEl) {
      countdownEl.hidden = false;
      countdownEl.textContent = String(nextValue);
    }
    updateLockStatus(nextValue === "GO" ? "Fight!" : `Round starts in... ${nextValue}`);
  } else {
    state.roundActive = true;
    if (countdownEl) countdownEl.hidden = true;
    updateLockStatus("Camera: Hold click and drag to look");
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;

  if (!state.paused) {
    updateCountdown(dt);
  }
  if (state.gameStarted && state.roundActive && !state.gameOver && !state.paused) {
    updateCharacter(dt, elapsed);
    updateCpu(dt, elapsed);
    updateDummies(dt);
    updateDirtBursts(dt);
    updateFireballs(dt);
    updateThunderBursts(dt);
  }
  if (state.gameStarted && !state.gameOver) {
    updateCamera(dt);
  }
  updateCrosshair();
  updateHealthBars();
  updateEnemyHud();

  renderer.render(scene, camera);
}

animate();
