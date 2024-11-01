// Cargar imágenes etiquetadas y crear descriptores
async function loadLabeledImages() {
    const labels = ['Juan', 'Maria']; // Nombres de las personas conocidas
    return Promise.all(
        labels.map(async (label) => {
            const img = await faceapi.fetchImage(`labeled_images/${label}.jpg`);
            const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
            return new faceapi.LabeledFaceDescriptors(label, [detections.descriptor]);
        })
    );
}

// Función para comparar rostros detectados con los rostros conocidos
async function recognizeWithKnownFaces() {
    const labeledDescriptors = await loadLabeledImages();
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        resizedDetections.forEach(detection => {
            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
            const box = detection.detection.box;
            const drawBox = new faceapi.draw.DrawBox(box, { label: bestMatch.toString() });
            drawBox.draw(canvas);
        });
    }, 100);
}
