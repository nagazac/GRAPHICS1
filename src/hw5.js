// hw5.js — version complète avec terrain réaliste via CanvasTexture + tous les composants (ballon, paniers, UI, etc.)

import { OrbitControls } from './OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
scene.background = new THREE.Color(0x202020);

const floorGeometry = new THREE.CircleGeometry(60, 64);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Lumière ambiante douce
function addStadiumLights() {
  scene.add(new THREE.AmbientLight(0x222222));

  const gradinLight = new THREE.DirectionalLight(0xffffff, 0.6);
  gradinLight.position.set(0, 20, 0);
  gradinLight.castShadow = false;
  scene.add(gradinLight);

  // Projecteurs comme dans un vrai stade
  const spotLight1 = new THREE.SpotLight(0xffffff, 0.8);
  spotLight1.position.set(0, 30, 0);
  spotLight1.angle = Math.PI / 5;
  spotLight1.penumbra = 0.3;
  spotLight1.decay = 2;
  spotLight1.distance = 100;
  spotLight1.castShadow = true;
  scene.add(spotLight1);

  const spotLight2 = new THREE.SpotLight(0xffffff, 0.8);
  spotLight2.position.set(-15, 25, 15);
  spotLight2.angle = Math.PI / 6;
  spotLight2.penumbra = 0.4;
  spotLight2.decay = 2;
  spotLight2.distance = 100;
  spotLight2.castShadow = true;
  scene.add(spotLight2);

  const spotLight3 = new THREE.SpotLight(0xffffff, 0.8);
  spotLight3.position.set(15, 25, -15);
  spotLight3.angle = Math.PI / 6;
  spotLight3.penumbra = 0.4;
  spotLight3.decay = 2;
  spotLight3.distance = 100;
  spotLight3.castShadow = true;
  scene.add(spotLight3);
}

addStadiumLights();
renderer.shadowMap.enabled = true;

//HW6 global variables and setup:
let move = { left: false, right: false, forward: false, back: false };
const moveSpeed = 0.1;  // adjust as needed
let ballMesh;           // will store basketball reference
const courtHalfLength = 15; 
const courtHalfWidth  = 7.5;
const clock = new THREE.Clock();
let shotPower = 50;       // starting value (%)
const powerStep = 1;      // change per key press
const minPower = 0;
const maxPower = 100;
let powerBarElement;      // UI reference
let leftHoop, rightHoop;
// --- Shooting & Physics ---
let ballVelocity = new THREE.Vector3(0, 0, 0);
let ballInFlight = false;
let hasScored = false; // Prevent multiple scoring for same shot
const gravity = -9.8; // m/s² (scaled for scene)

// --- Ball Rotation ---
let ballAngularVelocity = new THREE.Vector3(0, 0, 0);
let ballSphere; // Reference to the actual sphere mesh for rotation
const rotationDamping = 0.98; // Rotation gradually slows down

// Add collision detection variables
let homeScore = 0;
let awayScore = 0;

// Statistics tracking variables
let totalShotAttempts = 0;
let totalShotsMade = 0;
let currentShotAttempted = false; // Track if current shot was attempted
let missedShotShown = false; // Prevent multiple miss messages

let helperModeEnabled = false;
let helperArrow = null;
let helperCurve = null;
let helperArrowTip = null;



function createCourtCanvasTexture(callback) {
  const canvas = document.createElement('canvas');
  canvas.width = 2800; // 28m
  canvas.height = 1500; // 15m
  const ctx = canvas.getContext('2d');

  const woodImage = new Image();
  const logoImage = new Image();
  let woodLoaded = false;
  let logoLoaded = false;

  function tryDraw() {
    if (!woodLoaded || !logoLoaded) return;

    // Fond bois
    ctx.drawImage(woodImage, 0, 0, canvas.width, canvas.height);

    // Style des lignes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;

    // Ligne médiane
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Cercle central
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 180, 0, Math.PI * 2);
    ctx.stroke();

    // Paramètres standards NBA
    const paintWidth = 490; // 4.9m
    const paintHeight = 580; // 5.8m
    const freeThrowRadius = 180;
    const basketXOffset = 120; // Distance du panier au bord
    const threePtRadius = 723;
    const threePtSideLength = 140; // longueur des segments parallèles au bord

    function drawHalfCourt(originX, flip = false) {
      const direction = flip ? -1 : 1;
      const offsetX = originX + direction * basketXOffset;
      const baseX = originX;

      // Raquette
      ctx.beginPath();
      ctx.rect(baseX, canvas.height / 2 - paintWidth / 2, direction * paintHeight, paintWidth);
      ctx.stroke();

      // Demi-cercle lancer franc
      ctx.beginPath();
      ctx.arc(
        baseX + direction * paintHeight,
        canvas.height / 2,
        freeThrowRadius,
        flip ? Math.PI * -1.5 : Math.PI * -0.5,
        flip ? Math.PI * -0.5 : Math.PI * -1.5,
        false
      );
      ctx.stroke();

      // Lignes verticales des corners (segments parallèles au bord)
      const yTop = canvas.height / 2 - threePtRadius;
      const yBottom = canvas.height / 2 + threePtRadius;
      const xCorner = baseX;
      const xEnd = baseX + direction * threePtSideLength;

      ctx.beginPath();
      ctx.moveTo(xCorner, yTop);
      ctx.lineTo(xEnd, yTop);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(xCorner, yBottom);
      ctx.lineTo(xEnd, yBottom);
      ctx.stroke();

      // Arc 3 points complet
      ctx.beginPath();
      if (flip) {
        // côté gauche : sens horaire
        ctx.arc(offsetX, canvas.height / 2, threePtRadius, Math.PI * 1.5 + 0.01, Math.PI * 0.5 - 0.01, true);
      } else {
        // côté droit : sens anti-horaire
        ctx.arc(offsetX, canvas.height / 2, threePtRadius, Math.PI * 1.5 - 0.01, Math.PI * 0.5 + 0.01, false);
      }
      ctx.stroke();
    }

    // Moitié gauche
    drawHalfCourt(0, false);
    // Moitié droite
    drawHalfCourt(canvas.width, true);

    // Logo IDC au centre
    const logoDiameter = 320; // taille idéale pour s’inscrire dans le cercle central de rayon 180
    const logoX = (canvas.width - logoDiameter) / 2;
    const logoY = (canvas.height - logoDiameter) / 2;
    ctx.drawImage(logoImage, logoX, logoY, logoDiameter, logoDiameter);

    const texture = new THREE.CanvasTexture(canvas);
    callback(texture);
  }

  woodImage.onload = () => {
    woodLoaded = true;
    tryDraw();
  };
  logoImage.onload = () => {
    logoLoaded = true;
    tryDraw();
  };

  woodImage.src = '/textures/wood.jpg';
  logoImage.src = '/textures/idc_cup_logo.png';
}

