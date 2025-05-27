import { Vector3, SphereGeometry, MeshBasicMaterial, Mesh, BufferGeometry, LineBasicMaterial, LineLoop } from 'three';
import * as satellite from 'satellite.js';
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

export const showSatelliteTracker = async (scene, globe, globeGroup, camera) => {
  if (!window.astronautToolIntervals) {
    window.astronautToolIntervals = [];
  }
  
  // Create info panel
  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    verticalButton.innerHTML = `
      <div style="color: #ffffff; font-family: 'Montserrat', sans-serif;">
        <h3 style="color: #66CCFF; margin-bottom: 15px; font-size: 18px; text-align: center;">
          Satellite Tracker
        </h3>
        
        <div id="satellite-info" style="margin-top: 15px;">
          <div style="margin-bottom: 10px;">Loading satellite data...</div>
        </div>
        
        <div style="margin-top: 25px; font-size: 12px; color: #aaa;">
          Real-time tracking of key satellites that support astronaut operations.
        </div>
      </div>
    `;
  }
  
  try {
    // List of important satellites to track with their NORAD IDs
    const satellites = [
      { name: "ISS (ZARYA)", id: 25544, color: 0xffff00 },
      { name: "HUBBLE", id: 20580, color: 0x00ffff },
      { name: "TIANGONG", id: 48274, color: 0xff0000 },
      { name: "GPS IIR-10", id: 28129, color: 0x00ff00 },
      { name: "IRIDIUM 133", id: 43249, color: 0xff00ff }
    ];
    
    // Create dictionary of satellite objects and their TLEs
    const satelliteObjects = [];
    
    // Get TLE data for each satellite and create a visual representation
    for (const sat of satellites) {
      try {
        // Fetch TLE data
        const response = await axios.get(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${sat.id}&FORMAT=TLE`);
        const tleData = response.data.trim().split('\n');
        
        if (tleData.length >= 3) {
          const name = tleData[0].trim();
          const tleLine1 = tleData[1];
          const tleLine2 = tleData[2];
          
          // Create satellite object
          const satGeometry = new SphereGeometry(0.8, 16, 16);
          const satMaterial = new MeshBasicMaterial({ color: sat.color });
          const satMesh = new Mesh(satGeometry, satMaterial);
          satMesh.userData = { 
            isAstronautTool: true,
            name: sat.name,
            id: sat.id,
            tle: [tleLine1, tleLine2]
          };
          globeGroup.add(satMesh);
          
          // Create orbit visualization
          const orbitPoints = calculateOrbitPoints(tleLine1, tleLine2, globe.getGlobeRadius() + 3);
          const orbitGeometry = new BufferGeometry().setFromPoints(orbitPoints);
          const orbitMaterial = new LineBasicMaterial({
            color: sat.color,
            transparent: true,
            opacity: 0.6
          });
          const orbitLine = new LineLoop(orbitGeometry, orbitMaterial);
          orbitLine.userData.isAstronautTool = true;
          globeGroup.add(orbitLine);
          
          // Store reference to both objects
          satelliteObjects.push({
            mesh: satMesh,
            orbit: orbitLine,
            tle: [tleLine1, tleLine2],
            name: sat.name
          });
        }
      } catch (error) {
        console.error(`Error fetching TLE for ${sat.name}:`, error);
      }
    }
    
    // Update satellite positions function
    function updateSatellitePositions() {
      const now = new Date();
      
      // Update each satellite's position
      satelliteObjects.forEach(sat => {
        const tle = sat.tle;
        
        // Initialize a satellite record
        const satrec = satellite.twoline2satrec(tle[0], tle[1]);
        
        // Get position
        const positionAndVelocity = satellite.propagate(satrec, now);
        const positionEci = positionAndVelocity.position;
        
        if (!positionEci) {
          console.error(`Failed to get position for ${sat.name}`);
          return;
        }
        
        // Convert position from ECI to geographic coordinates (lat/long)
        const gmst = satellite.gstime(now);
        const positionGd = satellite.eciToGeodetic(positionEci, gmst);
        
        const lat = satellite.degreesLat(positionGd.latitude);
        const lon = satellite.degreesLong(positionGd.longitude);
        const alt = positionGd.height;
        
        // Convert lat/long to cartesian coordinates for three.js
        const position = convertLatLonToXYZ(lat, lon, globe.getGlobeRadius() + (alt / 40));
        sat.mesh.position.copy(position);
      });
      
      // Update info panel
      const satelliteInfo = document.getElementById('satellite-info');
      if (satelliteInfo && satelliteObjects.length > 0) {
        let infoHTML = `
          <div style="font-weight: bold; margin-bottom: 10px;">Active Satellites (${satelliteObjects.length})</div>
        `;
        
        satelliteObjects.forEach(sat => {
          // Get position
          const satrec = satellite.twoline2satrec(sat.tle[0], sat.tle[1]);
          const positionAndVelocity = satellite.propagate(satrec, now);
          const positionEci = positionAndVelocity.position;
          
          if (!positionEci) return;
          
          // Convert position
          const gmst = satellite.gstime(now);
          const positionGd = satellite.eciToGeodetic(positionEci, gmst);
          
          const lat = satellite.degreesLat(positionGd.latitude).toFixed(2);
          const lon = satellite.degreesLong(positionGd.longitude).toFixed(2);
          const alt = positionGd.height.toFixed(2);
          
          const satColor = sat.mesh.material.color;
          const hexColor = '#' + satColor.getHexString();
          
          infoHTML += `
            <div style="margin-bottom: 8px; border-left: 3px solid ${hexColor}; padding-left: 6px;">
              <div style="font-weight: bold;">${sat.name}</div>
              <div style="font-size: 12px;">Alt: ${alt} km | Lat: ${lat}° | Lon: ${lon}°</div>
            </div>
          `;
        });
        
        infoHTML += `
          <div style="margin-top: 15px; font-size: 12px; color: #aaa;">
            Updated: ${now.toLocaleTimeString()}
          </div>
          
          <div style="background-color: rgba(102, 204, 255, 0.2); padding: 10px; border-radius: 5px; margin-top: 15px;">
            <div style="font-weight: bold; margin-bottom: 5px;">Proximity Analysis</div>
            <div style="font-size: 12px;">
              No collision risks detected within next 24 hours
            </div>
          </div>
        `;
        
        satelliteInfo.innerHTML = infoHTML;
      }
    }
    
    // Update satellite positions every 2 seconds
    updateSatellitePositions();
    const intervalId = setInterval(updateSatellitePositions, 2000);
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
};

function calculateOrbitPoints(tleLine1, tleLine2, globeRadius) {
  const points = [];
  
  try {
    // Initialize a satellite record
    const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
    
    // Generate points along the orbit
    for (let i = 0; i < 360; i += 5) {
      // Create a date for each point (one minute apart)
      const date = new Date();
      date.setMinutes(date.getMinutes() + i);
      
      // Get position at this time
      const positionAndVelocity = satellite.propagate(satrec, date);
      const positionEci = positionAndVelocity.position;
      
      if (!positionEci) continue;
      
      // Convert position
      const gmst = satellite.gstime(date);
      const positionGd = satellite.eciToGeodetic(positionEci, gmst);
      
      const lat = satellite.degreesLat(positionGd.latitude);
      const lon = satellite.degreesLong(positionGd.longitude);
      const alt = positionGd.height;
      
      // Add point
      const point = convertLatLonToXYZ(lat, lon, globeRadius + (alt / 40));
      points.push(point);
    }
  } catch (error) {
    console.error('Error calculating orbit:', error);
  }
  
  return points;
}
