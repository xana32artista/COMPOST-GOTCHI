/* ==========================================================================
   Compost-gotchi v2 — Motor de Simulación, XP, Minijuegos & UI Modular
   ========================================================================== */

/* ==========================================================================
   1. CONFIG — Constantes y Datos de Referencia
   ========================================================================== */
const CONFIG = {
  SPEEDS: {
    1: 5000, // 1x = 5s / día
    2: 2500, // 2x = 2.5s / día
    5: 1000  // 5x = 1s / día
  },
  LEVELS: [
    { tier: 0, name: "Novato", minXP: 0, icon: "🌱" },
    { tier: 1, name: "Aprendiz", minXP: 100, icon: "🌿" },
    { tier: 2, name: "Jardinero", minXP: 300, icon: "🌳" },
    { tier: 3, name: "Compostador", minXP: 600, icon: "🏆" },
    { tier: 4, name: "Experto Compostador", minXP: 1000, icon: "👑" }
  ],
  CLIMATES: {
    dry: { label: "☀️ Árida", evapMultiplier: 1.5, baseAmbient: 26 },
    temperate: { label: "⛅ Templada", evapMultiplier: 1.0, baseAmbient: 20 },
    humid: { label: "🌧️ Tropical", evapMultiplier: 0.6, baseAmbient: 24 }
  },
  METHODS: {
    heap: { label: "🪵 Pila Tradicional", maxTemp: 65, heatBonus: 1.4, retainMoist: 1.0 },
    vermi: { label: "🪱 Vermicompostera", maxTemp: 30, heatBonus: 0.5, retainMoist: 1.1 },
    tumbler: { label: "🔄 Giratoria", maxTemp: 68, heatBonus: 1.3, retainMoist: 1.25 }
  },
  WASTE_ITEMS: [
    { id: "apple", name: "Cáscara de Manzana", category: "compost", emoji: "🍎" },
    { id: "banana", name: "Piel de Plátano", category: "compost", emoji: "🍌" },
    { id: "coffee", name: "Posos de Café", category: "compost", emoji: "☕" },
    { id: "leaf", name: "Hojas Secas", category: "compost", emoji: "🍂" },
    { id: "plastic", name: "Botella PET", category: "recycle", emoji: "🥤" },
    { id: "can", name: "Lata de Aluminio", category: "recycle", emoji: "🥫" },
    { id: "paper", name: "Periódico Limpio", category: "compost", emoji: "📰" },
    { id: "meat", name: "Resto de Carne", category: "trash", emoji: "🥩" },
    { id: "battery", name: "Pila Usada", category: "trash", emoji: "🔋" }
  ],
  EMERGENCIES: [
    {
      title: "⚠️ ¡Olor a Huevo Podrido!",
      desc: "La compostera emite un fuerte olor sulfuroso y se siente apelmazada.",
      options: [
        { text: "Regar con abundante agua", correct: false, msg: "¡Error! El exceso de agua empeora las condiciones anaeróbicas." },
        { text: "Voltear a fondo y agregar material marrón (hojas/cartón)", correct: true, msg: "¡Correcto! Oxigenar y absorber humedad restaura las bacterias aeróbicas." },
        { text: "Tapar herméticamente el contenedor", correct: false, msg: "¡Error! Taparla asfixia aún más a los microorganismos." }
      ]
    },
    {
      title: "⚠️ ¡Pila completamente seca y fría!",
      desc: "El material no se descompone y parece polvo seco.",
      options: [
        { text: "Añadir agua y restos verdes frescos (nitrógeno)", correct: true, msg: "¡Exacto! Humedad + Nitrógeno reactivan el metabolismo bacteriano." },
        { text: "Añadir más aserrín y ramas secas", correct: false, msg: "¡Error! Más carbono seco detiene del todo la descomposición." },
        { text: "Dejar al sol sin tocar por una semana", correct: false, msg: "¡Error! Se secará aún más." }
      ]
    },
    {
      title: "⚠️ ¡Invasión de Moscas de la Fruta!",
      desc: "Hay muchas mosquitas volando sobre los restos de cocina recién puestos.",
      options: [
        { text: "Cubrir los restos verdes con una capa de hojas secas o tierra", correct: true, msg: "¡Correcto! Sellar con una capa marrón evita plagas y olores." },
        { text: "Aplicar insecticida químico en spray", correct: false, msg: "¡Peligro! Matarás las bacterias beneficiosas y contaminarás el compost." },
        { text: "Añadir más fruta madura encima", correct: false, msg: "¡Error! Atraerás el doble de insectos." }
      ]
    }
  ]
};

/* ==========================================================================
   2. STATE — Estado Global del Juego
   ========================================================================== */