function createBasketballCourt(callback) {
  createCourtCanvasTexture(texture => {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(1, 1);

    const courtGeo = new THREE.BoxGeometry(30, 0.2, 15);
    const courtMat = new THREE.MeshPhongMaterial({ map: texture, shininess: 30 });
    const court = new THREE.Mesh(courtGeo, courtMat);
    court.receiveShadow = true;
    scene.add(court);
    if (callback) callback();
  });
}

class BasketballHoop {
  constructor() {
    this.COURT_HALF_LENGTH = 15;
    this.HOOP_HEIGHT = 3.048;
    this.BOARD_WIDTH = 1.8;
    this.BOARD_HEIGHT = 1.05;
    this.BOARD_THICKNESS = 0.05;
    this.RIM_RADIUS = 0.45;
    this.RIM_THICKNESS = 0.02;
    this.NET_DEPTH = 0.7;
    this.NET_SEGMENTS = 16;
    this.POLE_RADIUS = 0.1;
    this.ARM_LENGTH = 1.0;
    this.materials = {
      backboard: new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
      rim: new THREE.MeshBasicMaterial({ color: 0xff4500 }),
      net: new THREE.LineBasicMaterial({ color: 0xffffff }),
      support: new THREE.MeshPhongMaterial({ color: 0x555555 })
    };
  }

  createBackboard(side) {
    const geo = new THREE.BoxGeometry(this.BOARD_THICKNESS, this.BOARD_HEIGHT, this.BOARD_WIDTH);
    const mesh = new THREE.Mesh(geo, this.materials.backboard);
    mesh.position.set(side * (this.COURT_HALF_LENGTH - this.ARM_LENGTH + this.BOARD_THICKNESS), this.HOOP_HEIGHT + this.BOARD_HEIGHT/2 - 0.4, 0);
    mesh.castShadow = true;
    return mesh;
  }

  createRim(side) {
    const geo = new THREE.TorusGeometry(this.RIM_RADIUS, this.RIM_THICKNESS, 12, 60);
    const rim = new THREE.Mesh(geo, this.materials.rim);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(side * (this.COURT_HALF_LENGTH - this.ARM_LENGTH - this.RIM_RADIUS + this.BOARD_THICKNESS), this.HOOP_HEIGHT, 0);
    rim.castShadow = true;
    return rim;
  }

  createNet(side) {
    const netGroup = new THREE.Group();
    const rimCenterX = side * (this.COURT_HALF_LENGTH - this.ARM_LENGTH - this.RIM_RADIUS + this.BOARD_THICKNESS);
    const topY = this.HOOP_HEIGHT - this.RIM_THICKNESS;
    const bottomY = topY - this.NET_DEPTH;
    const topRing = [], bottomRing = [];

    for (let i = 0; i < this.NET_SEGMENTS; i++) {
      const angle = (i / this.NET_SEGMENTS) * Math.PI * 2;
      topRing.push(new THREE.Vector3(rimCenterX + Math.cos(angle) * this.RIM_RADIUS, topY, Math.sin(angle) * this.RIM_RADIUS));
      bottomRing.push(new THREE.Vector3(rimCenterX + Math.cos(angle) * this.RIM_RADIUS * 0.8, bottomY, Math.sin(angle) * this.RIM_RADIUS * 0.5));
    }

    for (let i = 0; i < this.NET_SEGMENTS; i++) {
      const next = (i + 1) % this.NET_SEGMENTS;
      netGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([bottomRing[i], bottomRing[next]]), this.materials.net));
      netGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([topRing[i], bottomRing[next]]), this.materials.net));
      netGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([topRing[i], bottomRing[(i - 1 + this.NET_SEGMENTS) % this.NET_SEGMENTS]]), this.materials.net));
    }

    netGroup.castShadow = true;
    return netGroup;
  }

  createPole(side) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(this.POLE_RADIUS, this.POLE_RADIUS, this.HOOP_HEIGHT, 10), this.materials.support);
    pole.position.set(side * (this.COURT_HALF_LENGTH + this.POLE_RADIUS), this.HOOP_HEIGHT / 2, 0);
    pole.castShadow = true;
    return pole;
  }

  createArm(side) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(this.ARM_LENGTH, 0.1, 0.1), this.materials.support);
    arm.position.set(side * (this.COURT_HALF_LENGTH - this.POLE_RADIUS * 2 - 0.2), this.HOOP_HEIGHT - 0.07, 0);
    arm.castShadow = true;
    return arm;
  }

  createCompleteHoop(side) {
    const g = new THREE.Group();

    const backboard = this.createBackboard(side);
    const rim = this.createRim(side);   // <- keep reference
    const net = this.createNet(side);
    const pole = this.createPole(side);
    const arm = this.createArm(side);

    g.add(backboard, rim, net, pole, arm);

    // Attach reference to rim (so we can access later)
    g.userData.rim = rim;

    return g;
  }
}


