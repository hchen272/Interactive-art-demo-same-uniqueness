# Same Uniqueness – Cyberpunk Crowd Scene

An interactive 3D cyberpunk city scene where a crowd of stylized characters walks down a neon-lit street.  
You can customize a character in a separate editor, **jump it into the scene**, and watch its accessories **spread** to nearby people like a fashionable epidemic.

---

## ✨ Features

- **Dynamic cyberpunk city** – Procedurally generated buildings with glowing strips and windows.
- **Crowd of 60 characters** – Each walks, breathes, and avoids collisions.
- **Character editor** (separate window) – Customize:
  - Body color
  - Neon trim (cyan / purple / electric blue)
  - Walking speed
  - Arm/leg length and thickness
  - Accessories (bow, tie, glasses, hats, backpack) – each with its own color & specular highlight
- **One‑click injection** – Send your customized character into the main scene.
- **Accessory diffusion** – The accessories of any “infected” person slowly spread to nearby undecorated people.  
  Diffusion speed & radius are adjustable in `globals.js` (`spreadProbability`, `spreadRadius`).
- **Keyboard shortcuts**  
  - `E` – Open character editor  
  - `R` – Randomly redecorate 50 people (great for chaotic testing)
- **Music** – Loops `music/Same uniquess (made by Hongliang Chen).mp3` (autoplay may require first user click).
- **Mouse drag** – Rotate camera around the scene.

---

## 🕹️ How to Use

1. **Run the project**  
   Because the page loads external `.obj` models, you **must** use a local web server (see *Running* below).  
   Open `index.html` via the server.

2. **Main scene** – You see the crowd and buildings.  

3. **Open the editor** – Press `E` on your keyboard (or click the link that appears in the console).  
   A separate window opens with the character editor.

4. **Design your character**  
   - Pick a body color, neon trim, speed, arm/leg proportions.  
   - Select any accessories (bow, tie, glasses, hats, backpack) and choose their colors.  
   - For hats `hat01` and `hat02`, a Y‑rotation slider lets you spin them.

5. **Jump into the canvas** – Click **❗ JUMP INTO CANVAS ❗** in the editor.  
   - The main scene will pick a **random person that has no accessories yet**.  
   - That person receives **exactly your chosen accessories** plus a **temporary red arrow** (vanishes after 3 seconds).  
   - All other people lose any previous arrows – only the newly targeted person becomes the source.

6. **Watch the spread** – The decorated person will now “infect” nearby undecorated people with the same accessories (the arrow is **not** copied).  
   - Diffusion happens every frame within a radius (`spreadRadius`, default 55 units) with a probability (`spreadProbability`, default 0.1).  
   - You can tweak these variables live in the browser console.

7. **Random mayhem** – Press `R` to give 50 random people random colors, neon types, and accessories.

---

## 🧱 Project Structure
```text
├── index.html # Main scene entry point
├── editor.html # Character editor
├── sketch.js # Main scene logic (setup, draw, diffusion, keyboard)
├── editor.js # Editor UI & communication with main scene
├── People3D.js # People3D class – rendering, walking, copying accessories
├── buildings.js # City generation & decoration
├── modelLoader.js # Loads .obj models and sets up global accessory mapping
├── globals.js # Shared constants and global variables
├── model/ # Folder with all .obj files (body, limbs, accessories)
├── music/ # Background music (Same uniquess ....mp3)
└── lib/ # p5.js (if not loaded from CDN)
```

**Important classes / functions**  
- `People3D` – stores each person’s appearance, accessories, limb parameters.  
  - `copyAccessoriesFrom(other)` – copies only accessories (excluding `'arrow'`).  
  - `hasAnyAccessories()` – checks for non‑arrow accessories.  
- `spreadDecorations()` in `sketch.js` – implements the diffusion logic.  
- BroadcastChannel `'cyberpunk_sync'` – sends customization data from editor to main scene.

---

## 🛠️ Running the Project

Because the page loads local 3D models (`.obj` files), you cannot just double‑click `index.html` (CORS / file protocol restrictions).  
Use a simple local HTTP server:

### Run with Live Server

Using VS Code Live Server
Install the “Live Server” extension.

Right‑click index.html → “Open with Live Server”.

Using any other static server
Make sure the server serves the model/ and music/ subfolders.

## 🎛️ Customising Diffusion Behaviour
Inside globals.js you will find:

```js
let spreadEnabled = true;      // Turn diffusion on/off
let spreadRadius = 55;         // Distance (world units) for infection
let spreadProbability = 0.1;   // Chance per frame, per source, per target
```

Change these values directly in the file, or type in the browser console, for example:

```js
spreadProbability = 0.2;   // faster spread
spreadRadius = 80;         // larger infection radius
```

## 🔧 Dependencies
[p5.js](https://p5js.org/) (core, WEBGL, and sound) – loaded via CDN.

[ml5.js](https://ml5js.org/) and TensorFlow.js – included but not actively used (pose estimation remains as a stub).

All 3D models are .obj (no textures needed – materials are defined in code).

## 📝 Notes
- The editor window uses its own p5 instance and communicates via BroadcastChannel.
Both windows must be from the same origin (so the local server is essential).

- The red arrow is temporary (3 seconds) and never spreads – it only marks the newly injected person.

- If all people already have accessories, the editor will log “No remaining unspecialized people” and the injection will be ignored. Press R or wait for diffusion to decorate everyone, then continue.

- The music autoplay may be blocked by browsers; a click on the page will start it.

## 👥 Credits
- Models and code: project by “Same Uniqueness”.

- Music: Same uniquess (made by Hongliang Chen).

Enjoy making the crowd uniquely yours – and watch the style spread! 🎉
