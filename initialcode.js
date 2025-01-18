import ThreeGlobe from "three-globe";
import { WebGLRenderer, Scene, PerspectiveCamera, AmbientLight, DirectionalLight, MeshBasicMaterial, Mesh, Color, Fog, PointLight, Group, Vector3, BufferGeometry, SphereGeometry, CylinderGeometry, LineLoop, LineBasicMaterial, Raycaster, RingGeometry, DoubleSide } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import countries from "./assets/Globe Data Min.json";
import spaceMusic from "./assets/spacemusic.mp3";

// MediaPipe Hands setup
import { Hands, HAND_CONNECTIONS } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";


let renderer, camera, scene, controls;
let Globe;
let globeGroup;
let audio;
let audioPlayed = false;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;
let currentAnimation = null;
let currentTypeWriter = null;
let mouseX = 0;
let mouseY = 0;


init();
globeGroup = initGlobe();
drawCountryBorders();
addStars();
shootingStars();
prepareAmbientMusic();
onWindowResize();
animate();
createButtons();

function init() {
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.overflow = "hidden";

  scene = new Scene();
  scene.add(new AmbientLight(0xffffff, 0.3));
  scene.background = new Color(0x000000);

  camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

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

  scene.fog = new Fog(0x535ef3, 400, 2000);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.dynamicDampingFactor = 0.01;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = 200;
  controls.maxDistance = 1000;
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
      camera.position.z += 40; // Adjust the zoom speed
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
        opacity: 0.6,
      });
      const borderLine = new LineLoop(borderGeometry, borderMaterial);
      group.add(borderLine);
    });
  }

  return borderGroup;
}

