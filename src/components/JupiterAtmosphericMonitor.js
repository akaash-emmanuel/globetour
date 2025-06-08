/**
 * JupiterAtmosphericMonitor.js - Jupiter Atmospheric Data Visualization
 * 
 * This component provides real-time atmospheric monitoring for Jupiter,
 * simulating data from NASA's Juno mission. It visualizes Jupiter's
 * atmospheric conditions, storm systems, radiation environment, and
 * magnetosphere for mission planning and astronaut safety.
 */

import { Vector3, Color, SphereGeometry, MeshBasicMaterial, Mesh, BufferGeometry, LineBasicMaterial, LineLoop, Points, Float32BufferAttribute, PointsMaterial, AdditiveBlending, RingGeometry, DoubleSide, CylinderGeometry } from 'three';

// Constants for Jupiter data simulation (based on Juno mission observations)
const JUPITER_SOL_LENGTH = 9.925; // Jupiter day length in Earth hours
const JUPITER_ATMOSPHERIC_LAYERS = {
  TROPOSPHERE: { altitude: 0, pressure: 100000, temp: 165 }, // Base layer
  STRATOSPHERE: { altitude: 40, pressure: 10, temp: 113 },
  THERMOSPHERE: { altitude: 320, pressure: 0.001, temp: 900 }
};

const JUPITER_STORM_SYSTEMS = [
  { name: "Great Red Spot", lat: -22, lon: 0, intensity: 85, diameter: 16350 },
  { name: "Oval BA", lat: -33, lon: 60, intensity: 70, diameter: 8000 },
  { name: "North Temperate Belt", lat: 24, lon: -45, intensity: 60, diameter: 12000 }
];

const JUPITER_RADIATION_ZONES = {
  INNER_RADIATION_BELT: { distance: 1.5, intensity: 95, hazard: "EXTREME" },
  MIDDLE_RADIATION_BELT: { distance: 3.0, intensity: 80, hazard: "HIGH" },
  OUTER_RADIATION_BELT: { distance: 6.0, intensity: 60, hazard: "MODERATE" }
};

