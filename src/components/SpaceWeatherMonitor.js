import { Vector3, LineBasicMaterial, BufferGeometry, LineLoop, SphereGeometry, MeshBasicMaterial, Mesh, DoubleSide, RingGeometry } from 'three';
import axios from 'axios';

const NASA_API_KEY = "jmRRPCUwwWyNaMrXJCNz8HDX8q94wPnQfKz0ig5a";

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

export const showSpaceWeatherMonitor = async (scene, globe, globeGroup, camera) => {
  if (!window.astronautToolIntervals) {
    window.astronautToolIntervals = [];
  }
  
  // Create info panel
  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    verticalButton.innerHTML = `
      <div style="color: #ffffff; font-family: 'Montserrat', sans-serif;">
        <h3 style="color: #FF6B6B; margin-bottom: 15px; font-size: 18px; text-align: center;">
          Space Weather Monitor
        </h3>
        
        <div id="space-weather-info" style="margin-top: 15px;">
          <div style="margin-bottom: 10px;">Loading space weather data...</div>
        </div>
        
        <div style="margin-top: 25px; font-size: 12px; color: #aaa;">
          Data from NASA DONKI API showing solar events that could impact astronaut safety.
        </div>
      </div>
    `;
  }
  
  try {
    // Get today's date and 30 days ago in the format YYYY-MM-DD
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Fetch solar flare data
    const flareResponse = await axios.get(
      `https://api.nasa.gov/DONKI/FLR?startDate=${formatDate(thirtyDaysAgo)}&endDate=${formatDate(today)}&api_key=${NASA_API_KEY}`
    );
    
    // Fetch CME data
    const cmeResponse = await axios.get(
      `https://api.nasa.gov/DONKI/CME?startDate=${formatDate(thirtyDaysAgo)}&endDate=${formatDate(today)}&api_key=${NASA_API_KEY}`
    );
    
    // Fetch solar energetic particle data
    const sepResponse = await axios.get(
      `https://api.nasa.gov/DONKI/SEP?startDate=${formatDate(thirtyDaysAgo)}&endDate=${formatDate(today)}&api_key=${NASA_API_KEY}`
    );
    
    // Add visualization of the space weather events
    visualizeMagneticField(globe, globeGroup);
    visualizeRadiationBelts(globe, globeGroup);
    visualizeSolarActivity(flareResponse.data, cmeResponse.data, globe, globeGroup);
    
    // Update the info panel with the data
    updateSpaceWeatherInfo(flareResponse.data, cmeResponse.data, sepResponse.data);
    
  } catch (error) {
    console.error('Error fetching space weather data:', error);
    
    // Show error in info panel
    const weatherInfo = document.getElementById('space-weather-info');
    if (weatherInfo) {
      weatherInfo.innerHTML = `
        <div style="color: #FF6B6B;">
          Error loading space weather data. Please try again later.
        </div>
      `;
    }
    
    // Still visualize the basic elements even without data
    visualizeMagneticField(globe, globeGroup);
    visualizeRadiationBelts(globe, globeGroup);
  }
};

// Function to visualize Earth's magnetic field
function visualizeMagneticField(globe, globeGroup) {
  const globeRadius = globe.getGlobeRadius();
  const northPole = convertLatLonToXYZ(90, 0, globeRadius);
  const southPole = convertLatLonToXYZ(-90, 0, globeRadius);
  
  // Create field lines
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const radius = globeRadius * 1.5;
    
    // Create a series of points for the field line
    const points = [];
    for (let t = 0; t <= 1; t += 0.02) {
      // Parametric equation for magnetic field line
      const lat = 90 - 180 * t;
      const lon = angle * (180 / Math.PI);
      
      // Adjust the radius based on latitude to create curved field lines
      const adjustedRadius = globeRadius + 0.5 * Math.sin(t * Math.PI) * radius;
      
      points.push(convertLatLonToXYZ(lat, lon, adjustedRadius));
    }
    
    const lineGeometry = new BufferGeometry().setFromPoints(points);
    const lineMaterial = new LineBasicMaterial({
      color: 0x4287f5,
      transparent: true,
      opacity: 0.4
    });
    
    const line = new LineLoop(lineGeometry, lineMaterial);
    line.userData.isAstronautTool = true;
    globeGroup.add(line);
  }
  
  // Add pole indicators
  const poleGeometry = new SphereGeometry(1, 16, 16);
  const northPoleMaterial = new MeshBasicMaterial({ color: 0xff0000 });
  const southPoleMaterial = new MeshBasicMaterial({ color: 0x0000ff });
  
  const northPoleSphere = new Mesh(poleGeometry, northPoleMaterial);
  northPoleSphere.position.copy(northPole);
  northPoleSphere.userData.isAstronautTool = true;
  globeGroup.add(northPoleSphere);
  
  const southPoleSphere = new Mesh(poleGeometry, southPoleMaterial);
  southPoleSphere.position.copy(southPole);
  southPoleSphere.userData.isAstronautTool = true;
  globeGroup.add(southPoleSphere);
}

