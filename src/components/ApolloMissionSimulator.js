import { 
  Mesh, 
  SphereGeometry, 
  MeshBasicMaterial, 
  Color, 
  Vector3, 
  Group,
  CylinderGeometry,
  BufferGeometry,
  LineBasicMaterial,
  Line,
  Float32BufferAttribute,
  Matrix4,
  Object3D,
  AdditiveBlending,
  ConeGeometry,
  RingGeometry
} from 'three';
import missionData from '../assets/apollo11_mission.json';

export class ApolloMissionSimulator {
  constructor(scene) {
    this.scene = scene;
    this.spacecraft = null;
    this.spacecraftGroup = null;
    this.trail = null;
    this.trailGeometry = null;
    this.trailPoints = [];
    this.currentEventIndex = 0;
    this.startTime = null;
    this.missionEvents = missionData.events;
    this.missionActive = false;
    this.trailUpdateInterval = 5;
    this.frameCount = 0;
    this.lastPosition = null;
    this.notificationElement = null;
    this.lastNotificationTime = 0;
    this.followMode = true;
    this.earthRadius = 25; // Approximate Earth radius in the scene
    this.moonRadius = 8; // Approximate Moon radius in the scene
    this.moonDistance = 300; // Distance from Earth to Moon in scene units
  }

  initializeSpacecraft() {
    // Validate mission data
    if (!this.missionEvents || this.missionEvents.length === 0) {
      console.error('Mission events are not properly initialized.');
      return;
    }
    
    // Find and store Earth's position for correct positioning
    this.earthPosition = new Vector3();
    this.moonPosition = new Vector3();
    
    // Find Earth (globeGroup) in the scene
    this.scene.traverse((object) => {
      if (object.isGroup && (object.userData.isGlobe || object.children.some(child => child.userData && child.userData.isGlobe))) {
        this.earthPosition.copy(object.position);
        console.log('Found Earth position:', this.earthPosition);
      } else if (object.userData && object.userData.isMoon) {
        this.moonPosition.copy(object.position);
        console.log('Found Moon position:', this.moonPosition);
      }
    });
    
    // If Earth wasn't found, use default position (matching Sun.js)
    if (this.earthPosition.length() === 0) {
      const SUN_DISTANCE = 5500;
      const EARTH_ORBIT_SIZE = 0.5;
      this.earthPosition.set(-SUN_DISTANCE * EARTH_ORBIT_SIZE, 0, 0);
      console.warn('Using default Earth position:', this.earthPosition);
    }

    const initialEvent = this.missionEvents[0];
    if (!initialEvent || !initialEvent.position) {
      console.error('Initial event or its position is undefined.');
      return;
    }

    // Create spacecraft group
    this.spacecraftGroup = new Group();
    this.spacecraftGroup.name = 'apollo11';
    
    // Scale for spacecraft visibility
    const scale = 5; // Increased scale for better visibility near Earth
    
    // Create main spacecraft body (Command Module)
    const bodyGeometry = new SphereGeometry(1.5 * scale, 16, 16);
    const bodyMaterial = new MeshBasicMaterial({ 
      color: new Color(0xffffff),
      emissive: new Color(0x333333),
      emissiveIntensity: 0.3
    });
    this.spacecraft = new Mesh(bodyGeometry, bodyMaterial);
    this.spacecraft.name = 'commandModule';
    
    // Create Service Module
    const serviceModuleGeometry = new CylinderGeometry(1.2 * scale, 1.2 * scale, 3 * scale, 16);
    const serviceModuleMaterial = new MeshBasicMaterial({ 
      color: new Color(0xcccccc),
      emissive: new Color(0x222222),
      emissiveIntensity: 0.2
    });
    const serviceModule = new Mesh(serviceModuleGeometry, serviceModuleMaterial);
    serviceModule.name = 'serviceModule';
    serviceModule.position.y = -2.5 * scale;
    
    // Create engine nozzle
    const engineGeometry = new ConeGeometry(0.8 * scale, 1.5 * scale, 8);
    const engineMaterial = new MeshBasicMaterial({ 
      color: new Color(0x444444),
      emissive: new Color(0x111111),
      emissiveIntensity: 0.1
    });
    const engine = new Mesh(engineGeometry, engineMaterial);
    engine.name = 'engine';
    engine.position.y = -4.5 * scale;
    
    // Create engine glow effect for launch phases
    const engineGlowGeometry = new SphereGeometry(1.5 * scale, 8, 8);
    const engineGlowMaterial = new MeshBasicMaterial({
      color: new Color(0xff6600),
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending
    });
    const engineGlow = new Mesh(engineGlowGeometry, engineGlowMaterial);
    engineGlow.name = 'engineGlow';
    engineGlow.position.y = -5 * scale;
    
    // Create overall spacecraft glow for visibility
    const spacecraftGlowGeometry = new SphereGeometry(4 * scale, 16, 16);
    const spacecraftGlowMaterial = new MeshBasicMaterial({
      color: new Color(0x00aaff),
      transparent: true,
      opacity: 0.4, // Increased opacity for better visibility
      blending: AdditiveBlending
    });
    const spacecraftGlow = new Mesh(spacecraftGlowGeometry, spacecraftGlowMaterial);
    spacecraftGlow.name = 'spacecraftGlow';
    
    // Add parts to spacecraft group
    this.spacecraftGroup.add(spacecraftGlow);
    this.spacecraftGroup.add(this.spacecraft);
    this.spacecraftGroup.add(serviceModule);
    this.spacecraftGroup.add(engine);
    this.spacecraftGroup.add(engineGlow);
    
    // Initialize trail
    this.trailGeometry = new BufferGeometry();
    const trailMaterial = new LineBasicMaterial({ 
      color: 0x00ffff, 
      linewidth: 2,
      opacity: 0.8,
      transparent: true
    });
    this.trail = new Line(this.trailGeometry, trailMaterial);
    this.trail.name = 'apollo11Trail';
    
    // Add spacecraft and trail to scene
    this.scene.add(this.spacecraftGroup);
    this.scene.add(this.trail);
    
    // Set initial position close to Earth surface
    this.spacecraftGroup.position.set(
      this.earthRadius + 3, // Just above Earth surface (3 units above)
      initialEvent.position.y,
      initialEvent.position.z
    );
    
    // Initialize trail points
    this.trailPoints = [];
    this.addTrailPoint(this.spacecraftGroup.position);
    this.updateTrail();
    
    console.log("Apollo 11 spacecraft initialized");
  }

