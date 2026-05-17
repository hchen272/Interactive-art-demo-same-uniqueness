function generateBuildings() {
    buildings = [];
    const regions = [
        { startX: LEFT_REGION_X, startZ: REGION_Z_START, stepX: BUILDING_SPACING, stepZ: BUILDING_SPACING, rowsX: GRID_SIZE_X, rowsZ: GRID_SIZE_Z },
        { startX: RIGHT_REGION_X, startZ: REGION_Z_START, stepX: BUILDING_SPACING, stepZ: BUILDING_SPACING, rowsX: GRID_SIZE_X, rowsZ: GRID_SIZE_Z }
    ];
    
    let globalIndex = 0;
    for (let region of regions) {
        for (let i = 0; i < region.rowsX; i++) {
            for (let j = 0; j < region.rowsZ; j++) {
                let x = region.startX + i * region.stepX;
                let z = region.startZ + j * region.stepZ;
                
                let w = random(MIN_BUILDING_W, MAX_BUILDING_W);
                let d = random(MIN_BUILDING_D, MAX_BUILDING_D);
                let h = -random(MIN_BUILDING_H, MAX_BUILDING_H);  // negative height
                
                let colorMode = random(0, 3);
                let r, g, b;
                if (colorMode < 1) {
                    r = random(15, 50);
                    g = random(25, 70);
                    b = random(90, 160);
                } else if (colorMode < 2) {
                    r = random(50, 110);
                    g = random(15, 50);
                    b = random(80, 150);
                } else {
                    r = random(8, 40);
                    g = random(60, 120);
                    b = random(100, 170);
                }
                let buildingColor = color(r, g, b);
                
                let absHeight = -h;
                
                // Dynamically adjust decoration probability based on distance from road center
                // For left region x is negative, right region positive, map absolute value to 0~1 range
                let maxDist = max(abs(LEFT_REGION_X), abs(RIGHT_REGION_X)); // approximately 360
                let distance = abs(x); // distance from road center (X=0)
                let centerFactor = 1 - (distance / maxDist); // closer to center = closer to 1
                // Base probability 0.2, up to 0.95 near center
                let chance = 0.2 + centerFactor * 0.75 + 0.05;
                // Decoration only for tall enough buildings
                let hasDecoration = (absHeight > 50 && random() < chance);
                
                let decorationData = null;
                if (hasDecoration) {
                    randomSeed(globalIndex * 10000);
                    decorationData = generateDecorationData(w, d, h, absHeight);
                }
                
                buildings.push({
                    x, z, w, d, h,
                    color: buildingColor,
                    breathSpeed: random(0.3, 0.8)*10,
                    breathPhase: random(TWO_PI),
                    decoration: decorationData
                });
                globalIndex++;
            }
        }
    }
    console.log(`🏙️ Generated ${buildings.length} buildings, ${buildings.filter(b => b.decoration).length} decorated`);

}

// Generate decoration data: light strips and windows, mostly on left/right sides (X direction)
function generateDecorationData(w, d, h, absHeight) {
    let bottomY = h;   // negative value
    let topY = 0;
    
    // Horizontal light strips: all on left/right sides (positive and negative X), at most 2 per side
    let strips = [];
    let stripCount = floor(absHeight / 60);
    stripCount = constrain(stripCount, absHeight / 50, 10);
    
    // Generate strips for each side (ensuring both left and right)
    for (let side of ['left', 'right']) {
        for (let i = 0; i < stripCount; i++) {
            let t = random(0, 0.95);
            let y = bottomY * (1 - t) + topY * t;
            let type = floor(random(3));
            strips.push({ y, type, side });
        }
    }
    
    // Windows: 90% on left/right sides, 10% on front/back (a few accents)
    let totalWindowCount = floor(absHeight / 18) + 4;
    totalWindowCount = min(totalWindowCount, 20);
    let windows = [];
    
    for (let k = 0; k < totalWindowCount; k++) {
        let t = random(0.1, 0.95);
        let y = bottomY * (1 - t) + topY * t;
        let isSide = random() < 0.9;  // 90% side
        let face;
        let xOff, zOff;
        if (isSide) {
            face = random() < 0.5 ? 'left' : 'right';
            if (face === 'left') {
                xOff = -w/2 + 0.4;
                zOff = random(-d/2 + 1.0, d/2 - 1.0);
            } else {
                xOff = w/2 - 0.4;
                zOff = random(-d/2 + 1.0, d/2 - 1.0);
            }
        } else {
            face = random() < 0.5 ? 'front' : 'back';
            if (face === 'front') {
                xOff = random(-w/2 + 1.0, w/2 - 1.0);
                zOff = d/2 + 0.6;
            } else {
                xOff = random(-w/2 + 1.0, w/2 - 1.0);
                zOff = -d/2 - 0.6;
            }
        }
        windows.push({ face, x: xOff, y, z: zOff });
    }
    
    return { strips, windows };
}

function drawBuildings() {
    for (let b of buildings) {
        push();
        translate(b.x, groundY, b.z);
        
        // Building main body
        push();
        translate(0, b.h / 2, 0);
        ambientMaterial(b.color);
        specularMaterial(60, 70, 90);
        box(b.w, b.h, b.d);
        pop();
        
        // Breathing intensity: range 0.0~1.0, full breath cycle
        let breath = (sin(frameCount * b.breathSpeed + b.breathPhase) + 1) / 2;
        let intensity = map(breath, 0, 1, 0.6, 1.0);
        
        if (b.decoration) {
            drawDecorations(b, intensity);
        }
        
        pop();
    }
}

function drawDecorations(b, intensity) {
    let w = b.w, d = b.d, h = b.h;
    
    // Temporarily disable all lights to ensure decoration colors are fully controlled by fill
    push();
    noLights();
    
    // Horizontal light strips
    for (let strip of b.decoration.strips) {
        let baseColor;
        if (strip.type === 0) baseColor = color(0, 200, 200);
        else if (strip.type === 1) baseColor = color(200, 0, 200);
        else baseColor = color(100, 150, 255);
        
        // Breathing: brightness varies with intensity
        let neonColor = lerpColor(color(0, 0, 0), baseColor, intensity);
        fill(neonColor);
        noStroke();
        
        if (strip.side === 'left') {
            push();
            translate(-w/2 - 0.5, strip.y, 0);
            box(0.8, 1.8, d * 0.8);
            pop();
        } else if (strip.side === 'right') {
            push();
            translate(w/2 + 0.5, strip.y, 0);
            box(0.8, 1.8, d * 0.8);
            pop();
        }
    }
    
    // Windows
    let windowW = min(w * 0.1, 1.5);
    let windowH = min(abs(b.h) * 0.04, 2.0);
    for (let win of b.decoration.windows) {
        let brightness = intensity;  // 0~1
        let winColor = color(180 * brightness, 200 * brightness, 240 * brightness);
        fill(winColor);
        push();
        translate(win.x, win.y, win.z);
        if (win.face === 'left' || win.face === 'right') {
            box(windowH, windowW, 0.5);
        } else {
            box(windowW, windowH, 0.5);
        }
        pop();
    }
    
    pop(); // restore lighting
}