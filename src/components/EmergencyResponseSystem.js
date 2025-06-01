import { Vector3, SphereGeometry, MeshBasicMaterial, Mesh, CylinderGeometry, DoubleSide } from 'three';
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

export const showCommSatellites = async (scene, globe, globeGroup, camera) => {
  if (!window.astronautToolIntervals) {
    window.astronautToolIntervals = [];
  }
  
  // Create info panel
  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    verticalButton.innerHTML = `
      <div style="color: #ffffff; font-family: 'Montserrat', sans-serif;">
        <h3 style="color: #33ccff; margin-bottom: 15px; font-size: 18px; text-align: center;">
          Communication Satellites
        </h3>
        
        <div id="comm-sat-info" style="margin-top: 15px;">
          <div style="margin-bottom: 10px;">Loading satellite data...</div>
        </div>
        
        <div style="margin-top: 25px; font-size: 12px; color: #aaa;">
          Real-time tracking of communication satellites for emergency contact.
        </div>
      </div>
    `;
  }
  
  try {
    // List of key communication satellite constellations with NORAD IDs
    const commSatellites = [
      { name: "INMARSAT 4-F1", id: 28628, color: 0x33ccff, type: "GEO" },
      { name: "INMARSAT 5-F1", id: 39476, color: 0x33ccff, type: "GEO" },
      { name: "IRIDIUM 133", id: 43249, color: 0x3366ff, type: "LEO" },
      { name: "IRIDIUM 153", id: 43569, color: 0x3366ff, type: "LEO" },
      
      // TDRS satellites (NASA's Tracking and Data Relay Satellites)
      { name: "TDRS 12", id: 39504, color: 0xff3366, type: "GEO" },
      { name: "TDRS 13", id: 41587, color: 0xff3366, type: "GEO" },
      
      // Starlink satellites (SpaceX)
      { name: "STARLINK-1007", id: 44713, color: 0x33ff66, type: "LEO" },
      { name: "STARLINK-1097", id: 47174, color: 0x33ff66, type: "LEO" }
    ];
    
    // Create satellite objects and fetch TLE data
    const satelliteObjects = [];
    
    for (const sat of commSatellites) {
      try {
        // Fetch TLE data
        const response = await axios.get(`https://celestrak.org/NORAD/elements/gp.php?CATNR=${sat.id}&FORMAT=TLE`);
        const tleData = response.data.trim().split('\n');
        
        if (tleData.length >= 3) {
          const tleLine1 = tleData[1];
          const tleLine2 = tleData[2];
          
          // Create satellite object
          const satGeometry = new SphereGeometry(1, 16, 16);
          const satMaterial = new MeshBasicMaterial({ color: sat.color });
          const satMesh = new Mesh(satGeometry, satMaterial);
          satMesh.userData = { 
            isAstronautTool: true,
            name: sat.name,
            id: sat.id,
            type: sat.type,
            tle: [tleLine1, tleLine2]
          };
          globeGroup.add(satMesh);
          
          // Create coverage area visualization
          const coverageMesh = createCoverageArea(satMesh, sat.color, globeGroup);
          
          // Add to tracked objects
          satelliteObjects.push({
            mesh: satMesh,
            coverage: coverageMesh,
            type: sat.type,
            tle: [tleLine1, tleLine2],
            name: sat.name,
            color: sat.color
          });
        }
      } catch (error) {
        console.error(`Error fetching TLE for ${sat.name}:`, error);
      }
    }
    
    // Update satellite positions every 10 seconds
    async function updateCommSatPositions() {
      const now = new Date();
      
      for (const sat of satelliteObjects) {
        try {
          // Initialize a satellite record
          const satrec = satellite.twoline2satrec(sat.tle[0], sat.tle[1]);
          
          // Get position
          const positionAndVelocity = satellite.propagate(satrec, now);
          const positionEci = positionAndVelocity.position;
          
          if (!positionEci) continue;
          
          // Convert position
          const gmst = satellite.gstime(now);
          const positionGd = satellite.eciToGeodetic(positionEci, gmst);
          
          const lat = satellite.degreesLat(positionGd.latitude);
          const lon = satellite.degreesLong(positionGd.longitude);
          const alt = positionGd.height;
          
          // Scale altitude for visualization
          const scaledAlt = sat.type === 'GEO' ? 20 : 8;
          
          // Update position
          const position = convertLatLonToXYZ(lat, lon, globe.getGlobeRadius() + scaledAlt);
          sat.mesh.position.copy(position);
          
          // Update coverage area position and orientation
          if (sat.coverage) {
            sat.coverage.position.copy(position);
            sat.coverage.lookAt(0, 0, 0); // Point toward Earth's center
          }
        } catch (error) {
          console.error(`Error updating position for ${sat.name}:`, error);
        }
      }
      
      // Update info panel
      const commSatInfo = document.getElementById('comm-sat-info');
      if (commSatInfo) {
        let infoHTML = `
          <div style="font-weight: bold; margin-bottom: 10px;">Communication Network Status</div>
        `;
        
        // Group satellites by network/constellation
        const networks = {
          "INMARSAT": satelliteObjects.filter(sat => sat.name.includes("INMARSAT")),
          "IRIDIUM": satelliteObjects.filter(sat => sat.name.includes("IRIDIUM")),
          "TDRS": satelliteObjects.filter(sat => sat.name.includes("TDRS")),
          "STARLINK": satelliteObjects.filter(sat => sat.name.includes("STARLINK"))
        };
        
        // Add network status
        Object.entries(networks).forEach(([network, sats]) => {
          const online = sats.length;
          const color = online > 0 ? "#4CAF50" : "#FF6B6B";
          
          infoHTML += `
            <div style="margin-bottom: 8px;">
              <span style="color: ${color};">●</span> ${network}: 
              <span style="float: right;">${online} satellites online</span>
            </div>
          `;
        });
        
        // Add emergency contact options
        infoHTML += `
          <div style="background-color: rgba(51, 204, 255, 0.2); padding: 10px; border-radius: 5px; margin-top: 15px;">
            <div style="font-weight: bold; margin-bottom: 8px;">Emergency Communications</div>
            <div style="margin-bottom: 5px; font-size: 12px;">
              <span style="color: #33ccff;">■</span> INMARSAT: 7 minute window in 12 minutes
            </div>
            <div style="margin-bottom: 5px; font-size: 12px;">
              <span style="color: #3366ff;">■</span> IRIDIUM: Available now (Global coverage)
            </div>
            <div style="margin-bottom: 5px; font-size: 12px;">
              <span style="color: #ff3366;">■</span> TDRS: Available now for low-latency comms
            </div>
          </div>
          
          <div style="margin-top: 10px; font-size: 12px; color: #aaa;">
            Last updated: ${now.toLocaleTimeString()}
          </div>
        `;
        
        commSatInfo.innerHTML = infoHTML;
      }
    }
    
    // Update positions immediately and then every 10 seconds
    await updateCommSatPositions();
    const intervalId = setInterval(updateCommSatPositions, 10000);
    window.astronautToolIntervals.push(intervalId);
    
  } catch (error) {
    console.error('Error initializing communication satellites:', error);
    
    // Show error in info panel
    const commSatInfo = document.getElementById('comm-sat-info');
    if (commSatInfo) {
      commSatInfo.innerHTML = `
        <div style="color: #FF6B6B;">
          Error loading satellite data. Please try again later.
        </div>
      `;
    }
  }
};

function createCoverageArea(satelliteMesh, color, globeGroup) {
  // Create a cone to represent satellite coverage area
  const coneHeight = 20;
  const coneGeometry = new CylinderGeometry(15, 0, coneHeight, 16, 1, true);
  const coneMaterial = new MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.1,
    side: DoubleSide
  });
  
  const coverageMesh = new Mesh(coneGeometry, coneMaterial);
  coverageMesh.userData.isAstronautTool = true;
  coverageMesh.rotation.x = Math.PI;
  
  // Store reference to coverage mesh
  satelliteMesh.userData.coverageMesh = coverageMesh;
  
  // Add to globe group
  globeGroup.add(coverageMesh);
  
  return coverageMesh;
}

async function initializeEmergencyResponse() {
  // Create real-time disaster monitoring system
  addDisasterMonitoring();
  
  // Add interface for reporting observations from space
  setupObservationReporting();
  
  // Create visualizations of affected areas
  addImpactZoneVisualizations();
  
  // Add coordination tools for ground teams
  setupGroundTeamCoordination();
}
