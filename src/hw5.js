import {OrbitControls} from './OrbitControls.js'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Set background color
scene.background = new THREE.Color(0x000000);

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 15);
scene.add(directionalLight);

// Enable shadows
renderer.shadowMap.enabled = true;
directionalLight.castShadow = true;

function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi/180);
}

// Create basketball court
function createBasketballCourt() {
  const loader = new THREE.TextureLoader();
  const woodTexture = loader.load('/textures/wood.jpg', () => {
    woodTexture.wrapS = THREE.ClampToEdgeWrapping;
    woodTexture.wrapT = THREE.ClampToEdgeWrapping;
    woodTexture.repeat.set(1, 1);
  });

  // 1) Court box
  const courtGeo = new THREE.BoxGeometry(30, 0.2, 15);
  const courtMat = new THREE.MeshPhongMaterial({ map: woodTexture, shininess: 30 });
  const court    = new THREE.Mesh(courtGeo, courtMat);
  court.receiveShadow = true;
  scene.add(court);

  const topY = 0.2 / 2;       // half the box height
  const lineThickness = 0.02; // thickness for all lines

  // 2) Center line (across the width)
  const midLineGeo = new THREE.BoxGeometry(0.1, lineThickness, 15);
  const midLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const midLine    = new THREE.Mesh(midLineGeo, midLineMat);
  midLine.position.set(0, topY + lineThickness/2, 0);
  scene.add(midLine);

  // 3) Center circle
  const circleGeo    = new THREE.TorusGeometry(2.5, 0.05, 16, 100);
  const circleMat    = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const centerCircle = new THREE.Mesh(circleGeo, circleMat);
  centerCircle.rotation.x = -Math.PI / 2;
  centerCircle.position.set(0, topY + 0.05, 0);
  scene.add(centerCircle);

  // 4) Three-point arcs at each end
  const halfCourt        = 30 / 2;
  const basketOffset     = 1;      // how far the hoop is in from the baseline
  const threePointRadius = 7.5;    // your chosen 3-pt distance
  const arcY             = topY + lineThickness/2;

  [  halfCourt - basketOffset,   // right hoop X
    -halfCourt + basketOffset    // left hoop X
  ].forEach(centerX => {
    const isRight   = centerX > 0;
    const startAng  = Math.PI / 2;    // +Z side
    const endAng    = -Math.PI / 2;   // -Z side
    // draw clockwise on the left, counter-clockwise on the right
    const clockwise = isRight ? false : true;

    // build the raw half-circle
    const arcCurve = new THREE.ArcCurve(
      centerX, 0,
      threePointRadius,
      startAng, endAng,
      clockwise
    );

    // sample and lift into XZ, shifting right arc out by basketOffset
    const pts = arcCurve.getPoints(64).map(p => {
      const shiftX = isRight ?  basketOffset
                            : -basketOffset;
      return new THREE.Vector3(
        p.x + shiftX,   // now p.x = endpoint at ±halfCourt
        arcY,
        p.y
      );
    });

    const arcGeo  = new THREE.BufferGeometry().setFromPoints(pts);
    const arcMat  = new THREE.LineBasicMaterial({ color: 0xffffff });
    const arcLine = new THREE.Line(arcGeo, arcMat);
    scene.add(arcLine);
  });
}



// Create all elements
createBasketballCourt();

// Set camera position for better view
const cameraTranslate = new THREE.Matrix4();
cameraTranslate.makeTranslation(0, 15, 30);
camera.applyMatrix4(cameraTranslate);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
let isOrbitEnabled = true;

// Instructions display
const instructionsElement = document.createElement('div');
instructionsElement.style.position = 'absolute';
instructionsElement.style.bottom = '20px';
instructionsElement.style.left = '20px';
instructionsElement.style.color = 'white';
instructionsElement.style.fontSize = '16px';
instructionsElement.style.fontFamily = 'Arial, sans-serif';
instructionsElement.style.textAlign = 'left';
instructionsElement.innerHTML = `
  <h3>Controls:</h3>
  <p>O - Toggle orbit camera</p>
`;
document.body.appendChild(instructionsElement);

// Handle key events
function handleKeyDown(e) {
  if (e.key === "o") {
    isOrbitEnabled = !isOrbitEnabled;
  }
}

document.addEventListener('keydown', handleKeyDown);

// Animation function
function animate() {
  requestAnimationFrame(animate);
  
  // Update controls
  controls.enabled = isOrbitEnabled;
  controls.update();
  
  renderer.render(scene, camera);
}

animate();