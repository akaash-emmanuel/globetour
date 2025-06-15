/**
 * PlanetaryAtmosphericGlow.js - Atmospheric glow effects for planets with atmospheres
 * 
 * Adds realistic atmospheric halo effects to planets based on their actual atmospheric composition
 * and characteristics. Only applies to planets that have atmospheres in real life.
 */

import { 
  SphereGeometry, 
  MeshBasicMaterial, 
  Mesh, 
  AdditiveBlending,
  Color,
  ShaderMaterial
} from 'three';

// Atmospheric glow configurations for each planet
const ATMOSPHERIC_GLOW_CONFIG = {
  venus: {
    color: 0xffa366, // Orange-yellow glow from sulfuric acid clouds
    intensity: 0.15,
    scale: 1.08, // Glow extends 8% beyond planet surface
    opacity: 0.3,
    description: "Thick sulfuric acid atmosphere with greenhouse effect"
  },
  mars: {
    color: 0xff6b47, // Reddish-orange glow from thin CO₂ atmosphere
    intensity: 0.08,
    scale: 1.04, // Very thin atmosphere, minimal glow
    opacity: 0.2,
    description: "Thin CO₂ atmosphere with dust particles"
  },
  jupiter: {
    color: 0xffa366, // Golden-orange glow from hydrogen/helium atmosphere
    intensity: 0.25,
    scale: 1.12, // Thick atmosphere with extended glow
    opacity: 0.35,
    description: "Dense hydrogen/helium atmosphere with storm systems"
  },
  saturn: {
    color: 0xffcc88, // Pale yellow-gold glow from hydrogen/helium atmosphere
    intensity: 0.22,
    scale: 1.1, // Dense atmosphere similar to Jupiter
    opacity: 0.32,
    description: "Dense hydrogen/helium atmosphere with ring interactions"
  },
  uranus: {
    color: 0x88ddff, // Blue-cyan glow from methane in atmosphere
    intensity: 0.18,
    scale: 1.09, // Moderate atmosphere thickness
    opacity: 0.28,
    description: "Hydrogen/helium/methane atmosphere with blue methane haze"
  },
  neptune: {
    color: 0x4488ff, // Deep blue glow from methane atmosphere
    intensity: 0.2,
    scale: 1.1, // Dense atmosphere with dynamic weather
    opacity: 0.3,
    description: "Dense hydrogen/helium/methane atmosphere with extreme winds"
  }
};

// Create atmospheric glow effect for a planet
export const createAtmosphericGlow = (planetMesh, planetType, scene) => {
  if (!planetMesh || !ATMOSPHERIC_GLOW_CONFIG[planetType]) {
    console.warn(`No atmospheric glow configuration for planet type: ${planetType}`);
    return null;
  }

  const config = ATMOSPHERIC_GLOW_CONFIG[planetType];
  
  // Get the planet's radius from its geometry with fallback methods
  let planetRadius;
  
  // Method 1: Try to get radius from geometry parameters
  if (planetMesh.geometry && planetMesh.geometry.parameters && planetMesh.geometry.parameters.radius) {
    planetRadius = planetMesh.geometry.parameters.radius;
  }
  // Method 2: Try to calculate from bounding sphere
  else if (planetMesh.geometry && planetMesh.geometry.boundingSphere) {
    planetRadius = planetMesh.geometry.boundingSphere.radius;
  }
  // Method 3: Calculate from geometry vertices
  else if (planetMesh.geometry && planetMesh.geometry.attributes && planetMesh.geometry.attributes.position) {
    planetMesh.geometry.computeBoundingSphere();
    planetRadius = planetMesh.geometry.boundingSphere.radius;
  }
  // Method 4: Use default radius based on planet type
  else {
    const defaultRadii = {
      venus: 120,    // 0.8 * 150
      mars: 75,      // 0.5 * 150
      jupiter: 1695, // 11.3 * 150
      saturn: 1380,  // 9.2 * 150
      uranus: 609,   // 4.06 * 150
      neptune: 588   // 3.92 * 150
    };
    planetRadius = defaultRadii[planetType] || 100;
    console.warn(`Using default radius for ${planetType}: ${planetRadius}`);
  }
  
  if (!planetRadius || planetRadius <= 0) {
    console.warn(`Could not determine valid radius for planet: ${planetType}`);
    return null;
  }

  // Create glow geometry - slightly larger than the planet
  const glowRadius = planetRadius * config.scale;
  const glowGeometry = new SphereGeometry(glowRadius, 32, 32);

  // Create glow material with atmospheric color
  const glowMaterial = new MeshBasicMaterial({
    color: new Color(config.color),
    transparent: true,
    opacity: config.opacity,
    blending: AdditiveBlending,
    side: 2, // DoubleSide
    depthWrite: false // Prevent depth issues
  });

  // Create the glow mesh
  const glowMesh = new Mesh(glowGeometry, glowMaterial);
  glowMesh.name = `${planetType}_atmospheric_glow`;
  
  // Store glow configuration for reference
  glowMesh.userData = {
    isPlanetaryGlow: true,
    planetType: planetType,
    glowConfig: config
  };

  // Position the glow at the same location as the planet
  glowMesh.position.copy(planetMesh.position);
  
  // If planet is part of a group, add glow to the same parent
  if (planetMesh.parent) {
    planetMesh.parent.add(glowMesh);
  } else {
    scene.add(glowMesh);
  }

  console.log(`Created atmospheric glow for ${planetType}: ${config.description}`);
  return glowMesh;
};

