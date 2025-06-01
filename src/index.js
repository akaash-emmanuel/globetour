import ThreeGlobe from "three-globe";
import { WebGLRenderer, Scene, PerspectiveCamera, AmbientLight, DirectionalLight, MeshBasicMaterial, Mesh, Color, Fog, PointLight, Group, Vector3, Vector2, BufferGeometry, SphereGeometry, CanvasTexture, SpriteMaterial, Sprite, CylinderGeometry, LineLoop, LineBasicMaterial, Raycaster, RingGeometry, DoubleSide, Clock } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import countries from "./assets/Updated Globe Data.json";
import spaceMusic from "./assets/spacemusic.mp3";
import gsap from 'gsap';
import * as satellite from 'satellite.js';
import axios from 'axios';

// Import the astronaut tools components
import * as AstronautTools from './components/AstronautTools.js';
import * as Moon from './components/Moon.js';
import * as Sun from './components/Sun.js';

// Import constants from Sun.js and Moon.js for camera positioning
const SUN_RADIUS = 10; // Same as in Sun.js
const MOON_RADIUS = 0.5; // Same as in Moon.js
const MOON_DISTANCE = 300; // Same as in Moon.js

let renderer, camera, scene, controls;
let Globe;
let globeGroup;
let moon; // Reference to the moon object
let sun; // Reference to the sun object
let audio;
let audioPlayed = false;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let currentAnimation = null;
let currentTypeWriter = null;
let mouseX = 0;
let mouseY = 0;
let isGlobeRotating = true;
let isEarthOrbiting = true; // Whether Earth orbits around the Sun
let clock = new Clock(); // For tracking time in animations
let cameraFocus = 'earth'; // Current camera focus: 'earth', 'sun', or 'moon'

// Initialize globals
let currentTool = null;
let toolCleanupFunction = null;

init();
globeGroup = initGlobe();
drawCountryBorders();
addCountryLabels();
addStars();
shootingStars();
prepareAmbientMusic();
initSun(); // Initialize the sun
initMoon(); // Initialize the moon
onWindowResize();
animate();
createButtons();
initAstronautTools(); // Initialize Astronaut Tools system

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.overflow = "hidden";

  scene = new Scene();
  scene.add(new AmbientLight(0xffffff, 0.3));    // set ambient lighting to the screen (scene), a tint of color branching from one point or all over
  scene.background = new Color(0x000000);        // black space color

  camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);   // set camera view with increased far plane
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();


