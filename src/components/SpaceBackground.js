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
const STAR_COUNT = 15000; // Increased star count for richer background
const GALAXY_COUNT = 35; // Significantly increased for more realistic space density
const NEBULA_COUNT = 12; // More nebulae for visual interest
const DUST_PARTICLE_COUNT = 40000; // More cosmic dust
const INTERSTELLAR_PARTICLE_COUNT = 20000; // More interstellar particles
const GALAXY_MIN_DISTANCE = UNIVERSE_RADIUS * 0.35; // Reduced for better distribution

// Galaxy type probabilities (realistic distribution)
const GALAXY_TYPES = {
  SPIRAL: { id: 0, probability: 0.61, name: 'Spiral' },
  BARRED_SPIRAL: { id: 1, probability: 0.25, name: 'Barred Spiral' }, 
  ELLIPTICAL: { id: 2, probability: 0.10, name: 'Elliptical' },
  LENTICULAR: { id: 3, probability: 0.03, name: 'Lenticular' },
  IRREGULAR: { id: 4, probability: 0.01, name: 'Irregular' }
};

// Helper to pick a random galaxy type based on probabilities
function getRandomGalaxyType() {
  const types = Object.values(GALAXY_TYPES);
  const rand = Math.random();
  let sum = 0;
  for (let i = 0; i < types.length; i++) {
    sum += types[i].probability;
    if (rand < sum) return types[i].id;
  }
  // Fallback in case of rounding errors
  return GALAXY_TYPES.SPIRAL.id;
}

