import { 
  SphereGeometry, 
  MeshBasicMaterial, 
  Mesh, 
  TextureLoader, 
  BackSide,
  BufferGeometry,
  Points,
  PointsMaterial,
  Float32BufferAttribute,
  Vector3,
  Color,
  AdditiveBlending,
  Group
} from 'three';

// Constants for space background
const UNIVERSE_RADIUS = 100000; // Very large radius for the skybox
const STAR_DISTANCE_MIN = 60000; // Minimum distance for stars from origin (farther than max camera distance)
const STAR_DISTANCE_MAX = 95000; // Maximum distance for stars from origin (within universe radius)
const STAR_COUNT = 12000; // Number of stars
const GALAXY_COUNT = 22; // Increased from 18 to 22 for more visual interest
const NEBULA_COUNT = 10; // Increased from 8 to 10
const DUST_PARTICLE_COUNT = 30000; // Increased number of dust particles
const INTERSTELLAR_PARTICLE_COUNT = 15000; // Number of subtle interstellar particles
const GALAXY_MIN_DISTANCE = UNIVERSE_RADIUS * 0.45; // Increased minimum distance between galaxies

// Create a complete space background with stars, galaxies, and nebulae
export const createSpaceBackground = (scene, sunPosition) => {
  // Create container for all space objects
  const spaceBackground = new Group();
  spaceBackground.name = 'spaceBackground';
  
  // Add distant stars
  addStars(spaceBackground);
  
  // Add galaxies
  addGalaxies(spaceBackground);
  
  // Add nebulae
  addNebulae(spaceBackground);
  
  // Add subtle interstellar particles (creates depth)
  addInterstellarParticles(spaceBackground);
  
  // Add cosmic dust
  addCosmicDust(spaceBackground);
  
  // Add the entire space background to the scene
  scene.add(spaceBackground);
  
  // Add light scattering effects for sun and bright stars if sun position is provided
  if (sunPosition) {
    addLightScatteringEffects(scene, null, sunPosition);
  }
  
  return spaceBackground;
};

// Create a skybox for space background
export const createSpaceSkybox = (scene) => {
  // Create a very large sphere to serve as the skybox
  const skyboxGeometry = new SphereGeometry(UNIVERSE_RADIUS * 0.98, 64, 64);
  
  // Create a material with a dark space color, applied to the inside of the sphere
  const skyboxMaterial = new MeshBasicMaterial({
    color: 0x000510, // Very dark blue, almost black
    side: BackSide, // Apply to the inside of the sphere
    transparent: true,
    opacity: 0.8 // Slight transparency to blend with stars
  });
  
  // Create the skybox mesh
  const skybox = new Mesh(skyboxGeometry, skyboxMaterial);
  skybox.name = 'spaceSkybox';
  
  // Add it to the scene
  scene.add(skybox);
  
  return skybox;
};

// Add thousands of stars with different colors and sizes
const addStars = (container) => {
  // Star distribution parameters - all far away from the center to create distant backdrop
  const starClusters = [
    // Distribute stars around the periphery, not at the center
    { center: new Vector3(0, 0, 0), radius: STAR_DISTANCE_MAX - STAR_DISTANCE_MIN, minDistance: STAR_DISTANCE_MIN, density: 0.3 },
    { center: new Vector3(-UNIVERSE_RADIUS * 0.5, UNIVERSE_RADIUS * 0.3, UNIVERSE_RADIUS * 0.2), radius: UNIVERSE_RADIUS * 0.4, minDistance: STAR_DISTANCE_MIN, density: 0.15 },
    { center: new Vector3(UNIVERSE_RADIUS * 0.6, -UNIVERSE_RADIUS * 0.2, UNIVERSE_RADIUS * 0.4), radius: UNIVERSE_RADIUS * 0.3, minDistance: STAR_DISTANCE_MIN, density: 0.15 },
    { center: new Vector3(-UNIVERSE_RADIUS * 0.3, -UNIVERSE_RADIUS * 0.5, UNIVERSE_RADIUS * 0.1), radius: UNIVERSE_RADIUS * 0.3, minDistance: STAR_DISTANCE_MIN, density: 0.1 },
    { center: new Vector3(UNIVERSE_RADIUS * 0.2, UNIVERSE_RADIUS * 0.4, -UNIVERSE_RADIUS * 0.5), radius: UNIVERSE_RADIUS * 0.2, minDistance: STAR_DISTANCE_MIN, density: 0.1 },
    { center: new Vector3(0, 0, -UNIVERSE_RADIUS * 0.7), radius: UNIVERSE_RADIUS * 0.4, minDistance: STAR_DISTANCE_MIN, density: 0.2 }
  ];

  // Different star colors with enhanced brightness for better visibility
  const starColors = [
    { color: 0xffddbb, probability: 0.05 },  // Orange/Red (K/M type) - brightened
    { color: 0xffffff, probability: 0.3 },   // Yellow-White (F/G type) - brightened
    { color: 0xffffff, probability: 0.4 },   // White (A type)
    { color: 0xccddff, probability: 0.15 },  // Blue-White (B type) - brightened
    { color: 0xaaccff, probability: 0.06 },  // Blue (O type) - brightened
    { color: 0xffaaaa, probability: 0.04 }   // Red (M type) - brightened
  ];

  // Create stars geometry
  const vertices = [];
  const colors = [];
  const sizes = [];

  for (let i = 0; i < STAR_COUNT; i++) {
    // Select a random cluster based on density
    const cluster = starClusters[Math.floor(Math.random() * starClusters.length)];
    
    // Generate position within cluster - ensuring a minimum distance
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    // Calculate radius to ensure stars are beyond the minimum distance
    // Map random value from [0,1] to [min,max] distance range
    const minDistance = cluster.minDistance || STAR_DISTANCE_MIN;
    const radiusRange = cluster.radius;
    const radius = minDistance + (radiusRange * Math.cbrt(Math.random())); // Cube root for more uniform volume distribution
    
    const x = cluster.center.x + radius * Math.sin(phi) * Math.cos(theta);
    const y = cluster.center.y + radius * Math.sin(phi) * Math.sin(theta);
    const z = cluster.center.z + radius * Math.cos(phi);
    
    vertices.push(x, y, z);

    // Select color based on probability
    let rand = Math.random();
    let colorValue = 0xffffff; // Default white
    let probabilitySum = 0;
    
    for (const starType of starColors) {
      probabilitySum += starType.probability;
      if (rand <= probabilitySum) {
        colorValue = starType.color;
        break;
      }
    }
    
    const color = new Color(colorValue);
    colors.push(color.r, color.g, color.b);
    
    // Size variation - making stars more visible
    const sizeFactor = Math.random();
    const size = sizeFactor * sizeFactor * 8 + 1.5; // Increased base size and scale
    sizes.push(size);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));
  
  const material = new PointsMaterial({
    size: 4.5,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    blending: AdditiveBlending,
    opacity: 0.9
  });
  
  const stars = new Points(geometry, material);
  stars.name = 'stars';
  container.add(stars);
};

