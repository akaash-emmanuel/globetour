import { Group, Mesh, MeshPhongMaterial, SphereGeometry, Color, Object3D, DoubleSide, RingGeometry, MeshBasicMaterial, Vector3, BufferGeometry, LineBasicMaterial, LineLoop, TextureLoader, AdditiveBlending, ClampToEdgeWrapping } from 'three';

// Uranus physical constants (scaled to match the system used by other planets)
export const URANUS_RADIUS = 7.4; // Uranus's radius relative to Earth's radius (actual: ~4.0)
export const URANUS_AXIAL_TILT = 97.77 * Math.PI / 180; // radians

// Uranus orbital parameters
const URANUS_SEMI_MAJOR_AXIS = 2.5 * 8000; // Uranus's average distance from the Sun (beyond Saturn)
const URANUS_ECCENTRICITY = 0.0457; // Uranus's orbital eccentricity
const URANUS_ORBITAL_PERIOD = 600; // Uranus's orbital period for visualization (slower than Saturn)
const URANUS_ORBITAL_INCLINATION = 0.77 * (Math.PI / 180); // Uranus's orbital inclination in radians

// Uranus color (pale blue-green)
const URANUS_COLOR = 0xB8E3F7;

// Uranus ring parameters (Uranus has faint, dark rings)
// Enhanced ring system with multiple rings and better opacity
const RING_INNER_RADIUS = 1.2; // relative to planet radius
const RING_OUTER_RADIUS = 2.2; // increased from 2.0 to make rings more prominent
const RING_COLOR = 0x222233;
const RING_OPACITY = 0.4; // increased from 0.35
const RING_SUBDIVISIONS = 5; // number of distinct rings

export function createUranus(scene, sun) {
  if (!scene || !sun) {
    console.error('Cannot create Uranus without scene and sun references');
    return null;
  }

  // Container for Uranus and its rings
  const uranusGroup = new Group();
  uranusGroup.name = 'UranusGroup';

  // Add a subtle glow effect around Uranus
  const glowGeometry = new SphereGeometry(URANUS_RADIUS * 31, 32, 32);
  const glowMaterial = new MeshBasicMaterial({
    color: 0xA0E8FF,
    transparent: true,
    opacity: 0.08,
    blending: AdditiveBlending
  });
  const glowMesh = new Mesh(glowGeometry, glowMaterial);
  uranusGroup.add(glowMesh);

  // Uranus sphere with improved resolution
  const geometry = new SphereGeometry(URANUS_RADIUS * 30, 64, 64); // Increased resolution from 48 to 64
  
  // Improved material with subtle details
  const material = new MeshPhongMaterial({ 
    color: URANUS_COLOR, 
    flatShading: false,
    shininess: 25,
    emissive: 0x102030,
    emissiveIntensity: 0.1
  });
  
  const uranusMesh = new Mesh(geometry, material);
  uranusMesh.name = 'Uranus';

  // Axial tilt: Uranus is tipped almost onto its side
  uranusMesh.rotation.z = URANUS_AXIAL_TILT;

  // Add Uranus to group
  uranusGroup.add(uranusMesh);

  // Enhanced ring system - multiple rings with varied opacity
  for (let i = 0; i < RING_SUBDIVISIONS; i++) {
    const ringInnerRadius = URANUS_RADIUS * 30 * (RING_INNER_RADIUS + i * (RING_OUTER_RADIUS - RING_INNER_RADIUS) / RING_SUBDIVISIONS);
    const ringOuterRadius = URANUS_RADIUS * 30 * (RING_INNER_RADIUS + (i + 1) * (RING_OUTER_RADIUS - RING_INNER_RADIUS) / RING_SUBDIVISIONS);
    
    const ringGeometry = new RingGeometry(
      ringInnerRadius,
      ringOuterRadius,
      128
    );
    
    // Vary the color and opacity slightly for each ring to create more depth
    const hue = (i / RING_SUBDIVISIONS) * 0.1; // Subtle color variation
    const ringColor = new Color().setHSL(0.6 + hue, 0.1, 0.15 + i * 0.02);
    
    const ringMaterial = new MeshBasicMaterial({
      color: ringColor,
      side: DoubleSide,
      transparent: true,
      opacity: RING_OPACITY - (i % 2) * 0.1 // Alternate rings have slightly different opacity
    });
    
    const ringMesh = new Mesh(ringGeometry, ringMaterial);
    ringMesh.name = `UranusRing-${i}`;
    ringMesh.rotation.x = Math.PI / 2; // Lay flat
    ringMesh.rotation.z = URANUS_AXIAL_TILT; // Match planet's tilt
    uranusGroup.add(ringMesh);
  }

  // Initial position at perihelion (closest to sun)
  const initialRadius = URANUS_SEMI_MAJOR_AXIS * (1 - URANUS_ECCENTRICITY);
  uranusGroup.position.set(sun.position.x + initialRadius, sun.position.y, sun.position.z);

  // Create orbit path visualization
  const orbitPath = createUranusOrbitPath();
  orbitPath.position.copy(sun.position); // Make orbit follow sun
  scene.add(orbitPath);

  // Add orbital properties for tracking
  uranusGroup.userData = {
    isUranus: true,
    orbitalAngle: 0,
    orbitPath: orbitPath
  };

  // Add to scene
  if (scene) scene.add(uranusGroup);

  // Try loading textures asynchronously (will use basic material if they fail)
  tryLoadUranusTextures(material);

  return uranusGroup;
}

