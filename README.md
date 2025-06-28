# Computer Graphics - Exercise 5 - WebGL Basketball Court

## Getting Started
1. Clone this repository to your local machine
2. Make sure you have Node.js installed
3. Start the local web server: `node index.js`
4. Open your browser and go to http://localhost:8000

## Complete Instructions
**All detailed instructions, requirements, and specifications can be found in:**
`basketball_exercise_instructions.html`

## Group Members
**MANDATORY: Add the full names of all group members here:**
- Zacarie Cherki
- Charles Krammer

## Technical Details
- Run the server with: `node index.js`
- Access at http://localhost:8000 in your web browser

**Note that you can find screenshots of the results in the pictures repo ;)**

## ✨ Additional Features Implemented

- Realistic court floor generated with a dynamic `CanvasTexture`
- Center logo (IDC) drawn dynamically in the canvas
- Realistic basketball model using a texture with visible seams
- Central suspended jumbotron with screen textures and emissive materials
- Multi-level circular audience stands with aligned seating
- Custom floor lighting and multiple spotlights for a stadium-like atmosphere

- Accurate NBA proportions including 3-point arcs, free-throw lanes, and center circle
- Interactive orbit camera with toggle (`O` key)
- Full basketball hoop assembly with:
  - Transparent backboard
  - Rim with realistic size and position
  - Net built from line segments
  - Supporting pole and arm behind the backboard

## 📁 External Assets Used

| Asset Type  | Path or Source                     | Description                          |
|-------------|------------------------------------|--------------------------------------|
| Texture     | `/textures/wood.jpg`              | Wood texture for court floor         |
| Texture     | `/textures/Basketball.jpg`        | Realistic basketball surface         |
| Texture     | `/textures/jumbotron_screen.jpg`  | Screens for the suspended jumbotron |
| Texture     | `/textures/idc_cup_logo.png`      | Logo placed at center court         |