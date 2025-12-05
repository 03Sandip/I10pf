// ../js/organizers.js
document.addEventListener("DOMContentLoaded", () => {
  const stream = document.getElementById("org-stream");
  const sem = document.getElementById("org-semester");
  const type = document.getElementById("org-type");
  const search = document.getElementById("org-search");
  const resetBtn = document.getElementById("org-reset-btn");

  if (!resetBtn) return;

  resetBtn.addEventListener("click", () => {
    if (stream) stream.selectedIndex = 0;
    if (sem) sem.selectedIndex = 0;
    if (type) type.selectedIndex = 0;
    if (search) search.value = "";
  });

  // later: add real filtering / fetch from backend here
});
