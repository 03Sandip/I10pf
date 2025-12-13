document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.getElementById("org-wrapper");
  const search = document.getElementById("org-search");
  const semSelect = document.getElementById("org-semester");
  const resetBtn = document.getElementById("org-reset-btn");

  const organizers = [
  // Sem 1
  {
    name: "Physics I",
    code: "BS-PH101",
    link: "https://drive.google.com/file/d/1RUXBbXW-6ooiAgNmosWKab4qH549hMiJ/view",
    sem: 1
  },
  {
    name: "Mathematics IA",
    code: "BS-M101",
    link: "https://drive.google.com/file/d/1JtHyiAhFYGErsEnN54sjzO2hs8ZuJjKM/view",
    sem: 1
  },
  {
    name: "Basic Electrical Engineering",
    code: "ES-EE101",
    link: "https://drive.google.com/file/d/1FL-9SAYRGnA82Nt6UumvBs_PxHpTLXdw/view",
    sem: 1
  },

  // Sem 2
  {
    name: "Chemistry-I",
    code: "BS-CH201",
    link: "https://drive.google.com/file/d/1Azbb_UlKZXamtV4JbOHQkLqD8U2CF_5c/view",
    sem: 2
  },
  {
    name: "Mathematics - II A",
    code: "BS-M201",
    link: "https://drive.google.com/file/d/1SJTkAEZBTgYfPL41kjV2BUTQEdDNrmFy/view",
    sem: 2
  },
  {
    name: "Programming for Problem Solving",
    code: "ES-CS201",
    link: "https://drive.google.com/file/d/1S63id4EFTH-3iQzfpRCxvC7xS4P3gP0O/view",
    sem: 2
  },
  {
    name: "English",
    code: "HM-HU201",
    link: "https://drive.google.com/file/d/1VZWnqYvar7xk3oRKDqtMXhhwa93vj4eR/view",
    sem: 2
  },

  // Sem 3
  {
    name: "Analog & Digital Electronics",
    code: "ESC-301",
    link: "https://drive.google.com/file/d/1jQnTcEasCDRE22joYa8I1C8z0d4fJirZ/view",
    sem: 3
  },
  {
    name: "Data Structure & Algorithm",
    code: "PCC-CS301",
    link: "https://drive.google.com/file/d/1jOwZmhoq469VHM1q0ao36amXXhz_yQCQ/view",
    sem: 3
  },
  {
    name: "Computer Organization",
    code: "PCC-CS302",
    link: "https://drive.google.com/file/d/1jP5P8Xld0atv1Qj6QxacS1XB7Mn-EsuJ/view",
    sem: 3
  },
  {
    name: "Mathematics-III",
    code: "BSC-301",
    link: "https://drive.google.com/file/d/1jNfrCn4QX8jfa0eUnoymuQf0hGgJOHmm/view",
    sem: 3
  },
  {
    name: "Economics for Engineers",
    code: "HSMC-301",
    link: "https://drive.google.com/file/d/1jAczzja9zLbSRr5hP4SqlDb6W0BjLk4f/view",
    sem: 3
  },

  // Sem 4
  {
    name: "Discrete Mathematics",
    code: "PCC-CS401",
    link: "https://drive.google.com/file/d/15OQSUzGmlOelnry7RIN44xOp4dJrTbJo/view",
    sem: 4
  },
  {
    name: "Computer Architecture",
    code: "PCC-CS402",
    link: "https://drive.google.com/file/d/16A6Hto0SPXvYlEitl4VfkMCGlEEYYRL2/view",
    sem: 4
  },
  {
    name: "Formal Language & Automata Theory",
    code: "PCC-CS403",
    link: "https://drive.google.com/file/d/15bsWfJQ3F_QWyaQYGP7YmKaO4wpojJJ5/view",
    sem: 4
  },
  {
    name: "Design and Analysis of Algorithms",
    code: "PCC-CS404",
    link: "https://drive.google.com/file/d/15ftRAnSrcGHWexD5NcWlL85OxDeTxxt0/view",
    sem: 4
  },
  {
    name: "Biology",
    code: "BSC-401",
    link: "https://drive.google.com/file/d/15VnT_UytchmdNhKvW3eD1dbfmveD6T7d/view",
    sem: 4
  },
  {
    name: "Environmental Sciences",
    code: "MC-401",
    link: "https://drive.google.com/file/d/16vLAiPfU9ybD339fgcbVOdGFs6PQ_yO8/view",
    sem: 4
  },

  // Sem 5
  {
    name: "Software Engineering",
    code: "ESC501",
    link: "https://drive.google.com/file/d/1CxUDfra_yIs5c0Abr5S-qLF8MvTeZPaa/view",
    sem: 5
  },
  {
    name: "Compiler Design",
    code: "PCC-CS501",
    link: "https://drive.google.com/file/d/1CzMPLR8U3Z7MirCQK2Ek025BQNp0Muqe/view",
    sem: 5
  },
  {
    name: "Operating Systems",
    code: "PCC-CS502",
    link: "https://drive.google.com/file/d/1DxQxF5Y0R2yGaIGMgQG5fMEtmQMzGVB9/view",
    sem: 5
  },
  {
    name: "Object Oriented Programming",
    code: "PCC-CS503",
    link: "https://drive.google.com/file/d/1E1p8yn5wtkppegqgCp2zqUXm3noGqiwe/view",
    sem: 5
  },
  {
    name: "Industrial Management",
    code: "HSMC-501",
    link: "https://drive.google.com/file/d/1EM45gcx3OsNgRZySe0UWuW-02Jk0I06n/view",
    sem: 5
  },
  {
    name: "Artificial Intelligence",
    code: "PEC-IT501B",
    link: "https://drive.google.com/file/d/1EUkEf23JJyajjZAvx9ZFThwZpXTL5qEt/view",
    sem: 5
  },

  // Sem 6
  {
    name: "Database Management Systems",
    code: "PCC-CS601",
    link: "https://drive.google.com/file/d/1RoZtpTcjevEmIeNE8MCXeguPi7cJZn4M/view",
    sem: 6
  },
  {
    name: "Computer Networks",
    code: "PCC-CS602",
    link: "https://drive.google.com/file/d/11q_uTrMJQHFh0aKl5ODlzgzLJZbv4cTK/view",
    sem: 6
  },
  {
    name: "Image Processing",
    code: "PEC-IT601D",
    link: "https://drive.google.com/file/d/1-q4QotKgOaVYL81Lypjd6Uf4m-XPDj_G/view",
    sem: 6
  },
  {
    name: "Pattern Recognition",
    code: "PEC-IT602D",
    link: "https://drive.google.com/file/d/1q2nN_4HhJYgRU3hEuPJ5dh8m-VVZpip8/view",
    sem: 6
  },
  {
    name: "Numerical Methods",
    code: "OEC-IT601A",
    link: "https://drive.google.com/file/d/1WROogzZyZ3QwZZ-MuVKaewIaNIPqxeAJ/view",
    sem: 6
  },

  // Sem 7
  {
    name: "Cloud Computing",
    code: "PEC-CS701B",
    link: "https://drive.google.com/file/d/1xIncCWnn_9f7ugY-UdxQkNLSR-Zle0LB/view",
    sem: 7
  },
  {
    name: "Machine Learning",
    code: "PEC-CS701E",
    link: "https://drive.google.com/file/d/1497q0mV_SAMg53eDvF-ARxiD7TCE2oP8/view",
    sem: 7
  },
  {
    name: "Cyber Security",
    code: "PEC-CS702E",
    link: "https://drive.google.com/file/d/16XRiSYt7-7JHB65mMazCX0LjPOs5nYXq/view",
    sem: 7
  },
  {
    name: "Multimedia Systems",
    code: "OEC-CS701B",
    link: "https://drive.google.com/file/d/1J9nsQC2UbIhTNBW8-p5HDrStFAAjVkHN/view",
    sem: 7
  },
  {
    name: "Project Management",
    code: "HSMC-701",
    link: "https://drive.google.com/file/d/1ibo7iAfNqcpcl3p0xi35nfOVESJXiyW0/view",
    sem: 7
  },

  // Sem 8
  {
    name: "Web & Internet Technology",
    code: "PEC-CS801D",
    link: "https://drive.google.com/file/d/10EcYWobD3czdknu7nf-AhI1MvLg0C5w7/view",
    sem: 8
  },
  {
    name: "Cyber Law & Ethics",
    code: "OEC-CS801B",
    link: "https://drive.google.com/file/d/191xKATv1Q4dNkZy1NtqX8LgeRG9NmIvo/view",
    sem: 8
  },
  {
    name: "E-Commerce & ERP",
    code: "OEC-CS802A",
    link: "https://drive.google.com/file/d/1TAjwbQ89Aa_mFLzW3uM8u2QIDDZ7R9pT/view",
    sem: 8
  }
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
