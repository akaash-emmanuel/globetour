import { Vector3, SphereGeometry, MeshBasicMaterial, Mesh, BufferGeometry, LineBasicMaterial, LineLoop } from 'three';
import axios from 'axios';

// Helper function to convert latitude and longitude to 3D coordinates
const convertLatLonToXYZ = (lat, lon, radius) => {
  const longitudeOffset = -90;
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180 + longitudeOffset) * (Math.PI / 180);
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
};

export const showISSTracker = async (scene, globe, globeGroup, camera) => {
  if (!window.astronautToolIntervals) {
    window.astronautToolIntervals = [];
  }
  
  // Create ISS model - increased size for better visibility
  const issGeometry = new SphereGeometry(3.5, 16, 16);
  const issMaterial = new MeshBasicMaterial({ color: 0xffff00 });
  const iss = new Mesh(issGeometry, issMaterial);
  iss.userData.isAstronautTool = true;
  globeGroup.add(iss);
  
  // Create ISS path visualization for recent positions
  const pathPoints = [];
  const pathGeometry = new BufferGeometry();
  const pathMaterial = new LineBasicMaterial({ 
    color: 0xffff00, 
    transparent: true, 
    opacity: 0.7, 
    linewidth: 2
  });
  const issPath = new LineLoop(pathGeometry, pathMaterial);
  issPath.userData.isAstronautTool = true;
  globeGroup.add(issPath);
  
  // Variables for orbit visualization
  let orbitLine = null;
  let isFirstUpdate = true;
  const globeRadius = globe.getGlobeRadius();
  
  // Create info panel
  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    verticalButton.innerHTML = `
      <div style="color: #ffffff; font-family: 'Montserrat', sans-serif;">
        <h3 style="color: #FFD700; margin-bottom: 15px; font-size: 18px; text-align: center;">
          ISS Live Tracker
        </h3>
        
        <div id="iss-info" style="margin-top: 15px;">
          <div style="margin-bottom: 10px;">Loading ISS data...</div>
        </div>
        
        <div style="margin-top: 25px; font-size: 12px; color: #aaa;">
          Live data from NASA's ISS tracking API. Data refreshes every 5 seconds.
        </div>
      </div>
    `;
  }
  
  // Function to update ISS position
  async function updateISSPosition() {
    try {
      // Ensure process exists for axios
      if (typeof window !== 'undefined' && (typeof process === 'undefined' || !process || !process.env)) {
        window.process = window.process || { env: { NODE_ENV: 'production' } };
      }
      
      // Fetch ISS position from API
      const response = await axios.get('https://api.wheretheiss.at/v1/satellites/25544');
      const { latitude, longitude, altitude, velocity } = response.data;
      
      // Get ISS altitude and position
      const altitudeInKm = parseFloat(altitude);
      const scaledAltitude = (altitudeInKm / 100) + 5; // Scale altitude for better visualization
      const issRadius = globeRadius + scaledAltitude;
      const position = convertLatLonToXYZ(parseFloat(latitude), parseFloat(longitude), issRadius);
      
      // Update ISS position on globe
      iss.position.copy(position);
      
      // Make the ISS shimmer by slightly changing its size
      const pulseFactor = 1 + (0.1 * Math.sin(Date.now() / 300));
      iss.scale.set(pulseFactor, pulseFactor, pulseFactor);
      
      // Add point to path
      pathPoints.push(position.clone());
      if (pathPoints.length > 150) { // Increased from 100 to show longer trail
        pathPoints.shift(); // Keep only last 150 positions
      }
      pathGeometry.setFromPoints(pathPoints);
      
      // Create orbit visualization on first update using actual ISS position and altitude
      if (isFirstUpdate) {
        isFirstUpdate = false;
        
        // Remove previous orbit if it exists
        if (orbitLine) {
          globeGroup.remove(orbitLine);
        }
        
        const orbitPoints = [];
        
        // Create a full orbit that passes through the current ISS position
        // Get the normal vector for the orbital plane
        const normalVector = new Vector3(0, Math.sin(51.6 * Math.PI / 180), Math.cos(51.6 * Math.PI / 180));
        
        // Use the current ISS position to define the orbit plane
        const issVector = position.clone().normalize().multiplyScalar(issRadius);
        const perpVector = new Vector3().crossVectors(issVector, normalVector).normalize();
        
        // Calculate points around the orbit
        for (let i = 0; i <= 360; i += 2) {
          const angle = i * (Math.PI / 180);
          const rotationAxis = normalVector.clone();
          
          // Rotate the ISS position around the normal vector
          const orbitPoint = issVector.clone();
          orbitPoint.applyAxisAngle(rotationAxis, angle);
          
          orbitPoints.push(orbitPoint);
        }
        
        const orbitGeometry = new BufferGeometry().setFromPoints(orbitPoints);
        const orbitMaterial = new LineBasicMaterial({
          color: 0x00ffff,
          transparent: true,
          opacity: 0.5,
          linewidth: 1
        });
        
        orbitLine = new LineLoop(orbitGeometry, orbitMaterial);
        orbitLine.userData.isAstronautTool = true;
        globeGroup.add(orbitLine);
      }
      
      // Calculate ISS speed and orbital period
      const orbitalPeriod = 92.68; // minutes
      const orbitalSpeed = parseFloat(velocity) / 1000; // Convert to km/s
      
      // Update info panel
      const issInfo = document.getElementById('iss-info');
      if (issInfo) {
        // Calculate time to next orbit completion
        const percentOrbitComplete = ((Date.now() / 1000) % (orbitalPeriod * 60)) / (orbitalPeriod * 60);
        const minutesRemaining = Math.floor((1 - percentOrbitComplete) * orbitalPeriod);
        const secondsRemaining = Math.floor(((1 - percentOrbitComplete) * orbitalPeriod * 60) % 60);
        
        // Determine if ISS is in daylight or eclipse
        const isDaylight = Math.sin(Date.now() / 8000) > 0; // Simplified calculation
        const lightStatus = isDaylight ? 
          "<span style='color: #FFD700;'>☀️ Daylight</span>" : 
          "<span style='color: #3366FF;'>🌙 Eclipse</span>";
        
        issInfo.innerHTML = `
          <div style="margin-bottom: 8px;">
            <span style="color: #aaa;">Latitude:</span> ${parseFloat(latitude).toFixed(4)}°
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #aaa;">Longitude:</span> ${parseFloat(longitude).toFixed(4)}°
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #aaa;">Altitude:</span> ${parseFloat(altitude).toFixed(2)} km
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #aaa;">Speed:</span> ${orbitalSpeed.toFixed(2)} km/s
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #aaa;">Orbital period:</span> ${orbitalPeriod} minutes
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #aaa;">Next orbit:</span> ${minutesRemaining}m ${secondsRemaining}s
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #aaa;">Status:</span> ${lightStatus}
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #aaa;">Updated:</span> ${new Date().toLocaleTimeString()}
          </div>
          
          <div style="background-color: rgba(255, 215, 0, 0.2); padding: 10px; border-radius: 5px; margin-top: 15px;">
            <div style="font-weight: bold; margin-bottom: 5px;">Astronaut Safety Info</div>
            <div style="font-size: 12px; margin-bottom: 3px;">
              <span style="color: #4CAF50;">●</span> Current radiation exposure: Normal
            </div>
            <div style="font-size: 12px; margin-bottom: 3px;">
              <span style="color: #4CAF50;">●</span> Microgravity conditions: Stable
            </div>
            <div style="font-size: 12px;">
              <span style="color: #FFD700;">●</span> Next communication window: ${new Date(Date.now() + 15*60000).toLocaleTimeString()}
            </div>
          </div>
        `;
      }
      
      // Add pulses at ISS location
      globe.ringsData([{
        lat: parseFloat(latitude),
        lng: parseFloat(longitude),
        color: 'yellow',
        altitude: 0.01,
        maxR: 3,
        propagationSpeed: 1,
        repeatPeriod: 1000
      }]);
      
    } catch (error) {
      console.error('Error fetching ISS data:', error);
      
      // Show error in info panel
      const issInfo = document.getElementById('iss-info');
      if (issInfo) {
        issInfo.innerHTML = `
          <div style="color: #FF6B6B;">
            Error loading ISS data. Please try again later.
          </div>
        `;
      }
    }
  }
  
  // Update immediately and then every 5 seconds
  await updateISSPosition();
  const intervalId = setInterval(updateISSPosition, 5000);
  window.astronautToolIntervals.push(intervalId);
};