// Generate realistic Jupiter atmospheric data
const generateJupiterAtmosphericData = () => {
  const currentTime = Date.now();
  const jupiterDay = (currentTime / (1000 * 60 * 60 * JUPITER_SOL_LENGTH)) % 1;
  const seasonalVariation = Math.sin((currentTime / (1000 * 60 * 60 * 24 * 365.25 * 11.86)) * 2 * Math.PI) * 0.15; // 11.86 year Jupiter year
  
  // Atmospheric pressure variations by zone
  const equatorialPressure = 100000 + (Math.sin(jupiterDay * 2 * Math.PI) * 5000) + (seasonalVariation * 10000);
  const tempBeltPressure = 85000 + (Math.cos(jupiterDay * 3 * Math.PI) * 3000) + (seasonalVariation * 8000);
  const polarPressure = 70000 + (Math.sin(jupiterDay * 1.5 * Math.PI) * 2000) + (seasonalVariation * 5000);
  
  // Temperature variations (Kelvin)
  const equatorialTemp = 165 + (Math.sin(jupiterDay * 2 * Math.PI) * 8) + (seasonalVariation * 15);
  const tempBeltTemp = 155 + (Math.cos(jupiterDay * 2.5 * Math.PI) * 12) + (seasonalVariation * 10);
  const polarTemp = 145 + (Math.sin(jupiterDay * 1.8 * Math.PI) * 6) + (seasonalVariation * 8);
  
  // Wind speeds (m/s) - Jupiter has extreme wind speeds
  const equatorialWinds = 120 + (Math.random() * 30) + (seasonalVariation * 20);
  const tempBeltWinds = 180 + (Math.random() * 40) + (seasonalVariation * 25);
  const polarWinds = 90 + (Math.random() * 20) + (seasonalVariation * 15);
  
  // Magnetic field strength (nT - nanoteslas)
  const magneticFieldStrength = 428000 + (Math.sin(jupiterDay * 4 * Math.PI) * 15000) + (seasonalVariation * 20000);
  
  // Storm activity and intensity
  const stormActivity = Math.max(0, Math.min(100, 60 + (Math.sin(jupiterDay * 3 * Math.PI) * 20) + (Math.random() * 20 - 10)));
  
  // Radiation levels (based on Juno measurements)
  const radiationLevel = 85 + (Math.sin(jupiterDay * 2 * Math.PI) * 10) + (seasonalVariation * 5);
  
  // Auroral activity
  const auroralActivity = Math.max(0, Math.min(100, 70 + (Math.sin(jupiterDay * 5 * Math.PI) * 25) + (Math.random() * 15 - 7.5)));
  
  return {
    sol: Math.floor(currentTime / (1000 * 60 * 60 * JUPITER_SOL_LENGTH)),
    localTime: `${Math.floor(jupiterDay * 24).toString().padStart(2, '0')}:${Math.floor((jupiterDay * 24 * 60) % 60).toString().padStart(2, '0')}`,
    atmosphericZones: {
      equatorial: {
        pressure: equatorialPressure.toFixed(0),
        temperature: equatorialTemp.toFixed(1),
        windSpeed: equatorialWinds.toFixed(1),
        composition: "89.8% H₂, 10.2% He"
      },
      temperateNorth: {
        pressure: tempBeltPressure.toFixed(0),
        temperature: tempBeltTemp.toFixed(1),
        windSpeed: tempBeltWinds.toFixed(1),
        composition: "89.9% H₂, 10.1% He"
      },
      polar: {
        pressure: polarPressure.toFixed(0),
        temperature: polarTemp.toFixed(1),
        windSpeed: polarWinds.toFixed(1),
        composition: "90.1% H₂, 9.9% He"
      }
    },
    magneticField: {
      strength: magneticFieldStrength.toFixed(0),
      dipoleOffset: "0.131 Rj",
      orientation: "11.5° to rotation axis"
    },
    stormSystems: {
      greatRedSpot: {
        intensity: Math.max(75, Math.min(95, 85 + (Math.sin(jupiterDay * 2 * Math.PI) * 8))).toFixed(1),
        diameter: "16,350 km",
        windSpeed: (500 + Math.random() * 100).toFixed(1),
        pressure: "0.2-0.7 bar"
      },
      ovalBA: {
        intensity: Math.max(60, Math.min(80, 70 + (Math.cos(jupiterDay * 3 * Math.PI) * 8))).toFixed(1),
        diameter: "8,000 km",
        windSpeed: (400 + Math.random() * 80).toFixed(1)
      }
    },
    radiationEnvironment: {
      level: radiationLevel.toFixed(1),
      hazardLevel: radiationLevel > 90 ? "EXTREME" : radiationLevel > 75 ? "HIGH" : "MODERATE",
      particleFlux: (radiationLevel * 1000).toFixed(0),
      shieldingRequired: radiationLevel > 80 ? "15+ cm Pb equivalent" : "10+ cm Pb equivalent"
    },
    auroralActivity: {
      intensity: auroralActivity.toFixed(1),
      type: auroralActivity > 80 ? "Intense Aurora" : auroralActivity > 50 ? "Moderate Aurora" : "Weak Aurora",
      location: "Polar regions"
    },
    missionAssessment: {
      overallSafety: radiationLevel < 75 && stormActivity < 70 ? "CAUTION" : "HIGH RISK",
      orbitSafety: radiationLevel < 80 ? "Possible with heavy shielding" : "Not recommended",
      flybySafety: "Possible with trajectory planning",
      communicationStatus: stormActivity < 60 ? "Clear" : "Degraded",
      recommendedAction: radiationLevel > 85 
        ? "Maintain safe distance (>10 Rj)"
        : stormActivity > 75 
        ? "Monitor storm systems" 
        : "Proceed with caution"
    }
  };
};

