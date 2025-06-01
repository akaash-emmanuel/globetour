import { Vector3, BufferGeometry, LineBasicMaterial, LineLoop, CanvasTexture, SpriteMaterial, Sprite } from 'three';
import axios from 'axios';

// Helper function to convert latitude and longitude to 3D coordinates
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

export const showEarthObservation = async (scene, globe, globeGroup, camera) => {
  if (!window.astronautToolIntervals) {
    window.astronautToolIntervals = [];
  }
  
  // Create info panel
  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    verticalButton.innerHTML = `
      <div style="color: #ffffff; font-family: 'Montserrat', sans-serif;">
        <h3 style="color: #4CAF50; margin-bottom: 15px; font-size: 18px; text-align: center;">
          Earth Observation System
        </h3>
        
        <div id="earth-obs-info" style="margin-top: 15px;">
          <div style="margin-bottom: 10px;">Loading Earth observation data...</div>
        </div>
        
        <div style="margin-top: 25px; font-size: 12px; color: #aaa;">
          Real-time Earth observation data from NASA EONET.
        </div>
      </div>
    `;
  }
  
  try {
    // Fetch natural event data from NASA EONET API
    const NASA_API_KEY = "jmRRPCUwwWyNaMrXJCNz8HDX8q94wPnQfKz0ig5a";
    const response = await axios.get(`https://eonet.gsfc.nasa.gov/api/v3/events?api_key=${NASA_API_KEY}`);
    const events = response.data.events;
    
    // Filter recent events (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEvents = events.filter(event => {
      const eventDate = new Date(event.geometry[0].date);
      return eventDate >= thirtyDaysAgo;
    });
    
    // Group events by category
    const eventsByCategory = {};
    recentEvents.forEach(event => {
      const category = event.categories[0].title;
      if (!eventsByCategory[category]) {
        eventsByCategory[category] = [];
      }
      eventsByCategory[category].push(event);
    });
    
    // Visualize events on the globe
    let pointData = [];
    
    Object.keys(eventsByCategory).forEach(category => {
      const events = eventsByCategory[category];
      let color;
      
      switch (category) {
        case "Wildfires": color = "#FF5722"; break;
        case "Severe Storms": color = "#0000FF"; break;
        case "Volcanoes": color = "#FF0000"; break;
        case "Sea and Lake Ice": color = "#00BCD4"; break;
        case "Drought": color = "#FFC107"; break;
        case "Earthquakes": color = "#673AB7"; break;
        case "Floods": color = "#2196F3"; break;
        default: color = "#FFFFFF";
      }
      
      events.forEach(event => {
        const geometry = event.geometry[0];
        
        if (geometry.type === "Point") {
          pointData.push({
            lat: geometry.coordinates[1],
            lng: geometry.coordinates[0],
            color: color,
            category: category,
            title: event.title,
            date: new Date(geometry.date).toLocaleDateString()
          });
        }
      });
    });
    
    // Add event markers to the globe
    visualizeEarthEvents(pointData, globe, globeGroup);
    
    // Update info panel with events summary
    updateEarthObservationInfo(eventsByCategory);
    
    // Add Earth observation control grid
    addEarthObservationGrid(globe, globeGroup);
    
  } catch (error) {
    console.error('Error fetching Earth observation data:', error);
    
    // Show error in info panel
    const earthObsInfo = document.getElementById('earth-obs-info');
    if (earthObsInfo) {
      earthObsInfo.innerHTML = `
        <div style="color: #FF6B6B;">
          Error loading Earth observation data. Please try again later.
        </div>
      `;
    }
    
    // Show simulated data
    visualizeEarthEvents([], globe, globeGroup);
    addEarthObservationGrid(globe, globeGroup);
  }
};