const defaultState = {
  active: false,
  paused: false,
  speed: 1,
  day: 1,
  name: "Wormy",
  climate: "temperate",
  method: "heap",
  // Métricas 0-100
  moisture: 50,
  oxygen: 100,
  cnBalance: 50, // 50 = balance perfecto (30:1)
  temperature: 20,
  ecosystemHealth: 100,
  decompositionProgress: 0,
  phase: "Mesófila Inicial",
  // XP & Nivel
  xp: 0,
  level: 0,
  // Específicos
  wormsAdded: false,
  wrongItemPresent: false,
  // Estadísticas para Logros
  stats: {
    totalFeeds: 0,
    perfectCnDays: 0,
    perfectWormDays: 0,
    minigamesWon: 0,
    noSmellDays: 0
  },
  achievements: {
    firstCompost: false,
    carbonMaster: false,
    wormTamer: false,
    noSmell: false,
    hotPile: false,
    recycler: false,
    minigamePro: false,
    expert: false
  },
  logs: []
};

let state = JSON.parse(JSON.stringify(defaultState));
let simTimer = null;
let currentMinigameType = null;

/* ==========================================================================
   3. SONIDOS — Síntesis Web Audio API
   ========================================================================== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  try {
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === "click" || type === "feed") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (type === "turn") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.26);
    } else if (type === "alert") {
      osc.type = "square";
      osc.frequency.setValueAtTime(300, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === "success" || type === "xp") {
      osc.type = "sine";
      const notes = [329.63, 392.0, 523.25];
      notes.forEach((f, idx) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g);
        g.connect(audioCtx.destination);
        o.frequency.setValueAtTime(f, now + idx * 0.08);
        g.gain.setValueAtTime(0.12, now + idx * 0.08);
        g.gain.linearRampToValueAtTime(0.01, now + idx * 0.08 + 0.15);
        o.start(now + idx * 0.08);
        o.stop(now + idx * 0.08 + 0.16);
      });
    }
  } catch (e) {
    // Web Audio no disponible o bloqueado por el navegador
  }
}

/* ==========================================================================
   4. INICIO Y BOOTSTRAP — Event Listeners
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  STORAGE.load();
});

function setupEventListeners() {
  // Configuración inicial (Radio Cards UI)
  document.querySelectorAll(".radio-card").forEach(card => {
    card.addEventListener("click", () => {
      const input = card.querySelector("input");
      const name = input.name;
      document.querySelectorAll(`.radio-card:has(input[name="${name}"])`).forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      input.checked = true;
    });
  });

  // Submit de pantalla inicial
  document.getElementById("setup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    startNewGame();
  });

  // Botones de velocidad
  document.getElementById("btn-speed-pause").addEventListener("click", () => SIMULATION.setSpeed("pause"));
  document.getElementById("btn-speed-1x").addEventListener("click", () => SIMULATION.setSpeed(1));
  document.getElementById("btn-speed-2x").addEventListener("click", () => SIMULATION.setSpeed(2));
  document.getElementById("btn-speed-5x").addEventListener("click", () => SIMULATION.setSpeed(5));

  // Botones de Acción
  document.getElementById("btn-add-green").addEventListener("click", () => ACTIONS.feedGreen());
  document.getElementById("btn-add-brown").addEventListener("click", () => ACTIONS.feedBrown());
  document.getElementById("btn-add-water").addEventListener("click", () => ACTIONS.water());
  document.getElementById("btn-turn").addEventListener("click", () => ACTIONS.turn());
  document.getElementById("btn-add-worms").addEventListener("click", () => ACTIONS.addWorms());
  document.getElementById("btn-remove-wrong").addEventListener("click", () => ACTIONS.removeWrongItem());

  // Limpiar Diario
  document.getElementById("btn-clear-log").addEventListener("click", () => {
    document.getElementById("game-log").innerHTML = "";
    UI.log("Diario limpiado.", "log-system");
  });

  // Sidebars
  document.getElementById("btn-guide-toggle").addEventListener("click", () => UI.toggleSidebar("guide-sidebar", true));
  document.getElementById("btn-close-guide").addEventListener("click", () => UI.toggleSidebar("guide-sidebar", false));
  document.getElementById("btn-achievements-toggle").addEventListener("click", () => {
    ACHIEVEMENTS.render();
    UI.toggleSidebar("achievements-sidebar", true);
  });
  document.getElementById("btn-close-achievements").addEventListener("click", () => UI.toggleSidebar("achievements-sidebar", false));
  document.getElementById("sidebar-overlay").addEventListener("click", () => {
    UI.toggleSidebar("guide-sidebar", false);
    UI.toggleSidebar("achievements-sidebar", false);
  });

  // Botón Reset
  document.getElementById("btn-reset-game").addEventListener("click", () => {
    if (confirm("¿Reiniciar partida? Se restablecerán las estadísticas actuales.")) {
      SIMULATION.stop();
      STORAGE.clear();
      state = JSON.parse(JSON.stringify(defaultState));
      document.getElementById("screen-game").classList.remove("visible");
      document.getElementById("screen-setup").classList.add("visible");
      document.getElementById("xp-section").classList.add("hidden");
    }
  });

  // Modales
  document.getElementById("btn-victory-ok").addEventListener("click", () => {
    document.getElementById("victory-modal").classList.remove("visible");
    state.decompositionProgress = 0;
    state.day = 1;
    state.phase = "Mesófila Inicial";
    UI.log("🌱 Nuevo ciclo de compostaje iniciado. ¡A por otra cosecha!", "log-system");
    SIMULATION.start();
    UI.update();
  });

  document.getElementById("btn-levelup-ok").addEventListener("click", () => {
    document.getElementById("levelup-modal").classList.remove("visible");
  });

  // Minijuegos Trigger & Modal
  document.getElementById("btn-play-minigame").addEventListener("click", () => MINIGAMES.open());
  document.getElementById("btn-close-minigame").addEventListener("click", () => MINIGAMES.close());
  document.getElementById("btn-mg-done").addEventListener("click", () => MINIGAMES.close());
}

function startNewGame() {
  state.name = document.getElementById("pile-name").value.trim() || "Wormy";
  state.climate = document.querySelector('input[name="climate"]:checked').value;
  state.method = document.querySelector('input[name="method"]:checked').value;
  state.active = true;
  state.paused = false;
  state.day = 1;

  // Ajustar valores iniciales por método
  if (state.method === "vermi") {
    state.moisture = 60;
    state.wormsAdded = true;
  } else {
    state.moisture = 50;
    state.wormsAdded = false;
  }

  document.getElementById("screen-setup").classList.remove("visible");
  document.getElementById("screen-game").classList.add("visible");
  document.getElementById("xp-section").classList.remove("hidden");

  UI.log(`Compostera <strong>${state.name}</strong> iniciada (${CONFIG.METHODS[state.method].label}).`, "log-system");

  SIMULATION.start();
  UI.update();
  STORAGE.save();
}

/* ==========================================================================
   5. SIMULATION — Motor Biológico
   ========================================================================== */
