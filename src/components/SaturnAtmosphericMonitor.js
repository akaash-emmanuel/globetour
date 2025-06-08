/**
 * SaturnAtmosphericMonitor.js - Saturn Atmospheric Data Visualization
 * 
 * This component provides real-time atmospheric monitoring for Saturn,
 * simulating data from NASA's Cassini mission. It visualizes Saturn's
 * atmospheric conditions, ring system dynamics, moon interactions, and
 * magnetosphere for mission planning and astronaut safety.
 */

import { Vector3, Color, SphereGeometry, MeshBasicMaterial, Mesh, BufferGeometry, LineBasicMaterial, LineLoop, Points, Float32BufferAttribute, PointsMaterial, RingGeometry, DoubleSide, AdditiveBlending, CylinderGeometry } from 'three';

// Constants for Saturn data simulation (based on Cassini mission observations)
const SATURN_SOL_LENGTH = 10.656; // Saturn day length in Earth hours
const SATURN_ATMOSPHERIC_LAYERS = {
  TROPOSPHERE: { altitude: 0, pressure: 100000, temp: 134 }, // Base layer
  STRATOSPHERE: { altitude: 60, pressure: 10, temp: 88 },
  THERMOSPHERE: { altitude: 400, pressure: 0.001, temp: 420 }
};

const SATURN_RING_SYSTEM = [
  { name: "D Ring", innerRadius: 1.11, outerRadius: 1.236, opacity: 0.1, particles: "Fine dust" },
  { name: "C Ring", innerRadius: 1.236, outerRadius: 1.526, opacity: 0.3, particles: "Ice particles" },
  { name: "B Ring", innerRadius: 1.526, outerRadius: 1.95, opacity: 0.8, particles: "Dense ice chunks" },
  { name: "A Ring", innerRadius: 2.027, outerRadius: 2.27, opacity: 0.6, particles: "Ice boulders" },
  { name: "F Ring", innerRadius: 2.326, outerRadius: 2.334, opacity: 0.4, particles: "Shepherd moons" },
  { name: "E Ring", innerRadius: 3.0, outerRadius: 8.0, opacity: 0.05, particles: "Enceladus ice" }
];

const SATURN_STORM_SYSTEMS = [
  { name: "North Polar Hexagon", lat: 78, lon: 0, intensity: 65, diameter: 30000 },
  { name: "Great White Spot", lat: -33, lon: 160, intensity: 80, diameter: 17000 },
  { name: "Dragon Storm", lat: -36, lon: 55, intensity: 70, diameter: 3000 }
];

const SATURN_MAJOR_MOONS = [
  { name: "Titan", distance: 20.2, diameter: 5149, atmosphere: "Dense N₂/CH₄" },
  { name: "Enceladus", distance: 4.0, diameter: 504, geysers: "Active" },
  { name: "Iapetus", distance: 59.1, diameter: 1469, composition: "Ice/Rock" },
  { name: "Rhea", distance: 8.7, diameter: 1527, rings: "Possible" }
];

