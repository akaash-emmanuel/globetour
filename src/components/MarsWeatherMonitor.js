import { Vector3, SphereGeometry, MeshBasicMaterial, Mesh, RingGeometry, DoubleSide, BufferGeometry, Points, Float32BufferAttribute, PointsMaterial, AdditiveBlending, CylinderGeometry } from 'three';
import axios from 'axios';

const NASA_API_KEY = "jmRRPCUwwWyNaMrXJCNz8HDX8q94wPnQfKz0ig5a";

// Mars specific atmospheric parameters
const MARS_ATMOSPHERIC_SCALE = 1.2; // Multiplier for visualization
const MARS_DUST_STORM_PROBABILITY = 0.15; // 15% chance during dust season

// Helper function to convert latitude and longitude to 3D coordinates on Mars
const convertLatLonToXYZ = (lat, lon, radius) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
};

// Simulate Mars weather data based on real InSight mission parameters
const generateMarsWeatherData = () => {
  const sol = Math.floor(Math.random() * 1000) + 3000; // Sol day (Mars day)
  const season = ['Early Summer', 'Mid Summer', 'Late Summer', 'Early Winter', 'Mid Winter', 'Late Winter'][Math.floor(Math.random() * 6)];
  
  // Temperature varies significantly on Mars (-80°C to 20°C)
  const highTemp = Math.floor(Math.random() * 30 - 50); // -50°C to -20°C typically
  const lowTemp = highTemp - Math.floor(Math.random() * 40 + 20); // 20-60°C difference
  
  // Mars atmospheric pressure (very low, 0.4-0.87 kPa)
  const pressure = (Math.random() * 0.47 + 0.4).toFixed(2);
  
  // Wind speed and direction
  const windSpeed = (Math.random() * 20 + 5).toFixed(1); // 5-25 m/s typical
  const windDirection = Math.floor(Math.random() * 360);
  
  // UV index is extremely high on Mars due to thin atmosphere
  const uvIndex = (Math.random() * 5 + 8).toFixed(1); // 8-13 range
  
  // Dust opacity (tau) - critical for Mars weather
  const dustOpacity = (Math.random() * 2 + 0.1).toFixed(2);
  
  // Check for dust storm conditions
  const isDustStorm = Math.random() < MARS_DUST_STORM_PROBABILITY;
  
  return {
    sol,
    season,
    earthDate: new Date().toISOString().split('T')[0],
    temperature: {
      high: highTemp,
      low: lowTemp,
      average: Math.floor((highTemp + lowTemp) / 2)
    },
    pressure,
    wind: {
      speed: windSpeed,
      direction: windDirection,
      directionText: getWindDirection(windDirection)
    },
    uvIndex,
    dustOpacity,
    isDustStorm,
    weatherCondition: isDustStorm ? 'Dust Storm' : getWeatherCondition(dustOpacity),
    atmosphericComposition: {
      co2: 95.32,
      nitrogen: 2.7,
      argon: 1.6,
      oxygen: 0.13,
      carbonMonoxide: 0.08
    }
  };
};

const getWindDirection = (degrees) => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.floor(degrees / 22.5)];
};

const getWeatherCondition = (dustOpacity) => {
  if (dustOpacity > 1.5) return 'Heavy Dust';
  if (dustOpacity > 1.0) return 'Moderate Dust';
  if (dustOpacity > 0.5) return 'Light Dust';
  return 'Clear';
};

