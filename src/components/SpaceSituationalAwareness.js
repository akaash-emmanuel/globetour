import { Vector3, Color, SphereGeometry, MeshBasicMaterial, Mesh, BufferGeometry, LineBasicMaterial, LineLoop, Points, Float32BufferAttribute, PointsMaterial, AdditiveBlending, TextureLoader, SpriteMaterial, Sprite } from 'three';
import axios from 'axios';

// API URLs
const SPACE_WEATHER_URL = "https://services.swpc.noaa.gov/products/noaa-scales.json";
const ISS_LOCATION_URL = "https://api.wheretheiss.at/v1/satellites/25544";
const SPACE_DEBRIS_SAMPLE_URL = "https://api.nasa.gov/neo/rest/v1/feed";  // Will use simulation instead of actual calls

// Main export function - this should be called from AstronautTools.js
export function showSpaceSituationalAwareness(scene, globe, globeGroup, camera) {
  console.log("Initializing Advanced Space Situational Awareness System");
  
  // Initialize the full system with all features
  initializeSpaceSituationalAwareness(scene, globe, globeGroup, camera);
}

let simulationTime = Date.now();
let spaceThreatLevel = 0; // 0-100 scale
let survivalRecommendations = [];
let anomalyDetected = false;

// Create a threat probability model that considers multiple factors
const calculateThreatLevel = (debrisProximity, radiationLevels, solarActivity, timeInOrbit) => {
  // Normalize all inputs to 0-1 scale
  const debrisRisk = Math.min(debrisProximity / 50, 1); // 50km as max risk for debris
  const radiationRisk = Math.min(radiationLevels / 100, 1); // Scale radiation to 0-1
  const solarRisk = Math.min(solarActivity / 5, 1); // Solar activity on scale of 0-5
  const timeRisk = Math.min(timeInOrbit / 48, 1); // Risk increases with time in orbit (over 48hr)
  
  // Calculate combined threat with different weights
  const combinedThreat = (
    debrisRisk * 0.4 +     // 40% weight on debris proximity
    radiationRisk * 0.3 +  // 30% weight on radiation
    solarRisk * 0.2 +      // 20% weight on solar activity
    timeRisk * 0.1         // 10% weight on time spent in orbit
  ) * 100; // Scale to 0-100
  
  return Math.round(combinedThreat);
};

// Function to generate survival recommendations based on threat analysis
const generateRecommendations = (threatLevel, specificThreats) => {
  const recommendations = [];
  
  if (threatLevel < 20) {
    recommendations.push("Standard operations - continue mission as planned");
  } else if (threatLevel < 40) {
    recommendations.push("Elevated threat level - monitor systems closely");
    
    if (specificThreats.debris) {
      recommendations.push("Potential debris field ahead - prepare for avoidance maneuver");
    }
    
    if (specificThreats.radiation > 0.3) {
      recommendations.push("Moderate radiation detected - limit EVA duration");
    }
  } else if (threatLevel < 60) {
    recommendations.push("High threat level - take precautionary measures");
    
    if (specificThreats.debris) {
      recommendations.push("Debris field detected - execute avoidance maneuver");
      recommendations.push("Maintain heightened alert for secondary debris impacts");
    }
    
    if (specificThreats.radiation > 0.5) {
      recommendations.push("Elevated radiation levels - relocate to shielded module");
      recommendations.push("Delay any planned EVA operations");
    }
    
    if (specificThreats.solar > 0.4) {
      recommendations.push("Solar activity warning - enhance radiation shielding");
    }
  } else if (threatLevel < 80) {
    recommendations.push("Severe threat level - initiate emergency protocols");
    recommendations.push("All crew to radiation shelter immediately");
    
    if (specificThreats.debris) {
      recommendations.push("Critical collision risk - emergency orbital adjustment required");
    }
    
    if (specificThreats.system) {
      recommendations.push("System failure imminent - activate backup life support");
    }
  } else {
    recommendations.push("CRITICAL THREAT LEVEL - EMERGENCY RESPONSE REQUIRED");
    recommendations.push("Prepare for emergency evacuation procedures");
    recommendations.push("Activate all survival systems and backup life support");
  }
  
  return recommendations;
};