// Create advanced 3D visualizations for Jupiter's atmosphere and missions
const createJupiterStormSystems = (jupiterGroup, jupiterRadius, atmosphericData) => {
  // Create Great Red Spot with swirling particle system
  const grsParticleCount = 3000;
  const grsPositions = [];
  const grsColors = [];
  const grsSizes = [];
  
  const grsLat = -22 * (Math.PI / 180);
  const grsLon = 0 * (Math.PI / 180);
  const grsCenter = new Vector3(
    jupiterRadius * Math.sin(Math.PI / 2 - grsLat) * Math.cos(grsLon),
    jupiterRadius * Math.cos(Math.PI / 2 - grsLat),
    jupiterRadius * Math.sin(Math.PI / 2 - grsLat) * Math.sin(grsLon)
  );
  
  for (let i = 0; i < grsParticleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 8 + 2; // Great Red Spot size
    const height = (Math.random() - 0.5) * 3;
    
    const x = grsCenter.x + Math.cos(angle) * radius;
    const y = grsCenter.y + height;
    const z = grsCenter.z + Math.sin(angle) * radius;
    
    grsPositions.push(x, y, z);
    
    // Red-orange colors for the storm
    const intensity = 0.8 + Math.random() * 0.2;
    grsColors.push(intensity, intensity * 0.4, intensity * 0.1);
    grsSizes.push(1.5 + Math.random() * 2);
  }
  
  const grsGeometry = new BufferGeometry();
  grsGeometry.setAttribute('position', new Float32BufferAttribute(grsPositions, 3));
  grsGeometry.setAttribute('color', new Float32BufferAttribute(grsColors, 3));
  grsGeometry.setAttribute('size', new Float32BufferAttribute(grsSizes, 1));
  
  const grsMaterial = new PointsMaterial({
    size: 2.0,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: AdditiveBlending
  });
  
  const grsStorm = new Points(grsGeometry, grsMaterial);
  grsStorm.userData.isJupiterAtmosphere = true;
  grsStorm.userData.isGreatRedSpot = true;
  jupiterGroup.add(grsStorm);
  
  // Create atmospheric bands with particle streams
  for (let band = 0; band < 6; band++) {
    const bandLat = (band - 3) * 30 * (Math.PI / 180); // -90 to 90 degrees
    const bandPoints = [];
    const bandColors = [];
    
    for (let i = 0; i < 200; i++) {
      const lon = (i / 200) * Math.PI * 2;
      const altitude = jupiterRadius + Math.sin(i * 0.1) * 2;
      
      const x = altitude * Math.sin(Math.PI / 2 - bandLat) * Math.cos(lon);
      const y = altitude * Math.cos(Math.PI / 2 - bandLat);
      const z = altitude * Math.sin(Math.PI / 2 - bandLat) * Math.sin(lon);
      
      bandPoints.push(x, y, z);
      
      // Different colors for different bands
      const bandColor = new Color().setHSL((band * 0.15 + 0.1) % 1, 0.6, 0.7);
      bandColors.push(bandColor.r, bandColor.g, bandColor.b);
    }
    
    const bandGeometry = new BufferGeometry();
    bandGeometry.setAttribute('position', new Float32BufferAttribute(bandPoints, 3));
    bandGeometry.setAttribute('color', new Float32BufferAttribute(bandColors, 3));
    
    const bandMaterial = new PointsMaterial({
      size: 1.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.5
    });
    
    const bandStream = new Points(bandGeometry, bandMaterial);
    bandStream.userData.isJupiterAtmosphere = true;
    bandStream.userData.isBandStream = true;
    bandStream.userData.bandIndex = band;
    jupiterGroup.add(bandStream);
  }
};

// Create Jupiter mission spacecraft visualizations
const createJupiterMissionSpacecraft = (jupiterGroup, jupiterRadius) => {
  // Juno spacecraft in polar orbit
  const junoGeometry = new SphereGeometry(1.5, 8, 8);
  const junoMaterial = new MeshBasicMaterial({ color: 0x00AAAA });
  const juno = new Mesh(junoGeometry, junoMaterial);
  
  // Juno's polar orbit (perijove ~5000 km, apojove ~8 million km - scaled)
  const junoDistance = jupiterRadius + 15;
  juno.position.set(0, junoDistance, 0);
  juno.userData.isJupiterAtmosphere = true;
  juno.userData.isSpacecraft = true;
  juno.userData.name = "Juno";
  jupiterGroup.add(juno);
  
  // Create Juno's polar orbit path
  const junoOrbitPoints = [];
  for (let i = 0; i <= 360; i += 5) {
    const angle = i * (Math.PI / 180);
    // Elliptical polar orbit
    const distance = jupiterRadius + 15 + Math.sin(angle) * 10;
    const x = 0;
    const y = distance * Math.cos(angle);
    const z = distance * Math.sin(angle);
    junoOrbitPoints.push(new Vector3(x, y, z));
  }
  
  const junoOrbitGeometry = new BufferGeometry().setFromPoints(junoOrbitPoints);
  const junoOrbitMaterial = new LineBasicMaterial({
    color: 0x00AAAA,
    transparent: true,
    opacity: 0.6
  });
  const junoOrbit = new LineLoop(junoOrbitGeometry, junoOrbitMaterial);
  junoOrbit.userData.isJupiterAtmosphere = true;
  jupiterGroup.add(junoOrbit);
  
  // Create Galileo orbiter (legacy visualization)
  const galileoGeometry = new SphereGeometry(1.0, 8, 8);
  const galileoMaterial = new MeshBasicMaterial({ color: 0x888888 });
  const galileo = new Mesh(galileoGeometry, galileoMaterial);
  
  galileo.position.set(jupiterRadius + 25, 0, 0);
  galileo.userData.isJupiterAtmosphere = true;
  galileo.userData.isSpacecraft = true;
  galileo.userData.name = "Galileo (Legacy)";
  jupiterGroup.add(galileo);
  
  // Create data transmission beams
  const beamPoints = [];
  beamPoints.push(juno.position.clone());
  beamPoints.push(new Vector3(0, 0, jupiterRadius + 100)); // Beam to Earth direction
  
  const beamGeometry = new BufferGeometry().setFromPoints(beamPoints);
  const beamMaterial = new LineBasicMaterial({
    color: 0x00FF00,
    transparent: true,
    opacity: 0.7
  });
  const dataBeam = new LineLoop(beamGeometry, beamMaterial);
  dataBeam.userData.isJupiterAtmosphere = true;
  dataBeam.userData.isDataBeam = true;
  jupiterGroup.add(dataBeam);
};

