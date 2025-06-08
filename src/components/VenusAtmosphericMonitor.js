/**
 * VenusAtmosphericMonitor.js - Venus Atmospheric Data Visualization
 * 
 * This component provides real-time atmospheric monitoring for Venus,
 * simulating data from various Venus missions including Magellan, Venus Express,
 * and Parker Solar Probe observations. It visualizes Venus's extreme atmospheric
 * conditions, greenhouse effect, and surface environment.
 */

import { Vector3, Color, SphereGeometry, MeshBasicMaterial, Mesh, BufferGeometry, LineBasicMaterial, LineLoop, Points, Float32BufferAttribute, PointsMaterial, AdditiveBlending, CylinderGeometry } from 'three';

// Constants for Venus data simulation
const VENUS_SOL_LENGTH = 2802; // Venus day length in Earth hours (retrograde rotation)
const VENUS_ATMOSPHERIC_LAYERS = {
  SURFACE: { altitude: 0, pressure: 9200000, temp: 737 }, // Extreme surface conditions
  LOWER_CLOUDS: { altitude: 48, pressure: 180000, temp: 333 },
  UPPER_CLOUDS: { altitude: 70, pressure: 20000, temp: 233 },
  THERMOSPHERE: { altitude: 120, pressure: 1, temp: 300 }
};

const VENUS_CLOUD_LAYERS = [
  { name: "Lower Haze", altitude: 30, density: 0.3, composition: "H₂SO₄ droplets" },
  { name: "Main Cloud Deck", altitude: 60, density: 0.8, composition: "Concentrated H₂SO₄" },
  { name: "Upper Haze", altitude: 80, density: 0.2, composition: "H₂SO₄ aerosols" }
];

const VENUS_ATMOSPHERIC_FEATURES = [
  { name: "Y-shaped Cloud Pattern", lat: 0, lon: 0, intensity: 75, type: "Global circulation" },
  { name: "Polar Vortex North", lat: 85, lon: 0, intensity: 85, type: "Atmospheric vortex" },
  { name: "Polar Vortex South", lat: -85, lon: 180, intensity: 80, type: "Atmospheric vortex" },
  { name: "Retrograde Superrotation", lat: 0, lon: 90, intensity: 90, type: "Global wind system" }
];