function visualizeEarthEvents(events, globe, globeGroup) {
  // Clear previous data
  globe.ringsData([]);
  
  // Configure rings for event visualization
  globe
    .ringsData(events)
    .ringColor('color')
    .ringMaxRadius(3)
    .ringPropagationSpeed(0.3)
    .ringRepeatPeriod(2000)
    .ringAltitude(0.01);
  
  // Add event labels
  events.forEach(event => {
    const position = convertLatLonToXYZ(event.lat, event.lng, globe.getGlobeRadius() + 0.5);
    
    // Create label
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    
    // Draw text
    context.fillStyle = event.color;
    context.font = "Bold 14px Arial";
    context.textAlign = "center";
    context.fillText(event.category, canvas.width / 2, canvas.height / 2);
    
    // Create sprite from canvas
    const texture = new CanvasTexture(canvas);
    const spriteMaterial = new SpriteMaterial({
      map: texture,
      transparent: true
    });
    const sprite = new Sprite(spriteMaterial);
    sprite.position.copy(position);
    sprite.scale.set(10, 5, 1);
    sprite.userData = {
      isAstronautTool: true,
      eventData: event
    };
    
    globeGroup.add(sprite);
  });
}

function updateEarthObservationInfo(eventsByCategory) {
  const earthObsInfo = document.getElementById('earth-obs-info');
  if (!earthObsInfo) return;
  
  let infoHTML = `
    <div style="font-size: 14px; margin-bottom: 15px;">
      Recent Earth Events (Last 30 Days)
    </div>
  `;
  
  // Add summary for each category
  for (const category in eventsByCategory) {
    const events = eventsByCategory[category];
    let color;
    
    switch (category) {
      case "Wildfires": color = "#FF5722"; break;
      case "Severe Storms": color = "#0000FF"; break;
      case "Volcanoes": color = "#FF0000"; break;
      case "Sea and Lake Ice": color = "#00BCD4"; break;
      case "Drought": color = "#FFC107"; break;
      case "Earthquakes": color = "#673AB7"; break;
      case "Floods": color = "#2196F3"; break;
      default: color = "#FFFFFF";
    }
    
    infoHTML += `
      <div style="margin-bottom: 10px; display: flex; align-items: center;">
        <div style="width: 12px; height: 12px; background-color: ${color}; margin-right: 8px; border-radius: 50%;"></div>
        <div style="flex-grow: 1;">${category}</div>
        <div style="font-weight: bold;">${events.length}</div>
      </div>
    `;
  }
  
  // Add mission recommendations based on events
  infoHTML += `
    <div style="margin-top: 20px; background-color: rgba(76, 175, 80, 0.2); padding: 10px; border-radius: 5px;">
      <div style="font-weight: bold; margin-bottom: 5px;">Mission Recommendations</div>
      <div style="font-size: 12px; margin-bottom: 3px;">
        <span style="color: #FF5722;">●</span> Monitor active wildfire regions
      </div>
      <div style="font-size: 12px; margin-bottom: 3px;">
        <span style="color: #2196F3;">●</span> Track ongoing flood impacts
      </div>
      <div style="font-size: 12px;">
        <span style="color: #FF0000;">●</span> Observe volcanic activity
      </div>
    </div>
    
    <div style="margin-top: 10px; font-size: 12px; color: #aaa;">
      Last updated: ${new Date().toLocaleTimeString()}
    </div>
  `;
  
  earthObsInfo.innerHTML = infoHTML;
}

function addEarthObservationGrid(globe, globeGroup) {
  const globeRadius = globe.getGlobeRadius();
  
  // Create latitude lines (parallels)
  for (let lat = -80; lat <= 80; lat += 20) {
    const points = [];
    
    for (let lng = -180; lng <= 180; lng += 5) {
      const point = convertLatLonToXYZ(lat, lng, globeRadius + 0.1);
      points.push(point);
    }
    
    const geometry = new BufferGeometry().setFromPoints(points);
    const material = new LineBasicMaterial({
      color: 0x4CAF50,
      transparent: true,
      opacity: 0.2
    });
    const line = new LineLoop(geometry, material);
    line.userData.isAstronautTool = true;
    globeGroup.add(line);
  }
  
  // Create longitude lines (meridians)
  for (let lng = -180; lng < 180; lng += 20) {
    const points = [];
    
    for (let lat = -90; lat <= 90; lat += 5) {
      const point = convertLatLonToXYZ(lat, lng, globeRadius + 0.1);
      points.push(point);
    }
    
    const geometry = new BufferGeometry().setFromPoints(points);
    const material = new LineBasicMaterial({
      color: 0x4CAF50,
      transparent: true,
      opacity: 0.2
    });
    const line = new LineLoop(geometry, material);
    line.userData.isAstronautTool = true;
    globeGroup.add(line);
  }
}
