(function () {

  if (!window.SERVER_URL) {
    console.error("SERVER_URL not defined.");
    return;
  }

  const API = `${window.SERVER_URL}/api`;

  const list = document.getElementById("pyqList");
  const deptTabs = document.getElementById("deptTabs");
  const pagination = document.getElementById("pagination");

  const subSel = document.getElementById("filterSubject");
  const topicSel = document.getElementById("filterTopic");
  const yearSel = document.getElementById("filterYear");
  const typeSel = document.getElementById("filterType");

  let activeDepartment = "";
  let questions = [];

  let currentPage = 1;
  const QUESTIONS_PER_PAGE = 12;

  const urlParams = new URLSearchParams(window.location.search);
  const deptFromUrl = urlParams.get("department");

  /* ================= FORMAT CORRECT ANSWER ================= */
  function formatCorrectAnswer(q) {
    const a = q.correctAnswer;

    if (q.type === "NAT") {
      if (typeof a === "object" && a && "min" in a && "max" in a) {
        return `${a.min} to ${a.max}`;
      }
      return String(a);
    }

    if (Array.isArray(a)) return a.join(", ");
    return String(a);
  }

  /* ================= LOAD DEPARTMENTS ================= */
  async function loadDepartments() {
    const depts = await fetch(`${API}/questions/departments`).then(r => r.json());
    deptTabs.innerHTML = "";

    depts.forEach((d, i) => {
      const tab = document.createElement("div");
      tab.className = "dept-tab";
      tab.textContent = d;

      if ((deptFromUrl && d === deptFromUrl) || (!deptFromUrl && i === 0)) {
        tab.classList.add("active");
        activeDepartment = d;
      }

      tab.onclick = () => {
        document.querySelectorAll(".dept-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        activeDepartment = d;
        currentPage = 1;

        history.pushState({}, "", `${location.pathname}?department=${encodeURIComponent(d)}`);

        resetFilters();
        loadSubjects();
        fetchQuestions();
      };

      deptTabs.appendChild(tab);
    });

    loadSubjects();
    fetchQuestions();
  }

  /* ================= LOAD SUBJECTS ================= */
  async function loadSubjects() {
    subSel.innerHTML = `<option value="">All Subjects</option>`;
    topicSel.innerHTML = `<option value="">All Topics</option>`;
    yearSel.innerHTML = `<option value="">All Years</option>`;

    if (!activeDepartment) return;

    const subjects = await fetch(
      `${API}/questions/subjects?department=${encodeURIComponent(activeDepartment)}`
    ).then(r => r.json());

    subjects.forEach(s => {
      subSel.innerHTML += `<option value="${s}">${s}</option>`;
    });
  }

  subSel.onchange = async () => {
    topicSel.innerHTML = `<option value="">All Topics</option>`;
    yearSel.innerHTML = `<option value="">All Years</option>`;

    if (!subSel.value || !activeDepartment) return;

    const [topics, years] = await Promise.all([
      fetch(`${API}/questions/topics?department=${activeDepartment}&subject=${subSel.value}`).then(r => r.json()),
      fetch(`${API}/questions/years?department=${activeDepartment}&subject=${subSel.value}`).then(r => r.json())
    ]);

    topics.forEach(t => topicSel.innerHTML += `<option value="${t}">${t}</option>`);
    years.forEach(y => yearSel.innerHTML += `<option value="${y}">${y}</option>`);
  };

  /* ================= FETCH QUESTIONS ================= */
  async function fetchQuestions() {
    if (!activeDepartment) return;

    const params = new URLSearchParams({ department: activeDepartment });
    if (subSel.value) params.append("subject", subSel.value);
    if (topicSel.value) params.append("topic", topicSel.value);
    if (yearSel.value) params.append("year", yearSel.value);
    if (typeSel.value) params.append("type", typeSel.value);

    questions = await fetch(`${API}/questions?${params}`).then(r => r.json());
    currentPage = 1;
    render();
  }

  [subSel, topicSel, yearSel, typeSel].forEach(el =>
    el.addEventListener("change", fetchQuestions)
  );

  /* ================= RENDER ================= */
  function render() {
    list.innerHTML = "";
    pagination.innerHTML = "";

    if (!questions.length) {
      list.innerHTML = "<p>No questions found.</p>";
      return;
    }

    const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
    const start = (currentPage - 1) * QUESTIONS_PER_PAGE;
    const pageQuestions = questions.slice(start, start + QUESTIONS_PER_PAGE);

    pageQuestions.forEach((q, i) => {
      const card = document.createElement("div");
      card.className = "question-card";

      card.innerHTML = `
        <div class="q-header">
          <span>Q.${start + i + 1} • ${q.subject} • ${q.year}</span>
          <span class="q-type">${q.type}</span>
        </div>

        <div class="q-text">${q.questionText}</div>

        ${q.image ? `<div class="q-image"><img src="${q.image}"></div>` : ""}

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

        <div class="solution-link" style="display:none;margin-top:10px">
          ${q.solutionLink ? `
            <a href="${q.solutionLink}" target="_blank" style="color:#2563eb;font-weight:600">
              👉 Click here for detailed solution (GateOverflow)
            </a>` : ""}
        </div>
      `;

      setupAnswer(card, q);
      list.appendChild(card);
    });

    for (let p = 1; p <= totalPages; p++) {
      const btn = document.createElement("button");
      btn.className = "page-btn" + (p === currentPage ? " active" : "");
      btn.textContent = p;

      btn.onclick = () => {
        currentPage = p;
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      };

      pagination.appendChild(btn);
    }

    // ✅ KaTeX re-render
    if (window.renderMathInElement) {
      renderMathInElement(list, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ],
        throwOnError: false
      });
    }
  }

  /* ================= ANSWER LOGIC (FINAL & STABLE) ================= */
  function setupAnswer(card, q) {
    let selected = [];
    let locked = false;

    const options = card.querySelectorAll(".option");
    const btn = card.querySelector(".check-btn");
    const ans = card.querySelector(".answer");
    const sol = card.querySelector(".solution-link");

    options.forEach(opt => {
      opt.onclick = () => {
        if (locked) return;

        if (q.type === "MSQ") {
          opt.classList.toggle("selected");
          selected = [...card.querySelectorAll(".selected")].map(o => o.dataset.val);
        } else {
          options.forEach(o => o.classList.remove("selected"));
          opt.classList.add("selected");
          selected = [opt.dataset.val];
        }
      };
    });

    btn.onclick = () => {
      if (locked) return;
      locked = true;
      btn.disabled = true;

      let isCorrect = false;

      /* ===== NAT ===== */
      if (q.type === "NAT") {
        const user = Number(card.querySelector(".nat-input").value);
        const a = q.correctAnswer;

        if (typeof a === "object" && a && "min" in a && "max" in a) {
          isCorrect = user >= a.min && user <= a.max;
        } else {
          isCorrect = user === Number(a);
        }
      }

      /* ===== MSQ ===== */
      else if (q.type === "MSQ") {
        const correct = q.correctAnswer;
        isCorrect =
          selected.length === correct.length &&
          selected.every(v => correct.includes(v));

        options.forEach(opt => {
          const v = opt.dataset.val;
          if (correct.includes(v)) opt.classList.add("correct");
          else if (selected.includes(v)) opt.classList.add("wrong");
          opt.classList.add("disabled");
        });
      }

      /* ===== MCQ ===== */
      else {
        isCorrect = selected[0] === q.correctAnswer;

        options.forEach(opt => {
          const v = opt.dataset.val;
          if (v === q.correctAnswer) opt.classList.add("correct");
          else if (v === selected[0]) opt.classList.add("wrong");
          opt.classList.add("disabled");
        });
      }

      ans.style.display = "block";
      ans.className = "answer " + (isCorrect ? "correct" : "wrong");
      ans.innerHTML = `
        ${isCorrect ? "✅ Correct" : "❌ Wrong"}<br>
        Correct Answer: <b>${formatCorrectAnswer(q)}</b>
      `;

      // ✅ show solution ONLY after check
      if (sol && sol.innerHTML.trim()) sol.style.display = "block";
    };
  }

  function resetFilters() {
    subSel.value = "";
    topicSel.value = "";
    yearSel.value = "";
    typeSel.value = "";
  }

  loadDepartments();

})();