// Create 3D visual atmospheric data around Mars
const createMarsAtmosphericParticles = (marsWeatherData, marsGroup, marsRadius) => {
  // Create dust storm particle system if dust storm is active
  if (marsWeatherData.isDustStorm || parseFloat(marsWeatherData.dustOpacity) > 1.0) {
    const particleCount = marsWeatherData.isDustStorm ? 2000 : 1000;
    const dustPositions = [];
    const dustColors = [];
    const dustSizes = [];
    
    for (let i = 0; i < particleCount; i++) {
      // Create spiral dust patterns around Mars
      const altitude = Math.random() * 15 + 2; // 2-17 units above surface
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * marsRadius * 0.8;
      
      const x = (marsRadius + altitude) * Math.cos(angle) + (Math.random() - 0.5) * 20;
      const y = height + (Math.random() - 0.5) * 10;
      const z = (marsRadius + altitude) * Math.sin(angle) + (Math.random() - 0.5) * 20;
      
      dustPositions.push(x, y, z);
      
      // Color varies from orange to red-brown for dust
      const intensity = marsWeatherData.isDustStorm ? 0.8 + Math.random() * 0.2 : 0.6 + Math.random() * 0.3;
      dustColors.push(intensity, intensity * 0.6, intensity * 0.2);
      dustSizes.push(marsWeatherData.isDustStorm ? 2.0 + Math.random() * 2.0 : 1.0 + Math.random());
    }
    
    const dustGeometry = new BufferGeometry();
    dustGeometry.setAttribute('position', new Float32BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute('color', new Float32BufferAttribute(dustColors, 3));
    dustGeometry.setAttribute('size', new Float32BufferAttribute(dustSizes, 1));
    
    const dustMaterial = new PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: marsWeatherData.isDustStorm ? 0.8 : 0.6,
      blending: AdditiveBlending
    });
    
    const dustParticles = new Points(dustGeometry, dustMaterial);
    dustParticles.userData.isMarsAtmosphere = true;
    dustParticles.userData.isDustStorm = true;
    marsGroup.add(dustParticles);
  }
  
  // Create atmospheric circulation patterns
  const windSpeed = parseFloat(marsWeatherData.wind.speed);
  if (windSpeed > 10) {
    const streamCount = Math.floor(windSpeed / 5); // More streams for higher wind speeds
    
    for (let s = 0; s < streamCount; s++) {
      const streamPoints = [];
      const startAngle = (s / streamCount) * Math.PI * 2;
      
      // Create wind stream paths around Mars
      for (let i = 0; i <= 50; i++) {
        const angle = startAngle + (i / 50) * Math.PI * 4; // Two full rotations
        const altitude = marsRadius + 8 + Math.sin(i / 10) * 3;
        const lat = Math.sin(i / 25) * 60; // Vary latitude
        
        const x = altitude * Math.cos(angle) * Math.cos(lat * Math.PI / 180);
        const y = altitude * Math.sin(lat * Math.PI / 180);
        const z = altitude * Math.sin(angle) * Math.cos(lat * Math.PI / 180);
        
        streamPoints.push(new Vector3(x, y, z));
      }
      
      const streamGeometry = new BufferGeometry().setFromPoints(streamPoints);
      const streamMaterial = new LineBasicMaterial({
        color: windSpeed > 20 ? 0xFF6666 : 0xFFAAAA,
        transparent: true,
        opacity: 0.6,
        linewidth: 2
      });
      
      const windStream = new LineLoop(streamGeometry, streamMaterial);
      windStream.userData.isMarsAtmosphere = true;
      windStream.userData.isWindStream = true;
      marsGroup.add(windStream);
    }
  }
};

