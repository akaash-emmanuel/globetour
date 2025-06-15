import ThreeGlobe from "three-globe";
import { WebGLRenderer, Scene, PerspectiveCamera, AmbientLight, DirectionalLight, MeshBasicMaterial, Mesh, Color, Fog, PointLight, Group, Vector3, Vector2, BufferGeometry, SphereGeometry, CanvasTexture, SpriteMaterial, Sprite, CylinderGeometry, LineLoop, LineBasicMaterial, Raycaster, RingGeometry, DoubleSide, Clock } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import countries from "./assets/Updated Globe Data.json";
import spaceMusic from "./assets/spacemusic.mp3";
import gsap from 'gsap';
import * as satellite from 'satellite.js';
import axios from 'axios';
import { createSpaceBackground, createSpaceSkybox } from './components/SpaceBackground.js';

// Import the astronaut tools components
import * as AstronautTools from './components/AstronautTools.js';
import * as Moon from './components/Moon.js';
import * as Sun from './components/Sun.js';
import * as LunarOrbiter from './components/LunarOrbiter.js';
import { stopCurrentAnimation } from './components/LunarOrbiter.js';
import { createMercury, updateMercuryPosition } from './components/Mercury.js';
import { createVenus, updateVenusPosition } from './components/Venus.js';
import { createMars, updateMarsPosition } from './components/Mars.js';
import { createJupiter, updateJupiterPosition, toggleJupiterVisibility } from './components/Jupiter.js';
import { createSaturn, updateSaturnPosition, toggleSaturnVisibility, SATURN_RADIUS } from './components/Saturn.js';
import { createAsteroidBelt, updateAsteroidBelt, toggleAsteroidBeltVisibility } from './components/AsteroidBelt.js';
import { createUranus, updateUranusPosition, URANUS_RADIUS } from './components/Uranus.js';
import { createNeptune, updateNeptunePosition, toggleNeptuneVisibility, NEPTUNE_RADIUS } from './components/Neptune.js';


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
let mars; // Reference to the Mars object
let jupiter; // Reference to the Jupiter object
let saturn; // Reference to the Saturn object
let uranus; // Reference to the Uranus object
let neptune; // Reference to the Neptune object
let audio;
let audioPlayed = false;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let currentAnimation = null;
let currentTypeWriter = null;
let mouseX = 0;
let mouseY = 0;
let isGlobeRotating = true;
let clock = new Clock(); // For tracking time in animations
let cameraFocus = 'earth'; // Current camera focus: 'earth', 'sun', or 'moon'

// Initialize globals
let currentTool = null;
let toolCleanupFunction = null;
// Global variable for the focus menu
let focusMenuContent = null; // Menu content container for celestial bodies

// Typewriter effect function
function typeWriter(htmlContent, targetElement, speed = 50) {
  if (!targetElement || !htmlContent) return;
  
  // Stop any currently running typewriter
  stopCurrentTypeWriter();
  
  // Clear the target element
  targetElement.innerHTML = '';
  
  // Parse HTML content to handle tags properly
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  let textIndex = 0;
  const fullText = tempDiv.innerHTML;
  
  function type() {
    if (textIndex < fullText.length) {
      // Get current character
      let char = fullText.charAt(textIndex);
      
      // Handle HTML tags - if we encounter '<', include everything until '>'
      if (char === '<') {
        let tagEnd = fullText.indexOf('>', textIndex);
        if (tagEnd !== -1) {
          // Include the entire tag
          targetElement.innerHTML = fullText.substring(0, tagEnd + 1);
          textIndex = tagEnd + 1;
        } else {
          // Fallback if no closing tag found
          targetElement.innerHTML = fullText.substring(0, textIndex + 1);
          textIndex++;
        }
      } else {
        // Regular character
        targetElement.innerHTML = fullText.substring(0, textIndex + 1);
        textIndex++;
      }
      
      // Continue typing with setTimeout
      currentTypeWriter = setTimeout(type, speed);
    } else {
      // Typing complete
      currentTypeWriter = null;
    }
  }
  
  // Start typing
  type();
}