// Detect anomalies in the data that might indicate unknown threats
const detectAnomalies = (data, historicalData) => {
  // This would use statistical methods or machine learning to find outliers
  // For this demo, we'll use a simplified approach based on sudden changes
  
  if (!historicalData || historicalData.length < 2) return false;
  
  const lastReading = historicalData[historicalData.length - 1];
  const percentChange = Math.abs((data - lastReading) / lastReading * 100);
  
  return percentChange > 35; // If there's more than 35% sudden change, flag as anomaly
};

// Main initialization function for the Space Situational Awareness system
const initializeSpaceSituationalAwareness = async (scene, globe, globeGroup, camera) => {
  if (!window.astronautToolIntervals) {
    window.astronautToolIntervals = [];
  }
  
  // Clear existing visualizations
  clearVisualization(globe, globeGroup);
  
  // Create info panel
  createInfoPanel();
  
  // Create advanced AR interface elements
  createARInterface(scene, camera);
  
  // Initialize data storage for trend analysis and machine learning predictions
  const historicalData = {
    debris: [],
    radiation: [],
    solar: [],
    timeInSpace: 0,
    anomalies: [],
    predictions: []
  };
  
  // Create visual elements for the threat awareness system
  const threatMesh = createThreatMesh(globeGroup, globe);
  
  // Create debris field visualization
  const debrisField = createDebrisField(globeGroup, globe);
  
  // Create safe corridors visualization
  const safeCorridors = createSafeCorridors(globeGroup, globe);
  
  // Add emergency escape route visualization
  const escapeRoutes = createEscapeRoutes(globeGroup, globe);
  
  // Simulated anomaly detection regions
  createAnomalyRegions(globeGroup, globe);
  
  // Update function to simulate real-time threat assessment
  const updateThreatAssessment = async () => {
    try {
      // In a real implementation, we would fetch actual data from APIs
      // For demo purposes, we'll use some simulated data with occasional real API calls
      
      // Simulate space debris data (or fetch from API if available)
      const debrisProximity = 10 + Math.sin(simulationTime / 10000) * 20 + Math.random() * 15;
      historicalData.debris.push(debrisProximity);
      if (historicalData.debris.length > 20) historicalData.debris.shift();
      
      // Simulate radiation levels (or fetch from NOAA API)
      const radiationLevels = 30 + Math.sin(simulationTime / 15000) * 25 + Math.random() * 20;
      historicalData.radiation.push(radiationLevels);
      if (historicalData.radiation.length > 20) historicalData.radiation.shift();
      
      // Try to get real space weather data, fallback to simulation if fails
      let solarActivity = 2; // Default value
      try {
        const response = await axios.get(SPACE_WEATHER_URL);
        // Extract the geo-magnetic storm scale (G-scale)
        if (response.data && response.data.length > 0) {
          const gScaleEvent = response.data.find(item => item.scale_type === "G");
          if (gScaleEvent) {
            solarActivity = parseInt(gScaleEvent.observed) || parseInt(gScaleEvent.predicted) || 2;
          }
        }
      } catch (error) {
        // If API call fails, use simulated data
        solarActivity = 1 + Math.sin(simulationTime / 20000) * 2 + Math.random() * 1.5;
      }
      historicalData.solar.push(solarActivity);
      if (historicalData.solar.length > 20) historicalData.solar.shift();
      
      // Update time in orbit simulation
      historicalData.timeInSpace = (historicalData.timeInSpace + 0.25) % 72; // 0-72 hours cycle
      
      // Check for anomalies
      const debrisAnomaly = detectAnomalies(debrisProximity, historicalData.debris);
      const radiationAnomaly = detectAnomalies(radiationLevels, historicalData.radiation);
      const solarAnomaly = detectAnomalies(solarActivity, historicalData.solar);
      
      // Set global anomaly flag if any anomaly is detected
      anomalyDetected = debrisAnomaly || radiationAnomaly || solarAnomaly;
      
      // Calculate overall threat level
      spaceThreatLevel = calculateThreatLevel(
        debrisProximity, 
        radiationLevels, 
        solarActivity, 
        historicalData.timeInSpace
      );
      
      // Generate specific threats object for recommendations
      const specificThreats = {
        debris: debrisProximity > 25,
        radiation: radiationLevels / 100,
        solar: solarActivity / 5,
        system: Math.random() > 0.95 // Random system failure chance
      };
      
      // Get survival recommendations
      survivalRecommendations = generateRecommendations(spaceThreatLevel, specificThreats);
      
      // Update visualizations
      updateThreatVisualizations(
        threatMesh, 
        debrisField, 
        safeCorridors, 
        escapeRoutes,
        globeGroup,
        globe,
        {
          threatLevel: spaceThreatLevel,
          debrisProximity,
          radiationLevels,
          solarActivity,
          anomalyDetected
        }
      );
      
      // Update the info panel
      updateInfoPanel({
        threatLevel: spaceThreatLevel,
        debrisProximity,
        radiationLevels,
        solarActivity,
        recommendations: survivalRecommendations,
        anomalyDetected,
        timeInSpace: historicalData.timeInSpace
      });
      
      // Increment simulation time
      simulationTime += 250; // 250ms intervals
      
    } catch (error) {
      console.error('Error in threat assessment update:', error);
    }
  };
  
  // Update immediately and then at intervals
  await updateThreatAssessment();
  const intervalId = setInterval(updateThreatAssessment, 1000);
  window.astronautToolIntervals.push(intervalId);
};

