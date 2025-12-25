// js/theme.js
function initThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  const body = document.body;

  if (!toggle) return; // header not loaded yet

  const saved = localStorage.getItem("theme");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  const isDark = saved === "dark" || (!saved && systemDark);
  body.classList.toggle("dark", isDark);
  toggle.textContent = isDark ? "☀️" : "🌙";

  // Avoid duplicate listeners
  toggle.onclick = null;

  toggle.addEventListener("click", () => {
    const nowDark = body.classList.toggle("dark");
    toggle.textContent = nowDark ? "☀️" : "🌙";
    localStorage.setItem("theme", nowDark ? "dark" : "light");
  });
}
