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

// Create the hoops
class BasketballHoop {
  constructor() {
    // Court and hoop dimensions
    this.COURT_HALF_LENGTH = 15; // half the court length (30/2)
    this.HOOP_HEIGHT = 3.048;    // ~10 ft
    this.BOARD_WIDTH = 1.8;
    this.BOARD_HEIGHT = 1.05;
    this.BOARD_THICKNESS = 0.05;
    this.RIM_RADIUS = 0.45;
    this.RIM_THICKNESS = 0.02;
    this.NET_DEPTH = 0.7;
    this.NET_SEGMENTS = 16;
    this.POLE_RADIUS = 0.1;
    this.ARM_LENGTH = 1.0;
    
    // Materials
    this.materials = {
      backboard: new THREE.MeshPhongMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.6 
      }),
      rim: new THREE.MeshBasicMaterial({ color: 0xff4500 }),
      net: new THREE.LineBasicMaterial({ color: 0xffffff }),
      support: new THREE.MeshPhongMaterial({ color: 0x555555 })
    };
  }

  createBackboard(side) {
    const geometry = new THREE.BoxGeometry(
      this.BOARD_THICKNESS, 
      this.BOARD_HEIGHT, 
      this.BOARD_WIDTH
    );
    
    const backboard = new THREE.Mesh(geometry, this.materials.backboard);
    
    // Position backboard at the end of the court
    backboard.position.set(
      side * (this.COURT_HALF_LENGTH - this.ARM_LENGTH + this.BOARD_THICKNESS),
      this.HOOP_HEIGHT + this.BOARD_HEIGHT/2 - 0.4,
      0
    );
    
    // Now the backboard naturally faces toward center court
    // (thickness is along X-axis, width is along Z-axis)
    
    backboard.castShadow = true;
    return backboard;
  }

  createRim(side) {
    const geometry = new THREE.TorusGeometry(this.RIM_RADIUS, this.RIM_THICKNESS, 12, 60);
    const rim = new THREE.Mesh(geometry, this.materials.rim);
    
    rim.rotation.x = Math.PI / 2; // lie flat (horizontal)
    rim.position.set(
      side * (this.COURT_HALF_LENGTH - this.ARM_LENGTH - this.RIM_RADIUS + this.BOARD_THICKNESS),
      this.HOOP_HEIGHT,
      0
    );
    
    rim.castShadow = true;
    return rim;
  }

  createNet(side) {
    const netGroup = new THREE.Group();
    const rimCenterX = side * (this.COURT_HALF_LENGTH - this.ARM_LENGTH - this.RIM_RADIUS + this.BOARD_THICKNESS);
    const topY = this.HOOP_HEIGHT - this.RIM_THICKNESS;
    const bottomY = topY - this.NET_DEPTH;
    
    const topRing = [];
    const bottomRing = [];

    // Create ring points for top and bottom of net
    for (let i = 0; i < this.NET_SEGMENTS; i++) {
      const angle = (i / this.NET_SEGMENTS) * Math.PI * 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      
      topRing.push(new THREE.Vector3(
        rimCenterX + cosA * this.RIM_RADIUS, 
        topY, 
        sinA * this.RIM_RADIUS
      ));
      
      bottomRing.push(new THREE.Vector3(
        rimCenterX + cosA * (this.RIM_RADIUS * 0.8), 
        bottomY, 
        sinA * (this.RIM_RADIUS * 0.5)
      ));
    }

    // Create bottom circle of net
    for (let i = 0; i < this.NET_SEGMENTS; i++) {
      const p1 = bottomRing[i];
      const p2 = bottomRing[(i + 1) % this.NET_SEGMENTS];
      const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      netGroup.add(new THREE.Line(geometry, this.materials.net));
    }

    // Create diagonal net lines
    for (let i = 0; i < this.NET_SEGMENTS; i++) {
      const topPoint = topRing[i];
      const bottomPoint1 = bottomRing[(i + 1) % this.NET_SEGMENTS];
      const bottomPoint2 = bottomRing[(i - 1 + this.NET_SEGMENTS) % this.NET_SEGMENTS];
      
      // Two diagonal lines per segment
      netGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([topPoint, bottomPoint1]), 
        this.materials.net
      ));
      netGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([topPoint, bottomPoint2]), 
        this.materials.net
      ));
    }

    netGroup.castShadow = true;
    return netGroup;
  }

  createPole(side) {
    const geometry = new THREE.CylinderGeometry(
      this.POLE_RADIUS, 
      this.POLE_RADIUS, 
      this.HOOP_HEIGHT, 
      10
    );
    const pole = new THREE.Mesh(geometry, this.materials.support);
    
    pole.position.set(
      side * (this.COURT_HALF_LENGTH + this.POLE_RADIUS),
      this.HOOP_HEIGHT / 2,
      0
    );
    
    pole.castShadow = true;
    return pole;
  }

  createArm(side) {
    const geometry = new THREE.BoxGeometry(this.ARM_LENGTH, 0.1, 0.1);
    const arm = new THREE.Mesh(geometry, this.materials.support);
    
    arm.position.set(
      side * (this.COURT_HALF_LENGTH - this.POLE_RADIUS * 2 - 0.2),
      this.HOOP_HEIGHT - 0.07,
      0
    );
    
    arm.castShadow = true;
    return arm;
  }

  createCompleteHoop(side) {
    const hoopGroup = new THREE.Group();
    
    hoopGroup.add(this.createBackboard(side));
    hoopGroup.add(this.createRim(side));
    hoopGroup.add(this.createNet(side));
    hoopGroup.add(this.createPole(side));
    hoopGroup.add(this.createArm(side));
    
    return hoopGroup;
  }
}

