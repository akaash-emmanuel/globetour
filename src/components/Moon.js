import { 
  SphereGeometry, 
  MeshPhongMaterial, 
  Mesh, 
  TextureLoader, 
  Vector3, 
  BufferGeometry, 
  LineBasicMaterial, 
  LineLoop,
  EllipseCurve 
} from 'three';

// Constants for Moon
const MOON_RADIUS = 0.5; // Moon's radius increased from actual 27% for better visibility when focused
const MOON_DISTANCE = 300; // Distance from Earth (scaled for visualization, increased to avoid being inside the Earth)
const MOON_ORBITAL_PERIOD = 30; // Time in seconds for one orbit (reduced for better visualization)
const MOON_ROTATION_SPEED = 0.005; // Moon's rotation speed
const MOON_ORBITAL_INCLINATION = 5.14 * (Math.PI / 180); // Moon's orbital inclination in radians (~5.14 degrees)

// Create and add the moon to the scene
export const createMoon = (scene, globeRadius) => {
  // Create moon geometry (scaled to Earth's radius)
  const scaledMoonRadius = globeRadius * MOON_RADIUS;
  const moonGeometry = new SphereGeometry(scaledMoonRadius, 32, 32);
  
  // Create moon material (grey color with enhanced properties for better visibility)
  const moonMaterial = new MeshPhongMaterial({
    color: 0xdddddd,
    shininess: 10,
    bumpScale: 0.5,
    emissive: 0x222222
  });
  
  // Load high-quality moon texture for better realism
  const textureLoader = new TextureLoader();
  
  // Use GitHub texture for development to avoid CORS issues
  const useGitHubFallback = true; // Set to false in production
  
  if (useGitHubFallback) {
    // Skip NASA textures that cause CORS issues and go straight to GitHub-hosted textures
    console.log("Using GitHub moon texture to avoid CORS issues");
    textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg',
      (texture) => {
        moonMaterial.map = texture;
        moonMaterial.needsUpdate = true;
        console.log("Moon texture loaded from GitHub");
      },
      undefined,
      (err) => console.error('Error loading moon texture from GitHub', err)
    );
  } else {
    // Original NASA implementation - use in production environment
    textureLoader.load(
      // URL to high-quality moon texture from NASA
      'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_1k.jpg',
      // onLoad callback
      (texture) => {
        moonMaterial.map = texture;
        
        // Also load a bump map for realistic terrain
        textureLoader.load(
          'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_3_8bit_1k.jpg',
          (bumpMap) => {
            moonMaterial.bumpMap = bumpMap;
            moonMaterial.bumpScale = 0.3;
            moonMaterial.needsUpdate = true;
          },
          undefined,
          (err) => console.error('Error loading moon bump texture', err)
        );
        
        moonMaterial.needsUpdate = true;
      },
      // onProgress callback
      undefined,
      // onError callback
      (err) => {
        console.error('Error loading moon texture', err);
        // Fallback to a simpler texture if NASA textures fail
        textureLoader.load(
          'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg',
          (fallbackTexture) => {
            moonMaterial.map = fallbackTexture;
            moonMaterial.needsUpdate = true;
          }
        );
      }
    );
  }
  
  // Create moon mesh
  const moon = new Mesh(moonGeometry, moonMaterial);
  
  // Initial position
  moon.position.set(MOON_DISTANCE, 0, 0);
  
  // Create orbit path visualization
  const orbitPath = createMoonOrbitPath(MOON_DISTANCE);
  scene.add(orbitPath);
  
  // Add custom properties
  moon.userData = {
    isMoon: true,
    orbitalAngle: 0,
    orbitalDistance: MOON_DISTANCE,
    orbitPath: orbitPath,
    lastPhaseUpdate: 0
  };
  
  // Add moon to the scene
  scene.add(moon);
  
  return moon;
};

