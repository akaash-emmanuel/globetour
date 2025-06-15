/**
 * CometSystem.js - Dynamic comet visualization with particle tails
 * 
 * Adds realistic comets with procedural particle trails that orbit through
 * the solar system, creating beautiful visual effects.
 */

import { 
  SphereGeometry, 
  MeshBasicMaterial, 
  Mesh, 
  BufferGeometry, 
  Points, 
  PointsMaterial,
  Float32BufferAttribute,
  AdditiveBlending,
  Vector3,
  Color
} from 'three';

// Comet data - real comets with approximate orbital characteristics
const COMET_DATA = [
  {
    name: "Halley's Comet",
    color: 0x88ccff,
    coreSize: 0.5,
    tailLength: 200,
    orbitRadius: 150,
    orbitSpeed: 0.001,
    eccentricity: 0.97,
    initialAngle: 0
  },
  {
    name: "Comet NEOWISE",
    color: 0xffaa44,
    coreSize: 0.3,
    tailLength: 150,
    orbitRadius: 120,
    orbitSpeed: 0.0015,
    eccentricity: 0.99,
    initialAngle: Math.PI / 3
  },
  {
    name: "Comet Hale-Bopp",
    color: 0x66ff88,
    coreSize: 0.4,
    tailLength: 180,
    orbitRadius: 200,
    orbitSpeed: 0.0008,
    eccentricity: 0.95,
    initialAngle: Math.PI * 2 / 3
  }
];

let comets = [];
let animationFrameId = null;

export const createCometSystem = (scene, sunPosition) => {
  console.log("Creating comet system with particle tails");
  
  // Clear any existing comets
  clearCometSystem(scene);
  
  comets = [];
  
  COMET_DATA.forEach((cometData, index) => {
    const comet = createComet(cometData, sunPosition, index);
    comets.push(comet);
    scene.add(comet.group);
  });
  
  // Start the animation loop
  animateComets(sunPosition);
  
  return comets;
};

const createComet = (data, sunPosition, index) => {
  const cometGroup = new THREE.Group();
  
  // Create comet nucleus
  const nucleusGeometry = new SphereGeometry(data.coreSize, 12, 12);
  const nucleusMaterial = new MeshBasicMaterial({ 
    color: data.color,
    emissive: data.color,
    emissiveIntensity: 0.3
  });
  const nucleus = new Mesh(nucleusGeometry, nucleusMaterial);
  cometGroup.add(nucleus);
  
  // Create particle tail
  const tailParticles = createParticleTail(data);
  cometGroup.add(tailParticles);
  
  // Create dust trail (secondary tail)
  const dustTrail = createDustTrail(data);
  cometGroup.add(dustTrail);
  
  // Set initial position
  const angle = data.initialAngle;
  const distance = data.orbitRadius * (1 - data.eccentricity * Math.cos(angle));
  const x = sunPosition.x + distance * Math.cos(angle);
  const z = sunPosition.z + distance * Math.sin(angle);
  const y = sunPosition.y + (Math.sin(angle * 2) * 10); // Add some vertical variation
  
  cometGroup.position.set(x, y, z);
  
  return {
    group: cometGroup,
    nucleus: nucleus,
    tail: tailParticles,
    dustTrail: dustTrail,
    data: data,
    angle: angle,
    tailPositions: []
  };
};

const createParticleTail = (data) => {
  const particleCount = data.tailLength;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  
  const baseColor = new Color(data.color);
  
  for (let i = 0; i < particleCount; i++) {
    // Initialize particles at origin (will be updated in animation)
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
    
    // Color gradient from bright to transparent
    const intensity = 1 - (i / particleCount);
    colors[i * 3] = baseColor.r * intensity;
    colors[i * 3 + 1] = baseColor.g * intensity;
    colors[i * 3 + 2] = baseColor.b * intensity;
    
    // Size varies along the tail
    sizes[i] = (1 - i / particleCount) * 2 + 0.5;
  }
  
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));
  
  const material = new PointsMaterial({
    size: 1,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
    blending: AdditiveBlending,
    vertexColors: true
  });
  
  return new Points(geometry, material);
};

