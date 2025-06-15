/**
 * MissionControlDashboard.js - NASA-style mission control interface
 * 
 * Creates an immersive mission control experience with multiple
 * monitoring screens, alerts, and real-time space data.
 */

import { Vector3 } from 'three';

let dashboardActive = false;
let updateInterval = null;
let missionTimer = 0;

export const showMissionControlDashboard = (scene, globe, globeGroup, camera) => {
  console.log("Initializing Mission Control Dashboard");
  
  if (!window.astronautToolIntervals) {
    window.astronautToolIntervals = [];
  }
  
  // Create the main dashboard interface
  createDashboardInterface();
  
  // Start mission control updates
  startMissionControlUpdates();
  
  dashboardActive = true;
  
  return () => {
    closeMissionControlDashboard();
  };
};

const createDashboardInterface = () => {
  // Remove any existing dashboard
  const existingDashboard = document.getElementById('mission-control-dashboard');
  if (existingDashboard) {
    existingDashboard.remove();
  }
  
  // Create main dashboard container
  const dashboard = document.createElement('div');
  dashboard.id = 'mission-control-dashboard';
  dashboard.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
    color: #00ff00;
    font-family: 'Courier New', monospace;
    z-index: 2000;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;
  
  // Create header with mission title and controls
  const header = document.createElement('div');
  header.style.cssText = `
    background: rgba(0, 255, 0, 0.1);
    border-bottom: 2px solid #00ff00;
    padding: 10px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 10px rgba(0, 255, 0, 0.3);
  `;
  
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 20px;">
      <h1 style="margin: 0; color: #00ff00; font-size: 24px; text-shadow: 0 0 10px #00ff00;">
        🚀 MISSION CONTROL - GLOBETOUR SPACE CENTER
      </h1>
      <div id="mission-timer" style="font-size: 18px; color: #ffff00; font-weight: bold;">
        MET: 00:00:00
      </div>
    </div>
    <div style="display: flex; gap: 10px;">
      <button id="alert-silence" style="background: #ff4444; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
        SILENCE ALERTS
      </button>
      <button id="dashboard-close" style="background: #444; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
        CLOSE DASHBOARD
      </button>
    </div>
  `;
  
  dashboard.appendChild(header);
  
  // Create main content area with multiple screens
  const mainContent = document.createElement('div');
  mainContent.style.cssText = `
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 10px;
    padding: 10px;
    overflow: hidden;
  `;
  
  // Screen 1: System Status
  const systemScreen = createMissionScreen('System Status', 'system-status', `
    <div class="status-grid">
      <div class="status-item">
        <span class="label">LIFE SUPPORT:</span>
        <span class="value" id="life-support-status">NOMINAL</span>
      </div>
      <div class="status-item">
        <span class="label">POWER SYSTEMS:</span>
        <span class="value" id="power-status">98.7% OPTIMAL</span>
      </div>
      <div class="status-item">
        <span class="label">COMMUNICATIONS:</span>
        <span class="value" id="comm-status">STRONG SIGNAL</span>
      </div>
      <div class="status-item">
        <span class="label">NAVIGATION:</span>
        <span class="value" id="nav-status">GPS LOCKED</span>
      </div>
      <div class="status-item">
        <span class="label">THERMAL:</span>
        <span class="value" id="thermal-status">18.5°C NOMINAL</span>
      </div>
    </div>
  `);
  
  // Screen 2: Space Weather
  const weatherScreen = createMissionScreen('Space Weather', 'space-weather', `
    <div class="weather-data">
      <div class="weather-item">
        <span class="label">SOLAR WIND:</span>
        <span class="value" id="solar-wind">425 km/s</span>
      </div>
      <div class="weather-item">
        <span class="label">MAGNETIC FIELD:</span>
        <span class="value" id="magnetic-field">5.2 nT</span>
      </div>
      <div class="weather-item">
        <span class="label">PARTICLE FLUX:</span>
        <span class="value" id="particle-flux">MODERATE</span>
      </div>
      <div class="weather-item">
        <span class="label">RADIATION LEVEL:</span>
        <span class="value" id="radiation-level">NORMAL</span>
      </div>
      <div class="weather-alert" id="weather-alert" style="color: #ffaa00; margin-top: 10px;">
        ⚠️ MINOR GEOMAGNETIC STORM EXPECTED
      </div>
    </div>
  `);
  
  // Screen 3: Orbital Tracking
  const trackingScreen = createMissionScreen('Asset Tracking', 'orbital-tracking', `
    <div class="tracking-list" id="tracking-list">
      <div class="track-item">
        <span class="asset">ISS</span>
        <span class="status">TRACKED</span>
        <span class="distance">408 km</span>
      </div>
      <div class="track-item">
        <span class="asset">HUBBLE</span>
        <span class="status">NOMINAL</span>
        <span class="distance">547 km</span>
      </div>
      <div class="track-item">
        <span class="asset">GPS-III</span>
        <span class="status">ACTIVE</span>
        <span class="distance">20,183 km</span>
      </div>
    </div>
  `);
  
  // Screen 4: Mission Alerts
  const alertsScreen = createMissionScreen('Active Alerts', 'mission-alerts', `
    <div class="alerts-container" id="alerts-container">
      <div class="alert-item priority-medium">
        <span class="alert-time">15:42:33</span>
        <span class="alert-msg">Solar activity increased</span>
      </div>
      <div class="alert-item priority-low">
        <span class="alert-time">15:38:17</span>
        <span class="alert-msg">Debris avoidance maneuver complete</span>
      </div>
    </div>
  `);
  
  // Screen 5: Communications
  const commScreen = createMissionScreen('Communications', 'communications', `
    <div class="comm-channels">
      <div class="comm-channel">
        <span class="channel-name">GROUND CONTROL</span>
        <span class="channel-status active">ACTIVE</span>
      </div>
      <div class="comm-channel">
        <span class="channel-name">ISS CREW</span>
        <span class="channel-status active">STANDBY</span>
      </div>
      <div class="comm-channel">
        <span class="channel-name">EMERGENCY</span>
        <span class="channel-status">MONITOR</span>
      </div>
    </div>
    <div class="comm-log" id="comm-log">
      <div class="log-entry">15:45 - Ground: Weather looks good for EVA</div>
      <div class="log-entry">15:43 - ISS: Copy, continuing pre-breathe</div>
    </div>
  `);
  
  // Screen 6: Resource Monitor
  const resourceScreen = createMissionScreen('Resources', 'resources', `
    <div class="resource-bars">
      <div class="resource-bar">
        <span class="resource-label">OXYGEN:</span>
        <div class="bar-container">
          <div class="bar-fill" style="width: 87%; background: #00ff00;"></div>
        </div>
        <span class="resource-value">87%</span>
      </div>
      <div class="resource-bar">
        <span class="resource-label">POWER:</span>
        <div class="bar-container">
          <div class="bar-fill" style="width: 92%; background: #ffff00;"></div>
        </div>
        <span class="resource-value">92%</span>
      </div>
      <div class="resource-bar">
        <span class="resource-label">FUEL:</span>
        <div class="bar-container">
          <div class="bar-fill" style="width: 76%; background: #ff8800;"></div>
        </div>
        <span class="resource-value">76%</span>
      </div>
    </div>
  `);
  
  mainContent.appendChild(systemScreen);
  mainContent.appendChild(weatherScreen);
  mainContent.appendChild(trackingScreen);
  mainContent.appendChild(alertsScreen);
  mainContent.appendChild(commScreen);
  mainContent.appendChild(resourceScreen);
  
  dashboard.appendChild(mainContent);
  
  // Add CSS styles
  const style = document.createElement('style');
  style.textContent = `
    .status-grid, .weather-data, .comm-channels, .resource-bars {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .status-item, .weather-item, .comm-channel, .resource-bar {
      display: flex;
      justify-content: space-between;
      padding: 5px;
      background: rgba(0, 255, 0, 0.05);
      border-left: 3px solid #00ff00;
    }
    
    .label { color: #cccccc; }
    .value { color: #00ff00; font-weight: bold; }
    
    .track-item {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      padding: 5px;
      border-bottom: 1px solid #333;
    }
    
    .alert-item {
      padding: 8px;
      margin: 4px 0;
      border-left: 4px solid #ffaa00;
      background: rgba(255, 170, 0, 0.1);
    }
    
    .priority-medium { border-color: #ffaa00; }
    .priority-low { border-color: #00ff00; opacity: 0.7; }
    
    .bar-container {
      flex: 1;
      height: 12px;
      background: #333;
      border-radius: 6px;
      overflow: hidden;
      margin: 0 10px;
    }
    
    .bar-fill {
      height: 100%;
      transition: width 0.3s ease;
    }
    
    .channel-status.active {
      color: #00ff00;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .comm-log {
      margin-top: 10px;
      font-size: 12px;
      max-height: 100px;
      overflow-y: auto;
    }
    
    .log-entry {
      padding: 2px 0;
      color: #888;
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(dashboard);
  
  // Add event listeners
  document.getElementById('dashboard-close').addEventListener('click', closeMissionControlDashboard);
  document.getElementById('alert-silence').addEventListener('click', () => {
    const alertsContainer = document.getElementById('alerts-container');
    if (alertsContainer) {
      alertsContainer.innerHTML = '<div style="color: #666; text-align: center;">All alerts silenced</div>';
    }
  });
};

const createMissionScreen = (title, id, content) => {
  const screen = document.createElement('div');
  screen.style.cssText = `
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #00ff00;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
    overflow: auto;
  `;
  
  screen.innerHTML = `
    <h3 style="margin: 0 0 15px 0; color: #00ff00; font-size: 16px; text-align: center; border-bottom: 1px solid #00ff00; padding-bottom: 8px;">
      ${title}
    </h3>
    ${content}
  `;
  
  return screen;
};

const startMissionControlUpdates = () => {
  updateInterval = setInterval(() => {
    if (!dashboardActive) return;
    
    // Update mission timer
    missionTimer++;
    const hours = Math.floor(missionTimer / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((missionTimer % 3600) / 60).toString().padStart(2, '0');
    const seconds = (missionTimer % 60).toString().padStart(2, '0');
    
    const timerElement = document.getElementById('mission-timer');
    if (timerElement) {
      timerElement.textContent = `MET: ${hours}:${minutes}:${seconds}`;
    }
    
    // Update system values with realistic variations
    updateSystemStatus();
    updateSpaceWeather();
    updateTracking();
    
    // Occasionally add new alerts
    if (Math.random() < 0.05) { // 5% chance per second
      addRandomAlert();
    }
    
  }, 1000);
  
  if (window.astronautToolIntervals) {
    window.astronautToolIntervals.push(updateInterval);
  }
};

const updateSystemStatus = () => {
  const powerStatus = document.getElementById('power-status');
  if (powerStatus) {
    const power = (98 + Math.random() * 2).toFixed(1);
    powerStatus.textContent = `${power}% OPTIMAL`;
  }
  
  const thermalStatus = document.getElementById('thermal-status');
  if (thermalStatus) {
    const temp = (18 + (Math.random() - 0.5) * 2).toFixed(1);
    thermalStatus.textContent = `${temp}°C NOMINAL`;
  }
};

const updateSpaceWeather = () => {
  const solarWind = document.getElementById('solar-wind');
  if (solarWind) {
    const speed = Math.floor(400 + Math.random() * 100);
    solarWind.textContent = `${speed} km/s`;
  }
  
  const magneticField = document.getElementById('magnetic-field');
  if (magneticField) {
    const field = (5 + Math.random() * 2).toFixed(1);
    magneticField.textContent = `${field} nT`;
  }
};

const updateTracking = () => {
  // Add some random variation to distances
  const trackingList = document.getElementById('tracking-list');
  if (trackingList) {
    const items = trackingList.querySelectorAll('.track-item');
    items.forEach(item => {
      const distanceSpan = item.querySelector('.distance');
      if (distanceSpan) {
        const currentDistance = parseFloat(distanceSpan.textContent);
        const variation = (Math.random() - 0.5) * 2;
        const newDistance = Math.max(0, currentDistance + variation);
        distanceSpan.textContent = `${newDistance.toFixed(0)} km`;
      }
    });
  }
};

const addRandomAlert = () => {
  const alerts = [
    "Telemetry data received",
    "Course correction executed",
    "Communication window opening",
    "Orbital debris detected",
    "System diagnostic complete",
    "Emergency beacon test",
    "Solar panel alignment adjusted"
  ];
  
  const alertsContainer = document.getElementById('alerts-container');
  if (alertsContainer) {
    const now = new Date();
    const timeString = now.toTimeString().substring(0, 8);
    const alert = alerts[Math.floor(Math.random() * alerts.length)];
    
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert-item priority-low';
    alertDiv.innerHTML = `
      <span class="alert-time">${timeString}</span>
      <span class="alert-msg">${alert}</span>
    `;
    
    alertsContainer.insertBefore(alertDiv, alertsContainer.firstChild);
    
    // Keep only the latest 5 alerts
    const allAlerts = alertsContainer.querySelectorAll('.alert-item');
    if (allAlerts.length > 5) {
      allAlerts[allAlerts.length - 1].remove();
    }
  }
};

const closeMissionControlDashboard = () => {
  dashboardActive = false;
  
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  
  const dashboard = document.getElementById('mission-control-dashboard');
  if (dashboard) {
    dashboard.remove();
  }
  
  console.log("Mission Control Dashboard closed");
};

export { closeMissionControlDashboard };