// Create and add hoops to scene
function addHoopsToScene() {
  const hoopBuilder = new BasketballHoop();
  
  // Create left hoop (side = -1)
  const leftHoop = hoopBuilder.createCompleteHoop(-1);
  scene.add(leftHoop);
  
  // Create right hoop (side = +1)
  const rightHoop = hoopBuilder.createCompleteHoop(+1);
  scene.add(rightHoop);
}

// Create basketball at center court
class Basketball {
  constructor(options = {}) {
    this.radius = options.radius || 0.3; 
    this.color = options.color || 0xff7f00;
    this.seamColor = options.seamColor || 0x000000;
    this.seamThickness = options.seamThickness || 0.01;
    this.position = options.position || { x: 0, y: null, z: 0 };
    this.floorOffset = options.floorOffset || 0.1;
  }

  createSphere() {
    const geometry = new THREE.SphereGeometry(this.radius, 100, 100);
    const material = new THREE.MeshStandardMaterial({
      map: new THREE.TextureLoader().load('/textures/Basketball.jpg'),
      roughness: 0.7,
      metalness: 0.05
    });
    return new THREE.Mesh(geometry, material);
  }

  createSeams() {
    const seamGeometry = new THREE.TorusGeometry(this.radius, this.seamThickness, 8, 64);
    const seamMaterial = new THREE.MeshBasicMaterial({ color: this.seamColor });
    
    const seams = [];
    
    // Equator
    seams.push(new THREE.Mesh(seamGeometry, seamMaterial));
    
    // Meridians
    const meridian1 = new THREE.Mesh(seamGeometry, seamMaterial);
    meridian1.rotation.x = Math.PI / 4;
    seams.push(meridian1);
    
    const meridian2 = new THREE.Mesh(seamGeometry, seamMaterial);
    meridian2.rotation.x = Math.PI / 2;
    seams.push(meridian2);
    
    const meridian3 = new THREE.Mesh(seamGeometry, seamMaterial);
    meridian3.rotation.x = -Math.PI / 4;
    seams.push(meridian3);
    
    const meridian4 = new THREE.Mesh(seamGeometry, seamMaterial);
    meridian4.rotation.z = Math.PI / 2;
    seams.push(meridian4);
    
    return seams;
  }

  create() {
    const ball = new THREE.Group();
    
    // Add sphere
    ball.add(this.createSphere());
    
    // Add all seams
    this.createSeams().forEach(seam => ball.add(seam));
    
    // Position the ball
    const yPos = this.position.y !== null ? this.position.y : this.radius + this.floorOffset;
    ball.position.set(this.position.x, yPos, this.position.z);
    
    return ball;
  }

  // Static method for quick creation
  static create(scene, options = {}) {
    const basketball = new Basketball(options);
    const ball = basketball.create();
    scene.add(ball);
    return ball;
  }
}

// Create basketball and add it to the scene
function addBall() {
  return Basketball.create(scene);
}


// Create all elements
createBasketballCourt();
addHoopsToScene();
addBall();

function createUIComponents() {
  // 1) Overlay container
  const overlay = document.createElement('div');
  overlay.className = 'ui-overlay';
  // ensure it sits on top of your canvas
  Object.assign(overlay.style, {
    position:       'absolute',
    top:            '0',
    left:           '0',
    width:          '100%',
    height:         '100%',
    pointerEvents:  'none'
  });
  document.body.appendChild(overlay);

  // 2) Scoreboard panel
  const score = document.createElement('div');
  score.id        = 'scoreboard';
  score.className = 'ui-panel';
  Object.assign(score.style, {
    position:       'absolute',
    top:            '16px',
    left:           '16px',
    width:          '140px',
    background:     'rgba(0,0,0,0.6)',
    color:          '#fff',
    padding:        '12px',
    borderRadius:   '6px',
    fontFamily:     'Arial, sans-serif',
    fontSize:       '14px',
    lineHeight:     '1.4',
    pointerEvents:  'auto'
  });
  score.innerHTML = `
    <h2 style="margin:0 0 8px;">Score</h2>
    <div style="display:flex; justify-content:space-between;">
      <strong>Home</strong><span id="home-score">0</span>
    </div>
    <div style="display:flex; justify-content:space-between; margin-top:6px;">
      <strong>Away</strong><span id="away-score">0</span>
    </div>
  `;
  overlay.appendChild(score);

  // 3) Controls panel
  const ctrl = document.createElement('div');
  ctrl.id        = 'controls-panel';
  ctrl.className = 'ui-panel';
  Object.assign(ctrl.style, {
    position:       'absolute',
    bottom:         '16px',
    left:           '16px',
    width:          '180px',
    background:     'rgba(0,0,0,0.6)',
    color:          '#fff',
    padding:        '12px',
    borderRadius:   '6px',
    fontFamily:     'Arial, sans-serif',
    fontSize:       '14px',
    lineHeight:     '1.4',
    pointerEvents:  'auto'
  });

  overlay.appendChild(ctrl);
}

// Call it right after you set up your scene & renderer:
createUIComponents();

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