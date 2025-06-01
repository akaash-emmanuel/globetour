import { Vector3, MeshBasicMaterial, SphereGeometry, Mesh, LineBasicMaterial, BufferGeometry, LineLoop, CylinderGeometry, RingGeometry, DoubleSide, SpriteMaterial, Sprite, CanvasTexture } from "three";
import * as satellite from 'satellite.js';
import axios from 'axios';

const NASA_API_KEY = "jmRRPCUwwWyNaMrXJCNz8HDX8q94wPnQfKz0ig5a";

// Helper functions
const convertLatLonToXYZ = (lat, lon, radius) => {
  const longitudeOffset = -90;
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180 + longitudeOffset) * (Math.PI / 180);
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
};

// Diagnostic function to check if axios is properly initialized
const diagnoseAxios = () => {
  try {
    // Check if axios is available
    if (!axios) {
      console.error('Axios is not defined');
      return false;
    }
    
    // Check if axios has the necessary methods
    if (!axios.get || !axios.post) {
      console.error('Axios methods are missing');
      return false;
    }
    
    // Check if process is defined for axios
    if (typeof process === 'undefined' || !process || !process.env) {
      console.warn('Process object is not properly defined. Adding polyfill.');
      window.process = window.process || { env: {} };
    }
    
    // Log axios and process state for debugging
    console.log('Axios version:', axios.VERSION || 'unknown');
    console.log('Process object:', typeof process, process ? 'available' : 'undefined');
    console.log('Axios defaults:', axios.defaults);
    
    console.log('Axios is properly initialized');
    return true;
  } catch (error) {
    console.error('Error diagnosing axios:', error);
    return false;
  }
};

// Set up global process object for axios if needed 
if (typeof window !== 'undefined') {
  window.process = window.process || { env: { NODE_ENV: 'production' } };
}

// Loading indicator functions
const showLoadingIndicator = () => {
  // Remove existing loader if it exists
  const existingLoader = document.getElementById("loadingIndicator");
  if (existingLoader) {
    existingLoader.remove();
  }
  
  // Create loading indicator
  const loader = document.createElement("div");
  loader.id = "loadingIndicator";
  
  // Style the loading indicator
  Object.assign(loader.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    border: "4px solid rgba(0, 255, 255, 0.1)",
    borderTopColor: "#00FFFF",
    boxShadow: "0 0 20px rgba(0, 255, 255, 0.5)",
    animation: "spin 1s linear infinite",
    zIndex: "9999"
  });
  
  // Add keyframes for spinning animation
  if (!document.getElementById("loader-animation")) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "loader-animation";
    styleSheet.textContent = `
      @keyframes spin {
        to { transform: translate(-50%, -50%) rotate(360deg); }
      }
    `;
    document.head.appendChild(styleSheet);
  }
  
  document.body.appendChild(loader);
  
  // Add a semi-transparent overlay
  const overlay = document.createElement("div");
  overlay.id = "loaderOverlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: "9998"
  });
  document.body.appendChild(overlay);
};

const hideLoadingIndicator = () => {
  // Remove the loading indicator and overlay
  const loader = document.getElementById("loadingIndicator");
  const overlay = document.getElementById("loaderOverlay");
  
  if (loader) {
    loader.remove();
  }
  
  if (overlay) {
    overlay.remove();
  }
};

// Create the vertical information panel button
const createVerticalButton = () => {
  // Remove existing button if it exists
  const existingButton = document.getElementById("verticalButton");
  if (existingButton) {
    existingButton.remove();
  }

  const verticalButton = document.createElement("div");
  verticalButton.id = "verticalButton";
  Object.assign(verticalButton.style, {
    position: "absolute",
    top: "50%",
    right: "20px",
    transform: "translateY(-50%)",
    width: "280px",
    minHeight: "350px",
    maxHeight: "70vh",
    backgroundColor: "rgba(10, 20, 40, 0.85)",
    borderRadius: "12px",
    border: "1px solid #00FFFF",
    padding: "20px",
    color: "#ffffff",
    fontFamily: "'Montserrat', sans-serif",
    fontSize: "14px",
    overflowY: "auto",
    boxShadow: "0 0 20px rgba(0, 255, 255, 0.2)",
    zIndex: "1100"
  });

  document.body.appendChild(verticalButton);
  return verticalButton;
};