// Create Mars mission spacecraft and satellite visualizations
const createMarsSpacecraftVisualizations = (marsGroup, marsRadius) => {
  // Simulate Mars Reconnaissance Orbiter (MRO)
  const mroGeometry = new SphereGeometry(1.2, 8, 8);
  const mroMaterial = new MeshBasicMaterial({ color: 0x00AAFF });
  const mro = new Mesh(mroGeometry, mroMaterial);
  
  // Position MRO in its typical orbit (250-320 km altitude)
  const mroAltitude = marsRadius + 12;
  mro.position.set(mroAltitude, 0, 0);
  mro.userData.isMarsAtmosphere = true;
  mro.userData.isSpacecraft = true;
  mro.userData.name = "Mars Reconnaissance Orbiter";
  marsGroup.add(mro);
  
  // Create MRO orbit path
  const mroOrbitPoints = [];
  for (let i = 0; i <= 360; i += 5) {
    const angle = i * (Math.PI / 180);
    const x = mroAltitude * Math.cos(angle);
    const y = 0;
    const z = mroAltitude * Math.sin(angle);
    mroOrbitPoints.push(new Vector3(x, y, z));
  }
  
  const mroOrbitGeometry = new BufferGeometry().setFromPoints(mroOrbitPoints);
  const mroOrbitMaterial = new LineBasicMaterial({
    color: 0x00AAFF,
    transparent: true,
    opacity: 0.4
  });
  const mroOrbit = new LineLoop(mroOrbitGeometry, mroOrbitMaterial);
  mroOrbit.userData.isMarsAtmosphere = true;
  marsGroup.add(mroOrbit);
  
  // Simulate MAVEN atmospheric probe
  const mavenGeometry = new SphereGeometry(0.8, 8, 8);
  const mavenMaterial = new MeshBasicMaterial({ color: 0xFF6600 });
  const maven = new Mesh(mavenGeometry, mavenMaterial);
  
  // MAVEN has an elliptical orbit (150-6200 km)
  const mavenDistance = marsRadius + 25;
  maven.position.set(0, mavenDistance * 0.7, mavenDistance * 0.7);
  maven.userData.isMarsAtmosphere = true;
  maven.userData.isSpacecraft = true;
  maven.userData.name = "MAVEN";
  marsGroup.add(maven);
  
  // Create elliptical orbit for MAVEN
  const mavenOrbitPoints = [];
  for (let i = 0; i <= 360; i += 5) {
    const angle = i * (Math.PI / 180);
    const x = (marsRadius + 8) * Math.cos(angle);
    const y = (marsRadius + 20) * Math.sin(angle) * 0.6; // Elliptical
    const z = 0;
    mavenOrbitPoints.push(new Vector3(x, y, z));
  }
  
  const mavenOrbitGeometry = new BufferGeometry().setFromPoints(mavenOrbitPoints);
  const mavenOrbitMaterial = new LineBasicMaterial({
    color: 0xFF6600,
    transparent: true,
    opacity: 0.4
  });
  const mavenOrbit = new LineLoop(mavenOrbitGeometry, mavenOrbitMaterial);
  mavenOrbit.userData.isMarsAtmosphere = true;
  marsGroup.add(mavenOrbit);
  
  // Simulate Perseverance rover data transmission beam
  const beamPoints = [];
  const roverLat = 18.4; // Perseverance landing site
  const roverLon = 77.5;
  const roverPosition = convertLatLonToXYZ(roverLat, roverLon, marsRadius + 0.1);
  
  // Create data beam from rover to MRO
  beamPoints.push(roverPosition);
  beamPoints.push(mro.position.clone());
  
  const beamGeometry = new BufferGeometry().setFromPoints(beamPoints);
  const beamMaterial = new LineBasicMaterial({
    color: 0x00FF00,
    transparent: true,
    opacity: 0.7
  });
  const dataBeam = new LineLoop(beamGeometry, beamMaterial);
  dataBeam.userData.isMarsAtmosphere = true;
  dataBeam.userData.isDataBeam = true;
  marsGroup.add(dataBeam);
  
  // Add rover position marker
  const roverGeometry = new SphereGeometry(0.5, 8, 8);
  const roverMaterial = new MeshBasicMaterial({ color: 0x00FF00 });
  const rover = new Mesh(roverGeometry, roverMaterial);
  rover.position.copy(roverPosition);
  rover.userData.isMarsAtmosphere = true;
  rover.userData.isRover = true;
  rover.userData.name = "Perseverance Rover";
  marsGroup.add(rover);
};