const createDustTrail = (data) => {
  const particleCount = Math.floor(data.tailLength * 0.6);
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  
  const dustColor = new Color(0xffffff);
  
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;
    
    const intensity = (1 - (i / particleCount)) * 0.3;
    colors[i * 3] = dustColor.r * intensity;
    colors[i * 3 + 1] = dustColor.g * intensity;
    colors[i * 3 + 2] = dustColor.b * intensity;
  }
  
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  
  const material = new PointsMaterial({
    size: 0.5,
    transparent: true,
    opacity: 0.4,
    blending: AdditiveBlending,
    vertexColors: true
  });
  
  return new Points(geometry, material);
};

const animateComets = (sunPosition) => {
  if (comets.length === 0) return;
  
  comets.forEach(comet => {
    // Update orbital position
    comet.angle += comet.data.orbitSpeed;
    
    // Calculate elliptical orbit position
    const distance = comet.data.orbitRadius * (1 - comet.data.eccentricity * Math.cos(comet.angle));
    const x = sunPosition.x + distance * Math.cos(comet.angle);
    const z = sunPosition.z + distance * Math.sin(comet.angle);
    const y = sunPosition.y + (Math.sin(comet.angle * 2) * 10);
    
    const newPosition = new Vector3(x, y, z);
    comet.group.position.copy(newPosition);
    
    // Update tail positions
    comet.tailPositions.unshift(newPosition.clone());
    if (comet.tailPositions.length > comet.data.tailLength) {
      comet.tailPositions.pop();
    }
    
    // Update tail particles
    updateTailParticles(comet, sunPosition);
    
    // Make comet face away from sun (ion tail effect)
    const sunDirection = new Vector3().subVectors(sunPosition, newPosition).normalize();
    comet.tail.lookAt(sunDirection.multiplyScalar(-100).add(newPosition));
  });
  
  animationFrameId = requestAnimationFrame(() => animateComets(sunPosition));
};

const updateTailParticles = (comet, sunPosition) => {
  const positions = comet.tail.geometry.attributes.position.array;
  const dustPositions = comet.dustTrail.geometry.attributes.position.array;
  
  // Direction away from sun
  const sunDirection = new Vector3().subVectors(sunPosition, comet.group.position).normalize();
  const tailDirection = sunDirection.multiplyScalar(-1);
  
  // Update main tail particles
  for (let i = 0; i < positions.length / 3; i++) {
    if (i < comet.tailPositions.length) {
      const basePos = comet.tailPositions[i];
      const offset = tailDirection.clone().multiplyScalar(i * 2);
      const randomOffset = new Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3
      );
      
      const finalPos = basePos.clone().add(offset).add(randomOffset);
      
      positions[i * 3] = finalPos.x;
      positions[i * 3 + 1] = finalPos.y;
      positions[i * 3 + 2] = finalPos.z;
    }
  }
  
  // Update dust trail (slightly different direction)
  const dustDirection = tailDirection.clone().applyAxisAngle(new Vector3(0, 1, 0), Math.PI / 12);
  
  for (let i = 0; i < dustPositions.length / 3; i++) {
    if (i < comet.tailPositions.length) {
      const basePos = comet.tailPositions[i];
      const offset = dustDirection.clone().multiplyScalar(i * 1.5);
      const randomOffset = new Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 5
      );
      
      const finalPos = basePos.clone().add(offset).add(randomOffset);
      
      dustPositions[i * 3] = finalPos.x;
      dustPositions[i * 3 + 1] = finalPos.y;
      dustPositions[i * 3 + 2] = finalPos.z;
    }
  }
  
  comet.tail.geometry.attributes.position.needsUpdate = true;
  comet.dustTrail.geometry.attributes.position.needsUpdate = true;
};

export const clearCometSystem = (scene) => {
  // Cancel animation loop
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  // Remove all comet objects from scene
  comets.forEach(comet => {
    scene.remove(comet.group);
    
    // Dispose of geometries and materials
    comet.nucleus.geometry.dispose();
    comet.nucleus.material.dispose();
    comet.tail.geometry.dispose();
    comet.tail.material.dispose();
    comet.dustTrail.geometry.dispose();
    comet.dustTrail.material.dispose();
  });
  
  comets = [];
  console.log("Comet system cleared");
};

export const toggleCometVisibility = (visible) => {
  comets.forEach(comet => {
    comet.group.visible = visible;
  });
};

export const getCometInfo = () => {
  return comets.map(comet => ({
    name: comet.data.name,
    position: comet.group.position.clone(),
    distanceFromSun: comet.group.position.distanceTo(new Vector3(0, 0, 0)),
    orbitalPhase: comet.angle
  }));
};