// Main astronaut tools manager
const showAstronautToolsMenu = (scene, globe, globeGroup, camera) => {
  // Diagnose axios to ensure it's working properly
  diagnoseAxios();
  
  // Call clearDebrisAndOrbits here if it's intended to run when the menu is shown
  // clearDebrisAndOrbits(globeGroup); 
  // ^^^ NB: This was here, but it might be better to call it from index.js if that's where the main setup occurs.
  // Or, ensure it's called before any new tool that might add debris/orbits.
  // For now, I'll ensure it's defined and exported. The calling logic might need review.

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
      name: "Space Situational Awareness",
      description: "Revolutionary AI-driven space survival system",
      function: () => showSpaceSituationalAwareness(scene, globe, globeGroup, camera),
      highlight: true,
      cleanup: () => { 
        // Specific cleanup for SpaceSituationalAwareness if needed beyond general cleanup
        const spaceSaHud = document.getElementById("space-sa-hud");
        if (spaceSaHud) spaceSaHud.remove();
        const arToggleButton = document.getElementById("ar-toggle-button");
        if (arToggleButton) arToggleButton.remove();
      }
    },
    {
      name: "ISS Tracker",
      description: "Track the International Space Station in real-time",
      function: () => showISSTracker(scene, globe, globeGroup, camera)
    },
    {
      name: "Space Weather",
      description: "Monitor space weather conditions that affect missions",
      function: () => showSpaceWeatherMonitor(scene, globe, globeGroup, camera)
    },
    {
      name: "Satellite Tracker",
      description: "Track nearby satellites and space objects",
      function: () => showSatelliteTracker(scene, globe, globeGroup, camera)
    },
    {
      name: "Radiation Monitor",
      description: "Monitor radiation levels across Earth's orbit",
      function: () => showRadiationMonitor(scene, globe, globeGroup, camera)
    },
    {
      name: "Communication Satellites",
      description: "View communication satellites for emergency contact",
      function: () => showCommSatellites(scene, globe, globeGroup, camera)
    },
    {
      name: "Earth Observation",
      description: "Access real-time Earth observation data",
      function: () => showEarthObservation(scene, globe, globeGroup, camera)
    }
  ];
  
  tools.forEach(tool => {
    const button = document.createElement("div");
    button.style.backgroundColor = tool.highlight ? "#2c82dc" : "#0c529c";
    button.style.color = "#ffffff";
    button.style.padding = "12px 15px";
    button.style.borderRadius = "5px";
    button.style.cursor = "pointer";
    button.style.display = "flex";
    button.style.flexDirection = "column";
    button.style.transition = "all 0.3s ease";
    button.style.border = tool.highlight ? "2px solid #00ffff" : "none";
    button.style.boxShadow = tool.highlight ? "0 0 12px rgba(0, 255, 255, 0.5)" : "none";
    
    const buttonTitle = document.createElement("div");
    buttonTitle.innerText = tool.name;
    buttonTitle.style.fontWeight = "bold";
    buttonTitle.style.marginBottom = "5px";
    buttonTitle.style.color = tool.highlight ? "#00ffff" : "#ffffff";
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
      // Clear previous visualizations and call cleanup for the PREVIOUS tool
      if (window.currentToolCleanup) {
        window.currentToolCleanup();
      }
      clearAstronautTools(globeGroup, globe); // General cleanup that clears common elements

      // Show loading indicator
      showLoadingIndicator();

      // Call the function for this tool after a small delay
      setTimeout(() => {
        tool.function();
        hideLoadingIndicator();
        // Set the cleanup function for the NEWLY selected tool
        window.currentToolCleanup = tool.cleanup;
      }, 100);
    });

    astronautToolsMenu.appendChild(button);
  });
};

const clearAstronautTools = (globeGroup, globe) => {
  // Clear any existing astronaut tool visualizations
  globe.ringsData([]);
  globe.arcsData([]);

  // Clear custom meshes and objects
  // Ensure this doesn't remove the globe itself or other essential scene elements
  globeGroup.children = globeGroup.children.filter(child =>
    !child.userData?.isAstronautTool && 
    !child.userData?.isSituationalAwarenessTool &&
    !child.userData?.isMissionPlannerElement // Added check for mission planner elements
  );

  // Clear any existing interval timers
  if (window.astronautToolIntervals) {
    window.astronautToolIntervals.forEach(interval => clearInterval(interval));
    window.astronautToolIntervals = [];
  }
  if (window.missionPlannerIntervals) { // Clear mission planner specific intervals
    window.missionPlannerIntervals.forEach(clearInterval);
    window.missionPlannerIntervals = [];
  }

  // Clear information panel content (verticalButton)
  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    verticalButton.innerHTML = ''; // Clear its content specifically
  }

  // Remove other specific UI elements if they exist.
  // Note: Individual tool cleanup functions (like cleanupMissionPlanner or SSA specific cleanup)
  // are now called via window.currentToolCleanup before this general cleanup.
  // So, explicit removal here might be redundant if tools manage their own UI elements properly.
  // However, keeping some common ones as a fallback or for tools without specific cleanup.
  const missionPlannerPanel = document.getElementById("mission-planner-panel");
  if (missionPlannerPanel) {
    missionPlannerPanel.remove();
  }
  const spaceSaHud = document.getElementById("space-sa-hud");
  if (spaceSaHud) {
    spaceSaHud.remove();
  }
  const arToggleButton = document.getElementById("ar-toggle-button");
  if (arToggleButton) {
    arToggleButton.remove();
  }
};

// Function to clear debris and orbits
const clearDebrisAndOrbits = (globeGroup) => {
  if (globeGroup && globeGroup.children) {
    globeGroup.children = globeGroup.children.filter((child) => {
      // Keep objects that are NOT debris or orbits
      return !child.userData?.isDebrisOrOrbit;
    });
    console.log("Debris and orbits cleared from globeGroup.");
  } else {
    console.warn("globeGroup not available for clearDebrisAndOrbits");
  }
};

// Import individual tools from their respective files
import { showISSTracker } from './ISSTracker.js';
import { showSpaceWeatherMonitor } from './SpaceWeatherMonitor.js';
import { showSatelliteTracker } from './SatelliteTracker.js';
import { showRadiationMonitor } from './RadiationMonitor.js';
import { showCommSatellites } from './EmergencyResponseSystem.js';
import { showEarthObservation } from './EarthObservationPlanner.js';
import { showSpaceSituationalAwareness } from './SpaceSituationalAwareness.js';

// Export all necessary functions
export {
  showAstronautToolsMenu,
  clearDebrisAndOrbits,
  createVerticalButton,
  diagnoseAxios,
  showLoadingIndicator,
  hideLoadingIndicator
};