  startMission() {
    console.log("Starting Apollo 11 Mission Simulation");
    
    // Clear any existing mission
    this.cleanup();
    
    this.startTime = Date.now();
    this.initializeSpacecraft();
    this.missionActive = true;
    this.followMode = true;
    this.currentEventIndex = 0;
    
    // Create mission status display
    this.createMissionStatusDisplay();
    
    // Create camera follow toggle button
    this.createFollowToggleButton();
    
    // Set initial camera position for Earth launch view
    this.setCameraForEarthLaunch();
    
    console.log("Apollo 11 mission simulation started");
  }

  setCameraForEarthLaunch() {
    // Position camera to view Earth and spacecraft launch
    const camera = this.scene.userData.camera;
    const controls = this.scene.userData.controls;
    
    if (camera && controls) {
      // Position camera for optimal Earth launch view - closer to Earth
      camera.position.set(40, 25, 40);
      controls.target.set(0, 0, 0); // Look at Earth
      controls.update();
      console.log("Camera positioned for Earth launch view");
    } else {
      console.warn("Camera or controls not found in scene.userData");
    }
  }
  
  createMissionStatusDisplay() {
    // Remove existing status display if present
    const existingDisplay = document.getElementById('apollo-mission-status');
    if (existingDisplay) {
      existingDisplay.parentNode.removeChild(existingDisplay);
    }
    
    // Create mission status display container
    const statusDisplay = document.createElement('div');
    statusDisplay.id = 'apollo-mission-status';
    statusDisplay.style.position = 'fixed';
    statusDisplay.style.top = '20px';
    statusDisplay.style.left = '20px';
    statusDisplay.style.backgroundColor = 'rgba(0, 20, 40, 0.9)';
    statusDisplay.style.padding = '20px';
    statusDisplay.style.borderRadius = '12px';
    statusDisplay.style.border = '2px solid rgba(0, 150, 255, 0.7)';
    statusDisplay.style.color = '#ffffff';
    statusDisplay.style.fontFamily = "'Courier New', monospace";
    statusDisplay.style.fontSize = '14px';
    statusDisplay.style.zIndex = '10000';
    statusDisplay.style.width = '350px';
    statusDisplay.style.boxShadow = '0 0 20px rgba(0, 100, 255, 0.5)';
    
    // Create header
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '15px';
    header.style.paddingBottom = '10px';
    header.style.borderBottom = '1px solid rgba(0, 150, 255, 0.5)';
    header.style.fontSize = '18px';
    header.style.fontWeight = 'bold';
    header.style.color = '#00ccff';
    header.innerHTML = `
      <div style="color:#ffffff;margin-bottom:5px;">🚀 APOLLO 11 MISSION</div>
      <div style="font-size:12px;color:#aaaaaa;">July 16-24, 1969</div>
    `;
    
    // Content area for mission details
    const content = document.createElement('div');
    content.id = 'apollo-mission-content';
    
    // Progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.style.marginTop = '15px';
    progressContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    progressContainer.style.borderRadius = '6px';
    progressContainer.style.height = '10px';
    progressContainer.style.position = 'relative';
    progressContainer.style.overflow = 'hidden';
    
    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.id = 'apollo-mission-progress';
    progressBar.style.backgroundColor = '#00aaff';
    progressBar.style.height = '100%';
    progressBar.style.width = '0%';
    progressBar.style.borderRadius = '6px';
    progressBar.style.transition = 'width 1s ease';
    
    // Assemble the display
    progressContainer.appendChild(progressBar);
    statusDisplay.appendChild(header);
    statusDisplay.appendChild(content);
    statusDisplay.appendChild(progressContainer);
    document.body.appendChild(statusDisplay);
    
    // Update mission status initially
    this.updateMissionStatus();
  }
  