// Generate realistic Venus atmospheric data
const generateVenusAtmosphericData = () => {
  const currentTime = Date.now();
  const venusDay = (currentTime / (1000 * 60 * 60 * VENUS_SOL_LENGTH)) % 1;
  const seasonalVariation = 0; // Venus has no significant seasons due to minimal axial tilt
  
  // Surface conditions (extremely stable due to thick atmosphere)
  const surfacePressure = 9200000 + (Math.sin(venusDay * 2 * Math.PI) * 50000); // Very stable
  const surfaceTemp = 737 + (Math.sin(venusDay * 2 * Math.PI) * 2); // Minimal variation
  
  // Atmospheric layers
  const lowerCloudPressure = 180000 + (Math.sin(venusDay * 3 * Math.PI) * 10000);
  const lowerCloudTemp = 333 + (Math.cos(venusDay * 2 * Math.PI) * 5);
  
  const upperCloudPressure = 20000 + (Math.sin(venusDay * 4 * Math.PI) * 2000);
  const upperCloudTemp = 233 + (Math.cos(venusDay * 2.5 * Math.PI) * 8);
  
  // Wind speeds - Venus has extreme atmospheric circulation
  const superrotationSpeed = 120 + (Math.sin(venusDay * 2 * Math.PI) * 20); // ~120 m/s at cloud level
  const surfaceWindSpeed = 0.3 + (Math.random() * 0.4); // Very slow surface winds
  const upperAtmosphereWind = 100 + (Math.random() * 30);
  
  // Atmospheric composition and chemistry
  const co2Concentration = 96.5; // Constant
  const n2Concentration = 3.5; // Constant
  const so2Concentration = 100 + (Math.sin(venusDay * 5 * Math.PI) * 20); // ppm, varies
  const h2so4CloudDensity = 75 + (Math.sin(venusDay * 3 * Math.PI) * 15);
  
  // Lightning activity (very high on Venus)
  const lightningActivity = Math.max(70, Math.min(95, 80 + (Math.sin(venusDay * 6 * Math.PI) * 15) + (Math.random() * 10 - 5)));
  
  // Greenhouse effect intensity
  const greenhouseEffect = Math.max(95, Math.min(98, 96.5 + (Math.sin(venusDay * 1.5 * Math.PI) * 1.5)));
  
  // Atmospheric circulation patterns
  const yShapeIntensity = Math.max(70, Math.min(85, 77 + (Math.sin(venusDay * 2 * Math.PI) * 8)));
  const polarVortexActivity = Math.max(75, Math.min(90, 82 + (Math.cos(venusDay * 3 * Math.PI) * 7)));
  
  // Solar wind interaction (Venus has no magnetosphere)
  const atmosphericLossRate = 0.5 + (Math.random() * 0.3); // kg/s
  
  return {
    sol: Math.floor(currentTime / (1000 * 60 * 60 * VENUS_SOL_LENGTH)),
    localTime: `${Math.floor(venusDay * 24).toString().padStart(2, '0')}:${Math.floor((venusDay * 24 * 60) % 60).toString().padStart(2, '0')}`,
    surfaceConditions: {
      pressure: (surfacePressure / 1000).toFixed(1), // Convert to kPa
      temperature: surfaceTemp.toFixed(1),
      windSpeed: surfaceWindSpeed.toFixed(2),
      visibility: "0 km (opaque atmosphere)",
      leadMeltingPoint: "Exceeded (327°C)"
    },
    atmosphericLayers: {
      lowerClouds: {
        pressure: (lowerCloudPressure / 1000).toFixed(1),
        temperature: lowerCloudTemp.toFixed(1),
        density: h2so4CloudDensity.toFixed(1),
        composition: "H₂SO₄ 75-96%"
      },
      upperClouds: {
        pressure: (upperCloudPressure / 1000).toFixed(1),
        temperature: upperCloudTemp.toFixed(1),
        windSpeed: superrotationSpeed.toFixed(1),
        composition: "H₂SO₄ aerosols"
      }
    },
    atmosphericComposition: {
      carbonDioxide: co2Concentration.toFixed(1),
      nitrogen: n2Concentration.toFixed(1),
      sulfurDioxide: so2Concentration.toFixed(1),
      waterVapor: "20 ppm",
      carbonMonoxide: "17 ppm"
    },
    circulation: {
      superrotation: {
        speed: superrotationSpeed.toFixed(1),
        period: "4-5 Earth days",
        direction: "Retrograde"
      },
      yShapePattern: {
        intensity: yShapeIntensity.toFixed(1),
        wavelength: "10,000 km",
        period: "4-6 days"
      },
      polarVortices: {
        northIntensity: polarVortexActivity.toFixed(1),
        southIntensity: (polarVortexActivity - 5).toFixed(1),
        diameter: "2,000 km each"
      }
    },
    extremeConditions: {
      greenhouseEffect: {
        intensity: greenhouseEffect.toFixed(1),
        temperatureIncrease: "462°C above blackbody",
        efficiency: "99.99% heat retention"
      },
      lightningActivity: {
        frequency: lightningActivity.toFixed(1),
        type: "Electromagnetic bursts",
        intensity: "1000x Earth average"
      },
      corrosion: {
        level: "EXTREME",
        materials: "All metals dissolve",
        atmosphere: "Highly corrosive"
      }
    },
    solarWind: {
      atmosphericLoss: atmosphericLossRate.toFixed(2),
      magnetosphere: "None",
      interaction: "Direct atmospheric erosion"
    },
    missionAssessment: {
      overallSafety: "EXTREME HAZARD",
      surfaceMission: "Impossible (current technology)",
      atmosphericMission: "Possible above 60km with protection",
      orbitMission: "Feasible with heat shielding",
      communicationStatus: lightningActivity < 85 ? "Possible" : "Severely degraded",
      recommendedAction: "Maintain orbital distance >300km",
      survivalTime: {
        surface: "Minutes (unprotected spacecraft)",
        atmosphere: "Hours to days (protected)",
        orbit: "Extended (with proper shielding)"
      }
    }
  };
};