// Create Jupiter's radiation belts and magnetic field
const createJupiterRadiationEnvironment = (jupiterGroup, jupiterRadius) => {
  // Create multiple radiation belt layers
  const radiationBelts = [
    { distance: 1.8, color: 0xFF0000, intensity: 0.9, name: "Inner Belt" },
    { distance: 3.5, color: 0xFF4400, intensity: 0.7, name: "Middle Belt" },
    { distance: 6.0, color: 0xFF8800, intensity: 0.5, name: "Outer Belt" },
    { distance: 10.0, color: 0xFFAA00, intensity: 0.3, name: "Extended Belt" }
  ];
  
  radiationBelts.forEach(belt => {
    // Create torus-shaped radiation belt
    const beltGeometry = new RingGeometry(
      jupiterRadius * belt.distance * 0.9,
      jupiterRadius * belt.distance * 1.1,
      32,
      8
    );
    const beltMaterial = new MeshBasicMaterial({
      color: belt.color,
      transparent: true,
      opacity: belt.intensity * 0.3,
      side: DoubleSide
    });
    const beltMesh = new Mesh(beltGeometry, beltMaterial);
    beltMesh.rotation.x = Math.PI / 2;
    beltMesh.userData.isJupiterAtmosphere = true;
    beltMesh.userData.isRadiationBelt = true;
    beltMesh.userData.beltName = belt.name;
    jupiterGroup.add(beltMesh);
    
    // Add radiation particles
    const particleCount = 500;
    const particlePositions = [];
    const particleColors = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = jupiterRadius * belt.distance + (Math.random() - 0.5) * jupiterRadius * 0.4;
      const height = (Math.random() - 0.5) * jupiterRadius * 0.2;
      
      particlePositions.push(
        radius * Math.cos(angle),
        height,
        radius * Math.sin(angle)
      );
      
      const color = new Color(belt.color);
      particleColors.push(color.r, color.g, color.b);
    }
    
    const particleGeometry = new BufferGeometry();
    particleGeometry.setAttribute('position', new Float32BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new Float32BufferAttribute(particleColors, 3));
    
    const particleMaterial = new PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: belt.intensity * 0.6,
      blending: AdditiveBlending
    });
    
    const radiationParticles = new Points(particleGeometry, particleMaterial);
    radiationParticles.userData.isJupiterAtmosphere = true;
    radiationParticles.userData.isRadiationParticles = true;
    jupiterGroup.add(radiationParticles);
  });
  
  // Create magnetic field lines
  const magneticLines = 12;
  for (let line = 0; line < magneticLines; line++) {
    const linePoints = [];
    const startAngle = (line / magneticLines) * Math.PI * 2;
    
    for (let i = 0; i <= 50; i++) {
      const t = i / 50;
      const angle = startAngle;
      const radius = jupiterRadius * (1.2 + t * 8);
      const height = Math.sin(t * Math.PI) * jupiterRadius * 4;
      
      linePoints.push(new Vector3(
        radius * Math.cos(angle),
        height,
        radius * Math.sin(angle)
      ));
    }
    
    const magneticGeometry = new BufferGeometry().setFromPoints(linePoints);
    const magneticMaterial = new LineBasicMaterial({
      color: 0x4488FF,
      transparent: true,
      opacity: 0.4
    });
    const magneticLine = new LineLoop(magneticGeometry, magneticMaterial);
    magneticLine.userData.isJupiterAtmosphere = true;
    magneticLine.userData.isMagneticField = true;
    jupiterGroup.add(magneticLine);
  }
};

