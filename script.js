const { PDFDocument, rgb } = PDFLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let loadedPdfBytes = null;
let pdfDoc = null;
let stream = null;

const pdfUpload = document.getElementById('pdfUpload');
const startCamBtn = document.getElementById('startCamBtn');
const downloadBtn = document.getElementById('downloadBtn');
const scannerSection = document.getElementById('scannerSection');
const video = document.getElementById('video');
const canvas = document.getElementById('pdfCanvas');

// 1. PDF Upload & Render
pdfUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    loadedPdfBytes = await file.arrayBuffer();
    pdfDoc = await PDFDocument.load(loadedPdfBytes);
    await renderPDF(loadedPdfBytes);
});

async function renderPDF(bytes) {
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const page = await pdf.getPage(1);
    const scale = 1.3;
    const viewport = page.getViewport({ scale });

    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;
}

// 2. Direct Click-to-Edit PDF (Fixed Mobile & Screen Scaling Math)
canvas.addEventListener('click', async (e) => {
    if (!pdfDoc) {
        alert("Pehle PDF file upload karein ya camera se scan karein!");
        return;
    }

    // Direct text input prompt
    const textToInsert = prompt("PDF par kya text likhna chahte hain?");
    if (!textToInsert || !textToInsert.trim()) return;

    // Accurate coordinate calculation for touch & click
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const pdfWidth = firstPage.getWidth();
    const pdfHeight = firstPage.getHeight();

    // Map screen clicks directly to original PDF dimensions
    const pdfX = (clickX / rect.width) * pdfWidth;
    const pdfY = pdfHeight - ((clickY / rect.height) * pdfHeight);

    // Draw text on exact PDF position
    firstPage.drawText(textToInsert.trim(), {
        x: pdfX,
        y: pdfY,
        size: 16,
        color: rgb(0, 0, 0)
    });

    // Save and auto-update view
    loadedPdfBytes = await pdfDoc.save();
    await renderPDF(loadedPdfBytes);
});

// 3. Page Scanner
startCamBtn.addEventListener('click', async () => {
    scannerSection.classList.remove('hidden');
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
    } catch (err) {
        alert("Camera permission access failed!");
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
    await renderPDF(loadedPdfBytes);
    alert("Scanned photo PDF me add ho gayi hai!");
});

// 4. Download PDF
downloadBtn.addEventListener('click', async () => {
    if (!pdfDoc) return alert("Pehle PDF upload ya scan karein!");
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "Edited_Document.pdf";
    link.click();
});