  createFollowToggleButton() {
    // Remove existing button if present
    const existingButton = document.getElementById('apollo-follow-toggle');
    if (existingButton) {
      existingButton.parentNode.removeChild(existingButton);
    }
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'apollo-follow-toggle';
    toggleButton.style.position = 'fixed';
    toggleButton.style.bottom = '30px';
    toggleButton.style.right = '30px';
    toggleButton.style.padding = '12px 18px';
    toggleButton.style.backgroundColor = 'rgba(0, 50, 100, 0.9)';
    toggleButton.style.color = '#ffffff';
    toggleButton.style.border = '2px solid #00aaff';
    toggleButton.style.borderRadius = '8px';
    toggleButton.style.fontFamily = "'Arial', sans-serif";
    toggleButton.style.fontSize = '14px';
    toggleButton.style.cursor = 'pointer';
    toggleButton.style.zIndex = '10000';
    toggleButton.style.fontWeight = 'bold';
    
    // Set initial text based on follow mode
    this.updateFollowButtonText(toggleButton);
    
    // Add click handler
    toggleButton.addEventListener('click', () => {
      this.followMode = !this.followMode;
      this.updateFollowButtonText(toggleButton);
    });
    
    document.body.appendChild(toggleButton);
  }
  
  updateFollowButtonText(button) {
    if (!button) return;
    
    if (this.followMode) {
      button.textContent = '📷 Following Spacecraft';
      button.style.backgroundColor = 'rgba(0, 80, 160, 0.9)';
    } else {
      button.textContent = '🔓 Free Camera';
      button.style.backgroundColor = 'rgba(80, 40, 0, 0.9)';
    }
  }
  