// Enhanced Jupiter atmospheric visualization with 3D data elements
const createJupiterAtmosphericVisualization = (scene, globe, globeGroup, atmosphericData) => {
  const jupiterRadius = 50; // Scaled radius for visualization
  
  // Clear previous visualizations
  const existingElements = globeGroup.children.filter(child => child.userData.isJupiterAtmosphere);
  existingElements.forEach(element => globeGroup.remove(element));
  
  // Create storm systems with particle effects
  createJupiterStormSystems(globeGroup, jupiterRadius, atmosphericData);
  
  // Create mission spacecraft
  createJupiterMissionSpacecraft(globeGroup, jupiterRadius);
  
  // Create radiation environment
  createJupiterRadiationEnvironment(globeGroup, jupiterRadius);
  
  // Create aurora visualization at poles
  const auroraIntensity = parseFloat(atmosphericData.auroralActivity.intensity) / 100;
  if (auroraIntensity > 0.3) {
    // North pole aurora
    const northAuroraGeometry = new CylinderGeometry(
      jupiterRadius * 0.3,
      jupiterRadius * 0.1,
      jupiterRadius * 0.4,
      16,
      1,
      true
    );
    const northAuroraMaterial = new MeshBasicMaterial({
      color: 0x00FF88,
      transparent: true,
      opacity: auroraIntensity * 0.6
    });
    const northAurora = new Mesh(northAuroraGeometry, northAuroraMaterial);
    northAurora.position.y = jupiterRadius * 0.8;
    northAurora.userData.isJupiterAtmosphere = true;
    northAurora.userData.isAurora = true;
    globeGroup.add(northAurora);
    
    // South pole aurora
    const southAurora = northAurora.clone();
    southAurora.position.y = -jupiterRadius * 0.8;
    southAurora.rotation.x = Math.PI;
    globeGroup.add(southAurora);
  }
};

