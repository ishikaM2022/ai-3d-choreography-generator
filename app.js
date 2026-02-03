const form = document.getElementById("choreo-form");
const statusPill = document.getElementById("status-pill");
const formationNotes = document.getElementById("formation-notes");
const choreoSteps = document.getElementById("choreo-steps");
const beatGrid = document.getElementById("beat-grid");
const stageGrid = document.getElementById("stage-grid");
const stageMeta = document.getElementById("stage-meta");
const previewCanvas = document.getElementById("preview-canvas");
const stagePlaceholder = document.getElementById("stage-placeholder");
const playButton = document.getElementById("preview-play");
const pauseButton = document.getElementById("preview-pause");
const exportButton = document.getElementById("export-video");
const loadDemoButton = document.getElementById("load-demo");
const resetButton = document.getElementById("reset-form");

let previewIndex = 0;
let previewScenes = [];
let previewAnimId = null;
let previewStartTime = 0;
const sceneDurationMs = 1200;
const canvasContext = previewCanvas.getContext("2d");

const moveLibrary = {
  "Hip-hop": ["Groove bounce", "Chest hit", "Wave ripple", "Slide step"],
  "K-pop": ["Sharp arm line", "Formation snap", "Signature pose", "Traveling step"],
  Contemporary: ["Release sweep", "Spiral turn", "Floor reach", "Suspended hold"],
  Afrobeat: ["Bounce groove", "Shoulder roll", "Footwork shuffle", "Call & response"],
  Bollywood: ["Hand mudra", "Hip sway", "Spin accent", "Jump accent"],
  House: ["Jack groove", "Skate step", "Heel-toe", "Looper swing"],
};

const templateNotes = ({
  style,
  formation,
  dancers,
  center,
  background,
  energy,
  format,
  preview,
}) => [
  `Style library: ${style} — emphasize signature grooves and footwork motifs.`,
  `Formation: ${formation} with ${dancers} dancers total.`,
  `Blocking: ${center} center lead(s), ${background} background supporting lines.`,
  `Energy curve target: ${energy}/10 with rising intensity in the chorus.`,
  `Teaching format: ${format} with clear cueing on every 8-count.`,
  `Preview mode: ${preview} for safe spacing checks.`,
  "Teachability: keep 8-count phrases and clear directional cues.",
];

const setStatus = (state) => {
  statusPill.textContent = state;
};

const seedFromText = (text) =>
  text.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

const seededRandom = (seed) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const renderNotes = (notes) => {
  formationNotes.innerHTML = "";
  notes.forEach((note) => {
    const li = document.createElement("li");
    li.textContent = note;
    formationNotes.appendChild(li);
  });
};

const renderBeatGrid = (beats) => {
  beatGrid.innerHTML = "";
  beats.forEach((beat) => {
    const span = document.createElement("span");
    span.className = `beat ${beat.accent ? "accent" : ""}`;
    beatGrid.appendChild(span);
  });
};

const renderChoreoSteps = (steps) => {
  choreoSteps.innerHTML = "";
  steps.forEach((step) => {
    const li = document.createElement("li");
    li.textContent = step;
    choreoSteps.appendChild(li);
  });
};

const resizeCanvas = () => {
  const rect = stageGrid.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvasContext.setTransform(1, 0, 0, 1, 0, 0);
  previewCanvas.width = rect.width * ratio;
  previewCanvas.height = rect.height * ratio;
  canvasContext.scale(ratio, ratio);
};

const drawStage = (positions) => {
  const rect = stageGrid.getBoundingClientRect();
  canvasContext.clearRect(0, 0, rect.width, rect.height);
  positions.forEach((pos) => {
    const x = (pos.x / 100) * rect.width;
    const y = (pos.y / 100) * rect.height;
    canvasContext.beginPath();
    canvasContext.fillStyle = pos.role === "center" ? "rgba(255,159,124,0.9)" : "rgba(124,92,255,0.9)";
    canvasContext.shadowColor =
      pos.role === "center" ? "rgba(255,159,124,0.7)" : "rgba(124,92,255,0.6)";
    canvasContext.shadowBlur = 12;
    canvasContext.arc(x, y, 7, 0, Math.PI * 2);
    canvasContext.fill();
  });
};