  updateMissionStatus() {
    if (!this.missionActive) return;
    
    const content = document.getElementById('apollo-mission-content');
    const progressBar = document.getElementById('apollo-mission-progress');
    
    if (!content || !progressBar) return;
    
    // Calculate mission progress
    const timeScale = 2.0; // Mission speed multiplier
    const elapsedTime = (Date.now() - this.startTime) / 1000 * timeScale;
    const totalMissionTime = this.missionEvents[this.missionEvents.length - 1].timestamp;
    const progressPercentage = Math.min(100, (elapsedTime / totalMissionTime) * 100);
    
    // Get current event and next event
    const currentEvent = this.missionEvents[this.currentEventIndex];
    const nextEvent = this.currentEventIndex < this.missionEvents.length - 1 ? 
                     this.missionEvents[this.currentEventIndex + 1] : null;
    
    // Format time
    const formatTime = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Calculate time to next event
    let timeToNextEvent = '';
    if (nextEvent) {
      const timeRemaining = nextEvent.timestamp - elapsedTime;
      if (timeRemaining > 0) {
        timeToNextEvent = formatTime(timeRemaining);
      } else {
        timeToNextEvent = '00:00:00';
      }
    }
    
    // Update the content
    content.innerHTML = `
      <div style="margin-bottom:10px;">
        <strong style="color:#00ccff;">Phase:</strong> 
        <span style="color:#ffffff;">${currentEvent.description}</span>
      </div>
      <div style="margin-bottom:10px;">
        <strong style="color:#00ccff;">Historic Time:</strong> 
        <span style="color:#ffffff; font-size:12px;">${currentEvent.historicTime}</span>
      </div>
      <div style="margin-bottom:10px;">
        <strong style="color:#00ccff;">Mission Time:</strong> 
        <span style="color:#ffffff;">T+${formatTime(elapsedTime)}</span>
      </div>
      ${nextEvent ? `
      <div style="margin-bottom:10px;">
        <strong style="color:#00ccff;">Next Event:</strong> 
        <span style="color:#ffffff; font-size:12px;">${nextEvent.description}</span>
      </div>
      <div style="margin-bottom:10px;">
        <strong style="color:#00ccff;">ETA:</strong> 
        <span style="color:#ffffff;">${timeToNextEvent}</span>
      </div>
      ` : `
      <div style="margin-bottom:10px;">
        <strong style="color:#00ff00;">MISSION COMPLETE!</strong>
      </div>
      `}
      <div style="margin-top:10px; font-size:11px; color:#aaaaaa;">
        ${currentEvent.detail}
      </div>
    `;
    
    // Update progress bar
    progressBar.style.width = `${progressPercentage}%`;
    
    // Schedule next update
    setTimeout(() => this.updateMissionStatus(), 1000);
  }
  
  updateMission() {
    if (!this.startTime || !this.spacecraftGroup || !this.missionActive) return;

    const timeScale = 2.0; // Mission speed multiplier
    const elapsedTime = (Date.now() - this.startTime) / 1000 * timeScale; 

    // Check if we've reached a new mission event
    while (
      this.currentEventIndex < this.missionEvents.length - 1 &&
      elapsedTime >= this.missionEvents[this.currentEventIndex + 1].timestamp
    ) {
      this.currentEventIndex++;
      const eventInfo = this.missionEvents[this.currentEventIndex];
      console.log(`Mission event: ${eventInfo.description}`);
      
      // Show event notification
      this.showEventNotification(eventInfo);
    }

    const currentEvent = this.missionEvents[this.currentEventIndex];
    const nextEvent = this.missionEvents[this.currentEventIndex + 1];

    if (nextEvent) {
      const progress = Math.min(1, 
        (elapsedTime - currentEvent.timestamp) /
        (nextEvent.timestamp - currentEvent.timestamp)
      );

      // Calculate positions relative to celestial bodies
      const currentPosition = this.calculateRealPosition(currentEvent);
      const nextPosition = this.calculateRealPosition(nextEvent);

      // Interpolate spacecraft position
      let newPosition = new Vector3();
      newPosition.lerpVectors(currentPosition, nextPosition, progress);
      
      // Add realistic trajectory curves
      this.addTrajectoryEffects(newPosition, currentEvent, nextEvent, progress);
      
      this.spacecraftGroup.position.copy(newPosition);
      
      // Rotate spacecraft to face direction of travel
      this.orientSpacecraft(newPosition);
      
      // Add position to trail
      if (this.frameCount % 5 === 0) { // Add trail point every 5 frames
        this.addTrailPoint(newPosition);
      }
    } else {
      // Mission complete - final position
      const finalPosition = this.calculateRealPosition(currentEvent);
      this.spacecraftGroup.position.copy(finalPosition);
    }
    
    // Update visual effects
    this.updateVisualEffects(currentEvent);
    
    // Update trail
    this.updateTrail();
    
    this.frameCount++;
  }

