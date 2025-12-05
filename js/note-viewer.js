// js/note-viewer.js

// ---------------- BASIC GUARDS (best-effort only) ----------------

// Disable right-click
document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

// Block common shortcuts: zoom, save, print, devtools, printscreen
document.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();

  // Block Ctrl + (+, -, 0) for zoom
  if (e.ctrlKey && (key === "+" || key === "=" || key === "-" || key === "0")) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  // Ctrl+S / Ctrl+P / Ctrl+U
  if (e.ctrlKey && (key === "s" || key === "p" || key === "u")) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  // Ctrl+Shift+I or F12
  if ((e.ctrlKey && e.shiftKey && key === "i") || key === "f12") {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  // Some browsers expose PrintScreen as "PrintScreen"
  if (key === "printscreen") {
    e.preventDefault();
    e.stopPropagation();
  }
});

// ---------------- CONFIG FROM server.js ----------------

if (!window.SERVER_URL) {
  alert("SERVER_URL missing — load js/server.js before note-viewer.js");
  throw new Error("SERVER_URL missing");
}

const ROOT_URL = window.SERVER_URL.replace(/\/+$/, "");
const API_BASE = ROOT_URL + "/api";

// PDF.js worker config (using same CDN version)
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
} else {
  console.error("[viewer] pdfjsLib missing. Check PDF.js script tag.");
}

// ---------------- HELPERS ----------------

function getNoteIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function setStatus(message, isError = false) {
  const el = document.getElementById("statusMsg");
  if (!el) return;
  el.textContent = message || "";
  el.classList.toggle("error-msg", !!isError);
  el.style.display = message ? "block" : "none";
}

// ---------------- PDF LOADING ----------------

async function loadNotePdf() {
  const noteId = getNoteIdFromQuery();
  if (!noteId) {
    setStatus("Missing note id in URL.", true);
    return;
  }

  // Use the same token as the rest of your site
  const token =
    localStorage.getItem("gonotes_token") || localStorage.getItem("gn_token");

  if (!token) {
    setStatus("Please log in again to view this note.", true);
    setTimeout(() => {
      window.location.href = "/pages/login.html";
    }, 1200);
    return;
  }

  if (!window.pdfjsLib) {
    setStatus("PDF engine missing.", true);
    return;
  }

  setStatus("Loading note…");

  try {
    // ⭐ IMPORTANT: use the SECURE backend route that checks purchasedNotes
    const res = await fetch(
      `${API_BASE}/notes/view/${encodeURIComponent(noteId)}`,
      {
        headers: {
          Authorization: "Bearer " + token,
        },
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[viewer] file error:", res.status, text);
      setStatus("Unable to load this note. Please try again later.", true);
      return;
    }

    const blob = await res.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const container = document.getElementById("pdfContainer");
    container.innerHTML = "";

    // Render each page; scale so that page is taller than viewport
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      // base viewport at scale 1
      const baseViewport = page.getViewport({ scale: 1.0 });

      // target: 120% of current window height, so it always needs scroll
      const targetHeight = window.innerHeight * 1.2;
      const scale = targetHeight / baseViewport.height;

      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const wrapper = document.createElement("div");
      wrapper.className = "pdf-page";
      wrapper.appendChild(canvas);
      container.appendChild(wrapper);

      await page
        .render({
          canvasContext: ctx,
          viewport,
        })
        .promise;
    }

    setStatus(""); // hide loading text
  } catch (err) {
    console.error("[viewer] fetch/render error:", err);
    setStatus("Error loading note. Please try again later.", true);
  }
}

// ---------------- STOPWATCH ----------------

let timerInterval = null;
let elapsedSeconds = 0;

function formatTime(sec) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function updateTimerDisplay() {
  const el = document.getElementById("timerDisplay");
  if (el) el.textContent = formatTime(elapsedSeconds);
}

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer() {
  if (!timerInterval) return;
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  pauseTimer();
  elapsedSeconds = 0;
  updateTimerDisplay();
}

function initTimerUI() {
  const startPauseBtn = document.getElementById("startPauseBtn");
  const resetBtn = document.getElementById("resetBtn");

  if (!startPauseBtn || !resetBtn) return;

  startPauseBtn.addEventListener("click", () => {
    if (timerInterval) {
      pauseTimer();
      startPauseBtn.textContent = "Start";
    } else {
      startTimer();
      startPauseBtn.textContent = "Pause";
    }
  });

  resetBtn.addEventListener("click", () => {
    resetTimer();
    startPauseBtn.textContent = "Start";
  });

  updateTimerDisplay();
}

// ---------------- INIT ----------------

document.addEventListener("DOMContentLoaded", () => {
  initTimerUI();
  loadNotePdf();
});
