const { PDFDocument, rgb } = PDFLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let loadedPdfBytes = null;
let pdfDoc = null;
let stream = null;

// 1. PDF Upload & Display
document.getElementById('pdfUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    loadedPdfBytes = await file.arrayBuffer();
    pdfDoc = await PDFDocument.load(loadedPdfBytes);
    renderPDF(loadedPdfBytes);
});

async function renderPDF(bytes) {
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const page = await pdf.getPage(1);
    const scale = 1.2;
    const viewport = page.getViewport({ scale });

    const canvas = document.getElementById('pdfCanvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;
}

// 2. Page Scanner (Camera)
const startCamBtn = document.getElementById('startCamBtn');
const scannerSection = document.getElementById('scannerSection');
const video = document.getElementById('video');

startCamBtn.addEventListener('click', async () => {
    scannerSection.classList.remove('hidden');
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
    } catch (err) {
        alert("Camera permission denied or not available!");
    }
});

document.getElementById('closeCamBtn').addEventListener('click', () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    scannerSection.classList.add('hidden');
});

document.getElementById('captureBtn').addEventListener('click', async () => {
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    captureCanvas.getContext('2d').drawImage(video, 0, 0);

    const imgDataUrl = captureCanvas.toDataURL('image/png');
    if (!pdfDoc) pdfDoc = await PDFDocument.create();

    const imgBytes = await fetch(imgDataUrl).then(res => res.arrayBuffer());
    const image = await pdfDoc.embedPng(imgBytes);
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });

    loadedPdfBytes = await pdfDoc.save();
    renderPDF(loadedPdfBytes);
    alert("Scanned page added to PDF!");
});

// 3. Edit PDF (Add Text)
document.getElementById('addTextBtn').addEventListener('click', async () => {
    if (!pdfDoc) return alert("Pehle PDF upload ya scan karein!");
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    firstPage.drawText("Edited with PDF Pro Scanner", { x: 50, y: 50, size: 20, color: rgb(0.9, 0.1, 0.1) });

    loadedPdfBytes = await pdfDoc.save();
    renderPDF(loadedPdfBytes);
    alert("Text added to the bottom left!");
});

// 4. Download PDF
document.getElementById('downloadBtn').addEventListener('click', async () => {
    if (!pdfDoc) return alert("Download karne ke liye koi PDF nahi hai!");
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "scanned_edited.pdf";
    link.click();
});
