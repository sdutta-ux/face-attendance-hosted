// client.js - Mobile-friendly Face Recognition Attendance

const VIDEO = document.getElementById('video');
const STATUS = document.getElementById('status');

/* ==========================================================
   POST to your Apps Script exec URL
   Make sure CONFIG.EXEC_URL is set in config.js
========================================================== */
async function postAPI(payload) {
  const res = await fetch(CONFIG.EXEC_URL, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

/* ==========================================================
   Initialize buttons and messages
========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.addEventListener('click', startCameraFlow);

  const regBtn = document.getElementById('registerBtn');
  if (regBtn) regBtn.addEventListener('click', registerEmployee);

  const markBtn = document.getElementById('markBtn');
  if (markBtn) markBtn.addEventListener('click', markAttendance);

  STATUS.innerText = '📸 Tap "Start Camera" to begin.';
});

/* ==========================================================
   Start camera and preload models
========================================================== */
async function startCameraFlow() {
  try {
    STATUS.innerText = "📸 Requesting camera permission...";
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    VIDEO.srcObject = stream;
    await VIDEO.play();
    STATUS.innerText = "✅ Camera allowed! Loading models...";

    // Load face-api models
    const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/";
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);

    STATUS.innerText = "🎯 Camera & models ready! You can Register or Mark Attendance.";
  } catch (err) {
    console.error("Camera error:", err);
    STATUS.innerText =
      "❌ Camera access denied or unavailable.\n\n" +
      "👉 Fix:\n" +
      "1️⃣ Open browser settings → Site settings → Camera\n" +
      "2️⃣ Allow camera for this site\n" +
      "3️⃣ Reload page and tap Start Camera again.";
  }
}

/* ==========================================================
   Capture face descriptor (mobile-friendly retries)
========================================================== */
async function captureDescriptor() {
  if (!VIDEO.srcObject) return null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = VIDEO.videoWidth;
    canvas.height = VIDEO.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(VIDEO, 0, 0, canvas.width, canvas.height);

    const detection = await faceapi
      .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) return Array.from(detection.descriptor);

    // Wait 500ms and try again
    await new Promise(r => setTimeout(r, 500));
  }

  return null;
}

/* ==========================================================
   Capture current video frame as Base64
========================================================== */
function getFrameBase64() {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.videoWidth;
  canvas.height = VIDEO.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(VIDEO, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg');
}

/* ==========================================================
   Register Employee
========================================================== */
async function registerEmployee() {
  const empId = prompt('Employee ID (e.g. E001):');
  if (!empId) return;
  const name = prompt('Full Name:');
  if (!name) return;
  const category = prompt('Category (Rolled/Unrolled/Contract):', 'Rolled');
  const department = prompt('Department:', 'General');

  STATUS.innerText = '🔍 Capturing face...';
  const descriptor = await captureDescriptor();
  if (!descriptor) return alert('❌ No face detected. Try again.');

  STATUS.innerText = '📡 Sending registration...';
  const res = await postAPI({
    action: 'addEmployee',
    payload: { empId, name, category, department, descriptor }
  });

  if (res && res.status === 'ok') alert('✅ Employee registered successfully.');
  STATUS.innerText = '✅ Registration complete.';
}

/* ==========================================================
   Mark Attendance
========================================================== */
async function markAttendance() {
  STATUS.innerText = '🔍 Capturing face...';
  const descriptor = await captureDescriptor();
  if (!descriptor) return alert('❌ No face detected.');

  STATUS.innerText = '📡 Sending for identification...';
  const res = await postAPI({
    action: 'identify',
    payload: { descriptor, image: getFrameBase64() }
  });

  if (res && res.found) {
    alert('✅ Attendance marked for ' + res.name);
    STATUS.innerText = '✅ Attendance marked for ' + res.name;
  } else {
    STATUS.innerText = '❌ No match found. Please register first.';
  }
}