  calculateRealPosition(event) {
    // Convert mission data positions to realistic 3D coordinates
    const pos = new Vector3(event.position.x, event.position.y, event.position.z);
    
    // Use our stored Earth position from initializeSpacecraft
    const earthPosition = new Vector3();
    
    // If we have a stored Earth position, use it
    if (this.earthPosition && this.earthPosition.length() > 0) {
      earthPosition.copy(this.earthPosition);
    } else {
      // As a fallback, try to find Earth in the scene
      this.scene.traverse((object) => {
        if (object.isGroup && (object.userData.isGlobe || object.children.some(child => child.userData && child.userData.isGlobe))) {
          earthPosition.copy(object.position);
          // Store for future use
          if (!this.earthPosition) this.earthPosition = new Vector3();
          this.earthPosition.copy(object.position);
        }
      });
      
      // If Earth was not found, use default positions
      if (earthPosition.length() === 0) {
        console.warn("Earth position not found in scene, using default coordinates");
        // Set default Earth position - should match the Sun.js updateEarthPosition function
        const SUN_DISTANCE = 5500;
        const EARTH_ORBIT_SIZE = 0.5;
        earthPosition.set(-SUN_DISTANCE * EARTH_ORBIT_SIZE, 0, 0);
        
        // Store for future use
        if (!this.earthPosition) this.earthPosition = new Vector3();
        this.earthPosition.copy(earthPosition);
      }
    }
    
    // Adjust positions based on mission phase
    switch (event.action) {
      case 'launch':
        // Launch positions - close to Earth surface
        return new Vector3(
          earthPosition.x + this.earthRadius + pos.y * 2, // Altitude above Earth
          earthPosition.y + pos.z * 2,
          earthPosition.z + pos.x * 2
        );
        
      case 'earth_orbit':
        // Earth orbit - circular orbit around Earth
        const orbitRadius = this.earthRadius + 8 + pos.y * 0.5;
        const orbitAngle = (pos.x / 20) * Math.PI * 2;
        return new Vector3(
          earthPosition.x + orbitRadius * Math.cos(orbitAngle),
          earthPosition.y + pos.z * 2,
          earthPosition.z + orbitRadius * Math.sin(orbitAngle)
        );
        
      case 'translunar':
      case 'midcourse':
        // Path to Moon - interpolate between Earth and Moon
        const earthToMoonProgress = pos.x / 300;
        // Get moon position relative to Earth
        const moonDirection = new Vector3(1, 0, 0); // Default moon direction if not found
        
        // Calculate direction to Moon
        this.scene.traverse((object) => {
          if (object.userData && object.userData.isMoon) {
            moonDirection.copy(object.position).sub(earthPosition).normalize();
          }
        });
        
        return new Vector3(
          earthPosition.x + earthToMoonProgress * this.moonDistance * moonDirection.x,
          earthPosition.y + pos.y * 0.5 + earthToMoonProgress * this.moonDistance * moonDirection.y,
          earthPosition.z + pos.z * 0.5 + earthToMoonProgress * this.moonDistance * moonDirection.z
        );
        
      case 'lunar_orbit':
      case 'landing':
      case 'ascent':
        // Near Moon - positions relative to Moon
        const moonPosition = new Vector3();
        this.scene.traverse((object) => {
          if (object.userData && object.userData.isMoon) {
            moonPosition.copy(object.position);
          }
        });
        
        // If Moon not found, use estimated position
        if (moonPosition.length() === 0) {
          moonPosition.copy(earthPosition).add(new Vector3(this.moonDistance, 0, 0));
        }
        
        const lunarOffset = new Vector3(
          (pos.x - 300) * 2,
          pos.y * 2,
          pos.z * 2
        );
        return moonPosition.clone().add(lunarOffset);
        
      case 'return':
        // Return journey - interpolate back to Earth
        const returnProgress = 1 - ((pos.x) / 200);
        
        // Get moon position for return journey
        const returnMoonPos = new Vector3();
        this.scene.traverse((object) => {
          if (object.userData && object.userData.isMoon) {
            returnMoonPos.copy(object.position);
          }
        });
        
        // If Moon not found, use estimated position
        if (returnMoonPos.length() === 0) {
          returnMoonPos.copy(earthPosition).add(new Vector3(this.moonDistance, 0, 0));
        }
        
        // Interpolate between Moon and Earth positions
        const returnVector = new Vector3();
        returnVector.lerpVectors(returnMoonPos, earthPosition, returnProgress);
        return returnVector.clone().add(new Vector3(0, pos.y * 0.5, pos.z * 0.5));
        
      case 'splashdown':
        // Splashdown - back at Earth
        return new Vector3(
          earthPosition.x + this.earthRadius + 1,
          earthPosition.y + pos.y,
          earthPosition.z + pos.z
        );
        
      default:
        return earthPosition.clone().add(pos);
    }
  }

