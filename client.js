// client.js - Hosted frontend (mobile + camera + face-api)
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

async function startCameraFlow() {
  try {
    STATUS.innerText = "📸 Requesting camera permission...";
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
    VIDEO.srcObject = stream;
    await VIDEO.play();
    STATUS.innerText = "✅ Camera allowed! Loading models...";
    const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/";
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    STATUS.innerText = "🎯 Camera & models ready! You can Register or Mark Attendance.";
  } catch (err) {
    console.error(err);
    STATUS.innerText =
      "❌ Camera access denied.\n1️⃣ Allow camera in browser/site settings.\n2️⃣ Reload and tap Start Camera again.";
  }
}

async function captureDescriptor() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = VIDEO.videoWidth;
    canvas.height = VIDEO.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(VIDEO, 0, 0, canvas.width, canvas.height);
    const detection = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks().withFaceDescriptor();
    if (!detection) return null;
    return Array.from(detection.descriptor);
  } catch (err) { console.error(err); return null; }
}

function getFrameBase64() {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.videoWidth;
  canvas.height = VIDEO.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(VIDEO, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg');
}

async function registerEmployee() {
  const empId = prompt('Employee ID (e.g. E001):'); if (!empId) return;
  const name = prompt('Full name:'); if (!name) return;
  const category = prompt('Category (Rolled/Unrolled/Contract):','Rolled');
  const department = prompt('Department:','General');

  STATUS.innerText = '🔍 Capturing face...';
  const descriptor = await captureDescriptor();
  if (!descriptor) return alert('No face detected.');

  STATUS.innerText = '📡 Sending registration...';
  const res = await postAPI({ action:'addEmployee', payload:{ empId, name, category, department, descriptor }});
  if (res && res.status==='ok') alert('✅ Employee registered successfully.');
  STATUS.innerText = '✅ Registration complete.';
}

async function markAttendance() {
  STATUS.innerText = '🔍 Capturing face...';
  const descriptor = await captureDescriptor();
  if (!descriptor) return alert('No face detected.');

  STATUS.innerText = '📡 Sending for identification...';
  const res = await postAPI({ action:'identify', payload:{ descriptor, image:getFrameBase64() }});
  if (res && res.found) alert('✅ Attendance marked for ' + res.name);
  STATUS.innerText = res && res.found ? '✅ Attendance marked for ' + res.name : '❌ No match found. Please register first.';
}
