import { 
  SphereGeometry, 
  MeshBasicMaterial, 
  Mesh, 
  TextureLoader, 
  Vector3, 
  BufferGeometry, 
  LineBasicMaterial, 
  LineLoop,
  EllipseCurve,
  PointLight,
  Color
} from 'three';

// Constants for Sun
const SUN_RADIUS = 25; // Sun's radius compared to Earth (scaled for visualization, increased for better visibility)
const SUN_DISTANCE = 3500; // Distance from coordinate center (increased for better scaling)
const EARTH_ORBITAL_PERIOD = 60; // Time in seconds for Earth to complete one orbit (faster for better visualization)
const EARTH_ORBITAL_INCLINATION = 7.155 * (Math.PI / 180); // Earth's orbital inclination (~7.155 degrees)
const EARTH_ORBIT_SIZE = 0.5; // Scale factor for Earth's orbit size (relative to sun distance)

// Create and add the sun to the scene
export const createSun = (scene) => {
  // Create sun geometry
  const sunGeometry = new SphereGeometry(SUN_RADIUS, 64, 64);
  
  // Create sun material with enhanced properties for better visuals
  const sunMaterial = new MeshBasicMaterial({
    color: 0xffffaa,
    emissive: 0xffffaa,
    emissiveIntensity: 1
  });
  
  // Add a slight glow effect
  sunMaterial.transparent = true;
  
  // Load high-quality sun texture for better realism
  const textureLoader = new TextureLoader();
  textureLoader.load(
    // Primary URL to high-quality sun texture (NASA/ESA sourced)
    'https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004815/frames/730x730_1x1_30p/sun.jpg',
    // onLoad callback
    (texture) => {
      sunMaterial.map = texture;
      sunMaterial.needsUpdate = true;
    },
    // onProgress callback
    undefined,
    // onError callback
    (err) => {
      console.error('Error loading primary sun texture', err);
      
      // Try alternative sun texture
      textureLoader.load(
        'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/sun.jpg',
        (fallbackTexture) => {
          sunMaterial.map = fallbackTexture;
          sunMaterial.needsUpdate = true;
        },
        undefined,
        (err2) => {
          console.error('Error loading fallback sun texture', err2);
          
          // Last resort texture
          textureLoader.load(
            'https://www.solarsystemscope.com/textures/download/2k_sun.jpg',
            (lastTexture) => {
              sunMaterial.map = lastTexture;
              sunMaterial.needsUpdate = true;
            }
          );
        }
      );
    }
  );
  
  // Create sun mesh
  const sun = new Mesh(sunGeometry, sunMaterial);
  
  // Position sun far away from the origin
  sun.position.set(SUN_DISTANCE, 0, 0);
  
  // Add enhanced lights emanating from the sun
  const sunLight = new PointLight(0xffffff, 2, 0);
  sunLight.position.copy(sun.position);
  scene.add(sunLight);
  
  // Add secondary sun light with slight color variation for realism
  const secondarySunLight = new PointLight(0xffeecc, 0.8, 3000);
  secondarySunLight.position.copy(sun.position);
  scene.add(secondarySunLight);
  
  // Create orbit path visualization for Earth around the sun
  const orbitPath = createEarthOrbitPath(SUN_DISTANCE);
  scene.add(orbitPath);
  
  // Add custom properties
  sun.userData = {
    isSun: true,
    light: sunLight,
    secondaryLight: secondarySunLight,
    orbitPath: orbitPath
  };
  
  // Add sun to the scene
  scene.add(sun);
  
  return sun;
};

// Create a visible orbit path for the Earth around the sun
const createEarthOrbitPath = (sunDistance) => {
  // Create points for the Earth's orbit around the sun
  const points = [];
  const segments = 100;
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    
    // Earth orbits in a circle around the sun (simplified)
    // In reality it's an ellipse but for visualization a circle works well
    const x = sunDistance - Math.cos(angle) * sunDistance * EARTH_ORBIT_SIZE;
    const y = Math.sin(angle) * Math.sin(EARTH_ORBITAL_INCLINATION) * sunDistance * EARTH_ORBIT_SIZE;
    const z = Math.sin(angle) * Math.cos(EARTH_ORBITAL_INCLINATION) * sunDistance * EARTH_ORBIT_SIZE;
    
    points.push(new Vector3(x, y, z));
  }
  
  // Create geometry from points
  const orbitPathGeometry = new BufferGeometry().setFromPoints(points);
  
  // Create line material with enhanced visibility
  const orbitPathMaterial = new LineBasicMaterial({
    color: 0x4488ff,
    transparent: true,
    opacity: 0.3
  });
  
  // Create the orbit path as a line loop
  const orbitPath = new LineLoop(orbitPathGeometry, orbitPathMaterial);
  
  // Add metadata
  orbitPath.userData = {
    isEarthOrbit: true
  };
  
  return orbitPath;
};

// Update Earth position to orbit around the Sun
export const updateEarthPosition = (globeGroup, sun, deltaTime, moon) => {
  if (!globeGroup || !sun) return;
  
  // Update the Earth's orbital angle
  if (!globeGroup.userData.orbitalAngle) {
    globeGroup.userData.orbitalAngle = 0;
  }
  
  // Update angle based on time
  globeGroup.userData.orbitalAngle += (deltaTime || 0.016) * (Math.PI * 2) / EARTH_ORBITAL_PERIOD;
  const angle = globeGroup.userData.orbitalAngle;
  
  // Calculate new position with inclination
  const x = sun.position.x - Math.cos(angle) * SUN_DISTANCE * EARTH_ORBIT_SIZE;
  const y = Math.sin(angle) * Math.sin(EARTH_ORBITAL_INCLINATION) * SUN_DISTANCE * EARTH_ORBIT_SIZE;
  const z = Math.sin(angle) * Math.cos(EARTH_ORBITAL_INCLINATION) * SUN_DISTANCE * EARTH_ORBIT_SIZE;
  
  // Update Earth position
  globeGroup.position.set(x, y, z);
};

// Clean up sun
export const removeSun = (scene, sun) => {
  if (sun && scene) {
    // Remove the sun mesh
    scene.remove(sun);
    
    // Remove the main light if it exists
    if (sun.userData && sun.userData.light) {
      scene.remove(sun.userData.light);
    }
    
    // Remove the secondary light if it exists
    if (sun.userData && sun.userData.secondaryLight) {
      scene.remove(sun.userData.secondaryLight);
    }
    
    // Remove the orbit path if it exists
    if (sun.userData && sun.userData.orbitPath) {
      scene.remove(sun.userData.orbitPath);
    }
  }
};

// Toggle sun visibility
export const toggleSunVisibility = (sun, isVisible) => {
  if (sun) {
    // If isVisible is not provided, toggle current state
    const newVisibility = isVisible !== undefined ? isVisible : !sun.visible;
    
    // Update sun visibility
    sun.visible = newVisibility;
    
    // Also update orbit path visibility if it exists
    if (sun.userData && sun.userData.orbitPath) {
      sun.userData.orbitPath.visible = newVisibility;
    }
    
    // Update main light intensity based on visibility
    if (sun.userData && sun.userData.light) {
      sun.userData.light.intensity = newVisibility ? 2 : 0;
    }
    
    // Update secondary light intensity based on visibility
    if (sun.userData && sun.userData.secondaryLight) {
      sun.userData.secondaryLight.intensity = newVisibility ? 0.8 : 0;
    }
    
    return newVisibility;
  }
  
  return false;
};
