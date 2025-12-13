// ../js/syllabus.js
document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("sy-grid");
  const streamSelect = document.getElementById("sy-stream");
  const semSelect = document.getElementById("sy-semester");
  const searchInput = document.getElementById("sy-search");
  const resetBtn = document.getElementById("sy-reset-btn");

  if (!grid) return;

  /* ==========================
     SYLLABUS DATA (MAKUT CSE)
     ========================== */
  const syllabusData = [
    {
      title: "B.Tech Semester 1 – Syllabus",
      stream: "CSE",
      semester: "Sem 1",
      code: "MAKUT",
      pdf: "https://makautexam.net/aicte_details/Syllabus/BTECH.pdf",
      icon: "📘"
    },
    {
      title: "B.Tech Semester 2 – Syllabus",
      stream: "CSE",
      semester: "Sem 2",
      code: "MAKUT",
      pdf: "https://makautexam.net/aicte_details/Syllabus/BTECH.pdf",
      icon: "📗"
    },
    {
      title: "B.Tech Semester 3 – Syllabus",
      stream: "CSE",
      semester: "Sem 3",
      code: "CS320",
      pdf: "https://makautexam.net/aicte_details/Syllabus/CSE/sem320.pdf",
      icon: "📙"
    },
    {
      title: "B.Tech Semester 4 – Syllabus",
      stream: "CSE",
      semester: "Sem 4",
      code: "CS420",
      pdf: "https://makautexam.net/aicte_details/Syllabus/CSE/sem420.pdf",
      icon: "📕"
    },
    {
      title: "B.Tech Semester 5 – Syllabus",
      stream: "CSE",
      semester: "Sem 5",
      code: "CS520",
      pdf: "https://makautexam.net/aicte_details/Syllabus/CSE/sem520.pdf",
      icon: "📒"
    },
    {
      title: "B.Tech Semester 6 – Syllabus",
      stream: "CSE",
      semester: "Sem 6",
      code: "CS620",
      pdf: "https://makautexam.net/aicte_details/Syllabus/CSE/sem620.pdf",
      icon: "📓"
    },
    {
      title: "B.Tech Semester 7 – Syllabus",
      stream: "CSE",
      semester: "Sem 7",
      code: "CS720",
      pdf: "https://makautexam.net/aicte_details/Syllabus/CSE/sem720.pdf",
      icon: "📔"
    },
    {
      title: "B.Tech Semester 8 – Syllabus",
      stream: "CSE",
      semester: "Sem 8",
      code: "CS820",
      pdf: "https://makautexam.net/aicte_details/Syllabus/CSE/sem820.pdf",
      icon: "📚"
    }
  ];

  /* ==========================
     RENDER FUNCTION
     ========================== */
  function renderCards(data) {
    grid.innerHTML = "";

    if (!data.length) {
      grid.innerHTML = `<p class="sy-empty">No syllabus found</p>`;
      return;
    }

    data.forEach(item => {
      const card = document.createElement("article");
      card.className = "sy-card";

      card.innerHTML = `
        <span class="sy-card-badge">${item.stream} · ${item.semester}</span>

        <div class="sy-card-image">
          <span>${item.icon}</span>
        </div>

        <h2 class="sy-card-title">${item.title}</h2>

        <p class="sy-card-meta">
          Code: ${item.code} · Official MAKUT PDF
        </p>

        <div class="sy-card-actions">
          <a href="${item.pdf}"
             target="_blank"
             class="sy-btn-download">
            View / Download
          </a>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  /* ==========================
     FILTERING LOGIC
     ========================== */
  function applyFilters() {
    const streamVal = streamSelect?.value || "All Streams";
    const semVal = semSelect?.value || "All Semesters";
    const query = searchInput?.value.toLowerCase() || "";

    const filtered = syllabusData.filter(item => {
      const streamMatch =
        streamVal === "All Streams" || item.stream === streamVal;

      const semMatch =
        semVal === "All Semesters" || item.semester === semVal;

      const searchMatch =
        item.title.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query);

      return streamMatch && semMatch && searchMatch;
    });

    renderCards(filtered);
  }

  /* ==========================
     EVENT LISTENERS
     ========================== */
  streamSelect?.addEventListener("change", applyFilters);
  semSelect?.addEventListener("change", applyFilters);
  searchInput?.addEventListener("input", applyFilters);

  resetBtn?.addEventListener("click", () => {
    streamSelect.selectedIndex = 0;
    semSelect.selectedIndex = 0;
    searchInput.value = "";
    renderCards(syllabusData);
  });

  /* ==========================
     INITIAL LOAD
     ========================== */
  renderCards(syllabusData);
});