const SIMULATION = {
  start() {
    this.stop();
    if (!state.active || state.paused) return;
    const interval = CONFIG.SPEEDS[state.speed] || 5000;
    simTimer = setInterval(() => this.tick(), interval);
  },

  stop() {
    if (simTimer) clearInterval(simTimer);
    simTimer = null;
  },

  setSpeed(spd) {
    document.querySelectorAll(".btn-speed").forEach(b => b.classList.remove("active"));
    if (spd === "pause") {
      state.paused = true;
      document.getElementById("btn-speed-pause").classList.add("active");
      this.stop();
      UI.log("⏸️ Simulación pausada.", "log-system");
    } else {
      state.paused = false;
      state.speed = spd;
      document.getElementById(`btn-speed-${spd}x`).classList.add("active");
      this.start();
    }
    STORAGE.save();
  },

  tick() {
    if (!state.active || state.paused) return;
    state.day++;

    const clm = CONFIG.CLIMATES[state.climate];
    const mtd = CONFIG.METHODS[state.method];

    // 1. Evaporación de humedad
    let evap = 2.5 * clm.evapMultiplier;
    if (state.temperature > 35) evap += (state.temperature - 35) * 0.12;
    evap /= mtd.retainMoist;
    state.moisture = Math.max(0, Math.min(100, state.moisture - evap));

    // 2. Consumo de oxígeno
    let oxyConsume = state.temperature > 40 ? 10 : 5;
    if (state.method === "tumbler" || (state.method === "vermi" && state.wormsAdded)) oxyConsume *= 0.75;
    state.oxygen = Math.max(0, Math.min(100, state.oxygen - oxyConsume));

    // 3. Factores biológicos de eficiencia (0.1 a 1.0)
    const fMoist = (state.moisture >= 40 && state.moisture <= 65) ? 1.0 : (state.moisture >= 25 && state.moisture <= 80 ? 0.5 : 0.15);
    const fOxy = state.oxygen > 45 ? 1.0 : (state.oxygen >= 20 ? 0.45 : 0.1);
    const diffCN = Math.abs(50 - state.cnBalance);
    const fCN = diffCN <= 15 ? 1.0 : (diffCN <= 30 ? 0.6 : 0.2);

    const efficiency = fMoist * fOxy * fCN;

    // 4. Temperatura y calor
    let heatGain = efficiency * 14 * mtd.heatBonus;
    let heatLoss = (state.temperature - clm.baseAmbient) * 0.2;
    if (state.method === "tumbler") heatLoss *= 0.65; // Buen aislamiento
    state.temperature = Math.max(clm.baseAmbient - 2, Math.min(mtd.maxTemp, state.temperature + heatGain - heatLoss));

    // 5. Salud del ecosistema (Media ponderada con penalizaciones)
    let healthCalc = (fMoist * 35 + fOxy * 35 + fCN * 30);
    if (state.wrongItemPresent) healthCalc = Math.max(0, healthCalc - 35);
    state.ecosystemHealth = Math.round(healthCalc);

    // 6. Alertas pedagógicas y eventos
    if (state.oxygen < 25) {
      UI.log("⚠️ ¡Oxígeno bajo! El compost fermenta sin aire y huele mal. Voltea la pila.", "log-danger");
      playSound("alert");
    } else {
      state.stats.noSmellDays++;
    }

    // Aparición aleatoria de basura o minijuego
    if (!state.wrongItemPresent && Math.random() < 0.12 && state.day > 2) {
      state.wrongItemPresent = true;
      UI.log("🚫 ¡Alerta! Cayó un residuo no compostable (plástico/metal). Retíralo en Acciones.", "log-danger");
      playSound("alert");
    }

    if (state.day % 7 === 0 || (state.day === 3 && state.stats.minigamesWon === 0)) {
      MINIGAMES.triggerNotification();
    }

    // 7. Progreso de Maduración y Fases
    let dailyProg = efficiency * 2.8;
    if (state.method === "heap" && state.temperature >= 50) dailyProg *= 1.4; // Fase termófila acelera

    if (state.decompositionProgress < 35) {
      state.phase = "Mesófila Inicial";
    } else if (state.decompositionProgress < 75) {
      state.phase = state.temperature >= 45 ? "Termófila (Calor Pico)" : "Mesófila Activa";
    } else {
      state.phase = "Maduración Final";
    }

    state.decompositionProgress = Math.min(100, state.decompositionProgress + dailyProg);

    // 8. Recompensas XP por buen mantenimiento diario
    if (efficiency >= 0.8 && !state.wrongItemPresent) {
      XP_SYSTEM.addXP(4, false);
    }

    // 9. Verificar Victoria y Logros
    ACHIEVEMENTS.check();
    if (state.decompositionProgress >= 100) {
      this.triggerVictory();
    }

    UI.update();
    STORAGE.save();
  },

  triggerVictory() {
    this.stop();
    state.achievements.firstCompost = true;
    XP_SYSTEM.addXP(60, true);
    document.getElementById("victory-name").textContent = state.name;
    document.getElementById("victory-days").textContent = state.day;
    document.getElementById("victory-method").textContent = CONFIG.METHODS[state.method].label;
    document.getElementById("victory-xp").textContent = "+60 XP";
    document.getElementById("victory-modal").classList.add("visible");
    playSound("success");
  }
};

