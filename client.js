const VIDEO = document.getElementById('video');
const STATUS = document.getElementById('status');

// Replace with your Apps Script Web App URL
const CONFIG = {
  EXEC_URL: "YOUR_APPS_SCRIPT_EXEC_URL_HERE"
};

// Add user gesture to start camera
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('startBtn').addEventListener('click', startCameraFlow);
  document.getElementById('registerBtn').addEventListener('click', registerEmployee);
  document.getElementById('markBtn').addEventListener('click', markAttendance);
  STATUS.innerText = '📸 Tap "Start Camera" to begin.';
});

async function startCameraFlow() {
  try {
    STATUS.innerText = "📸 Requesting camera permission...";
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });
    VIDEO.srcObject = stream;
    await VIDEO.play();
    STATUS.innerText = "✅ Camera started! Loading face recognition models...";

    const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/";
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    STATUS.innerText = "🎯 Camera & models ready! You can Register or Mark Attendance.";
  } catch (err) {
    console.error(err);
    STATUS.innerText = "❌ Camera access denied. Ensure you tap Start Camera and allow permissions in browser settings.";
  }
}

// Face capture functions
async function captureDescriptor() {
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 128, scoreThreshold: 0.35 });
  const detection = await faceapi.detectSingleFace(VIDEO, options).withFaceLandmarks().withFaceDescriptor();
  if (!detection) { alert("No face detected. Ensure your face is centered and well-lit."); return null; }
  return Array.from(detection.descriptor);
}

function getFrameBase64() {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.videoWidth;
  canvas.height = VIDEO.videoHeight;
  canvas.getContext('2d').drawImage(VIDEO, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg');
}

// Post to Apps Script
async function postAPI(payload) {
  const res = await fetch(CONFIG.EXEC_URL, {
    method: 'POST', mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

// Register
async function registerEmployee() {
  const empId = prompt("Employee ID:");
  if (!empId) return;
  const name = prompt("Full Name:");
  if (!name) return;
  const descriptor = await captureDescriptor();
  if (!descriptor) return;
  const res = await postAPI({ action:'addEmployee', payload:{ empId, name, descriptor } });
  if(res && res.status==='ok') alert("✅ Employee registered.");
}

// Mark Attendance
async function markAttendance() {
  const descriptor = await captureDescriptor();
  if (!descriptor) return;
  const res = await postAPI({ action:'identify', payload:{ descriptor, image:getFrameBase64() } });
  if(res && res.found) alert("✅ Attendance marked for " + res.name);
  else alert("❌ No match found. Please register first.");
}
