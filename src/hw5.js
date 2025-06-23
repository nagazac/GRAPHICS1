// hw5.js — version complète avec terrain réaliste via CanvasTexture + tous les composants (ballon, paniers, UI, etc.)

import { OrbitControls } from './OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
scene.background = new THREE.Color(0x000000);

// Lumières
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 15);
directionalLight.castShadow = true;
scene.add(directionalLight);
renderer.shadowMap.enabled = true;

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
    const logoW = canvas.width * 0.18;
    const logoH = canvas.height * 0.5;
    ctx.drawImage(
      logoImage,
      (canvas.width - logoW) / 2,
      (canvas.height - logoH) / 2,
      logoW,
      logoH
    );

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
    g.add(this.createBackboard(side));
    g.add(this.createRim(side));
    g.add(this.createNet(side));
    g.add(this.createPole(side));
    g.add(this.createArm(side));
    return g;
  }
}

function addHoopsToScene() {
  const hoopBuilder = new BasketballHoop();
  scene.add(hoopBuilder.createCompleteHoop(-1));
  scene.add(hoopBuilder.createCompleteHoop(+1));
}

class Basketball {
  constructor(options = {}) {
    this.radius = options.radius || 0.3;
    this.position = options.position || { x: 0, y: null, z: 0 };
    this.floorOffset = options.floorOffset || 0.1;
  }

  create() {
    const ball = new THREE.Group();
    const geo = new THREE.SphereGeometry(this.radius, 100, 100);
    const mat = new THREE.MeshStandardMaterial({ map: new THREE.TextureLoader().load('/textures/Basketball.jpg'), roughness: 0.7, metalness: 0.05 });
    ball.add(new THREE.Mesh(geo, mat));
    const y = this.position.y !== null ? this.position.y : this.radius + this.floorOffset;
    ball.position.set(this.position.x, y, this.position.z);
    return ball;
  }

  static create(scene, options = {}) {
    const basketball = new Basketball(options);
    const mesh = basketball.create();
    scene.add(mesh);
    return mesh;
  }
}

function addBall() {
  return Basketball.create(scene);
}

function createUIComponents() {
  const overlay = document.createElement('div');
  overlay.className = 'ui-overlay';
  Object.assign(overlay.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none' });
  document.body.appendChild(overlay);

  const score = document.createElement('div');
  score.id = 'scoreboard';
  Object.assign(score.style, {
    position: 'absolute', top: '16px', left: '16px', width: '140px', background: 'rgba(0,0,0,0.6)', color: '#fff',
    padding: '12px', borderRadius: '6px', fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '1.4', pointerEvents: 'auto'
  });
  score.innerHTML = `
    <h2 style="margin:0 0 8px;">Score</h2>
    <div style="display:flex; justify-content:space-between;"><strong>Home</strong><span id="home-score">0</span></div>
    <div style="display:flex; justify-content:space-between; margin-top:6px;"><strong>Away</strong><span id="away-score">0</span></div>
  `;
  overlay.appendChild(score);
}

function animate() {
  requestAnimationFrame(animate);
  controls.enabled = isOrbitEnabled;
  controls.update();
  renderer.render(scene, camera);
}

createBasketballCourt(() => {
  addHoopsToScene();
  addBall();
});
createUIComponents();

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
instructionsElement.innerHTML = `<h3>Controls:</h3><p>O - Toggle orbit camera</p>`;
document.body.appendChild(instructionsElement);

document.addEventListener('keydown', e => {
  if (e.key === "o") isOrbitEnabled = !isOrbitEnabled;
});

animate();
