document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.getElementById("org-wrapper");
  const search = document.getElementById("org-search");
  const semSelect = document.getElementById("org-semester");
  const resetBtn = document.getElementById("org-reset-btn");

  const organizers = [
    // Sem 1
    { name: "Physics I", code: "BS-PH101", link: "...", sem: 1 },
    { name: "Mathematics IA", code: "BS-M101", link: "...", sem: 1 },
    { name: "Basic Electrical Engineering", code: "ES-EE101", link: "...", sem: 1 },

    // Sem 2
    { name: "Chemistry-I", code: "BS-CH201", link: "...", sem: 2 },
    { name: "Mathematics - II A", code: "BS-M201", link: "...", sem: 2 },
    { name: "Programming for Problem Solving", code: "ES-CS201", link: "...", sem: 2 },
    { name: "English", code: "HM-HU201", link: "...", sem: 2 },

    // Sem 3
    { name: "Analog & Digital Electronics", code: "ESC-301", link: "...", sem: 3 },
    { name: "Data Structure & Algorithm", code: "PCC-CS301", link: "...", sem: 3 },
    { name: "Computer Organization", code: "PCC-CS302", link: "...", sem: 3 },
    { name: "Mathematics-III", code: "BSC-301", link: "...", sem: 3 },
    { name: "Economics for Engineers", code: "HSMC-301", link: "...", sem: 3 },

    // Sem 4
    { name: "Discrete Mathematics", code: "PCC-CS401", link: "...", sem: 4 },
    { name: "Computer Architecture", code: "PCC-CS402", link: "...", sem: 4 },
    { name: "FLAT", code: "PCC-CS403", link: "...", sem: 4 },
    { name: "DAA", code: "PCC-CS404", link: "...", sem: 4 },
    { name: "Biology", code: "BSC-401", link: "...", sem: 4 },
    { name: "Environmental Sciences", code: "MC-401", link: "...", sem: 4 },

    // Sem 5
    { name: "Software Engineering", code: "ESC501", link: "...", sem: 5 },
    { name: "Compiler Design", code: "PCC-CS501", link: "...", sem: 5 },
    { name: "Operating Systems", code: "PCC-CS502", link: "...", sem: 5 },
    { name: "OOP", code: "PCC-CS503", link: "...", sem: 5 },
    { name: "Industrial Management", code: "HSMC-501", link: "...", sem: 5 },
    { name: "Artificial Intelligence", code: "PEC-IT501B", link: "...", sem: 5 },

    // Sem 6
    { name: "DBMS", code: "PCC-CS601", link: "...", sem: 6 },
    { name: "Computer Networks", code: "PCC-CS602", link: "...", sem: 6 },
    { name: "Image Processing", code: "PEC-IT601D", link: "...", sem: 6 },
    { name: "Pattern Recognition", code: "PEC-IT602D", link: "...", sem: 6 },
    { name: "Numerical Methods", code: "OEC-IT601A", link: "...", sem: 6 },

    // Sem 7
    { name: "Cloud Computing", code: "PEC-CS701B", link: "...", sem: 7 },
    { name: "Machine Learning", code: "PEC-CS701E", link: "...", sem: 7 },
    { name: "Cyber Security", code: "PEC-CS702E", link: "...", sem: 7 },
    { name: "Multimedia Systems", code: "OEC-CS701B", link: "...", sem: 7 },
    { name: "Project Management", code: "HSMC-701", link: "...", sem: 7 },

    // Sem 8
    { name: "Web & Internet Technology", code: "PEC-CS801D", link: "...", sem: 8 },
    { name: "Cyber Law & Ethics", code: "OEC-CS801B", link: "...", sem: 8 },
    { name: "E-Commerce & ERP", code: "OEC-CS802A", link: "...", sem: 8 },
  ];

  // ----------------------------------------------------
  // RENDER GROUPED BY SEM
  // ----------------------------------------------------
  function render(list) {
    wrapper.innerHTML = "";

    // group by sem
    const grouped = {};
    list.forEach(o => {
      if (!grouped[o.sem]) grouped[o.sem] = [];
      grouped[o.sem].push(o);
    });

    // render each semester
    Object.keys(grouped).sort((a,b)=>a-b).forEach(sem => {
      const section = document.createElement("section");
      section.className = "org-sem-section";
      section.innerHTML = `<h2 class="org-sem-title">Sem ${sem}</h2>`;

      const grid = document.createElement("div");
      grid.className = "org-grid";

      grouped[sem].forEach(o => {
        grid.innerHTML += `
          <div class="org-card">
            <h3 class="org-card-title">${o.name}</h3>
            <p class="org-card-meta">${o.code}</p>
            <a href="${o.link}" target="_blank" class="org-btn-download">Open Link</a>
          </div>`;
      });

      section.appendChild(grid);
      wrapper.appendChild(section);
    });
  }

  // FILTERING
  function applyFilters() {
    const q = search.value.toLowerCase();
    const selectedSem = semSelect.value;

    const filtered = organizers.filter(o => {
      const matchText =
        o.name.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q);

      const matchSem =
        selectedSem === "all" || Number(selectedSem) === o.sem;

      return matchText && matchSem;
    });

    render(filtered);
  }

  search.addEventListener("input", applyFilters);
  semSelect.addEventListener("change", applyFilters);

  resetBtn.addEventListener("click", () => {
    search.value = "";
    semSelect.value = "all";
    render(organizers);
  });

  render(organizers);
});
