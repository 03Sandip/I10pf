const deptList = document.getElementById("qpDeptList");
const content = document.getElementById("qpContent");

/* Render */
qpDepartments.forEach(dep => {

  /* Sidebar */
  const li = document.createElement("li");
  li.textContent = dep.short;
  li.dataset.target = dep.id;
  deptList.appendChild(li);

  /* Section */
  const section = document.createElement("section");
  section.className = "qp-department";
  section.id = dep.id;

  section.innerHTML = `
    <h2>${dep.title}</h2>
    ${buildTable(dep.semesters)}
  `;
  content.appendChild(section);
});

/* Sidebar interaction */
deptList.addEventListener("click", e => {
  if (e.target.tagName !== "LI") return;

  const id = e.target.dataset.target;

  document.querySelectorAll(".qp-sidebar li").forEach(x => x.classList.remove("active"));
  document.querySelectorAll(".qp-department").forEach(x => x.classList.remove("active"));

  e.target.classList.add("active");
  const section = document.getElementById(id);
  section.classList.add("active");
  section.scrollIntoView({ behavior: "smooth" });
});

/* Table builder */
function buildTable(semesters) {
  let html = `<table><tr>`;
  for (let i = 1; i <= 8; i++) html += `<th>${i} SEM</th>`;
  html += `</tr><tr>`;

  for (let i = 1; i <= 8; i++) {
    html += `<td>`;
    if (semesters[i]) {
      for (const year in semesters[i]) {
        html += `<a class="year-link" href="${semesters[i][year]}" target="_blank">${year}</a>`;
      }
    } else {
      html += `-`;
    }
    html += `</td>`;
  }
  html += `</tr></table>`;
  return html;
}