/* ==========================================================================
   6. ACTIONS — Interacciones del Usuario
   ========================================================================== */
const ACTIONS = {
  feedGreen() {
    if (!state.active || state.paused) return;
    state.moisture = Math.min(100, state.moisture + 12);
    state.oxygen = Math.max(0, state.oxygen - 10);
    state.cnBalance = Math.max(0, state.cnBalance - 14); // Hacia Nitrógeno
    state.stats.totalFeeds++;
    playSound("feed");
    UI.log("🍏 Añadiste restos verdes (+N, +Humedad).", "log-green");
    UI.update();
    STORAGE.save();
  },

  feedBrown() {
    if (!state.active || state.paused) return;
    state.moisture = Math.max(0, state.moisture - 8);
    state.oxygen = Math.min(100, state.oxygen + 12);
    state.cnBalance = Math.min(100, state.cnBalance + 14); // Hacia Carbono
    state.stats.totalFeeds++;
    playSound("feed");
    UI.log("🍂 Añadiste hojas/cartón (+C, +Oxígeno, absorbe humedad).", "log-brown");
    UI.update();
    STORAGE.save();
  },

  water() {
    if (!state.active || state.paused) return;
    state.moisture = Math.min(100, state.moisture + 20);
    playSound("feed");
    UI.log("💧 Regaste la compostera (+20% Humedad).", "log-water");
    UI.update();
    STORAGE.save();
  },

  turn() {
    if (!state.active || state.paused) return;
    state.oxygen = 100;
    if (state.temperature > 58) state.temperature -= 6; // Ventilación disipa exceso
    playSound("turn");
    UI.log("🔄 Volteaste la mezcla. Oxígeno recargado al 100%.", "log-turn");
    UI.update();
    STORAGE.save();
  },

  addWorms() {
    if (!state.active || state.paused || state.method !== "vermi") return;
    state.wormsAdded = true;
    playSound("feed");
    UI.log("🪱 Añadiste lombrices rojas californianas.", "log-green");
    UI.update();
    STORAGE.save();
  },

  removeWrongItem() {
    if (!state.active || state.paused || !state.wrongItemPresent) return;
    state.wrongItemPresent = false;
    XP_SYSTEM.addXP(15, true);
    playSound("success");
    UI.log("♻️ Retiraste el residuo no compostable (+15 XP).", "log-xp");
    UI.update();
    STORAGE.save();
  }
};

