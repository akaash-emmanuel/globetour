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
import * as LunarOrbiter from './components/LunarOrbiter.js';
import { createMercury, updateMercuryPosition } from './components/Mercury.js';
import { createVenus, updateVenusPosition } from './components/Venus.js';

// Import constants from Sun.js and Moon.js for camera positioning
const SUN_RADIUS = 10; // Same as in Sun.js
const MOON_RADIUS = 0.5; // Same as in Moon.js
const MOON_DISTANCE = 300; // Same as in Moon.js

let renderer, camera, scene, controls;
let Globe;
let globeGroup;
let moon; // Reference to the moon object
let sun; // Reference to the sun object
let mercury; // Reference to the Mercury object
let venus; // Reference to the Venus object
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
let toggleButtonsContainer = null; // Container for toggle buttons
// Global variable for the focus menu
let focusMenuContent = null; // Menu content container for celestial bodies

// Function to update UI when focus changes
function updateFocusButtonsUI() {
  // Update button states based on current focus
  const buttons = focusMenuContent.getElementsByTagName('button');
  Array.from(buttons).forEach(button => {
    const bodyName = button.textContent.split(' ')[1].toLowerCase();
    if (bodyName === cameraFocus) {
      button.style.backgroundColor = '#333';
      button.style.borderColor = '#555';
    } else {
      button.style.backgroundColor = '#1a1a1a';
      button.style.borderColor = '#333';
    }
  });

  // Update wavelength selector visibility for sun
  const wavelengthSelector = document.getElementById('wavelength-selector');
  if (wavelengthSelector) {
    wavelengthSelector.style.display = cameraFocus === 'sun' ? 'flex' : 'none';
  }
}

