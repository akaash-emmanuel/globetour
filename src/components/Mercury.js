import { 
  SphereGeometry, 
  MeshPhongMaterial, 
  Mesh, 
  TextureLoader, 
  Vector3, 
  BufferGeometry, 
  LineBasicMaterial, 
  LineLoop
} from 'three';

// Constants for Mercury
const MERCURY_RADIUS = 0.38; // Mercury's radius relative to Earth's radius
const MERCURY_SEMI_MAJOR_AXIS = 0.2 * 5500; // Mercury's average distance from the Sun
const MERCURY_ECCENTRICITY = 0.306; // Mercury's orbital eccentricity
const MERCURY_ORBITAL_PERIOD = 10; // Mercury's orbital period for visualization (reduced for faster animation)
const MERCURY_ORBITAL_INCLINATION = 7 * (Math.PI / 180); // Mercury's orbital inclination in radians

// Create and add Mercury to the scene
export const createMercury = (scene, sun) => {
  if (!scene || !sun) {
    console.error('Cannot create Mercury without scene and sun references');
    return null;
  }

  // Create Mercury geometry
  const mercuryGeometry = new SphereGeometry(MERCURY_RADIUS * 150, 32, 32);

  // Create Mercury material with enhanced basic appearance (for CORS fallback)
  const mercuryMaterial = new MeshPhongMaterial({
    color: 0x8c8c8c,
    shininess: 10,
    emissive: 0x1a1a1a,
    bumpScale: 0.02
  });

  // Create Mercury mesh
  const mercury = new Mesh(mercuryGeometry, mercuryMaterial);

  // Initial position at perihelion (closest to sun)
  const initialRadius = MERCURY_SEMI_MAJOR_AXIS * (1 - MERCURY_ECCENTRICITY);
  mercury.position.set(sun.position.x + initialRadius, sun.position.y, sun.position.z);

  // Create orbit path visualization
  const orbitPath = createMercuryOrbitPath();
  orbitPath.position.copy(sun.position); // Make orbit follow sun
  scene.add(orbitPath);

  // Add custom properties
  mercury.userData = {
    isMercury: true,
    orbitalAngle: 0,
    orbitPath: orbitPath
  };

  // Add Mercury to the scene
  scene.add(mercury);

  // Try loading textures asynchronously (will use basic material if they fail)
  tryLoadMercuryTextures(mercuryMaterial);

  return mercury;
};

// Try to load Mercury textures with multiple fallbacks
const tryLoadMercuryTextures = (material) => {
  const textureLoader = new TextureLoader();
  // Use a GitHub-hosted fallback instead of local file that doesn't exist
  const fallbackTexturePath = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/mercury.jpg';

  // Try loading texture from fallback source
  textureLoader.load(
    fallbackTexturePath,
    (texture) => {
      material.map = texture;
      material.needsUpdate = true;
      console.log("Mercury texture loaded from fallback source");
    },
    undefined,
    () => {
      console.log('Mercury texture not found, using basic material');
      // If texture fails, we'll just use the basic material we set up initially
    }
  );
};

// Create a visible orbit path for Mercury
const createMercuryOrbitPath = () => {
  const points = [];
  const segments = 100;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    
    // Calculate radius using polar form of ellipse equation
    const radius = MERCURY_SEMI_MAJOR_AXIS * (1 - MERCURY_ECCENTRICITY * MERCURY_ECCENTRICITY) /
                  (1 + MERCURY_ECCENTRICITY * Math.cos(angle));
    
    // Calculate position with orbital inclination
    const x = -Math.cos(angle) * radius; // Negative to match Earth's direction
    const y = Math.sin(angle) * Math.sin(MERCURY_ORBITAL_INCLINATION) * radius;
    const z = Math.sin(angle) * Math.cos(MERCURY_ORBITAL_INCLINATION) * radius;

    points.push(new Vector3(x, y, z));
  }

  const orbitPathGeometry = new BufferGeometry().setFromPoints(points);
  const orbitPathMaterial = new LineBasicMaterial({
    color: 0xaaaaaa,
    transparent: true,
    opacity: 0.5
  });

  return new LineLoop(orbitPathGeometry, orbitPathMaterial);
};

// Update Mercury position to orbit around the Sun
export const updateMercuryPosition = (mercury, sun, deltaTime) => {
  if (!mercury || !sun) return;

  if (!mercury.userData.orbitalAngle) {
    mercury.userData.orbitalAngle = 0;
  }

  mercury.userData.orbitalAngle += (deltaTime || 0.016) * (Math.PI * 2) / MERCURY_ORBITAL_PERIOD;
  const angle = mercury.userData.orbitalAngle;
  
  // Calculate radius using polar form of ellipse equation
  const radius = MERCURY_SEMI_MAJOR_AXIS * (1 - MERCURY_ECCENTRICITY * MERCURY_ECCENTRICITY) /
                (1 + MERCURY_ECCENTRICITY * Math.cos(angle));
  
  // Calculate new position with orbital inclination, matching Earth's direction
  const x = sun.position.x - Math.cos(angle) * radius;
  const y = sun.position.y + Math.sin(angle) * Math.sin(MERCURY_ORBITAL_INCLINATION) * radius;
  const z = sun.position.z + Math.sin(angle) * Math.cos(MERCURY_ORBITAL_INCLINATION) * radius;

  mercury.position.set(x, y, z);
};

// Toggle Mercury visibility
export const toggleMercuryVisibility = (mercury) => {
  if (mercury) {
    const newVisibility = !mercury.visible;
    mercury.visible = newVisibility;
    if (mercury.userData && mercury.userData.orbitPath) {
      mercury.userData.orbitPath.visible = newVisibility;
    }
    return newVisibility;
  }
  return false;
};

// Clean up Mercury
export const removeMercury = (scene, mercury) => {
  if (mercury && scene) {
    scene.remove(mercury);
    if (mercury.userData && mercury.userData.orbitPath) {
      scene.remove(mercury.userData.orbitPath);
    }
  }
};