function addStars() {
  const starGeometry = new SphereGeometry(1.3, 24, 24);
  const colors = [0x0000ff, 0xff0000, 0xffff00, 0xffffff, 0x00ff00];

  for (let i = 0; i < 19000; i++) {
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

function animate() {
  globeGroup.rotation.y += 0.002;
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
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

  // Create Button 1
  const button1 = document.createElement("button");
  button1.innerText = "Shortest Path";
  button1.style.padding = "10px 20px";
  button1.style.fontSize = "16px";
  button1.style.backgroundColor = "#0c529c";
  button1.style.color = "#ffffff";
  button1.style.border = "none";
  button1.style.borderRadius = "5px";
  button1.style.cursor = "pointer";
  menuContent.appendChild(button1);

  // Create Button 2
  const button2 = document.createElement("button");
  button2.innerText = "Internet Cables";
  button2.style.padding = "10px 20px";
  button2.style.fontSize = "16px";
  button2.style.backgroundColor = "#0c529c";
  button2.style.color = "#ffffff";
  button2.style.border = "none";
  button2.style.borderRadius = "5px";
  button2.style.cursor = "pointer";
  menuContent.appendChild(button2);

  // Create Button 3 (Space Debris)
  const button3 = document.createElement("button");
  button3.innerText = "Space Debris";
  button3.style.padding = "10px 20px";
  button3.style.fontSize = "16px";
  button3.style.backgroundColor = "#0c529c";
  button3.style.color = "#ffffff";
  button3.style.border = "none";
  button3.style.borderRadius = "5px";
  button3.style.cursor = "pointer";
  menuContent.appendChild(button3);

  // Create Reset Button
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

  // Add event listeners for buttons
  button1.addEventListener("click", () => {
    stopCurrentAnimation();
    stopCurrentTypeWriter();
    Globe.arcsData([]); // Clear existing arcs
    createVerticalButton();
    showShortestPath();
    menuContent.style.display = "none"; // Close menu after click
  });

  button2.addEventListener("click", () => {
    stopCurrentAnimation();
    stopCurrentTypeWriter();
    Globe.arcsData([]); // Clear existing arcs
    showInternetCables();
    menuContent.style.display = "none"; // Close menu after click
  });

  button3.addEventListener("click", () => {
    clearDebrisAndOrbits();
    stopCurrentAnimation();
    stopCurrentTypeWriter();
    Globe.arcsData([]); // Clear existing arcs
    console.log("arcs cleaned");
    showSpaceDebris();
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
      low earth orbit, medium earth and geostationary, research them and add them thanks
    `;
    typeWriter(explanationText, verticalButton);
  }
}

function clearDebrisAndOrbits() {
  // Remove all debris and orbits from the globeGroup
  globeGroup.children = globeGroup.children.filter((child) => {
    // Keep objects that are NOT debris or orbits
    return !child.userData?.isDebrisOrOrbit;
  });
}

function showInternetCables() {
  createVerticalButton();

  // Example data for undersea internet cables
  const underseaCables = [
    // Trans-Pacific Cables
    {
      startLat: 37.7749, // San Francisco, USA
      startLng: -122.4194,
      endLat: 35.6895, // Tokyo, Japan
      endLng: 139.6917,
      color: "#00ff00",
      label: "Trans-Pacific Cable 1",
    },
    {
      startLat: 34.0522, // Los Angeles, USA
      startLng: -118.2437,
      endLat: 22.3964, // Hong Kong
      endLng: 114.1095,
      color: "#00ff00",
      label: "Trans-Pacific Cable 2",
    },
    {
      startLat: -33.8688, // Sydney, Australia
      startLng: 151.2093,
      endLat: 34.0522, // Los Angeles, USA
      endLng: -118.2437,
      color: "#00ff00",
      label: "Trans-Pacific Cable 3",
    },
    // Trans-Atlantic Cables
    {
      startLat: 40.7128, // New York, USA
      startLng: -74.006,
      endLat: 51.5074, // London, UK
      endLng: -0.1278,
      color: "#ff0000",
      label: "Trans-Atlantic Cable 1",
    },
    {
      startLat: 48.8566, // Paris, France
      startLng: 2.3522,
      endLat: 40.7128, // New York, USA
      endLng: -74.006,
      color: "#ff0000",
      label: "Trans-Atlantic Cable 2",
    },
    // Asia-Europe Cables
    {
      startLat: 1.3521, // Singapore
      startLng: 103.8198,
      endLat: 51.5074, // London, UK
      endLng: -0.1278,
      color: "#0000ff",
      label: "Asia-Europe Cable 1",
    },
    {
      startLat: 22.3964, // Hong Kong
      startLng: 114.1095,
      endLat: 48.8566, // Paris, France
      endLng: 2.3522,
      color: "#0000ff",
      label: "Asia-Europe Cable 2",
    },
    // Africa-Europe Cables
    {
      startLat: -33.9249, // Cape Town, South Africa
      startLng: 18.4241,
      endLat: 51.5074, // London, UK
      endLng: -0.1278,
      color: "#ffff00",
      label: "Africa-Europe Cable 1",
    },
    {
      startLat: 6.5244, // Lagos, Nigeria
      startLng: 3.3792,
      endLat: 48.8566, // Paris, France
      endLng: 2.3522,
      color: "#ffff00",
      label: "Africa-Europe Cable 2",
    },
    // South America Cables
    {
      startLat: -23.5505, // São Paulo, Brazil
      startLng: -46.6333,
      endLat: 40.7128, // New York, USA
      endLng: -74.006,
      color: "#ff00ff",
      label: "South America Cable 1",
    },
    {
      startLat: -34.6037, // Buenos Aires, Argentina
      startLng: -58.3816,
      endLat: 51.5074, // London, UK
      endLng: -0.1278,
      color: "#ff00ff",
      label: "South America Cable 2",
    },
  ];

  // Example data for terrestrial fiber-optic networks
  const terrestrialNetworks = [
    // North America
    {
      startLat: 37.7749, // San Francisco, USA
      startLng: -122.4194,
      endLat: 34.0522, // Los Angeles, USA
      endLng: -118.2437,
      color: "#00ffff",
      label: "San Francisco-Los Angeles Fiber",
    },
    {
      startLat: 40.7128, // New York, USA
      startLng: -74.006,
      endLat: 38.9072, // Washington, D.C., USA
      endLng: -77.0369,
      color: "#00ffff",
      label: "New York-Washington Fiber",
    },
    // Europe
    {
      startLat: 48.8566, // Paris, France
      startLng: 2.3522,
      endLat: 52.5200, // Berlin, Germany
      endLng: 13.4050,
      color: "#ffa500",
      label: "Paris-Berlin Fiber",
    },
    {
      startLat: 51.5074, // London, UK
      startLng: -0.1278,
      endLat: 55.7558, // Moscow, Russia
      endLng: 37.6173,
      color: "#ffa500",
      label: "London-Moscow Fiber",
    },
    // Asia
    {
      startLat: 35.6895, // Tokyo, Japan
      startLng: 139.6917,
      endLat: 37.5665, // Seoul, South Korea
      endLng: 126.9780,
      color: "#800080",
      label: "Tokyo-Seoul Fiber",
    },
    {
      startLat: 22.3964, // Hong Kong
      startLng: 114.1095,
      endLat: 39.9042, // Beijing, China
      endLng: 116.4074,
      color: "#800080",
      label: "Hong Kong-Beijing Fiber",
    },
    // Africa
    {
      startLat: -33.9249, // Cape Town, South Africa
      startLng: 18.4241,
      endLat: -26.2041, // Johannesburg, South Africa
      endLng: 28.0473,
      color: "#ff00ff",
      label: "Cape Town-Johannesburg Fiber",
    },
    {
      startLat: 6.5244, // Lagos, Nigeria
      startLng: 3.3792,
      endLat: 9.0579, // Accra, Ghana
      endLng: -0.1969,
      color: "#ff00ff",
      label: "Lagos-Accra Fiber",
    },
    // South America
    {
      startLat: -23.5505, // São Paulo, Brazil
      startLng: -46.6333,
      endLat: -34.6037, // Buenos Aires, Argentina
      endLng: -58.3816,
      color: "#00ff00",
      label: "São Paulo-Buenos Aires Fiber",
    },
    {
      startLat: -12.0464, // Lima, Peru
      startLng: -77.0428,
      endLat: -33.4489, // Santiago, Chile
      endLng: -70.6693,
      color: "#00ff00",
      label: "Lima-Santiago Fiber",
    },
  ];

  // Example data for satellite links
  const satelliteLinks = [
    {
      startLat: 0, // Equator (satellite ground station)
      startLng: 0,
      endLat: 51.5074, // London, UK
      endLng: -0.1278,
      color: "#800080",
      label: "Satellite Link to London",
    },
    {
      startLat: 0, // Equator (satellite ground station)
      startLng: 0,
      endLat: 40.7128, // New York, USA
      endLng: -74.006,
      color: "#800080",
      label: "Satellite Link to New York",
    },
    {
      startLat: 0, // Equator (satellite ground station)
      startLng: 0,
      endLat: 35.6895, // Tokyo, Japan
      endLng: 139.6917,
      color: "#800080",
      label: "Satellite Link to Tokyo",
    },
    {
      startLat: 0, // Equator (satellite ground station)
      startLng: 0,
      endLat: -33.8688, // Sydney, Australia
      endLng: 151.2093,
      color: "#800080",
      label: "Satellite Link to Sydney",
    },
    {
      startLat: 0, // Equator (satellite ground station)
      startLng: 0,
      endLat: -23.5505, // São Paulo, Brazil
      endLng: -46.6333,
      color: "#800080",
      label: "Satellite Link to São Paulo",
    },
    {
      startLat: 0, // Equator (satellite ground station)
      startLng: 0,
      endLat: 6.5244, // Lagos, Nigeria
      endLng: 3.3792,
      color: "#800080",
      label: "Satellite Link to Lagos",
    },
  ];

  // Combine all data into a single array
  const allCables = [...underseaCables, ...terrestrialNetworks, ...satelliteLinks];

  // Clear existing arcs
  Globe.arcsData([]);

  // Add new arcs for all cables
  Globe.arcsData(allCables)
    .arcStartLat((d) => d.startLat)
    .arcStartLng((d) => d.startLng)
    .arcEndLat((d) => d.endLat)
    .arcEndLng((d) => d.endLng)
    .arcColor((d) => d.color)
    .arcDashLength(0.5)
    .arcDashGap(0.1)
    .arcDashAnimateTime(2000)
    .arcStroke(0.5)
    .arcsTransitionDuration(1000);

  // Add tooltips for each cable
  const tooltip = document.createElement("div");
  tooltip.style.position = "absolute";
  tooltip.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  tooltip.style.color = "#ffffff";
  tooltip.style.padding = "5px 10px";
  tooltip.style.borderRadius = "5px";
  tooltip.style.fontFamily = "Arial, sans-serif";
  tooltip.style.fontSize = "14px";
  tooltip.style.pointerEvents = "none";
  tooltip.style.display = "none";
  document.body.appendChild(tooltip);

  // Add event listeners for tooltips
  renderer.domElement.addEventListener("mousemove", (event) => {
    const mouse = new Vector3(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1,
      0.5
    );
    const raycaster = new Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Access arcs as part of the Globe object's children
    const arcs = Globe.children.filter((child) => child.type === "Line");
    const intersects = raycaster.intersectObjects(arcs);

    if (intersects.length > 0) {
      const arc = intersects[0].object.userData;
      tooltip.style.display = "block";
      tooltip.style.left = `${event.clientX + 10}px`;
      tooltip.style.top = `${event.clientY + 10}px`;
      tooltip.innerText = arc.label;
    } else {
      tooltip.style.display = "none";
    }
  });

  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    const explanationText = `
      Well, I did not add the question at the end of the first button for no reason. This is the Internet (or what is actually the backbone of the internet).
      Undersea cables, terrestrial networks, satellite links, go research
    `;
    typeWriter(explanationText, verticalButton);
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
  stopCurrentTypeWriter(); // Stop any ongoing typing
  element.innerHTML = ""; 

  // Create a temporary container to hold the HTML content
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlContent;
  const nodes = tempDiv.childNodes; // Get all child nodes of the HTML content

  let index = 0; // Tracks the current node being typed
  let charIndex = 0; // Tracks the current character within a text node

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
    } else {
      currentTypeWriter = null;
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

function showShortestPath() {
  const centroids = calculateCountryCentroids();
  const path = calculateShortestPath(centroids);
  visualizePathSequentially(path);

  const verticalButton = document.getElementById("verticalButton");
  if (verticalButton) {
    const explanationText = `
  If you haven't heard of the <b style="color: #FF4500;">'Travelling Salesman Problem'</b>, this is a good way to understand it. 

  Suppose you wanted to travel to <b style="color: #FFD700;">every country in the world</b> but without the 
  economical and financial restraints, except the restraint of <span style="color: #00FF00; font-style: italic;">time</span>.

  How would you do that <span style="text-decoration: underline; font-weight: bold;">effectively</span> and 
  <span style="text-decoration: underline; font-weight: bold;">efficiently</span>?

  This problem solves it. I have visualized <span style="color: #87CEEB;">arcs</span> between each country's capital, which is the 
  <b style="color: #FF69B4;">geometric centroid</b> of each country's shape. The arcs are not random; they are made using an algorithm that 
  finds the <b style="color: #00BFFF;">shortest path</b> between each of its neighboring centroids, starting from one and going to the others, 
  making a path until it reaches back.

  It's not a <b style="color: #FFA500;">backtracking algorithm</b>; it's <span style="font-weight: bold; color: #32CD32;">efficient</span> with 
  <span style="color: #DC143C;">no wasted time</span> (ironic).

  Each arc is the <span style="font-weight: bold; color: #1E90FF;">shortest flight route</span> between each close centroid, and we map the 
  world with it until we are back. <b style="color: #FF4500;">Is that how the Internet works?</b>

`;
    typeWriter(explanationText, verticalButton);
  }
}

function calculateCountryCentroids() {
  const centroids = [];

  countries.features.forEach((feature) => {
    const { geometry } = feature;
    let totalLat = 0;
    let totalLon = 0;
    let pointCount = 0;

    if (geometry.type === "Polygon") {
      geometry.coordinates.forEach((ring) => {
        ring.forEach(([lon, lat]) => {
          totalLat += lat;
          totalLon += lon;
          pointCount++;
        });
      });
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => {
        polygon.forEach((ring) => {
          ring.forEach(([lon, lat]) => {
            totalLat += lat;
            totalLon += lon;
            pointCount++;
          });
        });
      });
    }

    if (pointCount > 0) {
      const centroidLat = totalLat / pointCount;
      const centroidLon = totalLon / pointCount;
      centroids.push({ latitude: centroidLat, longitude: centroidLon });
    }
  });

  return centroids;
}

function calculateShortestPath(centroids) {
  const path = [centroids[0]];
  const unvisitedCentroids = centroids.slice(1);

  let currentCentroid = centroids[0];
  while (unvisitedCentroids.length > 0) {
    let nearestCentroid = unvisitedCentroids[0];
    let nearestDistance = haversineDistance(currentCentroid, nearestCentroid);

    for (const centroid of unvisitedCentroids) {
      const distance = haversineDistance(currentCentroid, centroid);
      if (distance < nearestDistance) {
        nearestCentroid = centroid;
        nearestDistance = distance;
      }
    }

    path.push(nearestCentroid);
    currentCentroid = nearestCentroid;
    unvisitedCentroids.splice(unvisitedCentroids.indexOf(nearestCentroid), 1);
  }

  path.push(centroids[0]);
  return path;
}

function haversineDistance(point1, point2) {
  const lat1 = point1.latitude;
  const lon1 = point1.longitude;
  const lat2 = point2.latitude;
  const lon2 = point2.longitude;

  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function visualizePathSequentially(path) {
  stopCurrentAnimation();
  const arcs = [];
  let currentIndex = 0;

  function drawNextArc() {
    if (currentIndex >= path.length - 1) {
      currentAnimation = null;
      return;
    }

    const start = path[currentIndex];
    const end = path[currentIndex + 1];
    arcs.push({
      startLat: start.latitude,
      startLng: start.longitude,
      endLat: end.latitude,
      endLng: end.longitude,
      color: "#BED754",
    });

    Globe.arcsData(arcs)
      .arcStartLat((d) => d.startLat)
      .arcStartLng((d) => d.startLng)
      .arcEndLat((d) => d.endLat)
      .arcEndLng((d) => d.endLng)
      .arcColor((d) => d.color)
      .arcDashLength(1)
      .arcDashGap(0)
      .arcDashAnimateTime(0);

    currentIndex++;
    currentAnimation = setTimeout(drawNextArc, 1000);
  }

  drawNextArc();
}