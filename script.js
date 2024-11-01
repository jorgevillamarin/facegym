let labeledDescriptors = [];  // Almacena los descriptores etiquetados para rostros conocidos
let isDetecting = true;       // Controla cuándo se están detectando rostros

// Cargar los modelos de Face API.js
async function loadModels() {
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model';
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    console.log("Modelos cargados");
}

// Iniciar el video
async function startVideo() {
    const video = document.getElementById('video');
    const videoDevices = await getVideoDevices();
    const selectedDeviceId = videoDevices[videoDevices.length - 1]?.deviceId;

    if (!selectedDeviceId) {
        console.error("No se encontró ninguna cámara.");
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: selectedDeviceId } } })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => console.error("Error al acceder a la cámara: ", err));
}

// Obtener dispositivos de video
async function getVideoDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
}

// Función para cargar rostros guardados en el servidor
async function loadLabeledDescriptors() {
    const response = await fetch('http://localhost:3000/load-faces');
    const faces = await response.json();

    // Convertir descriptores JSON a LabeledFaceDescriptors
    labeledDescriptors = faces.map(data => 
        new faceapi.LabeledFaceDescriptors(
            data.label,
            [new Float32Array(data.descriptors)]
        )
    );
}

// Función para guardar el rostro con el nombre ingresado
async function saveFace() {
    const name = document.getElementById("nameInput").value.trim();
    const video = document.getElementById('video');

    if (!name) {
        alert("Por favor, ingrese un nombre para el rostro.");
        return;
    }

    isDetecting = false;  // Pausar detección para capturar el rostro actual

    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    if (detection) {
        const newFace = {
            label: name,
            descriptors: Array.from(detection.descriptor)  // Convertir el descriptor a Array para JSON
        };

        // Enviar el nuevo rostro al servidor para guardar
        await fetch('http://localhost:3000/save-face', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newFace)
        });

        alert(`Rostro guardado como ${name}`);
        document.getElementById("nameInput").value = "";  // Limpiar el campo de entrada

        // Recargar los rostros guardados en el servidor
        await loadLabeledDescriptors();
    } else {
        alert("No se detectó ningún rostro. Intente nuevamente.");
    }

    isDetecting = true;  // Reanudar la detección
}

// Detectar y reconocer rostros en tiempo real
async function recognizeFaces() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const displaySize = { width: video.width, height: video.height };

    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        if (isDetecting) {
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();

            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

            // Si existen rostros conocidos, intenta reconocerlos
            if (labeledDescriptors.length > 0) {
                const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6); // Ajusta la tolerancia si es necesario
                resizedDetections.forEach(detection => {
                    const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
                    const box = detection.detection.box;

                    // Dibujar el cuadro alrededor del rostro
                    const drawBox = new faceapi.draw.DrawBox(box, { label: bestMatch.toString() });
                    drawBox.draw(canvas);

                    // Superponer el nombre sobre el cuadro de video
                    const context = canvas.getContext('2d');
                    context.font = "18px Arial";
                    context.fillStyle = "red";
                    context.fillText(bestMatch.toString(), box.x, box.y - 10);
                });
            }
        }
    }, 100);
}

// Inicializar la aplicación
loadModels().then(() => {
    loadLabeledDescriptors();  // Cargar rostros conocidos desde el archivo JSON en el servidor
    startVideo().then(recognizeFaces);
});

// Asignar el evento al botón de guardar rostro
document.getElementById("saveFaceButton").addEventListener("click", saveFace);