// Generate realistic Saturn atmospheric data
const generateSaturnAtmosphericData = () => {
  const currentTime = Date.now();
  const saturnDay = (currentTime / (1000 * 60 * 60 * SATURN_SOL_LENGTH)) % 1;
  const seasonalVariation = Math.sin((currentTime / (1000 * 60 * 60 * 24 * 365.25 * 29.46)) * 2 * Math.PI) * 0.2; // 29.46 year Saturn year
  
  // Atmospheric pressure variations by latitude
  const equatorialPressure = 100000 + (Math.sin(saturnDay * 2 * Math.PI) * 8000) + (seasonalVariation * 12000);
  const temperateZonePressure = 85000 + (Math.cos(saturnDay * 2.5 * Math.PI) * 6000) + (seasonalVariation * 9000);
  const polarPressure = 75000 + (Math.sin(saturnDay * 1.8 * Math.PI) * 4000) + (seasonalVariation * 7000);
  
  // Temperature variations (Kelvin) - Saturn is very cold
  const equatorialTemp = 134 + (Math.sin(saturnDay * 2 * Math.PI) * 6) + (seasonalVariation * 12);
  const temperateTemp = 125 + (Math.cos(saturnDay * 2.2 * Math.PI) * 8) + (seasonalVariation * 10);
  const polarTemp = 110 + (Math.sin(saturnDay * 1.6 * Math.PI) * 5) + (seasonalVariation * 8);
  
  // Wind speeds (m/s) - Saturn has high-speed jet streams
  const equatorialWinds = 450 + (Math.random() * 50) + (seasonalVariation * 30);
  const temperateWinds = 320 + (Math.random() * 60) + (seasonalVariation * 40);
  const polarWinds = 150 + (Math.random() * 30) + (seasonalVariation * 20);
  
  // Magnetic field strength (nT)
  const magneticFieldStrength = 21000 + (Math.sin(saturnDay * 3 * Math.PI) * 2000) + (seasonalVariation * 3000);
  
  // Ring dynamics
  const ringDynamics = {
    particleVelocity: 15 + (Math.sin(saturnDay * 4 * Math.PI) * 3),
    spokeActivity: Math.max(0, Math.min(100, 40 + (Math.sin(saturnDay * 6 * Math.PI) * 25) + (Math.random() * 20 - 10))),
    ringTemperature: 80 + (seasonalVariation * 5) + (Math.random() * 3 - 1.5)
  };
  
  // Storm activity
  const stormActivity = Math.max(0, Math.min(100, 45 + (Math.sin(saturnDay * 2.5 * Math.PI) * 20) + (Math.random() * 15 - 7.5)));
  
  // Hexagon storm characteristics
  const hexagonActivity = Math.max(50, Math.min(85, 65 + (Math.sin(saturnDay * 1.5 * Math.PI) * 15) + (seasonalVariation * 8)));
  
  // Enceladus geysers activity
  const enceladusActivity = Math.max(60, Math.min(95, 75 + (Math.cos(saturnDay * 3 * Math.PI) * 15) + (Math.random() * 10 - 5)));
  
  return {
    sol: Math.floor(currentTime / (1000 * 60 * 60 * SATURN_SOL_LENGTH)),
    localTime: `${Math.floor(saturnDay * 24).toString().padStart(2, '0')}:${Math.floor((saturnDay * 24 * 60) % 60).toString().padStart(2, '0')}`,
    atmosphericZones: {
      equatorial: {
        pressure: equatorialPressure.toFixed(0),
        temperature: equatorialTemp.toFixed(1),
        windSpeed: equatorialWinds.toFixed(1),
        composition: "96.3% H₂, 3.25% He"
      },
      temperateZone: {
        pressure: temperateZonePressure.toFixed(0),
        temperature: temperateTemp.toFixed(1),
        windSpeed: temperateWinds.toFixed(1),
        composition: "96.4% H₂, 3.24% He"
      },
      polar: {
        pressure: polarPressure.toFixed(0),
        temperature: polarTemp.toFixed(1),
        windSpeed: polarWinds.toFixed(1),
        composition: "96.5% H₂, 3.23% He"
      }
    },
    magneticField: {
      strength: magneticFieldStrength.toFixed(0),
      tilt: "0.06° (nearly aligned)",
      interaction: "Strong ring interaction"
    },
    ringSystem: {
      particleVelocity: ringDynamics.particleVelocity.toFixed(1),
      spokeActivity: ringDynamics.spokeActivity.toFixed(1),
      temperature: ringDynamics.ringTemperature.toFixed(1),
      massDistribution: "99.9% in B Ring",
      stability: spokeActivity > 70 ? "Dynamic" : spokeActivity > 40 ? "Moderate" : "Stable"
    },
    stormSystems: {
      hexagonStorm: {
        intensity: hexagonActivity.toFixed(1),
        diameter: "30,000 km",
        windSpeed: (320 + Math.random() * 80).toFixed(1),
        rotation: "10h 39m 24s"
      },
      greatWhiteSpot: {
        intensity: Math.max(40, Math.min(90, 60 + (Math.sin(saturnDay * 3 * Math.PI) * 20))).toFixed(1),
        activity: stormActivity > 60 ? "Active" : "Dormant",
        lastSeen: "2010-2011"
      }
    },
    moonInteractions: {
      enceladus: {
        geyserActivity: enceladusActivity.toFixed(1),
        eRingContribution: "Active plume feeding",
        tidalHeating: "High",
        subsurfaceOcean: "Confirmed"
      },
      titan: {
        atmosphericLoss: "0.1% per billion years",
        methaneWeather: "Active lakes and rivers",
        seasonalChanges: seasonalVariation > 0 ? "Summer" : "Winter"
      }
    },
    missionAssessment: {
      overallSafety: ringDynamics.spokeActivity < 60 && stormActivity < 70 ? "MODERATE" : "HIGH RISK",
      ringTraversal: ringDynamics.spokeActivity < 50 ? "Possible with care" : "Not recommended",
      orbitSafety: "Possible above rings",
      communicationStatus: stormActivity < 50 ? "Clear" : "Degraded",
      recommendedAction: ringDynamics.spokeActivity > 75 
        ? "Maintain distance from rings"
        : stormActivity > 80 
        ? "Monitor storm development" 
        : "Proceed with standard precautions"
    }
  };
};