// Add realistic-looking galaxies
const addGalaxies = (container) => {
  // Create predefined galaxy positions to ensure good distribution
  const galaxyPositions = [];
  
  // Generate well-distributed positions for galaxies with better spacing
  for (let i = 0; i < GALAXY_COUNT; i++) {
    let position;
    let tooClose;
    let attempts = 0;
    
    // Try to find a position that's significantly spread out from other galaxies
    do {
      attempts++;
      tooClose = false;
      
      // Distribute galaxies more evenly across universe quadrants
      // Divide the universe into regions and ensure each has galaxies
      const regionIndex = Math.floor(i / (GALAXY_COUNT / 8));
      const regionX = (regionIndex % 2) ? 1 : -1;
      const regionY = (Math.floor(regionIndex / 2) % 2) ? 1 : -1;
      const regionZ = (Math.floor(regionIndex / 4) % 2) ? 1 : -1;
      
      // Add some randomness within the region
      const distance = STAR_DISTANCE_MIN + (UNIVERSE_RADIUS - STAR_DISTANCE_MIN) * (0.7 + 0.3 * Math.random());
      const theta = (Math.PI/2) * regionX * (0.5 + 0.5 * Math.random());
      const phi = (Math.PI/2) * regionY * (0.5 + 0.5 * Math.random()) + Math.PI/2;
      const radiusFactor = regionZ * (0.5 + 0.5 * Math.random());
      
      position = new Vector3(
        distance * Math.sin(phi) * Math.cos(theta) * radiusFactor,
        distance * Math.sin(phi) * Math.sin(theta) * radiusFactor,
        distance * Math.cos(phi) * radiusFactor
      );
      
      // Check if this position is too close to any existing galaxy
      // Using larger minimum distance for better spread
      for (const existingPos of galaxyPositions) {
        if (position.distanceTo(existingPos) < GALAXY_MIN_DISTANCE) {
          tooClose = true;
          break;
        }
      }
    } while (tooClose && attempts < 50);
    
    // If we couldn't find a good position after 50 attempts, just place it somewhere
    // but make sure it's far from the center
    if (attempts >= 50) {
      const distance = STAR_DISTANCE_MIN + (UNIVERSE_RADIUS - STAR_DISTANCE_MIN) * 0.95;
      const theta = 2 * Math.PI * i / GALAXY_COUNT;
      const phi = Math.PI * (0.2 + 0.6 * Math.random()); // Avoid exact poles
      
      position = new Vector3(
        distance * Math.sin(phi) * Math.cos(theta),
        distance * Math.sin(phi) * Math.sin(theta),
        distance * Math.cos(phi)
      );
    }
    
    galaxyPositions.push(position);
  }
  
  // Create each galaxy at its position
  for (let i = 0; i < galaxyPositions.length; i++) {
    const position = galaxyPositions[i];
    
    // Galaxy parameters - more variety in size and arms
    // More realistic types: spiral, barred spiral, elliptical
    const galaxyType = Math.floor(Math.random() * 3); // 0: spiral, 1: barred spiral, 2: elliptical
    const particleCount = 4000 + Math.floor(Math.random() * 6000);
    
    // Galaxy size depends on type
    let galaxySize;
    let spiralArms;
    let spiralTightness;
    
    if (galaxyType === 2) { // Elliptical
      galaxySize = 3000 + Math.random() * 12000;
      spiralArms = 0;
      spiralTightness = 0;
    } else if (galaxyType === 1) { // Barred spiral
      galaxySize = 4000 + Math.random() * 10000;
      spiralArms = 2 + Math.floor(Math.random() * 2) * 2; // 2 or 4 arms
      spiralTightness = 1.5 + Math.random() * 2.5;
    } else { // Regular spiral
      galaxySize = 3000 + Math.random() * 8000;
      spiralArms = 2 + Math.floor(Math.random() * 3) * 2; // 2, 4, or 6 arms
      spiralTightness = 2 + Math.random() * 4;
    }
    
    // Create galaxy geometry with central black hole
    const vertices = [];
    const colors = [];
    const sizes = [];
    
    // Black hole size adjusted to galaxy type and size
    const blackHoleSize = galaxyType === 2 ? galaxySize * 0.05 : galaxySize * 0.04;
    const accretionDiskSize = blackHoleSize * 2.2;
    const blackHoleParticleCount = 500 + Math.floor(Math.random() * 300);
    
    // More realistic galaxy colors based on type
    let galaxyHue, coreSaturation, coreLightness;
    
    if (galaxyType === 2) { // Elliptical - yellowish/reddish
      galaxyHue = 0.05 + Math.random() * 0.1; // Yellowish to reddish
      coreSaturation = 0.2 + Math.random() * 0.1;
      coreLightness = 0.7 + Math.random() * 0.1;
    } else if (galaxyType === 1) { // Barred spiral - often blueish/whiteish
      galaxyHue = 0.55 + Math.random() * 0.1; // Blueish
      coreSaturation = 0.3 + Math.random() * 0.2;
      coreLightness = 0.75 + Math.random() * 0.15;
    } else { // Regular spiral - varied colors
      galaxyHue = Math.random(); // Any hue
      coreSaturation = 0.2 + Math.random() * 0.3;
      coreLightness = 0.7 + Math.random() * 0.2;
    }
    
    const coreColor = new Color().setHSL(galaxyHue, coreSaturation, coreLightness);
    const armColor = new Color().setHSL((galaxyHue + 0.05) % 1, coreSaturation + 0.3, coreLightness - 0.1);
    const edgeColor = new Color().setHSL((galaxyHue + 0.1) % 1, coreSaturation + 0.5, coreLightness - 0.2);
    const accretionDiskColor = new Color().setHSL((galaxyHue + 0.3) % 1, 0.8, 0.5);
    
    // Create rotation matrix to give galaxy a random orientation
    const galaxyRotationX = Math.random() * Math.PI * 2;
    const galaxyRotationY = Math.random() * Math.PI * 2;
    const galaxyRotationZ = Math.random() * Math.PI * 2;
    
    for (let j = 0; j < particleCount; j++) {
      let x, y, z;
      let distFromCenter;
      
      if (galaxyType === 2) {
        // Elliptical galaxy - 3D ellipsoid distribution
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        
        // Random point within ellipsoid
        const axes = [1.0, 0.8 + Math.random() * 0.4, 0.6 + Math.random() * 0.3]; // x, y, z axes of ellipsoid
        distFromCenter = Math.pow(Math.random(), 0.5); // More particles toward the edge
        
        x = distFromCenter * axes[0] * galaxySize * Math.sin(phi) * Math.cos(theta);
        y = distFromCenter * axes[1] * galaxySize * Math.sin(phi) * Math.sin(theta);
        z = distFromCenter * axes[2] * galaxySize * Math.cos(phi);
      } else {
        // Spiral galaxies
        // Distance from center, normalized to [0, 1]
        distFromCenter = Math.pow(Math.random(), 0.5); // Square root for more particles in outer rings
        
        // Determine if the particle is in the central bulge/bar or in an arm
        const isCentralBulge = Math.random() < 0.15 || distFromCenter < 0.2;
        
        if (isCentralBulge) {
          // Central bulge/bar - ellipsoidal distribution
          const bulgeSize = galaxySize * 0.2;
          const u = Math.random();
          const v = Math.random();
          const theta = 2 * Math.PI * u;
          const phi = Math.acos(2 * v - 1);
          
          if (galaxyType === 1) { // Barred spiral - elongated bar
            const barLength = galaxySize * 0.5;
            const barWidth = galaxySize * 0.1;
            const barHeight = galaxySize * 0.05;
            
            x = (Math.random() - 0.5) * barLength;
            y = (Math.random() - 0.5) * barWidth;
            z = (Math.random() - 0.5) * barHeight;
          } else { // Regular spiral - spheroidal bulge
            x = bulgeSize * Math.sin(phi) * Math.cos(theta);
            y = bulgeSize * Math.sin(phi) * Math.sin(theta);
            z = bulgeSize * Math.cos(phi) * 0.6; // Slightly flattened
          }
        } else {
          // Spiral arms
          const scaledDist = distFromCenter * galaxySize;
          
          // Angle based on distance and spiral arm number
          const baseAngle = Math.random() * Math.PI * 2;
          const armOffset = (j % spiralArms) * (Math.PI * 2 / spiralArms);
          const spiralAngle = baseAngle + armOffset + distFromCenter * spiralTightness;
          
          // More accurate logarithmic spiral formula
          const armWidth = 0.1 + 0.2 * distFromCenter; // Arms get wider further out
          const inArm = Math.random() < 0.7; // 70% chance to be in arm vs between arms
          
          // Position with better arm definition
          const radialJitter = inArm ? 
                           (armWidth * (Math.random() - 0.5)) * scaledDist : 
                           (0.3 + Math.random() * 0.5) * scaledDist; // Larger jitter for inter-arm particles
          
          x = Math.cos(spiralAngle) * (scaledDist + radialJitter);
          y = Math.sin(spiralAngle) * (scaledDist + radialJitter);
          
          // Z-position determines galaxy thickness (thinner in center, thicker on edges)
          const thickness = 30 + distFromCenter * distFromCenter * 200;
          z = (Math.random() - 0.5) * thickness;
        }
      }
      
      // Apply galaxy rotation and offset
      // Simple rotation for demo purposes - ideally would use a proper rotation matrix
      const rx = x * Math.cos(galaxyRotationZ) - y * Math.sin(galaxyRotationZ);
      const ry = x * Math.sin(galaxyRotationZ) + y * Math.cos(galaxyRotationZ);
      const rz = z;
      
      // Add to position
      x = position.x + rx;
      y = position.y + ry;
      z = position.z + rz;
      
      vertices.push(x, y, z);
      
      // More sophisticated color gradation
      const color = new Color();
      
      if (galaxyType === 2) { // Elliptical galaxy
        // Smooth central brightness
        const brightness = Math.max(0, 1.0 - distFromCenter * distFromCenter);
        color.copy(coreColor).multiplyScalar(brightness);
      } else {
        // Spiral galaxies have more structured color patterns
        const isCentralBulge = distFromCenter < 0.2;
        const isInArm = (j % spiralArms) === 0 || (j % spiralArms) === 1; // First two particles of each spiral count
        
        if (isCentralBulge) {
          // Galaxy core - bright and saturated
          color.copy(coreColor);
          
          // Add bright core flare to some galaxies
          if (Math.random() < 0.7 && distFromCenter < 0.05) {
            color.multiplyScalar(1.5); // Extra brightness for the very center
          }
        } else if (isInArm && distFromCenter < 0.7) {
          // Galaxy arms - blend from core to edge color with star formation regions
          const blend = (distFromCenter - 0.2) / 0.5;
          color.copy(coreColor).lerp(armColor, blend);
          
          // Occasional bright star formation regions in arms
          if (Math.random() < 0.15) {
            // Young blue stars in arms
            color.setHSL(0.6, 0.8, 0.8); // Bright blue
          }
        } else if (distFromCenter < 0.85) {
          // Galaxy disc - blend from core to edge color
          const blend = (distFromCenter - 0.2) / 0.65;
          color.copy(coreColor).lerp(armColor, blend * 0.7);
          color.multiplyScalar(0.8); // Slightly dimmer than arms
        } else {
          // Galaxy edge - fading out
          const blend = (distFromCenter - 0.85) / 0.15;
          color.copy(armColor).lerp(edgeColor, blend);
          color.multiplyScalar(0.6); // Dimmer at edges
        }
      }
      
      colors.push(color.r, color.g, color.b);
      
      // Size variation - brightest in the center with some random bright stars
      let starSize;
      
      if (Math.random() < 0.01) {
        // Occasional bright star or star cluster
        starSize = 2.0 + Math.random() * 2.0;
      } else if (distFromCenter < 0.2) {
        // Core stars - brighter and denser
        starSize = 0.8 + Math.random() * 1.5;
      } else {
        // Normal stars - size decreases toward edges
        const sizeFactor = Math.max(0.2, 1.0 - Math.pow(distFromCenter, 0.5));
        starSize = 0.3 + sizeFactor * 1.2;
      }
      
      sizes.push(starSize);
    }

    // Add central black hole and accretion disk particles around the center
    if (galaxyType !== 2) { // Only for spiral galaxies
      for (let j = 0; j < blackHoleParticleCount; j++) {
        const isBlackHole = j < blackHoleParticleCount * 0.3;
        const radius = isBlackHole ? 
          blackHoleSize * Math.random() : 
          blackHoleSize + (accretionDiskSize - blackHoleSize) * Math.random();
          
        const angle = Math.random() * Math.PI * 2;
        
        // Accretion disk is mostly flat on x-y plane
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = (Math.random() - 0.5) * blackHoleSize * 0.2; // Thin disk
        
        // Apply rotation to match galaxy orientation
        const rx = x * Math.cos(galaxyRotationZ) - y * Math.sin(galaxyRotationZ);
        const ry = x * Math.sin(galaxyRotationZ) + y * Math.cos(galaxyRotationZ);
        const rz = z;
        
        // Add to global position
        vertices.unshift(position.x + rx, position.y + ry, position.z + rz);
        
        // Black hole particles are darker with occasional bright spots (simulating high-energy emissions)
        if (isBlackHole) {
          const blackness = Math.random() < 0.9 ? 0.0 : 0.5; // Mostly black with some bright spots
          colors.unshift(blackness, blackness, blackness);
          sizes.unshift(1.0 + Math.random() * 2.0);
        } else {
          // Accretion disk with bright, energetic particles
          const brightness = 0.7 + Math.random() * 0.5;
          const color = new Color().copy(accretionDiskColor).multiplyScalar(brightness);
          colors.unshift(color.r, color.g, color.b);
          sizes.unshift(1.5 + Math.random() * 3.5); // Larger particles for brighter appearance
        }
      }
    }

    // Create galaxy geometry
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));
    
    // Improved material settings
    const material = new PointsMaterial({
      size: galaxyType === 2 ? 4 : 4.5, // Increased size for better visibility
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: AdditiveBlending
    });
    
    const galaxy = new Points(geometry, material);
    galaxy.name = `galaxy-${i}`;
    
    // Scale the galaxy to make it appear larger
    const scaleFactor = 1.2 + Math.random() * 0.3; // Random scale between 1.2 and 1.5
    galaxy.scale.set(scaleFactor, scaleFactor, scaleFactor);
    
    container.add(galaxy);
  }
};

