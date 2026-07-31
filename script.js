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

const ctx = resultCanvas.getContext("2d");

let cutoutBitmap = null;
let currentBg = { type: "transparent" };

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
  downloadBtn.disabled = true;
  resultCanvas.width = 0;
  resultCanvas.height = 0;
  cutoutBitmap = null;
  currentBg = { type: "transparent" };
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

    cutoutBitmap = await createImageBitmap(resultBlob);
    resultCanvas.width = cutoutBitmap.width;
    resultCanvas.height = cutoutBitmap.height;
    renderComposite();

    bgControls.classList.remove("hidden");
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
  if (!cutoutBitmap) return;
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

  ctx.drawImage(cutoutBitmap, 0, 0, w, h);
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
  cutoutBitmap = null;
  workspace.classList.add("hidden");
  dropZone.classList.remove("hidden");
  clearError();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.error("SW registration failed:", err));
  });
}
