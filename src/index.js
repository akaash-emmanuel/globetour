import ThreeGlobe from "three-globe";
import { WebGLRenderer, Scene, PerspectiveCamera, AmbientLight, DirectionalLight, MeshBasicMaterial, Mesh, Color, Fog, PointLight, Group, Vector3, BufferGeometry, SphereGeometry, CylinderGeometry, LineLoop, LineBasicMaterial} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import countries from "./assets/Globe Data Min.json";
import arcsData from "/Users/akaashemmanuel/Documents/globetour/arcs.json"; 
import spaceMusic from "./assets/spacemusic.mp3";

let renderer, camera, scene, controls;
let Globe;
let globeGroup;
let audio;
let audioPlayed = false;
let windowHalfX = window.innerWidth / 2; 
let windowHalfY = window.innerHeight / 2; 
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
  controls.enableDamping = true;
  controls.dynamicDampingFactor = 0.01;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minDistance = 200;
  controls.maxDistance = 500;
  controls.rotateSpeed = 0.8;
  controls.zoomSpeed = 0;
  controls.autoRotate = false;
  controls.minPolarAngle = Math.PI / 3.5;
  controls.maxPolarAngle = Math.PI - Math.PI / 3;

  window.addEventListener("resize", onWindowResize, false);
  window.addEventListener("mousemove", onMouseMove);
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
    .hexPolygonColor(() => "rgba(255,255,255, 0.7)");

  Globe.rotateY(-Math.PI * (5 / 9));
  Globe.rotateZ(-Math.PI / 6);

  const globeMaterial = Globe.globeMaterial();
  globeMaterial.color = new Color(0x240750);
  globeMaterial.emissive = new Color(0x220038);
  globeMaterial.emissiveIntensity = 0.05;
  globeMaterial.shininess = 0.5;

  globeGroup.add(Globe);
  drawArcsSequentially();

  const borders = drawCountryBorders();
  globeGroup.add(borders);

  drawArcsSequentially();

  scene.add(globeGroup);

  return globeGroup;
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
        linewidth: 0.01,
        transparent: true,
        opacity: 0.17,
      });
      const borderLine = new LineLoop(borderGeometry, borderMaterial);
      group.add(borderLine);
    });
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

  return borderGroup;
}

function drawArcsSequentially() {
  let finalizedArcs = []; 

  arcsData.forEach((arc, index) => {
    setTimeout(() => {
      const currentArc = {
        startLat: arc.startLat,
        startLng: arc.startLng,
        endLat: arc.endLat,
        endLng: arc.endLng,
        color: "#FFF4B7", 
      };

      Globe
        .arcsData([...finalizedArcs, currentArc])
        .arcStartLat((d) => d.startLat)
        .arcStartLng((d) => d.startLng)
        .arcEndLat((d) => d.endLat)
        .arcEndLng((d) => d.endLng)
        .arcColor((d) => d.color)
        .arcDashLength(8)
        .arcDashGap(1)
        .arcDashAnimateTime(0);

      setTimeout(() => {
        finalizedArcs.push({
          ...currentArc,
          color: "#BED754", 
        });
        Globe.arcsData([...finalizedArcs]);
      }, 0); 
    }, index * 1500); 
  });
}

function addStars() {
  const starGeometry = new SphereGeometry(1.3, 24, 24);
  const colors = [0x0000ff, 0xff0000, 0xffff00, 0xffffff, 0x00ff00];

  for (let i = 0; i < 40000; i++) {
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