// Add colorful nebulae
const addNebulae = (container) => {
  for (let i = 0; i < NEBULA_COUNT; i++) {
    // Position the nebula far away from the center
    const distance = STAR_DISTANCE_MIN + (UNIVERSE_RADIUS - STAR_DISTANCE_MIN) * 0.7 * Math.random();
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    const position = new Vector3(
      distance * Math.sin(phi) * Math.cos(theta),
      distance * Math.sin(phi) * Math.sin(theta),
      distance * Math.cos(phi)
    );
    
    // Nebula parameters
    const particleCount = 2000 + Math.floor(Math.random() * 3000);
    const nebulaSize = 3000 + Math.random() * 12000;
    const nebulaShape = Math.floor(Math.random() * 4); // 0=spherical, 1=disc, 2=irregular, 3=filament
    
    // Nebula color theme
    const nebulaType = Math.floor(Math.random() * 5);
    let primaryColor, secondaryColor;
    
    switch(nebulaType) {
      case 0: // Red emission nebula (hydrogen)
        primaryColor = new Color(0xff4444);
        secondaryColor = new Color(0xff9966);
        break;
      case 1: // Blue reflection nebula
        primaryColor = new Color(0x4466ff);
        secondaryColor = new Color(0x99ccff);
        break;
      case 2: // Green/blue (oxygen/hydrogen mix)
        primaryColor = new Color(0x22dd88);
        secondaryColor = new Color(0x66ffcc);
        break;
      case 3: // Purple/pink
        primaryColor = new Color(0xcc66ff);
        secondaryColor = new Color(0xff99cc);
        break;
      case 4: // Multi-color
        primaryColor = new Color(0x44aaff);
        secondaryColor = new Color(0xff7744);
        break;
    }
    
    // Create nebula geometry
    const vertices = [];
    const colors = [];
    const sizes = [];
    
    for (let j = 0; j < particleCount; j++) {
      let x, y, z;
      
      // Generate positions based on nebula shape
      switch(nebulaShape) {
        case 0: // Spherical nebula
          const radius = nebulaSize * Math.pow(Math.random(), 0.3); // Concentrated toward edges (shell)
          const nebTheta = Math.random() * Math.PI * 2;
          const nebPhi = Math.acos(2 * Math.random() - 1);
          
          x = position.x + radius * Math.sin(nebPhi) * Math.cos(nebTheta);
          y = position.y + radius * Math.sin(nebPhi) * Math.sin(nebTheta);
          z = position.z + radius * Math.cos(nebPhi);
          break;
          
        case 1: // Disc/ring nebula
          const discRadius = nebulaSize * (0.7 + 0.3 * Math.random());
          const discTheta = Math.random() * Math.PI * 2;
          
          x = position.x + discRadius * Math.cos(discTheta);
          y = position.y + discRadius * Math.sin(discTheta);
          z = position.z + (Math.random() - 0.5) * nebulaSize * 0.2;
          break;
          
        case 2: // Irregular nebula (cloud-like)
          x = position.x + (Math.random() - 0.5) * nebulaSize;
          y = position.y + (Math.random() - 0.5) * nebulaSize;
          z = position.z + (Math.random() - 0.5) * nebulaSize;
          
          // Apply fractal noise effect (simplified)
          const distFromCenter = Math.sqrt(x*x + y*y + z*z) / nebulaSize;
          if (distFromCenter > 0.7 && Math.random() > 0.3) {
            // Try again to create denser center
            j--;
            continue;
          }
          break;
          
        case 3: // Filament nebula (thread-like structures)
          const filamentCount = 5 + Math.floor(Math.random() * 5);
          const chosenFilament = Math.floor(Math.random() * filamentCount);
          const filamentAngle = (chosenFilament / filamentCount) * Math.PI * 2;
          const filamentRadius = nebulaSize * Math.random();
          const filamentZ = (Math.random() - 0.5) * nebulaSize;
          
          x = position.x + Math.cos(filamentAngle) * filamentRadius;
          y = position.y + Math.sin(filamentAngle) * filamentRadius;
          z = position.z + filamentZ;
          
          // Add some jitter to filaments
          x += (Math.random() - 0.5) * nebulaSize * 0.1;
          y += (Math.random() - 0.5) * nebulaSize * 0.1;
          break;
      }
      
      vertices.push(x, y, z);
      
      // Color mixing between primary and secondary colors
      const colorMix = Math.random();
      const color = new Color().copy(primaryColor).lerp(secondaryColor, colorMix);
      
      // Add some brightness variation
      const brightness = 0.7 + Math.random() * 0.3;
      color.multiplyScalar(brightness);
      
      colors.push(color.r, color.g, color.b);
      
      // Size variation - larger particles for better glow effect
      const size = 5 + Math.random() * 15;
      sizes.push(size);
    }
    
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));
    
    const material = new PointsMaterial({
      size: 10,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: AdditiveBlending
    });
    
    const nebula = new Points(geometry, material);
    nebula.name = `nebula-${i}`;
    container.add(nebula);
  }
};

