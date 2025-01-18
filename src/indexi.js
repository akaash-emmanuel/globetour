import ThreeGlobe from "three-globe";
import { WebGLRenderer, Scene, PerspectiveCamera, AmbientLight, DirectionalLight, MeshBasicMaterial, Mesh, Color, Fog, PointLight, Group, Vector3, BufferGeometry, SphereGeometry, CanvasTexture, SpriteMaterial, Sprite, CylinderGeometry, LineLoop, LineBasicMaterial, Raycaster, RingGeometry, DoubleSide } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import countries from "./assets/Updated Globe Data.json";
import spaceMusic from "./assets/spacemusic.mp3";
import gsap from 'gsap';


// MediaPipe Hands setup
// import { Hands, HAND_CONNECTIONS } from "@mediapipe/hands";
// import { Camera } from "@mediapipe/camera_utils";


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
let isGlobeRotating = true;


init();
globeGroup = initGlobe();
drawCountryBorders();
addCountryLabels();
addStars();
shootingStars();
prepareAmbientMusic();
onWindowResize();
animate();
createButtons();
initializePermanentChatbot();
// rotateGlobeToCountry();

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
  controls.minDistance = 115;
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
      camera.position.z += 90; // Adjust the zoom speed
      if (camera.position.z > controls.maxDistance) {
        camera.position.z = controls.maxDistance;
      }
    }
  });
  addSearchFeature();
}
function initializePermanentChatbot() {
  const chatbotInterface = document.createElement("div");
  chatbotInterface.style.position = "absolute";
  chatbotInterface.style.bottom = "20px";
  chatbotInterface.style.left = "20px";
  chatbotInterface.style.width = "300px";
  chatbotInterface.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  chatbotInterface.style.borderRadius = "10px";
  chatbotInterface.style.padding = "20px";
  chatbotInterface.style.zIndex = "1000";
  chatbotInterface.classList.add("chatbot-interface");

  // Add minimize/maximize functionality
  const headerDiv = document.createElement("div");
  headerDiv.style.display = "flex";
  headerDiv.style.justifyContent = "space-between";
  headerDiv.style.alignItems = "center";
  headerDiv.style.marginBottom = "15px";

  const title = document.createElement("span");
  title.textContent = "International Affairs Chatbot";
  title.style.color = "#ffffff";
  title.style.fontSize = "14px";
  title.style.fontWeight = "bold";

  const minimizeBtn = document.createElement("button");
  minimizeBtn.innerHTML = "−";
  minimizeBtn.style.background = "none";
  minimizeBtn.style.border = "none";
  minimizeBtn.style.color = "#ffffff";
  minimizeBtn.style.fontSize = "20px";
  minimizeBtn.style.cursor = "pointer";
  minimizeBtn.style.padding = "0 5px";

  headerDiv.appendChild(title);
  headerDiv.appendChild(minimizeBtn);

  const contentDiv = document.createElement("div");
  contentDiv.innerHTML = `
      <p style="color: #ffffff; margin-bottom: 20px; font-size: 14px;">
          Hello, I am the International Affairs Chatbot, ready to answer all your questions! 
          Just select any two countries, and I will tell you about their geopolitical affairs.
      </p>
      <input type="text" placeholder="Enter first country" 
          style="width: 100%; padding: 8px; margin-bottom: 10px; background-color: rgba(255, 255, 255, 0.1); 
          border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 5px; color: #ffffff;">
      <input type="text" placeholder="Enter second country" 
          style="width: 100%; padding: 8px; margin-bottom: 10px; background-color: rgba(255, 255, 255, 0.1); 
          border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 5px; color: #ffffff;">
      <button id="submitCountries" style="width: 100%; padding: 8px; background-color: #0c529c; 
          border: none; border-radius: 5px; color: #ffffff; cursor: pointer;">
          Get Analysis
      </button>
      <div id="analysisResult" style="color: #ffffff; margin-top: 15px; font-size: 14px; 
          max-height: 150px; overflow-y: auto;">
      </div>
  `;

  chatbotInterface.appendChild(headerDiv);
  chatbotInterface.appendChild(contentDiv);

  // Add minimize/maximize functionality
  let isMinimized = false;
  minimizeBtn.addEventListener("click", () => {
    if (isMinimized) {
      contentDiv.style.display = "block";
      minimizeBtn.innerHTML = "−";
      chatbotInterface.style.height = "auto";
    } else {
      contentDiv.style.display = "none";
      minimizeBtn.innerHTML = "+";
      chatbotInterface.style.height = "auto";
    }
    isMinimized = !isMinimized;
  });

  // Make chatbot draggable
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  headerDiv.addEventListener("mousedown", dragStart);
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", dragEnd);
// Improved code for the initializePermanentChatbot function
function initializePermanentChatbot() {
  const chatbotInterface = document.createElement("div");
  chatbotInterface.classList.add("chatbot-interface");
  chatbotInterface.style.position = "absolute";
  chatbotInterface.style.bottom = "20px";
  chatbotInterface.style.left = "20px";
  chatbotInterface.style.width = "300px";
  chatbotInterface.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  chatbotInterface.style.borderRadius = "10px";
  chatbotInterface.style.padding = "20px";
  chatbotInterface.style.zIndex = "1000";

  // Add minimize/maximize functionality
  const headerDiv = document.createElement("div");
  headerDiv.style.display = "flex";
  headerDiv.style.justifyContent = "space-between";
  headerDiv.style.alignItems = "center";
  headerDiv.style.marginBottom = "15px";

  const title = document.createElement("span");
  title.textContent = "International Affairs Chatbot";
  title.style.color = "#ffffff";
  title.style.fontSize = "14px";
  title.style.fontWeight = "bold";

  const minimizeBtn = document.createElement("button");
  minimizeBtn.innerHTML = "−";
  minimizeBtn.style.background = "none";
  minimizeBtn.style.border = "none";
  minimizeBtn.style.color = "#ffffff";
  minimizeBtn.style.fontSize = "20px";
  minimizeBtn.style.cursor = "pointer";
  minimizeBtn.style.padding = "0 5px";

  headerDiv.appendChild(title);
  headerDiv.appendChild(minimizeBtn);

  const contentDiv = document.createElement("div");
  contentDiv.innerHTML = `
    <p style="color: #ffffff; margin-bottom: 20px; font-size: 14px;">
      Hello, I am the International Affairs Chatbot, ready to answer all your questions! 
      Just select any two countries, and I will tell you about their geopolitical affairs.
    </p>
    <input type="text" placeholder="Enter first country" 
      style="width: 100%; padding: 8px; margin-bottom: 10px; background-color: rgba(255, 255, 255, 0.1); 
      border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 5px; color: #ffffff;">
    <input type="text" placeholder="Enter second country" 
      style="width: 100%; padding: 8px; margin-bottom: 10px; background-color: rgba(255, 255, 255, 0.1); 
      border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 5px; color: #ffffff;">
    <button id="submitCountries" style="width: 100%; padding: 8px; background-color: #0c529c; 
      border: none; border-radius: 5px; color: #ffffff; cursor: pointer;">
      Get Analysis
    </button>
    <div id="analysisResult" style="color: #ffffff; margin-top: 15px; font-size: 14px; 
      max-height: 150px; overflow-y: auto;">
    </div>
  `;

  chatbotInterface.appendChild(headerDiv);
  chatbotInterface.appendChild(contentDiv);

  // Add minimize/maximize functionality
  let isMinimized = false;
  minimizeBtn.addEventListener("click", () => {
    if (isMinimized) {
      contentDiv.style.display = "block";
      minimizeBtn.innerHTML = "−";
      chatbotInterface.style.height = "auto";
    } else {
      contentDiv.style.display = "none";
      minimizeBtn.innerHTML = "+";
      chatbotInterface.style.height = "auto";
    }
    isMinimized = !isMinimized;
  });

  // Make chatbot draggable
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  headerDiv.addEventListener("mousedown", dragStart);
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", dragEnd);

  function dragStart(e) {
    initialX = e.clientX - chatbotInterface.offsetLeft;
    initialY = e.clientY - chatbotInterface.offsetTop;
    if (e.target === headerDiv || e.target === title) {
      isDragging = true;
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      // Keep chatbot within window bounds
      const maxX = window.innerWidth - chatbotInterface.offsetWidth;
      const maxY = window.innerHeight - chatbotInterface.offsetHeight;

      currentX = Math.min(Math.max(0, currentX), maxX);
      currentY = Math.min(Math.max(0, currentY), maxY);

      chatbotInterface.style.left = currentX + "px";
      chatbotInterface.style.top = currentY + "px";
    }
  }

  function dragEnd() {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
  }

  // Add loading indicator
  const loadingIndicator = document.createElement('div');
  loadingIndicator.innerHTML = 'Analyzing...';
  loadingIndicator.style.color = '#ffffff';
  loadingIndicator.style.textAlign = 'center';
  loadingIndicator.style.marginTop = '10px';
  loadingIndicator.style.display = 'none';
  contentDiv.insertBefore(loadingIndicator, contentDiv.querySelector('#analysisResult'));

  const submitButton = contentDiv.querySelector('#submitCountries');
  const country1Input = contentDiv.querySelector('input:first-of-type');
  const country2Input = contentDiv.querySelector('input:last-of-type');
  const analysisResult = contentDiv.querySelector('#analysisResult');

  submitButton.addEventListener('click', async () => {
    const country1 = country1Input.value.trim();
    const country2 = country2Input.value.trim();

    if (!country1 || !country2) {
      analysisResult.innerHTML = "Please enter both countries.";
      return;
    }

    loadingIndicator.style.display = "block";
    analysisResult.innerHTML = "";

    try {
      const response = await fetch('http://127.0.0.1:5002/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country1: country1,
          country2: country2
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      analysisResult.innerHTML = data.response
        .split('\n')
        .map(line => `<p style="margin-bottom: 8px;">${line}</p>`)
        .join('');

    } catch (error) {
      analysisResult.innerHTML = "An error occurred while analyzing the relationship. Please try again.";
    } finally {
      loadingIndicator.style.display = "none";
    }
  });

  // Add Enter key support for inputs
  [country1Input, country2Input].forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        submitButton.click();
      }
    });
  });

  document.body.appendChild(chatbotInterface);
}
  function dragStart(e) {
    initialX = e.clientX - chatbotInterface.offsetLeft;
    initialY = e.clientY - chatbotInterface.offsetTop;
    if (e.target === headerDiv || e.target === title) {
      isDragging = true;
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      // Keep chatbot within window bounds
      const maxX = window.innerWidth - chatbotInterface.offsetWidth;
      const maxY = window.innerHeight - chatbotInterface.offsetHeight;

      currentX = Math.min(Math.max(0, currentX), maxX);
      currentY = Math.min(Math.max(0, currentY), maxY);

      chatbotInterface.style.left = currentX + "px";
      chatbotInterface.style.top = currentY + "px";
    }
  }

  function dragEnd() {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
  }

  // ADD THE NEW CODE HERE
  const submitButton = contentDiv.querySelector('#submitCountries');
  const country1Input = contentDiv.querySelector('input:first-of-type');
  const country2Input = contentDiv.querySelector('input:last-of-type');
  const analysisResult = contentDiv.querySelector('#analysisResult');

  // Add loading indicator
  const loadingIndicator = document.createElement('div');
  loadingIndicator.innerHTML = 'Analyzing...';
  loadingIndicator.style.color = '#ffffff';
  loadingIndicator.style.textAlign = 'center';
  loadingIndicator.style.marginTop = '10px';
  loadingIndicator.style.display = 'none';
  contentDiv.insertBefore(loadingIndicator, analysisResult);

  submitButton.addEventListener('click', async () => {
    const country1 = country1Input.value.trim();
    const country2 = country2Input.value.trim();

    if (!country1 || !country2) {
      analysisResult.innerHTML = "Please enter both countries.";
      return;
    }

    loadingIndicator.style.display = "block";
    analysisResult.innerHTML = "";

    try {
      const response = await fetch('http://127.0.0.1:5002/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country1: country1,
          country2: country2
        })
      });


      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      analysisResult.innerHTML = data.response
        .split('\n')
        .map(line => `<p style="margin-bottom: 8px;">${line}</p>`)
        .join('');

    } catch (error) {
      analysisResult.innerHTML = "An error occurred while analyzing the relationship. Please try again.";
    } finally {
      loadingIndicator.style.display = "none";
    }
  });

  // Add Enter key support for inputs
  [country1Input, country2Input].forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        submitButton.click();
      }
    });
  });

  document.body.appendChild(chatbotInterface);
}
function addSearchFeature() {
  // Create search container
  const searchContainer = document.createElement("div");
  searchContainer.style.position = "absolute";
  searchContainer.style.top = "20px";
  searchContainer.style.right = "20px";
  searchContainer.style.zIndex = "1000";
  searchContainer.style.display = "flex";
  searchContainer.style.alignItems = "center";

  // Create search input
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search countries...";
  searchInput.style.padding = "10px 20px";
  searchInput.style.width = "180px";
  searchInput.style.borderRadius = "25px";
  searchInput.style.border = "none";
  searchInput.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
  searchInput.style.color = "#ffffff";
  searchInput.style.fontSize = "16px";
  searchInput.style.outline = "none";

  // Create loading indicator
  const loadingIndicator = document.createElement("div");
  loadingIndicator.style.display = "none";
  loadingIndicator.style.marginLeft = "10px";
  loadingIndicator.style.color = "#ffffff";
  loadingIndicator.innerHTML = "Searching...";

  // Add elements to container
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(loadingIndicator);
  document.body.appendChild(searchContainer);

  // Add search functionality
  searchInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      const searchTerm = searchInput.value.trim().toLowerCase(); // Normalize search term

      if (!searchTerm) {
        return;
      }

      loadingIndicator.style.display = "block";

      // Search through countries
      const country = countries.features.find(feature => {
        if (!feature.properties) return false;

        // Normalize country names for comparison
        const countryName = (feature.properties.COUNTRY_NAME || feature.properties.name || "").toLowerCase();
        const alternateNames = getAlternateNames(feature); // Get alternate names for the country

        // Check if the search term matches the country name or any alternate names
        return (
          countryName.includes(searchTerm) ||
          alternateNames.some(name => name.includes(searchTerm))
        );
      });

      if (country) {
        // Add subtle highlight effect to search box
        searchInput.style.backgroundColor = "rgba(0, 255, 0, 0.1)";
        setTimeout(() => {
          searchInput.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        }, 500);

        // Call focusOnCountry with the found country
        focusOnCountry(country);
      } else {
        // Show error effect
        searchInput.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
        setTimeout(() => {
          searchInput.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        }, 500);

        console.log("Country not found:", searchTerm);
      }

      loadingIndicator.style.display = "none";
    }
  });

  // Add clear button functionality
  searchInput.addEventListener("input", () => {
    if (searchInput.value === "") {
      // Reset globe to default position
      gsap.to(camera.position, {
        duration: 2,
        x: 0,
        y: 0,
        z: 400,
        onUpdate: () => {
          camera.lookAt(scene.position);
          controls.update();
        }
      });
    }
  });

  // Add hover effect
  searchInput.addEventListener("mouseover", () => {
    searchInput.style.backgroundColor = "rgba(255, 255, 255, 0.15)";
  });

  searchInput.addEventListener("mouseout", () => {
    if (document.activeElement !== searchInput) {
      searchInput.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    }
  });

  // Add focus effect
  searchInput.addEventListener("focus", () => {
    searchInput.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
    searchInput.style.boxShadow = "0 0 10px rgba(255, 255, 255, 0.1)";
  });

  searchInput.addEventListener("blur", () => {
    searchInput.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
    searchInput.style.boxShadow = "none";
  });
}
function getAlternateNames(feature) {
  const alternateNames = [];

  // Add common alternate names for specific countries
  switch (feature.properties.COUNTRY_NAME || feature.properties.name) {
    case "United States":
      alternateNames.push("usa", "united states of america", "us");
      break;
    case "United Kingdom":
      alternateNames.push("uk", "great britain", "britain");
      break;
    case "Russia":
      alternateNames.push("russian federation");
      break;
    case "China":
      alternateNames.push("peoples republic of china", "prc");
      break;
    // Add more cases as needed
  }

  return alternateNames.map(name => name.toLowerCase());
}
function focusOnCountry(country) {
  const coordinates = calculateCountryCenter(country.geometry);
  if (coordinates) {
    // Stop the globe's rotation
    controls.autoRotate = false;
    isGlobeRotating = false;

    // Remove any existing highlights
    globeGroup.children = globeGroup.children.filter(child => !child.isHighlight);

    // Calculate camera position
    const [lon, lat] = coordinates;
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (180 - lon) * Math.PI / 180;
    const distance = 200; // Closer zoom distance

    // Calculate the new camera position
    const newPosition = {
      x: distance * Math.sin(phi) * Math.cos(theta),
      y: distance * Math.cos(phi),
      z: distance * Math.sin(phi) * Math.sin(theta)
    };

    // Create highlight effect for the country
    const position = convertLatLonToXYZ(lat, lon, Globe.getGlobeRadius() + 0.2);

    const highlightGeometry = new SphereGeometry(3, 32, 32);
    const highlightMaterial = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6
    });
    const highlight = new Mesh(highlightGeometry, highlightMaterial);
    highlight.position.copy(position);
    highlight.isHighlight = true;

    // Add pulse animation
    const pulse = () => {
      highlightMaterial.opacity = 0.6 * (1 + Math.sin(Date.now() * 0.004));
      requestAnimationFrame(pulse);
    };
    pulse();

    globeGroup.add(highlight);

    // Scale up the country label
    globeGroup.children.forEach(child => {
      if (child instanceof Sprite) {
        const spriteMaterial = child.material;
        if (spriteMaterial.map) {
          const canvas = spriteMaterial.map.image;
          const context = canvas.getContext('2d');
          const countryName = country.properties.COUNTRY_NAME || country.properties.name;

          if (context.canvas.countryName === countryName) {
            child.scale.set(15, 7.5, 1); // Scale up the label
          }
        }
      }
    });

    // Rotate the globe to the country's position
    const targetRotationY = -theta; // Adjust the globe's rotation to face the country
    gsap.to(globeGroup.rotation, {
      duration: 2,
      y: targetRotationY,
      onUpdate: () => {
        controls.update(); // Update the controls during rotation
      },
      onComplete: () => {
        // Zoom in after rotation is complete
        gsap.to(camera.position, {
          duration: 2,
          x: newPosition.x,
          y: newPosition.y,
          z: newPosition.z,
          onUpdate: () => {
            camera.lookAt(scene.position); // Ensure the camera looks at the globe
            controls.update();
          }
        });
      }
    });
  }
}
function calculateCountryCenter(geometry) {
  if (!geometry) return null;

  let totalLat = 0, totalLon = 0, count = 0;

  const processCoordinates = (coords) => {
    coords.forEach(coord => {
      const [lon, lat] = coord;
      totalLon += lon;
      totalLat += lat;
      count++;
    });
  };

  if (geometry.type === "Polygon") {
    geometry.coordinates[0].forEach(coord => processCoordinates([coord]));
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach(polygon => {
      polygon[0].forEach(coord => processCoordinates([coord]));
    });
  }

  return count > 0 ? [totalLon / count, totalLat / count] : null;
}
function rotateGlobeToCountry(coordinates) {
  const [lon, lat] = coordinates;
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (180 - lon) * Math.PI / 180;

  const distance = camera.position.length();

  gsap.to(camera.position, {
    duration: 1,
    x: distance * Math.sin(phi) * Math.cos(theta),
    y: distance * Math.cos(phi),
    z: distance * Math.sin(phi) * Math.sin(theta),
    onUpdate: () => {
      camera.lookAt(scene.position);
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
        opacity: 0.6,
      });
      const borderLine = new LineLoop(borderGeometry, borderMaterial);
      group.add(borderLine);
    });
  }

  return borderGroup;
}
function addCountryLabels() {
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

  for (let i = 0; i < 2000; i++) {
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
  if (isGlobeRotating) {
    globeGroup.rotation.y += 0.002; // Rotate the globe only if the flag is true
  }
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