const interpolatePositions = (from, to, progress) =>
  from.map((pos, index) => {
    const target = to[index] || pos;
    return {
      ...pos,
      x: pos.x + (target.x - pos.x) * progress,
      y: pos.y + (target.y - pos.y) * progress,
    };
  });

const generateFormationPositions = (count, centerCount, formation, rng) => {
  const positions = [];
  const center = { x: 50, y: 45 };
  const radius = 32;
  const backgroundCount = Math.max(count - centerCount, 0);
  const layoutBoost = formation === "Center + background" ? 1.1 : 1;

  for (let i = 0; i < centerCount; i += 1) {
    positions.push({
      x: center.x + (i - (centerCount - 1) / 2) * 6,
      y: center.y + (i % 2) * 4,
      role: "center",
    });
  }

  for (let i = 0; i < backgroundCount; i += 1) {
    const angle = (Math.PI * 2 * i) / Math.max(backgroundCount, 1);
    const jitter = (rng() - 0.5) * 6;
    const ringScale = formation === "Crew (symmetric)" ? 0.8 : 1;
    positions.push({
      x: center.x + Math.cos(angle) * radius * ringScale * layoutBoost + jitter,
      y: center.y + Math.sin(angle) * radius * ringScale * layoutBoost + jitter,
      role: "background",
    });
  }

  return positions;
};

const generateScenes = (sections, formation, dancers, centerCount, rng) => {
  return sections.map((section, index) => {
    const shift = (index % 2) * 6;
    const positions = generateFormationPositions(
      dancers,
      centerCount,
      formation,
      rng
    ).map((pos) => ({
      ...pos,
      x: Math.min(Math.max(pos.x + shift * (rng() - 0.5), 10), 90),
      y: Math.min(Math.max(pos.y + shift * (rng() - 0.5), 10), 90),
    }));
    return {
      name: section.name,
      counts: section.counts,
      positions,
    };
  });
};

const generateChoreoSteps = (sections, style, rng) => {
  const library = moveLibrary[style] || moveLibrary["Hip-hop"];
  return sections.flatMap((section) => {
    const steps = [];
    for (let count = 1; count <= section.counts; count += 8) {
      const move = library[Math.floor(rng() * library.length)];
      steps.push(`${section.name} ${count}-${count + 7}: ${move}.`);
    }
    return steps;
  });
};

const renderTimeline = (sections) => {
  const total = sections.reduce((sum, section) => sum + section.counts, 0);
  const timelineRows = document.querySelectorAll(".timeline-row");
  timelineRows.forEach((row, index) => {
    const fill = row.querySelector(".fill");
    const section = sections[index];
    if (!section || !fill) return;
    fill.style.width = `${Math.round((section.counts / total) * 100)}%`;
  });
};

const startPreview = () => {
  if (!previewScenes.length) return;
  if (previewAnimId) return;
  previewStartTime = performance.now();
  stagePlaceholder.style.display = "none";

  const tick = (timestamp) => {
    const elapsed = timestamp - previewStartTime;
    const totalDuration = previewScenes.length * sceneDurationMs;
    const timeInCycle = elapsed % totalDuration;
    const sceneIndex = Math.floor(timeInCycle / sceneDurationMs);
    const sceneProgress = (timeInCycle % sceneDurationMs) / sceneDurationMs;
    const currentScene = previewScenes[sceneIndex];
    const nextScene = previewScenes[(sceneIndex + 1) % previewScenes.length];
    const blended = interpolatePositions(
      currentScene.positions,
      nextScene.positions,
      sceneProgress
    );
    drawStage(blended);
    stageMeta.textContent = `${currentScene.name}: ${currentScene.counts} counts`;
    previewAnimId = requestAnimationFrame(tick);
  };

  previewAnimId = requestAnimationFrame(tick);
};

const stopPreview = () => {
  if (previewAnimId) {
    cancelAnimationFrame(previewAnimId);
  }
  previewAnimId = null;
};

