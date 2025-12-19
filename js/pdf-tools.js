document.addEventListener("DOMContentLoaded", () => {

  /* =============================
     CONFIG
  ============================= */
  const API = window.SERVER_URL + "/api/pdf";
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

  const grid = document.getElementById("toolsGrid");
  const workspace = document.getElementById("tool-workspace");

  /* =============================
     UI NAVIGATION
  ============================= */
  window.openTool = function (name) {
    grid.style.display = "none";
    workspace.style.display = "block";

    document.querySelectorAll(".tool-panel")
      .forEach(p => p.style.display = "none");

    document.getElementById("tool-" + name).style.display = "block";
  };

  window.backToGrid = function () {
    workspace.style.display = "none";
    grid.style.display = "grid";
  };

  /* =============================
     FILE SIZE DISPLAY + WARNING
  ============================= */
  const compressInput = document.getElementById("compressFile");
  const fileSizeText = document.getElementById("fileSizeText");
  const fileSizeWarning = document.getElementById("fileSizeWarning");

  if (compressInput) {
    compressInput.addEventListener("change", () => {
      const file = compressInput.files[0];
      if (!file) return;

      fileSizeText.innerText =
        `Selected file size: ${formatBytes(file.size)}`;

      fileSizeWarning.style.display =
        file.size > MAX_FILE_SIZE ? "block" : "none";
    });
  }

  /* =============================
     PDF THUMBNAIL RENDERING
  ============================= */
  async function renderPDFThumbnails(file, container) {
    container.innerHTML = "";

    const reader = new FileReader();
    reader.onload = async () => {
      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(reader.result)
      }).promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.4 });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;

        const thumb = document.createElement("div");
        thumb.className = "pdf-thumb";
        thumb.innerHTML = `<span>Page ${i}</span>`;
        thumb.prepend(canvas);

        thumb.onclick = () => thumb.classList.toggle("selected");

        container.appendChild(thumb);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  /* =============================
     MERGE PDF – THUMBNAILS
  ============================= */
  const mergeInput = document.getElementById("mergeFiles");
  const mergeThumbs = document.getElementById("mergeThumbs");

  if (mergeInput) {
    mergeInput.addEventListener("change", async () => {
      mergeThumbs.innerHTML = "";

      for (const file of mergeInput.files) {
        const title = document.createElement("h4");
        title.innerText = file.name;
        title.style.fontSize = "14px";
        mergeThumbs.appendChild(title);

        await renderPDFThumbnails(file, mergeThumbs);
      }
    });
  }

  /* =============================
     MERGE PDF – SERVER + PROGRESS
  ============================= */
  window.mergePDF = function () {
    const files = mergeInput.files;
    if (files.length < 2) {
      alert("Select at least 2 PDF files");
      return;
    }

    const form = new FormData();
    [...files].forEach(f => form.append("files", f));

    const wrap = document.querySelector("#tool-merge .progress-wrapper");
    const bar = wrap.querySelector(".progress-bar");
    const text = wrap.querySelector(".progress-text");

    wrap.style.display = "block";
    bar.style.width = "0%";
    text.innerText = "Uploading…";

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API}/merge`);
    xhr.responseType = "blob";

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) {
        bar.style.width = Math.round(e.loaded / e.total * 100) + "%";
      }
    };

    xhr.onload = () => {
      if (xhr.status !== 200) {
        alert("Merge failed");
        wrap.style.display = "none";
        return;
      }
      download(xhr.response, "merged.pdf");
      wrap.style.display = "none";
    };

    xhr.send(form);
  };

  /* =============================
     SPLIT PDF – THUMBNAILS
  ============================= */
  const splitInput = document.getElementById("splitFile");
  const splitThumbs = document.getElementById("splitThumbs");

  if (splitInput) {
    splitInput.addEventListener("change", () => {
      renderPDFThumbnails(splitInput.files[0], splitThumbs);
    });
  }

  /* =============================
     SPLIT PDF – SERVER + RANGE
  ============================= */
  window.splitPDF = function () {
    const file = splitInput.files[0];
    if (!file) {
      alert("Select a PDF file");
      return;
    }

    const range = document.getElementById("splitRange").value;

    const form = new FormData();
    form.append("file", file);
    form.append("range", range);

    const wrap = document.querySelector("#tool-split .progress-wrapper");
    const bar = wrap.querySelector(".progress-bar");
    const text = wrap.querySelector(".progress-text");

    wrap.style.display = "block";
    bar.style.width = "0%";
    text.innerText = "Uploading…";

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API}/split`);
    xhr.responseType = "blob";

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) {
        bar.style.width = Math.round(e.loaded / e.total * 100) + "%";
      }
    };

    xhr.onload = () => {
      if (xhr.status !== 200) {
        alert("Split failed");
        wrap.style.display = "none";
        return;
      }
      download(xhr.response, "split.pdf");
      wrap.style.display = "none";
    };

    xhr.send(form);
  };

  /* =============================
     COMPRESS PDF – SERVER + PROGRESS
  ============================= */
  window.compressPDF = function () {
    const file = compressInput.files[0];
    if (!file) {
      alert("Select a PDF file");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert("File size exceeds 50 MB limit");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("level",
      document.getElementById("compressLevel").value);
    form.append("targetSize",
      document.getElementById("targetSize").value);

    document.getElementById("originalSize").innerText =
      formatBytes(file.size);

    const wrapper = document.getElementById("progressWrapper");
    const bar = document.getElementById("progressBar");
    const text = document.getElementById("progressText");

    wrapper.style.display = "block";
    bar.style.width = "0%";
    text.innerText = "Uploading…";

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API}/compress`);
    xhr.responseType = "blob";

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) {
        const percent = Math.round(e.loaded / e.total * 100);
        bar.style.width = percent + "%";
        text.innerText = `Uploading… ${percent}%`;
      }
    };

    xhr.onload = () => {
      if (xhr.status !== 200) {
        alert("Compression failed");
        wrapper.style.display = "none";
        return;
      }

      bar.style.width = "100%";
      text.innerText = "Done";

      const blob = xhr.response;
      document.getElementById("compressResult").style.display = "block";
      document.getElementById("compressedSize").innerText =
        formatBytes(blob.size);

      download(blob, "compressed.pdf");

      setTimeout(() => {
        wrapper.style.display = "none";
      }, 1000);
    };

    xhr.send(form);
  };

  /* =============================
     HELPERS
  ============================= */
  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 Bytes";
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
  }

});
