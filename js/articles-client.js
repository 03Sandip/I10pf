(() => {
  console.log("[articles-client] loaded");

  /* ================= SERVER URL ================= */
  if (!window.SERVER_URL) {
    throw new Error("SERVER_URL not found. Load server.js before articles-client.js");
  }

  const ROOT_URL = window.SERVER_URL.replace(/\/+$/, "");
  const API_BASE = ROOT_URL + "/api/articles";

  /* ================= ELEMENTS ================= */
  const listEl = document.getElementById("articlesList");
  const articleView = document.getElementById("articleView");
  const articleTitle = document.getElementById("articleTitle");
  const articleDate = document.getElementById("articleDate");
  const articleContent = document.getElementById("articleContent");
  const loadingEl = document.getElementById("articleLoading");

  let articles = [];

  /* ================= HELPERS ================= */
  function getArticleIdFromURL() {
    return new URLSearchParams(window.location.search).get("id");
  }

  function setURL(id) {
    const url = new URL(window.location);
    url.searchParams.set("id", id);
    history.pushState({}, "", url);
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toDateString();
  }

  /* ================= LOAD ARTICLES LIST ================= */
  async function loadArticlesList() {
    const res = await fetch(API_BASE);
    const data = await res.json();

    if (!data.success) {
      listEl.innerHTML = `<li class="muted">Failed to load</li>`;
      return;
    }

    articles = data.articles;
    listEl.innerHTML = "";

    articles.forEach(article => {
      const li = document.createElement("li");
      const a = document.createElement("a");

      a.textContent = article.title;
      a.href = "javascript:void(0)";
      a.dataset.id = article._id;

      a.onclick = () => {
        setURL(article._id);
        renderArticle(article._id);
        highlightActive(article._id);
      };

      li.appendChild(a);
      listEl.appendChild(li);
    });

    // Load article from URL or first one
    const initialId = getArticleIdFromURL() || articles[0]?._id;
    if (initialId) {
      renderArticle(initialId);
      highlightActive(initialId);
    }
  }

  /* ================= RENDER ARTICLE ================= */
  async function renderArticle(id) {
    loadingEl.style.display = "block";
    articleView.classList.add("hidden");

    const res = await fetch(`${API_BASE}/${id}`);
    const data = await res.json();

    if (!data.success) {
      loadingEl.textContent = "Article not found";
      return;
    }

    const article = data.article;

    articleTitle.textContent = article.title;
    articleDate.textContent = formatDate(article.createdAt);
    articleContent.innerHTML = article.content;

    loadingEl.style.display = "none";
    articleView.classList.remove("hidden");
  }

  /* ================= HIGHLIGHT ACTIVE ================= */
  function highlightActive(id) {
    document.querySelectorAll(".articles-list a").forEach(a => {
      a.classList.toggle("active", a.dataset.id === id);
    });
  }

  /* ================= INIT ================= */
  loadArticlesList();

  // Handle back / forward navigation
  window.addEventListener("popstate", () => {
    const id = getArticleIdFromURL();
    if (id) {
      renderArticle(id);
      highlightActive(id);
    }
  });

})();