/* ==========================================================================
   7. XP_SYSTEM — Sistema de Experiencia y Niveles
   ========================================================================== */
const XP_SYSTEM = {
  addXP(amount, showLog = true) {
    state.xp += amount;
    if (showLog) UI.log(`✨ Ganaste +${amount} XP.`, "log-xp");
    this.checkLevelUp();
    UI.updateXPBar();
  },

  checkLevelUp() {
    let newLvl = 0;
    for (let i = CONFIG.LEVELS.length - 1; i >= 0; i--) {
      if (state.xp >= CONFIG.LEVELS[i].minXP) {
        newLvl = i;
        break;
      }
    }
    if (newLvl > state.level) {
      state.level = newLvl;
      if (newLvl === 4) state.achievements.expert = true;
      this.triggerLevelUpModal(CONFIG.LEVELS[newLvl]);
    }
  },

  triggerLevelUpModal(levelObj) {
    document.getElementById("levelup-emoji").textContent = `🎉 ${levelObj.icon}`;
    document.getElementById("levelup-title").textContent = levelObj.name;
    document.getElementById("levelup-modal").classList.add("visible");
    playSound("success");
  }
};

/* ==========================================================================
   8. MASCOT — Renderizado Reactivo del SVG
   ========================================================================== */
const MASCOT = {
  update() {
    const mouth = document.getElementById("svg-mouth");
    const steam = document.getElementById("svg-steam");
    const stink = document.getElementById("svg-stink");
    const cracks = document.getElementById("svg-cracks");
    const wet = document.getElementById("svg-wet");
    const wetGlow = document.getElementById("svg-wet-glow");
    const worm = document.getElementById("svg-worm");
    const sweat = document.getElementById("svg-sweat");
    const wrong = document.getElementById("svg-wrong-item");
    const alertBubble = document.getElementById("alert-bubble");
    const statusText = document.getElementById("pile-status-text");

    // Humo / vapor
    steam.style.opacity = state.temperature > 45 ? Math.min(1, (state.temperature - 45) / 15) : 0;
    // Nube de olor
    stink.style.opacity = state.oxygen < 30 ? 0.85 : 0;
    // Sequedad
    cracks.style.opacity = state.moisture < 35 ? Math.min(1, (35 - state.moisture) / 25) : 0;
    // Exceso humedad
    wet.style.opacity = state.moisture > 68 ? Math.min(0.85, (state.moisture - 68) / 25) : 0;
    wetGlow.style.opacity = wet.style.opacity;
    // Sudor por calor extremo
    sweat.style.opacity = state.temperature > 55 ? 1 : 0;
    // Lombrices
    worm.style.opacity = (state.method === "vermi" && state.wormsAdded) ? 1 : 0;
    // Material incorrecto
    wrong.style.opacity = state.wrongItemPresent ? 1 : 0;

    // Expresión facial y alertas
    if (state.wrongItemPresent) {
      mouth.setAttribute("d", "M-10,10 L10,10");
      alertBubble.innerHTML = "🚫 ¡Hay basura no compostable!";
      alertBubble.classList.remove("hidden");
      statusText.textContent = "Tu mascota se siente molesta por residuos incorrectos.";
    } else if (state.oxygen < 28) {
      mouth.setAttribute("d", "M-10,12 Q0,2 10,12"); // Triste
      alertBubble.innerHTML = "🦨 ¡Huelo a podrido!<br>Falta aire.";
      alertBubble.classList.remove("hidden");
      statusText.textContent = "¡Asfixia anaeróbica! Voltea la compostera cuanto antes.";
    } else if (state.moisture < 32) {
      mouth.setAttribute("d", "M-10,12 Q0,2 10,12");
      alertBubble.innerHTML = "🌵 ¡Mucha sed!<br>Pila seca.";
      alertBubble.classList.remove("hidden");
      statusText.textContent = "Las bacterias duermen por falta de agua.";
    } else if (state.ecosystemHealth >= 80) {
      mouth.setAttribute("d", "M-10,5 Q0,15 10,5"); // Feliz
      alertBubble.classList.add("hidden");
      statusText.textContent = "¡El ecosistema está muy saludable y activo!";
    } else {
      mouth.setAttribute("d", "M-10,8 L10,8"); // Neutral
      alertBubble.classList.add("hidden");
      statusText.textContent = "La descomposición avanza a ritmo normal.";
    }
  }
};

/* ==========================================================================
   9. MINIGAMES — Sistema de 3 Minijuegos Educativos
   ========================================================================== */