// Create 3D visualization elements for Saturn's atmosphere and rings
const createSaturnAtmosphericVisualization = (scene, globe, globeGroup) => {
  const saturnRadius = 45; // Scaled radius for visualization
  
  // Create ring system visualization
  SATURN_RING_SYSTEM.forEach((ring, index) => {
    const ringGeometry = new RingGeometry(
      saturnRadius * ring.innerRadius, 
      saturnRadius * ring.outerRadius, 
      64
    );
    
    const ringMaterial = new MeshBasicMaterial({ 
      color: ring.name === "B Ring" ? 0xcccccc : 
             ring.name === "A Ring" || ring.name === "C Ring" ? 0xaaaaaa : 0x888888,
      transparent: true,
      opacity: ring.opacity,
      side: DoubleSide
    });
    
    const ringMesh = new Mesh(ringGeometry, ringMaterial);
    ringMesh.rotation.x = Math.PI / 2; // Align with Saturn's equator
    ringMesh.userData = { isSaturnAtmosphericTool: true, ringName: ring.name };
    globeGroup.add(ringMesh);
    
    // Add ring particles visualization for dynamic rings
    if (ring.name === "F Ring" || ring.name === "E Ring") {
      const particleCount = 200;
      const particlePositions = new Float32Array(particleCount * 3);
      
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = ring.innerRadius + Math.random() * (ring.outerRadius - ring.innerRadius);
        const scaledRadius = saturnRadius * radius;
        
        particlePositions[i * 3] = Math.cos(angle) * scaledRadius;
        particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 2;
        particlePositions[i * 3 + 2] = Math.sin(angle) * scaledRadius;
      }
      
      const particleGeometry = new BufferGeometry();
      particleGeometry.setAttribute('position', new Float32BufferAttribute(particlePositions, 3));
      
      const particleMaterial = new PointsMaterial({
        color: 0xffffff,
        size: 0.5,
        transparent: true,
        opacity: 0.8
      });
      
      const particles = new Points(particleGeometry, particleMaterial);
      particles.userData = { isSaturnAtmosphericTool: true, ringParticles: ring.name };
      globeGroup.add(particles);
    }
  });
  
  // Create storm system visualizations
  SATURN_STORM_SYSTEMS.forEach((storm, index) => {
    const stormGeometry = new SphereGeometry(1.5 + (storm.intensity / 25), 16, 16);
    const stormMaterial = new MeshBasicMaterial({ 
      color: storm.name.includes("Hexagon") ? 0x4466ff : 
             storm.intensity > 75 ? 0xff4444 : 0xff8844,
      transparent: true,
      opacity: 0.7
    });
    const stormMesh = new Mesh(stormGeometry, stormMaterial);
    
    // Position storm on Saturn's surface
    const phi = (90 - storm.lat) * (Math.PI / 180);
    const theta = (storm.lon + 180) * (Math.PI / 180);
    stormMesh.position.set(
      saturnRadius * Math.sin(phi) * Math.cos(theta),
      saturnRadius * Math.cos(phi),
      saturnRadius * Math.sin(phi) * Math.sin(theta)
    );
    
    stormMesh.userData = { isSaturnAtmosphericTool: true, stormName: storm.name };
    globeGroup.add(stormMesh);
    
    // Special hexagon visualization for North Polar Hexagon
    if (storm.name.includes("Hexagon")) {
      const hexagonPoints = [];
      for (let i = 0; i <= 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const radius = (storm.diameter / 1000) * 0.08;
        const x = stormMesh.position.x + Math.cos(angle) * radius;
        const y = stormMesh.position.y;
        const z = stormMesh.position.z + Math.sin(angle) * radius;
        hexagonPoints.push(new Vector3(x, y, z));
      }
      
      const hexagonGeometry = new BufferGeometry().setFromPoints(hexagonPoints);
      const hexagonMaterial = new LineBasicMaterial({ 
        color: 0x4466ff, 
        linewidth: 3 
      });
      const hexagonLine = new LineLoop(hexagonGeometry, hexagonMaterial);
      hexagonLine.userData = { isSaturnAtmosphericTool: true };
      globeGroup.add(hexagonLine);
    }
  });
  
  // Create major moon positions (simplified)
  SATURN_MAJOR_MOONS.forEach((moon, index) => {
    const moonGeometry = new SphereGeometry(0.5 + (moon.diameter / 5000), 12, 12);
    const moonMaterial = new MeshBasicMaterial({ 
      color: moon.name === "Titan" ? 0xffa500 : 
             moon.name === "Enceladus" ? 0xffffff : 0xcccccc
    });
    const moonMesh = new Mesh(moonGeometry, moonMaterial);
    
    // Position moon in simplified orbit
    const angle = (index / SATURN_MAJOR_MOONS.length) * Math.PI * 2;
    moonMesh.position.set(
      Math.cos(angle) * saturnRadius * moon.distance * 0.1,
      0,
      Math.sin(angle) * saturnRadius * moon.distance * 0.1
    );
    
    moonMesh.userData = { isSaturnAtmosphericTool: true, moonName: moon.name };
    globeGroup.add(moonMesh);
  });
  
  // Create magnetosphere visualization
  const magnetosphereGeometry = new SphereGeometry(saturnRadius * 4, 32, 16);
  const magnetosphereMaterial = new MeshBasicMaterial({ 
    color: 0x00aaff,
    transparent: true,
    opacity: 0.1,
    wireframe: true
  });
  const magnetosphere = new Mesh(magnetosphereGeometry, magnetosphereMaterial);
  magnetosphere.userData = { isSaturnAtmosphericTool: true };
  globeGroup.add(magnetosphere);
};

