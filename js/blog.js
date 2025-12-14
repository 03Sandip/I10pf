// blog.js — Medium-style JSON renderer (path updated)

fetch('./b10/tcs.json')   // ✅ UPDATED PATH
  .then(res => {
    if (!res.ok) {
      throw new Error("JSON file not found at b10/tcs.json");
    }
    return res.json();
  })
  .then(data => {
    const blog = data.blogs[0]; // first blog for now

    const container = document.getElementById('blog');
    container.innerHTML = "";

    /* ==========================
       BLOG HEADER
    ========================== */
    container.innerHTML += `
      <h1 class="article-title">${blog.title}</h1>

      <div class="article-meta">
        <span>${blog.author}</span>
        <span> · ${blog.readTime}</span>
        <span> · ${blog.date}</span>
      </div>
    `;

    /* ==========================
       BLOG CONTENT
    ========================== */
    blog.content.forEach(block => {
      switch (block.type) {

        case "paragraph":
          container.innerHTML += `<p>${block.text}</p>`;
          break;

        case "h2":
          container.innerHTML += `<h2>${block.text}</h2>`;
          break;

        case "h3":
          container.innerHTML += `<h3>${block.text}</h3>`;
          break;

        case "quote":
          container.innerHTML += `<blockquote>${block.text}</blockquote>`;
          break;

        case "code":
          container.innerHTML += `
            <pre class="code-block">
<code>${escapeHTML(block.text)}</code>
            </pre>
          `;
          break;

        case "image":
          container.innerHTML += `
            <figure class="blog-image">
              <img src="${block.src}" alt="${block.caption || ''}">
              ${block.caption ? `<figcaption>${block.caption}</figcaption>` : ""}
            </figure>
          `;
          break;

        default:
          console.warn("Unknown block type:", block.type);
      }
    });
  })
  .catch(err => {
    console.error("Failed to load blog JSON:", err);
  });

/* ==========================
   HELPERS
========================== */

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