// Add subtle interstellar medium particles
const addInterstellarParticles = (container) => {
  const vertices = [];
  const colors = [];
  const sizes = [];
  
  // Create interstellar particles with subtle colors and varied distribution
  for (let i = 0; i < INTERSTELLAR_PARTICLE_COUNT; i++) {
    // Create distributions between stars in certain regions
    const distance = STAR_DISTANCE_MIN * 0.7 + (UNIVERSE_RADIUS - STAR_DISTANCE_MIN) * 0.6 * Math.random();
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    const x = distance * Math.sin(phi) * Math.cos(theta);
    const y = distance * Math.sin(phi) * Math.sin(theta);
    const z = distance * Math.cos(phi);
    
    vertices.push(x, y, z);
    
    // Subtle blue/purple tints for interstellar medium
    const hue = 0.6 + Math.random() * 0.2; // Blue to purple range
    const saturation = 0.2 + Math.random() * 0.3;
    const lightness = 0.3 + Math.random() * 0.2;
    
    const color = new Color().setHSL(hue, saturation, lightness);
    colors.push(color.r, color.g, color.b);
    
    // Very small sizes for subtle effects
    const size = 0.5 + Math.random() * 1.0;
    sizes.push(size);
  }
  
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));
  
  const material = new PointsMaterial({
    size: 1.5,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.15,
    blending: AdditiveBlending
  });
  
  const interstellarParticles = new Points(geometry, material);
  interstellarParticles.name = 'interstellarParticles';
  container.add(interstellarParticles);
};

