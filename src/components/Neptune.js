import { Group, Mesh, MeshPhongMaterial, SphereGeometry, Color, Object3D, DoubleSide, RingGeometry, MeshBasicMaterial, Vector3, BufferGeometry, LineBasicMaterial, LineLoop, TextureLoader, ClampToEdgeWrapping } from 'three';

// Neptune physical constants (scaled to match the system used by other planets)
export const NEPTUNE_RADIUS = 5.9; // Neptune's radius relative to Earth's radius (actual: ~3.9)
export const NEPTUNE_AXIAL_TILT = 28.32 * Math.PI / 180; // radians (similar to Earth's tilt)

// Neptune orbital parameters
const NEPTUNE_SEMI_MAJOR_AXIS = 3.8 * 8000; // Neptune's average distance from the Sun (beyond Uranus)
const NEPTUNE_ECCENTRICITY = 0.0113; // Neptune's orbital eccentricity (nearly circular)
const NEPTUNE_ORBITAL_PERIOD = 900; // Neptune's orbital period for visualization (slower than Uranus)
const NEPTUNE_ORBITAL_INCLINATION = 1.77 * (Math.PI / 180); // Neptune's orbital inclination in radians

// Neptune color (deep blue)
const NEPTUNE_COLOR = 0x4169E1; // Deep blue color

// Neptune ring parameters (Neptune has faint rings)
const RING_INNER_RADIUS = 1.4; // relative to planet radius
const RING_OUTER_RADIUS = 2.5; // relative to planet radius
const RING_COLOR = 0x111144;
const RING_OPACITY = 0.25;

export function createNeptune(scene, sun) {
  if (!scene || !sun) {
    console.error('Cannot create Neptune without scene and sun references');
    return null;
  }

  // Container for Neptune and its rings
  const neptuneGroup = new Group();
  neptuneGroup.name = 'NeptuneGroup';

  // Neptune sphere
  const geometry = new SphereGeometry(NEPTUNE_RADIUS * 30, 48, 48);
  const material = new MeshPhongMaterial({ 
    color: NEPTUNE_COLOR, 
    flatShading: false,
    shininess: 15,
    emissive: 0x001133, // Slight blue glow
    emissiveIntensity: 0.1
  });
  const neptuneMesh = new Mesh(geometry, material);
  neptuneMesh.name = 'Neptune';

  // Axial tilt: Neptune has a moderate tilt
  neptuneMesh.rotation.z = NEPTUNE_AXIAL_TILT;

  // Add Neptune to group
  neptuneGroup.add(neptuneMesh);

  // Neptune rings (very faint and dark)
  const ringGeometry = new RingGeometry(
    NEPTUNE_RADIUS * 30 * RING_INNER_RADIUS,
    NEPTUNE_RADIUS * 30 * RING_OUTER_RADIUS,
    128
  );
  const ringMaterial = new MeshBasicMaterial({
    color: RING_COLOR,
    side: DoubleSide,
    transparent: true,
    opacity: RING_OPACITY
  });
  const ringMesh = new Mesh(ringGeometry, ringMaterial);
  ringMesh.name = 'NeptuneRings';
  ringMesh.rotation.x = Math.PI / 2; // Lay flat
  ringMesh.rotation.z = NEPTUNE_AXIAL_TILT; // Match planet's tilt
  neptuneGroup.add(ringMesh);

  // Initial position at perihelion (closest to sun)
  const initialRadius = NEPTUNE_SEMI_MAJOR_AXIS * (1 - NEPTUNE_ECCENTRICITY);
  neptuneGroup.position.set(sun.position.x + initialRadius, sun.position.y, sun.position.z);

  // Create orbit path visualization
  const orbitPath = createNeptuneOrbitPath();
  orbitPath.position.copy(sun.position); // Make orbit follow sun
  scene.add(orbitPath);

  // Add orbital properties for tracking
  neptuneGroup.userData = {
    isNeptune: true,
    orbitalAngle: 0,
    orbitPath: orbitPath
  };

  // Add to scene
  if (scene) scene.add(neptuneGroup);

  // Try loading textures asynchronously (will use basic material if they fail)
  tryLoadNeptuneTextures(material);

  return neptuneGroup;
}