// Try to load Uranus textures with multiple fallbacks
const tryLoadUranusTextures = (material) => {
  const textureLoader = new TextureLoader();
  
  // Multiple path options to handle different environment configurations
  const fallbackTexturePaths = [
    './src/assets/uranus.jpg',     // Direct from source folder
    '../assets/uranus.jpg',        // Relative from components folder 
    './assets/uranus.jpg',         // From project root
    '/assets/uranus.jpg'           // From server root
  ];

  let currentIndex = 0;
  
  const tryNextTexture = () => {
    if (currentIndex >= fallbackTexturePaths.length) {
      console.log('All Uranus texture sources failed, using basic material');
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
        console.log(`Uranus texture loaded successfully from source ${currentIndex + 1}`);
      },
      undefined,
      (error) => {
        console.warn(`Failed to load Uranus texture from source ${currentIndex + 1}:`, error);
        currentIndex++;
        tryNextTexture();
      }
    );
  };
  
  tryNextTexture();
};

// Create a visible orbit path for Uranus
const createUranusOrbitPath = () => {
  const points = [];
  const segments = 100;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    
    // Calculate radius using polar form of ellipse equation
    const radius = URANUS_SEMI_MAJOR_AXIS * (1 - URANUS_ECCENTRICITY * URANUS_ECCENTRICITY) /
                  (1 + URANUS_ECCENTRICITY * Math.cos(angle));
    
    // Calculate position with orbital inclination
    const x = -Math.cos(angle) * radius; // Negative to match Earth's direction
    const y = Math.sin(angle) * Math.sin(URANUS_ORBITAL_INCLINATION) * radius;
    const z = Math.sin(angle) * Math.cos(URANUS_ORBITAL_INCLINATION) * radius;

    points.push(new Vector3(x, y, z));
  }

  const orbitPathGeometry = new BufferGeometry().setFromPoints(points);
  const orbitPathMaterial = new LineBasicMaterial({
    color: 0x4FD0E7, // Cyan-blue color for Uranus orbit
    transparent: true,
    opacity: 0.5
  });

  return new LineLoop(orbitPathGeometry, orbitPathMaterial);
};

// Uranus orbits the Sun, similar to other planets
export const updateUranusPosition = (uranusGroup, sun, deltaTime) => {
  if (!uranusGroup || !sun) return;

  if (!uranusGroup.userData.orbitalAngle) {
    uranusGroup.userData.orbitalAngle = 0;
  }

  uranusGroup.userData.orbitalAngle += (deltaTime || 0.016) * (Math.PI * 2) / URANUS_ORBITAL_PERIOD;
  const angle = uranusGroup.userData.orbitalAngle;
  
  // Calculate radius using polar form of ellipse equation
  const radius = URANUS_SEMI_MAJOR_AXIS * (1 - URANUS_ECCENTRICITY * URANUS_ECCENTRICITY) /
                (1 + URANUS_ECCENTRICITY * Math.cos(angle));
  
  // Calculate new position with orbital inclination, matching Earth's direction
  const x = sun.position.x - Math.cos(angle) * radius;
  const y = sun.position.y + Math.sin(angle) * Math.sin(URANUS_ORBITAL_INCLINATION) * radius;
  const z = sun.position.z + Math.sin(angle) * Math.cos(URANUS_ORBITAL_INCLINATION) * radius;

  uranusGroup.position.set(x, y, z);
  
  // Add Uranus's self-rotation (slower than Earth due to long day)
  const uranusMesh = uranusGroup.children.find(child => child.name === 'Uranus');
  if (uranusMesh) {
    uranusMesh.rotation.y += deltaTime * 0.7; // Uranus rotates slightly faster than Earth
  }
  
  // Add subtle pulsation to the glow effect
  const glowMesh = uranusGroup.children.find(child => child instanceof Mesh && child.material.opacity < 0.1);
  if (glowMesh) {
    const pulseFactor = 0.005 * Math.sin(Date.now() * 0.001);
    glowMesh.scale.set(1 + pulseFactor, 1 + pulseFactor, 1 + pulseFactor);
  }
};

// Toggle Uranus visibility
export const toggleUranusVisibility = (uranusGroup) => {
  if (uranusGroup) {
    const newVisibility = !uranusGroup.visible;
    uranusGroup.visible = newVisibility;
    if (uranusGroup.userData && uranusGroup.userData.orbitPath) {
      uranusGroup.userData.orbitPath.visible = newVisibility;
    }
    return newVisibility;
  }
  return false;
};

// Clean up Uranus
export const removeUranus = (scene, uranusGroup) => {
  if (uranusGroup && scene) {
    scene.remove(uranusGroup);
    if (uranusGroup.userData && uranusGroup.userData.orbitPath) {
      scene.remove(uranusGroup.userData.orbitPath);
    }
  }
};
