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
        document.querySelectorAll(".dept-tab")
          .forEach(t => t.classList.remove("active"));

        tab.classList.add("active");
        activeDepartment = d;
        currentPage = 1;

        const newUrl =
          `${location.pathname}?department=${encodeURIComponent(d)}`;
        window.history.pushState({}, "", newUrl);

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
      fetch(
        `${API}/questions/topics?department=${activeDepartment}&subject=${subSel.value}`
      ).then(r => r.json()),
      fetch(
        `${API}/questions/years?department=${activeDepartment}&subject=${subSel.value}`
      ).then(r => r.json())
    ]);

    topics.forEach(t =>
      topicSel.innerHTML += `<option value="${t}">${t}</option>`
    );

    years.forEach(y =>
      yearSel.innerHTML += `<option value="${y}">${y}</option>`
    );
  };

  /* ================= FETCH QUESTIONS ================= */
  async function fetchQuestions() {
    if (!activeDepartment) return;

    const params = new URLSearchParams({ department: activeDepartment });

    if (subSel.value) params.append("subject", subSel.value);
    if (topicSel.value) params.append("topic", topicSel.value);
    if (yearSel.value) params.append("year", yearSel.value);
    if (typeSel.value) params.append("type", typeSel.value);

    questions = await fetch(
      `${API}/questions?${params.toString()}`
    ).then(r => r.json());

    currentPage = 1;
    render();
  }

  [subSel, topicSel, yearSel, typeSel]
    .forEach(el => el.addEventListener("change", fetchQuestions));

  /* ================= RENDER (KATEX SAFE) ================= */
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
          <span>
            Q.${start + i + 1}
            • ${q.subject}
            ${(q.topic && q.topic.trim()) ? ` • ${q.topic}` : ""}
            • ${q.year}
            ${q.set ? `<span class="q-set">${q.set}</span>` : ""}
          </span>
          <span class="q-type">${q.type}</span>
        </div>

        <!-- IMPORTANT: DO NOT TOUCH LaTeX -->
        <div class="q-text">${q.questionText}</div>

        ${q.image ? `
          <div class="q-image">
            <img src="${q.image}">
          </div>` : ""}

        ${
          q.options?.length
            ? q.options.map(o => `
              <div class="option" data-val="${o.label}">
                ${o.label}. ${o.text}
              </div>
            `).join("")
            : `<input class="nat-input" placeholder="Your answer">`
        }

        <button class="btn check-btn">Check Answer</button>
        <div class="answer"></div>
        <div class="solution-area" style="display:none;"></div>
      `;

      setupAnswer(card, q);
      list.appendChild(card);
    });

    /* ================= PAGINATION ================= */
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

    /* ================= KATEX AUTO-RENDER ================= */
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

  /* ================= ANSWER LOGIC ================= */
  function setupAnswer(card, q) {
    let selected = [];
    const options = card.querySelectorAll(".option");
    const btn = card.querySelector(".check-btn");
    const ans = card.querySelector(".answer");
    const solArea = card.querySelector(".solution-area");

    options.forEach(opt => {
      opt.onclick = () => {
        if (q.type === "MSQ") {
          opt.classList.toggle("selected");
          selected = [...card.querySelectorAll(".selected")]
            .map(o => o.dataset.val);
        } else {
          options.forEach(o => o.classList.remove("selected"));
          opt.classList.add("selected");
          selected = [opt.dataset.val];
        }
      };
    });

    btn.onclick = () => {
      btn.disabled = true;

      let isCorrect = false;
      let displayAnswer = "";

      if (q.type === "NAT") {
        const user = Number(card.querySelector(".nat-input").value);

        if (
          typeof q.correctAnswer === "object" &&
          q.correctAnswer !== null &&
          "min" in q.correctAnswer &&
          "max" in q.correctAnswer
        ) {
          isCorrect =
            user >= q.correctAnswer.min &&
            user <= q.correctAnswer.max;

          displayAnswer =
            `${q.correctAnswer.min} to ${q.correctAnswer.max}`;
        } else {
          isCorrect = user === Number(q.correctAnswer);
          displayAnswer = q.correctAnswer;
        }
      } else if (q.type === "MSQ") {
        isCorrect =
          selected.length === q.correctAnswer.length &&
          selected.every(v => q.correctAnswer.includes(v));

        displayAnswer = q.correctAnswer.join(", ");
      } else {
        isCorrect = selected[0] === q.correctAnswer;
        displayAnswer = q.correctAnswer;
      }

      ans.style.display = "block";
      ans.className = "answer " + (isCorrect ? "correct" : "wrong");
      ans.innerHTML = `
        ${isCorrect ? "✅ Correct" : "❌ Wrong"}<br>
        Correct Answer: <b>${displayAnswer}</b>
      `;

      solArea.style.display = "block";
      solArea.innerHTML = q.solutionLink
        ? `<a href="${q.solutionLink}" target="_blank" class="btn">
            📖 Click here for detail solution by GateOverflow
           </a>`
        : "";
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