// Try to load Neptune textures with multiple fallbacks
const tryLoadNeptuneTextures = (material) => {
  const textureLoader = new TextureLoader();
  
  // Multiple path options to handle different environment configurations
  const fallbackTexturePaths = [
    './src/assets/neptune.jpg',     // Direct from source folder
    '../assets/neptune.jpg',        // Relative from components folder 
    './assets/neptune.jpg',         // From project root
    '/assets/neptune.jpg'           // From server root
  ];

  let currentIndex = 0;
  
  const tryNextTexture = () => {
    if (currentIndex >= fallbackTexturePaths.length) {
      console.log('All Neptune texture sources failed, using basic material');
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
        console.log(`Neptune texture loaded successfully from source ${currentIndex + 1}`);
      },
      undefined,
      (error) => {
        console.warn(`Failed to load Neptune texture from source ${currentIndex + 1}:`, error);
        currentIndex++;
        tryNextTexture();
      }
    );
  };
  
  tryNextTexture();
};

// Create a visible orbit path for Neptune
const createNeptuneOrbitPath = () => {
  const points = [];
  const segments = 100;

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    
    // Calculate radius using polar form of ellipse equation
    const radius = NEPTUNE_SEMI_MAJOR_AXIS * (1 - NEPTUNE_ECCENTRICITY * NEPTUNE_ECCENTRICITY) /
                  (1 + NEPTUNE_ECCENTRICITY * Math.cos(angle));
    
    // Calculate position with orbital inclination
    const x = -Math.cos(angle) * radius; // Negative to match Earth's direction
    const y = Math.sin(angle) * Math.sin(NEPTUNE_ORBITAL_INCLINATION) * radius;
    const z = Math.sin(angle) * Math.cos(NEPTUNE_ORBITAL_INCLINATION) * radius;

    points.push(new Vector3(x, y, z));
  }

  const orbitPathGeometry = new BufferGeometry().setFromPoints(points);
  const orbitPathMaterial = new LineBasicMaterial({
    color: 0x4169E1, // Deep blue color for Neptune orbit
    transparent: true,
    opacity: 0.5
  });

  return new LineLoop(orbitPathGeometry, orbitPathMaterial);
};

// Neptune orbits the Sun, similar to other planets
export const updateNeptunePosition = (neptuneGroup, sun, deltaTime) => {
  if (!neptuneGroup || !sun) return;

  if (!neptuneGroup.userData.orbitalAngle) {
    neptuneGroup.userData.orbitalAngle = 0;
  }

  neptuneGroup.userData.orbitalAngle += (deltaTime || 0.016) * (Math.PI * 2) / NEPTUNE_ORBITAL_PERIOD;
  const angle = neptuneGroup.userData.orbitalAngle;
  
  // Calculate radius using polar form of ellipse equation
  const radius = NEPTUNE_SEMI_MAJOR_AXIS * (1 - NEPTUNE_ECCENTRICITY * NEPTUNE_ECCENTRICITY) /
                (1 + NEPTUNE_ECCENTRICITY * Math.cos(angle));
  
  // Calculate new position with orbital inclination, matching Earth's direction
  const x = sun.position.x - Math.cos(angle) * radius;
  const y = sun.position.y + Math.sin(angle) * Math.sin(NEPTUNE_ORBITAL_INCLINATION) * radius;
  const z = sun.position.z + Math.sin(angle) * Math.cos(NEPTUNE_ORBITAL_INCLINATION) * radius;

  neptuneGroup.position.set(x, y, z);
  
  // Add Neptune's self-rotation (slightly faster than Earth)
  const neptuneMesh = neptuneGroup.children.find(child => child.name === 'Neptune');
  if (neptuneMesh) {
    neptuneMesh.rotation.y += deltaTime * 0.9; // Neptune rotates slightly faster than Earth
  }
};

// Toggle Neptune visibility
export const toggleNeptuneVisibility = (neptuneGroup) => {
  if (neptuneGroup) {
    const newVisibility = !neptuneGroup.visible;
    neptuneGroup.visible = newVisibility;
    if (neptuneGroup.userData && neptuneGroup.userData.orbitPath) {
      neptuneGroup.userData.orbitPath.visible = newVisibility;
    }
    return newVisibility;
  }
  return false;
};

// Clean up Neptune
export const removeNeptune = (scene, neptuneGroup) => {
  if (neptuneGroup && scene) {
    scene.remove(neptuneGroup);
    if (neptuneGroup.userData && neptuneGroup.userData.orbitPath) {
      scene.remove(neptuneGroup.userData.orbitPath);
    }
  }
};