  addTrajectoryEffects(position, currentEvent, nextEvent, progress) {
    // Add realistic trajectory curves for different mission phases
    
    if (currentEvent.action === 'translunar' || currentEvent.action === 'return') {
      // Add gravitational curve for interplanetary transfer
      const distance = position.length();
      const curveHeight = distance * 0.1;
      const curveFactor = 4 * progress * (1 - progress); // Parabolic curve
      position.y += curveHeight * curveFactor;
    }
    
    if (currentEvent.action === 'earth_orbit') {
      // Add orbital mechanics - elliptical adjustments
      const orbitEccentricity = 0.1;
      const eccentricityFactor = orbitEccentricity * Math.sin(progress * Math.PI * 2);
      position.multiplyScalar(1 + eccentricityFactor);
    }
  }

  orientSpacecraft(newPosition) {
    // Orient spacecraft to face direction of travel
    if (this.lastPosition) {
      const direction = new Vector3().subVectors(newPosition, this.lastPosition);
      if (direction.length() > 0.001) {
        direction.normalize();
        const rotationMatrix = new Matrix4().lookAt(
          new Vector3(0, 0, 0),
          direction,
          new Vector3(0, 1, 0)
        );
        this.spacecraftGroup.quaternion.setFromRotationMatrix(rotationMatrix);
      }
    }
    this.lastPosition = newPosition.clone();
  }

  updateVisualEffects(currentEvent) {
    const time = Date.now() * 0.001;
    
    // Update spacecraft glow based on mission phase
    this.spacecraftGroup.traverse((object) => {
      if (object.name === 'spacecraftGlow') {
        // Pulsing glow effect
        const pulseFactor = 0.2 * Math.sin(time * 2) + 0.4; // Increased base visibility
        object.material.opacity = pulseFactor;
      }
      
      if (object.name === 'engineGlow') {
        // Engine effects during propulsion phases
        if (currentEvent.action === 'launch' || 
            currentEvent.action === 'translunar' || 
            currentEvent.action === 'return' ||
            currentEvent.action === 'lunar_orbit') {
          
          object.material.opacity = 0.7 + 0.3 * Math.sin(time * 8);
          object.scale.set(
            1 + 0.2 * Math.random(),
            1 + 0.4 * Math.random(),
            1 + 0.2 * Math.random()
          );
        } else {
          object.material.opacity = 0;
        }
      }
    });
  }

  addTrailPoint(position) {
    this.trailPoints.push(position.x, position.y, position.z);
    
    // Limit trail length
    const maxPoints = 200;
    if (this.trailPoints.length > maxPoints * 3) {
      this.trailPoints = this.trailPoints.slice(-maxPoints * 3);
    }
  }
  
  updateTrail() {
    if (this.trailPoints.length > 0) {
      this.trailGeometry.setAttribute(
        'position', 
        new Float32BufferAttribute(this.trailPoints, 3)
      );
      this.trailGeometry.attributes.position.needsUpdate = true;
    }
  }

