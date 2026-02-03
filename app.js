const form = document.getElementById("choreo-form");
const statusPill = document.getElementById("status-pill");
const formationNotes = document.getElementById("formation-notes");
const loadDemoButton = document.getElementById("load-demo");
const resetButton = document.getElementById("reset-form");

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

const renderNotes = (notes) => {
  formationNotes.innerHTML = "";
  notes.forEach((note) => {
    const li = document.createElement("li");
    li.textContent = note;
    formationNotes.appendChild(li);
  });
};

const updateOutput = () => {
  const style = document.getElementById("style-select").selectedOptions[0].textContent;
  const formation = document.getElementById("formation-select").selectedOptions[0].textContent;
  const dancers = document.getElementById("dancer-count").value;
  const center = document.getElementById("center-count").value;
  const background = document.getElementById("background-count").value;
  const energy = document.getElementById("energy-range").value;
  const format = document.getElementById("format-select").selectedOptions[0].textContent;
  const preview = document.getElementById("preview-select").selectedOptions[0].textContent;

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
  formationNotes.innerHTML = "<li>Select a brief to preview spatial planning.</li>";
  setStatus("Awaiting brief");
});
