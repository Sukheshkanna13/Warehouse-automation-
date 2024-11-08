document.addEventListener('DOMContentLoaded', async () => {
    const video = document.getElementById('cameraFeed');
    const canvas = document.getElementById('processedImage');
    const context = canvas.getContext('2d');
    const objectList = document.getElementById('objectList');
    const graspPointElement = document.getElementById('graspPoint');
    const captureBtn = document.getElementById('captureBtn');
    const toggleCameraBtn = document.getElementById('toggleCameraBtn');
    const uploadImage = document.getElementById('uploadImage');
    const uploadBtn = document.getElementById('uploadBtn');
    const remainingSpaceElement = document.getElementById('remainingSpace');
    let model;

    // Load COCO-SSD model for object detection
    model = await cocoSsd.load();

    // Access the camera
    let stream;
    function startCamera() {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(s => {
                stream = s;
                video.srcObject = stream;
            })
            .catch(err => console.error("Error accessing the camera: ", err));
    }

    // Stop the camera feed
    function stopCamera() {
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            stream = null;
        }
    }

    startCamera();

    // Capture image from the camera and classify it
    captureBtn.addEventListener('click', async () => {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        await classifyImage();
    });

    // Upload and classify the image
    uploadBtn.addEventListener('click', async () => {
        const file = uploadImage.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = async function() {
                    context.drawImage(img, 0, 0, canvas.width, canvas.height);
                    await classifyImage();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Classification function
    async function classifyImage() {
        const predictions = await model.detect(canvas);

        // Clear the object list
        objectList.innerHTML = '';
        let graspPoints = [];
        let usedArea = 0;
        const totalWarehouseArea = 100000; // Example warehouse area in square pixels

        predictions.forEach((p, index) => {
            // Calculate area of detected object
            let width = p.bbox[2];
            let height = p.bbox[3];
            let area = width * height;
            usedArea += area;

            // Display object details
            let li = document.createElement('li');
            li.textContent = `Object ${index + 1}: ${p.class} (Area: ${area.toFixed(2)}px², Score: ${(p.score * 100).toFixed(2)}%)`;
            objectList.appendChild(li);

            // Grasp point calculation (center of the bounding box)
            let cx = Math.round(p.bbox[0] + width / 2);
            let cy = Math.round(p.bbox[1] + height / 2);
            graspPoints.push({ x: cx, y: cy });

            // Draw bounding box and grasp point
            context.beginPath();
            context.rect(p.bbox[0], p.bbox[1], width, height);
            context.lineWidth = 2;
            context.strokeStyle = 'blue';
            context.stroke();

            context.beginPath();
            context.arc(cx, cy, 5, 0, 2 * Math.PI);
            context.fillStyle = 'green';
            context.fill();
        });

        // Calculate and display remaining warehouse space
        const remainingSpace = totalWarehouseArea - usedArea;
        remainingSpaceElement.textContent = `Remaining Warehouse Space: ${remainingSpace.toFixed(2)}px²`;

        // Display the first object's grasp point
        if (graspPoints.length > 0) {
            graspPointElement.textContent = `Suggested grasp point at (${graspPoints[0].x}, ${graspPoints[0].y}) for first detected object.`;
        } else {
            graspPointElement.textContent = 'No objects detected.';
        }
    }

    // Turn off camera
    toggleCameraBtn.addEventListener('click', () => {
        if (stream) {
            stopCamera();
            toggleCameraBtn.textContent = 'Turn On Camera';
        } else {
            startCamera();
            toggleCameraBtn.textContent = 'Turn Off Camera';
        }
    });
});
