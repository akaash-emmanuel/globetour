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

// Constants for Venus
const VENUS_RADIUS = 0.95; // Venus's radius relative to Earth's radius
const VENUS_SEMI_MAJOR_AXIS = 0.33 * 5500; // Venus's average distance from the Sun
const VENUS_ECCENTRICITY = 0.007; // Venus's orbital eccentricity
const VENUS_ORBITAL_PERIOD = 42; // Venus's orbital period for visualization (reduced for faster animation)
const VENUS_ORBITAL_INCLINATION = 3.4 * (Math.PI / 180); // Venus's orbital inclination in radians

// Create and add Venus to the scene
export const createVenus = (scene, sun) => {
  if (!scene || !sun) {
    console.error('Cannot create Venus without scene and sun references');
    return null;
  }

  // Create Venus geometry
  const venusGeometry = new SphereGeometry(VENUS_RADIUS * 150, 32, 32);

  // Create Venus material with enhanced basic appearance (for CORS fallback)
  const venusMaterial = new MeshPhongMaterial({
    color: 0xd6b47e,
    shininess: 5,
    emissive: 0x1a1a1a,
    bumpScale: 0.02
  });

  // Create Venus mesh
  const venus = new Mesh(venusGeometry, venusMaterial);

  // Initial position at perihelion (closest to sun)
  const initialRadius = VENUS_SEMI_MAJOR_AXIS * (1 - VENUS_ECCENTRICITY);
  venus.position.set(sun.position.x + initialRadius, sun.position.y, sun.position.z);

  // Create orbit path visualization
  const orbitPath = createVenusOrbitPath();
  orbitPath.position.copy(sun.position); // Make orbit follow sun
  scene.add(orbitPath);

  // Add custom properties
  venus.userData = {
    isVenus: true,
    orbitalAngle: 0,
    orbitPath: orbitPath
  };

  // Add Venus to the scene
  scene.add(venus);

  // Try loading textures asynchronously (will use basic material if they fail)
  tryLoadVenusTextures(venusMaterial);

  return venus;
};

// Try to load Venus textures with multiple fallbacks
const tryLoadVenusTextures = (material) => {
  const textureLoader = new TextureLoader();
  // Use a GitHub-hosted fallback instead of local file
  const fallbackTexturePath = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/venus-surface.jpg';

  // Try loading texture from fallback source
  textureLoader.load(
    fallbackTexturePath,
    (texture) => {
      material.map = texture;
      material.needsUpdate = true;
      console.log("Venus texture loaded from fallback source");
    },
    undefined,
    () => {
      console.log('Venus texture not found, using basic material');
      // If texture fails, we'll just use the basic material we set up initially
    }
  );
};

// Create a visible orbit path for Venus
const createVenusOrbitPath = () => {
  const points = [];
  const segments = 100;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    
    // Calculate radius using polar form of ellipse equation
    const radius = VENUS_SEMI_MAJOR_AXIS * (1 - VENUS_ECCENTRICITY * VENUS_ECCENTRICITY) /
                  (1 + VENUS_ECCENTRICITY * Math.cos(angle));
    
    // Calculate position with orbital inclination
    const x = -Math.cos(angle) * radius; // Negative to match Earth's direction
    const y = Math.sin(angle) * Math.sin(VENUS_ORBITAL_INCLINATION) * radius;
    const z = Math.sin(angle) * Math.cos(VENUS_ORBITAL_INCLINATION) * radius;

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

// Update Venus position to orbit around the Sun
export const updateVenusPosition = (venus, sun, deltaTime) => {
  if (!venus || !sun) return;

  if (!venus.userData.orbitalAngle) {
    venus.userData.orbitalAngle = 0;
  }

  venus.userData.orbitalAngle += (deltaTime || 0.016) * (Math.PI * 2) / VENUS_ORBITAL_PERIOD;
  const angle = venus.userData.orbitalAngle;
  
  // Calculate radius using polar form of ellipse equation
  const radius = VENUS_SEMI_MAJOR_AXIS * (1 - VENUS_ECCENTRICITY * VENUS_ECCENTRICITY) /
                (1 + VENUS_ECCENTRICITY * Math.cos(angle));
  
  // Calculate new position with orbital inclination, matching Earth's direction
  const x = sun.position.x - Math.cos(angle) * radius;
  const y = sun.position.y + Math.sin(angle) * Math.sin(VENUS_ORBITAL_INCLINATION) * radius;
  const z = sun.position.z + Math.sin(angle) * Math.cos(VENUS_ORBITAL_INCLINATION) * radius;

  venus.position.set(x, y, z);
};

// Toggle Venus visibility
export const toggleVenusVisibility = (venus) => {
  if (venus) {
    const newVisibility = !venus.visible;
    venus.visible = newVisibility;
    if (venus.userData && venus.userData.orbitPath) {
      venus.userData.orbitPath.visible = newVisibility;
    }
    return newVisibility;
  }
  return false;
};

// Clean up Venus
export const removeVenus = (scene, venus) => {
  if (venus && scene) {
    scene.remove(venus);
    if (venus.userData && venus.userData.orbitPath) {
      scene.remove(venus.userData.orbitPath);
    }
  }
};