// three directional lights set to the screen to add a space effect to the globe

  const dLight = new DirectionalLight(0x89c9f8, 1.8);    
  dLight.position.set(1, 1, 1);
  camera.add(dLight);

  const dLight1 = new DirectionalLight(0x7982f6, 0.8);
  dLight1.position.set(0, 500, 500);
  camera.add(dLight1);

  const dLight2 = new DirectionalLight(0x8566cc, 0.5);
  dLight2.position.set(-200, 500, 200);
  camera.add(dLight2);

  camera.position.z = 400;
  scene.add(camera);
  
  // Store initial camera position for reset functionality
  camera.userData = {
    initialPosition: new Vector3(0, 0, 400)
  };

  scene.fog = new Fog(0x535ef3, 500, 4000);   // a fog to make sure the stars and everything in the background appears farther, extended for sun visibility

  controls = new OrbitControls(camera, renderer.domElement);   // set basic default attribrutes to the globe and user controls
  controls.enableDamping = false;
  controls.dynamicDampingFactor = 0.01;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = 115;
  controls.maxDistance = 4000; // Increased to allow viewing the sun
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 1.0;
  controls.autoRotate = false;
  controls.minPolarAngle = Math.PI / 3.5;
  controls.maxPolarAngle = Math.PI - Math.PI / 3;

  window.addEventListener("resize", onWindowResize, false);
  window.addEventListener("mousemove", onMouseMove);

  // Add event listeners for zooming

  window.addEventListener("keydown", (event) => {
    if (event.key === "+" || event.key === "=") {
      // Zoom in
      camera.position.z -= 40; // Adjust the zoom speed
      if (camera.position.z < controls.minDistance) {
        camera.position.z = controls.minDistance;
      }
    } else if (event.key === "-" || event.key === "_") {
      // Zoom out
      camera.position.z += 90; // Adjust the zoom speed
      if (camera.position.z > controls.maxDistance) {
        camera.position.z = controls.maxDistance;
      }
    }
  });
}
function initGlobe() {
  const globeGroup = new Group();

  Globe = new ThreeGlobe()
    .hexPolygonsData(countries.features)
    .hexPolygonResolution(3)
    .hexPolygonMargin(0.7)
    .showAtmosphere(true)
    .atmosphereColor("#0c529c")
    .atmosphereAltitude(0.4)
    .hexPolygonColor(() => "rgba(255,255,255, 0.7)"); // Default color

  Globe.rotateY(-Math.PI * (5 / 9));
  Globe.rotateZ(-Math.PI / 6);

  const globeMaterial = Globe.globeMaterial();
  globeMaterial.color = new Color(0x240750);
  globeMaterial.emissive = new Color(0x220038);
  globeMaterial.emissiveIntensity = 0.05;
  globeMaterial.shininess = 0.5;

  globeGroup.add(Globe);

  const borders = drawCountryBorders();
  globeGroup.add(borders);

  scene.add(globeGroup);

  return globeGroup;
}
function convertLatLonToXYZ(lat, lon, radius) {
  const longitudeOffset = -90;
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180 + longitudeOffset) * (Math.PI / 180);
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}
function getQuakeColor(magnitude) {
  if (!magnitude) return '#ffffff'; // Default color if magnitude is undefined
  if (magnitude >= 7) return '#FF0000';      // Red
  if (magnitude >= 6) return '#FF6600';      // Orange
  if (magnitude >= 5) return '#FFCC00';      // Yellow
  return '#00FF00';                          // Green
}
function drawCountryBorders() {
  const globeRadius = Globe.getGlobeRadius();
  const borderGroup = new Group();

  countries.features.forEach((feature) => {
    const { geometry } = feature;
    if (geometry.type === "Polygon") {
      drawPolygon(geometry.coordinates, borderGroup);
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => drawPolygon(polygon, borderGroup));
    }
  });

  function drawPolygon(coordinates, group) {
    coordinates.forEach((ring) => {
      const points = ring.map(([lon, lat]) =>
        convertLatLonToXYZ(lat, lon, globeRadius + 0.1)
      );
      const borderGeometry = new BufferGeometry().setFromPoints(points);
      const borderMaterial = new LineBasicMaterial({
        color: 0xffffff,
        linewidth: 0.1,
        transparent: true,
        opacity: 0.9,
      });
      const borderLine = new LineLoop(borderGeometry, borderMaterial);
      group.add(borderLine);
    });
  }

  return borderGroup;
}
function addCountryLabels() {
// add a country label above each selected country to display basic information about them
  const globeRadius = Globe.getGlobeRadius() + 0.5;

  countries.features.forEach((feature) => {
    const { COUNTRY_NAME } = feature.properties;
    const [minLon, minLat, maxLon, maxLat] = feature.bbox;
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    const position = convertLatLonToXYZ(centerLat, centerLon, globeRadius);

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    canvas.countryName = COUNTRY_NAME; // Store country name in canvas

    context.font = "Bold 24px Arial";
    context.fillStyle = "white";
    context.textAlign = "center";
    context.fillText(COUNTRY_NAME, canvas.width / 2, canvas.height / 2);

    const texture = new CanvasTexture(canvas);
    const spriteMaterial = new SpriteMaterial({ map: texture, transparent: true });
    const sprite = new Sprite(spriteMaterial);

    sprite.position.copy(position);
    sprite.scale.set(10, 5, 1);
    globeGroup.add(sprite);
  });
}
function addStars() {
  const starGeometry = new SphereGeometry(1.3, 24, 24);
  const colors = [0x0000ff, 0xff0000, 0xffff00, 0xffffff, 0x00ff00];

  for (let i = 0; i < 10000; i++) {
    const starColor = colors[Math.floor(Math.random() * colors.length)];
    const starMaterial = new MeshBasicMaterial({ color: starColor });
    const star = new Mesh(starGeometry, starMaterial);

    const distance = Math.random() * 4000 + 1500;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    star.position.x = distance * Math.sin(phi) * Math.cos(theta);
    star.position.y = distance * Math.sin(phi) * Math.sin(theta);
    star.position.z = distance * Math.cos(phi);

    scene.add(star);
  }
}
function shootingStars() {
  const globeRadius = 100;
  const maxDistance = 1500;

  function createShootingStar() {
    const startDistance = Math.random() * (maxDistance - globeRadius) + globeRadius * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    const start = new Vector3(
      startDistance * Math.sin(phi) * Math.cos(theta),
      startDistance * Math.sin(phi) * Math.sin(theta),
      startDistance * Math.cos(phi)
    );

    const direction = new Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();

    const starHeadGeometry = new SphereGeometry(1, 12, 12);
    const starHeadMaterial = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
    });
    const starHead = new Mesh(starHeadGeometry, starHeadMaterial);
    starHead.position.copy(start);
    scene.add(starHead);

    const tailLength = 200;
    const tailGeometry = new CylinderGeometry(0.2, 0.5, tailLength, 8, 1, true);
    const tailMaterial = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
    });
    const tail = new Mesh(tailGeometry, tailMaterial);
    tail.position.copy(start);
    tail.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction);
    scene.add(tail);

    const duration = Math.random() * 2000 + 1000;
    const startTime = Date.now();

    function animateStar() {
      const elapsed = Date.now() - startTime;

      if (elapsed < duration) {
        const progress = elapsed / duration;
        const currentPosition = start.clone().add(direction.clone().multiplyScalar(progress * maxDistance));
        starHead.position.copy(currentPosition);

        tail.position.copy(currentPosition.clone().add(direction.clone().multiplyScalar(-tailLength / 2)));
        tail.scale.y = 1 - progress;
        tailMaterial.opacity = 0.3 * (1 - progress);

        requestAnimationFrame(animateStar);
      } else {
        scene.remove(starHead);
        scene.remove(tail);
      }
    }

    animateStar();
  }

  setInterval(() => {
    createShootingStar();
  }, Math.random() * 2000 + 1000);
}
function prepareAmbientMusic() {
  audio = new Audio(spaceMusic);
  audio.loop = true;
  audio.volume = 0.5;

  window.addEventListener("click", playMusic);
  window.addEventListener("keydown", playMusic);
}
function playMusic() {
  if (!audioPlayed) {
    audio.play().then(() => {
      audioPlayed = true;
      console.log("Ambient music is now playing.");
    }).catch((err) => {
      console.warn("Failed to play audio:", err);
    });
  }
}
function onWindowResize() {
  windowHalfX = window.innerWidth / 2;
  windowHalfY = window.innerHeight / 2;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
function onMouseMove(event) {
  mouseX = event.clientX - windowHalfX;
  mouseY = event.clientY - windowHalfY;
}

// Initialize the sun
function initSun() {
  // Create the sun and add it to the scene
  sun = Sun.createSun(scene);
  
  // Add UI control for sun visibility
  addSunToggleButton();
}

// Initialize the moon
function initMoon() {
  // Get the Earth globe radius for proper scaling
  const globeRadius = Globe.getGlobeRadius();
  
  // Create the moon and add it to the scene
  moon = Moon.createMoon(scene, globeRadius);
  
  // Add UI control for moon visibility
  addMoonToggleButton();
}

// Add a button to toggle sun visibility
function addSunToggleButton() {
  const sunToggleButton = document.createElement('button');
  sunToggleButton.textContent = 'Sun: ON';
  sunToggleButton.style.position = 'absolute';
  sunToggleButton.style.bottom = '10px';
  sunToggleButton.style.left = '100px';
  sunToggleButton.style.padding = '8px 12px';
  sunToggleButton.style.backgroundColor = '#444';
  sunToggleButton.style.color = 'white';
  sunToggleButton.style.border = '1px solid #666';
  sunToggleButton.style.borderRadius = '4px';
  sunToggleButton.style.cursor = 'pointer';
  sunToggleButton.style.zIndex = '1000';
  sunToggleButton.style.fontWeight = 'bold';
  
  // Add Earth orbit toggle button next to the sun button
  const earthOrbitToggle = document.createElement('button');
  earthOrbitToggle.textContent = 'Earth Orbit: ON';
  earthOrbitToggle.style.position = 'absolute';
  earthOrbitToggle.style.bottom = '10px';
  earthOrbitToggle.style.left = '190px';
  earthOrbitToggle.style.padding = '8px 12px';
  earthOrbitToggle.style.backgroundColor = '#444';
  earthOrbitToggle.style.color = 'white';
  earthOrbitToggle.style.border = '1px solid #666';
  earthOrbitToggle.style.borderRadius = '4px';
  earthOrbitToggle.style.cursor = 'pointer';
  earthOrbitToggle.style.zIndex = '1000';
  earthOrbitToggle.style.fontWeight = 'bold';
  
  earthOrbitToggle.addEventListener('click', () => {
    isEarthOrbiting = !isEarthOrbiting;
    earthOrbitToggle.textContent = `Earth Orbit: ${isEarthOrbiting ? 'ON' : 'OFF'}`;
    earthOrbitToggle.style.backgroundColor = isEarthOrbiting ? '#444' : '#333';
    earthOrbitToggle.style.border = isEarthOrbiting ? '1px solid #666' : '1px solid #444';
    
    // Reset Earth position when turning orbit off
    if (!isEarthOrbiting) {
      globeGroup.position.set(0, 0, 0);
    }
  });
  
  document.body.appendChild(earthOrbitToggle);
  
  // Add focus switching buttons
  const focusButtonsContainer = document.createElement('div');
  focusButtonsContainer.style.position = 'absolute';
  focusButtonsContainer.style.bottom = '10px';
  focusButtonsContainer.style.left = '320px';
  focusButtonsContainer.style.display = 'flex';
  focusButtonsContainer.style.gap = '10px';
  focusButtonsContainer.style.zIndex = '1000';
  
  // Create focus button styles
  const createFocusButton = (text, target) => {
    const button = document.createElement('button');
    button.textContent = `Focus: ${text}`;
    button.setAttribute('data-target', target);
    button.className = 'focus-button';
    button.style.padding = '8px 12px';
    button.style.backgroundColor = target === 'earth' ? '#0066cc' : '#444'; // Default focus is Earth
    button.style.color = 'white';
    button.style.border = target === 'earth' ? '1px solid #0099ff' : '1px solid #666';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontWeight = target === 'earth' ? 'bold' : 'normal';
    
    button.addEventListener('click', () => {
      switchCameraFocus(target);
    });
    
    return button;
  };
  
  // Add buttons for each celestial body
  const earthFocusButton = createFocusButton('Earth', 'earth');
  const moonFocusButton = createFocusButton('Moon', 'moon');
  const sunFocusButton = createFocusButton('Sun', 'sun');
  
  focusButtonsContainer.appendChild(earthFocusButton);
  focusButtonsContainer.appendChild(moonFocusButton);
  focusButtonsContainer.appendChild(sunFocusButton);
  
  document.body.appendChild(focusButtonsContainer);
  
  // Add a system view button to zoom out and see the entire solar system
  const systemViewButton = document.createElement('button');
  systemViewButton.textContent = 'System View';
  systemViewButton.style.position = 'absolute';
  systemViewButton.style.bottom = '50px';
  systemViewButton.style.left = '320px';
  systemViewButton.style.padding = '8px 12px';
  systemViewButton.style.backgroundColor = '#444';
  systemViewButton.style.color = 'white';
  systemViewButton.style.border = '1px solid #666';
  systemViewButton.style.borderRadius = '4px';
  systemViewButton.style.cursor = 'pointer';
  systemViewButton.style.zIndex = '1000';
  
  systemViewButton.addEventListener('click', () => {
    // Zoom out to see the entire system
    gsap.to(camera.position, {
      duration: 2,
      x: 0,
      y: 500, 
      z: 2000,
      onUpdate: () => {
        camera.lookAt(0, 0, 0);
      },
      onComplete: () => {
        cameraFocus = '';  // Clear focus when in system view
        updateFocusButtonsUI();
      }
    });
  });
  
  document.body.appendChild(systemViewButton);
  
  // Add a reset camera button
  const resetCameraButton = document.createElement('button');
  resetCameraButton.textContent = 'Reset Camera';
  resetCameraButton.style.position = 'absolute';
  resetCameraButton.style.bottom = '50px';
  resetCameraButton.style.left = '430px';
  resetCameraButton.style.padding = '8px 12px';
  resetCameraButton.style.backgroundColor = '#444';
  resetCameraButton.style.color = 'white';
  resetCameraButton.style.border = '1px solid #666';
  resetCameraButton.style.borderRadius = '4px';
  resetCameraButton.style.cursor = 'pointer';
  resetCameraButton.style.zIndex = '1000';
  
  resetCameraButton.addEventListener('click', () => {
    // Reset to Earth focus with default position
    gsap.to(camera.position, {
      duration: 1.5,
      x: globeGroup.position.x,
      y: globeGroup.position.y,
      z: globeGroup.position.z + 400,
      onUpdate: () => {
        camera.lookAt(globeGroup.position);
      },
      onComplete: () => {
        cameraFocus = 'earth';
        updateFocusButtonsUI();
      }
    });
  });
  
  document.body.appendChild(resetCameraButton);
  
  sunToggleButton.addEventListener('click', () => {
    if (sun) {
      const isVisible = Sun.toggleSunVisibility(sun);
      sunToggleButton.textContent = `Sun: ${isVisible ? 'ON' : 'OFF'}`;
      sunToggleButton.style.backgroundColor = isVisible ? '#444' : '#333';
      sunToggleButton.style.border = isVisible ? '1px solid #666' : '1px solid #444';
    }
  });
  
  document.body.appendChild(sunToggleButton);
}

// Add a button to toggle moon visibility
function addMoonToggleButton() {
  const moonToggleButton = document.createElement('button');
  moonToggleButton.textContent = 'Moon: ON';
  moonToggleButton.style.position = 'absolute';
  moonToggleButton.style.bottom = '10px';
  moonToggleButton.style.left = '10px';
  moonToggleButton.style.padding = '8px 12px';
  moonToggleButton.style.backgroundColor = '#444';
  moonToggleButton.style.color = 'white';
  moonToggleButton.style.border = '1px solid #666';
  moonToggleButton.style.borderRadius = '4px';
  moonToggleButton.style.cursor = 'pointer';
  moonToggleButton.style.zIndex = '1000';
  moonToggleButton.style.fontWeight = 'bold';
  
  moonToggleButton.addEventListener('click', () => {
    if (moon) {
      const isVisible = Moon.toggleMoonVisibility(moon);
      moonToggleButton.textContent = `Moon: ${isVisible ? 'ON' : 'OFF'}`;
      moonToggleButton.style.backgroundColor = isVisible ? '#444' : '#333';
      moonToggleButton.style.border = isVisible ? '1px solid #666' : '1px solid #444';
    }
  });
  
  document.body.appendChild(moonToggleButton);
}

function animate() {
  const deltaTime = clock.getDelta(); // Get time since last frame
  
  // Update Earth's position around the Sun if both exist and orbiting is enabled
  if (sun && globeGroup && isEarthOrbiting) {
    Sun.updateEarthPosition(globeGroup, sun, deltaTime, moon);
  }
  
  if (isGlobeRotating) {
    globeGroup.rotation.y += 0.002; // Rotate the globe only if the flag is true
  }
  
  // Update moon position if it exists
  if (moon) {
    Moon.updateMoonPosition(moon, globeGroup, deltaTime);
  }
  
  // Update camera to follow moving objects when in focus
  updateCameraForMovingObjects();
  
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// Function to adjust camera position to maintain view of moving celestial bodies
function updateCameraForMovingObjects() {
  if (!cameraFocus || !controls.enabled) return;
  
  // Calculate current distance from camera to target
  const currentTarget = controls.target;
  const currentDistance = camera.position.distanceTo(currentTarget);
  
  // Get target position based on focus
  let targetPosition;
  
  if (cameraFocus === 'earth' && globeGroup) {
    targetPosition = globeGroup.position.clone();
  } else if (cameraFocus === 'moon' && moon) {
    targetPosition = moon.position.clone();
  } else if (cameraFocus === 'sun' && sun) {
    targetPosition = sun.position.clone();
  }
  
  if (targetPosition) {
    // Update controls target to follow the object
    controls.target.copy(targetPosition);
    
    // Maintain camera distance and relative orientation
    const cameraDirection = new Vector3().subVectors(camera.position, currentTarget).normalize();
    const newCameraPosition = targetPosition.clone().add(cameraDirection.multiplyScalar(currentDistance));
    
    // Smoothly adjust camera position
    camera.position.lerp(newCameraPosition, 0.05);
    
    // Ensure camera is always looking at the target
    camera.lookAt(targetPosition);
  }
}

function createButtons() {
  // Create Hamburger Menu
  const hamburgerMenu = document.createElement("div");
  hamburgerMenu.style.position = "absolute";
  hamburgerMenu.style.top = "20px";
  hamburgerMenu.style.left = "20px";
  hamburgerMenu.style.zIndex = "1000";
  hamburgerMenu.style.cursor = "pointer";
  hamburgerMenu.innerHTML = `
    <div style="width: 25px; height: 3px; background-color: #ffffff; margin: 5px 0; transition: 0.4s;"></div>
    <div style="width: 25px; height: 3px; background-color: #ffffff; margin: 5px 0; transition: 0.4s;"></div>
    <div style="width: 25px; height: 3px; background-color: #ffffff; margin: 5px 0; transition: 0.4s;"></div>
  `;
  document.body.appendChild(hamburgerMenu);

  // Create Menu Content
  const menuContent = document.createElement("div");
  menuContent.style.position = "absolute";
  menuContent.style.top = "60px";
  menuContent.style.left = "20px";
  menuContent.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  menuContent.style.borderRadius = "5px";
  menuContent.style.padding = "10px";
  menuContent.style.display = "none";
  menuContent.style.flexDirection = "column";
  menuContent.style.gap = "10px";
  menuContent.style.zIndex = "1000";
  document.body.appendChild(menuContent);

  // Create Button 4 (Earthquake Data) - NEW BUTTON
  const earthquakeButton = document.createElement("button");
  earthquakeButton.innerText = "Earthquake Data";
  earthquakeButton.style.padding = "10px 20px";
  earthquakeButton.style.fontSize = "16px";
  earthquakeButton.style.backgroundColor = "#0c529c";
  earthquakeButton.style.color = "#ffffff";
  earthquakeButton.style.border = "none";
  earthquakeButton.style.borderRadius = "5px";
  earthquakeButton.style.cursor = "pointer";
  menuContent.appendChild(earthquakeButton);

  // Create Population button
  const populationButton = document.createElement("button");
  populationButton.innerText = "Population";
  populationButton.style.padding = "10px 20px";
  populationButton.style.fontSize = "16px";
  populationButton.style.backgroundColor = "#0c529c";
  populationButton.style.color = "#ffffff";
  populationButton.style.border = "none";
  populationButton.style.borderRadius = "5px";
  populationButton.style.cursor = "pointer";
  menuContent.appendChild(populationButton);

    // Create Astronaut Tools button
  const astronautButton = document.createElement("button");
  astronautButton.innerText = "Astronaut Tools";
  astronautButton.style.padding = "10px 20px";
  astronautButton.style.fontSize = "16px";
  astronautButton.style.backgroundColor = "#0c529c";
  astronautButton.style.color = "#ffffff";
  astronautButton.style.border = "none";
  astronautButton.style.borderRadius = "5px";
  astronautButton.style.cursor = "pointer";
  menuContent.appendChild(astronautButton);

  astronautButton.addEventListener("click", () => {
    stopCurrentAnimation();
    stopCurrentTypeWriter();
    Globe.arcsData([]);
    // Use the AstronautTools clearDebrisAndOrbits function with globeGroup parameter
    AstronautTools.clearDebrisAndOrbits(globeGroup);
    AstronautTools.showAstronautToolsMenu(scene, Globe, globeGroup, camera);
    menuContent.style.display = "none";
  });

  // Create Reset Button (keep at the end)
  const resetButton = document.createElement("button");
  resetButton.innerText = "Reset";
  resetButton.style.padding = "10px 20px";
  resetButton.style.fontSize = "16px";
  resetButton.style.backgroundColor = "#ff4d4d";
  resetButton.style.color = "#ffffff";
  resetButton.style.border = "none";
  resetButton.style.borderRadius = "5px";
  resetButton.style.cursor = "pointer";
  menuContent.appendChild(resetButton);

  // Add event listener for Earthquake Button
  earthquakeButton.addEventListener("click", () => {
    stopCurrentAnimation();
    stopCurrentTypeWriter();
    Globe.arcsData([]); // Clear existing arcs
    clearDebrisAndOrbits(); // Clear any existing visualizations
    addEarthquakeVisualization(); // Add the new earthquake visualization
    menuContent.style.display = "none"; // Close menu after click
  });

  // Add event listener for Population button
  populationButton.addEventListener("click", async () => {
    stopCurrentAnimation();
    stopCurrentTypeWriter();
    createVerticalButton();
    await showPopulationVisualization();
    menuContent.style.display = "none";
  });

  resetButton.addEventListener("click", () => {
    window.location.reload(); // Refresh the page
    menuContent.style.display = "none"; // Close menu after click
  });

  // Toggle menu on hamburger click
  hamburgerMenu.addEventListener("click", () => {
    menuContent.style.display = menuContent.style.display === "flex" ? "none" : "flex";
  });
}
function showSpaceDebris() {
  clearDebrisAndOrbits();
  stopCurrentAnimation(); // Stop any ongoing animation
  createVerticalButton();
  Globe.arcsData([]);

  // Create orbital paths for space debris
  const orbitLevels = [
    {
      altitudeRange: [160, 2000], // Low Earth Orbit (LEO)
      color: "#00ffff", // Cyan
      label: "Low Earth Orbit (LEO)",
    },
    {
      altitudeRange: [2000, 35786], // Medium Earth Orbit (MEO)
      color: "#00ff00", // Green
      label: "Medium Earth Orbit (MEO)",
    },
    {
      altitudeRange: [35786, 36000], // Geostationary Orbit (GEO)
      color: "#ff0000", // Red
      label: "Geostationary Orbit (GEO)",
    },
  ];


  const scaleFactor = 0.01;

  // Add debris as small spheres and their orbits
  const numDebris = 100; // Number of debris pieces to generate
  for (let i = 0; i < numDebris; i++) {
    // Randomly select an orbit level
    const orbit = orbitLevels[Math.floor(Math.random() * orbitLevels.length)];

    // Randomize altitude within the orbit's range
    const altitude =
      orbit.altitudeRange[0] +
      Math.random() * (orbit.altitudeRange[1] - orbit.altitudeRange[0]);

    // Randomize latitude and longitude
    const latitude = Math.random() * 180 - 90; // -90 to 90 degrees
    const longitude = Math.random() * 360 - 180; // -180 to 180 degrees

    // Create debris sphere
    const debrisGeometry = new SphereGeometry(0.5, 8, 8);
    const debrisMaterial = new MeshBasicMaterial({ color: new Color(orbit.color) });
    const debrisMesh = new Mesh(debrisGeometry, debrisMaterial);
    debrisMesh.userData = { isDebrisOrOrbit: true }; // Mark as debris

    // Convert latitude, longitude, and altitude to 3D position
    const position = convertLatLonToXYZ(
      latitude,
      longitude,
      Globe.getGlobeRadius() + altitude * scaleFactor
    );
    debrisMesh.position.copy(position);

    globeGroup.add(debrisMesh);

    // Create an orbit for the debris
    const orbitPath = new RingGeometry(
      Globe.getGlobeRadius() + altitude * scaleFactor, // Inner radius
      Globe.getGlobeRadius() + altitude * scaleFactor + 1, // Outer radius (thin ring)
      64 // Number of segments
    );
    const orbitMaterial = new MeshBasicMaterial({
      color: new Color(orbit.color),
      transparent: true,
      opacity: 0.3,
      side: DoubleSide,
    });
    const orbitMesh = new Mesh(orbitPath, orbitMaterial);
    orbitMesh.rotation.x = Math.PI / 2; // Align the ring with the equator
    orbitMesh.rotation.y = Math.random() * Math.PI * 2; // Randomize orbit orientation
    orbitMesh.userData = { isDebrisOrOrbit: true }; // Mark as orbit
    globeGroup.add(orbitMesh);
  }

  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
        const explanationText = `
      <div style="color: #ffffff; font-family: Arial, sans-serif;">
        <h3 style="color: #ffffff; margin-bottom: 15px; font-size: 18px;">
          The Growing Threat of Space Debris
        </h3>
        
        <p style="margin-bottom: 15px; line-height: 1.4;">
          Space debris, also known as <b style="color: #FF0000;">"space junk"</b>, is a growing concern for space agencies and satellite operators worldwide. 
          It consists of defunct satellites, spent rocket stages, and fragments from collisions or explosions.
        </p>

        <div style="margin-bottom: 15px; line-height: 1.6;">
          <p style="margin-bottom: 10px; font-weight: bold;">Key Points:</p>
          <span style="color: #00FFFF;">■</span> <b>Low Earth Orbit (LEO):</b> The most crowded region, where debris poses a significant risk to satellites and the International Space Station (ISS).<br>
          <span style="color: #00FF00;">■</span> <b>Medium Earth Orbit (MEO):</b> Home to navigation satellites like GPS, which are also at risk from debris.<br>
          <span style="color: #FF0000;">■</span> <b>Geostationary Orbit (GEO):</b> A critical region for communication satellites, where debris can cause long-term disruptions.
        </div>

        <p style="margin-bottom: 15px; line-height: 1.4;">
          Space debris travels at speeds of up to <b style="color: #FFD700;">28,000 km/h</b>, making even small fragments potentially catastrophic. 
          A collision with a piece of debris can destroy satellites, endanger astronauts, and create even more debris in a dangerous cascade known as <b style="color: #FF4500;">"Kessler Syndrome"</b>.
        </p>

        <p style="line-height: 1.4;">
          <b style="color: #FF4500;">Did You Know?</b> There are over <b>27,000</b> tracked pieces of space debris orbiting Earth, and millions more that are too small to track but still dangerous.
        </p>
      </div>
    `;
    typeWriter(explanationText, verticalButton);
  }
}
async function fetchEarthquakeData() {
  try {
    // Fetch all earthquakes from the past month with magnitude 4.5+
    const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson');
    const data = await response.json();

    return data.features.map(feature => ({
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
      magnitude: feature.properties.mag,
      location: feature.properties.place,
      depth: feature.geometry.coordinates[2],
      timestamp: new Date(feature.properties.time).toLocaleDateString(),
      alert: feature.properties.alert // Will be "green", "yellow", "orange", or "red"
    }));
  } catch (error) {
    console.error('Error fetching earthquake data:', error);
    return [];
  }
}
async function addEarthquakeVisualization() {
  createVerticalButton();
  Globe.arcsData([]);

  // Create loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'earthquakeLoadingDiv';
  loadingDiv.style.position = 'absolute';
  loadingDiv.style.top = '50%';
  loadingDiv.style.left = '50%';
  loadingDiv.style.transform = 'translate(-50%, -50%)';
  loadingDiv.style.color = '#ffffff';
  loadingDiv.style.fontSize = '20px';
  loadingDiv.style.zIndex = '1000';
  loadingDiv.innerHTML = 'Loading earthquake data...';
  document.body.appendChild(loadingDiv);

  try {
    const earthquakeData = await fetchEarthquakeData();

    // Remove loading indicator if it exists
    const loadingElement = document.getElementById('earthquakeLoadingDiv');
    if (loadingElement) {
      loadingElement.remove();
    }

    // Transform earthquake data for ripples
    const rippleData = earthquakeData.map(quake => ({
      lat: quake.lat,
      lng: quake.lng,
      maxR: Math.pow(2, quake.magnitude - 4) * 2,
      propagationSpeed: 0.5,
      repeatPeriod: 3000,
      color: getQuakeColor(quake.magnitude) || '#ffffff',
      altitude: 0.005,
      originalData: quake
    }));

    // Configure globe with ripple data
    Globe
      .ringsData(rippleData)
      .ringColor('color')
      .ringMaxRadius('maxR')
      .ringPropagationSpeed('propagationSpeed')
      .ringRepeatPeriod('repeatPeriod')
      .ringAltitude('altitude');

    // Add explanation text in vertical button
    const verticalButton = document.getElementById("verticalButton");
    if (verticalButton) {
      const explanationText = `
        <div style="color: #ffffff; font-family: Arial, sans-serif;">
          <h3 style="color: #ffffff; margin-bottom: 15px; font-size: 18px;">
            Global Earthquake Activity
          </h3>
          
          <p style="margin-bottom: 15px; line-height: 1.4;">
            Visualizing significant earthquakes (magnitude 4.5+) from the past month.
            Data provided by USGS (United States Geological Survey).
          </p>

          <div style="margin-bottom: 15px; line-height: 1.6;">
            <p style="margin-bottom: 10px; font-weight: bold;">Magnitude Scale:</p>
            <span style="color: #FF0000;">■</span> Major (7.0+)<br>
            <span style="color: #FF6600;">■</span> Strong (6.0-6.9)<br>
            <span style="color: #FFCC00;">■</span> Moderate (5.0-5.9)<br>
            <span style="color: #00FF00;">■</span> Light (4.5-4.9)
          </div>

          <p style="margin-bottom: 15px; line-height: 1.4;">
            Ripple size and propagation speed indicate earthquake magnitude.
            Larger and faster ripples represent stronger seismic events.
          </p>

          <p style="line-height: 1.4;">
            Hover over any ripple to view detailed information about the specific earthquake event.
          </p>
        </div>
      `;

      // Clear existing content and add new explanation
      verticalButton.innerHTML = '';
      typeWriter(explanationText, verticalButton);
    }

    // Add hover functionality
    const infoDiv = document.createElement('div');
    infoDiv.style.position = 'absolute';
    infoDiv.style.display = 'none';
    infoDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    infoDiv.style.color = '#fff';
    infoDiv.style.padding = '10px';
    infoDiv.style.borderRadius = '5px';
    infoDiv.style.fontSize = '12px';
    infoDiv.style.zIndex = '1000';
    document.body.appendChild(infoDiv);

    // Add hover event handler
    Globe.onRingHover(ring => {
      if (!ring) {
        infoDiv.style.display = 'none';
        return;
      }

      const quake = ring.originalData;
      if (quake) {
        infoDiv.innerHTML = `
          <strong>${quake.location}</strong><br>
          Magnitude: ${quake.magnitude.toFixed(1)}<br>
          Depth: ${quake.depth.toFixed(1)} km<br>
          Date: ${quake.timestamp}
        `;

        const event = window.event;
        if (event) {
          infoDiv.style.left = `${event.clientX + 10}px`;
          infoDiv.style.top = `${event.clientY + 10}px`;
          infoDiv.style.display = 'block';
        }
      }
    });

  } catch (error) {
    console.error('Error:', error);
    const loadingElement = document.getElementById('earthquakeLoadingDiv');
    if (loadingElement) {
      loadingElement.innerHTML = 'Error loading earthquake data';
      setTimeout(() => loadingElement.remove(), 2000);
    }
  }
}
async function fetchPopulationData() {
  // Fallback data for major countries
  

  try {
    // Try fetching from World Bank API
    const response = await fetch('https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=300&date=2022');
    const [metadata, data] = await response.json();

    const populationData = {};
    data.forEach(item => {
      if (item.value) {
        populationData[item.countryiso3code] = {
          population: item.value,
          name: item.country.value
        };
      }
    });

    return populationData;
  } catch (error) {
    console.log('Using fallback population data');
    return fallbackData;
  }
}
async function showPopulationVisualization() {
  // Create loading indicator
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'populationLoadingDiv';
  loadingDiv.style.position = 'absolute';
  loadingDiv.style.top = '50%';
  loadingDiv.style.left = '50%';
  loadingDiv.style.transform = 'translate(-50%, -50%)';
  loadingDiv.style.color = '#ffffff';
  loadingDiv.style.fontSize = '20px';
  loadingDiv.style.zIndex = '1000';
  loadingDiv.innerHTML = 'Loading population data...';
  document.body.appendChild(loadingDiv);

  try {
    const response = await fetch('https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=300&date=2022');
    const [metadata, data] = await response.json();

    // Process the data and update globe colors
    const populationData = {};
    data.forEach(item => {
      if (item.value) {
        populationData[item.countryiso3code] = item.value;
      }
    });

    Globe
      .polygonsData(countries.features)
      .polygonCapColor((feature) => {
        const countryCode = feature.properties.ISO_A3;
        const population = populationData[countryCode];
        return getPopulationColor(population);
      })
      .polygonSideColor(() => 'rgba(255, 255, 255, 0.3)')
      .polygonStrokeColor(() => '#333333')
      .polygonAltitude(0.01)
      .polygonCapMaterial(new MeshPhongMaterial({
        shininess: 50,
        opacity: 0.95,
        transparent: true,
        side: DoubleSide
      }))
      .polygonsTransitionDuration(1000);

    // Make sure the lighting is adequate
    const ambientLight = new AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);


    // Update the vertical button with legend and explanation
    const verticalButton = document.getElementById("verticalButton");
    if (verticalButton) {
      const explanationText = `
    <div style="color: #ffffff; font-family: Arial, sans-serif;">
        <h2 style="color: #FFD700; margin-bottom: 20px; text-align: center;">Population Legend</h2>
        
        <div style="margin: 25px 0;">
            <div style="display: flex; align-items: center; margin: 15px 0;">
                <div style="width: 25px; height: 25px; background-color: #0066ff; margin-right: 15px; border-radius: 4px;"></div>
                <span>Very Low (< 1 million)</span>
            </div>
            <div style="display: flex; align-items: center; margin: 15px 0;">
                <div style="width: 25px; height: 25px; background-color: #00ff44; margin-right: 15px; border-radius: 4px;"></div>
                <span>Low (1-10 million)</span>
            </div>
            <div style="display: flex; align-items: center; margin: 15px 0;">
                <div style="width: 25px; height: 25px; background-color: #ffff00; margin-right: 15px; border-radius: 4px;"></div>
                <span>Medium (10-50 million)</span>
            </div>
            <div style="display: flex; align-items: center; margin: 15px 0;">
                <div style="width: 25px; height: 25px; background-color: #ff8c00; margin-right: 15px; border-radius: 4px;"></div>
                <span>High (50-200 million)</span>
            </div>
            <div style="display: flex; align-items: center; margin: 15px 0;">
                <div style="width: 25px; height: 25px; background-color: #ff1a1a; margin-right: 15px; border-radius: 4px;"></div>
                <span>Very High (> 200 million)</span>
            </div>
        </div>

        <div style="margin-top: 25px; text-align: center; color: #888; font-size: 12px;">
            Hover over countries to see exact population
        </div>
    </div>
`;
      typeWriter(explanationText, verticalButton);
    }

  } catch (error) {
    console.error('Error loading population data:', error);
    const verticalButton = document.getElementById("verticalButton");
    if (verticalButton) {
      verticalButton.innerHTML = 'Population density of countries around the world. It is calculated as the average number of people per square km.';
    }
  } finally {
    // Remove loading indicator
    const loadingElement = document.getElementById('populationLoadingDiv');
    if (loadingElement) {
      loadingElement.remove();
    }
  }
}
function getPopulationColor(population) {
  if (!population) return '#1a1a1a'; // Darker gray for no data

  // Using more saturated colors
  if (population < 1000000) return '#0066ff';         // Brighter blue
  if (population < 10000000) return '#00ff44';        // Vibrant green
  if (population < 50000000) return '#ffff00';        // Bright yellow
  if (population < 200000000) return '#ff8c00';       // Deep orange
  return '#ff1a1a';                                   // Bright red
}
function clearDebrisAndOrbits() {
  // Use the same implementation as in AstronautTools
  AstronautTools.clearDebrisAndOrbits(globeGroup);
}
function createVerticalButton() {
  if (document.getElementById("verticalButton")) return;

  const verticalButton = document.createElement("div");
  verticalButton.id = "verticalButton";
  verticalButton.style.position = "absolute";
  verticalButton.style.top = "50%";
  verticalButton.style.right = "20px";
  verticalButton.style.transform = "translateY(-50%)";
  verticalButton.style.width = "180px";
  verticalButton.style.height = "350px";
  verticalButton.style.backgroundColor = "#333333";
  verticalButton.style.borderRadius = "5px";
  verticalButton.style.cursor = "default";
  verticalButton.style.userSelect = "none";
  verticalButton.style.padding = "20px";
  verticalButton.style.color = "#ffffff";
  verticalButton.style.fontFamily = "'Montserrat', sans-serif";
  verticalButton.style.fontSize = "14px";
  verticalButton.style.overflowY = "auto";

  document.body.appendChild(verticalButton);
}
function typeWriter(htmlContent, element, speed = 50) {
  if (!element) return; // Guard clause to prevent errors

  element.innerHTML = ''; // Clear existing content
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  const nodes = tempDiv.childNodes;

  let index = 0;
  let charIndex = 0;

  function type() {
    if (index < nodes.length) {
      const node = nodes[index];
      if (node.nodeType === Node.TEXT_NODE) {
        if (charIndex < node.textContent.length) {
          element.innerHTML += node.textContent.charAt(charIndex);
          charIndex++;
          currentTypeWriter = setTimeout(type, speed);
        } else {
          charIndex = 0;
          index++;
          type();
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const newNode = node.cloneNode(true);
        element.appendChild(newNode);
        index++;
        type();
      }
    }
  }

  type();
}
function stopCurrentAnimation() {
  if (currentAnimation) {
    clearTimeout(currentAnimation);
    currentAnimation = null;
  }
}
function stopCurrentTypeWriter() {
  if (currentTypeWriter) {
    clearTimeout(currentTypeWriter);
    currentTypeWriter = null;
  }
}
function initAstronautTools() {
  // Initialize astronaut tools module without showing the menu
  // The menu will only be shown when the button is clicked
  console.log("Astronaut Tools module initialized");
}
function showAstronautToolsMenu() {
  clearDebrisAndOrbits();
  createVerticalButton();
  
  // Create the astronaut tools menu container
  const astronautToolsMenu = document.createElement("div");
  astronautToolsMenu.id = "astronautToolsMenu";
  astronautToolsMenu.style.position = "absolute";
  astronautToolsMenu.style.top = "50%";
  astronautToolsMenu.style.left = "100px";
  astronautToolsMenu.style.transform = "translateY(-50%)";
  astronautToolsMenu.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  astronautToolsMenu.style.borderRadius = "10px";
  astronautToolsMenu.style.padding = "20px";
  astronautToolsMenu.style.display = "flex";
  astronautToolsMenu.style.flexDirection = "column";
  astronautToolsMenu.style.gap = "15px";
  astronautToolsMenu.style.zIndex = "1000";
  astronautToolsMenu.style.maxHeight = "70vh";
  astronautToolsMenu.style.overflowY = "auto";
  
  document.body.appendChild(astronautToolsMenu);
  
  // Title for the tools menu
  const title = document.createElement("h3");
  title.innerText = "Astronaut Tools";
  title.style.color = "#ffffff";
  title.style.margin = "0 0 15px 0";
  title.style.textAlign = "center";
  title.style.fontFamily = "'Montserrat', sans-serif";
  astronautToolsMenu.appendChild(title);
  
  // Add tool buttons
  const tools = [
    {
      name: "ISS Tracker",
      description: "Track the International Space Station in real-time",
      function: showISSTracker
    },
    {
      name: "Space Weather",
      description: "Monitor space weather conditions that affect missions",
      function: showSpaceWeatherMonitor
    },
    {
      name: "Satellite Tracker",
      description: "Track nearby satellites and space objects",
      function: showSatelliteTracker
    },
    {
      name: "Radiation Monitor",
      description: "Monitor radiation levels across Earth's orbit",
      function: showRadiationMonitor
    },
    {
      name: "Communication Satellites",
      description: "View communication satellites for emergency contact",
      function: showCommSatellites
    },
    {
      name: "Earth Observation",
      description: "Access real-time Earth observation data",
      function: showEarthObservation
    }
  ];
  
  tools.forEach(tool => {
    const button = document.createElement("div");
    button.style.backgroundColor = "#0c529c";
    button.style.color = "#ffffff";
    button.style.padding = "12px 15px";
    button.style.borderRadius = "5px";
    button.style.cursor = "pointer";
    button.style.display = "flex";
    button.style.flexDirection = "column";
    button.style.transition = "all 0.3s ease";
    
    const buttonTitle = document.createElement("div");
    buttonTitle.innerText = tool.name;
    buttonTitle.style.fontWeight = "bold";
    buttonTitle.style.marginBottom = "5px";
    button.appendChild(buttonTitle);
    
    const buttonDescription = document.createElement("div");
    buttonDescription.innerText = tool.description;
    buttonDescription.style.fontSize = "12px";
    buttonDescription.style.opacity = "0.8";
    button.appendChild(buttonDescription);
    
    button.addEventListener("mouseover", () => {
      button.style.backgroundColor = "#1a6bc2";
    });
    
    button.addEventListener("mouseout", () => {
      button.style.backgroundColor = "#0c529c";
    });
    
    button.addEventListener("click", () => {
      // Clear previous visualizations
      clearAstronautTools();
      
      // Show loading indicator
      showLoadingIndicator();
      
      // Call the function for this tool after a small delay
      setTimeout(() => {
        tool.function();
        hideLoadingIndicator();
      }, 100);
    });
    
    astronautToolsMenu.appendChild(button);
  });
}

// Function to switch camera focus between Earth, Moon, and Sun
function switchCameraFocus(target, duration = 1.5) {
  if (!target) return;
  
  let targetPosition, lookAtPosition;
  let distanceFactor = 1;
  
  // Store previous focus for transition effect
  const previousFocus = cameraFocus;
  
  switch(target) {
    case 'sun':
      if (!sun) return;
      // Position the camera to get a good view of the sun
      targetPosition = new Vector3(
        sun.position.x - 50, 
        sun.position.y + 20, 
        sun.position.z + 50
      );
      lookAtPosition = sun.position.clone();
      cameraFocus = 'sun';
      
      // Disable orbit controls temporarily during transition
      controls.enabled = false;
      
      // Adjust control limits for sun viewing (allow more distance)
      controls.minDistance = 30;
      controls.maxDistance = 500;
      break;
      
    case 'moon':
      if (!moon) return;
      // Calculate distance from moon based on its size
      const moonRadius = moon.geometry.parameters.radius;
      distanceFactor = 20; // Get closer to the moon but not too close
      
      targetPosition = new Vector3(
        moon.position.x - moonRadius * distanceFactor,
        moon.position.y + moonRadius * distanceFactor * 0.5,
        moon.position.z + moonRadius * distanceFactor
      );
      lookAtPosition = moon.position.clone();
      cameraFocus = 'moon';
      
      // Disable orbit controls temporarily during transition
      controls.enabled = false;
      
      // Adjust control limits for moon viewing
      controls.minDistance = moonRadius * 5;
      controls.maxDistance = moonRadius * 50;
      break;
      
    case 'earth':
    default:
      // Get a good view of Earth
      const globeRadius = Globe.getGlobeRadius();
      targetPosition = new Vector3(
        globeGroup.position.x,
        globeGroup.position.y + globeRadius * 0.5,
        globeGroup.position.z + globeRadius * 4
      );
      lookAtPosition = globeGroup.position.clone();
      cameraFocus = 'earth';
      
      // Reset control limits for Earth viewing
      controls.minDistance = 115;
      controls.maxDistance = 1000;
      break;
  }
  
  // Find midpoint for smoother transition if switching between celestial bodies
  if (previousFocus !== cameraFocus && previousFocus && cameraFocus) {
    // Create a smoother path with a slight arc instead of direct line
    const midpoint = new Vector3().addVectors(camera.position, targetPosition).multiplyScalar(0.5);
    
    // Add some height to the midpoint for arc effect
    midpoint.y += 200;
    
    // Two-part animation for smoother experience
    gsap.timeline()
      .to(camera.position, {
        duration: duration * 0.5,
        x: midpoint.x,
        y: midpoint.y,
        z: midpoint.z,
        ease: "power1.out",
        onUpdate: () => {
          // Gradually transition where the camera is looking
          camera.lookAt(lookAtPosition);
        }
      })
      .to(camera.position, {
        duration: duration * 0.5,
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        ease: "power1.inOut",
        onUpdate: () => {
          camera.lookAt(lookAtPosition);
        },
        onComplete: () => {
          // Re-enable controls after animation
          controls.enabled = true;
          
          // Set controls target to the focused object
          controls.target.copy(lookAtPosition);
        }
      });
  } else {
    // Direct animation for first focus or same target refocus
    gsap.to(camera.position, {
      duration: duration,
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      ease: "power2.inOut",
      onUpdate: () => {
        camera.lookAt(lookAtPosition);
      },
      onComplete: () => {
        // Re-enable controls after animation
        controls.enabled = true;
        
        // Set controls target to the focused object
        controls.target.copy(lookAtPosition);
      }
    });
  }
  
  // Update the focus buttons
  updateFocusButtonsUI();
}

// Function to update the UI of focus buttons
function updateFocusButtonsUI() {
  const focusButtons = document.querySelectorAll('.focus-button');
  
  focusButtons.forEach(button => {
    const target = button.getAttribute('data-target');
    
    // Apply styling based on current focus
    if (target === cameraFocus) {
      // Highlighted styling for active focus
      button.style.backgroundColor = '#0066cc';
      button.style.border = '2px solid #0099ff';
      button.style.fontWeight = 'bold';
      button.style.boxShadow = '0 0 8px rgba(0, 153, 255, 0.7)';
      button.style.transform = 'scale(1.05)';
      button.style.transition = 'all 0.3s ease';
      
      // Update the text to show it's the current focus
      button.textContent = `Focused: ${target.charAt(0).toUpperCase() + target.slice(1)}`;
    } else {
      // Normal styling for inactive focus
      button.style.backgroundColor = '#444';
      button.style.border = '1px solid #666';
      button.style.fontWeight = 'normal';
      button.style.boxShadow = 'none';
      button.style.transform = 'scale(1)';
      button.style.transition = 'all 0.3s ease';
      
      // Reset text
      button.textContent = `Focus: ${target.charAt(0).toUpperCase() + target.slice(1)}`;
    }
  });
  
  // Also update the System View button if applicable
  let systemViewButton = null;
  
  // Find the System View button by its text content
  document.querySelectorAll('button').forEach(button => {
    if (button.textContent === 'System View') {
      systemViewButton = button;
    }
  });
  
  if (systemViewButton && !cameraFocus) {
    systemViewButton.style.backgroundColor = '#0066cc';
    systemViewButton.style.border = '2px solid #0099ff';
    systemViewButton.style.fontWeight = 'bold';
    systemViewButton.style.boxShadow = '0 0 8px rgba(0, 153, 255, 0.7)';
  } else if (systemViewButton) {
    systemViewButton.style.backgroundColor = '#444';
    systemViewButton.style.border = '1px solid #666';
    systemViewButton.style.fontWeight = 'normal';
    systemViewButton.style.boxShadow = 'none';
  }
}

function clearAstronautTools() {
  // Clear any existing astronaut tool visualizations
  Globe.ringsData([]);
  Globe.arcsData([]);
  Globe.hexPolygonsData(countries.features);
  Globe.hexPolygonResolution(3);
  Globe.hexPolygonMargin(0.7);
  
  // Clear custom meshes and objects
  globeGroup.children = globeGroup.children.filter(child => 
    !child.userData?.isAstronautTool
  );
  
  // Clear any existing interval timers
  if (window.astronautToolIntervals) {
    window.astronautToolIntervals.forEach(interval => clearInterval(interval));
    window.astronautToolIntervals = [];
  }
  
  // Clear information panel content
  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    verticalButton.innerHTML = '';
  }
}