// Add enhanced cosmic dust particles with more realistic clouds
const addCosmicDust = (container) => {
  const vertices = [];
  const colors = [];
  const sizes = [];
  
  // Define dust cloud regions positioned far from the solar system
  // More varied and visually interesting dust clouds
  const dustClouds = [
    { 
      center: new Vector3(UNIVERSE_RADIUS * 0.2, UNIVERSE_RADIUS * 0.1, UNIVERSE_RADIUS * -0.3), 
      radius: UNIVERSE_RADIUS * 0.25, 
      minDistance: STAR_DISTANCE_MIN, 
      color: 0x885522, 
      density: 0.8,
      variation: 0.15,
      shape: 'spheroid'  // spheroid shaped cloud
    },
    { 
      center: new Vector3(-UNIVERSE_RADIUS * 0.3, UNIVERSE_RADIUS * 0.2, UNIVERSE_RADIUS * 0.1), 
      radius: UNIVERSE_RADIUS * 0.2, 
      minDistance: STAR_DISTANCE_MIN, 
      color: 0x774433,
      density: 0.6,
      variation: 0.2,
      shape: 'filament'  // filament shaped cloud
    },
    { 
      center: new Vector3(UNIVERSE_RADIUS * 0.1, -UNIVERSE_RADIUS * 0.4, UNIVERSE_RADIUS * 0.2), 
      radius: UNIVERSE_RADIUS * 0.3, 
      minDistance: STAR_DISTANCE_MIN, 
      color: 0x553344,
      density: 0.7,
      variation: 0.25,
      shape: 'irregular'  // irregular shaped cloud
    },
    {
      center: new Vector3(UNIVERSE_RADIUS * 0.4, UNIVERSE_RADIUS * 0.3, -UNIVERSE_RADIUS * 0.1),
      radius: UNIVERSE_RADIUS * 0.22,
      minDistance: STAR_DISTANCE_MIN,
      color: 0x995522,
      density: 0.9,
      variation: 0.1,
      shape: 'disc'  // disc shaped cloud
    },
    {
      center: new Vector3(-UNIVERSE_RADIUS * 0.2, -UNIVERSE_RADIUS * 0.3, -UNIVERSE_RADIUS * 0.3),
      radius: UNIVERSE_RADIUS * 0.28,
      minDistance: STAR_DISTANCE_MIN,
      color: 0x775544,
      density: 0.75,
      variation: 0.2,
      shape: 'spheroid'  // spheroid shaped cloud
    }
  ];
  
  let particlesRemaining = DUST_PARTICLE_COUNT;
  
  // Distribute particles among dust clouds based on relative density
  // Calculate total density
  const totalDensity = dustClouds.reduce((sum, cloud) => sum + cloud.density, 0);
  
  for (const cloud of dustClouds) {
    // Calculate particles for this cloud
    const cloudParticles = Math.floor(particlesRemaining * (cloud.density / totalDensity));
    
    for (let i = 0; i < cloudParticles; i++) {
      let x, y, z;
      
      // Generate positions based on cloud shape
      switch(cloud.shape) {
        case 'spheroid':
          // Ellipsoidal distribution
          const u = Math.random();
          const v = Math.random();
          const theta = 2 * Math.PI * u;
          const phi = Math.acos(2 * v - 1);
          
          // Axes of the ellipsoid
          const axes = [1.0, 0.8 + Math.random() * 0.4, 0.6 + Math.random() * 0.3];
          const radius = cloud.radius * Math.pow(Math.random(), 0.6); // More particles toward the outer regions
          
          x = cloud.center.x + radius * axes[0] * Math.sin(phi) * Math.cos(theta);
          y = cloud.center.y + radius * axes[1] * Math.sin(phi) * Math.sin(theta);
          z = cloud.center.z + radius * axes[2] * Math.cos(phi);
          break;
          
        case 'filament':
          // Thread-like structures
          const filamentCount = 3 + Math.floor(Math.random() * 4);
          const filament = Math.floor(Math.random() * filamentCount);
          const filamentAngle = filament / filamentCount * Math.PI * 2;
          
          const length = cloud.radius * Math.random();
          const width = cloud.radius * 0.05 * (1 + Math.random());
          
          x = cloud.center.x + Math.cos(filamentAngle) * length;
          y = cloud.center.y + Math.sin(filamentAngle) * length;
          z = cloud.center.z + (Math.random() - 0.5) * width;
          
          // Add some curvature
          const curve = width * Math.sin(length / cloud.radius * Math.PI);
          x += curve * Math.sin(filamentAngle);
          y -= curve * Math.cos(filamentAngle);
          break;
          
        case 'disc':
          // Disc/ring structure
          const discRadius = cloud.radius * (0.5 + 0.5 * Math.random());
          const discAngle = Math.random() * Math.PI * 2;
          
          x = cloud.center.x + discRadius * Math.cos(discAngle);
          y = cloud.center.y + discRadius * Math.sin(discAngle);
          z = cloud.center.z + (Math.random() - 0.5) * cloud.radius * 0.1;
          break;
          
        case 'irregular':
        default:
          // Irregular cloud structure with density variations
          const distance = cloud.radius * Math.pow(Math.random(), 0.7);
          const cloudTheta = Math.random() * Math.PI * 2;
          const cloudPhi = Math.acos(2 * Math.random() - 1);
          
          x = cloud.center.x + distance * Math.sin(cloudPhi) * Math.cos(cloudTheta);
          y = cloud.center.y + distance * Math.sin(cloudPhi) * Math.sin(cloudTheta);
          z = cloud.center.z + distance * Math.cos(cloudPhi);
          
          // Add fractal noise (simplified)
          const noiseScale = cloud.radius * 0.1;
          x += (Math.random() - 0.5) * noiseScale;
          y += (Math.random() - 0.5) * noiseScale;
          z += (Math.random() - 0.5) * noiseScale;
          break;
      }
      
      vertices.push(x, y, z);
      
      // Color with variation
      const baseColor = new Color(cloud.color);
      const hsl = {};
      baseColor.getHSL(hsl);
      
      // Add variation to hue, saturation, and lightness
      const hue = ((hsl.h + (Math.random() - 0.5) * cloud.variation * 0.2) + 1) % 1;
      const saturation = Math.max(0, Math.min(1, hsl.s + (Math.random() - 0.5) * cloud.variation * 0.4));
      const lightness = Math.max(0, Math.min(1, hsl.l + (Math.random() - 0.5) * cloud.variation * 0.4));
      
      const color = new Color().setHSL(hue, saturation, lightness);
      colors.push(color.r, color.g, color.b);
      
      // Size variation - smaller particles for dust
      const size = 0.5 + Math.random() * 2;
      sizes.push(size);
    }
    
    particlesRemaining -= cloudParticles;
  }
  
  // Use any remaining particles for random distribution
  for (let i = 0; i < particlesRemaining; i++) {
    // Random positions throughout universe
    const distance = STAR_DISTANCE_MIN + (UNIVERSE_RADIUS - STAR_DISTANCE_MIN) * 0.8 * Math.random();
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    const x = distance * Math.sin(phi) * Math.cos(theta);
    const y = distance * Math.sin(phi) * Math.sin(theta);
    const z = distance * Math.cos(phi);
    
    vertices.push(x, y, z);
    
    // Random colors in brownish/reddish range for isolated dust
    const hue = 0.05 + Math.random() * 0.1; // Reddish/brownish
    const saturation = 0.3 + Math.random() * 0.4;
    const lightness = 0.1 + Math.random() * 0.2;
    
    const color = new Color().setHSL(hue, saturation, lightness);
    colors.push(color.r, color.g, color.b);
    
    // Small sizes for individual dust particles
    const size = 0.5 + Math.random();
    sizes.push(size);
  }
  
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));
  
  const material = new PointsMaterial({
    size: 2,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    blending: AdditiveBlending
  });
  
  const cosmicDust = new Points(geometry, material);
  cosmicDust.name = 'cosmicDust';
  container.add(cosmicDust);
};

