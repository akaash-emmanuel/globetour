import { 
  SphereGeometry, 
  MeshPhongMaterial, 
  Mesh, 
  TextureLoader, 
  Vector3, 
  BufferGeometry, 
  LineBasicMaterial, 
  LineLoop,
  EllipseCurve,
  PointLight,
  Color,
  ClampToEdgeWrapping
} from 'three';
import axios from 'axios';

// Constants for Sun
const SUN_RADIUS = 350; // Sun's radius compared to Earth (scaled for visualization, increased for better visibility)
const SUN_DISTANCE = 5500; // Distance from coordinate center (increased for better scaling)
const EARTH_ORBITAL_PERIOD = 60; // Time in seconds for Earth to complete one orbit (faster for better visualization)
const EARTH_ORBITAL_INCLINATION = 7.155 * (Math.PI / 180); // Earth's orbital inclination (~7.155 degrees)
const EARTH_ORBIT_SIZE = 0.5; // Scale factor for Earth's orbit size (relative to sun distance)

// NASA API Constants for SDO imagery
const NASA_API_KEY = "jmRRPCUwwWyNaMrXJCNz8HDX8q94wPnQfKz0ig5a";
const SDO_UPDATE_INTERVAL = 10 * 60 * 1000; // Update every 10 minutes (in milliseconds)
const SDO_DEFAULT_WAVELENGTH = "304"; // Default: 304 Angstrom (red/orange showing chromosphere and transition region)
const SDO_WAVELENGTHS = ["171", "193", "211", "304", "131", "335", "094", "1600", "1700", "AIA", "0171", "0193", "0211", "0304", "0131", "0335", "0094"];

// Asteroid Belt Constants (for future implementation)
export const ASTEROID_BELT_INNER_RADIUS = 5600; // Scaled distance from sun (between Mars and Jupiter)
export const ASTEROID_BELT_OUTER_RADIUS = 7000; // Scaled outer distance
export const ASTEROID_BELT_THICKNESS = 200; // Visual thickness of the belt
export const ASTEROID_BELT_COUNT = 2900; // Number of asteroids to render (adjust for performance/visuals)

// Create and add the sun to the scene
export const createSun = (scene) => {
  // Create sun geometry
  const sunGeometry = new SphereGeometry(SUN_RADIUS, 64, 64);
  
  // Create sun material with enhanced properties for better visuals
  const sunMaterial = new MeshPhongMaterial({
    color: 0xffffaa,
    emissive: 0xffffaa,
    emissiveIntensity: 1.5, // Enhanced glow
    shininess: 15 // Increased shininess for a more vibrant appearance
  });
  
  // Add a glow effect
  sunMaterial.transparent = true;
  
  // Load high-quality sun texture for better realism
  const textureLoader = new TextureLoader();
  
  // Function to fetch and update sun texture with latest SDO imagery
  const updateSunTexture = async () => {
    try {
      // First try to get NASA SDO image
      const latestSDOUrl = await getLatestSDOImageUrl(SDO_DEFAULT_WAVELENGTH);
      
      if (latestSDOUrl) {
        console.log("Loading new SDO image:", latestSDOUrl);
        textureLoader.load(
          latestSDOUrl,
          (texture) => {
            sunMaterial.map = texture;
            sunMaterial.needsUpdate = true;
            console.log("Sun texture updated with latest SDO image");
          },
          undefined, // onProgress
          (err) => {
            console.error('Error loading SDO sun texture', err);
            loadFallbackTexture(); // Load fallback if SDO fails
          }
        );
      } else {
        console.error('Could not get latest SDO image URL');
        loadFallbackTexture();
      }
    } catch (error) {
      console.error('Error updating sun texture with SDO imagery:', error);
      loadFallbackTexture();
    }
  };
  
  // Function to load fallback textures if SDO fails
  const loadFallbackTexture = () => {
    console.log('Loading fallback sun texture');
    // Multiple path options to handle different environment configurations
    const fallbackSunUrls = [
      './src/assets/sun.jpg',     // Direct from source folder
      '../assets/sun.jpg',        // Relative from components folder 
      './assets/sun.jpg',         // From project root
      '/assets/sun.jpg'           // From server root
    ];
    
    let currentIndex = 0;
    
    const tryNextTexture = () => {
      if (currentIndex >= fallbackSunUrls.length) {
        console.log('All Sun texture sources failed, using basic material');
        sunMaterial.color.set(0xffcb8c);
        sunMaterial.emissive.set(0xff9933);
        sunMaterial.emissiveIntensity = 1;
        sunMaterial.needsUpdate = true;
        return;
      }
      
      textureLoader.load(
        fallbackSunUrls[currentIndex],
        (texture) => {
          // Ensure proper UV mapping for full sphere coverage
          texture.wrapS = ClampToEdgeWrapping;
          texture.wrapT = ClampToEdgeWrapping;
          texture.flipY = false;
          texture.needsUpdate = true;
          
          sunMaterial.map = texture;
          sunMaterial.needsUpdate = true;
          console.log(`Sun fallback texture loaded from source ${currentIndex + 1}`);
        },
        undefined,
        (error) => {
          console.warn(`Failed to load Sun texture from source ${currentIndex + 1}:`, error);
          currentIndex++;
          tryNextTexture();
        }
      );
    };
    
    tryNextTexture();
  };
  
  // Initial texture load
  updateSunTexture();
  
  // Create sun mesh
  const sun = new Mesh(sunGeometry, sunMaterial);
  
  // Position sun far away from the origin
  sun.position.set(SUN_DISTANCE, 0, 0);
  
  // Add enhanced lights emanating from the sun - dramatically increased intensity for primary light source
  const sunLight = new PointLight(0xffffff, 5.0, 0);  // increased from 3.5 to 5.0
  sunLight.position.copy(sun.position);
  scene.add(sunLight);
  
  // Add secondary sun light with slight color variation for realism - increased intensity
  const secondarySunLight = new PointLight(0xffeecc, 2.5, 5000);  // increased from 1.2 to 2.5, range from 3000 to 5000
  secondarySunLight.position.copy(sun.position);
  scene.add(secondarySunLight);
  
  // Add tertiary light with warm color to simulate light scattered through dust
  const tertiaryLight = new PointLight(0xff9933, 1.0, 8000);
  tertiaryLight.position.copy(sun.position);
  scene.add(tertiaryLight);
  
  // Create orbit path visualization for Earth around the sun
  const orbitPath = createEarthOrbitPath(SUN_DISTANCE);
  scene.add(orbitPath);
  
  // Add custom properties
  sun.userData = {
    isSun: true,
    light: sunLight,
    secondaryLight: secondarySunLight,
    tertiaryLight: tertiaryLight,
    orbitPath: orbitPath,
    updateInterval: null, // Will store the setInterval reference
    lastTextureUpdate: Date.now()
  };
  
  // Set up recurring texture updates
  sun.userData.updateInterval = setInterval(() => {
    updateSunTexture();
    sun.userData.lastTextureUpdate = Date.now();
  }, SDO_UPDATE_INTERVAL);
  
  // Add sun to the scene
  scene.add(sun);
  
  return sun;
};