// Clear existing visualizations
const clearVisualization = (globe, globeGroup) => {
  globe.ringsData([]);
  globe.arcsData([]);
  if (globeGroup) {
    globeGroup.children = globeGroup.children.filter(child => 
      !child.userData?.isSituationalAwarenessTool
    );
  }
};

// Create the information panel
const createInfoPanel = () => {
  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    verticalButton.innerHTML = `
      <div style="color: #ffffff; font-family: 'Montserrat', sans-serif;">
        <h3 style="color: #00FFFF; margin-bottom: 15px; font-size: 18px; text-align: center;">
          Space Situational Awareness
        </h3>
        
        <div id="threat-info" style="margin-top: 15px;">
          <div style="margin-bottom: 10px;">Analyzing space environment...</div>
        </div>
        
        <div id="visualization-guide" style="margin-top: 20px; padding: 12px; border: 1px solid rgba(0,255,255,0.3); border-radius: 5px; background-color: rgba(0,30,60,0.3);">
          <div style="font-weight: bold; margin-bottom: 8px; color: #00FFFF; font-size: 14px;">Visualization Guide:</div>
          
          <div style="margin-bottom: 12px; font-size: 12px;">
            <div style="font-weight: bold; margin-bottom: 3px;">Threat Sphere:</div>
            <div style="display: flex; align-items: center; margin-bottom: 2px;">
              <div style="width: 10px; height: 10px; background-color: #00FF00; border-radius: 50%; margin-right: 6px;"></div>
              <div>Green: Low threat (0-20%)</div>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 2px;">
              <div style="width: 10px; height: 10px; background-color: #FFFF00; border-radius: 50%; margin-right: 6px;"></div>
              <div>Yellow: Elevated threat (40-60%)</div>
            </div>
            <div style="display: flex; align-items: center;">
              <div style="width: 10px; height: 10px; background-color: #FF0000; border-radius: 50%; margin-right: 6px;"></div>
              <div>Red: Severe threat (80-100%)</div>
            </div>
          </div>
          
          <div style="margin-bottom: 12px; font-size: 12px;">
            <div style="font-weight: bold; margin-bottom: 3px;">Anomaly Zones:</div>
            <div style="display: flex; align-items: center; margin-bottom: 2px;">
              <div style="width: 10px; height: 10px; background-color: #FF0000; border-radius: 50%; margin-right: 6px;"></div>
              <div>Red Sphere: High radiation zone</div>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 2px;">
              <div style="width: 10px; height: 10px; background-color: #FF00FF; border-radius: 50%; margin-right: 6px;"></div>
              <div>Purple Sphere: Unknown anomaly</div>
            </div>
            <div style="display: flex; align-items: center;">
              <div style="width: 10px; height: 10px; background-color: #FFFF00; border-radius: 50%; margin-right: 6px;"></div>
              <div>Yellow Sphere: Debris cluster</div>
            </div>
          </div>
          
          <div style="font-size: 12px;">
            <div style="font-weight: bold; margin-bottom: 3px;">Navigation Routes:</div>
            <div style="display: flex; align-items: center; margin-bottom: 2px;">
              <div style="width: 10px; height: 10px; background-color: #00FF00; border-radius: 50%; margin-right: 6px;"></div>
              <div>Green Paths: Safe corridors</div>
            </div>
            <div style="display: flex; align-items: center;">
              <div style="width: 10px; height: 10px; background-color: #FF9900; border-radius: 50%; margin-right: 6px;"></div>
              <div>Orange Path: Emergency escape route</div>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 25px; font-size: 12px; color: #aaa; text-align: center;">
          Multi-source threat fusion engine with AI-powered survival recommendations
        </div>
      </div>
    `;
  }
};

