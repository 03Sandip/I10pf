(async function () {

  if (!window.SERVER_URL) {
    console.error("SERVER_URL not defined");
    return;
  }

  const API = `${window.SERVER_URL}/api`;
  const grid = document.getElementById("deptGrid");

  try {
    const depts = await fetch(`${API}/questions/departments`)
      .then(r => r.json());

    if (!depts.length) {
      grid.innerHTML = "<p>No departments found.</p>";
      return;
    }

    depts.forEach(d => {
      const card = document.createElement("div");
      card.className = "dept-card";
      card.textContent = d;

      card.onclick = () => {
        // 🔥 Redirect with department param
        window.location.href =
          `pyq.html?department=${encodeURIComponent(d)}`;
      };

      grid.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    grid.innerHTML = "<p>Error loading departments.</p>";
  }

})();