// Visualize Mars atmospheric conditions with 3D data elements
const visualizeMarsAtmosphere = (marsWeatherData, mars, marsGroup) => {
  if (!mars || !marsGroup) return;
  
  // Clear previous atmospheric visualizations
  const existingAtmo = marsGroup.children.filter(child => child.userData.isMarsAtmosphere);
  existingAtmo.forEach(item => marsGroup.remove(item));
  
  // Get Mars radius from the mesh
  const marsRadius = mars.geometry.parameters.radius || 75; // Default fallback
  
  // Create basic atmospheric layers
  if (marsWeatherData.dustOpacity > 0.3) {
    const dustGeometry = new SphereGeometry(marsRadius * 1.05, 32, 32);
    const dustMaterial = new MeshBasicMaterial({
      color: marsWeatherData.isDustStorm ? 0xCC6600 : 0xDDAA77,
      transparent: true,
      opacity: Math.min(parseFloat(marsWeatherData.dustOpacity) * 0.3, 0.6)
    });
    const dustAtmosphere = new Mesh(dustGeometry, dustMaterial);
    dustAtmosphere.userData.isMarsAtmosphere = true;
    marsGroup.add(dustAtmosphere);
  }
  
  // Add polar ice cap visualization based on season
  if (marsWeatherData.season.includes('Winter')) {
    const iceCapGeometry = new SphereGeometry(marsRadius * 0.15, 16, 16);
    const iceCapMaterial = new MeshBasicMaterial({
      color: 0xEEFFFF,
      transparent: true,
      opacity: 0.8
    });
    const northIceCap = new Mesh(iceCapGeometry, iceCapMaterial);
    northIceCap.position.y = marsRadius * 0.85;
    northIceCap.userData.isMarsAtmosphere = true;
    marsGroup.add(northIceCap);
    
    const southIceCap = new Mesh(iceCapGeometry, iceCapMaterial);
    southIceCap.position.y = -marsRadius * 0.85;
    southIceCap.userData.isMarsAtmosphere = true;
    marsGroup.add(southIceCap);
  }
  
  // Create 3D atmospheric particle systems and data visualizations
  createMarsAtmosphericParticles(marsWeatherData, marsGroup, marsRadius);
  
  // Add Mars mission spacecraft and satellites
  createMarsSpacecraftVisualizations(marsGroup, marsRadius);
  
  // Create atmospheric composition layers
  const co2LayerGeometry = new SphereGeometry(marsRadius * 1.02, 32, 32);
  const co2LayerMaterial = new MeshBasicMaterial({
    color: 0xFFCCCC,
    transparent: true,
    opacity: 0.1
  });
  const co2Layer = new Mesh(co2LayerGeometry, co2LayerMaterial);
  co2Layer.userData.isMarsAtmosphere = true;
  marsGroup.add(co2Layer);
};

// Animate Mars atmospheric elements
const animateMarsAtmosphere = (marsGroup) => {
  if (!marsGroup) return;
  
  const time = Date.now() * 0.001; // Convert to seconds for smooth animation
  
  // Animate spacecraft in orbit
  marsGroup.children.forEach(child => {
    if (child.userData && child.userData.isSpacecraft) {
      if (child.userData.name === "Mars Reconnaissance Orbiter") {
        // MRO orbits every ~112 minutes, speed up for visualization
        const orbitSpeed = 0.5;
        const angle = time * orbitSpeed;
        const radius = Math.sqrt(child.position.x * child.position.x + child.position.z * child.position.z);
        child.position.x = radius * Math.cos(angle);
        child.position.z = radius * Math.sin(angle);
      } else if (child.userData.name === "MAVEN") {
        // MAVEN has elliptical orbit, different speed
        const orbitSpeed = 0.3;
        const angle = time * orbitSpeed;
        const baseRadius = 60; // Mars radius + some distance
        child.position.x = (baseRadius + 8) * Math.cos(angle);
        child.position.y = (baseRadius + 20) * Math.sin(angle) * 0.6;
        child.position.z = 0;
      }
    }
    
    // Animate dust storm particles
    if (child.userData && child.userData.isDustStorm) {
      child.rotation.y += 0.002; // Slow rotation to simulate storm movement
    }
    
    // Animate wind streams
    if (child.userData && child.userData.isWindStream) {
      child.rotation.y += 0.001; // Rotate wind patterns
    }
    
    // Animate data beams (pulsing opacity)
    if (child.userData && child.userData.isDataBeam) {
      child.material.opacity = 0.4 + Math.sin(time * 3) * 0.3;
    }
  });
};