const handleExport = () => {
  if (!previewScenes.length) {
    stageMeta.textContent = "Generate a choreography before exporting.";
    return;
  }
  if (!previewCanvas.captureStream || typeof MediaRecorder === "undefined") {
    stageMeta.textContent = "Video export is not supported in this browser.";
    return;
  }

  stageMeta.textContent = "Rendering preview video...";
  stopPreview();
  startPreview();

  const stream = previewCanvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  const chunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "choreography-preview.webm";
    link.click();
    URL.revokeObjectURL(url);
    stageMeta.textContent = "Export ready! Downloading preview video.";
  };

  recorder.start();
  setTimeout(() => recorder.stop(), previewScenes.length * sceneDurationMs);
};

const updateOutput = () => {
  stopPreview();
  const style = document.getElementById("style-select").selectedOptions[0].textContent;
  const formation = document.getElementById("formation-select").selectedOptions[0].textContent;
  const dancers = Number(document.getElementById("dancer-count").value);
  const center = Number(document.getElementById("center-count").value);
  const background = Number(document.getElementById("background-count").value);
  const energy = document.getElementById("energy-range").value;
  const format = document.getElementById("format-select").selectedOptions[0].textContent;
  const preview = document.getElementById("preview-select").selectedOptions[0].textContent;
  const notes = document.getElementById("notes").value;

  renderNotes(
    templateNotes({
      style,
      formation,
      dancers,
      center,
      background,
      energy,
      format,
      preview,
    })
  );
  const seed = seedFromText(`${style}-${formation}-${notes}-${dancers}`);
  const rng = seededRandom(seed);
  const sections = [
    { name: "Intro", counts: 8 },
    { name: "Verse A", counts: 16 },
    { name: "Chorus", counts: 16 },
    { name: "Bridge", counts: 8 },
    { name: "Finale", counts: 16 },
  ];
  const beatCount = sections.reduce((sum, section) => sum + section.counts, 0);
  const beats = Array.from({ length: beatCount }, (_, index) => ({
    accent: index % 8 === 0 || index % 8 === 4,
  }));
  renderBeatGrid(beats);
  renderTimeline(sections);

  const stepList = generateChoreoSteps(sections, style, rng);
  renderChoreoSteps(stepList);

  previewScenes = generateScenes(sections, formation, dancers, center, rng);
  previewIndex = 0;
  if (previewScenes.length) {
    resizeCanvas();
    drawStage(previewScenes[0].positions);
    stagePlaceholder.style.display = "none";
    stageMeta.textContent = `${previewScenes[0].name}: ${previewScenes[0].counts} counts`;
  }
  stageGrid.classList.remove("is-empty");
  setStatus("Brief processed");
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  updateOutput();
});

loadDemoButton.addEventListener("click", () => {
  document.getElementById("style-select").value = "kpop";
  document.getElementById("formation-select").value = "center-background";
  document.getElementById("format-select").value = "counts";
  document.getElementById("dancer-count").value = 31;
  document.getElementById("center-count").value = 1;
  document.getElementById("background-count").value = 30;
  document.getElementById("preview-select").value = "both";
  document.getElementById("energy-range").value = 9;
  document.getElementById("notes").value =
    "Build a powerful hook in the chorus, spotlight the center dancer, and use ripple effects on every 8 counts.";
  updateOutput();
});

resetButton.addEventListener("click", () => {
  form.reset();
  stopPreview();
  formationNotes.innerHTML = "<li>Select a brief to preview spatial planning.</li>";
  choreoSteps.innerHTML = "<li>Generate a brief to see the choreography steps.</li>";
  beatGrid.innerHTML = "<span class=\"beat-placeholder\">Awaiting beat analysis.</span>";
  stagePlaceholder.style.display = "grid";
  canvasContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  stageMeta.textContent = "Waiting for choreography.";
  setStatus("Awaiting brief");
});

playButton.addEventListener("click", startPreview);
pauseButton.addEventListener("click", stopPreview);
exportButton.addEventListener("click", handleExport);

window.addEventListener("resize", () => {
  if (!previewScenes.length) return;
  resizeCanvas();
  drawStage(previewScenes[previewIndex]?.positions || previewScenes[0].positions);
});