// Add light scattering and lens flare effects for the sun and bright stars
export const addLightScatteringEffects = (scene, camera, sunPosition) => {
  // Create a group for all light scattering effects
  const lightEffectsGroup = new Group();
  lightEffectsGroup.name = 'lightScatteringEffects';
  
  // Create sun lens flare
  if (sunPosition) {
    createLensFlare(sunPosition, 0xffffaa, 100, lightEffectsGroup);
  }
  
  // Create lens flares for a few bright stars
  const brightStarCount = 5;
  for (let i = 0; i < brightStarCount; i++) {
    // Position the bright stars far away from the center
    const distance = STAR_DISTANCE_MIN + (UNIVERSE_RADIUS - STAR_DISTANCE_MIN) * 0.8 * Math.random();
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    const starPosition = new Vector3(
      distance * Math.sin(phi) * Math.cos(theta),
      distance * Math.sin(phi) * Math.sin(theta),
      distance * Math.cos(phi)
    );
    
    // Random star colors
    const starColors = [0xccddff, 0xffffee, 0xffddbb, 0xaaccff];
    const color = starColors[Math.floor(Math.random() * starColors.length)];
    
    // Create lens flare with smaller size than sun
    createLensFlare(starPosition, color, 15 + Math.random() * 20, lightEffectsGroup);
  }
  
  // Add effects to scene
  scene.add(lightEffectsGroup);
  
  return lightEffectsGroup;
};

