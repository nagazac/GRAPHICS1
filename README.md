# Interactive Basketball Shooting Game with Physics (HW06)

![Demo](demo.gif)

## Authors
- **Charles Krammer**
- **Zacarie Cherki**

---

## Overview
This project extends the HW05 basketball court infrastructure into a fully interactive basketball shooting game.  
The game includes physics-based ball movement, realistic shooting mechanics, backboard and rim collisions, scoring, UI enhancements, and ball rotation animations.

---

## Features Implemented
### **Physics-Based Basketball Movement**
- Gravity-driven ball trajectory
- High-arc basketball shots with power-based velocity
- Bouncing mechanics with energy loss and randomization
- Ground collision response and ball reset when out of bounds
- Rim and backboard collision detection using bounding boxes and distance checks

### **Interactive Controls**
- **Arrow Keys** → Move ball horizontally/vertically across the court
- **W/S** → Increase or decrease shot power (0% – 100%)
- **Spacebar** → Shoot basketball toward the nearest hoop
- **R** → Reset ball position to center court
- **O** → Toggle orbit camera
- **C** → Clear scores and reset statistics
- **H** → Toggle helper mode (shows predicted shot trajectory)

### **Basketball Rotation Animations**
- Ball rotates dynamically based on movement and shot velocity
- Rotation axis aligns with movement direction
- Smooth transitions with rotation damping

### **Comprehensive Scoring System**
- Real-time score updates (Home/Away)
- Shot attempt counter and made shot counter
- Shooting accuracy percentage calculation
- Feedback messages ("SHOT MADE!" or "MISSED SHOT")

### **Enhanced User Interface**
- Live scoreboard (HTML overlay) with:
  - Scores, shot attempts, shots made, and shooting percentage
  - Shot power indicator bar
- CanvasTexture-based jumbotron displaying scores in 3D
- Controls instructions panel
- Animated feedback messages

### **Bonus Features**
- Helper trajectory mode showing predicted shot curve and arrow
- Randomized rim and ground bounces for more realistic behavior

---

## How to Run
1. Clone this repository to your local machine
2. Make sure you have Node.js installed
3. Ensure the `textures/` folder is present with:
   - `Basketball.jpg`
   - `wood.jpg`
   - `idc_cup_logo.png`
4. Start the local web server: `node index.js`
5. Open your browser and go to http://localhost:8000


---

## Controls
- **Arrow Keys**: Move ball on court
- **W / S**: Adjust shot power (0–100%)
- **Spacebar**: Shoot ball toward the nearest hoop
- **R**: Reset ball position to center court
- **C**: Clear scores and statistics
- **O**: Toggle orbit camera
- **H**: Toggle helper trajectory visualization

---

## Physics System Implementation
- **Gravity**: Applied each frame (`-9.8 m/s²` scaled to scene units)
- **Trajectory**: Computed with initial velocity split into horizontal and vertical components (70° angle)
- **Collisions**:
  - Ground: Elastic bounce with energy loss and randomization
  - Rim: Distance and height-based collision response with velocity reflection
  - Backboard: Bounding box collision detection
- **Ball Rotation**:
  - Rotation axis derived from velocity vector
  - Angular velocity computed as `ω = v / r`
  - Backspin applied to simulate realistic shooting

---

## Known Limitations
- Rim collision uses simplified distance/height checks instead of full mesh collision
- Net does not physically interact with the ball (visual only)
- No sound effects implemented (could be added as future improvement)
- Trajectory helper disabled during ball flight to avoid clutter

---

## 📁 External Assets Used

| Asset Type  | Path or Source                     | Description                          |
|-------------|------------------------------------|--------------------------------------|
| Texture     | `/textures/wood.jpg`              | Wood texture for court floor         |
| Texture     | `/textures/Basketball.jpg`        | Realistic basketball surface         |
| Texture     | `/textures/jumbotron_screen.jpg`  | Screens for the suspended jumbotron |
| Texture     | `/textures/idc_cup_logo.png`      | Logo placed at center court         |

---

## Video Link
https://drive.google.com/file/d/136xXXbtnoxKSWkL-l2rTSWhxWxG2IKD0/view?usp=drive_link