function addHoopsToScene() {
  const hoopBuilder = new BasketballHoop();

  leftHoop = hoopBuilder.createCompleteHoop(-1);
  rightHoop = hoopBuilder.createCompleteHoop(+1);

  scene.add(leftHoop);
  scene.add(rightHoop);
}


class Basketball {
  constructor(options = {}) {
    this.radius      = options.radius      || 0.3;
    this.position    = options.position    || { x:0, y:null, z:0 };
    this.floorOffset = options.floorOffset || 0.1;
    this.texturePath = options.texturePath || '/textures/Basketball.jpg';
  }

  create() {
    const ball = new THREE.Group();
    const loader = new THREE.TextureLoader();

    // Load and configure the texture so it wraps exactly twice
    const texture = loader.load(this.texturePath, tex => {
      tex.wrapS = THREE.RepeatWrapping;   // enable horizontal repeating
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(2, 1);               // two copies around the equator
    });

    // Create the sphere with that texture
    const geo = new THREE.SphereGeometry(this.radius, 64, 64);
    const mat = new THREE.MeshStandardMaterial({
      map:       texture,
      roughness: 0.7,
      metalness: 0.05
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    ball.add(mesh);

    // Store reference to sphere mesh for rotation
    ball.userData.sphereMesh = mesh;

    // lift it off the floor
    const y = this.position.y !== null
      ? this.position.y
      : this.radius + this.floorOffset;
    ball.position.set(this.position.x, y, this.position.z);

    return ball;
  }

  static create(scene, options = {}) {
    const b = new Basketball(options);
    const m = b.create();
    scene.add(m);
    return m;
  }
}

// Usage — each hemisphere will show one copy of your small texture:
//Basketball.create(scene, { texturePath: '/textures/Basketball.jpg' });

function addBall() {
  ballMesh = Basketball.create(scene);
  ballSphere = ballMesh.userData.sphereMesh; // Store reference to sphere for rotation
  return ballMesh;
}


function createUIComponents() {
  const overlay = document.createElement('div');
  overlay.className = 'ui-overlay';
  Object.assign(overlay.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    pointerEvents: 'none'
  });
  document.body.appendChild(overlay);

  const score = document.createElement('div');
  score.id = 'scoreboard';
  Object.assign(score.style, {
    position: 'absolute',
    top: '16px',
    left: '16px',
    width: '160px',
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    padding: '12px',
    borderRadius: '6px',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    lineHeight: '1.4',
    pointerEvents: 'auto'
  });
  score.innerHTML = `
    <h2 style="margin:0 0 8px;">Score</h2>
    <div style="display:flex; justify-content:space-between;">
      <strong>Home</strong><span id="home-score">0</span>
    </div>
    <div style="display:flex; justify-content:space-between; margin-top:6px;">
      <strong>Away</strong><span id="away-score">0</span>
    </div>
    <div style="margin-top:12px;">
      <strong>Shot Power</strong>
      <div id="power-bar" style="
        width: 100%; height: 10px; background: #444; margin-top: 4px;
        border-radius: 5px; overflow: hidden;">
        <div id="power-fill" style="
          width: 50%; height: 100%; background: limegreen;"></div>
      </div>
      <div id="power-value" style="text-align:right; font-size:12px; margin-top:2px;">50%</div>
    </div>
    <div style="margin-top:12px; border-top: 1px solid #555; padding-top: 8px;">
      <h3 style="margin:0 0 6px; font-size:14px;">Statistics</h3>
      <div style="display:flex; justify-content:space-between; font-size:12px;">
        <span>Attempts:</span><span id="shot-attempts">0</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:12px; margin-top:2px;">
        <span>Made:</span><span id="shots-made">0</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:12px; margin-top:2px;">
        <span>Percentage:</span><span id="shooting-percentage">0%</span>
      </div>
    </div>
  `;
  overlay.appendChild(score);

  powerBarElement = {
    fill: document.getElementById('power-fill'),
    value: document.getElementById('power-value')
  };
}

function updatePowerUI() {
  if (!powerBarElement) return;
  const percentage = shotPower;
  powerBarElement.fill.style.width = percentage + '%';
  powerBarElement.value.textContent = percentage + '%';
}

function updateStatisticsUI() {
  const attemptsElement = document.getElementById('shot-attempts');
  const madeElement = document.getElementById('shots-made');
  const percentageElement = document.getElementById('shooting-percentage');
  
  if (attemptsElement) attemptsElement.textContent = totalShotAttempts;
  if (madeElement) madeElement.textContent = totalShotsMade;
  
  const percentage = totalShotAttempts > 0 ? 
    Math.round((totalShotsMade / totalShotAttempts) * 100) : 0;
  if (percentageElement) percentageElement.textContent = percentage + '%';
}

function showShotFeedback(message, isSuccess = false) {
  // Remove existing feedback message if any
  const existingMessage = document.getElementById('shot-feedback');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Create new feedback message
  const feedbackElement = document.createElement('div');
  feedbackElement.id = 'shot-feedback';
  feedbackElement.textContent = message;
  
  Object.assign(feedbackElement.style, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '32px',
    fontWeight: 'bold',
    fontFamily: 'Arial, sans-serif',
    color: isSuccess ? '#00ff00' : '#ff4444',
    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
    zIndex: '1000',
    pointerEvents: 'none',
    animation: 'fadeInOut 2s ease-in-out'
  });
  
