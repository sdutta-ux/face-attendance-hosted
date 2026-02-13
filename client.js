// client.js - Mobile-friendly Face Attendance frontend
const VIDEO = document.getElementById('video');
const STATUS = document.getElementById('status');

// Replace with your deployed Apps Script Web App URL
const CONFIG = {
  EXEC_URL: "YOUR_APPS_SCRIPT_EXEC_URL_HERE"
};

/* ===============================
   POST JSON TO SERVER
=============================== */
async function postAPI(payload) {
  const res = await fetch(CONFIG.EXEC_URL, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

/* ===============================
   INITIALIZE PAGE
=============================== */
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.addEventListener('click', startCameraFlow);

  const regBtn = document.getElementById('registerBtn');
  if (regBtn) regBtn.addEventListener('click', registerEmployee);

  const markBtn = document.getElementById('markBtn');
  if (markBtn) markBtn.addEventListener('click', markAttendance);

  STATUS.innerText = '📸 Tap "Start Camera" to begin.';
});

/* ===============================
   START CAMERA FLOW
=============================== */
async function startCameraFlow() {
  try {
    STATUS.innerText = "📸 Requesting camera permission...";

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    VIDEO.srcObject = stream;
    await VIDEO.play();
    STATUS.innerText = "✅ Camera allowed! Loading face recognition models...";

    const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/";
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);

    STATUS.innerText = "🎯 Camera & models ready! You can Register or Mark Attendance.";
  } catch (err) {
    console.error("Camera start error:", err);
    STATUS.innerText =
      "❌ Camera access denied or unavailable.\n\n" +
      "👉 Fix:\n1️⃣ Open browser settings → Site Settings → Camera\n" +
      "2️⃣ Find your site → Allow camera\n3️⃣ Reload the page and tap Start Camera.";
  }
}

/* ===============================
   CAPTURE FACE DESCRIPTOR
=============================== */
async function captureDescriptor() {
  try {
    // Wait 1 second for camera exposure to stabilize
    await new Promise(r => setTimeout(r, 1000));

    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 128,       // mobile-friendly
      scoreThreshold: 0.35  // easier to detect faces
    });

    const detection = await faceapi
      .detectSingleFace(VIDEO, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      STATUS.innerText = "⚠️ No face detected — make sure your face is visible in camera.";
      alert("No face detected. Ensure good lighting and your face is centered.");
      return null;
    }

    STATUS.innerText = "✅ Face captured successfully!";
    return Array.from(detection.descriptor);
  } catch (err) {
    console.error("Face detection error:", err);
    STATUS.innerText = "❌ Face capture failed. Check console for errors.";
    return null;
  }
}

/* ===============================
   CAPTURE CURRENT FRAME BASE64
=============================== */
function getFrameBase64() {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.videoWidth;
  canvas.height = VIDEO.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(VIDEO, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg');
}

/* ===============================
   REGISTER EMPLOYEE
=============================== */
async function registerEmployee() {
  const empId = prompt('Employee ID (e.g. E001):');
  if (!empId) return;
  const name = prompt('Full name:');
  if (!name) return;
  const category = prompt('Category (Rolled/Unrolled/Contract):', 'Rolled');
  const department = prompt('Department:', 'General');

  STATUS.innerText = '🔍 Capturing face...';
  const descriptor = await captureDescriptor();
  if (!descriptor) return;

  STATUS.innerText = '📡 Sending registration...';
  const res = await postAPI({
    action: 'addEmployee',
    payload: { empId, name, category, department, descriptor }
  });

  if (res && res.status === 'ok') alert('✅ Employee registered successfully.');
  STATUS.innerText = '✅ Registration complete.';
}

/* ===============================
   MARK ATTENDANCE
=============================== */
async function markAttendance() {
  STATUS.innerText = '🔍 Capturing face...';
  const descriptor = await captureDescriptor();
  if (!descriptor) return;

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