const MINIGAMES = {
  triggerNotification() {
    const section = document.getElementById("minigame-trigger-section");
    const types = ["classify", "balance", "emergency"];
    currentMinigameType = types[Math.floor(Math.random() * types.length)];
    section.style.display = "flex";
    playSound("alert");
  },

  open() {
    document.getElementById("minigame-trigger-section").style.display = "none";
    const modal = document.getElementById("minigame-modal");
    const content = document.getElementById("mg-content");
    const result = document.getElementById("mg-result");
    result.classList.add("hidden");
    content.innerHTML = "";

    if (currentMinigameType === "classify") this.renderClassify(content);
    else if (currentMinigameType === "balance") this.renderBalance(content);
    else this.renderEmergency(content);

    modal.classList.add("visible");
  },

  close() {
    document.getElementById("minigame-modal").classList.remove("visible");
  },

  finish(success, xpBonus, msgText) {
    const resBox = document.getElementById("mg-result");
    document.getElementById("mg-result-text").textContent = msgText;
    if (success) {
      XP_SYSTEM.addXP(xpBonus, true);
      state.stats.minigamesWon++;
      document.getElementById("mg-result-xp").textContent = `+${xpBonus} XP Ganados 🎉`;
      playSound("success");
    } else {
      document.getElementById("mg-result-xp").textContent = "0 XP — ¡Inténtalo de nuevo la próxima vez!";
    }
    resBox.classList.remove("hidden");
  },

  // 9.1 Clasificación de Residuos
  renderClassify(container) {
    document.getElementById("mg-title").textContent = "♻️ Clasificación de Residuos";
    document.getElementById("mg-instructions").textContent = "Toca cada elemento y selecciona su contenedor correcto (Compostable, Reciclable o Basura).";

    let selectedItem = null;
    let correctCount = 0;
    const items = [...CONFIG.WASTE_ITEMS].sort(() => Math.random() - 0.5).slice(0, 4);

    const itemsWrap = document.createElement("div");
    itemsWrap.className = "mg-classify-items";
    items.forEach(it => {
      const el = document.createElement("button");
      el.className = "mg-item";
      el.innerHTML = `${it.emoji} ${it.name}`;
      el.onclick = () => {
        itemsWrap.querySelectorAll(".mg-item").forEach(i => i.style.borderColor = "rgba(0,0,0,0.1)");
        el.style.borderColor = "var(--c-primary)";
        selectedItem = { el, data: it };
      };
      itemsWrap.appendChild(el);
    });

    const zonesWrap = document.createElement("div");
    zonesWrap.className = "mg-drop-zones";
    const zones = [
      { id: "compost", name: "🌱 Compostable" },
      { id: "recycle", name: "🥤 Reciclable" },
      { id: "trash", name: "🗑️ No Aprovechable" }
    ];

    zones.forEach(z => {
      const zBox = document.createElement("div");
      zBox.className = "mg-drop";
      zBox.innerHTML = `<span class="mg-drop-title">${z.name}</span>`;
      zBox.onclick = () => {
        if (!selectedItem) return;
        if (selectedItem.data.category === z.id) {
          selectedItem.el.remove();
          selectedItem = null;
          correctCount++;
          if (itemsWrap.children.length === 0) {
            MINIGAMES.finish(true, 25, "¡Excelente! Has clasificado todos los residuos correctamente.");
          }
        } else {
          selectedItem.el.classList.add("anim-shake");
          playSound("alert");
          setTimeout(() => selectedItem.el.classList.remove("anim-shake"), 350);
        }
      };
      zonesWrap.appendChild(zBox);
    });

    container.appendChild(itemsWrap);
    container.appendChild(zonesWrap);
  },

  // 9.2 Balance Verde/Marrón
  renderBalance(container) {
    document.getElementById("mg-title").textContent = "⚖️ Taller de Proporción C:N";
    document.getElementById("mg-instructions").textContent = "Ajusta el control deslizante para lograr la proporción ideal de 2 partes Marrón por 1 parte Verde (relación C:N de ~30:1).";

    container.innerHTML = `
      <div class="mg-balance-scenario">
        <p>¿Qué proporción de mezcla garantiza una descomposición rápida sin olores?</p>
      </div>
      <div class="mg-balance-slider-wrap">
        <span class="mg-balance-display" id="bal-val">50% Marrón / 50% Verde</span>
        <input type="range" id="mg-bal-slider" min="0" max="100" value="50">
        <div class="mg-balance-labels">
          <span>100% Verde (Húmedo)</span>
          <span>Ideal ~67% Marrón</span>
          <span>100% Marrón (Seco)</span>
        </div>
      </div>
      <button id="btn-submit-bal" class="btn btn-primary">Confirmar Proporción</button>
    `;

    const slider = container.querySelector("#mg-bal-slider");
    const display = container.querySelector("#bal-val");

    slider.oninput = () => {
      const brown = slider.value;
      const green = 100 - brown;
      display.textContent = `${brown}% Marrón / ${green}% Verde`;
    };

    container.querySelector("#btn-submit-bal").onclick = () => {
      const val = parseInt(slider.value, 10);
      if (val >= 60 && val <= 72) {
        MINIGAMES.finish(true, 20, "¡Perfecto! Un 66% de materiales marrones y 33% de verdes mantiene la relación C:N ideal en 30:1.");
      } else {
        MINIGAMES.finish(false, 0, "Proporción imperfecta. Recuerda: siempre el doble del volumen de seco/marrón que de húmedo/verde.");
      }
    };
  },

  // 9.3 Quiz de Emergencia
  renderEmergency(container) {
    const scn = CONFIG.EMERGENCIES[Math.floor(Math.random() * CONFIG.EMERGENCIES.length)];
    document.getElementById("mg-title").textContent = "🚨 Emergencia en la Compostera";
    document.getElementById("mg-instructions").textContent = "Resuelve esta situación crítica eligiendo la acción correctora adecuada:";

    container.innerHTML = `
      <div class="mg-emergency-desc"><p><strong>Situación:</strong> ${scn.desc}</p></div>
      <div class="mg-options" id="mg-options-wrap"></div>
    `;

    const wrap = container.querySelector("#mg-options-wrap");
    scn.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "mg-option";
      btn.textContent = opt.text;
      btn.onclick = () => {
        wrap.querySelectorAll(".mg-option").forEach(b => b.disabled = true);
        if (opt.correct) {
          btn.classList.add("correct");
          MINIGAMES.finish(true, 25, opt.msg);
        } else {
          btn.classList.add("wrong");
          MINIGAMES.finish(false, 0, opt.msg);
        }
      };
      wrap.appendChild(btn);
    });
  }
};

