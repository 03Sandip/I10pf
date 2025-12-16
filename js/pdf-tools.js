// document.addEventListener("DOMContentLoaded", () => {

//   const grid = document.getElementById("toolsGrid");
//   const workspace = document.getElementById("tool-workspace");

//   window.openTool = function (name) {
//     grid.style.display = "none";
//     workspace.style.display = "block";

//     document.querySelectorAll(".tool-panel").forEach(p => p.style.display = "none");
//     document.getElementById("tool-" + name).style.display = "block";
//   };

//   window.backToGrid = function () {
//     workspace.style.display = "none";
//     grid.style.display = "grid";
//   };

//   window.mergePDF = async function () {
//     const files = document.getElementById("mergeFiles").files;
//     if (files.length < 2) return alert("Select at least 2 PDFs");

//     const merged = await PDFLib.PDFDocument.create();

//     for (const f of files) {
//       const pdf = await PDFLib.PDFDocument.load(await f.arrayBuffer());
//       const pages = await merged.copyPages(pdf, pdf.getPageIndices());
//       pages.forEach(p => merged.addPage(p));
//     }

//     download(await merged.save(), "merged.pdf");
//   };

//   window.splitPDF = async function () {
//     const file = document.getElementById("splitFile").files[0];
//     if (!file) return alert("Select a PDF");

//     const pdf = await PDFLib.PDFDocument.load(await file.arrayBuffer());

//     for (let i = 0; i < pdf.getPageCount(); i++) {
//       const newPdf = await PDFLib.PDFDocument.create();
//       const [page] = await newPdf.copyPages(pdf, [i]);
//       newPdf.addPage(page);
//       download(await newPdf.save(), `page-${i + 1}.pdf`);
//     }
//   };

//   window.compressPDF = async function () {
//     const file = document.getElementById("compressFile").files[0];
//     if (!file) return alert("Select a PDF");

//     const originalSize = file.size;

//     const pdf = await PDFLib.PDFDocument.load(await file.arrayBuffer());
//     const compressedBytes = await pdf.save({ useObjectStreams: false });

//     document.getElementById("compressResult").style.display = "block";
//     document.getElementById("originalSize").innerText = formatBytes(originalSize);
//     document.getElementById("compressedSize").innerText = formatBytes(compressedBytes.byteLength);

//     download(compressedBytes, "compressed.pdf");
//   };

//   function download(bytes, filename) {
//     const blob = new Blob([bytes], { type: "application/pdf" });
//     const a = document.createElement("a");
//     a.href = URL.createObjectURL(blob);
//     a.download = filename;
//     a.click();
//   }

//   function formatBytes(bytes) {
//     const sizes = ["Bytes", "KB", "MB"];
//     if (bytes === 0) return "0 Bytes";
//     const i = Math.floor(Math.log(bytes) / Math.log(1024));
//     return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
//   }

// });
