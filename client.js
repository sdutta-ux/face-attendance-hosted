// ==============================
// client.js - Auto Face Attendance
// ==============================

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

// Start camera + auto detect
async function startCamera() {
  try {
    STATUS.innerText = '📸 Starting camera...';
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    VIDEO.srcObject = stream;
    await VIDEO.play();

    STATUS.innerText = '🔄 Loading face recognition models...';
    const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/";
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);

    STATUS.innerText = '🎯 Camera ready. Detecting face...';
    autoDetectFace(); // start automatic detection
  } catch (err) {
    console.error(err);
    STATUS.innerText = '❌ Camera access denied. Enable camera in site settings.';
  }
}

// Auto detect face every 1 second
async function autoDetectFace() {
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.4 });
  
  setInterval(async () => {
    const detection = await faceapi.detectSingleFace(VIDEO, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      STATUS.innerText = '✅ Face detected. Sending for attendance...';
      const descriptor = Array.from(detection.descriptor);
      const image = getFrameBase64();

      const res = await postAPI({ action: 'identify', payload: { descriptor, image } });
      if (res && res.found) {
        STATUS.innerText = `✅ Attendance saved for ${res.name} (Card No: ${res.empId})`;
      } else {
        STATUS.innerText = '❌ Face not recognized. Please register first.';
      }
    } else {
      STATUS.innerText = '🔍 Detecting face...';
    }
  }, 1000); // every 1 second
}

// Capture current video frame as Base64
function getFrameBase64() {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.videoWidth;
  canvas.height = VIDEO.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(VIDEO, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg');
}

// ==============================
// Button events
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('startBtn').addEventListener('click', startCamera);
});