// Function to stop current typewriter animation
function stopCurrentTypeWriter() {
  if (currentTypeWriter) {
    clearTimeout(currentTypeWriter);
    currentTypeWriter = null;
  }
}

// Function to update UI when focus changes
function updateFocusButtonsUI() {
  // Check if focusMenuContent exists before proceeding
  if (!focusMenuContent) {
    console.warn('focusMenuContent not initialized yet');
    return;
  }
  
  // Update button states based on current focus
  const buttons = focusMenuContent.getElementsByTagName('button');
  Array.from(buttons).forEach(button => {
    // Extract body name from button text, handling various formats safely
    const textParts = button.textContent.split(' ');
    const bodyName = textParts.length > 1 ? textParts[1].toLowerCase() : textParts[0].toLowerCase();
    
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

  // Remove any existing planet-specific monitor buttons
  const existingMonitorButtons = document.getElementById('planet-monitor-buttons');
  if (existingMonitorButtons) {
    existingMonitorButtons.remove();
  }

  // Create planet-specific atmospheric monitor buttons
  createPlanetSpecificMonitorButtons();
}

// Function to create planet-specific monitor buttons when focusing on planets
function createPlanetSpecificMonitorButtons() {
  // Define which planets have atmospheric monitors available
  const planetMonitors = {
    'mars': {
      name: 'Mars Weather Monitor',
      icon: '🌪️',
      description: 'Real-time Mars atmospheric conditions',
      function: 'showMarsWeatherMonitor'
    },
    'venus': {
      name: 'Venus Atmospheric Monitor', 
      icon: '🔥',
      description: 'Venus extreme atmospheric conditions',
      function: 'showVenusAtmosphericMonitor'
    },
    'jupiter': {
      name: 'Jupiter Atmospheric Monitor',
      icon: '🌀', 
      description: 'Jupiter atmospheric data from Juno mission',
      function: 'showJupiterAtmosphericMonitor'
    },
    'saturn': {
      name: 'Saturn Atmospheric Monitor',
      icon: '💍',
      description: 'Saturn rings and atmospheric data from Cassini',
      function: 'showSaturnAtmosphericMonitor'
    }
  };

  // Check if current focus has an atmospheric monitor
  const currentMonitor = planetMonitors[cameraFocus];
  if (!currentMonitor) {
    return; // No monitor available for this celestial body
  }

  // Create container for planet-specific monitor buttons
  const monitorButtonsContainer = document.createElement('div');
  monitorButtonsContainer.id = 'planet-monitor-buttons';
  monitorButtonsContainer.style.position = 'absolute';
  monitorButtonsContainer.style.top = '70px';
  monitorButtonsContainer.style.right = '20px';
  monitorButtonsContainer.style.zIndex = '1000';
  monitorButtonsContainer.style.display = 'flex';
  monitorButtonsContainer.style.flexDirection = 'column';
  monitorButtonsContainer.style.gap = '10px';

  // Create the atmospheric monitor button
  const monitorButton = document.createElement('button');
  monitorButton.style.padding = '12px 16px';
  monitorButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  monitorButton.style.color = '#ffffff';
  monitorButton.style.border = '2px solid #00ffff';
  monitorButton.style.borderRadius = '8px';
  monitorButton.style.cursor = 'pointer';
  monitorButton.style.fontFamily = "'Montserrat', sans-serif";
  monitorButton.style.fontSize = '14px';
  monitorButton.style.fontWeight = 'bold';
  monitorButton.style.transition = 'all 0.3s ease';
  monitorButton.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.3)';
  monitorButton.style.display = 'flex';
  monitorButton.style.alignItems = 'center';
  monitorButton.style.gap = '8px';
  monitorButton.style.minWidth = '200px';

  monitorButton.innerHTML = `
    <span style="font-size: 16px;">${currentMonitor.icon}</span>
    <div style="display: flex; flex-direction: column; align-items: flex-start;">
      <div style="font-size: 14px; font-weight: bold;">${currentMonitor.name}</div>
      <div style="font-size: 11px; opacity: 0.8; color: #aaa;">${currentMonitor.description}</div>
    </div>
  `;

  // Add hover effects
  monitorButton.addEventListener('mouseover', () => {
    monitorButton.style.backgroundColor = 'rgba(0, 255, 255, 0.2)';
    monitorButton.style.transform = 'translateY(-2px)';
    monitorButton.style.boxShadow = '0 4px 20px rgba(0, 255, 255, 0.5)';
  });

  monitorButton.addEventListener('mouseout', () => {
    monitorButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    monitorButton.style.transform = 'translateY(0)';
    monitorButton.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.3)';
  });

  // Add click handler to launch the atmospheric monitor
  monitorButton.addEventListener('click', () => {
    // Get the planet name from the current focus
    const planetName = cameraFocus;
    
    // Switch camera focus to the planet first
    switchCameraFocus(planetName, 1.5);
    
    // Wait for camera transition to complete, then launch monitor
    setTimeout(() => {
      // Import the required functions dynamically and call the appropriate monitor
      import('./components/AstronautTools.js').then(AstronautToolsModule => {
        // Clear any existing tools first
        AstronautToolsModule.clearAstronautTools(Globe, globeGroup);
        AstronautToolsModule.clearDebrisAndOrbits(globeGroup);
        
        // Create vertical info panel
        AstronautToolsModule.createVerticalButton();
        
        // Show loading indicator
        AstronautToolsModule.showLoadingIndicator();
        
        // Call the appropriate monitor function based on current planet
        setTimeout(() => {
          try {
            let cleanupFunction;
            
            switch(currentMonitor.function) {
              case 'showMarsWeatherMonitor':
                import('./components/MarsWeatherMonitor.js').then(module => {
                  cleanupFunction = module.showMarsWeatherMonitor(scene, Globe, globeGroup, camera);
                  if (cleanupFunction && typeof cleanupFunction === 'function') {
                    window.currentToolCleanup = cleanupFunction;
                  }
                  AstronautToolsModule.hideLoadingIndicator();
                });
                break;
              case 'showVenusAtmosphericMonitor':
                import('./components/VenusAtmosphericMonitor.js').then(module => {
                  cleanupFunction = module.showVenusAtmosphericMonitor(scene, Globe, globeGroup, camera);
                  if (cleanupFunction && typeof cleanupFunction === 'function') {
                    window.currentToolCleanup = cleanupFunction;
                  }
                  AstronautToolsModule.hideLoadingIndicator();
                });
                break;
              case 'showJupiterAtmosphericMonitor':
                import('./components/JupiterAtmosphericMonitor.js').then(module => {
                  cleanupFunction = module.showJupiterAtmosphericMonitor(scene, Globe, globeGroup, camera);
                  if (cleanupFunction && typeof cleanupFunction === 'function') {
                    window.currentToolCleanup = cleanupFunction;
                  }
                  AstronautToolsModule.hideLoadingIndicator();
                });
                break;
              case 'showSaturnAtmosphericMonitor':
                import('./components/SaturnAtmosphericMonitor.js').then(module => {
                  cleanupFunction = module.showSaturnAtmosphericMonitor(scene, Globe, globeGroup, camera);
                  if (cleanupFunction && typeof cleanupFunction === 'function') {
                    window.currentToolCleanup = cleanupFunction;
                  }
                  AstronautToolsModule.hideLoadingIndicator();
                });
                break;
              default:
                console.error(`Unknown monitor function: ${currentMonitor.function}`);
                AstronautToolsModule.hideLoadingIndicator();
            }
          } catch (error) {
            console.error(`Error launching ${currentMonitor.name}:`, error);
            AstronautToolsModule.hideLoadingIndicator();
          }
        }, 100);
      });
    }, 1600); // Wait for camera transition to complete
  });

  monitorButtonsContainer.appendChild(monitorButton);
  document.body.appendChild(monitorButtonsContainer);

  // Add fade-in animation
  monitorButtonsContainer.style.opacity = '0';
  monitorButtonsContainer.style.transform = 'translateX(20px)';
  setTimeout(() => {
    monitorButtonsContainer.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    monitorButtonsContainer.style.opacity = '1';
    monitorButtonsContainer.style.transform = 'translateX(0)';
  }, 100);
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
    <div style="width: 25px; height: 3px; background-color: white; margin: 5px 0;"></div>
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
  menuTitle.style.display = 'flex';
  menuTitle.style.justifyContent = 'space-between';
  menuTitle.style.alignItems = 'center';
  
  // Add close button to celestial menu
  const celestialMenuCloseButton = document.createElement("button");
  celestialMenuCloseButton.innerHTML = "&times;";
  celestialMenuCloseButton.style.width = "18px";
  celestialMenuCloseButton.style.height = "18px";
  celestialMenuCloseButton.style.border = "none";
  celestialMenuCloseButton.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
  celestialMenuCloseButton.style.color = "#ffffff";
  celestialMenuCloseButton.style.borderRadius = "50%";
  celestialMenuCloseButton.style.cursor = "pointer";
  celestialMenuCloseButton.style.fontSize = "12px";
  celestialMenuCloseButton.style.display = "flex";
  celestialMenuCloseButton.style.alignItems = "center";
  celestialMenuCloseButton.style.justifyContent = "center";
  celestialMenuCloseButton.style.transition = "background-color 0.3s ease";
  
  celestialMenuCloseButton.addEventListener("mouseover", () => {
    celestialMenuCloseButton.style.backgroundColor = "rgba(255, 255, 255, 0.4)";
  });
  
  celestialMenuCloseButton.addEventListener("mouseout", () => {
    celestialMenuCloseButton.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
  });
  
  celestialMenuCloseButton.addEventListener("click", (e) => {
    e.stopPropagation();
    focusMenuContent.style.opacity = '0';
    setTimeout(() => {
      focusMenuContent.style.display = 'none';
    }, 200);
  });
  
  menuTitle.appendChild(celestialMenuCloseButton);
  focusMenuContent.appendChild(menuTitle);

  // Define celestial bodies
  const celestialBodies = [
    { name: 'Earth', icon: '🌍', onclick: focusOnEarth },
    { name: 'Sun', icon: '☀️', onclick: focusOnSun },
    { name: 'Moon', icon: '🌕', onclick: focusOnMoon },
    { name: 'Mercury', icon: '☿', onclick: focusOnMercury },
    { name: 'Venus', icon: '♀', onclick: focusOnVenus },
    { name: 'Mars', icon: '♂', onclick: focusOnMars },
    { name: 'Jupiter', icon: '♃', onclick: focusOnJupiter },
    { name: 'Saturn', icon: '♄', onclick: focusOnSaturn },
    { name: 'Asteroid Belt', icon: '💫', onclick: focusOnAsteroidBelt },
    { name: 'Uranus', icon: '♅', onclick: focusOnUranus },
    { name: 'Neptune', icon: '♆', onclick: focusOnNeptune }
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

function focusOnMars() {
  switchCameraFocus('mars');
  focusMenuContent.style.display = 'none';
  updateFocusButtonsUI();
}

function focusOnJupiter() {
  switchCameraFocus('jupiter');
  focusMenuContent.style.display = 'none';
  updateFocusButtonsUI();
}

function focusOnSaturn() {
  switchCameraFocus('saturn');
  focusMenuContent.style.display = 'none';
  updateFocusButtonsUI();
}

function focusOnAsteroidBelt() {
  switchCameraFocus('asteroidbelt');
  focusMenuContent.style.display = 'none';
  updateFocusButtonsUI();
}

function focusOnUranus() {
  switchCameraFocus('uranus');
  focusMenuContent.style.display = 'none';
  updateFocusButtonsUI();
}

function focusOnNeptune() {
  switchCameraFocus('neptune');
  focusMenuContent.style.display = 'none';
  updateFocusButtonsUI();
}

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Try to append to container, fallback to body
  const container = document.getElementById('container');
  if (container) {
    container.appendChild(renderer.domElement);
  } else {
    document.body.appendChild(renderer.domElement);
  }
  
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.overflow = "hidden";
  
  // Debug info
  console.log("Initializing Globe Tour application...");

  scene = new Scene();
  scene.add(new AmbientLight(0xffffff, 0.3));    // Restored ambient lighting to make stars visible
  scene.background = new Color(0x000000);        // black space color

  camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100000);   // set camera view with greatly increased far plane
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();  // Three directional lights set to the screen with minimal intensity
  // Sun will be the primary light source, these are just for minimal ambient lighting
  
  const dLight = new DirectionalLight(0xffffff, 1.0);    // Changed to pure white light
  dLight.position.set(1, 1, 1);
  camera.add(dLight);

  const dLight1 = new DirectionalLight(0xffffff, 0.8);   // Changed to pure white light
  dLight1.position.set(0, 500, 500);
  camera.add(dLight1);

  const dLight2 = new DirectionalLight(0xffffff, 0.5);   // Changed to pure white light
  dLight2.position.set(-200, 500, 200);
  camera.add(dLight2);

  camera.position.z = 400;
  scene.add(camera);
  
  // Store initial camera position for reset functionality
  camera.userData = {
    initialPosition: new Vector3(0, 0, 400)
  };

  // Removed fog for better star visibility

  controls = new OrbitControls(camera, renderer.domElement);   // set basic default attribrutes to the globe and user controls
  controls.enableDamping = false;
  controls.dynamicDampingFactor = 0.01;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = 115;
  controls.maxDistance = 50000; // Greatly increased to allow viewing Uranus and other distant celestial bodies
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 1.0;
  controls.autoRotate = false;
  controls.minPolarAngle = Math.PI / 3.5;
  controls.maxPolarAngle = Math.PI - Math.PI / 3;
  
  // Make camera and controls accessible to mission simulators
  scene.userData.camera = camera;
  scene.userData.controls = controls;

  window.addEventListener("resize", onWindowResize, false);
  window.addEventListener("mousemove", onMouseMove);
  
  // Initialize all celestial bodies
  initGlobe();
  initSun();
  initMoon();
  initMercury();
  initVenus();
  initMars();
  initJupiter();
  initSaturn();
  initUranus();
  initNeptune();
  initAsteroidBelt();
  
  
  // Initialize additional features
  createSpaceSkybox(scene); // Add space skybox
  createSpaceBackground(scene); // Add stars, galaxies, and nebulae
  shootingStars();
  prepareAmbientMusic();
  createButtons();
  
  createCelestialMenu(); // Add the new celestial bodies menu
  
  // Make switchCameraFocus function globally accessible
  window.switchCameraFocus = switchCameraFocus;
}
function initGlobe() {
  globeGroup = new Group();

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
  try {
    audio = new Audio(spaceMusic);
    audio.loop = true;
    audio.volume = 0.3;

    window.addEventListener("click", playMusic);
    window.addEventListener("keydown", playMusic);
  } catch (error) {
    console.warn("Audio file not found or invalid, skipping ambient music:", error);
    audio = null;
  }
}
function playMusic() {
  if (!audioPlayed && audio) {
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

function initMars() {
  // Create Mars and add it to the scene
  mars = createMars(scene, sun);
}

// Initialize the asteroid belt
let asteroidBelt; // Global reference to asteroid belt
function initAsteroidBelt() {
  // Create asteroid belt and add it to the scene
  asteroidBelt = createAsteroidBelt(scene, sun);
}

// Initialize Jupiter
function initJupiter() {
  // Create Jupiter and add it to the scene
  jupiter = createJupiter(scene, sun);
}

// Initialize Saturn
function initSaturn() {
  // Create Saturn and add it to the scene
  saturn = createSaturn(scene, sun);
}

// Initialize Uranus
function initUranus() {
  uranus = createUranus(scene, sun);
}

// Initialize Neptune
function initNeptune() {
  neptune = createNeptune(scene, sun);
}

function animate() {
  const deltaTime = clock.getDelta(); // Get time since last frame
  
  // Update Earth's position around the Sun if both exist
  if (sun && globeGroup) {
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
    updateMercuryPosition(mercury, sun, deltaTime);
  }
  
  // Update Venus's position around the Sun
  if (venus && sun) {
    updateVenusPosition(venus, sun, deltaTime);
  }
  
  // Update Mars's position around the Sun
  if (mars && sun) {
    updateMarsPosition(mars, sun, deltaTime);
  }
  
  // Update Jupiter's position around the Sun
  if (jupiter && sun) {
    updateJupiterPosition(jupiter, sun, deltaTime);
  }
  
  // Update Saturn's position around the Sun
  if (saturn && sun) {
    updateSaturnPosition(saturn, sun, deltaTime);
  }

  // Update Uranus's position around the Sun
  if (uranus && sun) {
    updateUranusPosition(uranus, sun, deltaTime);
  }

  // Update Neptune's position around the Sun
  if (neptune && sun) {
    updateNeptunePosition(neptune, sun, deltaTime);
  }

  // Update asteroid belt if it exists
  if (asteroidBelt) {
    updateAsteroidBelt(asteroidBelt, deltaTime);
  }

  // Update Apollo mission simulation if active
  updateApolloMission();
  
  // Follow Apollo spacecraft with camera if active
  if (apolloMissionSimulator && apolloMissionSimulator.missionActive) {
    apolloMissionSimulator.followSpacecraft(camera, controls);
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
  } else if (cameraFocus === 'mars' && mars) {
    targetPosition = mars.position.clone();
  } else if (cameraFocus === 'jupiter' && jupiter) {
    targetPosition = jupiter.position.clone();
  } else if (cameraFocus === 'saturn' && saturn) {
    targetPosition = saturn.position.clone();
    // Additional special handling for Saturn to ensure we're focusing on the planet center
    // and not getting distracted by its rings
    if (controls.target.distanceTo(targetPosition) > 0.1) {
      controls.target.lerp(targetPosition, 0.1);
    }
  } else if (cameraFocus === 'asteroidbelt' && asteroidBelt) {
    targetPosition = sun.position.clone(); // Asteroid belt is centered around the sun
  } else if (cameraFocus === 'uranus' && uranus) {
    targetPosition = uranus.position.clone();
  } else if (cameraFocus === 'neptune' && neptune) {
    targetPosition = neptune.position.clone();
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
  menuContent.style.border = "1px solid rgba(255, 255, 255, 0.3)";
  document.body.appendChild(menuContent);

  // Add close button to main menu
  const menuCloseButton = document.createElement("button");
  menuCloseButton.innerHTML = "&times;";
  menuCloseButton.style.position = "absolute";
  menuCloseButton.style.top = "5px";
  menuCloseButton.style.right = "5px";
  menuCloseButton.style.width = "20px";
  menuCloseButton.style.height = "20px";
  menuCloseButton.style.border = "none";
  menuCloseButton.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
  menuCloseButton.style.color = "#ffffff";
  menuCloseButton.style.borderRadius = "50%";
  menuCloseButton.style.cursor = "pointer";
  menuCloseButton.style.fontSize = "14px";
  menuCloseButton.style.display = "flex";
  menuCloseButton.style.alignItems = "center";
  menuCloseButton.style.justifyContent = "center";
  menuCloseButton.style.transition = "background-color 0.3s ease";
  
  menuCloseButton.addEventListener("mouseover", () => {
    menuCloseButton.style.backgroundColor = "rgba(255, 255, 255, 0.4)";
  });
  
  menuCloseButton.addEventListener("mouseout", () => {
    menuCloseButton.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
  });
  
  menuCloseButton.addEventListener("click", (e) => {
    e.stopPropagation();
    menuContent.style.display = "none";
  });
  
  menuContent.appendChild(menuCloseButton);

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

  // Create Apollo 11 Mission button
  const apolloMissionButton = document.createElement("button");
  apolloMissionButton.innerHTML = `<span style="margin-right: 8px;">🚀</span> Apollo 11 Mission`;
  apolloMissionButton.style.padding = "10px 20px";
  apolloMissionButton.style.fontSize = "16px";
  apolloMissionButton.style.backgroundColor = "#0039a6"; // NASA blue
  apolloMissionButton.style.color = "#ffffff";
  apolloMissionButton.style.border = "2px solid #f9f9f9";
  apolloMissionButton.style.borderRadius = "5px";
  apolloMissionButton.style.cursor = "pointer";
  apolloMissionButton.style.display = "flex";
  apolloMissionButton.style.alignItems = "center";
  apolloMissionButton.style.justifyContent = "center";
  apolloMissionButton.style.margin = "5px 0";
  apolloMissionButton.style.fontWeight = "bold";
  apolloMissionButton.style.letterSpacing = "0.5px";
  apolloMissionButton.style.boxShadow = "0 0 10px rgba(255, 255, 255, 0.3)";
  
  // Add hover effect
  apolloMissionButton.addEventListener("mouseover", () => {
    apolloMissionButton.style.backgroundColor = "#004fca";
    apolloMissionButton.style.transform = "scale(1.05)";
    apolloMissionButton.style.transition = "all 0.3s ease";
  });
  
  apolloMissionButton.addEventListener("mouseout", () => {
    apolloMissionButton.style.backgroundColor = "#0039a6";
    apolloMissionButton.style.transform = "scale(1)";
  });
  
  // Add click event handler for Apollo mission
  apolloMissionButton.addEventListener("click", () => {
    startApolloMission();
    hamburgerMenu.style.display = "none"; // Close menu after selection
  });
  
  menuContent.appendChild(apolloMissionButton);

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
    
    // Clean up Apollo mission if active
    cleanupApolloMission();
    
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
    AstronautTools.clearDebrisAndOrbits(globeGroup); // Clear any existing visualizations
    
    // Clean up Apollo mission if active
    cleanupApolloMission();
    
    addEarthquakeVisualization(); // Add the new earthquake visualization
    menuContent.style.display = "none"; // Close menu after click
  });

  // Add event listener for Apollo 11 Mission Button
  apolloMissionButton.addEventListener("click", () => {
    stopCurrentAnimation();
    stopCurrentTypeWriter();
    Globe.arcsData([]); // Clear existing arcs
    AstronautTools.clearDebrisAndOrbits(globeGroup); // Clear any existing visualizations
    
    // Initialize and start Apollo 11 mission simulation
    initApolloMission();
    startApolloMission();
    
    // Position camera to focus on Earth at the start of the mission
    // Will give a good view of the rocket launch and initial orbit
    camera.position.set(20, 50, 120);
    controls.target.set(0, 0, 0); // Focus on Earth at the beginning
    
    // Smoothly animate to the new view
    const startPos = camera.position.clone();
    const endPos = new Vector3(20, 50, 120);
    const startTarget = controls.target.clone();
    const endTarget = new Vector3(0, 0, 0);
    
    gsap.to(camera.position, {
      x: endPos.x,
      y: endPos.y,
      z: endPos.z,
      duration: 2.5,
      ease: "power2.inOut",
      onUpdate: () => {
        camera.lookAt(controls.target);
      }
    });
    
    gsap.to(controls.target, {
      x: endTarget.x,
      y: endTarget.y,
      z: endTarget.z,
      duration: 2.5,
      ease: "power2.inOut",
      onUpdate: () => {
        controls.update();
      }
    });
    
    // Show mission notification
    const notification = document.createElement('div');
    notification.style.position = 'absolute';
    notification.style.bottom = '20px';
    notification.style.left = '20px';
    notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    notification.style.color = '#fff';
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '8px';
    notification.style.fontFamily = "'Montserrat', sans-serif";
    notification.style.fontSize = '16px';
    notification.style.zIndex = '1000';
    notification.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    notification.style.boxShadow = '0 0 20px rgba(0, 150, 255, 0.5)';
    notification.textContent = 'Apollo 11 Mission Simulation Started';
    notification.id = 'apollo-notification';
    
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
      const notificationElement = document.getElementById('apollo-notification');
      if (notificationElement) {
        notificationElement.style.opacity = '0';
        notificationElement.style.transition = 'opacity 1s ease';
        setTimeout(() => {
          if (notificationElement.parentNode) {
            notificationElement.parentNode.removeChild(notificationElement);
          }
        }, 1000);
      }
    }, 5000);
    
    menuContent.style.display = "none"; // Close menu after click
  });

  resetButton.addEventListener("click", () => {
    // Clean up Apollo mission if active
    cleanupApolloMission();
    
    window.location.reload(); // Refresh the page
    menuContent.style.display = "none"; // Close menu after click
  });

  // Toggle menu on hamburger click
  hamburgerMenu.addEventListener("click", () => {
    menuContent.style.display = menuContent.style.display === "flex" ? "none" : "flex";
  });
}

