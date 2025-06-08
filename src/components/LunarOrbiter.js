/**
 * LunarOrbiter.js - Visualization of the Lunar Reconnaissance Orbiter (LRO)
 * 
 * This file implements the visualization of NASA's Lunar Reconnaissance Orbiter
 * spacecraft orbiting the Moon in the globe tour application. It includes:
 * 
 * 1. Creation of the LRO spacecraft model
 * 2. Visualization of its orbit path around the Moon
 * 3. Live telemetry data display (simulated)
 * 4. Mission information panel
 * 
 * The LRO is a NASA robotic spacecraft currently orbiting the Moon in a polar orbit
 * since its launch on June 18, 2009. Its primary mission is to make high-resolution maps
 * of the lunar surface to aid in future lunar exploration missions.
 */

import { 
  SphereGeometry, 
  MeshPhongMaterial, 
  Mesh, 
  Vector3, 
  LineBasicMaterial, 
  BufferGeometry, 
  LineLoop,
  TextureLoader,
  CanvasTexture,
  SpriteMaterial,
  Sprite,
  Quaternion
} from 'three';
import axios from 'axios';

// Constants for LRO visualization
const LRO_SCALE = 0.03; // Scale of LRO relative to Moon radius
const LRO_ORBITAL_HEIGHT = 0.12; // Height above the Moon surface (scaled)
const LRO_ORBITAL_PERIOD = 15; // Time in seconds for one orbit (for visualization)
const LRO_ORBITAL_INCLINATION = 90 * (Math.PI / 180); // LRO polar orbit inclination (90 degrees)
const NASA_API_KEY = "jmRRPCUwwWyNaMrXJCNz8HDX8q94wPnQfKz0ig5a";

// LRO orbit parameters in km (actual values)
const LRO_PERILUNE = 20; // km (lowest point)
const LRO_APOLUNE = 165; // km (highest point)
const MOON_RADIUS_KM = 1737.4; // Moon's radius in kilometers

// Create and add the Lunar Reconnaissance Orbiter (LRO) to the scene
export const createLunarOrbiter = (scene, moon) => {
  if (!scene || !moon) {
    console.error('Scene or Moon not provided to createLunarOrbiter');
    return null;
  }

  // Get the Moon's radius for proper scaling
  const moonRadius = moon.geometry.parameters.radius;
  
  // Create LRO geometry (very small compared to the Moon)
  const orbiterRadius = moonRadius * LRO_SCALE;
  const orbiterGeometry = new SphereGeometry(orbiterRadius, 16, 16);
  
  // Create LRO material (bright to make it visible)
  const orbiterMaterial = new MeshPhongMaterial({
    color: 0xffff00, // Bright yellow for visibility
    emissive: 0xffff00,
    emissiveIntensity: 0.5,
    shininess: 30
  });
  
  // Create LRO mesh
  const orbiter = new Mesh(orbiterGeometry, orbiterMaterial);
  
  // Initial position (will be updated in updateLROPosition)
  orbiter.position.set(moonRadius + (moonRadius * LRO_ORBITAL_HEIGHT), 0, 0);
  
  // Create orbit path visualization
  const orbitPath = createLROOrbitPath(moonRadius, LRO_ORBITAL_HEIGHT);
  
  // Add custom properties
  orbiter.userData = {
    isLRO: true,
    orbitalAngle: 0,
    orbitPath: orbitPath,
    lastUpdate: Date.now()
  };
  
  // Add orbit path to the Moon
  moon.add(orbitPath);
  
  // Add LRO to the scene (not to the Moon, so we can control its position independently)
  scene.add(orbiter);
  
  // Create and add label sprite for the LRO
  const label = createLROLabel();
  orbiter.add(label);
  
  return orbiter;
};

// Create a visible orbit path for the LRO
const createLROOrbitPath = (moonRadius, orbitalHeight) => {
  const points = [];
  const segments = 100;
  const orbitRadius = moonRadius + (moonRadius * orbitalHeight);
  
  // Create points for a polar orbit (inclination of 90 degrees)
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    
    // Calculate position with inclination for a polar orbit
    const x = Math.cos(angle) * orbitRadius;
    const y = Math.sin(angle) * orbitRadius * Math.sin(LRO_ORBITAL_INCLINATION);
    const z = Math.sin(angle) * orbitRadius * Math.cos(LRO_ORBITAL_INCLINATION);
    
    points.push(new Vector3(x, y, z));
  }
  
  // Create geometry from points
  const orbitPathGeometry = new BufferGeometry().setFromPoints(points);
  
  // Create line material with enhanced visibility
  const orbitPathMaterial = new LineBasicMaterial({
    color: 0x00ffff, // Cyan color for orbit path
    transparent: true,
    opacity: 0.6,
    linewidth: 1
  });
  
  // Create the orbit path as a line loop
  const orbitPath = new LineLoop(orbitPathGeometry, orbitPathMaterial);
  
  // Add metadata
  orbitPath.userData = {
    isLROOrbit: true
  };
  
  return orbitPath;
};

