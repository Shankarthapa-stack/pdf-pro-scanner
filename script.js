const { PDFDocument, rgb } = PDFLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let loadedPdfBytes = null;
let pdfDoc = null;
let stream = null;
let isEditMode = false;

const pdfUpload = document.getElementById('pdfUpload');
const startCamBtn = document.getElementById('startCamBtn');
const addTextBtn = document.getElementById('addTextBtn');
const customTextInput = document.getElementById('customText');
const downloadBtn = document.getElementById('downloadBtn');
const scannerSection = document.getElementById('scannerSection');
const video = document.getElementById('video');
const canvas = document.getElementById('pdfCanvas');

// 1. Upload & Render PDF
pdfUpload.addEventListener('change', async (e) => {
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

    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;
}

// 2. Page Scanner (Camera Capture)
startCamBtn.addEventListener('click', async () => {
    scannerSection.classList.remove('hidden');
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
    } catch (err) {
        alert("Camera access failed: " + err.message);
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
    alert("Scanned page PDF me add ho gayi!");
});

// 3. Edit Text (Click to place on PDF, no watermark)
addTextBtn.addEventListener('click', () => {
    if (!pdfDoc) return alert("Pehle PDF upload ya scan karein!");
    if (!customTextInput.value.trim()) return alert("Pehle text box me kuch type karein!");

    isEditMode = !isEditMode;
    if (isEditMode) {
        addTextBtn.style.backgroundColor = '#d29922';
        addTextBtn.innerText = '📍 PDF par click karein';
        canvas.style.cursor = 'crosshair';
    } else {
        resetEditState();
    }
});

canvas.addEventListener('click', async (e) => {
    if (!isEditMode || !pdfDoc) return;

    const textToInsert = customTextInput.value.trim();
    if (!textToInsert) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const pdfHeight = firstPage.getHeight();
    const pdfWidth = firstPage.getWidth();

    const scaleX = pdfWidth / canvas.width;
    const scaleY = pdfHeight / canvas.height;

    const pdfX = x * scaleX;
    const pdfY = pdfHeight - (y * scaleY);

    firstPage.drawText(textToInsert, {
        x: pdfX,
        y: pdfY,
        size: 16,
        color: rgb(0, 0, 0)
    });

    loadedPdfBytes = await pdfDoc.save();
    await renderPDF(loadedPdfBytes);

    resetEditState();
    customTextInput.value = '';
});

function resetEditState() {
    isEditMode = false;
    addTextBtn.style.backgroundColor = '';
    addTextBtn.innerText = '✏️ Add Text';
    canvas.style.cursor = 'default';
}

// 4. Download PDF
downloadBtn.addEventListener('click', async () => {
    if (!pdfDoc) return alert("Download karne ke liye koi PDF nahi hai!");
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "edited_document.pdf";
    link.click();
});