// Apollo Mission Simulator integration
import { ApolloMissionSimulator } from './components/ApolloMissionSimulator.js';

let apolloMissionSimulator;

function initApolloMission() {
  apolloMissionSimulator = new ApolloMissionSimulator(scene);
}

function startApolloMission() {
  if (apolloMissionSimulator) {
    apolloMissionSimulator.startMission();
  }
}

function updateApolloMission() {
  if (apolloMissionSimulator) {
    // Update Earth position in Apollo mission simulator to match current position
    if (globeGroup) {
      apolloMissionSimulator.updateEarthPosition(globeGroup);
    }
    
    // Update mission state
    apolloMissionSimulator.updateMission();
  }
}

function cleanupApolloMission() {
  if (apolloMissionSimulator) {
    apolloMissionSimulator.cleanup();
  }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
    animate();
  });
} else {
  // DOM is already loaded
  init();
  animate();
}

// Switch camera focus function
function switchCameraFocus(target, duration = 1.5) {
  if (!target) return;

  let targetPosition, lookAtPosition;
  const distanceFactor = 1;

  // Determine target position based on celestial body
  switch (target.toLowerCase()) {
    case 'earth':
      targetPosition = new Vector3(0, 0, 400);
      lookAtPosition = new Vector3(0, 0, 0);
      break;
    case 'moon':
      targetPosition = new Vector3(300, 0, 0);
      lookAtPosition = new Vector3(0, 0, 0);
      break;
    case 'sun':
      targetPosition = new Vector3(0, 0, -1000);
      lookAtPosition = new Vector3(0, 0, 0);
      break;
    // Add other celestial bodies as needed
    default:
      console.warn(`Unknown target: ${target}`);
      return;
  }

  // Animate camera transition
  const startPosition = camera.position.clone();
  const startTime = Date.now();

  function animateCamera() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / (duration * 1000), 1);

    // Ease-in-out function
    const easeProgress = progress < 0.5
      ? 2 * progress * progress
      : -1 + (4 - 2 * progress) * progress;

    // Update camera position
    camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
    camera.lookAt(lookAtPosition);

    if (progress < 1) {
      requestAnimationFrame(animateCamera);
    }
  }

  animateCamera();
}