function showLoadingIndicator() {
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loadingIndicator';
  loadingDiv.style.position = 'absolute';
  loadingDiv.style.top = '50%';
  loadingDiv.style.left = '50%';
  loadingDiv.style.transform = 'translate(-50%, -50%)';
  loadingDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  loadingDiv.style.color = '#ffffff';
  loadingDiv.style.padding = '20px 40px';
  loadingDiv.style.borderRadius = '10px';
  loadingDiv.style.fontSize = '18px';
  loadingDiv.style.zIndex = '2000';
  loadingDiv.innerHTML = 'Loading data...';
  document.body.appendChild(loadingDiv);
}

function hideLoadingIndicator() {
  const loadingElement = document.getElementById('loadingIndicator');
  if (loadingElement) {
    loadingElement.remove();
  }
}
async function showISSTracker() {
  if (!window.astronautToolIntervals) {
    window.astronautToolIntervals = [];
  }
  
  // Create ISS model
  const issGeometry = new SphereGeometry(1.5, 16, 16);
  const issMaterial = new MeshBasicMaterial({ color: 0xffff00 });
  const iss = new Mesh(issGeometry, issMaterial);
  iss.userData.isAstronautTool = true;
  globeGroup.add(iss);
  
  // Create ISS path visualization
  const pathPoints = [];
  const pathGeometry = new BufferGeometry();
  const pathMaterial = new LineBasicMaterial({ 
    color: 0xffff00, 
    transparent: true, 
    opacity: 0.7, 
    linewidth: 2
  });
  const issPath = new LineLoop(pathGeometry, pathMaterial);
  issPath.userData.isAstronautTool = true;
  globeGroup.add(issPath);
  
  // Create info panel
  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    verticalButton.innerHTML = `
      <div style="color: #ffffff; font-family: 'Montserrat', sans-serif;">
        <h3 style="color: #FFD700; margin-bottom: 15px; font-size: 18px; text-align: center;">
          ISS Live Tracker
        </h3>
        
        <div id="iss-info" style="margin-top: 15px;">
          <div style="margin-bottom: 10px;">Loading ISS data...</div>
        </div>
        
        <div style="margin-top: 25px; font-size: 12px; color: #aaa;">
          Live data from NASA's ISS tracking API. Data refreshes every 5 seconds.
        </div>
      </div>
    `;
  }
  
  // Function to update ISS position
  async function updateISSPosition() {
    try {
      // Fetch ISS position from API
      const response = await axios.get('http://api.open-notify.org/iss-now.json');
      const { latitude, longitude } = response.data.iss_position;
      
      // Update ISS position on globe
      const position = convertLatLonToXYZ(parseFloat(latitude), parseFloat(longitude), Globe.getGlobeRadius() + 5);
      iss.position.copy(position);
      
      // Add point to path
      pathPoints.push(position.clone());
      if (pathPoints.length > 100) {
        pathPoints.shift(); // Keep only last 100 positions
      }
      pathGeometry.setFromPoints(pathPoints);
      
      // Calculate ISS speed and altitude
      const orbitalPeriod = 92.68; // minutes
      const orbitalSpeed = 7.66; // km/s
      const altitude = 408; // km
      
      // Update info panel
      const issInfo = document.getElementById('iss-info');
      if (issInfo) {
        issInfo.innerHTML = `
          <div style="margin-bottom: 8px;">
            <span style="color: #aaa;">Latitude:</span> ${parseFloat(latitude).toFixed(4)}°
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #aaa;">Longitude:</span> ${parseFloat(longitude).toFixed(4)}°
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #aaa;">Altitude:</span> ${altitude} km
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #aaa;">Speed:</span> ${orbitalSpeed} km/s
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #aaa;">Orbital period:</span> ${orbitalPeriod} minutes
          </div>
          <div style="margin-bottom: 8px;">
            <span style="color: #aaa;">Updated:</span> ${new Date().toLocaleTimeString()}
          </div>
        `;
      }
      
      // Add pulses at ISS location
      Globe.ringsData([{
        lat: parseFloat(latitude),
        lng: parseFloat(longitude),
        color: 'yellow',
        altitude: 0.01,
        maxR: 3,
        propagationSpeed: 1,
        repeatPeriod: 1000
      }]);
      
    } catch (error) {
      console.error('Error fetching ISS data:', error);
    }
  }
  
  // Update immediately and then every 5 seconds
  await updateISSPosition();
  const intervalId = setInterval(updateISSPosition, 5000);
  window.astronautToolIntervals.push(intervalId);
}
async function showSpaceWeatherMonitor() {
  const NASA_API_KEY = "jmRRPCUwwWyNaMrXJCNz8HDX8q94wPnQfKz0ig5a";
  
  if (!window.astronautToolIntervals) {
    window.astronautToolIntervals = [];
  }
  
  // Create info panel
  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    verticalButton.innerHTML = `
      <div style="color: #ffffff; font-family: 'Montserrat', sans-serif;">
        <h3 style="color: #FF6B6B; margin-bottom: 15px; font-size: 18px; text-align: center;">
          Space Weather Monitor
        </h3>
        
        <div id="space-weather-info" style="margin-top: 15px;">
          <div style="margin-bottom: 10px;">Loading space weather data...</div>
        </div>
        
        <div style="margin-top: 25px; font-size: 12px; color: #aaa;">
          Data from NASA DONKI API showing solar events that could impact astronaut safety.
        </div>
      </div>
    `;
  }
  
  try {
    // Get today's date and 30 days ago in the format YYYY-MM-DD
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    // Fetch solar flare data
    const flareResponse = await axios.get(
      `https://api.nasa.gov/DONKI/FLR?startDate=${formatDate(thirtyDaysAgo)}&endDate=${formatDate(today)}&api_key=${NASA_API_KEY}`
    );
    
    // Fetch coronal mass ejection (CME) data
    const cmeResponse = await axios.get(
      `https://api.nasa.gov/DONKI/CME?startDate=${formatDate(thirtyDaysAgo)}&endDate=${formatDate(today)}&api_key=${NASA_API_KEY}`
    );
    
    // Visualize solar flares as arcs pointing to Earth
    const arcsData = flareResponse.data.map(flare => {
      // Generate a random position for the flare that is away from Earth
      const randomLon = Math.random() * 40 - 20; // -20 to 20
      const randomLat = Math.random() * 40 - 20; // -20 to 20
      
      // Determine color based on flare class
      let color;
      if (flare.classType.includes('X')) {
        color = '#FF0000'; // Red for X-class (extreme)
      } else if (flare.classType.includes('M')) {
        color = '#FFA500'; // Orange for M-class (moderate)
      } else {
        color = '#FFFF00'; // Yellow for C-class and below (minor)
      }
      
      return {
        startLat: randomLat,
        startLng: randomLon,
        endLat: 0, // Earth centered
        endLng: 0,
        color,
        arcAltitude: 0.4
      };
    });
    
    // Add CMEs as pulsating spheres
    const ringsData = cmeResponse.data.map(cme => {
      // Generate a random position for the CME
      const randomLon = Math.random() * 360 - 180;
      const randomLat = Math.random() * 180 - 90;
      
      return {
        lat: randomLat,
        lng: randomLon,
        color: '#FF5733',
        maxR: 5,
        propagationSpeed: 0.5,
        repeatPeriod: 2000
      };
    });
    
    // Apply visualizations
    Globe.arcsData(arcsData);
    Globe.ringsData(ringsData);
    
    // Create a visualization of Earth's magnetic field
    visualizeMagneticField();
    
    // Create radiation belt visualization
    visualizeRadiationBelts();
    
    // Update info panel with the most recent events
    const spaceWeatherInfo = document.getElementById('space-weather-info');
    if (spaceWeatherInfo) {
      let infoHTML = '<div style="font-size: 16px; margin-bottom: 15px; color: #FF6B6B;">Recent Space Weather Events</div>';
      
      // Add solar flare information
      if (flareResponse.data.length > 0) {
        infoHTML += '<div style="margin-bottom: 15px;"><b>Solar Flares:</b></div>';
        
        flareResponse.data.slice(0, 3).forEach(flare => {
          const flareDate = new Date(flare.beginTime).toLocaleDateString();
          infoHTML += `
            <div style="margin-bottom: 10px; padding-left: 10px; border-left: 2px solid #FF6B6B;">
              <div>Class: <span style="color: ${flare.classType.includes('X') ? '#FF0000' : flare.classType.includes('M') ? '#FFA500' : '#FFFF00'}">${flare.classType}</span></div>
              <div>Date: ${flareDate}</div>
            </div>
          `;
        });
      }
      
      // Add CME information
      if (cmeResponse.data.length > 0) {
        infoHTML += '<div style="margin-top: 15px; margin-bottom: 15px;"><b>Coronal Mass Ejections:</b></div>';
        
        cmeResponse.data.slice(0, 3).forEach(cme => {
          const cmeDate = new Date(cme.startTime).toLocaleDateString();
          const speed = cme.cmeAnalyses && cme.cmeAnalyses[0]?.speed ? cme.cmeAnalyses[0].speed : 'Unknown';
          
          infoHTML += `
            <div style="margin-bottom: 10px; padding-left: 10px; border-left: 2px solid #FF6B6B;">
              <div>Date: ${cmeDate}</div>
              <div>Speed: ${speed} km/s</div>
            </div>
          `;
        });
      }
      
      // Add current space weather conditions
      infoHTML += `
        <div style="margin-top: 20px; padding: 10px; background-color: rgba(255,255,255,0.1); border-radius: 5px;">
          <div style="margin-bottom: 5px;"><b>Current Conditions:</b></div>
          <div style="margin-bottom: 5px;">Solar Radiation: <span style="color: #00FF00;">Normal</span></div>
          <div style="margin-bottom: 5px;">Geomagnetic Field: <span style="color: #00FF00;">Stable</span></div>
          <div>Safe for EVA: <span style="color: #00FF00;">Yes</span></div>
        </div>
      `;
      
      
      spaceWeatherInfo.innerHTML = infoHTML;
    }
    
  } catch (error) {
    console.error('Error fetching space weather data:', error);
    
    // Show error in info panel
    const spaceWeatherInfo = document.getElementById('space-weather-info');
    if (spaceWeatherInfo) {
      spaceWeatherInfo.innerHTML = `
        <div style="color: #FF6B6B;">
          Error loading space weather data. Please try again later.
        </div>
      `;
    }
  }
}