// Helper function to create a lens flare effect
const createLensFlare = (position, color, size, parent) => {
  // Create a simple lens flare using a bright point with additive blending
  const flareGeometry = new BufferGeometry();
  const flareVertices = [];
  const flareColors = [];
  const flareSizes = [];
  
  // Main flare
  flareVertices.push(position.x, position.y, position.z);
  
  const flareColor = new Color(color);
  flareColors.push(flareColor.r, flareColor.g, flareColor.b);
  flareSizes.push(size);
  
  // Additional flare elements (smaller halos)
  const flareElements = 5;
  for (let i = 0; i < flareElements; i++) {
    // Slightly offset positions to create halo effect
    const offsetFactor = (i + 1) * 0.05;
    flareVertices.push(
      position.x + (Math.random() - 0.5) * offsetFactor,
      position.y + (Math.random() - 0.5) * offsetFactor,
      position.z + (Math.random() - 0.5) * offsetFactor
    );
    
    // Varying colors and sizes for halo elements
    const elementColor = new Color(color).multiplyScalar(0.7 - i * 0.1);
    flareColors.push(elementColor.r, elementColor.g, elementColor.b);
    flareSizes.push(size * (0.7 - i * 0.1));
  }
  
  flareGeometry.setAttribute('position', new Float32BufferAttribute(flareVertices, 3));
  flareGeometry.setAttribute('color', new Float32BufferAttribute(flareColors, 3));
  flareGeometry.setAttribute('size', new Float32BufferAttribute(flareSizes, 1));
  
  const flareMaterial = new PointsMaterial({
    size: 150,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: AdditiveBlending
  });
  
  const lensFlare = new Points(flareGeometry, flareMaterial);
  lensFlare.name = 'lensFlare';
  parent.add(lensFlare);
  
  return lensFlare;
};