// Create visualization for the threat mesh sphere
const createThreatMesh = (globeGroup, globe) => {
  const globeRadius = globe.getGlobeRadius();
  const threatGeometry = new SphereGeometry(globeRadius + 15, 32, 32);
  const threatMaterial = new MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.1,
    wireframe: true
  });
  
  const threatMesh = new Mesh(threatGeometry, threatMaterial);
  threatMesh.userData.isSituationalAwarenessTool = true;
  globeGroup.add(threatMesh);
  
  return threatMesh;
};

// Create space debris field visualization
const createDebrisField = (globeGroup, globe) => {
  const globeRadius = globe.getGlobeRadius();
  const debrisParticles = 1000;
  const debrisPositions = [];
  const debrisSizes = [];
  const debrisColors = [];
  
  // Create debris points at various orbit altitudes
  for (let i = 0; i < debrisParticles; i++) {
    // Random position on sphere larger than the globe
    const altitude = Math.random() * 25 + 10; // 10-35 units above globe
    const randomPhi = Math.acos(2 * Math.random() - 1);
    const randomTheta = Math.random() * Math.PI * 2;
    
    const x = (globeRadius + altitude) * Math.sin(randomPhi) * Math.cos(randomTheta);
    const y = (globeRadius + altitude) * Math.sin(randomPhi) * Math.sin(randomTheta);
    const z = (globeRadius + altitude) * Math.cos(randomPhi);
    
    debrisPositions.push(x, y, z);
    
    // Size based on debris classification (mostly small)
    const size = Math.random() < 0.9 ? Math.random() * 0.8 + 0.2 : Math.random() * 2 + 1;
    debrisSizes.push(size);
    
    // Color based on type (space junk, inactive satellites, fragments)
    const color = new Color();
    if (Math.random() < 0.7) {
      // Space junk - gray
      color.setRGB(0.5 + Math.random() * 0.2, 0.5 + Math.random() * 0.2, 0.5 + Math.random() * 0.2);
    } else if (Math.random() < 0.9) {
      // Inactive satellite - blue tint
      color.setRGB(0.2 + Math.random() * 0.2, 0.2 + Math.random() * 0.2, 0.5 + Math.random() * 0.3);
    } else {
      // Recent collision fragments - red/orange
      color.setRGB(0.8 + Math.random() * 0.2, 0.4 + Math.random() * 0.3, 0.1 + Math.random() * 0.1);
    }
    
    debrisColors.push(color.r, color.g, color.b);
  }
  
  // Create geometry
  const debrisGeometry = new BufferGeometry();
  debrisGeometry.setAttribute('position', new Float32BufferAttribute(debrisPositions, 3));
  debrisGeometry.setAttribute('color', new Float32BufferAttribute(debrisColors, 3));
  
  // Create material
  const debrisMaterial = new PointsMaterial({
    size: 0.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: AdditiveBlending
  });
  
  // Create points system
  const debrisPoints = new Points(debrisGeometry, debrisMaterial);
  debrisPoints.userData.isSituationalAwarenessTool = true;
  globeGroup.add(debrisPoints);
  
  return debrisPoints;
};