/* ==========================================================================
   10. ACHIEVEMENTS — Verificador de Logros
   ========================================================================== */
const ACHIEVEMENTS = {
  check() {
    const ach = state.achievements;
    if (!ach.carbonMaster && Math.abs(50 - state.cnBalance) <= 12) {
      state.stats.perfectCnDays++;
      if (state.stats.perfectCnDays >= 10) this.unlock("carbonMaster", "Maestro del Carbono");
    }
    if (!ach.wormTamer && state.method === "vermi" && state.ecosystemHealth >= 85) {
      state.stats.perfectWormDays++;
      if (state.stats.perfectWormDays >= 20) this.unlock("wormTamer", "Domador de Lombrices");
    }
    if (!ach.noSmell && state.stats.noSmellDays >= 15) this.unlock("noSmell", "Cero Mal Olores");
    if (!ach.hotPile && state.method === "heap" && state.temperature >= 52) this.unlock("hotPile", "Infierno Bacteriano");
    if (!ach.recycler && state.stats.totalFeeds >= 30) this.unlock("recycler", "Héroe del Reciclaje");
    if (!ach.minigamePro && state.stats.minigamesWon >= 5) this.unlock("minigamePro", "Campeón de Minijuegos");
  },

  unlock(key, title) {
    if (state.achievements[key]) return;
    state.achievements[key] = true;
    XP_SYSTEM.addXP(50, false);
    UI.log(`🏆 LOGRO DESBLOQUEADO: <strong>${title}</strong> (+50 XP)`, "log-achievement");
    playSound("success");
  },

  render() {
    const map = {
      firstCompost: "ach-first-compost",
      carbonMaster: "ach-carbon-master",
      wormTamer: "ach-worm-tamer",
      noSmell: "ach-no-smell",
      hotPile: "ach-hot-pile",
      recycler: "ach-recycler",
      minigamePro: "ach-minigame-pro",
      expert: "ach-expert"
    };
    for (let k in map) {
      const el = document.getElementById(map[k]);
      if (el) {
        if (state.achievements[k]) {
          el.classList.remove("locked");
          el.classList.add("unlocked");
        } else {
          el.classList.add("locked");
          el.classList.remove("unlocked");
        }
      }
    }
  }
};

/* ==========================================================================
   11. UI — Renderizador e Interfaz
   ========================================================================== */