export const showMarsWeatherMonitor = async (scene, globe, globeGroup, camera, mars) => {
  if (!window.astronautToolIntervals) {
    window.astronautToolIntervals = [];
  }
  
  // Create info panel
  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    verticalButton.innerHTML = `
      <div style="color: #ffffff; font-family: 'Montserrat', sans-serif;">
        <h3 style="color: #CD5C5C; margin-bottom: 15px; font-size: 18px; text-align: center;">
          Mars Weather Monitor
        </h3>
        
        <div id="mars-weather-info" style="margin-top: 15px;">
          <div style="margin-bottom: 10px;">Loading Mars atmospheric data...</div>
        </div>
        
        <div style="margin-top: 25px; font-size: 12px; color: #aaa;">
          Simulated Mars weather with real 3D atmospheric visualization and mission spacecraft tracking.
        </div>
      </div>
    `;
  }
  
  const updateMarsWeather = () => {
    const weatherData = generateMarsWeatherData();
    
    // Find Mars group in the scene
    const marsGroup = scene.children.find(child => child.userData && child.userData.isMars);
    const marsPlanet = marsGroup || mars;
    
    // Visualize atmospheric conditions with 3D elements
    if (marsPlanet) {
      visualizeMarsAtmosphere(weatherData, mars, marsPlanet);
    }
    
    // Update info panel
    updateMarsWeatherInfo(weatherData);
  };
  
  // Animation loop for atmospheric elements
  const animationLoop = () => {
    const marsGroup = scene.children.find(child => child.userData && child.userData.isMars);
    if (marsGroup) {
      animateMarsAtmosphere(marsGroup);
    }
  };
  
  // Initial update
  updateMarsWeather();
  
  // Set up periodic updates every 30 seconds (simulating real-time data)
  const intervalId = setInterval(updateMarsWeather, 30000);
  window.astronautToolIntervals.push(intervalId);
  
  // Add animation loop to the global animation system
  if (!window.marsAnimationLoop) {
    window.marsAnimationLoop = animationLoop;
    // Note: This should be called from the main animation loop in index.js
  }
};