// Create a text label for the LRO
const createLROLabel = () => {
  // Create canvas for the label
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 128;
  
  // Draw background
  context.fillStyle = 'rgba(0, 0, 0, 0.7)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw border
  context.strokeStyle = '#00FFFF';
  context.lineWidth = 2;
  context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
  
  // Draw text
  context.fillStyle = '#FFFFFF';
  context.font = 'bold 24px Arial';
  context.fillText('LRO', 10, 35);
  context.font = '16px Arial';
  context.fillText('Lunar Reconnaissance', 10, 65);
  context.fillText('Orbiter', 10, 85);
  
  // Create texture from canvas
  const texture = new CanvasTexture(canvas);
  
  // Create sprite material
  const material = new SpriteMaterial({
    map: texture,
    transparent: true
  });
  
  // Create sprite
  const sprite = new Sprite(material);
  sprite.scale.set(4, 2, 1);
  sprite.position.set(2, 0, 0);
  
  return sprite;
};

// Update LRO position to orbit around Moon
export const updateLROPosition = (lro, moon, deltaTime) => {
  if (!lro || !moon) return;
  
  // Get Moon's position in world coordinates
  const moonPosition = new Vector3();
  moon.getWorldPosition(moonPosition);
  
  // Get Moon's radius for calculations
  const moonRadius = moon.geometry.parameters.radius;
  
  // Update orbital angle
  lro.userData.orbitalAngle += (deltaTime || 0.016) * (Math.PI * 2) / LRO_ORBITAL_PERIOD;
  
  // Calculate new position with inclination for a polar orbit
  const angle = lro.userData.orbitalAngle;
  const orbitRadius = moonRadius + (moonRadius * LRO_ORBITAL_HEIGHT);
  const x = Math.cos(angle) * orbitRadius;
  const y = Math.sin(angle) * orbitRadius * Math.sin(LRO_ORBITAL_INCLINATION);
  const z = Math.sin(angle) * orbitRadius * Math.cos(LRO_ORBITAL_INCLINATION);
  
  // Create a new Quaternion object to store moon's rotation
  const moonQuaternion = new Quaternion();
  moon.getWorldQuaternion(moonQuaternion);
  
  // Apply moon's world quaternion to LRO's position
  const lroVector = new Vector3(x, y, z).applyQuaternion(moonQuaternion);
  
  // Update position relative to Moon
  lro.position.set(
    moonPosition.x + lroVector.x,
    moonPosition.y + lroVector.y,
    moonPosition.z + lroVector.z
  );
  
  // Make LRO face Moon (look towards the Moon)
  lro.lookAt(moonPosition);
};

// Clean up LRO
export const removeLRO = (scene, lro) => {
  if (lro && scene) {
    // Remove the orbit path from its parent (the Moon)
    if (lro.userData && lro.userData.orbitPath && lro.userData.orbitPath.parent) {
      lro.userData.orbitPath.parent.remove(lro.userData.orbitPath);
    }
    
    // Remove the LRO itself
    scene.remove(lro);
  }
};

// Toggle LRO visibility
export const toggleLROVisibility = (lro, isVisible) => {
  if (lro) {
    // If isVisible is not provided, toggle current state
    const newVisibility = isVisible !== undefined ? isVisible : !lro.visible;
    
    // Update LRO visibility
    lro.visible = newVisibility;
    
    // Also update orbit path visibility if it exists
    if (lro.userData && lro.userData.orbitPath) {
      lro.userData.orbitPath.visible = newVisibility;
    }
    
    return newVisibility;
  }
  
  return false;
};

// Fetch real-time LRO data from NASA Horizons API (simulation for now)
export const fetchLROData = async () => {
  try {
    // For demonstration, this would fetch real data from NASA Horizons API
    // but is simulated here to avoid external API dependencies
    return {
      altitude: (LRO_PERILUNE + Math.random() * (LRO_APOLUNE - LRO_PERILUNE)).toFixed(1), // Random altitude between perilune and apolune
      velocity: (1.6 + Math.random() * 0.2).toFixed(2), // ~1.6 km/s with small variation
      latitude: (Math.random() * 180 - 90).toFixed(2), // Random latitude
      longitude: (Math.random() * 360 - 180).toFixed(2), // Random longitude
      orbit_number: Math.floor(16000 + Math.random() * 2000), // Random orbit number (actual LRO has completed over 15,000 orbits)
      mission_elapsed_time: "5177 days, 14 hours, 32 minutes" // Time since LRO launch (2009)
    };
  } catch (error) {
    console.error("Error fetching LRO data:", error);
    return null;
  }
};

