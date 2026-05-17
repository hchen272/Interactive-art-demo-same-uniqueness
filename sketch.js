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
                
                // --- Remove arrows from ALL people ---
                for (let i = 0; i < people.length; i++) {
                    const p = people[i];
                    if (p.accessories) {
                        const oldLen = p.accessories.length;
                        p.accessories = p.accessories.filter(acc => acc.name !== 'arrow');
                        if (p.accessories.length !== oldLen) {
                            console.log(`[Main] Removed arrow from person ${i}`);
                        }
                    }
                    // Clear any pending timers to avoid stale removals
                    if (p._arrowTimer) {
                        clearTimeout(p._arrowTimer);
                        p._arrowTimer = null;
                    }
                }
                
                // Parse accessories from message
                let accessoriesData = null;
                if (msg.accessories && msg.accessories.length > 0) {
                    accessoriesData = msg.accessories.map(acc => ({
                        name: acc.name,
                        pos: createVector(acc.pos.x, acc.pos.y, acc.pos.z),
                        scale: acc.scale,
                        rot: acc.rot ? createVector(acc.rot.x, acc.rot.y, acc.rot.z) : null,
                        color: acc.color || '#ffffff',
                        specularColor: acc.specularColor || '#ffffff'   // <-- 新增
                    }));
                } else {
                    accessoriesData = [];
                }
                
                // Add arrow to the new target only
                const arrowAcc = {
                    name: 'arrow',
                    pos: createVector(0, 0.8, 0),
                    scale: 0.25,
                    rot: createVector(0, 0, 0),
                    color: '#ff0000',
                    specularColor: '#ff0000'   // optional, if your People3D supports it
                };
                accessoriesData.push(arrowAcc);

                // Extract limb parameters (with defaults if missing)
                const armLen = msg.armLength !== undefined ? msg.armLength : 1.0;
                const armThick = msg.armThickness !== undefined ? msg.armThickness : 1.0;
                const legLen = msg.legLength !== undefined ? msg.legLength : 1.0;
                const legThick = msg.legThickness !== undefined ? msg.legThickness : 1.0;
                
                // Update style with new accessories (includes arrow)
                randTarget.updateStyle(
                    color(msg.color),
                    msg.neon,
                    msg.speed,
                    accessoriesData,
                    armLen,
                    armThick,
                    legLen,
                    legThick
                );
                
                // Set a timer to remove the arrow from this specific person after 3 seconds
                randTarget._arrowTimer = setTimeout(() => {
                    if (randTarget && randTarget.accessories) {
                        const before = randTarget.accessories.length;
                        randTarget.accessories = randTarget.accessories.filter(acc => acc.name !== 'arrow');
                        if (randTarget.accessories.length !== before) {
                            console.log(`[Main] Arrow auto-removed from person ${randIdx} after 3s`);
                        }
                        randTarget._arrowTimer = null;
                    }
                }, 3000);
                
                specializedFlags[randIdx] = true;
                totalSpecialApplied++;
                updateStatsAndUI();
                console.log(`[Main] Applied to random person (index ${randIdx}) with arrow (other arrows cleared)`);
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
    
    if (bgm && !musicStarted) {
        bgm.setVolume(0.5);        // set volume (0.0 to 1.0)
        bgm.loop();                // start looping
        musicStarted = true;
        
        // If autoplay is blocked, the music will not be heard.
        // We add a one-time click/touch listener to start it on user interaction.
        const startMusicOnUserInteraction = () => {
            if (!bgm.isPlaying()) {
                bgm.loop();
                console.log('[Main] Music started after user interaction');
            }
            // Remove the listeners after first interaction
            window.removeEventListener('click', startMusicOnUserInteraction);
            window.removeEventListener('touchstart', startMusicOnUserInteraction);
        };
        window.addEventListener('click', startMusicOnUserInteraction);
        window.addEventListener('touchstart', startMusicOnUserInteraction);
    }
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

    for (let person of people) {
        if (person.accessories) {
            person.accessories = person.accessories.filter(acc => {
                if (acc.name === 'arrow' && acc.expireTime && millis() > acc.expireTime) {
                    return false;
                }
                return true;
            });
        }
    }

    for (let person of people) person.update();
    spreadDecorations();
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
        people.push(new People3D(x, z, defaultColor, DEFAULT_NEON, speedVal, null, 1.0, 1.0, 1.0, 1.0));
        specializedFlags.push(false);
    }
    updateStatsAndUI();
}

