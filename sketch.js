function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);
    smooth();
    camera(0, -400, 350, 0, 0, 0, 0, 1, 0);
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    
    angleMode(DEGREES);
    noStroke();
    
    generateBuildings();
    setupUI();

    setTimeout(() => {
        setupCameraAndML5();
    }, 500);
}

function draw() {
    background(30);
    
    ambientLight(100, 100, 60);
    directionalLight(120, 100, 180, 0.5, 1, -0.5);
    pointLight(80, 60, 160, 0, 100, 0);
    
    rotateX(20);
    //rotateY(camRotationY);
    
    drawGroundGrid();
    //drawAxes();
    drawBuildings();
    
    if (modelsReady && people.length === 0) {
        initPeople();
        previewPerson = new People3D(-250, 450, color(150,150,150), 'cyan', 1.2);
        console.log('👥 Crowd initialized with default gray color');
    }

    if (aiControlActive && ml5Ready && poses.length > 0 && previewPerson) {
        let keypoints = poses[0].keypoints;
        previewPerson.updateFromPose(keypoints);
    } else if (previewPerson && !aiControlActive) {
        previewPerson.leftArmML5Angle = undefined;
        previewPerson.rightArmML5Angle = undefined;
        previewPerson.leftLegML5Angle = undefined;
        previewPerson.rightLegML5Angle = undefined;
    }
    
    for (let p of people) {
        p.update();
    }
    for (let iter = 0; iter < 2; iter++) {
        for (let p of people) {
            p.avoid(people);
        }
    }
    for (let p of people) {
        p.show();
    }
}

// ----------------------------------------------
//  UI 面板逻辑（实时同步预览人物）
// ----------------------------------------------
function setupUI() {
    const colorPicker = select('#bodyColorPicker');
    const neonSelect = select('#neonTypeSelect');
    const speedSlider = select('#speedSlider');
    const randomBtn = select('#applyToRandomBtn');
    const allBtn = select('#applyToAllBtn');
    
    // 实时更新预览人物
    colorPicker.input(() => {
        if (previewPerson) previewPerson.bodyColor = color(colorPicker.value());
    });
    neonSelect.input(() => {
        if (previewPerson) previewPerson.neonType = neonSelect.value();
    });
    speedSlider.input(() => {
        if (previewPerson) {
            let newSpeed = parseFloat(speedSlider.value());
            previewPerson.speed = newSpeed;
            previewPerson.dz = 0.2 * newSpeed;
        }
    });
    
    randomBtn.mousePressed(() => {
        if (people.length === 0) return;
        const target = random(people);
        const newColor = color(colorPicker.value());
        const newNeon = neonSelect.value();
        const newSpeed = parseFloat(speedSlider.value());
        target.updateStyle(newColor, newNeon, newSpeed);
        console.log(`✨ Customized a random person (new speed: ${newSpeed})`);
    });
    
    allBtn.mousePressed(() => {
        if (people.length === 0) return;
        const newColor = color(colorPicker.value());
        const newNeon = neonSelect.value();
        const newSpeed = parseFloat(speedSlider.value());
        for (let p of people) {
            p.updateStyle(newColor, newNeon, newSpeed);
        }
        console.log(`🌐 All people updated! Speed: ${newSpeed}`);
    });

    const assignAIBtn = select('#assignAIBtn');
    if (assignAIBtn) {
        assignAIBtn.mousePressed(() => {
            aiControlActive = !aiControlActive;
            assignAIBtn.html(aiControlActive ? '🔴 Stop AI Control' : '🎯 Enable AI Control');
        });
    }
}

// Helper functions (unchanged)
function drawGroundGrid() {
    push();
    stroke(70, 90, 150);
    strokeWeight(0.5);
    noFill();
    const gridSize = 500;
    const gridStep = 40;
    for (let x = -gridSize; x <= gridSize; x += gridStep) {
        line(x, groundY, -gridSize, x, groundY, gridSize);
    }
    for (let z = -gridSize; z <= gridSize; z += gridStep) {
        line(-gridSize, groundY, z, gridSize, groundY, z);
    }
    pop();
}

function drawAxes() {
    push();
    strokeWeight(2);
    stroke(255, 0, 0);
    line(-200, 20, 0, 200, 20, 0);
    stroke(0, 255, 0);
    line(0, -200, 0, 0, 200, 0);
    stroke(0, 0, 255);
    line(0, 20, -200, 0, 20, 200);
    pop();
}

function initPeople() {
    const defaultColor = color(150, 150, 150);
    const defaultNeon = 'cyan';
    for (let i = 0; i < peopleCount; i++) {
        let x = random(-worldWidth / 2 + 5, worldWidth / 2 - 5);
        let z = random(-worldDepth / 2 + 5, worldDepth / 2 - 5);
        let speedVal = random(0.8, 2.2);
        people.push(new People3D(x, z, defaultColor, defaultNeon, speedVal));
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function onMouseMove(e) {
    if (isDragging) {
        camRotationY += (e.clientX - lastMouseX) * 0.5;
        camRotationX = constrain(camRotationX - (e.clientY - lastMouseY) * 0.5, 0, 90);
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
}

function onMouseDown(e) {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
}

function onMouseUp(e) {
    isDragging = false;
}

async function setupCameraAndML5() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video = createCapture(VIDEO);
        video.size(320, 240);
        
        setTimeout(() => {
            if (typeof setupVideoDebug === 'function') {
                setupVideoDebug();
            }
        }, 1000);
        
        bodyPose = ml5.bodyPose('MoveNet', { model: 'movenet_singlepose_lightning' }, () => {
            console.log('✅ BodyPose model loaded');
            ml5Ready = true;
            detectPose();
        });
    } catch (err) {
        console.error('Camera error:', err);
    }
}

function detectPose() {
    if (!ml5Ready || !video) return;
    bodyPose.detect(video, gotPoses);
}

function gotPoses(results) {
    poses = results;
    if (typeof updateDebugPoses === 'function') {
        updateDebugPoses(poses);
    }
    detectPose();
}