// Helper to get particle count based on galaxy type
function getParticleCountForGalaxyType(galaxyType) {
  switch(galaxyType) {
    case GALAXY_TYPES.ELLIPTICAL.id:
      return 2000 + Math.floor(Math.random() * 3000); // 2000-5000 particles
    case GALAXY_TYPES.SPIRAL.id:
      return 4000 + Math.floor(Math.random() * 4000); // 4000-8000 particles
    case GALAXY_TYPES.BARRED_SPIRAL.id:
      return 3500 + Math.floor(Math.random() * 3500); // 3500-7000 particles
    case GALAXY_TYPES.LENTICULAR.id:
      return 1500 + Math.floor(Math.random() * 2500); // 1500-4000 particles
    case GALAXY_TYPES.IRREGULAR.id:
      return 1000 + Math.floor(Math.random() * 2000); // 1000-3000 particles
    default:
      return 3000 + Math.floor(Math.random() * 3000); // Default: 3000-6000 particles
  }
}

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
    
    // Galaxy parameters - enhanced variety with realistic distribution
    const galaxyType = getRandomGalaxyType();
    const particleCount = getParticleCountForGalaxyType(galaxyType);
    
    // Galaxy size and structure parameters based on type
    let galaxySize, spiralArms, spiralTightness, bulgeness, diskFlatness;
    
    switch(galaxyType) {
      case GALAXY_TYPES.ELLIPTICAL.id:
        galaxySize = 2000 + Math.random() * 15000; // Wide size range
        spiralArms = 0;
        spiralTightness = 0;
        bulgeness = 0.8 + Math.random() * 0.2; // Very bulgy
        diskFlatness = 0.3 + Math.random() * 0.4; // Quite flat to round
        break;
        
      case GALAXY_TYPES.SPIRAL.id:
        galaxySize = 3000 + Math.random() * 12000;
        spiralArms = [2, 2, 3, 4, 4][Math.floor(Math.random() * 5)]; // Realistic arm distribution
        spiralTightness = 0.8 + Math.random() * 2.5; // Tighter spirals
        bulgeness = 0.15 + Math.random() * 0.25; // Moderate bulge
        diskFlatness = 0.05 + Math.random() * 0.1; // Very flat disk
        break;
        
      case GALAXY_TYPES.BARRED_SPIRAL.id:
        galaxySize = 3500 + Math.random() * 10000;
        spiralArms = [2, 2, 4][Math.floor(Math.random() * 3)]; // Usually 2 or 4 arms
        spiralTightness = 1.2 + Math.random() * 2.0;
        bulgeness = 0.2 + Math.random() * 0.2; // Moderate bulge
        diskFlatness = 0.04 + Math.random() * 0.08; // Very flat
        break;
        
      case GALAXY_TYPES.LENTICULAR.id:
        galaxySize = 2500 + Math.random() * 8000;
        spiralArms = 0;
        spiralTightness = 0;
        bulgeness = 0.4 + Math.random() * 0.3; // Large bulge
        diskFlatness = 0.03 + Math.random() * 0.05; // Very flat disk
        break;
        
      case GALAXY_TYPES.IRREGULAR.id:
        galaxySize = 1500 + Math.random() * 6000; // Usually smaller
        spiralArms = 0;
        spiralTightness = 0;
        bulgeness = 0.1 + Math.random() * 0.4; // Variable structure
        diskFlatness = 0.2 + Math.random() * 0.6; // Quite thick
        break;
        
      default:
        // Fallback to spiral
        galaxySize = 3000 + Math.random() * 8000;
        spiralArms = 2 + Math.floor(Math.random() * 3) * 2;
        spiralTightness = 2 + Math.random() * 4;
        bulgeness = 0.2;
        diskFlatness = 0.08;
    }
    
    // Create galaxy geometry with central black hole
    const vertices = [];
    const colors = [];
    const sizes = [];
    
    // Black hole size adjusted to galaxy type and size
    const blackHoleSize = galaxyType === 2 ? galaxySize * 0.05 : galaxySize * 0.04;
    const accretionDiskSize = blackHoleSize * 2.2;
    const blackHoleParticleCount = 500 + Math.floor(Math.random() * 300);
    
    // Enhanced galaxy colors based on type and age
    let galaxyHue, coreSaturation, coreLightness, galaxyAge;
    
    switch(galaxyType) {
      case GALAXY_TYPES.ELLIPTICAL.id:
        // Ellipticals are old, red galaxies
        galaxyHue = 0.02 + Math.random() * 0.08; // Red to orange
        coreSaturation = 0.15 + Math.random() * 0.15;
        coreLightness = 0.6 + Math.random() * 0.2;
        galaxyAge = 0.8 + Math.random() * 0.2; // Old galaxies
        break;
        
      case GALAXY_TYPES.SPIRAL.id:
        // Spirals have ongoing star formation - more blue
        galaxyHue = 0.55 + Math.random() * 0.15; // Blue to blue-white
        coreSaturation = 0.2 + Math.random() * 0.3;
        coreLightness = 0.7 + Math.random() * 0.2;
        galaxyAge = 0.3 + Math.random() * 0.5; // Mixed ages
        break;
        
      case GALAXY_TYPES.BARRED_SPIRAL.id:
        // Similar to spirals but often slightly redder cores
        galaxyHue = 0.52 + Math.random() * 0.18;
        coreSaturation = 0.25 + Math.random() * 0.25;
        coreLightness = 0.65 + Math.random() * 0.25;
        galaxyAge = 0.4 + Math.random() * 0.4;
        break;
        
      case GALAXY_TYPES.LENTICULAR.id:
        // Intermediate between ellipticals and spirals
        galaxyHue = 0.08 + Math.random() * 0.12; // Yellow to orange
        coreSaturation = 0.18 + Math.random() * 0.2;
        coreLightness = 0.65 + Math.random() * 0.2;
        galaxyAge = 0.6 + Math.random() * 0.3;
        break;
        
      case GALAXY_TYPES.IRREGULAR.id:
        // Young, star-forming galaxies - very blue
        galaxyHue = 0.58 + Math.random() * 0.12; // Blue
        coreSaturation = 0.4 + Math.random() * 0.4;
        coreLightness = 0.75 + Math.random() * 0.2;
        galaxyAge = 0.1 + Math.random() * 0.4; // Young galaxies
        break;
        
      default:
        galaxyHue = Math.random();
        coreSaturation = 0.2 + Math.random() * 0.3;
        coreLightness = 0.7 + Math.random() * 0.2;
        galaxyAge = 0.5;
    }
    
    const coreColor = new Color().setHSL(galaxyHue, coreSaturation, coreLightness);
    const armColor = new Color().setHSL((galaxyHue + 0.05) % 1, Math.min(1, coreSaturation + 0.2), coreLightness - 0.05);
    const edgeColor = new Color().setHSL((galaxyHue + 0.1) % 1, Math.min(1, coreSaturation + 0.4), coreLightness - 0.15);
    const starFormationColor = new Color().setHSL(0.6, 0.8, 0.85); // Bright blue for star formation
    const accretionDiskColor = new Color().setHSL((galaxyHue + 0.3) % 1, 0.8, 0.6);
    
    // Create rotation matrix to give galaxy a random orientation
    const galaxyRotationX = Math.random() * Math.PI * 2;
    const galaxyRotationY = Math.random() * Math.PI * 2;
    const galaxyRotationZ = Math.random() * Math.PI * 2;
    
    for (let j = 0; j < particleCount; j++) {
      let x, y, z;
      let distFromCenter;
      
      if (galaxyType === GALAXY_TYPES.ELLIPTICAL.id) {
        // Elliptical galaxy - 3D ellipsoid distribution with more realistic shape
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        
        // More varied ellipsoid axes for realistic elliptical shapes
        const eccentricity = 0.3 + Math.random() * 0.6; // How elongated
        const axes = [1.0, eccentricity, eccentricity * (0.5 + Math.random() * 0.5)];
        
        // R^(1/4) distribution for more realistic surface brightness profile
        distFromCenter = Math.pow(Math.random(), 0.25);
        
        x = distFromCenter * axes[0] * galaxySize * Math.sin(phi) * Math.cos(theta);
        y = distFromCenter * axes[1] * galaxySize * Math.sin(phi) * Math.sin(theta);
        z = distFromCenter * axes[2] * galaxySize * Math.cos(phi);
        
      } else if (galaxyType === GALAXY_TYPES.LENTICULAR.id) {
        // Lenticular galaxy - disk-like but no spiral arms
        distFromCenter = Math.pow(Math.random(), 0.6); // Concentrated toward center
        const angle = Math.random() * Math.PI * 2;
        
        x = Math.cos(angle) * distFromCenter * galaxySize;
        y = Math.sin(angle) * distFromCenter * galaxySize;
        z = (Math.random() - 0.5) * galaxySize * diskFlatness;
        
        // Add central bulge
        if (distFromCenter < bulgeness) {
          const bulgeHeight = galaxySize * (0.15 + Math.random() * 0.1);
          z += (Math.random() - 0.5) * bulgeHeight;
        }
        
      } else if (galaxyType === GALAXY_TYPES.IRREGULAR.id) {
        // Irregular galaxy - chaotic, clumpy structure
        const clumpCount = 3 + Math.floor(Math.random() * 5);
        const clumpIndex = Math.floor(Math.random() * clumpCount);
        
        // Create offset clumps
        const clumpAngle = (clumpIndex / clumpCount) * Math.PI * 2;
        const clumpDistance = Math.random() * galaxySize * 0.7;
        const clumpSize = galaxySize * (0.2 + Math.random() * 0.3);
        
        const centerX = Math.cos(clumpAngle) * clumpDistance;
        const centerY = Math.sin(clumpAngle) * clumpDistance;
        
        // Random distribution around clump center
        const localRadius = Math.pow(Math.random(), 0.3) * clumpSize;
        const localAngle = Math.random() * Math.PI * 2;
        const localPhi = Math.acos(2 * Math.random() - 1);
        
        x = centerX + localRadius * Math.sin(localPhi) * Math.cos(localAngle);
        y = centerY + localRadius * Math.sin(localPhi) * Math.sin(localAngle);
        z = (Math.random() - 0.5) * galaxySize * diskFlatness;
        
        distFromCenter = Math.sqrt(x*x + y*y) / galaxySize;
      } else {
        // Enhanced spiral galaxies with realistic logarithmic spirals
        distFromCenter = Math.pow(Math.random(), 0.6); // More particles in outer regions
        
        // Determine particle location type
        const isCentralBulge = distFromCenter < bulgeness;
        const isBar = (galaxyType === GALAXY_TYPES.BARRED_SPIRAL.id) && !isCentralBulge && distFromCenter < 0.4;
        
        if (isCentralBulge) {
          // Central bulge - spheroidal distribution
          const bulgeSize = galaxySize * bulgeness;
          const u = Math.random();
          const v = Math.random();
          const theta = 2 * Math.PI * u;
          const phi = Math.acos(2 * v - 1);
          
          x = bulgeSize * Math.sin(phi) * Math.cos(theta);
          y = bulgeSize * Math.sin(phi) * Math.sin(theta);
          z = bulgeSize * Math.cos(phi) * 0.7; // Slightly flattened bulge
          
        } else if (isBar) {
          // Bar structure for barred spirals
          const barLength = galaxySize * 0.6;
          const barWidth = galaxySize * 0.15;
          const barHeight = galaxySize * 0.08;
          
          x = (Math.random() - 0.5) * barLength;
          y = (Math.random() - 0.5) * barWidth;
          z = (Math.random() - 0.5) * barHeight;
          
        } else {
          // Improved logarithmic spiral arms
          const scaledDist = distFromCenter * galaxySize;
          
          // Choose which arm this particle belongs to
          const armIndex = Math.floor(Math.random() * spiralArms);
          const armOffset = (armIndex * Math.PI * 2) / spiralArms;
          
          // Logarithmic spiral equation: r = a * e^(b*θ)
          // Rearranged: θ = (1/b) * ln(r/a)
          const spiralConstant = 1.0 / spiralTightness;
          const baseRadius = galaxySize * 0.1; // Starting radius of spiral
          
          // Calculate angle for logarithmic spiral
          let spiralAngle;
          if (scaledDist > baseRadius) {
            spiralAngle = spiralConstant * Math.log(scaledDist / baseRadius);
          } else {
            spiralAngle = 0;
          }
          
          // Add arm offset and some randomness
          const totalAngle = spiralAngle + armOffset + (Math.random() - 0.5) * 0.3;
          
          // Arm width varies with radius (wider towards edges)
          const armWidthFactor = 0.08 + 0.12 * distFromCenter;
          const inArmProbability = Math.exp(-Math.pow(distFromCenter - 0.5, 2) * 8); // Peak at mid-radius
          
          let radialOffset = 0;
          if (Math.random() < inArmProbability) {
            // In spiral arm - tighter distribution
            radialOffset = (Math.random() - 0.5) * armWidthFactor * scaledDist;
          } else {
            // Between arms - wider, sparser distribution
            radialOffset = (Math.random() - 0.5) * armWidthFactor * scaledDist * 2;
          }
          
          const finalRadius = scaledDist + radialOffset;
          
          x = Math.cos(totalAngle) * finalRadius;
          y = Math.sin(totalAngle) * finalRadius;
          
          // Disk thickness varies with radius and galaxy type
          const thickness = galaxySize * diskFlatness * (1 + distFromCenter * 2);
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
      
      // Enhanced color assignment based on galaxy type and stellar populations
      const color = new Color();
      
      if (galaxyType === GALAXY_TYPES.ELLIPTICAL.id) {
        // Elliptical galaxies - old stellar population, red colors
        const brightness = Math.max(0.1, 1.2 - distFromCenter * distFromCenter);
        color.copy(coreColor).multiplyScalar(brightness);
        
        // Add some red giants and occasional bright stars
        if (Math.random() < 0.02) {
          color.setHSL(0.0, 0.8, 0.7); // Red giants
        }
        
      } else if (galaxyType === GALAXY_TYPES.LENTICULAR.id) {
        // Lenticular - intermediate between elliptical and spiral
        const brightness = Math.max(0.1, 1.0 - distFromCenter * 0.8);
        color.copy(coreColor).multiplyScalar(brightness);
        
        if (distFromCenter < bulgeness) {
          color.copy(coreColor).multiplyScalar(1.2); // Bright bulge
        }
        
      } else if (galaxyType === GALAXY_TYPES.IRREGULAR.id) {
        // Irregular galaxies - lots of star formation, very blue
        const brightness = 0.6 + Math.random() * 0.6;
        color.copy(starFormationColor).multiplyScalar(brightness);
        
        // Lots of HII regions and star formation
        if (Math.random() < 0.3) {
          color.setHSL(0.6, 0.9, 0.9); // Very bright blue stars
        } else if (Math.random() < 0.1) {
          color.setHSL(0.95, 0.8, 0.7); // Pink HII regions
        }
        
      } else {
        // Spiral and barred spiral galaxies
        const isCentralBulge = distFromCenter < bulgeness;
        const isInArm = j % (spiralArms * Math.ceil(particleCount / (spiralArms * 100))) < Math.ceil(particleCount / (spiralArms * 100));
        
        if (isCentralBulge) {
          // Galaxy bulge - older, redder stars
          const bulgeColor = new Color().setHSL(galaxyHue - 0.05, coreSaturation * 0.8, coreLightness);
          color.copy(bulgeColor);
          
          // Bright core
          if (distFromCenter < bulgeness * 0.3) {
            color.multiplyScalar(1.5);
          }
          
        } else if (isInArm && distFromCenter > bulgeness) {
          // Spiral arms - active star formation
          const blend = Math.max(0, (distFromCenter - bulgeness) / (1 - bulgeness));
          color.copy(coreColor).lerp(armColor, blend);
          
          // Star formation regions in arms
          if (Math.random() < 0.08 * (1 - galaxyAge)) {
            color.copy(starFormationColor); // Bright blue star formation
          } else if (Math.random() < 0.03) {
            color.setHSL(0.95, 0.7, 0.6); // Pink HII regions
          }
          
        } else {
          // Disk between arms - intermediate age stars
          const blend = Math.max(0, (distFromCenter - bulgeness) / (1 - bulgeness));
          color.copy(coreColor).lerp(edgeColor, blend * 0.6);
          color.multiplyScalar(0.7); // Dimmer than arms
        }
        
        // Edge fading for all spiral types
        if (distFromCenter > 0.85) {
          const fadeFactor = Math.max(0.2, 1.0 - (distFromCenter - 0.85) / 0.15);
          color.multiplyScalar(fadeFactor);
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
          let discRadius = cloud.radius * (0.5 + 0.5 * Math.random());
          let discAngle = Math.random() * Math.PI * 2;
          
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
  
  // Create cosmic dust particles
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
    // Random star colors
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
    const color = new Color(Math.random() * 0xffffff);
    
    // Create lens flare for this star
    createLensFlare(starPosition, color, 50, lightEffectsGroup);
  }
  
  return lightEffectsGroup;
};

// Create a lens flare effect at a given position
const createLensFlare = (position, color, size, parent) => {
  const vertices = [];
  const colors = [];
  const sizes = [];
  
  // Central bright spot
  vertices.push(position.x, position.y, position.z);
  colors.push(color.r, color.g, color.b);
  sizes.push(size);
  
  // Additional flare elements (smaller halos)
  const flareElements = 5;
  for (let i = 0; i < flareElements; i++) {
    // Slightly offset positions to create halo effect
    const offsetFactor = (i + 1) * 0.05;
    vertices.push(
      position.x + (Math.random() - 0.5) * offsetFactor,
      position.y + (Math.random() - 0.5) * offsetFactor,
      position.z + (Math.random() - 0.5) * offsetFactor
    );
    
    // Varying colors and sizes for halo elements
    const elementColor = new Color(color).multiplyScalar(0.7 - i * 0.1);
    colors.push(elementColor.r, elementColor.g, elementColor.b);
    sizes.push(size * (0.7 - i * 0.1));
  }
  
  const flareGeometry = new BufferGeometry();
  flareGeometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  flareGeometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  flareGeometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));
  
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