const UI = {
  update() {
    // Encabezados
    document.getElementById("display-name").textContent = state.name;
    document.getElementById("display-badge").textContent = CONFIG.METHODS[state.method].label;
    document.getElementById("display-day").textContent = state.day;
    document.getElementById("display-phase").textContent = state.phase;

    // Gauges Circulares (Stroke Dashoffset = 251.33 * (1 - p/100))
    const circ = 251.33;
    this.setGauge("moisture", state.moisture, `${Math.round(state.moisture)}%`,
      state.moisture < 35 ? "⚠️ Seca" : (state.moisture > 65 ? "⚠️ Encharcada" : "Óptima"));
    
    this.setGauge("oxygen", state.oxygen, `${Math.round(state.oxygen)}%`,
      state.oxygen < 30 ? "⚠️ Asfixiada" : "Aireada");
    
    // Temp sobre 70 max
    const tempPct = Math.min(100, Math.max(0, (state.temperature / 70) * 100));
    this.setGauge("temp", tempPct, `${Math.round(state.temperature)}°C`,
      state.temperature >= 45 ? "🔥 Termófila" : "Activa");

    this.setGauge("cn", 100 - Math.abs(50 - state.cnBalance) * 2,
      state.cnBalance < 40 ? "Exceso Verde" : (state.cnBalance > 60 ? "Exceso Marrón" : "30:1 Ideal"), "Equilibrada");

    this.setGauge("health", state.ecosystemHealth, `${state.ecosystemHealth}`,
      state.ecosystemHealth >= 80 ? "Excelente" : (state.ecosystemHealth >= 50 ? "Estable" : "En Peligro"));

    // Barra maduración
    document.getElementById("stat-progress").textContent = `${Math.round(state.decompositionProgress)}%`;
    document.getElementById("bar-progress").style.width = `${state.decompositionProgress}%`;

    // Estado botones condicionales
    document.getElementById("btn-add-worms").disabled = (state.method !== "vermi" || state.wormsAdded);
    document.getElementById("btn-remove-wrong").disabled = !state.wrongItemPresent;

    this.updateXPBar();
    MASCOT.update();
  },

  setGauge(id, percent, valText, hintText) {
    const fill = document.getElementById(`gf-${id}`);
    const valEl = document.getElementById(`val-${id}`);
    const hintEl = document.getElementById(`hint-${id}`);
    if (fill) fill.style.strokeDashoffset = 251.33 * (1 - Math.max(0, Math.min(100, percent)) / 100);
    if (valEl) valEl.textContent = valText;
    if (hintEl) hintEl.textContent = hintText;
  },

  updateXPBar() {
    const lvlObj = CONFIG.LEVELS[state.level];
    const nextLvlObj = CONFIG.LEVELS[state.level + 1];
    document.getElementById("level-badge").textContent = lvlObj.icon;
    document.getElementById("level-name").textContent = lvlObj.name;
    document.getElementById("xp-current").textContent = state.xp;

    if (nextLvlObj) {
      document.getElementById("xp-next").textContent = nextLvlObj.minXP;
      const progressXP = ((state.xp - lvlObj.minXP) / (nextLvlObj.minXP - lvlObj.minXP)) * 100;
      document.getElementById("xp-bar-fill").style.width = `${Math.min(100, Math.max(0, progressXP))}%`;
    } else {
      document.getElementById("xp-next").textContent = "MÁX";
      document.getElementById("xp-bar-fill").style.width = "100%";
    }
  },

  log(msg, cls = "log-system") {
    const logBox = document.getElementById("game-log");
    const el = document.createElement("div");
    el.className = `log-entry ${cls}`;
    el.innerHTML = `<strong>Día ${state.day}:</strong> ${msg}`;
    logBox.prepend(el);
    state.logs.unshift({ day: state.day, msg, cls });
    if (state.logs.length > 35) state.logs.pop();
  },

  toggleSidebar(id, open) {
    const sb = document.getElementById(id);
    const ov = document.getElementById("sidebar-overlay");
    if (open) {
      sb.classList.add("open");
      ov.classList.add("visible");
    } else {
      sb.classList.remove("open");
      ov.classList.remove("visible");
    }
  }
};

/* ==========================================================================
   12. STORAGE — Persistencia Local
   ========================================================================== */
const STORAGE = {
  save() {
    localStorage.setItem("compostgotchi_v2_state", JSON.stringify(state));
  },

  load() {
    const raw = localStorage.getItem("compostgotchi_v2_state");
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      state = Object.assign({}, defaultState, saved);
      if (state.active) {
        document.getElementById("screen-setup").classList.remove("visible");
        document.getElementById("screen-game").classList.add("visible");
        document.getElementById("xp-section").classList.remove("hidden");
        // Restaurar historial de log
        const logBox = document.getElementById("game-log");
        logBox.innerHTML = "";
        state.logs.forEach(l => {
          const el = document.createElement("div");
          el.className = `log-entry ${l.cls}`;
          el.innerHTML = `<strong>Día ${l.day}:</strong> ${l.msg}`;
          logBox.appendChild(el);
        });
        SIMULATION.setSpeed(state.paused ? "pause" : state.speed);
        UI.update();
      }
    } catch (e) {
      this.clear();
    }
  },

  clear() {
    localStorage.removeItem("compostgotchi_v2_state");
  }
};
