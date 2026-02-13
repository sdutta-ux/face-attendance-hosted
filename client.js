// =============================
// Employee Attendance Client JS
// =============================
let video = document.getElementById('video');
let overlay = document.getElementById('overlay');
let context = overlay.getContext('2d');
let faceMatcher;
let detections = [];
let descriptors = [];

async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
  await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
  document.getElementById('status').innerText = 'Status: Models loaded';
}

async function startCamera() {
  await loadModels();
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => video.srcObject = stream)
    .catch(err => console.error(err));
}

video.addEventListener('play', () => {
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(overlay, displaySize);

  setInterval(async () => {
    const detectionsData = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks().withFaceDescriptors();

    context.clearRect(0, 0, overlay.width, overlay.height);

    if (detectionsData.length > 0) {
      detectionsData.forEach(fd => {
        const box = fd.detection.box;
        context.strokeStyle = 'green';
        context.lineWidth = 2;
        context.strokeRect(box.x, box.y, box.width, box.height);
      });
      document.getElementById('status').innerText = 'Status: Face detected';
      detections = detectionsData;
    } else {
      document.getElementById('status').innerText = 'Status: No face detected';
      detections = [];
    }
  }, 200);
});

async function captureDescriptor() {
  if (!detections.length) return null;
  return detections[0].descriptor;
}

document.getElementById('startCamera').addEventListener('click', startCamera);

document.getElementById('register').addEventListener('click', async () => {
  const name = prompt('Enter Employee Name:');
  if (!name) return alert('Name is required');
  const descriptor = await captureDescriptor();
  if (!descriptor) return alert('No face detected!');

  const payload = { name, descriptor: Array.from(descriptor) };
  fetch(EXEC_URL + '?action=register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => alert(data.message))
  .catch(err => console.error(err));
});

document.getElementById('markAttendance').addEventListener('click', async () => {
  const descriptor = await captureDescriptor();
  if (!descriptor) return alert('No face detected!');

  const payload = { descriptor: Array.from(descriptor) };
  fetch(EXEC_URL + '?action=mark', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => alert(data.message))
  .catch(err => console.error(err));
});