  // Add CSS animation
  if (!document.getElementById('feedback-styles')) {
    const style = document.createElement('style');
    style.id = 'feedback-styles';
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(feedbackElement);
  
  // Remove message after animation
  setTimeout(() => {
    if (feedbackElement.parentNode) {
      feedbackElement.remove();
    }
  }, 2000);
}

const scoreCanvas = document.createElement('canvas');
scoreCanvas.width  = 512;
scoreCanvas.height = 256;
const scoreCtx    = scoreCanvas.getContext('2d');

// fonction utilitaire pour (re)dessiner le score centré
function updateScoreCanvas(home = 0, away = 0) {
  // fond noir
  scoreCtx.fillStyle = '#000';
  scoreCtx.fillRect(0, 0, scoreCanvas.width, scoreCanvas.height);

  // style du texte
  scoreCtx.fillStyle    = '#fff';
  scoreCtx.font         = 'bold 64px Arial';
  scoreCtx.textAlign    = 'center';   // centre horizontalement
  scoreCtx.textBaseline = 'middle';   // centre verticalement

  // positions verticales : 1/3 et 2/3 de la hauteur
  const cx    = scoreCanvas.width  / 2;
  const yHome = scoreCanvas.height * 1/3;
  const yAway = scoreCanvas.height * 2/3;

  // dessine Home et Away centrés
  scoreCtx.fillText(`Home: ${home}`, cx, yHome);
  scoreCtx.fillText(`Away: ${away}`, cx, yAway);

  // indique à Three.js de rafraîchir la texture
  scoreTexture.needsUpdate = true;
}

const scoreTexture = new THREE.CanvasTexture(scoreCanvas);
updateScoreCanvas(0, 0);  // valeurs initiales

// charge la texture du logo IDC
const logoTexture = new THREE.TextureLoader().load('/textures/idc_cup_logo.png');


// — remplacez votre ancienne createJumbotron() par celle-ci —
function createJumbotron() {
  const group = new THREE.Group();

  // 1) Tige verticale
  const rodGeo = new THREE.CylinderGeometry(0.1, 0.1, 8, 12);
  const rodMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
  const supportRod = new THREE.Mesh(rodGeo, rodMat);
  supportRod.position.set(0, 16, 0);
  supportRod.castShadow = true;
  group.add(supportRod);

  // 2) Poutre horizontale
  const beamGeo = new THREE.BoxGeometry(6, 0.2, 0.2);
  const supportBeam = new THREE.Mesh(beamGeo, rodMat);
  supportBeam.position.set(0, 12.8, 0);
  supportBeam.castShadow = true;
  group.add(supportBeam);

  // 3) Écrans (4 faces)
  const sideGeo = new THREE.BoxGeometry(3, 2, 0.2);

  for (let i = 0; i < 4; i++) {
    // i==0 et i==2 → score ; sinon logo
    const tex = (i === 0 || i === 2) ? scoreTexture : logoTexture;
    const screenMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveIntensity: 0.6
    });

    const screen = new THREE.Mesh(sideGeo, screenMat);
    screen.position.set(
      Math.sin(i * Math.PI / 2) * 1.8,  // rayon 1.8m
      11.5,                              // hauteur
      Math.cos(i * Math.PI / 2) * 1.8
    );
    screen.lookAt(0, 11.5, 0);
    screen.castShadow = true;
    group.add(screen);
  }

  // 4) Chapeau supérieur
  const capGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.3, 32);
  const capMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = 12.2;
  cap.castShadow = true;
  group.add(cap);

  scene.add(group);
}

function createSeatModel(color) {
  const group = new THREE.Group();

  // Seat pan
  const panGeo = new THREE.BoxGeometry(0.6, 0.1, 0.5);
  const panMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const pan = new THREE.Mesh(panGeo, panMat);
  pan.position.y = 0.25;
  pan.castShadow = true;
  group.add(pan);

  // Backrest
  const backGeo = new THREE.BoxGeometry(0.6, 0.5, 0.1);
  const back = new THREE.Mesh(backGeo, panMat);
  back.position.set(0, 0.55, -0.2);
  back.castShadow = true;
  group.add(back);

  return group;
}

// Gradins circulaires
function createAudienceRings() {
  const seatsPerRow = 60;
  const rowSpacing  = 0.3;
  const lowerRows   = 20;
  const upperRows   = 20;
  const lowerRadius = 18;
  const bowlGap     = 2.0;

  function buildBowl(rowCount, startRadius, yOffset) {
    for (let i = 0; i < rowCount; i++) {
      const radius = startRadius + i * rowSpacing;
      const y      = yOffset + i * rowSpacing;

      for (let j = 0; j < seatsPerRow; j++) {
        const angle = (j / seatsPerRow) * Math.PI * 2;
        const x     = Math.cos(angle) * radius;
        const z     = Math.sin(angle) * radius;

        // Alternate blue/white blocks of 5 seats
        const color = (Math.floor(j / 5) % 2 === 0) ? 0x0033aa : 0xffffff;
        const seatModel = createSeatModel(color);

        seatModel.position.set(x, y, z);
        seatModel.lookAt(0, y, 0);
        scene.add(seatModel);
      }
    }
  }

  // Lower bowl
  buildBowl(lowerRows, lowerRadius,/* yOffset */ 0.5);
  // Upper bowl
  buildBowl(upperRows, lowerRadius + lowerRows*rowSpacing + bowlGap,
                     /* yOffset */ 0.5 + lowerRows*rowSpacing + bowlGap*0.5);
}

