// client.js - Hosted frontend (mobile camera + fixed face detection)
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
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.addEventListener('click', startCameraFlow);
  
  const registerBtn = document.getElementById('registerBtn');
  if (registerBtn) registerBtn.addEventListener('click', registerEmployee);

  const markBtn = document.getElementById('markBtn');
  if (markBtn) markBtn.addEventListener('click', markAttendance);

  STATUS.innerText = '📸 Tap “Start Camera” to begin.';
});

/* ==========================================================
   CAMERA START FUNCTION
   ========================================================== */
async function startCameraFlow() {
  try {
    STATUS.innerText = "📸 Requesting camera permission...";

    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    VIDEO.srcObject = stream;

    // Wait until video is ready
    await new Promise(resolve => {
      if (VIDEO.readyState >= 2) resolve();
      else VIDEO.onloadeddata = () => resolve();
    });

    await VIDEO.play();
    STATUS.innerText = "✅ Camera allowed! Loading face recognition models...";

    // Load face-api.js models
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
      "❌ Camera access denied or unavailable.\n\n👉 Fix:\n" +
      "1️⃣ Open browser settings → Camera\n" +
      "2️⃣ Allow camera for this site\n" +
      "3️⃣ Reload page and tap Start Camera again.";
  }
}

/* ==========================================================
   CAPTURE FACE DESCRIPTOR
   ========================================================== */
async function captureDescriptor() {
  try {
    // Ensure video is ready
    await new Promise(resolve => {
      if (VIDEO.readyState >= 2) resolve();
      else VIDEO.onloadeddata = () => resolve();
    });

    const canvas = document.createElement('canvas');
    canvas.width = VIDEO.videoWidth;
    canvas.height = VIDEO.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(VIDEO, 0, 0, canvas.width, canvas.height);

    // Detect face with higher input size for mobile
    const detection = await faceapi
      .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;
    return Array.from(detection.descriptor);

  } catch (err) {
    console.error("Face capture error:", err);
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
  if (!descriptor) return alert('⚠️ No face detected. Try again.');

  STATUS.innerText = '📡 Sending registration...';
  const res = await postAPI({
    action: 'addEmployee',
    payload: { empId, name, category, department, descriptor }
  });

  if (res && res.status === 'ok') alert('✅ Employee registered successfully.');
  STATUS.innerText = '✅ Registration complete.';
}

/* ==========================================================
   MARK ATTENDANCE
   ========================================================== */
async function markAttendance() {
  STATUS.innerText = '🔍 Capturing face...';
  const descriptor = await captureDescriptor();
  if (!descriptor) return alert('⚠️ No face detected.');

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
