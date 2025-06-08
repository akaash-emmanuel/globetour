import { 
  SphereGeometry, 
  MeshPhongMaterial, 
  Mesh, 
  TextureLoader, 
  Vector3, 
  BufferGeometry, 
  LineBasicMaterial, 
  LineLoop,
  ClampToEdgeWrapping
} from 'three';

// Constants for Mars
const MARS_RADIUS = 0.5; // Mars's radius relative to Earth's radius
const MARS_SEMI_MAJOR_AXIS = 0.75 * 5500; // Mars's average distance from the Sun
const MARS_ECCENTRICITY = 0.0935; // Mars's orbital eccentricity
const MARS_ORBITAL_PERIOD = 75; // Mars's orbital period for visualization (reduced for faster animation)
const MARS_ORBITAL_INCLINATION = 1.85 * (Math.PI / 180); // Mars's orbital inclination in radians

// Create and add Mars to the scene
export const createMars = (scene, sun) => {
  if (!scene || !sun) {
    console.error('Cannot create Mars without scene and sun references');
    return null;
  }

  // Create Mars geometry
  const marsGeometry = new SphereGeometry(MARS_RADIUS * 150, 32, 32);

  // Create Mars material with enhanced basic appearance (for CORS fallback)
  const marsMaterial = new MeshPhongMaterial({
    color: 0xc1440e, // Reddish-orange color for Mars
    shininess: 5,
    emissive: 0x220000,
    bumpScale: 0.02
  });

  // Create Mars mesh
  const mars = new Mesh(marsGeometry, marsMaterial);

  // Initial position at perihelion (closest to sun)
  const initialRadius = MARS_SEMI_MAJOR_AXIS * (1 - MARS_ECCENTRICITY);
  mars.position.set(sun.position.x + initialRadius, sun.position.y, sun.position.z);

  // Create orbit path visualization
  const orbitPath = createMarsOrbitPath();
  orbitPath.position.copy(sun.position); // Make orbit follow sun
  scene.add(orbitPath);

  // Add custom properties
  mars.userData = {
    isMars: true,
    orbitalAngle: 0,
    orbitPath: orbitPath
  };

  // Add Mars to the scene
  scene.add(mars);

  // Try loading textures asynchronously (will use basic material if they fail)
  tryLoadMarsTextures(marsMaterial);

  return mars;
};

// Try to load Mars textures with multiple fallbacks
const tryLoadMarsTextures = (material) => {
  const textureLoader = new TextureLoader();
  
  // Multiple path options to handle different environment configurations
  const fallbackTexturePaths = [
    './src/assets/mars.jpg',     // Direct from source folder
    '../assets/mars.jpg',        // Relative from components folder 
    './assets/mars.jpg',         // From project root
    '/assets/mars.jpg'           // From server root
  ];

  let currentIndex = 0;
  
  const tryNextTexture = () => {
    if (currentIndex >= fallbackTexturePaths.length) {
      console.log('All Mars texture sources failed, using basic material');
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
        console.log(`Mars texture loaded successfully from source ${currentIndex + 1}`);
      },
      undefined,
      (error) => {
        console.warn(`Failed to load Mars texture from source ${currentIndex + 1}:`, error);
        currentIndex++;
        tryNextTexture();
      }
    );
  };
  
  tryNextTexture();
};

// Create a visible orbit path for Mars
const createMarsOrbitPath = () => {
  const points = [];
  const segments = 100;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    
    // Calculate radius using polar form of ellipse equation
    const radius = MARS_SEMI_MAJOR_AXIS * (1 - MARS_ECCENTRICITY * MARS_ECCENTRICITY) /
                  (1 + MARS_ECCENTRICITY * Math.cos(angle));
    
    // Calculate position with orbital inclination
    const x = -Math.cos(angle) * radius; // Negative to match Earth's direction
    const y = Math.sin(angle) * Math.sin(MARS_ORBITAL_INCLINATION) * radius;
    const z = Math.sin(angle) * Math.cos(MARS_ORBITAL_INCLINATION) * radius;

    points.push(new Vector3(x, y, z));
  }

  const orbitPathGeometry = new BufferGeometry().setFromPoints(points);
  const orbitPathMaterial = new LineBasicMaterial({
    color: 0xaa3333, // Reddish color for Mars orbit
    transparent: true,
    opacity: 0.5
  });

  return new LineLoop(orbitPathGeometry, orbitPathMaterial);
};

// Update Mars position to orbit around the Sun
export const updateMarsPosition = (mars, sun, deltaTime) => {
  if (!mars || !sun) return;

  if (!mars.userData.orbitalAngle) {
    mars.userData.orbitalAngle = 0;
  }

  mars.userData.orbitalAngle += (deltaTime || 0.016) * (Math.PI * 2) / MARS_ORBITAL_PERIOD;
  const angle = mars.userData.orbitalAngle;
  
  // Calculate radius using polar form of ellipse equation
  const radius = MARS_SEMI_MAJOR_AXIS * (1 - MARS_ECCENTRICITY * MARS_ECCENTRICITY) /
                (1 + MARS_ECCENTRICITY * Math.cos(angle));
  
  // Calculate new position with orbital inclination, matching Earth's direction
  const x = sun.position.x - Math.cos(angle) * radius;
  const y = sun.position.y + Math.sin(angle) * Math.sin(MARS_ORBITAL_INCLINATION) * radius;
  const z = sun.position.z + Math.sin(angle) * Math.cos(MARS_ORBITAL_INCLINATION) * radius;

  mars.position.set(x, y, z);
};

// Toggle Mars visibility
export const toggleMarsVisibility = (mars) => {
  if (mars) {
    const newVisibility = !mars.visible;
    mars.visible = newVisibility;
    if (mars.userData && mars.userData.orbitPath) {
      mars.userData.orbitPath.visible = newVisibility;
    }
    return newVisibility;
  }
  return false;
};

// Clean up Mars
export const removeMars = (scene, mars) => {
  if (mars && scene) {
    scene.remove(mars);
    if (mars.userData && mars.userData.orbitPath) {
      scene.remove(mars.userData.orbitPath);
    }
  }
};