// Create safe corridors visualization
const createSafeCorridors = (globeGroup, globe) => {
  const globeRadius = globe.getGlobeRadius();
  const safeCorridors = [];
  
  // Create several safe corridor paths
  for (let i = 0; i < 3; i++) {
    const points = [];
    const startLat = Math.random() * 180 - 90;
    const startLon = Math.random() * 360 - 180;
    const endLat = Math.random() * 180 - 90;
    const endLon = Math.random() * 360 - 180;
    
    // Create a path with multiple points
    for (let t = 0; t <= 1; t += 0.02) {
      const lat = startLat + (endLat - startLat) * t;
      const lon = startLon + (endLon - startLon) * t;
      const altitude = globeRadius + 20 + Math.sin(t * Math.PI) * 5;
      
      points.push(convertLatLonToXYZ(lat, lon, altitude));
    }
    
    // Create corridor line
    const corridorGeometry = new BufferGeometry().setFromPoints(points);
    const corridorMaterial = new LineBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.7,
      linewidth: 3
    });
    
    const corridorLine = new LineLoop(corridorGeometry, corridorMaterial);
    corridorLine.userData.isSituationalAwarenessTool = true;
    globeGroup.add(corridorLine);
    safeCorridors.push(corridorLine);
  }
  
  return safeCorridors;
};

// Create emergency escape routes
const createEscapeRoutes = (globeGroup, globe) => {
  const globeRadius = globe.getGlobeRadius();
  const escapeRoutes = [];
  
  // Create escape route from ISS typical location
  const escapePoints = [];
  const startLat = 51.6; // ISS inclination
  const startLon = 0;
  
  // Create a spiral escape trajectory
  for (let t = 0; t <= 1; t += 0.01) {
    const lat = startLat * (1 - t);
    const lon = startLon + t * 720; // Two full rotations
    const altitude = globeRadius + 20 + t * 100; // Increasing altitude
    
    escapePoints.push(convertLatLonToXYZ(lat, lon, altitude));
  }
  
  // Create escape route line
  const escapeGeometry = new BufferGeometry().setFromPoints(escapePoints);
  const escapeMaterial = new LineBasicMaterial({
    color: 0xff9900,
    transparent: true,
    opacity: 0.7,
    linewidth: 2
  });
  
  const escapeLine = new LineLoop(escapeGeometry, escapeMaterial);
  escapeLine.userData.isSituationalAwarenessTool = true;
  globeGroup.add(escapeLine);
  escapeRoutes.push(escapeLine);
  
  return escapeRoutes;
};