// Update the info panel with LRO data
export const updateLROInfoPanel = async (infoPanel) => {
  if (!infoPanel) return;
  
  // Fetch current LRO data
  const lroData = await fetchLROData();
  if (!lroData) {
    infoPanel.innerHTML = "<h3>Lunar Reconnaissance Orbiter</h3><p>Error fetching data</p>";
    return;
  }
  
  // Update the info panel with LRO data
  infoPanel.innerHTML = `
    <h3 style="color: #00FFFF; text-align: center; margin: 0 0 15px 0;">Lunar Reconnaissance Orbiter</h3>
    <div style="margin-bottom: 20px;">
      <img src="https://www.nasa.gov/wp-content/uploads/2019/09/lro_hires.jpg" 
           style="width: 100%; border-radius: 5px; border: 1px solid #00FFFF;" 
           alt="LRO" />
    </div>
    <div style="background-color: rgba(0, 30, 60, 0.7); padding: 15px; border-radius: 5px; margin-bottom: 15px;">
      <h4 style="color: #00FFFF; margin: 0 0 10px 0;">Live Telemetry</h4>
      <table style="width: 100%; color: #FFFFFF;">
        <tr>
          <td><strong>Altitude:</strong></td>
          <td>${lroData.altitude} km</td>
        </tr>
        <tr>
          <td><strong>Velocity:</strong></td>
          <td>${lroData.velocity} km/s</td>
        </tr>
        <tr>
          <td><strong>Latitude:</strong></td>
          <td>${lroData.latitude}°</td>
        </tr>
        <tr>
          <td><strong>Longitude:</strong></td>
          <td>${lroData.longitude}°</td>
        </tr>
        <tr>
          <td><strong>Orbit:</strong></td>
          <td>#${lroData.orbit_number}</td>
        </tr>
      </table>
    </div>
    <div style="background-color: rgba(0, 30, 60, 0.7); padding: 15px; border-radius: 5px;">
      <h4 style="color: #00FFFF; margin: 0 0 10px 0;">Mission Info</h4>
      <p><strong>Launch Date:</strong> June 18, 2009</p>
      <p><strong>Mission Duration:</strong> ${lroData.mission_elapsed_time}</p>
      <p><strong>Primary Objectives:</strong> Mapping the lunar surface, identifying potential landing sites, 
      characterizing the radiation environment, and searching for resources.</p>
    </div>
  `;
};

// Variable to track current animation frame for cancellation
let currentAnimationFrame = null;

// Function to stop any ongoing animation
export const stopCurrentAnimation = () => {
  if (currentAnimationFrame !== null) {
    cancelAnimationFrame(currentAnimationFrame);
    currentAnimationFrame = null;
  }
};

// Main function to show Lunar Orbiter visualization
export const showLunarOrbiterLive = (scene, globe, globeGroup, camera) => {
  // Stop any existing animations first
  stopCurrentAnimation();
  
  // Get the moon object from the scene
  let moon = null;
  scene.traverse((object) => {
    if (object.userData && object.userData.isMoon) {
      moon = object;
    }
  });
  
  if (!moon) {
    console.error("Moon not found in the scene");
    return;
  }
  
  // Focus camera on the Moon - using the switchCameraFocus function from index.js
  // We'll need to use window to access the global function
  if (window.switchCameraFocus) {
    window.switchCameraFocus('moon');
  } else {
    // Fallback if the function is not available
    console.warn("switchCameraFocus function not available, creating local focus function");
    
    // Get moon position
    const moonPosition = new Vector3();
    moon.getWorldPosition(moonPosition);
    
    // Set up animation to focus on moon
    const startPosition = camera.position.clone();
    const startTarget = new Vector3();
    camera.getWorldDirection(startTarget).multiplyScalar(100).add(camera.position);
    
    // Calculate ideal viewing distance (5x moon radius)
    const moonRadius = moon.geometry.parameters.radius;
    const distance = moonRadius * 5;
    
    // Calculate end position
    const directionToMoon = new Vector3().subVectors(camera.position, moonPosition).normalize();
    const endPosition = moonPosition.clone().add(directionToMoon.multiplyScalar(distance));
    
    // Set up animation
    let startTime = Date.now();
    const duration = 1500; // 1.5 seconds
    
    function animateCamera() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-in-out function
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : -1 + (4 - 2 * progress) * progress;
      
      // Update position
      camera.position.lerpVectors(startPosition, endPosition, easeProgress);
      
      // Look at moon
      camera.lookAt(moonPosition);
      
      // Continue animation if not complete
      if (progress < 1) {
        currentAnimationFrame = requestAnimationFrame(animateCamera);
      }
    }
    
    // Start animation
    animateCamera();
  }
  
  // Create the LRO
  const lro = createLunarOrbiter(scene, moon);
  if (!lro) return;
  
  // Update the info panel with LRO data
  const infoPanel = document.getElementById("verticalButton");
  if (!infoPanel) return;
  
  // Set up the info panel
  updateLROInfoPanel(infoPanel);
  
  // Set up an interval to update the info panel periodically
  const infoPanelInterval = setInterval(() => {
    updateLROInfoPanel(infoPanel);
  }, 5000);
  
  // Store the interval for cleanup
  if (!window.astronautToolIntervals) {
    window.astronautToolIntervals = [];
  }
  window.astronautToolIntervals.push(infoPanelInterval);
  
  // Generate a function to clean up the LRO visualization
  const cleanup = () => {
    removeLRO(scene, lro);
  };
  
  return cleanup;
};
