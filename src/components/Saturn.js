import { 
  SphereGeometry, 
  MeshPhongMaterial, 
  Mesh, 
  TextureLoader, 
  Vector3, 
  BufferGeometry, 
  LineBasicMaterial, 
  LineLoop,
  RingGeometry,
  DoubleSide,
  BackSide,
  FrontSide,
  Group,
  Color,
  ClampToEdgeWrapping
} from 'three';

// Constants for Saturn
export const SATURN_RADIUS = 9.5; // Saturn's radius relative to Earth's radius
const SATURN_SEMI_MAJOR_AXIS = 1.5 * 8000; // Saturn's average distance from the Sun (beyond Jupiter)
const SATURN_ECCENTRICITY = 0.0565; // Saturn's orbital eccentricity
const SATURN_ORBITAL_PERIOD = 360; // Saturn's orbital period for visualization (reduced for faster animation)
const SATURN_ORBITAL_INCLINATION = 2.49 * (Math.PI / 180); // Saturn's orbital inclination in radians
const SATURN_AXIAL_TILT = 26.73 * (Math.PI / 180); // Saturn's axial tilt in radians

// Ring Constants
const RING_INNER_RADIUS = SATURN_RADIUS * 30 * 1.2;
const RING_OUTER_RADIUS = SATURN_RADIUS * 30 * 2.3;
const RING_SEGMENTS = 128; // Higher segments for smoother ring

// Create and add Saturn to the scene
export const createSaturn = (scene, sun) => {
  if (!scene || !sun) {
    console.error('Cannot create Saturn without scene and sun references');
    return null;
  }

  // Create a group to hold Saturn and its rings
  const saturnSystem = new Group();
  saturnSystem.name = 'saturnSystem';

  // Create Saturn geometry
  const saturnGeometry = new SphereGeometry(SATURN_RADIUS * 30, 48, 48);

  // Create Saturn material with gas giant appearance
  const saturnMaterial = new MeshPhongMaterial({
    color: 0xf0e4cf, // Light yellow-beige color for Saturn
    shininess: 10,
    emissive: 0x110f0d,
    bumpScale: 0.05
  });

  // Create Saturn mesh
  const saturn = new Mesh(saturnGeometry, saturnMaterial);
  
  // Create a container for Saturn that will handle the axial tilt
  const saturnPlanetContainer = new Group();
  saturnPlanetContainer.add(saturn);
  
  // Apply axial tilt to the container, not directly to Saturn
  saturnPlanetContainer.rotation.z = SATURN_AXIAL_TILT;

  // Add the tilted container to the system
  saturnSystem.add(saturnPlanetContainer);
  
  // Create rings (multiple to create more realistic appearance)
  createSaturnRings(saturnSystem, saturnPlanetContainer);

  // Initial position at perihelion (closest to sun)
  const initialRadius = SATURN_SEMI_MAJOR_AXIS * (1 - SATURN_ECCENTRICITY);
  saturnSystem.position.set(sun.position.x + initialRadius, sun.position.y, sun.position.z);

  // Create orbit path visualization
  const orbitPath = createSaturnOrbitPath();
  orbitPath.position.copy(sun.position); // Make orbit follow sun
  scene.add(orbitPath);

  // Add custom properties
  saturnSystem.userData = {
    isSaturn: true,
    orbitalAngle: 0,
    orbitPath: orbitPath
  };

  // Add Saturn system to the scene
  scene.add(saturnSystem);

  // Try loading textures asynchronously
  tryLoadSaturnTextures(saturnMaterial);

  return saturnSystem;
};