function createCourtsideSeats() {
  const halfLength  = 15;
  const halfWidth   = 7.5;
  const rows        = 2;     // two rows courtside
  const marginFront = 0.8;   // close to court edge
  const rowSpacing  = 0.6;   // vertical step per row
  const seatsAlong  = 30;    // seats on long side
  const seatsAcross = 15;    // seats on short side
  const color       = 0x0033aa;

  for (let r = 0; r < rows; r++) {
    const y      = 0.3 + r * rowSpacing;
    const offset = marginFront + r * rowSpacing + 0.1;

    // long sides
    for (let i = 0; i < seatsAlong; i++) {
      const t = i / (seatsAlong - 1);
      const x = -halfLength + t * (2 * halfLength);
      [ -halfWidth - offset, +halfWidth + offset ].forEach(z => {
        const seat = createSeatModel(color);
        seat.position.set(x, y, z);
        seat.lookAt(0, y, 0);
        scene.add(seat);
      });
    }

    // short sides
    for (let i = 0; i < seatsAcross; i++) {
      const t = i / (seatsAcross - 1);
      const z = -halfWidth + t * (2 * halfWidth);
      [ -halfLength - offset, +halfLength + offset ].forEach(x => {
        const seat = createSeatModel(color);
        seat.position.set(x, y, z);
        seat.lookAt(0, y, 0);
        scene.add(seat);
      });
    }
  }
}

createBasketballCourt(() => {
  addHoopsToScene();
  addBall();
  createAudienceRings();
  createCourtsideSeats();
  createJumbotron();
});
createUIComponents();
updatePowerUI();


const controls = new OrbitControls(camera, renderer.domElement);
let isOrbitEnabled = true;
const cameraTranslate = new THREE.Matrix4();
cameraTranslate.makeTranslation(0, 15, 30);
camera.applyMatrix4(cameraTranslate);

const instructionsElement = document.createElement('div');
instructionsElement.style.position = 'absolute';
instructionsElement.style.bottom = '20px';
instructionsElement.style.left = '20px';
instructionsElement.style.color = 'white';
instructionsElement.style.fontSize = '16px';
instructionsElement.style.fontFamily = 'Arial, sans-serif';
instructionsElement.innerHTML = `
  <h3>Controls:</h3>
  <p>O - Toggle orbit camera</p>
  <p>Arrow Keys - Move ball</p>
  <p>W/S - Adjust shot power</p>
  <p>Spacebar - Shoot ball toward nearest hoop</p>
  <p>R - Reset ball position</p>
  <p>C - Clear scores</p>
  <p>H - Toggle helper mode (shows shot direction)</p>
`;
document.body.appendChild(instructionsElement);

document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowLeft':  move.left = true;  break;
    case 'ArrowRight': move.right = true; break;
    case 'ArrowUp':    move.forward = true; break;
    case 'ArrowDown':  move.back = true;  break;
    case ' ':
      e.preventDefault(); // prevent page scroll
      if (!ballInFlight) shootBall();
      break;
    case 'w':
    case 'W':
      shotPower = Math.min(maxPower, shotPower + powerStep);
      updatePowerUI();
      break;
    case 's':
    case 'S':
      shotPower = Math.max(minPower, shotPower - powerStep);
      updatePowerUI();
      break;
    case 'r':
    case 'R':
      resetBallPosition();
      break;
    case 'c':
    case 'C':
      // Reset scores and statistics
      homeScore = 0;
      awayScore = 0;
      totalShotAttempts = 0;
      totalShotsMade = 0;
      updateScoreCanvas(homeScore, awayScore);
      document.getElementById('home-score').textContent = homeScore;
      document.getElementById('away-score').textContent = awayScore;
      updateStatisticsUI();
      break;
    case 'o':
    case 'O':
      isOrbitEnabled = !isOrbitEnabled;
      break;

    case 'h':
    case 'H':
      helperModeEnabled = !helperModeEnabled;
      if (!helperModeEnabled && helperArrow) {
        scene.remove(helperArrow);
        helperArrow = null;
      }
      break;
  }
});



document.addEventListener('keyup', (e) => {
  switch (e.key) {
    case 'ArrowLeft':  move.left = false;  break;
    case 'ArrowRight': move.right = false; break;
    case 'ArrowUp':    move.forward = false; break;
    case 'ArrowDown':  move.back = false;  break;
  }
});

// Collision detection functions (place before animate function)
function checkBackboardCollision(hoop) {
  if (!hoop || !ballMesh || !ballInFlight) return;

  // Find backboard (transparent mesh)
  const backboard = hoop.children.find(obj => 
    obj.material && obj.material.transparent === true
  );
  if (!backboard) return;

  // Bounding boxes
  const ballBB = new THREE.Box3().setFromObject(ballMesh);
  const backboardBB = new THREE.Box3().setFromObject(backboard);

  // Check intersection
  if (ballBB.intersectsBox(backboardBB)) {
    // Get backboard position to determine which side was hit
    const backboardPos = new THREE.Vector3();
    backboard.getWorldPosition(backboardPos);
    
    // Determine collision normal based on ball position relative to backboard
    const ballPos = ballMesh.position;
    let normalX = ballPos.x > backboardPos.x ? 1 : -1;
    
    // Reflect velocity
    ballVelocity.x = -ballVelocity.x * 0.7; // Energy loss on backboard hit
    ballVelocity.y *= 0.9; // Slight vertical dampening
    ballVelocity.z *= 0.9; // Slight Z dampening
    
    // Update rotation after backboard collision
    updateBallRotationFromVelocity(ballVelocity, 0.016); // Assume ~60fps for delta
    
    // Push ball away from backboard to prevent sticking
    ballMesh.position.x += normalX * 0.2;
    
    console.log("Backboard collision!");
  }
}

