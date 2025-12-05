// mynotes.js

// -------------------------------------------
// 1) SERVER URL MUST COME FROM server.js (BACKEND)
// -------------------------------------------
if (!window.SERVER_URL) {
  alert("SERVER_URL missing — load js/server.js before mynotes.js");
  throw new Error("SERVER_URL missing");
}

const API_BASE = window.SERVER_URL.replace(/\/+$/, "") + "/api"; // http://localhost:5000/api
const FRONTEND_ROOT = window.location.origin;                    // http://localhost:5500


// -------------------------------------------
// 2) HELPERS
// -------------------------------------------
function formatPrice(n) {
  return Number(n || 0).toFixed(2);
}


// -------------------------------------------
// 3) Create Note Card
// -------------------------------------------
function createNoteCard(note) {
  const id = note.id || note._id;
  const department = note.department?.name || note.dept || "N/A";

  const card = document.createElement("div");
  card.className = "note-card";

  card.innerHTML = `
    <div class="note-title">${note.title || "Untitled"}</div>

    <div class="note-meta">
      Dept: ${department}<br>
      Semester: ${note.semester || note.sem || "-"}<br>
      Type: ${note.type || "notes"}
    </div>

    <div class="note-price">
      ${generatePriceHTML(note)}
    </div>

    <div class="note-actions">
      <button class="btn btn-primary read-btn">Read Note</button>
      <button class="btn btn-secondary preview-btn">Preview</button>
    </div>
  `;

  // --- READ NOTE BUTTON ---
  card.querySelector(".read-btn").onclick = () => {
    const token = localStorage.getItem("gonotes_token");
    if (!token) return alert("Please log in again.");

    // ⭐ Open viewer on the FRONTEND (port 5500)
    const url = `${FRONTEND_ROOT}/pages/note-viewer.html?id=${encodeURIComponent(id)}`;
    window.open(url, "_blank");
  };

  // --- PREVIEW BUTTON ---
  card.querySelector(".preview-btn").onclick = () => {
    if (note.previewLink) window.open(note.previewLink, "_blank");
    else alert("No preview link available.");
  };

  return card;
}


// Helper to generate price HTML
function generatePriceHTML(note) {
  const original = Number(note.originalPrice || 0);
  const discount = Number(note.discountPrice || 0);
  const discountPercent = note.discountPercent;

  if (discount > 0 && discount < original) {
    return `
      <span class="old">₹${formatPrice(original)}</span>
      <span class="new">₹${formatPrice(discount)}</span>
      ${discountPercent ? `<span class="tag">-${discountPercent}%</span>` : ""}
    `;
  }

  if (original > 0) {
    return `<span class="new">₹${formatPrice(original)}</span>`;
  }

  return `<span class="new">Free</span>`;
}


// -------------------------------------------
// 4) LOAD USER'S PURCHASED NOTES (uses BACKEND)
// -------------------------------------------
async function loadMyNotes() {
  const token = localStorage.getItem("gonotes_token");

  if (!token) {
    alert("Please log in to view your notes.");
    window.location.href = "login.html";
    return;
  }

  const container = document.getElementById("notesContainer");
  const emptyMsg = document.getElementById("emptyMsg");

  container.innerHTML = "";
  emptyMsg.style.display = "none";

  try {
    const res = await fetch(API_BASE + "/notes/my-notes", {
      headers: { Authorization: "Bearer " + token },
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.message || "Unable to load notes. Please log in again.");
      window.location.href = "login.html";
      return;
    }

    const notes = data.notes || [];

    if (!notes.length) {
      emptyMsg.style.display = "block";
      return;
    }

    notes.forEach((note) => {
      container.appendChild(createNoteCard(note));
    });
  } catch (err) {
    console.error("Error fetching my notes:", err);
    emptyMsg.style.display = "block";
    emptyMsg.textContent = "Error loading notes. Please try again later.";
  }
}


// Start on page load
document.addEventListener("DOMContentLoaded", loadMyNotes);