const updateMarsWeatherInfo = (weatherData) => {
  const marsWeatherInfo = document.getElementById('mars-weather-info');
  if (!marsWeatherInfo) return;
  
  // Determine weather condition color
  let conditionColor = '#00CC00'; // Green for clear
  if (weatherData.isDustStorm) conditionColor = '#FF4444';
  else if (weatherData.dustOpacity > 1.0) conditionColor = '#FF8800';
  else if (weatherData.dustOpacity > 0.5) conditionColor = '#FFCC00';
  
  // Determine UV risk level
  const uvLevel = parseFloat(weatherData.uvIndex);
  let uvColor = '#FF0000'; // Always red on Mars due to thin atmosphere
  let uvRisk = 'EXTREME';
  
  marsWeatherInfo.innerHTML = `
    <div style="margin-bottom: 15px;">
      <div style="font-weight: bold; margin-bottom: 8px;">Sol ${weatherData.sol} (${weatherData.earthDate})</div>
      <div style="margin-bottom: 5px;">Season: <span style="color: #87CEEB;">${weatherData.season}</span></div>
      <div style="margin-bottom: 5px;">Condition: <span style="color: ${conditionColor};">${weatherData.weatherCondition}</span></div>
    </div>
    
    <div style="margin-bottom: 15px;">
      <div style="font-weight: bold; margin-bottom: 8px; color: #FF6B6B;">Temperature (°C):</div>
      <div style="margin-bottom: 3px;">High: <span style="color: #FF9999;">${weatherData.temperature.high}°C</span></div>
      <div style="margin-bottom: 3px;">Low: <span style="color: #99CCFF;">${weatherData.temperature.low}°C</span></div>
      <div style="margin-bottom: 3px;">Average: <span style="color: #FFCC99;">${weatherData.temperature.average}°C</span></div>
    </div>
    
    <div style="margin-bottom: 15px;">
      <div style="font-weight: bold; margin-bottom: 8px; color: #87CEEB;">Atmospheric Data:</div>
      <div style="margin-bottom: 3px;">Pressure: <span style="color: #CCCCCC;">${weatherData.pressure} kPa</span></div>
      <div style="margin-bottom: 3px;">Dust Opacity: <span style="color: ${conditionColor};">${weatherData.dustOpacity}</span></div>
      <div style="margin-bottom: 3px;">UV Index: <span style="color: ${uvColor};">${weatherData.uvIndex} (${uvRisk})</span></div>
    </div>
    
    <div style="margin-bottom: 15px;">
      <div style="font-weight: bold; margin-bottom: 8px; color: #98FB98;">Wind Conditions:</div>
      <div style="margin-bottom: 3px;">Speed: <span style="color: #CCCCCC;">${weatherData.wind.speed} m/s</span></div>
      <div style="margin-bottom: 3px;">Direction: <span style="color: #CCCCCC;">${weatherData.wind.direction}° (${weatherData.wind.directionText})</span></div>
    </div>
    
    <div style="margin-bottom: 15px;">
      <div style="font-weight: bold; margin-bottom: 8px; color: #00AAFF;">Active Mars Missions:</div>
      <div style="font-size: 11px; margin-bottom: 2px;">🛰️ MRO: Orbital surveillance</div>
      <div style="font-size: 11px; margin-bottom: 2px;">🔬 MAVEN: Atmospheric analysis</div>
      <div style="font-size: 11px; margin-bottom: 2px;">🚗 Perseverance: Surface operations</div>
      <div style="font-size: 11px; margin-bottom: 2px;">📡 Data relay: Active</div>
    </div>
    
    <div style="margin-bottom: 15px;">
      <div style="font-weight: bold; margin-bottom: 8px; color: #DDA0DD;">Atmospheric Composition:</div>
      <div style="font-size: 11px; margin-bottom: 2px;">CO₂: ${weatherData.atmosphericComposition.co2}%</div>
      <div style="font-size: 11px; margin-bottom: 2px;">N₂: ${weatherData.atmosphericComposition.nitrogen}%</div>
      <div style="font-size: 11px; margin-bottom: 2px;">Ar: ${weatherData.atmosphericComposition.argon}%</div>
      <div style="font-size: 11px; margin-bottom: 2px;">O₂: ${weatherData.atmosphericComposition.oxygen}%</div>
    </div>
    
    <div style="background-color: rgba(205, 92, 92, 0.2); padding: 10px; border-radius: 5px;">
      <div style="font-weight: bold; margin-bottom: 5px;">Mission Impact:</div>
      <div style="font-size: 12px;">${weatherData.isDustStorm ? 
        "🚨 DUST STORM ALERT: All surface operations suspended" : 
        weatherData.dustOpacity > 1.0 ? 
        "⚠️ HIGH DUST: Limited visibility, use caution" :
        "✅ Suitable conditions for surface exploration"}</div>
      <div style="font-size: 11px; margin-top: 5px; color: #aaa;">
        🌪️ ${weatherData.isDustStorm ? 'Storm particles visible' : parseFloat(weatherData.wind.speed) > 15 ? 'Wind streams visible' : 'Calm atmospheric conditions'}
      </div>
    </div>
    
    <div style="margin-top: 10px; font-size: 12px; color: #aaa;">
      Last updated: ${new Date().toLocaleTimeString()}
    </div>
  `;
};