// Create realistic Saturn rings
const createSaturnRings = (saturnSystem, saturnPlanetContainer) => {
  // Create a ring container that will handle all rings and their components
  const ringsContainer = new Group();
  ringsContainer.name = 'saturnRingsContainer';
  
  // Main rings structure
  const createRing = (innerRadius, outerRadius, color, opacity, segments = RING_SEGMENTS) => {
    const ringGeometry = new RingGeometry(innerRadius, outerRadius, segments);
    const ringMaterial = new MeshPhongMaterial({
      color: color,
      side: DoubleSide,
      transparent: true,
      opacity: opacity,
      shininess: 25
    });
    
    const ring = new Mesh(ringGeometry, ringMaterial);
    // Make the rings flat on the x-z plane
    ring.rotation.x = Math.PI / 2;
    return ring;
  };
  
  // Ring A - Outer bright ring
  const ringA = createRing(
    RING_OUTER_RADIUS * 0.83, 
    RING_OUTER_RADIUS, 
    new Color(0xf0e4d0), 
    0.9
  );
  
  // Encke Gap - Dark division in Ring A
  const enckeGap = createRing(
    RING_OUTER_RADIUS * 0.9, 
    RING_OUTER_RADIUS * 0.905, 
    new Color(0x000000), 
    0.95
  );
  
  // Ring B - Brightest ring
  const ringB = createRing(
    RING_INNER_RADIUS * 1.5, 
    RING_OUTER_RADIUS * 0.83, 
    new Color(0xf5ebd8), 
    0.95
  );
  
  // Cassini Division - Main dark gap between rings A and B
  const cassiniDivision = createRing(
    RING_OUTER_RADIUS * 0.78, 
    RING_OUTER_RADIUS * 0.83, 
    new Color(0x111111), 
    0.92
  );
  
  // Ring C - Inner dimmer ring
  const ringC = createRing(
    RING_INNER_RADIUS, 
    RING_INNER_RADIUS * 1.5, 
    new Color(0xcec2a6), 
    0.6
  );
  
  // Extra detail: create subtle radial variations across the rings
  // This simulates the density waves and spokes observed in Saturn's rings
  for (let i = 0; i < 5; i++) {
    const radius = RING_INNER_RADIUS + (RING_OUTER_RADIUS - RING_INNER_RADIUS) * Math.random();
    const width = (RING_OUTER_RADIUS - RING_INNER_RADIUS) * 0.03 * (Math.random() + 0.5);
    const density = Math.random() * 0.3 + 0.7;
    
    // Create either denser or less dense region
    const spokeColor = Math.random() > 0.5 ? 
      new Color(0xeee6d6).multiplyScalar(density) : 
      new Color(0x9c8b76).multiplyScalar(density);
    
    const spoke = createRing(
      radius,
      radius + width,
      spokeColor,
      Math.random() * 0.2 + 0.7,
      24 // Lower segment count for these detail elements
    );
    
    // Add spokes to the ringsContainer
    ringsContainer.add(spoke);
  }
  
  // Create ring shadow on Saturn (simulated with a very thin black ring)
  const ringShadow = new RingGeometry(0, SATURN_RADIUS * 30 * 0.95, 48);
  const shadowMaterial = new MeshPhongMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.25,
    side: FrontSide
  });
  
  const shadow = new Mesh(ringShadow, shadowMaterial);
  shadow.rotation.x = Math.PI / 2;
  
  // Add all rings to the rings container
  ringsContainer.add(ringA);
  ringsContainer.add(enckeGap);
  ringsContainer.add(ringB);
  ringsContainer.add(cassiniDivision);
  ringsContainer.add(ringC);
  
  // Apply the axial tilt to the rings container - this ensures ALL rings have the same tilt
  ringsContainer.rotation.z = SATURN_AXIAL_TILT;
  
  // Add the rings container to the saturn system at the top level
  // This keeps rings independent of the planet while still orbiting with it
  saturnSystem.add(ringsContainer);
  
  // Add shadow to the saturn planet container so it follows the planet's tilt
  // The shadow needs to be applied directly to the planet, not to the rings
  saturnPlanetContainer.add(shadow);
};