// Function to get the latest SDO image URL
const getLatestSDOImageUrl = async (wavelength = SDO_DEFAULT_WAVELENGTH) => {
  try {
    // Use a GitHub-hosted sun texture instead of trying to fetch from NASA
    // This avoids CORS issues and 404 errors
    const fallbackTexturePath = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/sun.jpg';
    console.log("Using fallback sun texture to avoid CORS/404 issues");
    return fallbackTexturePath;
    
    /* Original implementation for future reference:
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    // Format: https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0304.jpg
    const latestSDOUrl = `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_${wavelength}.jpg`;
    return latestSDOUrl;
    */
  } catch (error) {
    console.error('Error fetching latest SDO image URL:', error);
    return null;
  }
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
    // Clear the update interval
    if (sun.userData && sun.userData.updateInterval) {
      clearInterval(sun.userData.updateInterval);
      sun.userData.updateInterval = null;
    }
    
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
      sun.userData.light.intensity = newVisibility ? 5.0 : 0;  // updated to match new intensity
    }
    
    // Update secondary light intensity based on visibility
    if (sun.userData && sun.userData.secondaryLight) {
      sun.userData.secondaryLight.intensity = newVisibility ? 2.5 : 0;  // updated to match new intensity
    }
    
    // Update tertiary light intensity based on visibility
    if (sun.userData && sun.userData.tertiaryLight) {
      sun.userData.tertiaryLight.intensity = newVisibility ? 1.0 : 0;  // updated to match new intensity
    }
    
    return newVisibility;
  }
  
  return false;
};

// Function to change the SDO wavelength for different views of the sun
export const changeSunWavelength = (sun, wavelength = SDO_DEFAULT_WAVELENGTH) => {
  if (!sun || !sun.material) return false;

  const validWavelength = SDO_WAVELENGTHS.includes(wavelength) ? wavelength : SDO_DEFAULT_WAVELENGTH;
  console.log(`Changing sun wavelength to ${validWavelength}Å (using color simulation)`);

  switch (validWavelength) {
    case "171":
      sun.material.color.set(0xffd700);
      sun.material.emissive.set(0xffd700);
      break;
    case "193":
      sun.material.color.set(0xa1ffa1);
      sun.material.emissive.set(0xa1ffa1);
      break;
    case "211":
      sun.material.color.set(0xc991ff);
      sun.material.emissive.set(0xc991ff);
      break;
    case "304":
      sun.material.color.set(0xff9e9e);
      sun.material.emissive.set(0xff9e9e);
      break;
    case "131":
      sun.material.color.set(0x80c1ff);
      sun.material.emissive.set(0x80c1ff);
      break;
    case "335":
      sun.material.color.set(0x6699ff);
      sun.material.emissive.set(0x6699ff);
      break;
    case "094":
      sun.material.color.set(0x66ff99);
      sun.material.emissive.set(0x66ff99);
      break;
    default:
      sun.material.color.set(0xffffaa);
      sun.material.emissive.set(0xff9933);
  }

  sun.material.needsUpdate = true;
  console.log(`Sun wavelength changed to ${validWavelength}Å`);
  return true;
};