// Create 3D visualization elements for Venus's atmosphere
const createVenusAtmosphericVisualization = (scene, globe, globeGroup) => {
  const venusRadius = 40; // Scaled radius for visualization
  
  // Create atmospheric layers visualization
  VENUS_CLOUD_LAYERS.forEach((layer, index) => {
    const layerRadius = venusRadius + (layer.altitude * 0.5);
    const layerGeometry = new SphereGeometry(layerRadius, 32, 16);
    const layerMaterial = new MeshBasicMaterial({ 
      color: layer.name.includes("Main") ? 0xffcc66 : 0xffddaa,
      transparent: true,
      opacity: layer.density * 0.3,
      wireframe: index % 2 === 0
    });
    const layerMesh = new Mesh(layerGeometry, layerMaterial);
    layerMesh.userData = { isVenusAtmosphericTool: true, layerName: layer.name };
    globeGroup.add(layerMesh);
  });
  
  // Create atmospheric circulation patterns
  VENUS_ATMOSPHERIC_FEATURES.forEach((feature, index) => {
    if (feature.name.includes("Y-shaped")) {
      // Create Y-shaped cloud pattern
      const yPatternPoints = [];
      
      // Create three arms of the Y pattern
      for (let arm = 0; arm < 3; arm++) {
        const armAngle = (arm * 2 * Math.PI) / 3;
        for (let i = 0; i < 20; i++) {
          const t = i / 19;
          const radius = venusRadius + 30;
          const x = Math.cos(armAngle) * radius * t;
          const y = Math.sin(armAngle) * radius * t * 0.3;
          const z = Math.sin(armAngle) * radius * t;
          yPatternPoints.push(new Vector3(x, y, z));
        }
      }
      
      const yPatternGeometry = new BufferGeometry().setFromPoints(yPatternPoints);
      const yPatternMaterial = new LineBasicMaterial({ 
        color: 0xffaa44, 
        transparent: true, 
        opacity: 0.7 
      });
      const yPattern = new LineLoop(yPatternGeometry, yPatternMaterial);
      yPattern.userData = { isVenusAtmosphericTool: true };
      globeGroup.add(yPattern);
    }
    
    if (feature.name.includes("Vortex")) {
      // Create polar vortex visualization
      const vortexGeometry = new SphereGeometry(3, 16, 16);
      const vortexMaterial = new MeshBasicMaterial({ 
        color: 0xff6644,
        transparent: true,
        opacity: 0.8
      });
      const vortexMesh = new Mesh(vortexGeometry, vortexMaterial);
      
      // Position at pole
      const isNorth = feature.lat > 0;
      vortexMesh.position.set(0, isNorth ? venusRadius + 35 : -(venusRadius + 35), 0);
      vortexMesh.userData = { isVenusAtmosphericTool: true, vortexName: feature.name };
      globeGroup.add(vortexMesh);
      
      // Create vortex circulation
      const vortexPoints = [];
      for (let i = 0; i <= 32; i++) {
        const angle = (i / 32) * Math.PI * 2;
        const spiralRadius = 5 + (i / 32) * 3;
        const x = Math.cos(angle) * spiralRadius;
        const y = vortexMesh.position.y;
        const z = Math.sin(angle) * spiralRadius;
        vortexPoints.push(new Vector3(x, y, z));
      }
      
      const vortexCirculationGeometry = new BufferGeometry().setFromPoints(vortexPoints);
      const vortexCirculationMaterial = new LineBasicMaterial({ 
        color: 0xff8844, 
        transparent: true, 
        opacity: 0.6 
      });
      const vortexCirculation = new LineLoop(vortexCirculationGeometry, vortexCirculationMaterial);
      vortexCirculation.userData = { isVenusAtmosphericTool: true };
      globeGroup.add(vortexCirculation);
    }
  });
  
  // Create lightning visualization
  const lightningPoints = [];
  for (let i = 0; i < 50; i++) {
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI;
    const radius = venusRadius + 20 + Math.random() * 20;
    
    lightningPoints.push(new Vector3(
      radius * Math.sin(theta) * Math.cos(phi),
      radius * Math.cos(theta),
      radius * Math.sin(theta) * Math.sin(phi)
    ));
  }
  
  const lightningGeometry = new BufferGeometry();
  lightningGeometry.setAttribute('position', new Float32BufferAttribute(lightningPoints.flatMap(p => [p.x, p.y, p.z]), 3));
  const lightningMaterial = new PointsMaterial({ 
    color: 0xffff00, 
    size: 1.5, 
    transparent: true, 
    opacity: 0.8 
  });
  const lightning = new Points(lightningGeometry, lightningMaterial);
  lightning.userData = { isVenusAtmosphericTool: true };
  globeGroup.add(lightning);
  
  // Create heat signature visualization
  const heatGeometry = new SphereGeometry(venusRadius + 50, 32, 16);
  const heatMaterial = new MeshBasicMaterial({ 
    color: 0xff4400,
    transparent: true,
    opacity: 0.1,
    wireframe: true
  });
  const heatSignature = new Mesh(heatGeometry, heatMaterial);
  heatSignature.userData = { isVenusAtmosphericTool: true };
  globeGroup.add(heatSignature);
};