function createCelestialMenu() {
  // Create focus menu container with enhanced visibility
  const focusMenu = document.createElement("div");
  focusMenu.style.position = "absolute";
  focusMenu.style.top = "20px";
  focusMenu.style.right = "20px";
  focusMenu.style.zIndex = "1000";
  focusMenu.style.padding = "5px";
  focusMenu.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
  focusMenu.style.borderRadius = "8px";
  focusMenu.style.boxShadow = "0 0 10px rgba(255, 255, 255, 0.2)";

  // Create focus menu hamburger button
  const focusHamburger = document.createElement("div");
  focusHamburger.style.cursor = "pointer";
  focusHamburger.style.padding = "10px";
  focusHamburger.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  focusHamburger.style.borderRadius = "4px";
  focusHamburger.style.border = "1px solid rgba(255, 255, 255, 0.3)";
  focusHamburger.style.boxShadow = "0 0 5px rgba(255, 255, 255, 0.2)";
  focusHamburger.innerHTML = `
    <div style="width: 25px; height: 3px; background-color: white; margin: 5px 0;"></div>
    <div style="width: 25px; height: 3px; background-color: white, margin: 5px 0;"></div>
    <div style="width: 25px; height: 3px; background-color: white; margin: 5px 0;"></div>
  `;
  focusMenu.appendChild(focusHamburger);

  // Create Focus Menu Content using global variable with animation properties
  focusMenuContent = document.createElement("div");
  focusMenuContent.style.position = "absolute";
  focusMenuContent.style.top = "40px";
  focusMenuContent.style.right = "0";
  focusMenuContent.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
  focusMenuContent.style.borderRadius = "8px";
  focusMenuContent.style.padding = "10px";
  focusMenuContent.style.display = "none";
  focusMenuContent.style.flexDirection = "column";
  focusMenuContent.style.gap = "8px";
  focusMenuContent.style.minWidth = "150px";
  focusMenuContent.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.3), 0 0 10px rgba(74, 144, 226, 0.3)";
  focusMenuContent.style.border = "1px solid rgba(74, 144, 226, 0.3)";
  focusMenuContent.style.transition = "opacity 0.2s ease-in-out, transform 0.2s ease-out";
  focusMenuContent.style.opacity = "0";
  focusMenuContent.style.transform = "translateY(-10px)";

  // Add title to menu
  const menuTitle = document.createElement('div');
  menuTitle.textContent = 'Celestial Bodies';
  menuTitle.style.color = '#4a90e2';
  menuTitle.style.fontWeight = 'bold';
  menuTitle.style.padding = '5px 10px';
  menuTitle.style.borderBottom = '1px solid #333';
  menuTitle.style.marginBottom = '5px';
  focusMenuContent.appendChild(menuTitle);

  // Define celestial bodies
  const celestialBodies = [
    { name: 'Earth', icon: '🌍', onclick: focusOnEarth },
    { name: 'Sun', icon: '☀️', onclick: focusOnSun },
    { name: 'Moon', icon: '🌕', onclick: focusOnMoon },
    { name: 'Mercury', icon: '☿', onclick: focusOnMercury },
    { name: 'Venus', icon: '♀', onclick: focusOnVenus }
  ];

  // Create buttons for each celestial body
  celestialBodies.forEach(body => {
    const button = document.createElement('button');
    Object.assign(button.style, {
      padding: '10px 15px',
      backgroundColor: '#1a1a1a',
      color: 'white',
      border: '1px solid #333',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      width: '100%'
    });

    button.innerHTML = `${body.icon} ${body.name}`;
    button.addEventListener('click', () => {
      body.onclick();
      focusMenuContent.style.display = 'none';
      updateFocusButtonsUI();
    });

    button.addEventListener('mouseover', () => {
      button.style.backgroundColor = '#333';
    });

    button.addEventListener('mouseout', () => {
      if (body.name.toLowerCase() !== cameraFocus) {
        button.style.backgroundColor = '#1a1a1a';
      }
    });

    focusMenuContent.appendChild(button);
  });

  focusMenu.appendChild(focusMenuContent);
  document.body.appendChild(focusMenu);

  // Toggle menu on hamburger click with improved handling
  focusHamburger.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent bubbling to document
    const computedStyle = window.getComputedStyle(focusMenuContent);
    const isDisplayNone = computedStyle.display === 'none' || focusMenuContent.style.display === '';
    if (isDisplayNone) {
      focusMenuContent.style.display = 'flex';
      setTimeout(() => {
        focusMenuContent.style.opacity = '1';
        focusMenuContent.style.transform = 'translateY(0)';
      }, 10);
    } else {
      focusMenuContent.style.opacity = '0';
      setTimeout(() => {
        focusMenuContent.style.display = 'none';
      }, 200);
    }
  });

  // Close menu when clicking outside with improved handling
  document.addEventListener('click', (event) => {
    if (window.getComputedStyle(focusMenuContent).display !== 'none') {
      if (!focusMenu.contains(event.target)) {
        focusMenuContent.style.opacity = '0';
        setTimeout(() => {
          focusMenuContent.style.display = 'none';
        }, 200);
      }
    }
  });

  // Initial UI update
  updateFocusButtonsUI();
  
  // Add debug overlay for celestial menu
  const debugButton = document.createElement("button");
  debugButton.textContent = "Debug Celestial Menu";
  debugButton.style.position = "absolute";
  debugButton.style.top = "20px";
  debugButton.style.right = "80px";
  debugButton.style.zIndex = "2000";
  debugButton.style.padding = "5px";
  debugButton.style.backgroundColor = "#333";
  debugButton.style.color = "#fff";
  debugButton.style.border = "1px solid #555";
  debugButton.style.cursor = "pointer";
  debugButton.style.display = "none"; // Hidden by default, enable for debugging
  
  debugButton.addEventListener("click", () => {
    console.log("Celestial Menu Debug:");
    console.log("- Display:", window.getComputedStyle(focusMenuContent).display);
    console.log("- Opacity:", window.getComputedStyle(focusMenuContent).opacity);
    console.log("- zIndex:", window.getComputedStyle(focusMenuContent).zIndex);
    
    // Toggle visibility
    if (focusMenuContent.style.display === "none" || focusMenuContent.style.display === "") {
      focusMenuContent.style.display = "flex";
      focusMenuContent.style.opacity = "1";
      focusMenuContent.style.transform = "translateY(0)";
    } else {
      focusMenuContent.style.display = "none";
    }
  });
  
  document.body.appendChild(debugButton);
  
  console.log("Celestial menu created successfully");
}

