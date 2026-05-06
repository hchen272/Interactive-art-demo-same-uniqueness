// ========== Main Window Logic ==========
// With statistics, auto-reset, and "specialized only once" rule.
// Statistics displayed via HTML div, no buttons.

let totalSpecialApplied = 0;       // Total number of times a random person was specialized
let specializedFlags = [];         // Boolean array: true if person has been specialized at least once
let resetCount = 0;                // Number of resets (auto + manual)

// Default appearance values
const DEFAULT_COLOR_RGB = [150, 150, 150];
const DEFAULT_NEON = 'cyan';

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);
    smooth();
    camera(0, -400, 350, 0, 0, 0, 0, 1, 0);
    angleMode(DEGREES);
    noStroke();

    generateBuildings();

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'e' || e.key === 'E') {
            window.open('editor.html', '_blank', 'width=1200,height=900,resizable=yes');
        }
    });

    // --- Cross-Window Communication ---
    const channel = new BroadcastChannel('cyberpunk_sync');
    channel.onmessage = (ev) => {
        const msg = ev.data;
        console.log('[Main] Received command:', msg.type);

        switch (msg.type) {
            case 'applyToRandom':
                if (people.length === 0) return;
                // Get only people who have NOT been specialized yet
                const availableIndices = [];
                for (let i = 0; i < people.length; i++) {
                    if (!specializedFlags[i]) availableIndices.push(i);
                }
                if (availableIndices.length === 0) {
                    console.log('[Main] No remaining unspecialized people.');
                    return;
                }
                const randIdx = random(availableIndices);
                const randTarget = people[randIdx];
                randTarget.updateStyle(color(msg.color), msg.neon, msg.speed);
                specializedFlags[randIdx] = true;
                totalSpecialApplied++;
                updateStatsAndUI();
                console.log('[Main] Applied to random person (index ' + randIdx + ')');
                break;

            case 'applyToAll':
                for (let i = 0; i < people.length; i++) {
                    people[i].updateStyle(color(msg.color), msg.neon, msg.speed);
                    specializedFlags[i] = true;
                }
                totalSpecialApplied += people.length;
                updateStatsAndUI();
                console.log('[Main] Applied to all people');
                break;

            case 'updateAngles':
                if (window.previewPerson) {
                    window.previewPerson.leftArmML5Angle = msg.leftArmAngle;
                    window.previewPerson.rightArmML5Angle = msg.rightArmAngle;
                }
                break;
            default:
                break;
        }
    };
    window.syncChannel = channel;
}

function draw() {
    background(30);
    ambientLight(100, 100, 60);
    directionalLight(120, 100, 180, 0.5, 1, -0.5);
    pointLight(80, 60, 160, 0, 100, 0);
    rotateX(20);

    drawGroundGrid();
    drawBuildings();

    if (modelsReady && people.length === 0) {
        initPeople();
        window.previewPerson = new People3D(-1000, -1000, color(150,150,150), 'cyan', 1.2);
        console.log('[Main] Crowd initialized');
    }

    for (let person of people) person.update();
    for (let iter = 0; iter < 2; iter++) {
        for (let i = 0; i < people.length; i++) {
            people[i].avoid(people);
        }
    }
    for (let person of people) person.show();

    if (window.previewPerson) {
        push();
        translate(window.previewPerson.x, groundY + 30, window.previewPerson.z);
        fill(255, 0, 0, 80);
        noStroke();
        ellipse(0, 0, 10, 10);
        pop();
    }
}

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

function initPeople() {
    const defaultColor = color(DEFAULT_COLOR_RGB[0], DEFAULT_COLOR_RGB[1], DEFAULT_COLOR_RGB[2]);
    specializedFlags = [];
    for (let i = 0; i < peopleCount; i++) {
        let x = random(-worldWidth / 2 + 5, worldWidth / 2 - 5);
        let z = random(-worldDepth / 2 + 5, worldDepth / 2 - 5);
        let speedVal = random(0.8, 2.2);
        people.push(new People3D(x, z, defaultColor, DEFAULT_NEON, speedVal));
        specializedFlags.push(false);
    }
    updateStatsAndUI();
}

// Reset all people to default (called by auto-reset)
function resetAllToDefault() {
    const defaultColor = color(DEFAULT_COLOR_RGB[0], DEFAULT_COLOR_RGB[1], DEFAULT_COLOR_RGB[2]);
    for (let i = 0; i < people.length; i++) {
        people[i].updateStyle(defaultColor, DEFAULT_NEON, people[i].speed);
        specializedFlags[i] = false;
    }
    resetCount++;
    updateStatsAndUI();
    console.log('[Main] Reset all people to default');
}

// Compute current number of visually special (non-default) people
function computeCurrentSpecialCount() {
    const defaultColor = color(DEFAULT_COLOR_RGB[0], DEFAULT_COLOR_RGB[1], DEFAULT_COLOR_RGB[2]);
    let count = 0;
    for (let person of people) {
        if (!person.isDefault(defaultColor, DEFAULT_NEON)) {
            count++;
        }
    }
    return count;
}

// Update statistics and check auto-reset condition
function updateStatsAndUI() {
    const currentSpecial = computeCurrentSpecialCount();
    // Auto-reset if everyone is special
    if (currentSpecial === peopleCount && peopleCount > 0) {
        console.log('[Main] All people are special! Auto-resetting.');
        resetAllToDefault();
        // After reset, recompute currentSpecial (will be 0)
    }
    // Update HTML display (the final values after possible reset)
    document.getElementById('totalSpecial').innerText = totalSpecialApplied;
    document.getElementById('currentSpecial').innerText = computeCurrentSpecialCount();
    document.getElementById('resetCount').innerText = resetCount;
    // totalPeople is static, set once
    if (document.getElementById('totalPeople').innerText === '60') {
        // already set
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