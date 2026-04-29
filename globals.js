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
let camRotationX = 20;
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
let modelsReady = false;         // both models loaded

// Body model bounds
let modelMinX, modelMaxX, modelMinY, modelMaxY, modelMinZ, modelMaxZ;

let buildings = [];

// ======== CITY GENERATION PARAMETERS (your original values) ========
const GRID_SIZE_X = 8;
const GRID_SIZE_Z = 48;
const BUILDING_SPACING = 21;
const LEFT_REGION_X = -360;
const RIGHT_REGION_X = 210;
const REGION_Z_START = -500;

const MIN_BUILDING_W = 6;
const MAX_BUILDING_W = 14;
const MIN_BUILDING_H = 80;
const MAX_BUILDING_H = 170;
const MIN_BUILDING_D = 10;
const MAX_BUILDING_D = 18;

let video;
let bodyPose;
let poses = [];
let controlledPersonIndex = -1;
let ml5Ready = false;
let aiControlActive = false;      // 新增