// Focus functions for celestial bodies
function focusOnEarth() {
  switchCameraFocus('earth');
  focusMenuContent.style.display = 'none';
  updateFocusButtonsUI();
}

function focusOnSun() {
  switchCameraFocus('sun');
  focusMenuContent.style.display = 'none';
  updateFocusButtonsUI();
}

function focusOnMoon() {
  switchCameraFocus('moon');
  focusMenuContent.style.display = 'none';
  updateFocusButtonsUI();
}

function focusOnMercury() {
  switchCameraFocus('mercury');
  focusMenuContent.style.display = 'none';
  updateFocusButtonsUI();
}

function focusOnVenus() {
  switchCameraFocus('venus');
  focusMenuContent.style.display = 'none';
  updateFocusButtonsUI();
}

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.overflow = "hidden";
  
  // Debug info
  console.log("Initializing Globe Tour application...");

  scene = new Scene();
  scene.add(new AmbientLight(0xffffff, 0.3));    // set ambient lighting to the screen (scene), a tint of color branching from one point or all over
  scene.background = new Color(0x000000);        // black space color

  camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 30000);   // set camera view with increased far plane
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
  createCelestialMenu(); // Add the new celestial bodies menu
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
  const starGeometry = new SphereGeometry(3, 8, 8);
  const colors = [0x0000ff, 0xff0000, 0xffff00, 0xffffff, 0x00ff00];
  
  // Define multiple origin points for star clusters
  const originPoints = [
    {x: 0, y: 0, z: 0},              // Original center point
    {x: -5000, y: 3000, z: 2000},    // New cluster point 1
    {x: 6000, y: -2000, z: 4000},    // New cluster point 2
    {x: -3000, y: -5000, z: -4000},  // New cluster point 3
    {x: 7000, y: 5000, z: -3000},   // New cluster point 4
    {x: 10000, y: 10000, z: 10000},    // Top-right-front octant
    {x: -10000, y: -10000, z: -10000}, // Bottom-left-back octant
    {x: 10000, y: -10000, z: 10000},   // Bottom-right-front octant
    {x: -10000, y: 10000, z: -10000},  // Top-left-back octant
    {x: -10000, y: 10000, z: 10000},   // Top-left-front octant
    {x: 10000, y: -10000, z: -10000},
  ];

  // Distribute the 20000 stars among these origin points
  for (let i = 0; i < 20000; i++) {
    const starColor = colors[Math.floor(Math.random() * colors.length)];
    const starMaterial = new MeshBasicMaterial({ color: starColor });
    const star = new Mesh(starGeometry, starMaterial);

    // Choose a random origin point for this star
    const origin = originPoints[Math.floor(Math.random() * originPoints.length)];
    
    // Generate the star's position using spherical coordinates from the chosen origin
    const distance = Math.random() * 10000 + 1500;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    // Position relative to the chosen origin point - FIXED Z COORDINATE!
    star.position.x = origin.x + distance * Math.sin(phi) * Math.cos(theta);
    star.position.y = origin.y + distance * Math.sin(phi) * Math.sin(theta);
    star.position.z = origin.z + distance * Math.cos(phi);  // This line was wrong

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
function initSun() {
  // Create the sun and add it to the scene
  sun = Sun.createSun(scene);
  
  // Add UI control for sun visibility
  addSunToggleButton();
  
  // Add UI control for sun wavelength selection
  addSunWavelengthSelector();
}

// Add UI control for selecting SDO wavelength
function addSunWavelengthSelector() {
  const wavelengthContainer = document.createElement('div');
  wavelengthContainer.style.position = 'absolute';
  wavelengthContainer.style.bottom = '50px';
  wavelengthContainer.style.left = '100px';
  wavelengthContainer.style.padding = '8px';
  wavelengthContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
  wavelengthContainer.style.borderRadius = '4px';
  wavelengthContainer.style.zIndex = '1000';
  wavelengthContainer.style.display = 'flex';
  wavelengthContainer.style.flexDirection = 'column';
  wavelengthContainer.style.gap = '5px';
  
  // Label for the wavelength selector
  const wavelengthLabel = document.createElement('div');
  wavelengthLabel.textContent = 'SDO Wavelength:';
  wavelengthLabel.style.color = 'white';
  wavelengthLabel.style.fontWeight = 'bold';
  wavelengthLabel.style.fontSize = '12px';
  wavelengthLabel.style.marginBottom = '5px';
  
  // Select element for wavelength options
  const wavelengthSelect = document.createElement('select');
  wavelengthSelect.style.padding = '4px';
  wavelengthSelect.style.backgroundColor = '#333';
  wavelengthSelect.style.color = 'white';
  wavelengthSelect.style.border = '1px solid #555';
  wavelengthSelect.style.borderRadius = '3px';
  wavelengthSelect.style.cursor = 'pointer';
  
  // Add wavelength options
  const wavelengths = [
    { value: '304', label: '304Å - Chromosphere (Red)' },
    { value: '171', label: '171Å - Corona (Gold)' },
    { value: '193', label: '193Å - Corona (Green)' },
    { value: '211', label: '211Å - Corona (Purple)' },
    { value: '131', label: '131Å - Flares (Blue)' },
    { value: '335', label: '335Å - Active Regions (Blue)' },
    { value: '094', label: '94Å - Solar Flares (Green)' },
    { value: '1600', label: '1600Å - Photosphere/Transition Region' },
    { value: '1700', label: '1700Å - Temperature Minimum (Pink)' }
  ];
  
  wavelengths.forEach(wl => {
    const option = document.createElement('option');
    option.value = wl.value;
    option.textContent = wl.label;
    wavelengthSelect.appendChild(option);
  });
  
  // Event listener for wavelength changes
  wavelengthSelect.addEventListener('change', (event) => {
    if (sun) {
      const selectedWavelength = event.target.value;
      Sun.changeSunWavelength(sun, selectedWavelength);
    }
  });
  
  // Add info icon and tooltip for educational context
  const infoContainer = document.createElement('div');
  infoContainer.style.display = 'flex';
  infoContainer.style.alignItems = 'center';
  infoContainer.style.marginTop = '5px';
  
  const infoIcon = document.createElement('span');
  infoIcon.innerHTML = '&#9432;'; // Information icon
  infoIcon.style.color = '#3498db';
  infoIcon.style.marginRight = '5px';
  infoIcon.style.cursor = 'pointer';
  infoIcon.style.fontSize = '14px';
  
  const infoText = document.createElement('span');
  infoText.textContent = 'Real-time Solar Dynamics Observatory imagery';
  infoText.style.color = '#aaa';
  infoText.style.fontSize = '11px';
  
  // Add tooltip showing what SDO wavelengths mean
  infoIcon.addEventListener('mouseover', () => {
    const tooltip = document.createElement('div');
    tooltip.id = 'sdo-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.bottom = '120px';
    tooltip.style.left = '100px';
    tooltip.style.width = '250px';
    tooltip.style.padding = '10px';
    tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '12px';
    tooltip.style.zIndex = '1010';
    tooltip.style.lineHeight = '1.4';
    
    tooltip.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">NASA's Solar Dynamics Observatory (SDO)</div>
      <div style="margin-bottom: 8px;">Different wavelengths reveal different layers of the Sun:</div>
      <div style="margin-bottom: 4px;"><span style="color: #ff9e9e;">304Å</span> - Chromosphere and transition region</div>
      <div style="margin-bottom: 4px;"><span style="color: #ffd700;">171Å</span> - Quiet corona, upper transition region</div>
      <div style="margin-bottom: 4px;"><span style="color: #a1ffa1;">193Å</span> - Corona/hot flare plasma</div>
      <div style="margin-bottom: 4px;"><span style="color: #c991ff;">211Å</span> - Active region corona</div>
      <div style="margin-bottom: 8px;"><span style="color: #80c1ff;">131Å</span> - Flaring regions of the corona</div>
      <div style="font-style: italic; font-size: 11px;">Images update automatically every 10 minutes</div>
    `;
    
    document.body.appendChild(tooltip);
  });
  
  infoIcon.addEventListener('mouseout', () => {
    const tooltip = document.getElementById('sdo-tooltip');
    if (tooltip) {
      document.body.removeChild(tooltip);
    }
  });
  
  infoContainer.appendChild(infoIcon);
  infoContainer.appendChild(infoText);
  
  // Add elements to container
  wavelengthContainer.appendChild(wavelengthLabel);
  wavelengthContainer.appendChild(wavelengthSelect);
  wavelengthContainer.appendChild(infoContainer);
  
  // Only show when sun is visible and in focus
  wavelengthContainer.style.display = 'none';
  wavelengthContainer.id = 'wavelength-selector';
  
  document.body.appendChild(wavelengthContainer);
}
function initMoon() {
  // Get the Earth globe radius for proper scaling
  const globeRadius = Globe.getGlobeRadius();
  
  // Create the moon and add it to the scene
  moon = Moon.createMoon(scene, globeRadius);
}
function initMercury() {
  // Create Mercury and add it to the scene
  mercury = createMercury(scene, sun);
}

function initVenus() {
  // Create Venus and add it to the scene
  venus = createVenus(scene, sun);
}
function addSunToggleButton() {
  // Create a container for toggle buttons at the bottom
  toggleButtonsContainer = document.createElement('div');
  toggleButtonsContainer.style.position = 'absolute';
  toggleButtonsContainer.style.bottom = '10px';
  toggleButtonsContainer.style.left = '10px';
  toggleButtonsContainer.style.display = 'flex';
  toggleButtonsContainer.style.gap = '10px';
  toggleButtonsContainer.style.zIndex = '1000';
  document.body.appendChild(toggleButtonsContainer);

  // Common button styles
  const buttonStyle = {
    padding: '8px 12px',
    backgroundColor: '#444',
    color: 'white',
    border: '1px solid #666',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  };

  // Create Sun toggle button
  const sunToggleButton = document.createElement('button');
  sunToggleButton.textContent = 'Sun: ON';
  Object.assign(sunToggleButton.style, buttonStyle);

  // Create Earth orbit toggle button
  const earthOrbitToggle = document.createElement('button');
  earthOrbitToggle.textContent = 'Earth Orbit: ON';
  Object.assign(earthOrbitToggle.style, buttonStyle);

  // Create Mercury orbit toggle button
  const mercuryOrbitToggle = document.createElement('button');
  mercuryOrbitToggle.textContent = 'Mercury Orbit: ON';
  Object.assign(mercuryOrbitToggle.style, buttonStyle);

  // Create Venus orbit toggle button
  const venusOrbitToggle = document.createElement('button');
  venusOrbitToggle.textContent = 'Venus Orbit: ON';
  Object.assign(venusOrbitToggle.style, buttonStyle);

  // Add buttons to toggle container
  toggleButtonsContainer.appendChild(sunToggleButton);
  toggleButtonsContainer.appendChild(earthOrbitToggle);
  toggleButtonsContainer.appendChild(mercuryOrbitToggle);
  toggleButtonsContainer.appendChild(venusOrbitToggle);

  // Earth orbit toggle logic
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

  // Mercury orbit toggle logic
  window.isMercuryOrbiting = true;
  mercuryOrbitToggle.addEventListener('click', () => {
    window.isMercuryOrbiting = !window.isMercuryOrbiting;
    mercuryOrbitToggle.textContent = `Mercury Orbit: ${window.isMercuryOrbiting ? 'ON' : 'OFF'}`;
    mercuryOrbitToggle.style.backgroundColor = window.isMercuryOrbiting ? '#444' : '#333';
    mercuryOrbitToggle.style.border = window.isMercuryOrbiting ? '1px solid #666' : '1px solid #444';
    // Optionally reset Mercury position when turning orbit off
    if (!window.isMercuryOrbiting && mercury) {
      mercury.position.set(0, 0, 0);
    }
  });
  
  // Venus orbit toggle logic
  window.isVenusOrbiting = true;
  venusOrbitToggle.addEventListener('click', () => {
    window.isVenusOrbiting = !window.isVenusOrbiting;
    venusOrbitToggle.textContent = `Venus Orbit: ${window.isVenusOrbiting ? 'ON' : 'OFF'}`;
    venusOrbitToggle.style.backgroundColor = window.isVenusOrbiting ? '#444' : '#333';
    venusOrbitToggle.style.border = window.isVenusOrbiting ? '1px solid #666' : '1px solid #444';
    // Optionally reset Venus position when turning orbit off
    if (!window.isVenusOrbiting && venus) {
      venus.position.set(0, 0, 0);
    }
  });

  // Sun toggle button logic
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
// Moon toggle button removed
// Mercury toggle button removed
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
  
  // Update Mercury's position around the Sun
  if (mercury && sun) {
    if (window.isMercuryOrbiting) {
      updateMercuryPosition(mercury, sun, deltaTime);
    }
  }
  
  // Update Venus's position around the Sun
  if (venus && sun) {
    if (window.isVenusOrbiting !== false) { // Default to true if not set
      updateVenusPosition(venus, sun, deltaTime);
    }
  }

  // Update LRO position if it exists
  scene.traverse((object) => {
    if (object.userData && object.userData.isLRO && moon) {
      // Use the imported LunarOrbiter module
      LunarOrbiter.updateLROPosition(object, moon, deltaTime);
    }
  });
  
  // Update camera to follow moving objects when in focus
  updateCameraForMovingObjects();
  
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
function updateCameraForMovingObjects() {
  if (!cameraFocus || !controls.enabled) return;
  
  // Get current target position and ensure it's a Vector3
  const currentTarget = controls.target.clone(); // Clone to ensure we have a Vector3
  
  // Get current distance from camera to target
  const currentDistance = camera.position.distanceTo(currentTarget);
  
  // Get target position based on focus
  let targetPosition;
  
  if (cameraFocus === 'earth' && globeGroup) {
    targetPosition = globeGroup.position.clone();
  } else if (cameraFocus === 'moon' && moon) {
    targetPosition = moon.position.clone();
  } else if (cameraFocus === 'sun' && sun) {
    targetPosition = sun.position.clone();
  } else if (cameraFocus === 'mercury' && mercury) {
    targetPosition = mercury.position.clone();
  } else if (cameraFocus === 'venus' && venus) {
    targetPosition = venus.position.clone();
  }
  
  if (targetPosition) {
    // Update controls target to follow the object
    controls.target.copy(targetPosition);
    
    // Calculate new camera position
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
    // Stop any current animations and clear text
    stopCurrentAnimation();
    stopCurrentTypeWriter();
    
    // Clear any existing globe visualizations
    Globe.arcsData([]);
    AstronautTools.clearDebrisAndOrbits(globeGroup);
    
    // Show the astronaut tools menu
    AstronautTools.showAstronautToolsMenu(scene, Globe, globeGroup, camera);
    
    // Hide the main menu once astronaut tools are opened
    menuContent.style.display = "none";
    
    console.log("Astronaut Tools menu initialized");
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
// Population visualization functionality has been removed as it was no longer needed
function clearDebrisAndOrbits() {
  // Use the same implementation as in AstronautTools
  AstronautTools.clearDebrisAndOrbits(globeGroup);
  
  // Also reset global UI elements that might be affected
  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    verticalButton.innerHTML = '';
  }
  
  // Remove astronaut tools menu if it exists
  const astronautToolsMenu = document.getElementById("astronautToolsMenu");
  if (astronautToolsMenu) {
    astronautToolsMenu.remove();
  }
}
function createVerticalButton() {
  if (document.getElementById("verticalButton")) return;

  const verticalButton = document.createElement("div");
  verticalButton.id = "verticalButton";
  verticalButton.style.position = "absolute";
  verticalButton.style.top = "50%";
  verticalButton.style.right = "20px";
  verticalButton.style.transform = "translateY(-50%)";
  verticalButton.style.width = "280px";
  verticalButton.style.minHeight = "200px";
  verticalButton.style.maxHeight = "70vh";
  verticalButton.style.backgroundColor = "rgba(10, 20, 40, 0.85)";
  verticalButton.style.borderRadius = "12px";
  verticalButton.style.padding = "20px";
  verticalButton.style.color = "#ffffff";
  verticalButton.style.fontFamily = "'Montserrat', sans-serif";
  verticalButton.style.fontSize = "14px";
  verticalButton.style.overflowY = "auto";
  verticalButton.style.boxShadow = "0 0 15px rgba(0, 0, 0, 0.4)";
  verticalButton.style.zIndex = "1000";

  document.body.appendChild(verticalButton);
  return verticalButton;
}
function switchCameraFocus(target, duration = 1.5) {
  if (!target) return;
  
  let targetPosition, lookAtPosition;
  let distanceFactor = 1;
  
  // Store previous focus for transition effect
  const previousFocus = cameraFocus;
  
  // Toggle wavelength selector visibility based on focus
  const wavelengthSelector = document.getElementById('wavelength-selector');
  if (wavelengthSelector) {
    wavelengthSelector.style.display = target === 'sun' ? 'flex' : 'none';
  }
  
  switch(target) {
    case 'sun':
      if (!sun) return;
      // Use the sun's radius to keep the camera outside the sun
      const sunRadius = sun.geometry && sun.geometry.parameters && sun.geometry.parameters.radius ? sun.geometry.parameters.radius : 10;
      const sunDistance = sunRadius * 4; // 4x radius away from center
      targetPosition = new Vector3(
        sun.position.x - sunDistance,
        sun.position.y + sunRadius * 0.5,
        sun.position.z + sunDistance
      );
      lookAtPosition = sun.position.clone();
      cameraFocus = 'sun';
      // Disable orbit controls temporarily during transition
      controls.enabled = false;
      // Adjust control limits for sun viewing (allow more distance)
      controls.minDistance = sunRadius * 1.2;
      controls.maxDistance = sunRadius * 20;
      break;
      
    case 'moon':
      if (!moon) return;
      // Calculate distance from moon based on its size
      const moonRadius = moon.geometry.parameters.radius;
      distanceFactor = 2; // Get much closer to the moon
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
      controls.minDistance = moonRadius * 0.5;
      controls.maxDistance = moonRadius * 20;
      break;
      
    case 'mercury':
      if (!mercury) return;
      // Calculate distance from mercury based on its size
      const mercuryRadius = mercury.geometry && mercury.geometry.parameters && mercury.geometry.parameters.radius ? mercury.geometry.parameters.radius : 2;
      distanceFactor = 2; // Get much closer to Mercury
      targetPosition = new Vector3(
        mercury.position.x - mercuryRadius * distanceFactor,
        mercury.position.y + mercuryRadius * distanceFactor * 0.5,
        mercury.position.z + mercuryRadius * distanceFactor
      );
      lookAtPosition = mercury.position.clone();
      cameraFocus = 'mercury';
      controls.enabled = false;
      controls.minDistance = mercuryRadius * 0.5;
      controls.maxDistance = mercuryRadius * 20;
      break;
      
    case 'venus':
      if (!venus) return;
      // Calculate distance from venus based on its size
      const venusRadius = venus.geometry && venus.geometry.parameters && venus.geometry.parameters.radius ? venus.geometry.parameters.radius : 2;
      distanceFactor = 2; // Get much closer to Venus
      targetPosition = new Vector3(
        venus.position.x - venusRadius * distanceFactor,
        venus.position.y + venusRadius * distanceFactor * 0.5,
        venus.position.z + venusRadius * distanceFactor
      );
      lookAtPosition = venus.position.clone();
      cameraFocus = 'venus';
      controls.enabled = false;
      controls.minDistance = venusRadius * 0.5;
      controls.maxDistance = venusRadius * 20;
      break;
      
    case 'earth':
    default:
      // Get a closer view of Earth
      const globeRadius = Globe.getGlobeRadius();
      targetPosition = new Vector3(
        globeGroup.position.x,
        globeGroup.position.y + globeRadius * 0.5,
        globeGroup.position.z + globeRadius * 0.5 // was *4, now *2 for closer view
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
  
  // Reset menu and UI elements
  const menuContainer = document.getElementById('astronaut-tools-menu');
  if (menuContainer) {
    document.body.removeChild(menuContainer);
  }
  
  // Update focus UI to reflect changes
  updateFocusButtonsUI();
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
function addMercuryFocusButton() {
  const mercuryFocusButton = document.createElement('button');
  mercuryFocusButton.className = 'focus-button';
  mercuryFocusButton.setAttribute('data-target', 'mercury');
  mercuryFocusButton.textContent = 'Focus: Mercury';
  mercuryFocusButton.style.position = 'absolute';
  mercuryFocusButton.style.top = '50px';
  mercuryFocusButton.style.left = '350px';
  mercuryFocusButton.style.padding = '8px 12px';
  mercuryFocusButton.style.backgroundColor = '#444';
  mercuryFocusButton.style.color = 'white';
  mercuryFocusButton.style.border = '1px solid #666';
  mercuryFocusButton.style.borderRadius = '4px';
  mercuryFocusButton.style.cursor = 'pointer';
  mercuryFocusButton.style.zIndex = '1000';
  
  mercuryFocusButton.addEventListener('click', () => {
    cameraFocus = 'mercury';
    updateFocusButtonsUI();
  });
  
  document.body.appendChild(mercuryFocusButton);
}

function addVenusFocusButton() {
  const venusFocusButton = document.createElement('button');
  venusFocusButton.className = 'focus-button';
  venusFocusButton.setAttribute('data-target', 'venus');
  venusFocusButton.textContent = 'Focus: Venus';
  venusFocusButton.style.position = 'absolute';
  venusFocusButton.style.top = '50px';
  venusFocusButton.style.left = '500px';
  venusFocusButton.style.padding = '8px 12px';
  venusFocusButton.style.backgroundColor = '#444';
  venusFocusButton.style.color = 'white';
  venusFocusButton.style.border = '1px solid #666';
  venusFocusButton.style.borderRadius = '4px';
  venusFocusButton.style.cursor = 'pointer';
  venusFocusButton.style.zIndex = '1000';
  
  venusFocusButton.addEventListener('click', () => {
    cameraFocus = 'venus';
    updateFocusButtonsUI();
  });
  
  document.body.appendChild(venusFocusButton);
}

// Helper functions for animations
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

// Initialize everything
init();
globeGroup = initGlobe();
drawCountryBorders();
addCountryLabels();
addStars();
shootingStars();
prepareAmbientMusic();
initSun(); // Initialize the sun first
initMercury(); // Initialize Mercury after sun
initVenus(); // Initialize Venus after Mercury
initMoon(); // Initialize the moon
createCelestialMenu(); // Create menu after celestial bodies are initialized
onWindowResize();
animate();
createButtons();
initAstronautTools(); // Initialize Astronaut Tools system

function initAstronautTools() {
  // Initialize global collection for tracking interval IDs
  window.astronautToolIntervals = window.astronautToolIntervals || [];
  
  // Initialize global variables for tracking active tools
  window.activeAstronautTool = null;
  window.currentToolCleanup = null;
  
  // Add global cleanup function to window for access from any component
  window.clearAstronautTools = () => {
    // Clean up any active tool
    if (window.currentToolCleanup && typeof window.currentToolCleanup === 'function') {
      window.currentToolCleanup();
      window.currentToolCleanup = null;
    }
    
    // Clear all intervals
    if (window.astronautToolIntervals && window.astronautToolIntervals.length > 0) {
      window.astronautToolIntervals.forEach(interval => clearInterval(interval));
      window.astronautToolIntervals = [];
    }
    
    // Clear active tool reference
    window.activeAstronautTool = null;
  };
  
  // Set up astronaut tools system
  console.log('Astronaut Tools system initialized');
  
  // No need to do anything else at startup - tools are activated on demand via the menu
}