function visualizeMagneticField() {
  const globeRadius = Globe.getGlobeRadius();
  const northPole = convertLatLonToXYZ(90, 0, globeRadius);
  const southPole = convertLatLonToXYZ(-90, 0, globeRadius);
  
  // Create field lines
  for (let i = 0; i < 24; i++) {
    const points = [];
    const longitude = i * 15;
    
    // Create a curved line from south to north pole
    for (let lat = -90; lat <= 90; lat += 5) {
      // Make the lines curve more near the poles
      const adjustedLon = longitude + Math.sin(lat * Math.PI / 180) * 30;
      // The further from the equator, the higher the line should go
      const altitude = globeRadius + (Math.abs(lat) / 30) * 20;
      const point = convertLatLonToXYZ(lat, adjustedLon, altitude);
      points.push(point);
    }
    
    const geometry = new BufferGeometry().setFromPoints(points);
    const material = new LineBasicMaterial({ 
      color: 0x3366ff, 
      opacity: 0.3, 
      transparent: true 
    });
    const line = new LineLoop(geometry, material);
    line.userData.isAstronautTool = true;
    globeGroup.add(line);
  }
}

function visualizeRadiationBelts() {
  const globeRadius = Globe.getGlobeRadius();
  
  // Inner Van Allen Belt
  const innerBelt = new RingGeometry(
    globeRadius + 10, 
    globeRadius + 12,
    64
  );
  const innerBeltMaterial = new MeshBasicMaterial({
    color: 0xFF6666,
    transparent: true,
    opacity: 0.15,
    side: DoubleSide
  });
  const innerBeltMesh = new Mesh(innerBelt, innerBeltMaterial);
  innerBeltMesh.rotation.x = Math.PI / 2;
  innerBeltMesh.rotation.y = Math.PI / 6;
  innerBeltMesh.userData.isAstronautTool = true;
  globeGroup.add(innerBeltMesh);
  
  // Outer Van Allen Belt
  const outerBelt = new RingGeometry(
    globeRadius + 25, 
    globeRadius + 35,
    64
  );
  const outerBeltMaterial = new MeshBasicMaterial({
    color: 0x66CCFF,
    transparent: true,
    opacity: 0.15,
    side: DoubleSide
  });
  const outerBeltMesh = new Mesh(outerBelt, outerBeltMaterial);
  outerBeltMesh.rotation.x = Math.PI / 2;
  outerBeltMesh.rotation.y = Math.PI / 6;
  outerBeltMesh.userData.isAstronautTool = true;
  globeGroup.add(outerBeltMesh);
}
async function showSatelliteTracker() {
  if (!window.astronautToolIntervals) {
    window.astronautToolIntervals = [];
  }
  
  // Create info panel
  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    verticalButton.innerHTML = `
      <div style="color: #ffffff; font-family: 'Montserrat', sans-serif;">
        <h3 style="color: #64c5eb; margin-bottom: 15px; font-size: 18px; text-align: center;">
          Satellite Tracker
        </h3>
        
        <div id="satellite-info" style="margin-top: 15px;">
          <div style="margin-bottom: 10px;">Loading satellite data...</div>
        </div>
        
        <div style="margin-top: 25px; font-size: 12px; color: #aaa;">
          Tracking key satellites using real-time TLE data and orbital calculations.
        </div>
      </div>
    `;
  }
  
  // List of important satellites to track with their NORAD IDs
  const satellites = [
    { name: "ISS (ZARYA)", id: 25544, color: 0xffff00 },
    { name: "HUBBLE", id: 20580, color: 0x00ffff },
    { name: "TIANGONG", id: 48274, color: 0xff0000 },
    { name: "GPS IIR-10", id: 28129, color: 0x00ff00 },
    { name: "IRIDIUM 133", id: 43249, color: 0xff00ff }
  ];
  
  try {
    // Create satellite objects and fetch TLE data
    const satelliteObjects = [];
    
    for (const sat of satellites) {
      try {
       // Fetch TLE data from Celestrak
        const response = await axios.get(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${sat.id}&FORMAT=TLE`);
        const tleData = response.data.trim().split('\n');
        
        if (tleData.length >= 3) {
          // Create satellite object
          const satelliteGeometry = new SphereGeometry(1.2, 8, 8);
          const satelliteMaterial = new MeshBasicMaterial({ color: sat.color });
          const satelliteMesh = new Mesh(satelliteGeometry, satelliteMaterial);
          satelliteMesh.userData = { 
            isAstronautTool: true,
            satelliteName: sat.name,
            satelliteId: sat.id
          };
          globeGroup.add(satelliteMesh);
          
          // Store satellite info
          satelliteObjects.push({
            mesh: satelliteMesh,
            name: sat.name,
            id: sat.id,
            color: sat.color,
            tle: [tleData[1], tleData[2]]
          });
          
          // Create orbit path
          const pathGeometry = new BufferGeometry();
          const pathMaterial = new LineBasicMaterial({ 
            color: sat.color, 
            transparent: true, 
            opacity: 0.5 
          });
          const orbitPath = new LineLoop(pathGeometry, pathMaterial);
          orbitPath.userData.isAstronautTool = true;
          globeGroup.add(orbitPath);
          
          // Generate and display orbit path
          const orbitPoints = calculateOrbitPoints(tleData[1], tleData[2]);
          pathGeometry.setFromPoints(orbitPoints);
        }
      } catch (error) {
        console.error(`Error fetching TLE data for ${sat.name}:`, error);
      }
    }
    
    // Update satellite positions every 5 seconds
    async function updateSatellitePositions() {
      const now = new Date();
      
      for (const sat of satelliteObjects) {
        try {
          // Calculate current position using satellite.js
          const satrec = satellite.twoline2satrec(sat.tle[0], sat.tle[1]);
          const positionAndVelocity = satellite.propagate(satrec, now);
          const positionEci = positionAndVelocity.position;
          
          if (positionEci) {
            // Convert ECI coordinates to geographic coordinates
            const gmst = satellite.gstime(now);
            const positionGd = satellite.eciToGeodetic(positionEci, gmst);
            
            // Get lat/long in degrees
            const lat = satellite.degreesLat(positionGd.latitude);
            const lng = satellite.degreesLong(positionGd.longitude);
            const alt = positionGd.height;
            
            // Update mesh position on the globe
            const position = convertLatLonToXYZ(lat, lng, Globe.getGlobeRadius() + (alt / 100));
            sat.mesh.position.copy(position);
            
            // Add to ring visualization
            Globe.ringsData([{
              lat: lat,
              lng: lng,
              color: '#' + sat.color.toString(16).padStart(6, '0'),
              altitude: 0.01,
              maxR: 1,
              propagationSpeed: 1,
              repeatPeriod: 1000
            }]);
          }
        } catch (error) {
          console.error(`Error updating position for ${sat.name}:`, error);
        }
      }
      
      // Update info panel
      const satelliteInfo = document.getElementById('satellite-info');
      if (satelliteInfo) {
        let infoHTML = '<div style="font-size: 14px; margin-bottom: 10px;">Active Satellites</div>';
        
        satelliteObjects.forEach(sat => {
          infoHTML += `
            <div style="margin-bottom: 8px; padding: 5px; background-color: rgba(0,0,0,0.2); border-left: 3px solid #${sat.color.toString(16).padStart(6, '0')}">
              <div style="font-weight: bold;">${sat.name}</div>
              <div style="font-size: 12px;">NORAD ID: ${sat.id}</div>
            </div>
          `;
        });
        
        infoHTML += `
          <div style="margin-top: 15px; font-size: 12px;">
            Last updated: ${new Date().toLocaleTimeString()}
          </div>
        `;
        
        satelliteInfo.innerHTML = infoHTML;
      }
    }
    
    // Calculate initial positions
    await updateSatellitePositions();
    
    // Update positions every 5 seconds
    const intervalId = setInterval(updateSatellitePositions, 5000);
    window.astronautToolIntervals.push(intervalId);
    
  } catch (error) {
    console.error('Error initializing satellite tracker:', error);
    
    // Show error in info panel
    const satelliteInfo = document.getElementById('satellite-info');
    if (satelliteInfo) {
      satelliteInfo.innerHTML = `
        <div style="color: #FF6B6B;">
          Error loading satellite data. Please try again later.
        </div>
      `;
    }
  }
}