// Create anomaly detection regions
const createAnomalyRegions = (globeGroup, globe) => {
  const globeRadius = globe.getGlobeRadius();
  
  // Add some specific anomaly regions
  const anomalyPositions = [
    { lat: 30, lon: 70, radius: 8, color: 0xff0000 },   // High radiation zone
    { lat: -15, lon: -120, radius: 10, color: 0xff00ff },  // Unknown anomaly
    { lat: 45, lon: -30, radius: 6, color: 0xffff00 },   // Debris cluster
  ];
  
  anomalyPositions.forEach(anomaly => {
    const position = convertLatLonToXYZ(anomaly.lat, anomaly.lon, globeRadius + 15);
    const anomalyGeometry = new SphereGeometry(anomaly.radius, 16, 16);
    const anomalyMaterial = new MeshBasicMaterial({
      color: anomaly.color,
      transparent: true,
      opacity: 0.3,
      wireframe: true
    });
    
    const anomalyMesh = new Mesh(anomalyGeometry, anomalyMaterial);
    anomalyMesh.position.copy(position);
    anomalyMesh.userData.isSituationalAwarenessTool = true;
    globeGroup.add(anomalyMesh);
  });
};

// Update the info panel with current data
const updateInfoPanel = (data) => {
  const threatInfo = document.getElementById('threat-info');
  if (!threatInfo) return;
  
  // Get threat level color
  let threatColor, threatText;
  if (data.threatLevel < 20) {
    threatColor = "#00FF00";
    threatText = "LOW";
  } else if (data.threatLevel < 40) {
    threatColor = "#AAFF00";
    threatText = "GUARDED";
  } else if (data.threatLevel < 60) {
    threatColor = "#FFFF00";
    threatText = "ELEVATED";
  } else if (data.threatLevel < 80) {
    threatColor = "#FF9900";
    threatText = "HIGH";
  } else {
    threatColor = "#FF0000";
    threatText = "SEVERE";
  }
  
  // Format hours and minutes for time in space
  const hours = Math.floor(data.timeInSpace);
  const minutes = Math.floor((data.timeInSpace - hours) * 60);
  
  // Build the HTML content
  let content = `
    <div style="margin-bottom: 15px;">
      <div style="font-weight: bold; font-size: 16px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
        <span>Threat Level: </span>
        <span style="color: ${threatColor};">${threatText} (${data.threatLevel}%)</span>
      </div>
      <div style="background-color: rgba(0,0,0,0.3); height: 10px; border-radius: 5px; overflow: hidden;">
        <div style="height: 100%; width: ${data.threatLevel}%; background-color: ${threatColor};"></div>
      </div>
    </div>
    
    <div style="margin-bottom: 8px;">
      <span style="color: #aaa;">Debris proximity:</span> ${data.debrisProximity.toFixed(2)} km
    </div>
    <div style="margin-bottom: 8px;">
      <span style="color: #aaa;">Radiation levels:</span> ${data.radiationLevels.toFixed(2)} mSv
    </div>
    <div style="margin-bottom: 8px;">
      <span style="color: #aaa;">Solar activity:</span> Class ${data.solarActivity.toFixed(1)}
    </div>
    <div style="margin-bottom: 8px;">
      <span style="color: #aaa;">Time in space:</span> ${hours}h ${minutes}m
    </div>
  `;
  
  // Add anomaly warning if detected
  if (data.anomalyDetected) {
    content += `
      <div style="margin: 15px 0; padding: 8px; background-color: rgba(255, 0, 0, 0.3); border-radius: 5px;">
        <div style="font-weight: bold; color: #FF9999;">ANOMALY DETECTED</div>
        <div style="font-size: 12px; margin-top: 5px;">Unknown pattern detected in sensor readings</div>
      </div>
    `;
  }
  
  // Add survival recommendations
  content += `
    <div style="margin-top: 15px;">
      <div style="font-weight: bold; margin-bottom: 8px; color: #00FFFF;">Survival Recommendations:</div>
      <ul style="list-style-type: none; padding-left: 0; margin: 0;">
  `;
  
  data.recommendations.forEach(rec => {
    content += `<li style="margin-bottom: 6px; font-size: 13px; position: relative; padding-left: 15px;">
      <span style="position: absolute; left: 0; top: 6px; width: 6px; height: 6px; background-color: #00FFFF; border-radius: 50%;"></span>
      ${rec}
    </li>`;
  });
  
  content += `
      </ul>
    </div>
  `;
  
  // Update the panel
  threatInfo.innerHTML = content;
};

