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

// Constants for Jupiter
const JUPITER_RADIUS = 12.2; // Jupiter's radius relative to Earth's radius
const JUPITER_SEMI_MAJOR_AXIS = 1.03 * 8000; // Jupiter's average distance from the Sun (positioned beyond asteroid belt)
const JUPITER_ECCENTRICITY = 0.0489; // Jupiter's orbital eccentricity
const JUPITER_ORBITAL_PERIOD = 180; // Jupiter's orbital period for visualization (reduced for faster animation)
const JUPITER_ORBITAL_INCLINATION = 1.31 * (Math.PI / 180); // Jupiter's orbital inclination in radians

// Create and add Jupiter to the scene
export const createJupiter = (scene, sun) => {
  if (!scene || !sun) {
    console.error('Cannot create Jupiter without scene and sun references');
    return null;
  }

  // Create Jupiter geometry (larger than terrestrial planets)
  const jupiterGeometry = new SphereGeometry(JUPITER_RADIUS * 30, 48, 48);

  // Create Jupiter material with gas giant appearance
  const jupiterMaterial = new MeshPhongMaterial({
    color: 0xebc89e, // Basic Jupiter color (light tan/beige)
    shininess: 10,
    emissive: 0x110f0d,
    bumpScale: 0.05
  });

  // Create Jupiter mesh
  const jupiter = new Mesh(jupiterGeometry, jupiterMaterial);

  // Initial position at perihelion (closest to sun)
  const initialRadius = JUPITER_SEMI_MAJOR_AXIS * (1 - JUPITER_ECCENTRICITY);
  jupiter.position.set(sun.position.x + initialRadius, sun.position.y, sun.position.z);

  // Create orbit path visualization
  const orbitPath = createJupiterOrbitPath();
  orbitPath.position.copy(sun.position); // Make orbit follow sun
  scene.add(orbitPath);

  // Add custom properties
  jupiter.userData = {
    isJupiter: true,
    orbitalAngle: 0,
    orbitPath: orbitPath
  };

  // Add Jupiter to the scene
  scene.add(jupiter);

  // Try loading textures asynchronously (will use basic material if they fail)
  tryLoadJupiterTextures(jupiterMaterial);

  return jupiter;
};

// Try to load Jupiter textures with multiple fallbacks
const tryLoadJupiterTextures = (material) => {
  const textureLoader = new TextureLoader();
  
  // Multiple path options to handle different environment configurations
  const fallbackTexturePaths = [
    './src/assets/jupiter.jpg',     // Direct from source folder
    '../assets/jupiter.jpg',        // Relative from components folder 
    './assets/jupiter.jpg',         // From project root
    '/assets/jupiter.jpg'           // From server root
  ];

  let currentIndex = 0;
  
  const tryNextTexture = () => {
    if (currentIndex >= fallbackTexturePaths.length) {
      console.log('All Jupiter texture sources failed, using basic material');
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
        console.log(`Jupiter texture loaded successfully from source ${currentIndex + 1}`);
      },
      undefined,
      (error) => {
        console.warn(`Failed to load Jupiter texture from source ${currentIndex + 1}:`, error);
        currentIndex++;
        tryNextTexture();
      }
    );
  };
  
  tryNextTexture();
  let textureLoaded = false;
  
  for (let i = 0; i < fallbackTexturePaths.length; i++) {
    if (textureLoaded) break;
    
    textureLoader.load(
      fallbackTexturePaths[i],
      (texture) => {
        material.map = texture;
        material.needsUpdate = true;
        textureLoaded = true;
        console.log("Jupiter texture loaded successfully");
      },
      undefined,
      () => {
        if (i === fallbackTexturePaths.length - 1 && !textureLoaded) {
          console.log('Jupiter texture not found, using basic material');
          // If all fallbacks fail, use the basic material
        }
      }
    );
  }
};

// Create a visible orbit path for Jupiter
const createJupiterOrbitPath = () => {
  const points = [];
  const segments = 100;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    
    // Calculate radius using polar form of ellipse equation
    const radius = JUPITER_SEMI_MAJOR_AXIS * (1 - JUPITER_ECCENTRICITY * JUPITER_ECCENTRICITY) /
                  (1 + JUPITER_ECCENTRICITY * Math.cos(angle));
    
    // Calculate position with orbital inclination
    const x = -Math.cos(angle) * radius; // Negative to match Earth's direction
    const y = Math.sin(angle) * Math.sin(JUPITER_ORBITAL_INCLINATION) * radius;
    const z = Math.sin(angle) * Math.cos(JUPITER_ORBITAL_INCLINATION) * radius;

    points.push(new Vector3(x, y, z));
  }

  const orbitPathGeometry = new BufferGeometry().setFromPoints(points);
  const orbitPathMaterial = new LineBasicMaterial({
    color: 0xcca161, // Yellowish-tan color for Jupiter orbit
    transparent: true,
    opacity: 0.5
  });

  return new LineLoop(orbitPathGeometry, orbitPathMaterial);
};

// Update Jupiter position to orbit around the Sun
export const updateJupiterPosition = (jupiter, sun, deltaTime) => {
  if (!jupiter || !sun) return;

  if (!jupiter.userData.orbitalAngle) {
    jupiter.userData.orbitalAngle = 0;
  }

  jupiter.userData.orbitalAngle += (deltaTime || 0.016) * (Math.PI * 2) / JUPITER_ORBITAL_PERIOD;
  const angle = jupiter.userData.orbitalAngle;
  
  // Calculate radius using polar form of ellipse equation
  const radius = JUPITER_SEMI_MAJOR_AXIS * (1 - JUPITER_ECCENTRICITY * JUPITER_ECCENTRICITY) /
                (1 + JUPITER_ECCENTRICITY * Math.cos(angle));
  
  // Calculate new position with orbital inclination, matching Earth's direction
  const x = sun.position.x - Math.cos(angle) * radius;
  const y = sun.position.y + Math.sin(angle) * Math.sin(JUPITER_ORBITAL_INCLINATION) * radius;
  const z = sun.position.z + Math.sin(angle) * Math.cos(JUPITER_ORBITAL_INCLINATION) * radius;

  jupiter.position.set(x, y, z);
  
  // Add Jupiter's self-rotation (faster than Earth)
  jupiter.rotation.y += deltaTime * 0.5; // Jupiter rotates about 2.5x faster than Earth
};

// Toggle Jupiter visibility
export const toggleJupiterVisibility = (jupiter) => {
  if (jupiter) {
    const newVisibility = !jupiter.visible;
    jupiter.visible = newVisibility;
    if (jupiter.userData && jupiter.userData.orbitPath) {
      jupiter.userData.orbitPath.visible = newVisibility;
    }
    return newVisibility;
  }
  return false;
};

// Clean up Jupiter
export const removeJupiter = (scene, jupiter) => {
  if (jupiter && scene) {
    scene.remove(jupiter);
    if (jupiter.userData && jupiter.userData.orbitPath) {
      scene.remove(jupiter.userData.orbitPath);
    }
  }
};