function checkRimCollision(hoop, hoopIndex) {
  if (!hoop || !ballMesh || !ballInFlight) return;

  const rim = hoop.userData.rim;
  if (!rim) return;

  const rimPos = new THREE.Vector3();
  rim.getWorldPosition(rimPos);
  
  const ballPos = ballMesh.position;
  const ballRadius = 0.3;
  
  // Check if ball is near rim height
  const heightDiff = Math.abs(ballPos.y - rimPos.y);
  const horizontalDist = Math.sqrt(
    Math.pow(ballPos.x - rimPos.x, 2) + 
    Math.pow(ballPos.z - rimPos.z, 2)
  );
  
  // Rim collision (ball hits rim edge)
  if (heightDiff < 0.15 && horizontalDist < 0.55 && horizontalDist > 0.25) {
    // Ball hit the rim
    const bounceDirection = new THREE.Vector3()
      .subVectors(ballPos, rimPos)
      .normalize();
    
    // Reflect velocity with energy loss
    ballVelocity.reflect(bounceDirection);
    ballVelocity.multiplyScalar(0.6);
    
    // Add randomness for realistic rim bounces
    ballVelocity.x += (Math.random() - 0.5) * 1.5;
    ballVelocity.z += (Math.random() - 0.5) * 1.5;
    
    // Update rotation after rim collision
    updateBallRotationFromVelocity(ballVelocity, 0.016); // Assume ~60fps for delta
    
    // Move ball away from rim
    ballMesh.position.add(bounceDirection.multiplyScalar(0.15));
    
    console.log("Rim collision!");
    return;
  }
  
  // Score detection - ball passes through rim from above
  if (heightDiff < 0.2 && horizontalDist < 0.35 && ballVelocity.y < -1 && !hasScored) {
    // Score! (only once per shot)
    hasScored = true; // Prevent multiple scoring
    totalShotsMade++; // Increment successful shots
    
    if (hoopIndex === 0) { // Left hoop
      awayScore += 2;
    } else { // Right hoop  
      homeScore += 2;
    }
    
    // Update score displays
    updateScoreCanvas(homeScore, awayScore);
    document.getElementById('home-score').textContent = homeScore;
    document.getElementById('away-score').textContent = awayScore;
    
    // Update statistics and show success feedback
    updateStatisticsUI();
    showShotFeedback("SHOT MADE!", true);
    
    console.log(`SCORE! Home: ${homeScore}, Away: ${awayScore}`);
    
    // Don't stop ballInFlight here - let ball continue naturally
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (ballMesh) {
    if (ballInFlight) {
      // Gravity
      ballVelocity.y += gravity * delta;

      // Update position
      ballMesh.position.addScaledVector(ballVelocity, delta);

      // Rotation pendant le vol
      updateBallRotationDuringFlight(delta);

      // Collisions
      checkBackboardCollision(leftHoop);
      checkBackboardCollision(rightHoop);
      checkRimCollision(leftHoop, 0);
      checkRimCollision(rightHoop, 1);

      // Rebond au sol
      const ballRadius = 0.4;
      if (ballMesh.position.y <= ballRadius) {
        ballMesh.position.y = ballRadius;

        if (Math.abs(ballVelocity.y) > 0.8) {
          ballVelocity.y = -ballVelocity.y * 0.65;
          ballVelocity.x *= 0.85;
          ballVelocity.z *= 0.85;
          ballVelocity.x += (Math.random() - 0.5) * 0.3;
          ballVelocity.z += (Math.random() - 0.5) * 0.3;
          updateBallRotationFromVelocity(ballVelocity, delta);
        } else if (Math.abs(ballVelocity.y) > 0.3) {
          ballVelocity.y = -ballVelocity.y * 0.4;
          ballVelocity.x *= 0.9;
          ballVelocity.z *= 0.9;
          updateBallRotationFromVelocity(ballVelocity, delta);
        } else {
          resetBallPosition();
        }
      }

      // Limites terrain
      const maxDistance = 20;
      if (Math.abs(ballMesh.position.x) > maxDistance || Math.abs(ballMesh.position.z) > maxDistance) {
        resetBallPosition();
      }

      // Missed shot feedback
      if (
        ballInFlight &&
        ballMesh.position.y < 0.5 &&
        ballVelocity.y < 0 &&
        currentShotAttempted &&
        !hasScored &&
        !missedShotShown
      ) {
        missedShotShown = true;
        showShotFeedback("MISSED SHOT", false);
      }

      // Supprimer helper si balle en vol
      if (helperCurve) {
        scene.remove(helperCurve);
        helperCurve.geometry.dispose();
        helperCurve.material.dispose();
        helperCurve = null;
      }
      if (helperArrowTip) {
        scene.remove(helperArrowTip);
        helperArrowTip = null;
      }

    } else {
      // Idle movement
      handleIdleMovement(delta);

      // Helper mode actif
      if (helperModeEnabled) {
        updateHelperArrow();
      }
    }
  }

  controls.enabled = isOrbitEnabled;
  controls.update();
  renderer.render(scene, camera);
}

function shootBall() {
  if (!ballMesh || !leftHoop || !rightHoop) return;

  // Track shot attempt
  totalShotAttempts++;
  currentShotAttempted = true;
  missedShotShown = false; // Reset miss message flag for new shot
  updateStatisticsUI();

  // Get rim world positions
  const leftRimPos = new THREE.Vector3();
  const rightRimPos = new THREE.Vector3();
  leftHoop.userData.rim.getWorldPosition(leftRimPos);
  rightHoop.userData.rim.getWorldPosition(rightRimPos);

  // Choose closest rim
  const distLeft = ballMesh.position.distanceTo(leftRimPos);
  const distRight = ballMesh.position.distanceTo(rightRimPos);
  const targetPos = distLeft < distRight ? leftRimPos : rightRimPos;

  // Horizontal direction only
  const horizontalDir = new THREE.Vector3(
    targetPos.x - ballMesh.position.x,
    0,
    targetPos.z - ballMesh.position.z
  ).normalize();

  // Fixed high angle (70°)
  const shootingAngle = (70 * Math.PI) / 180;

  // Much lower horizontal speed (2 → 4)
  const horizontalSpeed = 2 + (shotPower / 100) * 2.7;

  // Vertical speed based on angle
  const verticalSpeed = Math.tan(shootingAngle) * horizontalSpeed;

  // Apply velocity
  ballVelocity.copy(horizontalDir.multiplyScalar(horizontalSpeed));
  ballVelocity.y = verticalSpeed;

  // Set initial ball rotation for shot (backspin)
  setBallRotationFromShot(ballVelocity);

  ballInFlight = true;
  if (helperArrow) {
    scene.remove(helperArrow);
    helperArrow = null;
  }
  hasScored = false; // Reset scoring flag for new shot
}

// Ball rotation functions
function updateBallRotationFromVelocity(velocity, delta) {
  if (!ballSphere) return;
  
  const ballRadius = 0.3;
  const velocityMagnitude = velocity.length();
  
  // Only rotate if moving fast enough and reduce sensitivity for slow movements
  if (velocityMagnitude > 0.005) { 
    // Calculate angular velocity based on linear velocity
    // For a rolling ball: ω = v / r (angular velocity = linear velocity / radius)
    const angularSpeed = velocityMagnitude / ballRadius;
    
    // Calculate rotation axis perpendicular to velocity (for rolling motion)
    const velocityNormalized = velocity.clone().normalize();
    const rotationAxis = new THREE.Vector3();
    
    // For rolling motion, rotation axis is perpendicular to both velocity and up vector
    // This ensures the ball rotates in the correct direction relative to movement
    rotationAxis.crossVectors(velocityNormalized, new THREE.Vector3(0, 1, 0));
    rotationAxis.negate(); // Reverse direction to match desired rolling direction
    
    // Check if we have a valid rotation axis (avoid zero vector)
    if (rotationAxis.length() > 0.001) {
      rotationAxis.normalize();
      
      // Apply rotation with reduced intensity for idle movement
      const rotationAmount = angularSpeed * delta;
      ballSphere.rotateOnAxis(rotationAxis, rotationAmount);
      
      // Store angular velocity for continued rotation during flight
      ballAngularVelocity.copy(rotationAxis.multiplyScalar(angularSpeed));
    }
  }
}

function updateBallRotationDuringFlight(delta) {
  if (!ballSphere) return;
  
  // Continue rotation during flight with gradual damping
  const currentSpeed = ballAngularVelocity.length();
  if (currentSpeed > 0.01) {
    const rotationAxis = ballAngularVelocity.clone().normalize();
    const rotationAmount = currentSpeed * delta;
    
    ballSphere.rotateOnAxis(rotationAxis, rotationAmount);
    
    // Apply damping to angular velocity (air resistance)
    ballAngularVelocity.multiplyScalar(rotationDamping);
  }
}

function setBallRotationFromShot(velocity) {
  if (!ballSphere) return;
  
  // Calculate backspin for basketball shot
  // Basketball shots typically have backspin around the X-axis
  const horizontalVelocity = new THREE.Vector3(velocity.x, 0, velocity.z);
  const speed = horizontalVelocity.length();
  
  if (speed > 0.5) {
    // Create backspin - rotation around axis perpendicular to horizontal movement
    const backspinAxis = new THREE.Vector3();
    backspinAxis.crossVectors(horizontalVelocity.normalize(), new THREE.Vector3(0, 1, 0));
    
    // Basketball backspin is typically 2-3 rotations per second
    const backspinSpeed = speed * 2.5; // Adjust this multiplier for desired spin rate
    
    ballAngularVelocity.copy(backspinAxis.multiplyScalar(backspinSpeed));
  }
}


function handleIdleMovement(delta) {
  let dx = 0, dz = 0;
  if (move.left)   dx -= 1;
  if (move.right)  dx += 1;
  if (move.forward) dz -= 1;
  if (move.back)    dz += 1;

  const len = Math.hypot(dx, dz);
  if (len > 0) {
    dx /= len;
    dz /= len;
  }

  const speed = moveSpeed * delta * 60; // frame-rate independent
  let x = ballMesh.position.x + dx * speed;
  let z = ballMesh.position.z + dz * speed;

  // Calculate movement velocity for rotation (reduced for idle movement)
  const movementVelocity = new THREE.Vector3(dx * speed / delta * 0.3, 0, dz * speed / delta * 0.3);
  
  // Apply rotation based on movement
  if (len > 0) {
    updateBallRotationFromVelocity(movementVelocity, delta);
  } else {
    // Gradually stop rotation when not moving (faster decay for idle)
    ballAngularVelocity.multiplyScalar(0.9);
    updateBallRotationDuringFlight(delta);
  }

  // Boundaries
  x = Math.max(-courtHalfLength + 1, Math.min(courtHalfLength - 1, x));
  z = Math.max(-courtHalfWidth + 1,  Math.min(courtHalfWidth - 1, z));

  ballMesh.position.set(x, ballMesh.position.y, z);
}

function resetBallPosition() {
  if (ballMesh) {
    // Check if shot was attempted but missed (show miss feedback only if not already shown)
    if (currentShotAttempted && ballInFlight && !hasScored && !missedShotShown) {
      showShotFeedback("MISSED SHOT", false);
    }
    
    // Force reset position to center court
    ballMesh.position.set(0, 0.4, 0);
    ballVelocity.set(0, 0, 0);
    ballAngularVelocity.set(0, 0, 0); // Reset rotation
    ballInFlight = false;
    hasScored = false; // Reset scoring flag
    currentShotAttempted = false; // Reset shot attempt flag
    missedShotShown = false; // Reset miss message flag
    shotPower = 50;
    updatePowerUI();
    
    // Reset ball orientation
    if (ballSphere) {
      ballSphere.rotation.set(0, 0, 0);
    }

    if (helperArrow) {
      scene.remove(helperArrow);
      helperArrow = null;
    }
    
    console.log("Ball position reset to center court");
  }
}

function createGradientMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: `
      varying float vPos;
      void main() {
        vPos = position.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying float vPos;
      void main() {
        float t = clamp(vPos / 10.0, 0.0, 1.0); // Normalise la hauteur
        vec3 green = vec3(0.0, 1.0, 0.0);
        vec3 red = vec3(1.0, 0.0, 0.0);
        vec3 color = mix(green, red, t);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    transparent: false
  });
}

function updateHelperArrow() {
  if (!helperModeEnabled || !ballMesh || !leftHoop || !rightHoop || ballInFlight) return;

  // Nettoyage précédent
  if (helperCurve) {
    scene.remove(helperCurve);
    helperCurve.geometry.dispose();
    helperCurve.material.dispose();
    helperCurve = null;
  }
  if (helperArrowTip) {
    scene.remove(helperArrowTip);
    helperArrowTip = null;
  }

  // Choix du panier
  const leftRimPos = new THREE.Vector3();
  const rightRimPos = new THREE.Vector3();
  leftHoop.userData.rim.getWorldPosition(leftRimPos);
  rightHoop.userData.rim.getWorldPosition(rightRimPos);

  const distLeft = ballMesh.position.distanceTo(leftRimPos);
  const distRight = ballMesh.position.distanceTo(rightRimPos);
  const target = distLeft < distRight ? leftRimPos : rightRimPos;

  // Direction horizontale
  const direction = new THREE.Vector3(
    target.x - ballMesh.position.x,
    0,
    target.z - ballMesh.position.z
  ).normalize();

  // Vitesse comme dans shootBall()
  const angle = THREE.MathUtils.degToRad(70);
  const horizontalSpeed = 2 + (shotPower / 100) * 2.7;
  const verticalSpeed = Math.tan(angle) * horizontalSpeed;

  const velocity = direction.clone().multiplyScalar(horizontalSpeed);
  velocity.y = verticalSpeed;

  const start = ballMesh.position.clone();
  const points = computeTrajectoryPoints(start, velocity, gravity, 60, 0.06);

  if (points.length < 2) return;

  const curve = new THREE.CatmullRomCurve3(points);
  const tubeGeometry = new THREE.TubeGeometry(curve, 50, 0.05, 8, false);
  const tubeMaterial = createGradientMaterial();
  helperCurve = new THREE.Mesh(tubeGeometry, tubeMaterial);
  scene.add(helperCurve);

  // Arrow head at end
  const pEnd = points[points.length - 1];
  const pBefore = points[points.length - 2] || start;
  const dir = pEnd.clone().sub(pBefore).normalize();
  const arrowLength = 0.6;
  helperArrowTip = new THREE.ArrowHelper(dir, pEnd, arrowLength, 0xffffff, 0.3, 0.2);
  scene.add(helperArrowTip);
}

function computeTrajectoryPoints(origin, velocity, gravity = -9.8, steps = 50, dt = 0.1) {
  const points = [];
  const pos = origin.clone();
  const vel = velocity.clone();

  const targetRim = (leftHoop && rightHoop)
    ? (origin.distanceTo(leftHoop.userData.rim.position) < origin.distanceTo(rightHoop.userData.rim.position)
        ? leftHoop.userData.rim
        : rightHoop.userData.rim)
    : null;

  let rimPos = new THREE.Vector3();
  if (targetRim) {
    targetRim.getWorldPosition(rimPos);
  }

  for (let i = 0; i < steps; i++) {
    points.push(pos.clone());

    // Check if we enter the net area
    if (targetRim) {
      const dx = pos.x - rimPos.x;
      const dz = pos.z - rimPos.z;
      const horizontalDist = Math.sqrt(dx * dx + dz * dz);

      const isInsideHoop = horizontalDist < 0.35 && pos.y <= rimPos.y + 0.05 && vel.y < 0;

      if (isInsideHoop) break;
    }

    vel.y += gravity * dt;
    pos.addScaledVector(vel, dt);

    // Stop if hits ground
    if (pos.y < 0.1) break;
  }

  return points;
}

animate();