// Update visualizations based on current threat data
const updateThreatVisualizations = (threatMesh, debrisField, safeCorridors, escapeRoutes, globeGroup, globe, data) => {
  // Update threat mesh appearance based on threat level
  if (threatMesh) {
    // Change color based on threat level
    const hue = (1 - data.threatLevel / 100) * 0.3; // 0.3 (green) to 0 (red)
    const color = new Color().setHSL(hue, 1, 0.5);
    threatMesh.material.color = color;
    
    // Pulse the mesh based on threat level
    const pulseFrequency = 0.0005 + (data.threatLevel / 100) * 0.001;
    const pulseIntensity = 0.1 + (data.threatLevel / 100) * 0.2;
    threatMesh.material.opacity = 0.1 + Math.sin(simulationTime * pulseFrequency) * pulseIntensity;
    
    // Make mesh rotate slightly
    threatMesh.rotation.y += 0.001;
    threatMesh.rotation.x = Math.sin(simulationTime * 0.0001) * 0.1;
    
    // Add augmented reality features when anomalies are detected
    if (data.anomalyDetected && !threatMesh.userData.anomalyVisualization) {
      threatMesh.userData.anomalyVisualization = true;
      
      // Create a warning pulse around the area of anomaly
      const anomalyRadius = globe.getGlobeRadius() + 25;
      const anomalyGeometry = new SphereGeometry(5, 16, 16);
      const anomalyMaterial = new MeshBasicMaterial({
        color: 0xFF0000,
        transparent: true,
        opacity: 0.7,
        wireframe: true
      });
      
      // Create multiple anomaly indicators at different positions
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() * 0.5 + 0.5) * Math.PI;
        
        const x = anomalyRadius * Math.sin(height) * Math.cos(angle);
        const y = anomalyRadius * Math.cos(height);
        const z = anomalyRadius * Math.sin(height) * Math.sin(angle);
        
        const anomalyMesh = new Mesh(anomalyGeometry, anomalyMaterial);
        anomalyMesh.position.set(x, y, z);
        anomalyMesh.userData.isAstronautTool = true;
        anomalyMesh.userData.anomalyIndicator = true;
        anomalyMesh.userData.creationTime = simulationTime;
        globeGroup.add(anomalyMesh);
      }
    }
  }
  
  // Update debris field - make more visible when debris proximity is high
  if (debrisField) {
    debrisField.material.opacity = 0.5 + (data.debrisProximity / 100) * 0.5;
    debrisField.rotation.y += 0.0005;
    debrisField.rotation.x += 0.0002;
  }
  
  // Update safe corridors - make them pulse when threat level is high
  safeCorridors.forEach(corridor => {
    corridor.material.opacity = 0.5 + Math.sin(simulationTime * 0.002) * 0.3;
    
    // If threat level is high, make corridors flash
    if (data.threatLevel > 70) {
      corridor.material.color.setHSL(
        Math.sin(simulationTime * 0.003) > 0 ? 0.3 : 0, 
        1, 
        0.5
      );
    }
  });
  
  // Update escape routes - make more prominent when threat is high
  escapeRoutes.forEach(route => {
    route.material.opacity = 0.3 + (data.threatLevel / 100) * 0.7;
    if (data.threatLevel > 80) {
      route.material.color = new Color(0xff0000);
    }
  });
  
  // Add threat rings at Earth locations
  const rings = [];
  
  // Add a ring at location of high radiation if detected
  if (data.radiationLevels > 60) {
    rings.push({
      lat: 20 + Math.sin(simulationTime * 0.0002) * 30,
      lng: 40 + Math.sin(simulationTime * 0.0003) * 60,
      color: 'red',
      altitude: 0.01,
      maxR: 5 + (data.radiationLevels - 60) / 10,
      propagationSpeed: 1,
      repeatPeriod: 500 + Math.sin(simulationTime * 0.001) * 200
    });
  }
  
  // Add rings for anomalies
  if (data.anomalyDetected) {
    rings.push({
      lat: -15,
      lng: -120,
      color: 'magenta',
      altitude: 0.01,
      maxR: 8,
      propagationSpeed: 2,
      repeatPeriod: 800
    });
  }
  
  // Update the globe rings
  globe.ringsData(rings);
};

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

