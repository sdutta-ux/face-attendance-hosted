// client.js - Hosted frontend (mobile camera fixed)
const VIDEO = document.getElementById('video');
const STATUS = document.getElementById('status');

async function postAPI(payload) {
  const res = await fetch(CONFIG.EXEC_URL, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('startBtn').addEventListener('click', startCameraFlow);
  document.getElementById('registerBtn').addEventListener('click', registerEmployee);
  document.getElementById('markBtn').addEventListener('click', markAttendance);
  STATUS.innerText = '📸 Tap “Start Camera” to begin.';
});

/* ==========================================================
   CAMERA START FUNCTION (FORCED PERMISSION VERSION)
   ========================================================== */
async function startCameraFlow() {
  try {
    STATUS.innerText = "📸 Checking camera permission...";

    // ✅ Force Chrome to show permission prompt
    await navigator.mediaDevices.getUserMedia({ video: true });

    STATUS.innerText = "🔄 Loading face recognition models...";
    const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/";
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);

    STATUS.innerText = "📸 Starting camera stream...";
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    VIDEO.srcObject = stream;
    await VIDEO.play();
    STATUS.innerText = "✅ Camera started successfully! Ready for face capture.";
  } catch (err) {
    console.error("Camera error:", err);
    STATUS.innerText =
      "❌ Camera access denied or unavailable.\n\n👉 Fix:\n" +
      "1️⃣ Tap the lock icon (🔒) in the address bar.\n" +
      "2️⃣ Go to 'Permissions' → Camera → Allow.\n" +
      "3️⃣ Reload this page.";
  }
}
async function checkCameraPermission() {
  try {
    const result = await navigator.permissions.query({ name: 'camera' });
    alert('Camera permission: ' + result.state);
  } catch (e) {
    alert('Camera permission API not supported.');
  }
}

/* ==========================================================
   LOAD MODELS
   ========================================================== */
async function loadModels() {
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
  ]);
}

/* ==========================================================
   CAPTURE FACE DESCRIPTOR
   ========================================================== */
async function captureDescriptor() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = VIDEO.videoWidth;
    canvas.height = VIDEO.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(VIDEO, 0, 0, canvas.width, canvas.height);
    const detection = await faceapi
      .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) return null;
    return Array.from(detection.descriptor);
  } catch (err) {
    console.error(err);
    return null;
  }
}

/* ==========================================================
   CAPTURE CURRENT FRAME BASE64
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
   REGISTER EMPLOYEE
   ========================================================== */
async function registerEmployee() {
  const empId = prompt('Employee ID (e.g. E001):');
  if (!empId) return;
  const name = prompt('Full name:');
  if (!name) return;
  const category = prompt('Category (Rolled/Unrolled/Contract):', 'Rolled');
  const department = prompt('Department:', 'General');

  STATUS.innerText = '🔍 Capturing face...';
  const descriptor = await captureDescriptor();
  if (!descriptor) return alert('No face detected. Try again.');

  STATUS.innerText = '📡 Sending registration...';
  const res = await postAPI({
    action: 'addEmployee',
    payload: { empId, name, category, department, descriptor }
  });
  console.log(res);
  if (res && res.status === 'ok') alert('✅ Employee registered successfully.');
  STATUS.innerText = '✅ Registration complete.';
}

/* ==========================================================
   MARK ATTENDANCE
   ========================================================== */
async function markAttendance() {
  STATUS.innerText = '🔍 Capturing face...';
  const descriptor = await captureDescriptor();
  if (!descriptor) return alert('No face detected.');

  STATUS.innerText = '📡 Sending for identification...';
  const res = await postAPI({
    action: 'identify',
    payload: { descriptor, image: getFrameBase64() }
  });
  console.log(res);
  if (res && res.found) {
    alert('✅ Attendance marked for ' + res.name);
    STATUS.innerText = '✅ Attendance marked for ' + res.name;
  } else {
    STATUS.innerText = '❌ No match found. Please register first.';
  }
}