  showEventNotification(eventInfo) {
    // Remove existing notification if present
    if (this.notificationElement && this.notificationElement.parentNode) {
      this.notificationElement.parentNode.removeChild(this.notificationElement);
    }
    
    // Create new notification
    this.notificationElement = document.createElement('div');
    this.notificationElement.id = 'apollo-event-notification';
    this.notificationElement.style.position = 'fixed';
    this.notificationElement.style.bottom = '120px';
    this.notificationElement.style.left = '50%';
    this.notificationElement.style.transform = 'translateX(-50%)';
    this.notificationElement.style.backgroundColor = 'rgba(0, 0, 100, 0.9)';
    this.notificationElement.style.color = '#fff';
    this.notificationElement.style.padding = '20px 30px';
    this.notificationElement.style.borderRadius = '12px';
    this.notificationElement.style.fontFamily = "'Arial', sans-serif";
    this.notificationElement.style.fontSize = '16px';
    this.notificationElement.style.fontWeight = 'bold';
    this.notificationElement.style.zIndex = '10000';
    this.notificationElement.style.border = '2px solid rgba(0, 255, 255, 0.7)';
    this.notificationElement.style.boxShadow = '0 0 30px rgba(0, 150, 255, 0.8)';
    this.notificationElement.style.textAlign = 'center';
    this.notificationElement.style.maxWidth = '400px';
    this.notificationElement.innerHTML = `
      <div style="color:#00ffff;font-size:20px;margin-bottom:8px;">🚀 APOLLO 11 EVENT</div>
      <div style="font-size:18px;margin-bottom:5px;">${eventInfo.description}</div>
      <div style="font-size:12px;color:#aaaaaa;margin-top:8px;">${eventInfo.historicTime}</div>
      <div style="font-size:13px;color:#cccccc;margin-top:5px;font-style:italic;">${eventInfo.detail}</div>
    `;
    
    document.body.appendChild(this.notificationElement);
    
    // Fade in animation
    this.notificationElement.style.opacity = '0';
    this.notificationElement.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      if (this.notificationElement) {
        this.notificationElement.style.opacity = '1';
      }
    }, 10);
    
    // Remove notification after 6 seconds
    setTimeout(() => {
      if (this.notificationElement) {
        this.notificationElement.style.opacity = '0';
        setTimeout(() => {
          if (this.notificationElement && this.notificationElement.parentNode) {
            this.notificationElement.parentNode.removeChild(this.notificationElement);
            this.notificationElement = null;
          }
        }, 500);
      }
    }, 6000);
  }

  followSpacecraft(camera, controls) {
    if (!this.spacecraftGroup || !this.missionActive || !this.followMode) return;
    
    const position = this.spacecraftGroup.position.clone();
    const currentEvent = this.missionEvents[this.currentEventIndex];
    
    // Camera parameters based on mission phase
    let cameraDistance, cameraHeight;
    
    switch (currentEvent.action) {
      case 'launch':
        cameraDistance = 60; // Closer for launch
        cameraHeight = 30;
        break;
      case 'earth_orbit':
        cameraDistance = 80;
        cameraHeight = 40;
        break;
      case 'translunar':
      case 'midcourse':
        cameraDistance = 120;
        cameraHeight = 60;
        break;
      case 'lunar_orbit':
      case 'landing':
      case 'ascent':
        cameraDistance = 50;
        cameraHeight = 25;
        break;
      case 'return':
        cameraDistance = 100;
        cameraHeight = 50;
        break;
      default:
        cameraDistance = 80;
        cameraHeight = 40;
    }
    
    // Calculate ideal camera position
    const cameraOffset = new Vector3(
      -cameraDistance * 0.7,
      cameraHeight,
      -cameraDistance * 0.7
    );
    
    const newCameraPos = new Vector3().addVectors(position, cameraOffset);
    
    // Smooth camera movement
    camera.position.lerp(newCameraPos, 0.03);
    controls.target.lerp(position, 0.05);
    controls.update();
  }

  cleanup() {
    console.log("Cleaning up Apollo 11 mission simulation");
    
    if (this.spacecraftGroup) {
      this.scene.remove(this.spacecraftGroup);
      this.spacecraftGroup.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();
      });
      this.spacecraftGroup = null;
    }
    
    if (this.trail) {
      this.scene.remove(this.trail);
      this.trail.geometry.dispose();
      this.trail.material.dispose();
      this.trail = null;
    }
    
    // Remove UI elements
    const elements = [
      'apollo-mission-status',
      'apollo-follow-toggle',
      'apollo-event-notification'
    ];
    
    elements.forEach(id => {
      const element = document.getElementById(id);
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    
    this.missionActive = false;
    this.trailPoints = [];
    this.currentEventIndex = 0;
    this.startTime = null;
    this.lastPosition = null;
    this.notificationElement = null;
    
    console.log("Apollo mission simulation cleaned up");
  }
  
  // Method to update Earth position if it changes
  updateEarthPosition(earthObj) {
    if (earthObj && earthObj.position) {
      if (!this.earthPosition) this.earthPosition = new Vector3();
      this.earthPosition.copy(earthObj.position);
      console.log('Updated Earth position in Apollo mission:', this.earthPosition);
    }
  }
}