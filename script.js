import { removeBackground } from "https://esm.sh/@imgly/background-removal@1.5.8";

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const pickBtn = document.getElementById("pick-btn");
const workspace = document.getElementById("workspace");
const originalImg = document.getElementById("original-img");
const resultCanvas = document.getElementById("result-canvas");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingText = document.getElementById("loading-text");
const bgControls = document.getElementById("bg-controls");
const bgSwatches = document.querySelectorAll(".bg-swatch[data-bg]");
const customColorInput = document.getElementById("custom-color");
const bgImageBtn = document.getElementById("bg-image-btn");
const bgImageInput = document.getElementById("bg-image-input");
const downloadBtn = document.getElementById("download-btn");
const resetBtn = document.getElementById("reset-btn");
const errorMessage = document.getElementById("error-message");
const retouchControls = document.getElementById("retouch-controls");
const eraseModeBtn = document.getElementById("erase-mode-btn");
const restoreModeBtn = document.getElementById("restore-mode-btn");
const brushSizeInput = document.getElementById("brush-size");
const undoRetouchBtn = document.getElementById("undo-retouch-btn");

const ctx = resultCanvas.getContext("2d");

let cutoutCanvas = null;
let originalCutoutCanvas = null;
let currentBg = { type: "transparent" };
let retouchMode = "erase";
let isDrawing = false;

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

function clearError() {
  errorMessage.classList.add("hidden");
  errorMessage.textContent = "";
}

function resetSwatchSelection(selected) {
  bgSwatches.forEach((el) => el.classList.remove("selected"));
  bgImageBtn.classList.remove("selected");
  if (selected) selected.classList.add("selected");
}

function setLoading(isLoading, text) {
  loadingOverlay.classList.toggle("hidden", !isLoading);
  if (text) loadingText.textContent = text;
}

async function handleFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    showError("画像ファイルを選択してください。");
    return;
  }
  clearError();

  const objectUrl = URL.createObjectURL(file);
  originalImg.src = objectUrl;

  dropZone.classList.add("hidden");
  workspace.classList.remove("hidden");
  bgControls.classList.add("hidden");
  retouchControls.classList.add("hidden");
  downloadBtn.disabled = true;
  resultCanvas.width = 0;
  resultCanvas.height = 0;
  cutoutCanvas = null;
  originalCutoutCanvas = null;
  currentBg = { type: "transparent" };
  setRetouchMode("erase");
  resetSwatchSelection(document.querySelector('.bg-swatch[data-bg="transparent"]'));

  setLoading(true, "モデルを準備中...");

  try {
    const resultBlob = await removeBackground(file, {
      progress: (key, current, total) => {
        if (key.startsWith("fetch")) {
          setLoading(true, `モデルをダウンロード中... ${Math.round((current / total) * 100)}%`);
        } else {
          setLoading(true, "背景を解析中...");
        }
      },
    });

    const cutoutBitmap = await createImageBitmap(resultBlob);

    cutoutCanvas = document.createElement("canvas");
    cutoutCanvas.width = cutoutBitmap.width;
    cutoutCanvas.height = cutoutBitmap.height;
    cutoutCanvas.getContext("2d").drawImage(cutoutBitmap, 0, 0);

    originalCutoutCanvas = document.createElement("canvas");
    originalCutoutCanvas.width = cutoutBitmap.width;
    originalCutoutCanvas.height = cutoutBitmap.height;
    originalCutoutCanvas.getContext("2d").drawImage(cutoutBitmap, 0, 0);

    resultCanvas.width = cutoutBitmap.width;
    resultCanvas.height = cutoutBitmap.height;
    renderComposite();

    bgControls.classList.remove("hidden");
    retouchControls.classList.remove("hidden");
    downloadBtn.disabled = false;
  } catch (err) {
    console.error(err);
    showError("背景の削除に失敗しました。別の写真でお試しください。");
  } finally {
    setLoading(false);
    URL.revokeObjectURL(objectUrl);
  }
}