// Reset all people to default (called by auto-reset)
function resetAllToDefault() {
    const defaultColor = color(DEFAULT_COLOR_RGB[0], DEFAULT_COLOR_RGB[1], DEFAULT_COLOR_RGB[2]);
    for (let i = 0; i < people.length; i++) {
        people[i].updateStyle(
            defaultColor,           // body color
            DEFAULT_NEON,           // neon type
            people[i].speed,        // keep original speed? or reset to a default? Usually keep speed or set to 1.2
            [],                   // accessories = null (clear all)
            1.0,                    // armLength
            1.0,                    // armThickness
            1.0,                    // legLength
            1.0                     // legThickness
        );
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

// ========== Keyboard Randomization ==========
function keyPressed() {
    if (key === 'r' || key === 'R') {
        randomizeFiftyPeople();
    }
}

function randomizeFiftyPeople() {
    if (!people || people.length === 0) return;
    
    // Determine how many to randomize (up to 50)
    const count = min(50, people.length);
    // Pick random unique indices
    const indices = Array.from({length: people.length}, (_, i) => i);
    shuffle(indices, true);
    const selectedIndices = indices.slice(0, count);
    
    // Define possible neon types
    const neonTypes = ['cyan', 'purple', 'blue'];
    
    // Define default accessory configurations (position, scale, rotation)
    const defaultAccessories = {
        bow:      { pos: createVector(-0.05, 0.52, 0), scale: 0.05, rot: createVector(0, 0, 20) },
        tie:      { pos: createVector(0, 0.15, 0.1), scale: 0.1,  rot: createVector(0, 90, 270) },
        glasses01:{ pos: createVector(0, 0.4, 0.15),  scale: 0.03, rot: createVector(0, 90, 90) },
        glasses02:{ pos: createVector(0, 0.4, 0.15),  scale: 0.03, rot: createVector(0, 90, 90) },
        hat01:    { pos: createVector(0, 0.47, 0),    scale: 0.15, rot: createVector(0, 0, 0) },
        hat02:    { pos: createVector(0, 0.47, 0),    scale: 0.12, rot: createVector(0, 90, 0) },
        hat03:    { pos: createVector(0, 0.50, 0),    scale: 0.09, rot: createVector(0, 0, 0) }
    };
    const accessoryNames = Object.keys(defaultAccessories);
    
    for (let idx of selectedIndices) {
        const person = people[idx];
        
        // Random body color
        const randColor = color(random(255), random(255), random(255));
        
        // Random neon type
        const randNeon = random(neonTypes);
        
        // Random limb parameters (range 0.6 ~ 1.5)
        const randArmLen = random(0.6, 1.5);
        const randArmThick = random(0.6, 1.5);
        const randLegLen = random(0.6, 1.5);
        const randLegThick = random(0.6, 1.5);
        
        // Random accessories: decide which to add (each with 0.6 probability)
        const newAccessories = [];
        for (let name of accessoryNames) {
            if (random() < 0.6) {   // 60% chance to add each accessory
                const def = defaultAccessories[name];
                // Random color for each accessory
                const randAccColor = color(random(255), random(255), random(255));
                newAccessories.push({
                    name: name,
                    pos: def.pos.copy(),
                    scale: def.scale,
                    rot: def.rot ? def.rot.copy() : createVector(0,0,0),
                    color: randAccColor.toString('#rrggbb'),
                    specularColor: '#ffffff'   // optional highlight
                });
            }
        }
        
        // Apply all random properties
        person.updateStyle(
            randColor,
            randNeon,
            person.speed,           // keep original speed (or randomize if desired)
            newAccessories,
            randArmLen,
            randArmThick,
            randLegLen,
            randLegThick
        );
    }
    
    console.log(`[Main] Randomized ${selectedIndices.length} people (R key)`);
}

function spreadDecorations() {
    if (!spreadEnabled) return;
    
    let sources = people.filter(p => p.hasAnyAccessories());
    if (sources.length === 0) return;
    
    for (let source of sources) {
        for (let target of people) {
            if (source === target) continue;
            // 只感染那些完全没有装饰品的人
            if (!target.hasAnyAccessories()) {
                let d = dist(source.x, source.z, target.x, target.z);
                if (d < spreadRadius && random() < spreadProbability) {
                    target.copyAccessoriesFrom(source);
                }
            }
        }
    }
}