// Function to visualize Van Allen radiation belts
function visualizeRadiationBelts(globe, globeGroup) {
  const globeRadius = globe.getGlobeRadius();
  
  // Inner Van Allen Belt
  const innerBelt = new RingGeometry(
    globeRadius + 10, 
    globeRadius + 12,
    64
  );
  const innerBeltMaterial = new MeshBasicMaterial({
    color: 0xFF6666,
    transparent: true,
    opacity: 0.15,
    side: DoubleSide
  });
  const innerBeltMesh = new Mesh(innerBelt, innerBeltMaterial);
  innerBeltMesh.rotation.x = Math.PI / 2;
  innerBeltMesh.rotation.y = Math.PI / 6;
  innerBeltMesh.userData.isAstronautTool = true;
  globeGroup.add(innerBeltMesh);
  
  // Outer Van Allen Belt
  const outerBelt = new RingGeometry(
    globeRadius + 25, 
    globeRadius + 35,
    64
  );
  const outerBeltMaterial = new MeshBasicMaterial({
    color: 0x66CCFF,
    transparent: true,
    opacity: 0.15,
    side: DoubleSide
  });
  const outerBeltMesh = new Mesh(outerBelt, outerBeltMaterial);
  outerBeltMesh.rotation.x = Math.PI / 2;
  outerBeltMesh.rotation.y = Math.PI / 6;
  outerBeltMesh.userData.isAstronautTool = true;
  globeGroup.add(outerBeltMesh);
}

// Function to visualize solar activity
function visualizeSolarActivity(flares, cmes, globe, globeGroup) {
  // Visualize solar flares as arcs aimed at Earth
  if (flares && flares.length > 0) {
    const arcsData = flares.slice(0, 5).map((flare, index) => {
      // Generate a distant point as the source of the flare
      const sourceAngle = (index / 5) * Math.PI * 2;
      const sourceX = Math.cos(sourceAngle) * 500;
      const sourceY = Math.sin(sourceAngle) * 500;
      
      return {
        startLat: 0,
        startLng: sourceAngle * (180 / Math.PI),
        endLat: Math.random() * 180 - 90,
        endLng: Math.random() * 360 - 180,
        color: flare.classType && flare.classType.includes('X') ? 
               'rgba(255, 0, 0, 0.6)' : 
               flare.classType && flare.classType.includes('M') ?
               'rgba(255, 165, 0, 0.6)' : 'rgba(255, 255, 0, 0.6)',
        stroke: 'solar-flare',
        arcAlt: 0.4
      };
    });
    
    globe.arcsData(arcsData)
      .arcColor('color')
      .arcStroke('stroke')
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashAnimateTime(2000)
      .arcAltitudeAutoScale(0.3);
  }
}

// Function to update the information panel
function updateSpaceWeatherInfo(flares, cmes, seps) {
  const weatherInfo = document.getElementById('space-weather-info');
  if (!weatherInfo) return;
  
  // Count recent events by severity
  const recentFlares = flares.filter(flare => new Date(flare.beginTime) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const xClassFlares = recentFlares.filter(flare => flare.classType && flare.classType.includes('X')).length;
  const mClassFlares = recentFlares.filter(flare => flare.classType && flare.classType.includes('M')).length;
  const cClassFlares = recentFlares.filter(flare => flare.classType && flare.classType.includes('C')).length;
  
  const recentCMEs = cmes.filter(cme => new Date(cme.startTime) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  
  // Determine current risk level
  let riskLevel, riskColor;
  if (xClassFlares > 0 || seps.length > 0) {
    riskLevel = "HIGH";
    riskColor = "#FF0000";
  } else if (mClassFlares > 2 || recentCMEs.length > 2) {
    riskLevel = "ELEVATED";
    riskColor = "#FF9900";
  } else {
    riskLevel = "LOW";
    riskColor = "#00CC00";
  }
  
  // Update the info panel with data
  weatherInfo.innerHTML = `
    <div style="margin-bottom: 15px;">
      <div style="font-weight: bold; margin-bottom: 5px;">Solar Activity (Last 7 Days):</div>
      <div style="margin-bottom: 3px;"><span style="color: #FF0000;">■</span> X-Class Flares: ${xClassFlares}</div>
      <div style="margin-bottom: 3px;"><span style="color: #FF9900;">■</span> M-Class Flares: ${mClassFlares}</div>
      <div style="margin-bottom: 3px;"><span style="color: #FFCC00;">■</span> C-Class Flares: ${cClassFlares}</div>
      <div style="margin-bottom: 3px;"><span style="color: #3399FF;">■</span> Coronal Mass Ejections: ${recentCMEs.length}</div>
    </div>
    
    <div style="margin-bottom: 8px;">
      <span style="color: #aaa;">Geomagnetic Field:</span> ${seps.length > 0 ? "Disturbed" : "Normal"}
    </div>
    <div style="margin-bottom: 8px;">
      <span style="color: #aaa;">Radiation:</span> ${xClassFlares > 0 ? "Elevated" : "Normal"}
    </div>
    <div style="margin-bottom: 15px;">
      <span style="color: #aaa;">Last Updated:</span> ${new Date().toLocaleString()}
    </div>
    
    <div style="background-color: rgba(255, 105, 105, 0.2); padding: 10px; border-radius: 5px;">
      <div style="font-weight: bold; margin-bottom: 5px;">EVA Risk Assessment</div>
      <div>Current risk level is <span style="color: ${riskColor};">${riskLevel}</span></div>
      <div>${riskLevel === "LOW" ? 
        "EVA operations can proceed with standard precautions" : 
        riskLevel === "ELEVATED" ? 
        "Exercise caution during EVA operations; monitor radiation levels" :
        "EVA operations not advised without additional shielding"}</div>
    </div>
  `;
}
