// ../js/syllabus.js
document.addEventListener("DOMContentLoaded", () => {
  const stream = document.getElementById("sy-stream");
  const sem = document.getElementById("sy-semester");
  const search = document.getElementById("sy-search");
  const resetBtn = document.getElementById("sy-reset-btn");

  if (!resetBtn) return;

  resetBtn.addEventListener("click", () => {
    if (stream) stream.selectedIndex = 0;
    if (sem) sem.selectedIndex = 0;
    if (search) search.value = "";
  });

  // later: hook real filtering / backend API here
});
