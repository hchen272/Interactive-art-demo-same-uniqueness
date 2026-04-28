// ========== Global Variables ==========
let bodyandheadmodel;          // body and head model
let armlegmodel;               // arm/leg model
let modelCenterX, modelCenterY, modelCenterZ;
let modelScaleFactor;
let armScaleFactor = 1.0;
let legScaleFactor = 1.0;

// Joint positions (in body model local coordinates)
let leftShoulderPos, rightShoulderPos;
let leftHipPos, rightHipPos;

// Original model lengths
let armOriginalLength = 1;
let legOriginalLength = 1;

// Limb swing parameters
let armSwingAmplitude = 25;
let legSwingAmplitude = 20;
let armSwingSpeed = 2.2;
let legSwingSpeed = 2.2;

// Camera control
let camRotationX = 0;
let camRotationY = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let isDragging = false;

// Crowd parameters
let people = [];
let peopleCount = 60;
let worldWidth = 400;
let worldDepth = 800;
let groundY = 20;                // raised overall

// Model loading flags
let bodyLoaded = false;
let armLoaded = false;
let modelsReady = false;         // new: both models loaded

// Body model bounds
let modelMinX, modelMaxX, modelMinY, modelMaxY, modelMinZ, modelMaxZ;

// store the vision data
let video;
let bodyPose;
let poses = [];
let userMovement = { x: 0, y: 0, active: false };

// ========== Mouse Camera Control ==========
function onMouseDown(e) {
    if (e.button === 0) {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
}
function onMouseUp(e) { isDragging = false; }
function onMouseMove(e) {
    if (isDragging) {
        let dx = e.clientX - lastMouseX;
        let dy = e.clientY - lastMouseY;
        camRotationY += dx * 0.01;
        camRotationX += dy * 0.01;
        camRotationX = constrain(camRotationX, -PI/2, PI/2);
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
}
