import { Vector3, BufferGeometry, LineBasicMaterial, LineLoop, Color } from 'three';
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

export const showRadiationMonitor = async (scene, globe, globeGroup, camera) => {
  if (!window.astronautToolIntervals) {
    window.astronautToolIntervals = [];
  }
  
  // Create info panel
  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    verticalButton.innerHTML = `
      <div style="color: #ffffff; font-family: 'Montserrat', sans-serif;">
        <h3 style="color: #FF9966; margin-bottom: 15px; font-size: 18px; text-align: center;">
          Radiation Monitor
        </h3>
        
        <div id="radiation-info" style="margin-top: 15px;">
          <div style="margin-bottom: 10px;">Loading radiation data...</div>
        </div>
        
        <div style="margin-top: 25px; font-size: 12px; color: #aaa;">
          Real-time radiation data from NOAA GOES satellites.
        </div>
      </div>
    `;
  }
  
  try {
    // Attempt to fetch GOES proton flux data from NOAA
    const response = await axios.get('https://services.swpc.noaa.gov/json/goes/primary/integral-protons-3-day.json');
    const latestData = response.data[response.data.length - 1];
    
    // Visualize radiation data on the globe
    createRadiationHeatmap(latestData['P1'], latestData['P7'], globe, globeGroup);
    
    // Update info panel
    updateRadiationInfoPanel(latestData);
    
    // Set up periodic updates every 5 minutes
    const intervalId = setInterval(async () => {
      try {
        const response = await axios.get('https://services.swpc.noaa.gov/json/goes/primary/integral-protons-3-day.json');
        const latestData = response.data[response.data.length - 1];
        
        createRadiationHeatmap(latestData['P1'], latestData['P7'], globe, globeGroup);
        updateRadiationInfoPanel(latestData);
      } catch (error) {
        console.error('Error updating radiation data:', error);
      }
    }, 300000);    
    window.astronautToolIntervals.push(intervalId);
    
  } catch (error) {
    console.error('Error fetching radiation data:', error);
    
    // Show fallback data in case of error
    createRadiationHeatmap(10, 0.5, globe, globeGroup);
    
    // Show error in info panel
    const radiationInfo = document.getElementById('radiation-info');
    if (radiationInfo) {
      radiationInfo.innerHTML = `
        <div style="color: #FF6B6B; margin-bottom: 15px;">
          Error loading radiation data from NOAA. Showing simulated data instead.
        </div>
      `;
      
      // Add simulated data display
      updateRadiationInfoPanel({
        'P1': 10,
        'P5': 1,
        'P7': 0.5,
        'time_tag': new Date().toISOString()
      });
    }
  }
};

