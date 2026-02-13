// client.js - Mobile-ready continuous face detection

const VIDEO = document.getElementById('video');
const STATUS = document.getElementById('status');

let canvas, displaySize;

// ------------------------- POST helper
async function postAPI(payload) {
  const res = await fetch(CONFIG.EXEC_URL, {
    method:'POST',
    mode:'cors',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  return res.json();
}

// ------------------------- Page ready
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('startBtn').addEventListener('click', startCameraFlow);
  document.getElementById('registerBtn').addEventListener('click', registerEmployee);
  document.getElementById('markBtn').addEventListener('click', markAttendance);
  STATUS.innerText = '📸 Tap "Start Camera" to begin';
});

// ------------------------- Start Camera + Continuous Detection
async function startCameraFlow() {
  try {
    STATUS.innerText = "📸 Requesting camera permission...";
    const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user' }, audio:false });
    VIDEO.srcObject = stream;
    await VIDEO.play();

    STATUS.innerText = "🔄 Loading face recognition models...";
    const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/";
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);

    STATUS.innerText = "🎯 Camera & models ready! Detecting face...";

    // Canvas overlay for live detection
    canvas = faceapi.createCanvasFromMedia(VIDEO);
    document.getElementById('camera-area').appendChild(canvas);
    displaySize = { width: VIDEO.videoWidth, height: VIDEO.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    // Continuous detection every 300ms
    setInterval(async () => {
      const detections = await faceapi.detectAllFaces(VIDEO, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);

      if(detections.length>0){
        const resized = faceapi.resizeResults(detections, displaySize);
        faceapi.draw.drawDetections(canvas,resized);
        STATUS.innerText = "✅ Face detected! Ready to Register or Mark Attendance.";
      } else {
        STATUS.innerText = "🔍 Looking for a face...";
      }
    }, 300);

  } catch(err){
    console.error(err);
    STATUS.innerText = "❌ Camera error: " + err;
  }
}

// ------------------------- Capture Face Descriptor
async function captureDescriptor() {
  const detections = await faceapi.detectSingleFace(VIDEO,new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  if(!detections) return null;
  return Array.from(detections.descriptor);
}

// ------------------------- Get Base64 frame
function getFrameBase64(){
  const canvasTemp = document.createElement('canvas');
  canvasTemp.width = VIDEO.videoWidth;
  canvasTemp.height = VIDEO.videoHeight;
  const ctx = canvasTemp.getContext('2d');
  ctx.drawImage(VIDEO,0,0,canvasTemp.width,canvasTemp.height);
  return canvasTemp.toDataURL('image/jpeg');
}

// ------------------------- Register Employee
async function registerEmployee(){
  const empId = prompt('Employee ID (E001):');
  if(!empId) return;
  const name = prompt('Full name:');
  if(!name) return;
  const category = prompt('Category (Rolled/Unrolled/Contract)','Rolled');
  const department = prompt('Department','General');

  STATUS.innerText = '🔍 Capturing face...';
  const descriptor = await captureDescriptor();
  if(!descriptor) return alert('❌ No face detected! Try again.');

  STATUS.innerText = '📡 Sending registration...';
  const res = await postAPI({ action:'addEmployee', payload:{ empId,name,category,department,descriptor } });
  if(res && res.status==='ok') alert('✅ Employee registered successfully');
  STATUS.innerText = '✅ Registration complete';
}

// ------------------------- Mark Attendance
async function markAttendance(){
  STATUS.innerText = '🔍 Capturing face...';
  const descriptor = await captureDescriptor();
  if(!descriptor) return alert('❌ No face detected!');

  STATUS.innerText = '📡 Sending for identification...';
  const res = await postAPI({ action:'identify', payload:{ descriptor, image:getFrameBase64() } });
  if(res && res.found){
    alert('✅ Attendance marked for ' + res.name);
    STATUS.innerText = '✅ Attendance marked for ' + res.name;
  } else {
    STATUS.innerText = '❌ No match found. Please register first.';
  }
}
