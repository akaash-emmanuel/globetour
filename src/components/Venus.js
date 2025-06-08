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

// Import asset loader for textures
import { getTexturePath } from '../utils/assetLoader.js';

// Constants for Venus
const VENUS_RADIUS = 0.8; // Venus's radius relative to Earth's radius
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

  // Create Venus geometry with proper UV mapping
  const venusGeometry = new SphereGeometry(VENUS_RADIUS * 150, 64, 32);

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
  
  // Get the properly imported texture path
  const venusTexturePath = getTexturePath('venus');
  
  // Multiple path options to handle different environment configurations
  const fallbackTexturePaths = [
    venusTexturePath,               // Webpack imported asset
    './src/assets/venus.jpg',       // Direct from source folder
    '../assets/venus.jpg',          // Relative from components folder 
    './assets/venus.jpg',           // From project root
    '/assets/venus.jpg'             // From server root
  ];

  let currentIndex = 0;

  const tryNextTexture = () => {
    if (currentIndex >= fallbackTexturePaths.length) {
      console.log('Venus: All texture sources failed, using basic material');
      return;
    }

    const texturePath = fallbackTexturePaths[currentIndex];
    console.log(`Venus: Attempting to load texture from source ${currentIndex + 1}: ${texturePath}`);

    textureLoader.load(
      texturePath,
      (texture) => {
        // Configure texture for proper UV mapping across entire sphere
        texture.wrapS = ClampToEdgeWrapping;
        texture.wrapT = ClampToEdgeWrapping;
        texture.flipY = false;
        texture.needsUpdate = true;
        
        material.map = texture;
        material.needsUpdate = true;
        console.log(`Venus: Successfully loaded texture from source ${currentIndex + 1}`);
      },
      undefined,
      (error) => {
        console.log(`Venus: Failed to load texture from source ${currentIndex + 1}, trying next...`);
        currentIndex++;
        tryNextTexture();
      }
    );
  };

  tryNextTexture();
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