function createRadiationHeatmap(lowEnergyProtons, highEnergyProtons, globe, globeGroup) {
  // Convert real data to visualization parameters
  // If no data, use default values
  const lowProtonLevel = lowEnergyProtons || 10;
  const highProtonLevel = highEnergyProtons || 0.5;
  
  // Add South Atlantic Anomaly (SAA) - a region with higher radiation
  const arcsData = [];
  
  for (let lat = -40; lat <= -10; lat += 2) {
    for (let lng = -60; lng <= -30; lng += 2) {
      const intensity = 0.5 + (Math.random() * 0.3);
      
      // Vary the color based on radiation intensity
      const color = new Color();
      color.setHSL(0.05, 0.8, intensity * 0.6);
      
      arcsData.push({
        startLat: lat,
        startLng: lng,
        endLat: lat + (Math.random() * 10 - 5),
        endLng: lng + (Math.random() * 10 - 5),
        color: color.getStyle(),
        arcAlt: Math.min(0.2, intensity * 0.1)
      });
    }
  }
  
  // Set the arcs data to visualize radiation
  globe.arcsData(arcsData)
    .arcColor('color')
    .arcAltitude('arcAlt')
    .arcStroke(() => 0.5)
    .arcDashLength(0.4)
    .arcDashGap(0.2)
    .arcDashAnimateTime(2000);
  
  // Add polar radiation streams
  const polarPoints = [];
  
  for (let i = 0; i < 30; i++) {
    const longitude = Math.random() * 360 - 180;
    
    // Create a stream of particles from the pole to lower latitudes
    const points = [];
    for (let lat = 90; lat >= 60; lat -= 1) {
      const point = convertLatLonToXYZ(
        lat, 
        longitude, 
        // Add some variation to make it look more natural
        100 + Math.sin(lat * (Math.PI/180)) * 5
      );
      points.push(point);
    }
    
    const streamGeometry = new BufferGeometry().setFromPoints(points);
    const streamMaterial = new LineBasicMaterial({
      color: 0xff6600,
      opacity: 0.3,
      transparent: true
    });
    const stream = new LineLoop(streamGeometry, streamMaterial);
    stream.userData.isAstronautTool = true;
    globeGroup.add(stream);
    
    // Do the same for the south pole
    const southPoints = [];
    for (let lat = -90; lat <= -60; lat += 1) {
      const point = convertLatLonToXYZ(
        lat, 
        longitude, 
        100 + Math.sin(lat * (Math.PI/180)) * 5
      );
      southPoints.push(point);
    }
    
    const southStreamGeometry = new BufferGeometry().setFromPoints(southPoints);
    const southStream = new LineLoop(southStreamGeometry, streamMaterial);
    southStream.userData.isAstronautTool = true;
    globeGroup.add(southStream);
  }
}

function updateRadiationInfoPanel(latestData) {
  const radiationInfo = document.getElementById('radiation-info');
  if (!radiationInfo) return;
  
  // Get the radiation levels
  const p1Value = latestData?.['P1'] || 10;
  const p5Value = latestData?.['P5'] || 1;
  const p7Value = latestData?.['P7'] || 0.1;
  
  // Determine the risk level
  let riskLevel, riskColor;
  if (p7Value > 1) {
    riskLevel = "SEVERE";
    riskColor = "#FF0000";
  } else if (p5Value > 100) {
    riskLevel = "HIGH";
    riskColor = "#FF9900";
  } else if (p1Value > 1000) {
    riskLevel = "ELEVATED";
    riskColor = "#FFCC00";
  } else {
    riskLevel = "LOW";
    riskColor = "#00CC00";
  }
  
  // Format the time
  const timeString = latestData?.['time_tag'] 
    ? new Date(latestData['time_tag']).toLocaleString()
    : new Date().toLocaleString();
  
  // Update the info panel with radiation data
  radiationInfo.innerHTML = `
    <div style="margin-bottom: 15px;">
      <div style="font-weight: bold; margin-bottom: 5px;">Proton Flux Measurements:</div>
      <div style="margin-bottom: 3px;"><span style="color: #aaa;">Low Energy (P1):</span> ${p1Value.toFixed(2)} pfu</div>
      <div style="margin-bottom: 3px;"><span style="color: #aaa;">Medium Energy (P5):</span> ${p5Value.toFixed(2)} pfu</div>
      <div style="margin-bottom: 3px;"><span style="color: #aaa;">High Energy (P7):</span> ${p7Value.toFixed(4)} pfu</div>
    </div>
    
    <div style="margin-bottom: 8px;">
      <span style="color: #aaa;">South Atlantic Anomaly:</span> Active
    </div>
    <div style="margin-bottom: 15px;">
      <span style="color: #aaa;">Last Updated:</span> ${timeString}
    </div>
    
    <div style="background-color: rgba(255, 153, 51, 0.2); padding: 10px; border-radius: 5px;">
      <div style="font-weight: bold; margin-bottom: 5px;">EVA Risk Assessment</div>
      <div>Current radiation level is <span style="color: ${riskColor};">${riskLevel}</span></div>
      <div>${riskLevel === "LOW" || riskLevel === "MODERATE" 
        ? "EVA permitted with standard shielding precautions" 
        : "EVA not recommended without additional shielding"}</div>
    </div>
  `;
}
