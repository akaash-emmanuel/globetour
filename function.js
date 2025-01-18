hands.onResults((results) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      // Get thumb tip (landmark 4) and index finger tip (landmark 8)
      const thumbTip = landmarks[4];
      const indexFingerTip = landmarks[8];
      // Calculate the distance between thumb and index finger
      const distance = Math.sqrt(
        Math.pow(thumbTip.x - indexFingerTip.x, 2) +
        Math.pow(thumbTip.y - indexFingerTip.y, 2)
      );
      // Zoom in/out based on the distance
      if (previousDistance !== 0) {
        const deltaDistance = distance - previousDistance;
        // Adjust camera zoom based on the change in distance
        if (deltaDistance > 0.02) { // Fingers moving apart (zoom in)
          camera.position.z -= 10; // Adjust zoom speed
          if (camera.position.z < controls.minDistance) {
            camera.position.z = controls.minDistance;
          }
        } else if (deltaDistance < -0.02) { // Fingers moving closer (zoom out)
          camera.position.z += 10; // Adjust zoom speed
          if (camera.position.z > controls.maxDistance) {
            camera.position.z = controls.maxDistance;
          }
        }
      }
      // Update previous distance
      previousDistance = distance;
    } else {
      // Reset previous distance if no hand is detected
      previousDistance = 0;
    }
  });
  const cameraElement = new Camera(document.getElementById("input_video"), {
    onFrame: async () => {
      await hands.send({ image: cameraElement.video });
    },
    width: 640,
    height: 480,
  });
  cameraElement.start();