// Create augmented reality interface elements
const createARInterface = (scene, camera) => {
  // Create a heads-up display (HUD) for the AR interface
  const hudElement = document.createElement('div');
  hudElement.id = 'space-sa-hud';
  hudElement.style.position = 'absolute';
  hudElement.style.top = '10px';
  hudElement.style.left = '10px';
  hudElement.style.padding = '10px';
  hudElement.style.borderRadius = '5px';
  hudElement.style.backgroundColor = 'rgba(0, 30, 60, 0.7)';
  hudElement.style.border = '1px solid #00FFFF';
  hudElement.style.color = '#FFFFFF';
  hudElement.style.fontFamily = "'Montserrat', sans-serif";
  hudElement.style.fontSize = '14px';
  hudElement.style.zIndex = '1500';
  hudElement.style.pointerEvents = 'none'; // Don't interfere with mouse events
  hudElement.style.display = 'none'; // Hidden by default, shown when anomalies detected
  
  // Add HUD content
  hudElement.innerHTML = `
    <div style="text-align: center; color: #00FFFF; font-weight: bold; margin-bottom: 5px;">
      AR SURVIVAL ASSIST
    </div>
    <div style="display: flex; align-items: center; margin-bottom: 5px;">
      <div style="width: 12px; height: 12px; background-color: #FF0000; border-radius: 50%; margin-right: 8px;"></div>
      <div>Threat indicators identify hazards</div>
    </div>
    <div style="display: flex; align-items: center; margin-bottom: 5px;">
      <div style="width: 12px; height: 12px; background-color: #00FF00; border-radius: 50%; margin-right: 8px;"></div>
      <div>Safe route waypoints</div>
    </div>
    <div style="display: flex; align-items: center;">
      <div style="width: 12px; height: 12px; background-color: #FFFF00; border-radius: 50%; margin-right: 8px;"></div>
      <div>Prediction markers</div>
    </div>
  `;
  
  document.body.appendChild(hudElement);
  
  // Add toggle button for AR interface
  const arToggleButton = document.createElement('div');
  arToggleButton.id = 'ar-toggle-button';
  arToggleButton.style.position = 'absolute';
  arToggleButton.style.bottom = '20px';
  arToggleButton.style.left = '50%';
  arToggleButton.style.transform = 'translateX(-50%)';
  arToggleButton.style.padding = '10px 15px';
  arToggleButton.style.borderRadius = '20px';
  arToggleButton.style.backgroundColor = '#00AAFF';
  arToggleButton.style.color = '#FFFFFF';
  arToggleButton.style.fontFamily = "'Montserrat', sans-serif";
  arToggleButton.style.fontSize = '14px';
  arToggleButton.style.cursor = 'pointer';
  arToggleButton.style.zIndex = '1500';
  arToggleButton.style.display = 'none'; // Hidden by default, shown when AR is available
  arToggleButton.innerText = 'Enable AR Survival Mode';
  
  arToggleButton.addEventListener('click', () => {
    const hud = document.getElementById('space-sa-hud');
    if (hud.style.display === 'none') {
      hud.style.display = 'block';
      arToggleButton.innerText = 'Disable AR Survival Mode';
      arToggleButton.style.backgroundColor = '#FF5500';
    } else {
      hud.style.display = 'none';
      arToggleButton.innerText = 'Enable AR Survival Mode';
      arToggleButton.style.backgroundColor = '#00AAFF';
    }
  });
  
  document.body.appendChild(arToggleButton);
  
  // Show AR button when anomalies are detected
  window.showARToggleButton = () => {
    arToggleButton.style.display = 'block';
  };
};
