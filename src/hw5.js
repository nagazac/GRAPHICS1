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
const moveSpeed = 0.2;  // adjust as needed
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
const gravity = -9.8; // m/s² (scaled for scene)



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
  <p>W/S - Adjust shot power (angle & distance)</p>
  <p>Spacebar - Shoot ball toward nearest hoop</p>
  <p>R - Reset ball position</p>
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
    case 'o':
    case 'O':
      isOrbitEnabled = !isOrbitEnabled;
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

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (ballMesh) {
    if (ballInFlight) {
      // Gravity
      ballVelocity.y += gravity * delta;

      // Position update
      ballMesh.position.addScaledVector(ballVelocity, delta);

      // Ground collision with bounce
      const ballRadius = 0.4;
      if (ballMesh.position.y <= ballRadius) {
        ballMesh.position.y = ballRadius;
        
        // Add some bounce but reduce it each time
        if (Math.abs(ballVelocity.y) > 0.5) {
          ballVelocity.y = -ballVelocity.y * 0.4; // bounce with energy loss
          ballVelocity.x *= 0.8; // slow down horizontal movement
          ballVelocity.z *= 0.8;
        } else {
          // Stop bouncing when velocity is too low
          ballVelocity.set(0, 0, 0);
          ballInFlight = false;
        }
      }
      
      // Court boundaries - ball stops if it goes too far
      const maxDistance = 25;
      if (Math.abs(ballMesh.position.x) > maxDistance || Math.abs(ballMesh.position.z) > maxDistance) {
        ballVelocity.set(0, 0, 0);
        ballInFlight = false;
      }
    } else {
      handleIdleMovement(delta); // arrow keys
    }
  }

  controls.enabled = isOrbitEnabled;
  controls.update();
  renderer.render(scene, camera);
}

function shootBall() {
  if (!ballMesh || !leftHoop || !rightHoop) return;

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

  ballInFlight = true;
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

  // Boundaries
  x = Math.max(-courtHalfLength + 1, Math.min(courtHalfLength - 1, x));
  z = Math.max(-courtHalfWidth + 1,  Math.min(courtHalfWidth - 1, z));

  ballMesh.position.set(x, ballMesh.position.y, z);
}

function resetBallPosition() {
  if (ballMesh) {
    ballMesh.position.set(0, 0.4, 0);
    ballVelocity.set(0, 0, 0);
    ballInFlight = false;
    shotPower = 50;
    updatePowerUI();
  }
}

animate();
