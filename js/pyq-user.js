(function () {

  /* =====================================================
     API BASE (FROM server.js)
  ===================================================== */
  if (!window.SERVER_URL) {
    console.error("SERVER_URL not defined. Did you load server.js?");
    return;
  }

  const API = `${window.SERVER_URL}/api`;

  const list = document.getElementById("pyqList");

  const deptTabs = document.getElementById("deptTabs");
  const subSel   = document.getElementById("filterSubject");
  const topicSel = document.getElementById("filterTopic");
  const yearSel  = document.getElementById("filterYear");
  const typeSel  = document.getElementById("filterType");

  let activeDepartment = "";
  let questions = [];

  /* =====================================================
     LOAD DEPARTMENTS
  ===================================================== */
  async function loadDepartments() {
    const depts = await fetch(`${API}/questions/departments`)
      .then(r => r.json());

    deptTabs.innerHTML = "";

    depts.forEach((d, i) => {
      const tab = document.createElement("div");
      tab.className = "dept-tab" + (i === 0 ? " active" : "");
      tab.textContent = d;

      tab.onclick = () => {
        document.querySelectorAll(".dept-tab")
          .forEach(t => t.classList.remove("active"));

        tab.classList.add("active");
        activeDepartment = d;

        resetFilters();
        loadSubjects();
        fetchQuestions();
      };

      deptTabs.appendChild(tab);
      if (i === 0) activeDepartment = d;
    });

    loadSubjects();
  }

  /* =====================================================
     LOAD SUBJECTS (DEPARTMENT-WISE)
  ===================================================== */
  async function loadSubjects() {
    subSel.innerHTML   = `<option value="">All Subjects</option>`;
    topicSel.innerHTML = `<option value="">All Topics</option>`;
    yearSel.innerHTML  = `<option value="">All Years</option>`;

    if (!activeDepartment) return;

    const subjects = await fetch(
      `${API}/questions/subjects?department=${encodeURIComponent(activeDepartment)}`
    ).then(r => r.json());

    subjects.forEach(s => {
      subSel.innerHTML += `<option value="${s}">${s}</option>`;
    });
  }

  /* =====================================================
     SUBJECT → TOPICS + YEARS
  ===================================================== */
  subSel.onchange = async () => {
    topicSel.innerHTML = `<option value="">All Topics</option>`;
    yearSel.innerHTML  = `<option value="">All Years</option>`;

    if (!subSel.value || !activeDepartment) return;

    const [topics, years] = await Promise.all([
      fetch(
        `${API}/questions/topics?department=${encodeURIComponent(activeDepartment)}&subject=${encodeURIComponent(subSel.value)}`
      ).then(r => r.json()),

      fetch(
        `${API}/questions/years?department=${encodeURIComponent(activeDepartment)}&subject=${encodeURIComponent(subSel.value)}`
      ).then(r => r.json())
    ]);

    topics.forEach(t =>
      topicSel.innerHTML += `<option value="${t}">${t}</option>`
    );

    years.forEach(y =>
      yearSel.innerHTML += `<option value="${y}">${y}</option>`
    );
  };

  /* =====================================================
     FETCH QUESTIONS
  ===================================================== */
  async function fetchQuestions() {
    const params = new URLSearchParams();
    params.append("department", activeDepartment);

    if (subSel.value)   params.append("subject", subSel.value);
    if (topicSel.value) params.append("topic", topicSel.value);
    if (yearSel.value)  params.append("year", yearSel.value);
    if (typeSel.value)  params.append("type", typeSel.value);

    const res = await fetch(`${API}/questions?${params.toString()}`);
    questions = await res.json();
    render();
  }

  [subSel, topicSel, yearSel, typeSel]
    .forEach(el => el.addEventListener("change", fetchQuestions));

  /* =====================================================
     RENDER QUESTIONS
  ===================================================== */
  function render() {
    list.innerHTML = "";

    if (!questions.length) {
      list.innerHTML = "<p>No questions found.</p>";
      return;
    }

    questions.forEach((q, i) => {
      const card = document.createElement("div");
      card.className = "question-card";

      card.innerHTML = `
        <div class="q-header">
          <span>Q.${i + 1} • ${q.subject} • ${q.year}</span>
          <span class="q-type">${q.type}</span>
        </div>

        <div class="q-text">${q.questionText}</div>

        ${q.image ? `
          <div class="q-image">
            <img src="${q.image}" loading="lazy">
          </div>` : ""}

        ${
          q.options?.length
            ? q.options.map(o => `
                <div class="option" data-val="${o.label}">
                  ${o.label}. ${o.text}
                </div>`).join("")
            : `<input class="nat-input" placeholder="Your answer">`
        }

        <button class="btn check-btn">Check Answer</button>

        <div class="answer"></div>

        <button class="solution-btn" style="display:none;">
          📖 View Solution
        </button>

        <div class="solution-box" style="display:none;">
          ${
            q.solution
              ? `<div style="margin-bottom:6px;">${q.solution}</div>`
              : `<div style="color:#6b7280;">Solution explanation not available.</div>`
          }

          ${
            q.solutionLink && q.solutionLink.trim()
              ? `<a href="${q.solutionLink}" target="_blank"
                   style="display:inline-block;margin-top:6px;color:#2563eb;">
                   🔗 Open Full Solution
                 </a>`
              : `<div style="margin-top:6px;color:#9ca3af;">
                   🔒 Solution link not provided
                 </div>`
          }
        </div>
      `;

      setupAnswer(card, q);
      list.appendChild(card);
    });
  }

  /* =====================================================
     ANSWER + SOLUTION LOGIC
  ===================================================== */
  function setupAnswer(card, q) {
    let selected = [];

    card.querySelectorAll(".option").forEach(opt => {
      opt.onclick = () => {
        if (q.type === "MSQ") {
          opt.classList.toggle("selected");
          selected = [...card.querySelectorAll(".selected")]
            .map(o => o.dataset.val);
        } else {
          card.querySelectorAll(".option")
            .forEach(o => o.classList.remove("selected"));
          opt.classList.add("selected");
          selected = [opt.dataset.val];
        }
      };
    });

    const btn = card.querySelector(".check-btn");
    const ans = card.querySelector(".answer");
    const solBtn = card.querySelector(".solution-btn");
    const solBox = card.querySelector(".solution-box");

    btn.onclick = () => {
      const user = q.type === "NAT"
        ? card.querySelector(".nat-input").value.trim()
        : selected;

      const correct =
        q.type === "NAT"
          ? Number(user) === Number(q.correctAnswer)
          : Array.isArray(q.correctAnswer)
            ? user.sort().join() === q.correctAnswer.sort().join()
            : user[0] === q.correctAnswer;

      ans.style.display = "block";
      ans.className = "answer " + (correct ? "correct" : "wrong");
      ans.innerHTML = `
        ${correct ? "✅ Correct" : "❌ Wrong"}<br>
        Correct Answer: <b>${
          Array.isArray(q.correctAnswer)
            ? q.correctAnswer.join(", ")
            : q.correctAnswer
        }</b>
      `;

      solBtn.style.display = "inline-block";
    };

    solBtn.onclick = () => {
      const open = solBox.style.display === "block";
      solBox.style.display = open ? "none" : "block";
      solBtn.textContent = open ? "📖 View Solution" : "❌ Hide Solution";
    };
  }

  /* =====================================================
     RESET FILTERS
  ===================================================== */
  function resetFilters() {
    subSel.value = "";
    topicSel.value = "";
    yearSel.value = "";
    typeSel.value = "";
  }

  /* =====================================================
     INIT
  ===================================================== */
  loadDepartments();
  fetchQuestions();

})();