// Enhanced 3D atmospheric particle systems for Venus
const createVenusAtmosphericParticles = (scene, globe, globeGroup) => {
  const venusRadius = 40;
  const particleSystems = [];
  
  // Dense acid cloud system
  const acidCloudCount = 2500;
  const acidPositions = new Float32Array(acidCloudCount * 3);
  const acidVelocities = new Float32Array(acidCloudCount * 3);
  
  for (let i = 0; i < acidCloudCount; i++) {
    // Create dense sulfuric acid cloud layer
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI;
    const radius = venusRadius + 30 + Math.random() * 40; // Cloud deck altitude
    
    acidPositions[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
    acidPositions[i * 3 + 1] = radius * Math.cos(theta);
    acidPositions[i * 3 + 2] = radius * Math.sin(theta) * Math.sin(phi);
    
    // Superrotation velocity (4-day circulation)
    const speed = 0.05 + Math.random() * 0.03;
    acidVelocities[i * 3] = -Math.sin(phi) * speed;
    acidVelocities[i * 3 + 1] = 0;
    acidVelocities[i * 3 + 2] = Math.cos(phi) * speed;
  }
  
  const acidGeometry = new BufferGeometry();
  acidGeometry.setAttribute('position', new Float32BufferAttribute(acidPositions, 3));
  acidGeometry.setAttribute('velocity', new Float32BufferAttribute(acidVelocities, 3));
  
  const acidMaterial = new PointsMaterial({
    color: 0xffcc44,
    size: 0.4,
    transparent: true,
    opacity: 0.7,
    blending: AdditiveBlending
  });
  
  const acidClouds = new Points(acidGeometry, acidMaterial);
  acidClouds.userData = { isVenusAtmosphericTool: true, type: 'acidClouds' };
  globeGroup.add(acidClouds);
  particleSystems.push(acidClouds);
  
  // Y-shaped cloud pattern particles
  const yPatternCount = 1200;
  const yPositions = new Float32Array(yPatternCount * 3);
  const yVelocities = new Float32Array(yPatternCount * 3);
  
  for (let i = 0; i < yPatternCount; i++) {
    // Create particles along three arms of Y pattern
    const arm = Math.floor(i / (yPatternCount / 3));
    const armAngle = (arm * 2 * Math.PI) / 3;
    const t = (i % (yPatternCount / 3)) / (yPatternCount / 3);
    
    const radius = venusRadius + 35;
    const x = Math.cos(armAngle) * radius * t;
    const y = Math.sin(armAngle) * radius * t * 0.3;
    const z = Math.sin(armAngle) * radius * t;
    
    yPositions[i * 3] = x;
    yPositions[i * 3 + 1] = y;
    yPositions[i * 3 + 2] = z;
    
    // Pattern circulation velocity
    yVelocities[i * 3] = -Math.sin(armAngle) * 0.02;
    yVelocities[i * 3 + 1] = 0;
    yVelocities[i * 3 + 2] = Math.cos(armAngle) * 0.02;
  }
  
  const yGeometry = new BufferGeometry();
  yGeometry.setAttribute('position', new Float32BufferAttribute(yPositions, 3));
  yGeometry.setAttribute('velocity', new Float32BufferAttribute(yVelocities, 3));
  
  const yMaterial = new PointsMaterial({
    color: 0xffaa66,
    size: 0.3,
    transparent: true,
    opacity: 0.8,
    blending: AdditiveBlending
  });
  
  const yPattern = new Points(yGeometry, yMaterial);
  yPattern.userData = { isVenusAtmosphericTool: true, type: 'yPattern' };
  globeGroup.add(yPattern);
  particleSystems.push(yPattern);
  
  // Lightning discharge particles
  const lightningCount = 300;
  const lightningPositions = new Float32Array(lightningCount * 3);
  const lightningIntensities = new Float32Array(lightningCount);
  
  for (let i = 0; i < lightningCount; i++) {
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI;
    const radius = venusRadius + 20 + Math.random() * 30;
    
    lightningPositions[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
    lightningPositions[i * 3 + 1] = radius * Math.cos(theta);
    lightningPositions[i * 3 + 2] = radius * Math.sin(theta) * Math.sin(phi);
    
    lightningIntensities[i] = Math.random();
  }
  
  const lightningGeometry = new BufferGeometry();
  lightningGeometry.setAttribute('position', new Float32BufferAttribute(lightningPositions, 3));
  lightningGeometry.setAttribute('intensity', new Float32BufferAttribute(lightningIntensities, 1));
  
  const lightningMaterial = new PointsMaterial({
    color: 0xffff44,
    size: 1.2,
    transparent: true,
    opacity: 0.9,
    blending: AdditiveBlending
  });
  
  const lightningSystem = new Points(lightningGeometry, lightningMaterial);
  lightningSystem.userData = { isVenusAtmosphericTool: true, type: 'lightning' };
  globeGroup.add(lightningSystem);
  particleSystems.push(lightningSystem);
  
  return particleSystems;
};

// Create Venus mission spacecraft visualizations
const createVenusMissionSpacecraft = (scene, globe, globeGroup) => {
  const venusRadius = 40;
  const spacecraft = [];
  
  // Venus Express orbiter (ESA mission 2006-2014)
  const venusExpressGeometry = new CylinderGeometry(0.2, 0.2, 1.2, 8);
  const venusExpressMaterial = new MeshBasicMaterial({ color: 0x0066ff });
  const venusExpress = new Mesh(venusExpressGeometry, venusExpressMaterial);
  
  // Position in polar orbit
  venusExpress.position.set(0, venusRadius * 2.5, venusRadius * 1.5);
  venusExpress.userData = { 
    isVenusAtmosphericTool: true, 
    type: 'spacecraft', 
    name: 'Venus Express',
    orbitRadius: venusRadius * 2.0,
    orbitSpeed: 0.012,
    angle: 0,
    orbitType: 'polar'
  };
  globeGroup.add(venusExpress);
  spacecraft.push(venusExpress);
  
  // Create Venus Express orbital path
  const expressPathPoints = [];
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    const x = 0; // Polar orbit
    const y = Math.cos(angle) * venusRadius * 2.0;
    const z = Math.sin(angle) * venusRadius * 2.0;
    expressPathPoints.push(new Vector3(x, y, z));
  }
  
  const expressPathGeometry = new BufferGeometry().setFromPoints(expressPathPoints);
  const expressPathMaterial = new LineBasicMaterial({ 
    color: 0x0066ff, 
    transparent: true, 
    opacity: 0.4 
  });
  const expressPath = new LineLoop(expressPathGeometry, expressPathMaterial);
  expressPath.userData = { isVenusAtmosphericTool: true, type: 'orbitPath' };
  globeGroup.add(expressPath);
  
  // Parker Solar Probe (occasional Venus flyby)
  const parkerGeometry = new SphereGeometry(0.15, 8, 8);
  const parkerMaterial = new MeshBasicMaterial({ color: 0xff6600 });
  const parker = new Mesh(parkerGeometry, parkerMaterial);
  
  // Position in distant approach trajectory
  parker.position.set(venusRadius * 4, venusRadius * 2, venusRadius * 3);
  parker.userData = { 
    isVenusAtmosphericTool: true, 
    type: 'spacecraft', 
    name: 'Parker Solar Probe',
    trajectory: 'flyby',
    speed: 0.025
  };
  globeGroup.add(parker);
  spacecraft.push(parker);
  
  // Magellan radar mapper (historical)
  const magellanGeometry = new CylinderGeometry(0.25, 0.25, 1.0, 6);
  const magellanMaterial = new MeshBasicMaterial({ color: 0xcccccc });
  const magellan = new Mesh(magellanGeometry, magellanMaterial);
  
  // Position in mapping orbit
  magellan.position.set(venusRadius * 1.8, 0, 0);
  magellan.userData = { 
    isVenusAtmosphericTool: true, 
    type: 'spacecraft', 
    name: 'Magellan',
    orbitRadius: venusRadius * 1.8,
    orbitSpeed: 0.008,
    angle: Math.PI,
    mission: 'radar mapping'
  };
  globeGroup.add(magellan);
  spacecraft.push(magellan);
  
  return spacecraft;
};

// Animation function for Venus atmospheric systems
const animateVenusAtmosphere = (particleSystems, spacecraft) => {
  const time = Date.now() * 0.001;
  
  // Animate atmospheric particle systems
  particleSystems.forEach(system => {
    const positions = system.geometry.attributes.position.array;
    const velocities = system.geometry.attributes.velocity.array;
    
    for (let i = 0; i < positions.length; i += 3) {
      // Update positions based on velocities
      positions[i] += velocities[i];
      positions[i + 1] += velocities[i + 1];
      positions[i + 2] += velocities[i + 2];
      
      // Superrotation circulation for acid clouds
      if (system.userData.type === 'acidClouds') {
        const radius = Math.sqrt(positions[i] * positions[i] + positions[i + 2] * positions[i + 2]);
        const targetRadius = 40 + 35; // Venus radius + cloud altitude
        
        if (Math.abs(radius - targetRadius) > 20) {
          // Reset clouds that drift too far
          const angle = Math.atan2(positions[i + 2], positions[i]);
          positions[i] = Math.cos(angle) * targetRadius;
          positions[i + 2] = Math.sin(angle) * targetRadius;
        }
      }
      
      // Y-pattern reformation
      if (system.userData.type === 'yPattern') {
        // Maintain Y-pattern structure with some turbulence
        const centerDist = Math.sqrt(positions[i] * positions[i] + positions[i + 2] * positions[i + 2]);
        if (centerDist > 80) {
          // Reset particles that drift beyond pattern
          const arm = Math.floor(Math.random() * 3);
          const armAngle = (arm * 2 * Math.PI) / 3;
          const t = Math.random();
          const radius = 40 + 35;
          
          positions[i] = Math.cos(armAngle) * radius * t;
          positions[i + 1] = Math.sin(armAngle) * radius * t * 0.3;
          positions[i + 2] = Math.sin(armAngle) * radius * t;
        }
      }
      
      // Lightning flicker effect
      if (system.userData.type === 'lightning') {
        // Random lightning repositioning for discharge effect
        if (Math.random() < 0.02) {
          const phi = Math.random() * Math.PI * 2;
          const theta = Math.random() * Math.PI;
          const radius = 40 + 20 + Math.random() * 30;
          
          positions[i] = radius * Math.sin(theta) * Math.cos(phi);
          positions[i + 1] = radius * Math.cos(theta);
          positions[i + 2] = radius * Math.sin(theta) * Math.sin(phi);
        }
      }
    }
    
    system.geometry.attributes.position.needsUpdate = true;
  });
  
  // Animate spacecraft
  spacecraft.forEach(craft => {
    if (craft.userData.name === 'Venus Express') {
      // Polar orbit
      craft.userData.angle += craft.userData.orbitSpeed;
      craft.position.x = 0;
      craft.position.y = Math.cos(craft.userData.angle) * craft.userData.orbitRadius;
      craft.position.z = Math.sin(craft.userData.angle) * craft.userData.orbitRadius;
      
      // Point toward Venus
      craft.lookAt(0, 0, 0);
    } else if (craft.userData.name === 'Magellan') {
      // Equatorial mapping orbit
      craft.userData.angle += craft.userData.orbitSpeed;
      craft.position.x = Math.cos(craft.userData.angle) * craft.userData.orbitRadius;
      craft.position.y = 0;
      craft.position.z = Math.sin(craft.userData.angle) * craft.userData.orbitRadius;
      
      // Point toward Venus
      craft.lookAt(0, 0, 0);
    } else if (craft.userData.name === 'Parker Solar Probe') {
      // Flyby trajectory
      craft.position.x -= craft.userData.speed;
      if (craft.position.x < -200) {
        craft.position.x = 200; // Reset for next flyby
      }
    }
  });
};

// Main export function
export const showVenusAtmosphericMonitor = (scene, globe, globeGroup, camera) => {
  console.log("Initializing Venus Atmospheric Monitor");
  
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
          Venus Atmospheric Monitor
        </h3>
        
        <div id="venus-atmospheric-info" style="margin-top: 15px;">
          <div style="margin-bottom: 10px;">Loading Venus atmospheric data...</div>
        </div>
        
        <div style="margin-top: 25px; font-size: 12px; color: #aaa;">
          Simulated Venus data based on Magellan and Venus Express missions.
        </div>
      </div>
    `;
  }
  
  const updateVenusAtmospheric = () => {
    const atmosphericData = generateVenusAtmosphericData();
    
    const infoElement = document.getElementById('venus-atmospheric-info');
    if (infoElement) {
      infoElement.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(255,165,0,0.1), rgba(255,69,0,0.1)); padding: 15px; border-radius: 8px; border: 1px solid #FFA500; margin-bottom: 15px;">
          <h4 style="color: #FFA500; margin: 0 0 10px 0;">♀️ Venus Sol ${atmosphericData.sol} - ${atmosphericData.localTime}</h4>
          
          <div style="background: rgba(255,0,0,0.2); padding: 10px; border-radius: 6px; border: 1px solid #ff0000; margin-bottom: 10px;">
            <div style="color: #ff0000; font-weight: bold; font-size: 12px;">⚠️ EXTREME SURFACE CONDITIONS</div>
            <div style="font-size: 11px;">Temperature: ${atmosphericData.surfaceConditions.temperature}K (${(parseFloat(atmosphericData.surfaceConditions.temperature) - 273.15).toFixed(0)}°C)</div>
            <div style="font-size: 11px;">Pressure: ${atmosphericData.surfaceConditions.pressure} kPa (92x Earth)</div>
            <div style="font-size: 11px;">Wind Speed: ${atmosphericData.surfaceConditions.windSpeed} m/s</div>
            <div style="font-size: 11px;">Lead Status: ${atmosphericData.surfaceConditions.leadMeltingPoint}</div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
            <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px;">
              <div style="color: #FFA500; font-size: 11px; font-weight: bold;">LOWER CLOUDS</div>
              <div style="font-size: 10px;">Temp: ${atmosphericData.atmosphericLayers.lowerClouds.temperature}K</div>
              <div style="font-size: 10px;">Pressure: ${atmosphericData.atmosphericLayers.lowerClouds.pressure} kPa</div>
              <div style="font-size: 10px;">H₂SO₄: ${atmosphericData.atmosphericLayers.lowerClouds.density}%</div>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px;">
              <div style="color: #FFA500; font-size: 11px; font-weight: bold;">UPPER CLOUDS</div>
              <div style="font-size: 10px;">Temp: ${atmosphericData.atmosphericLayers.upperClouds.temperature}K</div>
              <div style="font-size: 10px;">Pressure: ${atmosphericData.atmosphericLayers.upperClouds.pressure} kPa</div>
              <div style="font-size: 10px;">Wind: ${atmosphericData.atmosphericLayers.upperClouds.windSpeed} m/s</div>
            </div>
          </div>
          
          <div style="background: rgba(255,255,0,0.1); padding: 10px; border-radius: 6px; border: 1px solid #ffff00; margin-bottom: 10px;">
            <div style="color: #ffff00; font-weight: bold; font-size: 12px;">🌪️ SUPERROTATION</div>
            <div style="font-size: 11px;">Speed: ${atmosphericData.circulation.superrotation.speed} m/s</div>
            <div style="font-size: 11px;">Period: ${atmosphericData.circulation.superrotation.period}</div>
            <div style="font-size: 11px;">Y-Pattern: ${atmosphericData.circulation.yShapePattern.intensity}% intensity</div>
            <div style="font-size: 11px;">Polar Vortex: ${atmosphericData.circulation.polarVortices.northIntensity}%</div>
          </div>
          
          <div style="background: rgba(0,255,0,0.1); padding: 10px; border-radius: 6px; border: 1px solid #00ff00; margin-bottom: 10px;">
            <div style="color: #00ff00; font-weight: bold; font-size: 12px;">🏭 GREENHOUSE EFFECT</div>
            <div style="font-size: 11px;">Intensity: ${atmosphericData.extremeConditions.greenhouseEffect.intensity}%</div>
            <div style="font-size: 11px;">Temp Increase: ${atmosphericData.extremeConditions.greenhouseEffect.temperatureIncrease}</div>
            <div style="font-size: 11px;">Heat Retention: ${atmosphericData.extremeConditions.greenhouseEffect.efficiency}</div>
          </div>
          
          <div style="background: rgba(255,255,0,0.1); padding: 10px; border-radius: 6px; border: 1px solid #ffff00; margin-bottom: 10px;">
            <div style="color: #ffff00; font-weight: bold; font-size: 12px;">⚡ LIGHTNING ACTIVITY</div>
            <div style="font-size: 11px;">Frequency: ${atmosphericData.extremeConditions.lightningActivity.frequency}%</div>
            <div style="font-size: 11px;">Type: ${atmosphericData.extremeConditions.lightningActivity.type}</div>
            <div style="font-size: 11px;">Intensity: ${atmosphericData.extremeConditions.lightningActivity.intensity}</div>
          </div>
          
          <div style="background: rgba(255,0,0,0.2); padding: 10px; border-radius: 6px; border: 1px solid #ff0000;">
            <div style="color: #ff0000; font-weight: bold; font-size: 12px;">🚀 MISSION ASSESSMENT</div>
            <div style="font-size: 11px;">Safety Level: ${atmosphericData.missionAssessment.overallSafety}</div>
            <div style="font-size: 11px;">Surface Mission: ${atmosphericData.missionAssessment.surfaceMission}</div>
            <div style="font-size: 11px;">Atmospheric: ${atmosphericData.missionAssessment.atmosphericMission}</div>
            <div style="font-size: 11px;">Surface Survival: ${atmosphericData.missionAssessment.survivalTime.surface}</div>
            <div style="font-size: 11px;">Action: ${atmosphericData.missionAssessment.recommendedAction}</div>
          </div>
          
          <div style="margin-top: 15px; padding: 10px; background: rgba(255,165,0,0.1); border-radius: 6px; border: 1px dashed #FFA500;">
            <div style="color: #FFA500; font-weight: bold; font-size: 11px;">ATMOSPHERIC COMPOSITION</div>
            <div style="font-size: 10px; line-height: 1.3;">
              • Carbon Dioxide (CO₂): ${atmosphericData.atmosphericComposition.carbonDioxide}%<br>
              • Nitrogen (N₂): ${atmosphericData.atmosphericComposition.nitrogen}%<br>
              • Sulfur Dioxide (SO₂): ${atmosphericData.atmosphericComposition.sulfurDioxide} ppm<br>
              • Water Vapor (H₂O): ${atmosphericData.atmosphericComposition.waterVapor}<br>
              • Carbon Monoxide (CO): ${atmosphericData.atmosphericComposition.carbonMonoxide}
            </div>
          </div>
        </div>
      `;
    }
  };
  
  // Create atmospheric visualization
  createVenusAtmosphericVisualization(scene, globe, globeGroup);
  
  // Create enhanced 3D atmospheric systems
  const particleSystems = createVenusAtmosphericParticles(scene, globe, globeGroup);
  const spacecraft = createVenusMissionSpacecraft(scene, globe, globeGroup);
  
  // Animation loop for Venus atmospheric systems
  const animationLoop = () => {
    animateVenusAtmosphere(particleSystems, spacecraft);
  };
  
  // Add to global animation loop
  if (typeof window.addToAnimationLoop === 'function') {
    window.addToAnimationLoop(animationLoop);
  }
  
  // Update immediately and then every 30 seconds
  updateVenusAtmospheric();
  const intervalId = setInterval(updateVenusAtmospheric, 30000);
  window.astronautToolIntervals.push(intervalId);
  
  console.log("Venus Atmospheric Monitor initialized successfully");
  
  // Return cleanup function
  return () => {
    // Remove all Venus atmospheric tool objects
    const objectsToRemove = [];
    globe.scene().traverse((object) => {
      if (object.userData && object.userData.isVenusAtmosphericTool) {
        objectsToRemove.push(object);
      }
    });
    
    objectsToRemove.forEach(object => {
      if (object.parent) {
        object.parent.remove(object);
      }
    });
    
    // Clear intervals
    window.astronautToolIntervals.forEach(id => clearInterval(id));
    window.astronautToolIntervals = [];
    
    // Remove from global animation loop
    if (typeof window.removeFromAnimationLoop === 'function') {
      window.removeFromAnimationLoop(animationLoop);
    }
    
    console.log("Venus Atmospheric Monitor cleaned up");
  };
};