// Enhanced 3D atmospheric particle systems for Saturn
const createSaturnAtmosphericParticles = (scene, globe, globeGroup) => {
  const saturnRadius = 45;
  const particleSystems = [];
  
  // North Polar Hexagon particle system
  const hexagonParticleCount = 1500;
  const hexagonPositions = new Float32Array(hexagonParticleCount * 3);
  const hexagonVelocities = new Float32Array(hexagonParticleCount * 3);
  
  for (let i = 0; i < hexagonParticleCount; i++) {
    // Create hexagonal pattern at north pole
    const angle = (Math.floor(i / 250) / 6) * Math.PI * 2;
    const radius = 8 + Math.random() * 12;
    const height = saturnRadius + 2 + Math.random() * 4;
    
    hexagonPositions[i * 3] = Math.cos(angle) * radius;
    hexagonPositions[i * 3 + 1] = height;
    hexagonPositions[i * 3 + 2] = Math.sin(angle) * radius;
    
    // Hexagonal circulation pattern
    hexagonVelocities[i * 3] = -Math.sin(angle) * 0.02;
    hexagonVelocities[i * 3 + 1] = 0;
    hexagonVelocities[i * 3 + 2] = Math.cos(angle) * 0.02;
  }
  
  const hexagonGeometry = new BufferGeometry();
  hexagonGeometry.setAttribute('position', new Float32BufferAttribute(hexagonPositions, 3));
  hexagonGeometry.setAttribute('velocity', new Float32BufferAttribute(hexagonVelocities, 3));
  
  const hexagonMaterial = new PointsMaterial({
    color: 0x4466ff,
    size: 0.3,
    transparent: true,
    opacity: 0.8,
    blending: AdditiveBlending
  });
  
  const hexagonParticles = new Points(hexagonGeometry, hexagonMaterial);
  hexagonParticles.userData = { isSaturnAtmosphericTool: true, type: 'hexagonStorm' };
  globeGroup.add(hexagonParticles);
  particleSystems.push(hexagonParticles);
  
  // Atmospheric band circulation systems
  const bandCount = 6;
  for (let band = 0; band < bandCount; band++) {
    const bandParticleCount = 800;
    const bandPositions = new Float32Array(bandParticleCount * 3);
    const bandVelocities = new Float32Array(bandParticleCount * 3);
    
    const latitude = -60 + (band / (bandCount - 1)) * 120; // -60 to +60 degrees
    const bandRadius = saturnRadius * Math.cos(latitude * Math.PI / 180);
    const bandHeight = saturnRadius * Math.sin(latitude * Math.PI / 180);
    
    for (let i = 0; i < bandParticleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = bandRadius + (Math.random() - 0.5) * 4;
      const height = bandHeight + (Math.random() - 0.5) * 2;
      
      bandPositions[i * 3] = Math.cos(angle) * radius;
      bandPositions[i * 3 + 1] = height;
      bandPositions[i * 3 + 2] = Math.sin(angle) * radius;
      
      // Wind circulation velocity
      const windSpeed = 0.03 + Math.random() * 0.02;
      bandVelocities[i * 3] = -Math.sin(angle) * windSpeed;
      bandVelocities[i * 3 + 1] = 0;
      bandVelocities[i * 3 + 2] = Math.cos(angle) * windSpeed;
    }
    
    const bandGeometry = new BufferGeometry();
    bandGeometry.setAttribute('position', new Float32BufferAttribute(bandPositions, 3));
    bandGeometry.setAttribute('velocity', new Float32BufferAttribute(bandVelocities, 3));
    
    const bandColor = band % 2 === 0 ? 0xffaa44 : 0xaa6644;
    const bandMaterial = new PointsMaterial({
      color: bandColor,
      size: 0.2,
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending
    });
    
    const bandParticles = new Points(bandGeometry, bandMaterial);
    bandParticles.userData = { isSaturnAtmosphericTool: true, type: 'atmosphericBand', band: band };
    globeGroup.add(bandParticles);
    particleSystems.push(bandParticles);
  }
  
  return particleSystems;
};

