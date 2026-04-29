// ========== Model Loading ==========
function preload() {
    // Body model
    bodyandheadmodel = loadModel('model/bodyandhead.obj', false,
        () => {
            console.log('body model loaded');
            bodyLoaded = true;
            if (bodyandheadmodel) {
                bodyandheadmodel.computeNormals();
                computeModelBounds();
                let modelHeight = modelMaxY - modelMinY;
                modelScaleFactor = 20 / modelHeight;
                computeJointPositions();
                console.log(`Body scale factor: ${modelScaleFactor}`);
            }
            checkModelsReady();
        },
        (err) => console.error('body load error', err)
    );

    // Limb model
    armlegmodel = loadModel('model/armandleg.obj', false,
        () => {
            console.log('arm/leg model loaded');
            armLoaded = true;
            if (armlegmodel) {
                armlegmodel.computeNormals();
                computeArmModelBounds();
                adjustArmLegScale();
                console.log(`Limb scaling: arm factor=${armScaleFactor}, leg factor=${legScaleFactor}`);
            }
            checkModelsReady();
        },
        (err) => console.error('arm/leg load error', err)
    );
}

function checkModelsReady() {
    if (bodyLoaded && armLoaded) {
        modelsReady = true;
        console.log('All models loaded, waiting for setup to initialize crowd');
    }
}

// Compute body model bounding box
function computeModelBounds() {
    if (!bodyandheadmodel) return;
    let vertices = bodyandheadmodel.vertices;
    if (vertices.length === 0) return;
    modelMinX = modelMaxX = vertices[0].x;
    modelMinY = modelMaxY = vertices[0].y;
    modelMinZ = modelMaxZ = vertices[0].z;
    for (let v of vertices) {
        modelMinX = min(modelMinX, v.x);
        modelMaxX = max(modelMaxX, v.x);
        modelMinY = min(modelMinY, v.y);
        modelMaxY = max(modelMaxY, v.y);
        modelMinZ = min(modelMinZ, v.z);
        modelMaxZ = max(modelMaxZ, v.z);
    }
    modelCenterX = (modelMinX + modelMaxX) / 2;
    modelCenterY = (modelMinY + modelMaxY) / 2;
    modelCenterZ = (modelMinZ + modelMaxZ) / 2;
    console.log(`Body size: X:${(modelMaxX-modelMinX).toFixed(2)}, Y:${(modelMaxY-modelMinY).toFixed(2)}`);
}

// Compute joint positions (arms outward, no lateral angle)
function computeJointPositions() {
    if (!bodyandheadmodel) return;
    let bodyHeight = modelMaxY - modelMinY;
    let bodyWidth = modelMaxX - modelMinX;

    // Shoulders: Y up (0.78 of height), X outward (0.65 of half-width)
    let shoulderY = modelMinY + bodyHeight * 0.78;
    let shoulderXOffset = bodyWidth * 0.65;
    leftShoulderPos = createVector(modelCenterX - shoulderXOffset, shoulderY, modelCenterZ);
    rightShoulderPos = createVector(modelCenterX + shoulderXOffset, shoulderY, modelCenterZ);

    // Hips: Y slightly higher (0.48), X inward (0.2 of half-width)
    let hipY = modelMinY + bodyHeight * 0.48;
    let hipXOffset = bodyWidth * 0.2;
    leftHipPos = createVector(modelCenterX - hipXOffset, hipY, modelCenterZ);
    rightHipPos = createVector(modelCenterX + hipXOffset, hipY, modelCenterZ);

    console.log('Joint positions:', { leftShoulderPos, rightShoulderPos, leftHipPos, rightHipPos });
}

// Compute limb model bounding box
function computeArmModelBounds() {
    if (!armlegmodel) return;
    let vertices = armlegmodel.vertices;
    if (vertices.length === 0) return;
    let minY = vertices[0].y, maxY = vertices[0].y;
    for (let v of vertices) {
        minY = min(minY, v.y);
        maxY = max(maxY, v.y);
    }
    window.armModelMinY = minY;
    window.armModelMaxY = maxY;
    armOriginalLength = maxY - minY;
    console.log('Limb original length:', armOriginalLength);
}

// Adjust limb scaling (longer arms)
function adjustArmLegScale() {
    if (!bodyandheadmodel || !armlegmodel) return;
    let bodyHeight = modelMaxY - modelMinY;
    let desiredArmLength = bodyHeight * 0.50;   // arm length = 50% of body height
    let desiredLegLength = bodyHeight * 0.52;   // leg length = 52%
    if (armOriginalLength > 0) {
        armScaleFactor = desiredArmLength / (armOriginalLength * modelScaleFactor);
        legScaleFactor = desiredLegLength / (armOriginalLength * modelScaleFactor);
    }
}