function renderComposite() {
  if (!cutoutCanvas) return;
  const w = resultCanvas.width;
  const h = resultCanvas.height;
  ctx.clearRect(0, 0, w, h);

  if (currentBg.type === "color") {
    ctx.fillStyle = currentBg.value;
    ctx.fillRect(0, 0, w, h);
  } else if (currentBg.type === "image" && currentBg.bitmap) {
    const bmp = currentBg.bitmap;
    const scale = Math.max(w / bmp.width, h / bmp.height);
    const drawW = bmp.width * scale;
    const drawH = bmp.height * scale;
    ctx.drawImage(bmp, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
  }

  ctx.drawImage(cutoutCanvas, 0, 0, w, h);
}

function setRetouchMode(mode) {
  retouchMode = mode;
  eraseModeBtn.classList.toggle("selected", mode === "erase");
  restoreModeBtn.classList.toggle("selected", mode === "restore");
}

function getCanvasPoint(evt) {
  const rect = resultCanvas.getBoundingClientRect();
  const scaleX = resultCanvas.width / rect.width;
  const scaleY = resultCanvas.height / rect.height;
  return {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY,
    scale: (scaleX + scaleY) / 2,
  };
}

function applyBrush(x, y, scale) {
  if (!cutoutCanvas) return;
  const radius = Number(brushSizeInput.value) * scale;
  const cctx = cutoutCanvas.getContext("2d");

  if (retouchMode === "erase") {
    cctx.save();
    cctx.globalCompositeOperation = "destination-out";
    cctx.beginPath();
    cctx.arc(x, y, radius, 0, Math.PI * 2);
    cctx.fill();
    cctx.restore();
  } else {
    cctx.save();
    cctx.beginPath();
    cctx.arc(x, y, radius, 0, Math.PI * 2);
    cctx.clip();
    cctx.clearRect(x - radius, y - radius, radius * 2, radius * 2);
    cctx.drawImage(originalCutoutCanvas, 0, 0);
    cctx.restore();
  }

  renderComposite();
}

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  handleFile(file);
});

pickBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  handleFile(fileInput.files[0]);
});

bgSwatches.forEach((el) => {
  el.addEventListener("click", () => {
    const bg = el.dataset.bg;
    resetSwatchSelection(el);
    currentBg = bg === "transparent" ? { type: "transparent" } : { type: "color", value: bg };
    renderComposite();
  });
});

customColorInput.addEventListener("input", () => {
  resetSwatchSelection(customColorInput);
  currentBg = { type: "color", value: customColorInput.value };
  renderComposite();
});

bgImageBtn.addEventListener("click", () => bgImageInput.click());

bgImageInput.addEventListener("change", async () => {
  const file = bgImageInput.files[0];
  if (!file) return;
  const bitmap = await createImageBitmap(file);
  resetSwatchSelection(bgImageBtn);
  currentBg = { type: "image", bitmap };
  renderComposite();
});

eraseModeBtn.addEventListener("click", () => setRetouchMode("erase"));
restoreModeBtn.addEventListener("click", () => setRetouchMode("restore"));

undoRetouchBtn.addEventListener("click", () => {
  if (!cutoutCanvas || !originalCutoutCanvas) return;
  const cctx = cutoutCanvas.getContext("2d");
  cctx.clearRect(0, 0, cutoutCanvas.width, cutoutCanvas.height);
  cctx.drawImage(originalCutoutCanvas, 0, 0);
  renderComposite();
});

resultCanvas.addEventListener("pointerdown", (e) => {
  if (!cutoutCanvas) return;
  isDrawing = true;
  try {
    resultCanvas.setPointerCapture(e.pointerId);
  } catch {
    // pointer capture is best-effort; drawing still works via pointermove without it
  }
  const p = getCanvasPoint(e);
  applyBrush(p.x, p.y, p.scale);
});

resultCanvas.addEventListener("pointermove", (e) => {
  if (!isDrawing) return;
  const p = getCanvasPoint(e);
  applyBrush(p.x, p.y, p.scale);
});

resultCanvas.addEventListener("pointerup", () => {
  isDrawing = false;
});

resultCanvas.addEventListener("pointerleave", () => {
  isDrawing = false;
});

downloadBtn.addEventListener("click", () => {
  resultCanvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kiricut.png";
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
});

resetBtn.addEventListener("click", () => {
  fileInput.value = "";
  bgImageInput.value = "";
  originalImg.src = "";
  cutoutCanvas = null;
  originalCutoutCanvas = null;
  workspace.classList.add("hidden");
  dropZone.classList.remove("hidden");
  retouchControls.classList.add("hidden");
  clearError();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.error("SW registration failed:", err));
  });
}