// Create Saturn ring dynamics with enhanced particles
const createSaturnRingDynamics = (scene, globe, globeGroup) => {
  const saturnRadius = 45;
  const ringDynamics = [];
  
  // Enhanced ring particle systems with dynamics
  SATURN_RING_SYSTEM.forEach((ring, ringIndex) => {
    if (ring.name === "B Ring" || ring.name === "A Ring") {
      const particleCount = 2000;
      const positions = new Float32Array(particleCount * 3);
      const velocities = new Float32Array(particleCount * 3);
      const scales = new Float32Array(particleCount);
      
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = ring.innerRadius + Math.random() * (ring.outerRadius - ring.innerRadius);
        const scaledRadius = saturnRadius * radius;
        
        positions[i * 3] = Math.cos(angle) * scaledRadius;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 2] = Math.sin(angle) * scaledRadius;
        
        // Orbital velocity (Kepler's laws)
        const orbitalSpeed = 0.005 / Math.sqrt(radius);
        velocities[i * 3] = -Math.sin(angle) * orbitalSpeed;
        velocities[i * 3 + 1] = 0;
        velocities[i * 3 + 2] = Math.cos(angle) * orbitalSpeed;
        
        scales[i] = 0.3 + Math.random() * 0.4;
      }
      
      const ringGeometry = new BufferGeometry();
      ringGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
      ringGeometry.setAttribute('velocity', new Float32BufferAttribute(velocities, 3));
      ringGeometry.setAttribute('scale', new Float32BufferAttribute(scales, 1));
      
      const ringMaterial = new PointsMaterial({
        color: ring.name === "B Ring" ? 0xffffff : 0xdddddd,
        size: 0.4,
        transparent: true,
        opacity: 0.8
      });
      
      const ringParticles = new Points(ringGeometry, ringMaterial);
      ringParticles.userData = { isSaturnAtmosphericTool: true, type: 'ringParticles', ring: ring.name };
      globeGroup.add(ringParticles);
      ringDynamics.push(ringParticles);
    }
    
    // Cassini Division visualization
    if (ring.name === "A Ring") {
      const divisionGeometry = new RingGeometry(
        saturnRadius * 1.95, 
        saturnRadius * 2.027, 
        64
      );
      
      const divisionMaterial = new MeshBasicMaterial({
        color: 0x222222,
        transparent: true,
        opacity: 0.3,
        side: DoubleSide
      });
      
      const divisionMesh = new Mesh(divisionGeometry, divisionMaterial);
      divisionMesh.rotation.x = Math.PI / 2;
      divisionMesh.userData = { isSaturnAtmosphericTool: true, type: 'cassiniDivision' };
      globeGroup.add(divisionMesh);
    }
  });
  
  return ringDynamics;
};