// Main export function
export const showJupiterAtmosphericMonitor = (scene, globe, globeGroup, camera) => {
  console.log("Initializing Jupiter Atmospheric Monitor");
  
  // Initialize interval storage
  if (!window.astronautToolIntervals) {
    window.astronautToolIntervals = [];
  }
  
  // Create info panel
  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    verticalButton.innerHTML = `
      <div style="color: #ffffff; font-family: 'Montserrat', sans-serif;">
        <h3 style="color: #FFA500; margin-bottom: 15px; font-size: 18px; text-align: center;">
          Jupiter Atmospheric Monitor
        </h3>
        
        <div id="jupiter-atmospheric-info" style="margin-top: 15px;">
          <div style="margin-bottom: 10px;">Loading Jupiter atmospheric data...</div>
        </div>
        
        <div style="margin-top: 25px; font-size: 12px; color: #aaa;">
          Simulated Jupiter data based on NASA Juno mission observations.
        </div>
      </div>
    `;
  }
  
  const updateJupiterAtmospheric = () => {
    const atmosphericData = generateJupiterAtmosphericData();
    
    const infoElement = document.getElementById('jupiter-atmospheric-info');
    if (infoElement) {
      infoElement.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(255,165,0,0.1), rgba(255,69,0,0.1)); padding: 15px; border-radius: 8px; border: 1px solid #FFA500; margin-bottom: 15px;">
          <h4 style="color: #FFA500; margin: 0 0 10px 0;">🪐 Jupiter Sol ${atmosphericData.sol} - ${atmosphericData.localTime}</h4>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
            <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px;">
              <div style="color: #FFA500; font-size: 11px; font-weight: bold;">EQUATORIAL ZONE</div>
              <div style="font-size: 10px;">Temp: ${atmosphericData.atmosphericZones.equatorial.temperature}K</div>
              <div style="font-size: 10px;">Pressure: ${atmosphericData.atmosphericZones.equatorial.pressure} Pa</div>
              <div style="font-size: 10px;">Wind: ${atmosphericData.atmosphericZones.equatorial.windSpeed} m/s</div>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px;">
              <div style="color: #FFA500; font-size: 11px; font-weight: bold;">TEMPERATE BELT</div>
              <div style="font-size: 10px;">Temp: ${atmosphericData.atmosphericZones.temperateNorth.temperature}K</div>
              <div style="font-size: 10px;">Pressure: ${atmosphericData.atmosphericZones.temperateNorth.pressure} Pa</div>
              <div style="font-size: 10px;">Wind: ${atmosphericData.atmosphericZones.temperateNorth.windSpeed} m/s</div>
            </div>
          </div>
          
          <div style="background: rgba(255,0,0,0.1); padding: 10px; border-radius: 6px; border: 1px solid #ff4444; margin-bottom: 10px;">
            <div style="color: #ff4444; font-weight: bold; font-size: 12px;">⚠️ RADIATION ENVIRONMENT</div>
            <div style="font-size: 11px;">Level: ${atmosphericData.radiationEnvironment.level}% of maximum</div>
            <div style="font-size: 11px;">Hazard: ${atmosphericData.radiationEnvironment.hazardLevel}</div>
            <div style="font-size: 11px;">Shielding: ${atmosphericData.radiationEnvironment.shieldingRequired}</div>
          </div>
          
          <div style="background: rgba(0,255,255,0.1); padding: 10px; border-radius: 6px; border: 1px solid #00ffff; margin-bottom: 10px;">
            <div style="color: #00ffff; font-weight: bold; font-size: 12px;">🌀 STORM SYSTEMS</div>
            <div style="font-size: 11px;">Great Red Spot: ${atmosphericData.stormSystems.greatRedSpot.intensity}% intensity</div>
            <div style="font-size: 11px;">Wind Speed: ${atmosphericData.stormSystems.greatRedSpot.windSpeed} m/s</div>
            <div style="font-size: 11px;">Oval BA: ${atmosphericData.stormSystems.ovalBA.intensity}% intensity</div>
          </div>
          
          <div style="background: rgba(0,255,0,0.1); padding: 10px; border-radius: 6px; border: 1px solid #00ff00; margin-bottom: 10px;">
            <div style="color: #00ff00; font-weight: bold; font-size: 12px;">🧲 MAGNETIC FIELD</div>
            <div style="font-size: 11px;">Strength: ${atmosphericData.magneticField.strength} nT</div>
            <div style="font-size: 11px;">Dipole Offset: ${atmosphericData.magneticField.dipoleOffset}</div>
            <div style="font-size: 11px;">Auroral Activity: ${atmosphericData.auroralActivity.intensity}%</div>
          </div>
          
          <div style="background: ${atmosphericData.missionAssessment.overallSafety === 'HIGH RISK' ? 'rgba(255,0,0,0.2)' : 'rgba(255,255,0,0.2)'}; padding: 10px; border-radius: 6px; border: 1px solid ${atmosphericData.missionAssessment.overallSafety === 'HIGH RISK' ? '#ff0000' : '#ffff00'};">
            <div style="color: ${atmosphericData.missionAssessment.overallSafety === 'HIGH RISK' ? '#ff0000' : '#ffff00'}; font-weight: bold; font-size: 12px;">🚀 MISSION ASSESSMENT</div>
            <div style="font-size: 11px;">Safety Level: ${atmosphericData.missionAssessment.overallSafety}</div>
            <div style="font-size: 11px;">Orbit Safety: ${atmosphericData.missionAssessment.orbitSafety}</div>
            <div style="font-size: 11px;">Action: ${atmosphericData.missionAssessment.recommendedAction}</div>
          </div>
          
          <div style="margin-top: 15px; padding: 10px; background: rgba(255,165,0,0.1); border-radius: 6px; border: 1px dashed #FFA500;">
            <div style="color: #FFA500; font-weight: bold; font-size: 11px;">ATMOSPHERIC COMPOSITION</div>
            <div style="font-size: 10px; line-height: 1.3;">
              • Hydrogen (H₂): 89.8%<br>
              • Helium (He): 10.2%<br>
              • Trace: CH₄, NH₃, H₂O, PH₃
            </div>
          </div>
        </div>
      `;
    }
  };
  
  // Generate initial atmospheric data for visualization
  const initialAtmosphericData = generateJupiterAtmosphericData();
  
  // Create atmospheric visualization
  createJupiterAtmosphericVisualization(scene, globe, globeGroup, initialAtmosphericData);
  
  // Update immediately and then every 30 seconds
  updateJupiterAtmospheric();
  const intervalId = setInterval(updateJupiterAtmospheric, 30000);
  window.astronautToolIntervals.push(intervalId);
  
  console.log("Jupiter Atmospheric Monitor initialized successfully");
};