// Create atmospheric glow with animated pulsing effect
export const createAnimatedAtmosphericGlow = (planetMesh, planetType, scene) => {
  const glowMesh = createAtmosphericGlow(planetMesh, planetType, scene);
  
  if (!glowMesh) return null;

  // Add pulsing animation data
  glowMesh.userData.animationData = {
    baseOpacity: glowMesh.material.opacity,
    pulseSpeed: 0.001 + Math.random() * 0.002, // Random pulse speed
    pulseIntensity: 0.3 + Math.random() * 0.4, // Random pulse intensity
    startTime: Date.now()
  };

  return glowMesh;
};

// Update animated atmospheric glow effects
export const updateAtmosphericGlowAnimation = (glowMesh) => {
  if (!glowMesh || !glowMesh.userData.animationData) return;

  const animData = glowMesh.userData.animationData;
  const time = Date.now() - animData.startTime;
  
  // Create subtle pulsing effect
  const pulse = Math.sin(time * animData.pulseSpeed) * animData.pulseIntensity;
  const currentOpacity = animData.baseOpacity + (pulse * animData.baseOpacity * 0.3);
  
  glowMesh.material.opacity = Math.max(0.1, currentOpacity);
  
  // Subtle scale pulsing for breathing effect
  const scalePulse = 1 + (pulse * 0.02);
  glowMesh.scale.set(scalePulse, scalePulse, scalePulse);
};

// Add atmospheric glow to all planets with atmospheres
export const addAtmosphericGlowToAllPlanets = (scene, planetReferences) => {
  const glowMeshes = [];
  
  // Iterate through planets and add glow to those with atmospheres
  Object.entries(planetReferences).forEach(([planetName, planetMesh]) => {
    if (planetMesh && ATMOSPHERIC_GLOW_CONFIG[planetName]) {
      const glowMesh = createAnimatedAtmosphericGlow(planetMesh, planetName, scene);
      if (glowMesh) {
        glowMeshes.push(glowMesh);
      }
    }
  });

  console.log(`Created atmospheric glow effects for ${glowMeshes.length} planets`);
  return glowMeshes;
};

// Remove all atmospheric glow effects
export const removeAllAtmosphericGlow = (scene) => {
  const glowMeshes = [];
  
  scene.traverse((object) => {
    if (object.userData && object.userData.isPlanetaryGlow) {
      glowMeshes.push(object);
    }
  });

  glowMeshes.forEach(glowMesh => {
    if (glowMesh.parent) {
      glowMesh.parent.remove(glowMesh);
    } else {
      scene.remove(glowMesh);
    }
    glowMesh.geometry.dispose();
    glowMesh.material.dispose();
  });

  console.log(`Removed ${glowMeshes.length} atmospheric glow effects`);
};

// Update all atmospheric glow animations in the scene
export const updateAllAtmosphericGlowAnimations = (scene) => {
  scene.traverse((object) => {
    if (object.userData && object.userData.isPlanetaryGlow && object.userData.animationData) {
      updateAtmosphericGlowAnimation(object);
    }
  });
};

// Get atmospheric information for a planet
export const getAtmosphericInfo = (planetType) => {
  const config = ATMOSPHERIC_GLOW_CONFIG[planetType];
  return config ? config.description : "No atmospheric data available";
};
