// ../js/qp.js
document.addEventListener("DOMContentLoaded", () => {
  // Only QP filters logic – header is handled by loadPartials.js

  const stream = document.getElementById("qp-stream");
  const sem = document.getElementById("qp-semester");
  const year = document.getElementById("qp-year");
  const search = document.getElementById("qp-search");
  const resetBtn = document.getElementById("qp-reset-btn");

  if (!resetBtn) return;

  resetBtn.addEventListener("click", () => {
    if (stream) stream.selectedIndex = 0;
    if (sem) sem.selectedIndex = 0;
    if (year) year.selectedIndex = 0;
    if (search) search.value = "";
  });

  // later we can add real filtering here if you want
});