// Create a visible orbit path for the moon
const createMoonOrbitPath = (orbitalDistance) => {
  // Instead of using EllipseCurve, we'll manually create points to match the exact orbit path
  // the moon will follow (with proper inclination and direction)
  const points = [];
  const segments = 100;
  
  // We need to go counterclockwise to match how the moon actually moves
  for (let i = segments; i >= 0; i--) {
    const angle = (i / segments) * Math.PI * 2;
    
    // Use the same calculations as in updateMoonPosition to ensure consistency
    const x = Math.cos(angle) * orbitalDistance;
    const y = Math.sin(angle) * Math.sin(MOON_ORBITAL_INCLINATION) * orbitalDistance;
    const z = Math.sin(angle) * Math.cos(MOON_ORBITAL_INCLINATION) * orbitalDistance;
    
    points.push(new Vector3(x, y, z));
  }
  
  // Create geometry from points
  const orbitPathGeometry = new BufferGeometry().setFromPoints(points);
  
  // Create line material with enhanced visibility
  const orbitPathMaterial = new LineBasicMaterial({
    color: 0xaaaaaa,
    transparent: true,
    opacity: 0.5
  });
  
  // Create the orbit path as a line loop
  const orbitPath = new LineLoop(orbitPathGeometry, orbitPathMaterial);
  
  // No need to apply rotation since points are already properly positioned
  
  // Add metadata
  orbitPath.userData = {
    isMoonOrbit: true
  };
  
  return orbitPath;
};

// Update moon position to orbit around Earth
export const updateMoonPosition = (moon, globeGroup, deltaTime) => {
  if (!moon || !globeGroup) return;
  
  // Get Earth's position in world coordinates
  const earthPosition = new Vector3();
  globeGroup.getWorldPosition(earthPosition);
  
  // Update orbital angle - use a consistent speed regardless of frame rate
  // Negative value to make it orbit in the correct direction (counterclockwise when viewed from above)
  moon.userData.orbitalAngle -= (deltaTime || 0.016) * (Math.PI * 2) / MOON_ORBITAL_PERIOD;
  
  // Calculate new position with inclination
  const angle = moon.userData.orbitalAngle;
  const x = Math.cos(angle) * MOON_DISTANCE;
  const y = Math.sin(angle) * Math.sin(MOON_ORBITAL_INCLINATION) * MOON_DISTANCE;
  const z = Math.sin(angle) * Math.cos(MOON_ORBITAL_INCLINATION) * MOON_DISTANCE;
  
  // Update position relative to Earth
  moon.position.set(
    earthPosition.x + x,
    earthPosition.y + y,
    earthPosition.z + z
  );
  
  // Make moon face the Earth
  moon.lookAt(earthPosition);
  
  // Rotate the moon on its axis slightly
  moon.rotateY(MOON_ROTATION_SPEED * (deltaTime || 0.016));
  
  // Update moon phase every second to avoid performance issues
  const now = Date.now();
  if (now - moon.userData.lastPhaseUpdate > 1000) {
    updateMoonPhase(moon, angle);
    moon.userData.lastPhaseUpdate = now;
  }
  
  // Update the moon's orbit path position to follow Earth
  if (moon.userData.orbitPath) {
    moon.userData.orbitPath.position.copy(earthPosition);
  }
};

// Update the moon's appearance based on its position relative to the Earth and Sun
const updateMoonPhase = (moon, angle) => {
  if (!moon || !moon.material) return;
  
  // Light from the Sun is approximated as coming from the positive x-axis
  // This is a simplified model - in reality it would depend on the Earth-Sun position
  
  // Calculate how much of the moon is illuminated based on its position
  // We need to adjust for the fact that we're now moving in the opposite direction
  // by negating the angle in the cosine calculation
  const illuminationFactor = (Math.cos(-angle) + 1) / 2;
  
  // Update the moon's material appearance based on illumination
  // For a simple visual effect, we'll adjust emissive intensity
  moon.material.emissiveIntensity = illuminationFactor * 0.5;
  
  // Also adjust the base color slightly to represent the phase
  const baseColor = 0.8 + (illuminationFactor * 0.2);
  moon.material.color.setRGB(baseColor, baseColor, baseColor);
};

// Clean up moon
export const removeMoon = (scene, moon) => {
  if (moon && scene) {
    // Remove the moon itself
    scene.remove(moon);
    
    // Remove the orbit path if it exists
    if (moon.userData && moon.userData.orbitPath) {
      scene.remove(moon.userData.orbitPath);
    }
  }
};

// Toggle moon visibility
export const toggleMoonVisibility = (moon, isVisible) => {
  if (moon) {
    // If isVisible is not provided, toggle current state
    const newVisibility = isVisible !== undefined ? isVisible : !moon.visible;
    
    // Update moon visibility
    moon.visible = newVisibility;
    
    // Also update orbit path visibility if it exists
    if (moon.userData && moon.userData.orbitPath) {
      moon.userData.orbitPath.visible = newVisibility;
    }
    
    return newVisibility;
  }
  
  return false;
};