// Create Cassini mission spacecraft and other probes
const createSaturnMissionSpacecraft = (scene, globe, globeGroup) => {
  const saturnRadius = 45;
  const spacecraft = [];
  
  // Cassini orbiter (ended mission in 2017, but simulated for demonstration)
  const cassiniGeometry = new CylinderGeometry(0.3, 0.3, 1.5, 8);
  const cassiniMaterial = new MeshBasicMaterial({ color: 0xffffff });
  const cassini = new Mesh(cassiniGeometry, cassiniMaterial);
  
  // Position Cassini in elliptical orbit
  cassini.position.set(saturnRadius * 2.5, 10, saturnRadius * 1.5);
  cassini.userData = { 
    isSaturnAtmosphericTool: true, 
    type: 'spacecraft', 
    name: 'Cassini',
    orbitRadius: saturnRadius * 2.0,
    orbitSpeed: 0.008,
    angle: 0
  };
  globeGroup.add(cassini);
  spacecraft.push(cassini);
  
  // Create Cassini orbital path
  const cassiniPathPoints = [];
  for (let i = 0; i <= 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    const x = Math.cos(angle) * saturnRadius * 2.0;
    const z = Math.sin(angle) * saturnRadius * 2.0;
    cassiniPathPoints.push(new Vector3(x, 8, z));
  }
  
  const cassiniPathGeometry = new BufferGeometry().setFromPoints(cassiniPathPoints);
  const cassiniPathMaterial = new LineBasicMaterial({ 
    color: 0x00ff88, 
    transparent: true, 
    opacity: 0.4 
  });
  const cassiniPath = new LineLoop(cassiniPathGeometry, cassiniPathMaterial);
  cassiniPath.userData = { isSaturnAtmosphericTool: true, type: 'orbitPath' };
  globeGroup.add(cassiniPath);
  
  // Huygens probe on Titan surface (historical)
  const huygensTitan = SATURN_MAJOR_MOONS.find(moon => moon.name === "Titan");
  if (huygensTitan) {
    const huygensGeometry = new SphereGeometry(0.2, 8, 8);
    const huygensMaterial = new MeshBasicMaterial({ color: 0xff6600 });
    const huygens = new Mesh(huygensGeometry, huygensMaterial);
    
    // Position on Titan's surface
    const titanAngle = (1 / SATURN_MAJOR_MOONS.length) * Math.PI * 2;
    huygens.position.set(
      Math.cos(titanAngle) * saturnRadius * huygensTitan.distance * 0.1 + 1,
      0,
      Math.sin(titanAngle) * saturnRadius * huygensTitan.distance * 0.1
    );
    
    huygens.userData = { 
      isSaturnAtmosphericTool: true, 
      type: 'spacecraft', 
      name: 'Huygens Probe',
      location: 'Titan Surface'
    };
    globeGroup.add(huygens);
    spacecraft.push(huygens);
  }
  
  return spacecraft;
};

// Animation function for Saturn atmospheric systems
const animateSaturnAtmosphere = (particleSystems, ringDynamics, spacecraft) => {
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
      
      // Hexagon storm special behavior
      if (system.userData.type === 'hexagonStorm') {
        const centerDist = Math.sqrt(positions[i] * positions[i] + positions[i + 2] * positions[i + 2]);
        if (centerDist > 20) {
          // Reset particles that drift too far
          const angle = Math.random() * Math.PI * 2;
          const radius = 8 + Math.random() * 12;
          positions[i] = Math.cos(angle) * radius;
          positions[i + 2] = Math.sin(angle) * radius;
        }
      }
      
      // Atmospheric band circulation
      if (system.userData.type === 'atmosphericBand') {
        const radius = Math.sqrt(positions[i] * positions[i] + positions[i + 2] * positions[i + 2]);
        const angle = Math.atan2(positions[i + 2], positions[i]);
        const targetRadius = 35 + system.userData.band * 3;
        
        if (Math.abs(radius - targetRadius) > 5) {
          // Keep particles in their bands
          positions[i] = Math.cos(angle) * targetRadius;
          positions[i + 2] = Math.sin(angle) * targetRadius;
        }
      }
    }
    
    system.geometry.attributes.position.needsUpdate = true;
  });
  
  // Animate ring particle dynamics
  ringDynamics.forEach(ring => {
    const positions = ring.geometry.attributes.position.array;
    const velocities = ring.geometry.attributes.velocity.array;
    
    for (let i = 0; i < positions.length; i += 3) {
      // Orbital motion
      positions[i] += velocities[i];
      positions[i + 2] += velocities[i + 2];
      
      // Keep particles in ring plane
      positions[i + 1] *= 0.98;
    }
    
    ring.geometry.attributes.position.needsUpdate = true;
  });
  
  // Animate spacecraft
  spacecraft.forEach(craft => {
    if (craft.userData.name === 'Cassini') {
      craft.userData.angle += craft.userData.orbitSpeed;
      craft.position.x = Math.cos(craft.userData.angle) * craft.userData.orbitRadius;
      craft.position.z = Math.sin(craft.userData.angle) * craft.userData.orbitRadius;
      craft.position.y = 8 + Math.sin(craft.userData.angle * 3) * 5; // Elliptical orbit
      
      // Point Cassini toward Saturn
      craft.lookAt(0, 0, 0);
    }
  });
};

