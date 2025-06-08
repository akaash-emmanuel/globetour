import { 
  SphereGeometry, 
  MeshBasicMaterial,
  MeshPhongMaterial,
  Mesh, 
  Object3D,
  Vector3,
  Color,
  DoubleSide,
  BufferGeometry,
  LineBasicMaterial,
  LineLoop
} from 'three';

// Import the asteroid belt constants from Sun.js
import { 
  ASTEROID_BELT_INNER_RADIUS, 
  ASTEROID_BELT_OUTER_RADIUS, 
  ASTEROID_BELT_THICKNESS, 
  ASTEROID_BELT_COUNT 
} from './Sun.js';

// Create and add the asteroid belt to the scene
export const createAsteroidBelt = (scene, sun) => {
  if (!scene || !sun) {
    console.error('Cannot create asteroid belt without scene and sun references');
    return null;
  }

  // Create a container for all asteroids
  const asteroidBelt = new Object3D();
  asteroidBelt.name = 'asteroidBelt';
  
  // Create individual asteroids
  for (let i = 0; i < ASTEROID_BELT_COUNT; i++) {
    // Randomize size (smaller asteroids are more common)
    const asteroidSize = Math.random() * 15 + 5; // 5-20 size range
    
    // Use simplified low-poly geometry for performance
    const asteroidGeometry = new SphereGeometry(asteroidSize, 4, 4);
    
    // Asteroid coloration with some variation
    const grayValue = Math.random() * 0.2 + 0.3; // 0.3-0.5 gray range
    const asteroidMaterial = new MeshPhongMaterial({
      color: new Color(grayValue, grayValue, grayValue),
      flatShading: true,
      shininess: 0
    });
    
    const asteroid = new Mesh(asteroidGeometry, asteroidMaterial);
    
    // Position each asteroid randomly within the belt's bounds
    const radius = ASTEROID_BELT_INNER_RADIUS + Math.random() * (ASTEROID_BELT_OUTER_RADIUS - ASTEROID_BELT_INNER_RADIUS);
    const angle = Math.random() * Math.PI * 2;
    const height = (Math.random() * 2 - 1) * ASTEROID_BELT_THICKNESS;
    
    // Calculate position
    const x = -Math.cos(angle) * radius;
    const y = height;
    const z = Math.sin(angle) * radius;
    
    asteroid.position.set(x, y, z);
    
    // Randomize rotation
    asteroid.rotation.x = Math.random() * Math.PI;
    asteroid.rotation.y = Math.random() * Math.PI;
    asteroid.rotation.z = Math.random() * Math.PI;
    
    // Add some initial rotation speed for animation
    asteroid.userData = {
      rotationSpeed: {
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.01
      },
      orbitalSpeed: Math.random() * 0.0002 + 0.0001,
      orbitalAngle: angle
    };
    
    // Add asteroid to belt
    asteroidBelt.add(asteroid);
  }

  // Position belt relative to sun
  asteroidBelt.position.copy(sun.position);
  
  // Add metadata
  asteroidBelt.userData = {
    isAsteroidBelt: true,
    visible: true
  };
  
  // Add the entire belt object to the scene
  scene.add(asteroidBelt);
  console.log("Asteroid belt created with", ASTEROID_BELT_COUNT, "asteroids");
  
  return asteroidBelt;
};

// Update asteroid positions to simulate rotation and orbit
export const updateAsteroidBelt = (asteroidBelt, deltaTime) => {
  if (!asteroidBelt) return;
  
  asteroidBelt.children.forEach(child => {
    // Update asteroid rotation
    if (child.userData && child.userData.rotationSpeed) {
      child.rotation.x += child.userData.rotationSpeed.x;
      child.rotation.y += child.userData.rotationSpeed.y;
      child.rotation.z += child.userData.rotationSpeed.z;
    }
    
    // Update asteroid orbital position
    if (child.userData && child.userData.orbitalSpeed) {
      // Update the orbital angle
      child.userData.orbitalAngle += child.userData.orbitalSpeed * (deltaTime || 0.016);
      const angle = child.userData.orbitalAngle;
      
      // Calculate the distance from the center (keep y/height the same)
      const radius = Math.sqrt(child.position.x * child.position.x + child.position.z * child.position.z);
      
      // Update position based on angle
      child.position.x = -Math.cos(angle) * radius;
      child.position.z = Math.sin(angle) * radius;
    }
  });
};

// Toggle asteroid belt visibility
export const toggleAsteroidBeltVisibility = (asteroidBelt) => {
  if (asteroidBelt) {
    const newVisibility = !asteroidBelt.visible;
    asteroidBelt.visible = newVisibility;
    asteroidBelt.userData.visible = newVisibility;
    return newVisibility;
  }
  return false;
};

// Clean up asteroid belt
export const removeAsteroidBelt = (scene, asteroidBelt) => {
  if (asteroidBelt && scene) {
    console.log("Removing asteroid belt");
    scene.remove(asteroidBelt);
  }
};