// Try to load Saturn textures
const tryLoadSaturnTextures = (material) => {
  const textureLoader = new TextureLoader();
  
  // Multiple path options to handle different environment configurations
  const fallbackTexturePaths = [
    './src/assets/saturn.jpg',     // Direct from source folder
    '../assets/saturn.jpg',        // Relative from components folder 
    './assets/saturn.jpg',         // From project root
    '/assets/saturn.jpg'           // From server root
  ];

  let currentIndex = 0;
  
  const tryNextTexture = () => {
    if (currentIndex >= fallbackTexturePaths.length) {
      console.log('All Saturn texture sources failed, using basic material');
      return;
    }
    
    textureLoader.load(
      fallbackTexturePaths[currentIndex],
      (texture) => {
        // Ensure proper UV mapping for full sphere coverage
        texture.wrapS = ClampToEdgeWrapping;
        texture.wrapT = ClampToEdgeWrapping;
        texture.flipY = false;
        texture.needsUpdate = true;
        
        material.map = texture;
        material.needsUpdate = true;
        console.log(`Saturn texture loaded successfully from source ${currentIndex + 1}`);
      },
      undefined,
      (error) => {
        console.warn(`Failed to load Saturn texture from source ${currentIndex + 1}:`, error);
        currentIndex++;
        tryNextTexture();
      }
    );
  };
  
  tryNextTexture();
};

// Create a visible orbit path for Saturn
const createSaturnOrbitPath = () => {
  const points = [];
  const segments = 100;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    
    // Calculate radius using polar form of ellipse equation
    const radius = SATURN_SEMI_MAJOR_AXIS * (1 - SATURN_ECCENTRICITY * SATURN_ECCENTRICITY) /
                  (1 + SATURN_ECCENTRICITY * Math.cos(angle));
    
    // Calculate position with orbital inclination
    const x = -Math.cos(angle) * radius; // Negative to match Earth's direction
    const y = Math.sin(angle) * Math.sin(SATURN_ORBITAL_INCLINATION) * radius;
    const z = Math.sin(angle) * Math.cos(SATURN_ORBITAL_INCLINATION) * radius;

    points.push(new Vector3(x, y, z));
  }

  const orbitPathGeometry = new BufferGeometry().setFromPoints(points);
  const orbitPathMaterial = new LineBasicMaterial({
    color: 0xc9b285, // Tan color for Saturn orbit
    transparent: true,
    opacity: 0.5
  });

  return new LineLoop(orbitPathGeometry, orbitPathMaterial);
};

// Update Saturn position to orbit around the Sun
export const updateSaturnPosition = (saturnSystem, sun, deltaTime) => {
  if (!saturnSystem || !sun) return;

  if (!saturnSystem.userData.orbitalAngle) {
    saturnSystem.userData.orbitalAngle = 0;
  }

  saturnSystem.userData.orbitalAngle += (deltaTime || 0.016) * (Math.PI * 2) / SATURN_ORBITAL_PERIOD;
  const angle = saturnSystem.userData.orbitalAngle;
  
  // Calculate radius using polar form of ellipse equation
  const radius = SATURN_SEMI_MAJOR_AXIS * (1 - SATURN_ECCENTRICITY * SATURN_ECCENTRICITY) /
                (1 + SATURN_ECCENTRICITY * Math.cos(angle));
  
  // Calculate new position with orbital inclination
  const x = sun.position.x - Math.cos(angle) * radius;
  const y = sun.position.y + Math.sin(angle) * Math.sin(SATURN_ORBITAL_INCLINATION) * radius;
  const z = sun.position.z + Math.sin(angle) * Math.cos(SATURN_ORBITAL_INCLINATION) * radius;

  saturnSystem.position.set(x, y, z);
  
  // Add Saturn's self-rotation (faster than Earth)
  // Find the Saturn sphere which is the first child of the group
  const saturn = saturnSystem.children.find(child => child.isMesh && !child.geometry.isRingGeometry);
  if (saturn) {
    saturn.rotation.y += deltaTime * 0.4; // Saturn rotates faster than Earth
  }
};

// Toggle Saturn visibility
export const toggleSaturnVisibility = (saturnSystem) => {
  if (saturnSystem) {
    const newVisibility = !saturnSystem.visible;
    saturnSystem.visible = newVisibility;
    if (saturnSystem.userData && saturnSystem.userData.orbitPath) {
      saturnSystem.userData.orbitPath.visible = newVisibility;
    }
    return newVisibility;
  }
  return false;
};

// Clean up Saturn
export const removeSaturn = (scene, saturnSystem) => {
  if (saturnSystem && scene) {
    scene.remove(saturnSystem);
    if (saturnSystem.userData && saturnSystem.userData.orbitPath) {
      scene.remove(saturnSystem.userData.orbitPath);
    }
  }
};