// Main export function
export const showSaturnAtmosphericMonitor = (scene, globe, globeGroup, camera) => {
  console.log("Initializing Saturn Atmospheric Monitor");
  
  // Initialize interval storage
  if (!window.astronautToolIntervals) {
    window.astronautToolIntervals = [];
  }
  
  // Create info panel
  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    verticalButton.innerHTML = `
      <div style="color: #ffffff; font-family: 'Montserrat', sans-serif;">
        <h3 style="color: #DAA520; margin-bottom: 15px; font-size: 18px; text-align: center;">
          Saturn Atmospheric Monitor
        </h3>
        
        <div id="saturn-atmospheric-info" style="margin-top: 15px;">
          <div style="margin-bottom: 10px;">Loading Saturn atmospheric data...</div>
        </div>
        
        <div style="margin-top: 25px; font-size: 12px; color: #aaa;">
          Simulated Saturn data based on NASA Cassini mission observations.
        </div>
      </div>
    `;
  }
  
  const updateSaturnAtmospheric = () => {
    const atmosphericData = generateSaturnAtmosphericData();
    
    const infoElement = document.getElementById('saturn-atmospheric-info');
    if (infoElement) {
      infoElement.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(218,165,32,0.1), rgba(255,215,0,0.1)); padding: 15px; border-radius: 8px; border: 1px solid #DAA520; margin-bottom: 15px;">
          <h4 style="color: #DAA520; margin: 0 0 10px 0;">🪐 Saturn Sol ${atmosphericData.sol} - ${atmosphericData.localTime}</h4>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
            <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px;">
              <div style="color: #DAA520; font-size: 11px; font-weight: bold;">EQUATORIAL ZONE</div>
              <div style="font-size: 10px;">Temp: ${atmosphericData.atmosphericZones.equatorial.temperature}K</div>
              <div style="font-size: 10px;">Pressure: ${atmosphericData.atmosphericZones.equatorial.pressure} Pa</div>
              <div style="font-size: 10px;">Wind: ${atmosphericData.atmosphericZones.equatorial.windSpeed} m/s</div>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px;">
              <div style="color: #DAA520; font-size: 11px; font-weight: bold;">TEMPERATE ZONE</div>
              <div style="font-size: 10px;">Temp: ${atmosphericData.atmosphericZones.temperateZone.temperature}K</div>
              <div style="font-size: 10px;">Pressure: ${atmosphericData.atmosphericZones.temperateZone.pressure} Pa</div>
              <div style="font-size: 10px;">Wind: ${atmosphericData.atmosphericZones.temperateZone.windSpeed} m/s</div>
            </div>
          </div>
          
          <div style="background: rgba(255,215,0,0.1); padding: 10px; border-radius: 6px; border: 1px solid #FFD700; margin-bottom: 10px;">
            <div style="color: #FFD700; font-weight: bold; font-size: 12px;">💍 RING SYSTEM</div>
            <div style="font-size: 11px;">Particle Velocity: ${atmosphericData.ringSystem.particleVelocity} km/s</div>
            <div style="font-size: 11px;">Spoke Activity: ${atmosphericData.ringSystem.spokeActivity}%</div>
            <div style="font-size: 11px;">Ring Temperature: ${atmosphericData.ringSystem.temperature}K</div>
            <div style="font-size: 11px;">Stability: ${atmosphericData.ringSystem.stability}</div>
          </div>
          
          <div style="background: rgba(68,102,255,0.1); padding: 10px; border-radius: 6px; border: 1px solid #4466ff; margin-bottom: 10px;">
            <div style="color: #4466ff; font-weight: bold; font-size: 12px;">🌀 HEXAGON STORM</div>
            <div style="font-size: 11px;">Intensity: ${atmosphericData.stormSystems.hexagonStorm.intensity}%</div>
            <div style="font-size: 11px;">Diameter: ${atmosphericData.stormSystems.hexagonStorm.diameter}</div>
            <div style="font-size: 11px;">Wind Speed: ${atmosphericData.stormSystems.hexagonStorm.windSpeed} m/s</div>
            <div style="font-size: 11px;">Rotation: ${atmosphericData.stormSystems.hexagonStorm.rotation}</div>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; border: 1px solid #ffffff; margin-bottom: 10px;">
            <div style="color: #ffffff; font-weight: bold; font-size: 12px;">🌙 ENCELADUS ACTIVITY</div>
            <div style="font-size: 11px;">Geyser Activity: ${atmosphericData.moonInteractions.enceladus.geyserActivity}%</div>
            <div style="font-size: 11px;">E-Ring Feeding: ${atmosphericData.moonInteractions.enceladus.eRingContribution}</div>
            <div style="font-size: 11px;">Subsurface Ocean: ${atmosphericData.moonInteractions.enceladus.subsurfaceOcean}</div>
          </div>
          
          <div style="background: rgba(0,170,255,0.1); padding: 10px; border-radius: 6px; border: 1px solid #00aaff; margin-bottom: 10px;">
            <div style="color: #00aaff; font-weight: bold; font-size: 12px;">🧲 MAGNETIC FIELD</div>
            <div style="font-size: 11px;">Strength: ${atmosphericData.magneticField.strength} nT</div>
            <div style="font-size: 11px;">Tilt: ${atmosphericData.magneticField.tilt}</div>
            <div style="font-size: 11px;">Ring Interaction: ${atmosphericData.magneticField.interaction}</div>
          </div>
          
          <div style="background: ${atmosphericData.missionAssessment.overallSafety === 'HIGH RISK' ? 'rgba(255,0,0,0.2)' : 'rgba(255,255,0,0.2)'}; padding: 10px; border-radius: 6px; border: 1px solid ${atmosphericData.missionAssessment.overallSafety === 'HIGH RISK' ? '#ff0000' : '#ffff00'};">
            <div style="color: ${atmosphericData.missionAssessment.overallSafety === 'HIGH RISK' ? '#ff0000' : '#ffff00'}; font-weight: bold; font-size: 12px;">🚀 MISSION ASSESSMENT</div>
            <div style="font-size: 11px;">Safety Level: ${atmosphericData.missionAssessment.overallSafety}</div>
            <div style="font-size: 11px;">Ring Traversal: ${atmosphericData.missionAssessment.ringTraversal}</div>
            <div style="font-size: 11px;">Action: ${atmosphericData.missionAssessment.recommendedAction}</div>
          </div>
          
          <div style="margin-top: 15px; padding: 10px; background: rgba(218,165,32,0.1); border-radius: 6px; border: 1px dashed #DAA520;">
            <div style="color: #DAA520; font-weight: bold; font-size: 11px;">ATMOSPHERIC COMPOSITION</div>
            <div style="font-size: 10px; line-height: 1.3;">
              • Hydrogen (H₂): 96.3%<br>
              • Helium (He): 3.25%<br>
              • Trace: CH₄, NH₃, H₂O, PH₃
            </div>
          </div>
        </div>
      `;
    }
  };
  
  // Create atmospheric and ring visualization
  createSaturnAtmosphericVisualization(scene, globe, globeGroup);
  
  // Create enhanced 3D atmospheric and ring systems
  const particleSystems = createSaturnAtmosphericParticles(scene, globe, globeGroup);
  const ringDynamics = createSaturnRingDynamics(scene, globe, globeGroup);
  const spacecraft = createSaturnMissionSpacecraft(scene, globe, globeGroup);
  
  // Animation loop for Saturn atmospheric systems
  const animationLoop = () => {
    animateSaturnAtmosphere(particleSystems, ringDynamics, spacecraft);
  };
  
  // Add to global animation loop
  if (typeof window.addToAnimationLoop === 'function') {
    window.addToAnimationLoop(animationLoop);
  }
  
  // Update immediately and then every 30 seconds
  updateSaturnAtmospheric();
  const intervalId = setInterval(updateSaturnAtmospheric, 30000);
  window.astronautToolIntervals.push(intervalId);
  
  console.log("Saturn Atmospheric Monitor initialized successfully");
  
  // Return cleanup function
  return () => {
    // Remove all Saturn atmospheric tool objects
    const objectsToRemove = [];
    globe.scene().traverse((object) => {
      if (object.userData && object.userData.isSaturnAtmosphericTool) {
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
    
    console.log("Saturn Atmospheric Monitor cleaned up");
  };
};
