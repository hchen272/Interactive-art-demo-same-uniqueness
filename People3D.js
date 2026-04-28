class People3D {
    constructor(x, z, color) {
        this.x = x;
        this.z = z;
        this.color = color;

        // NEW
        // We use a fixed seed for this instance to drive unique behaviors
        this.seed = random(1);
        // NEW
        
        this.speed = random(2, 3);
        this.dz = 0.2 * this.speed;
        this.fi = random(100);
        this.r = 10;
        // Optional: log creation
        // console.log(`Created person at (${x.toFixed(1)}, ${z.toFixed(1)})`);

        // --- NEW: INTERACTION VARIABLES ---
        this.offsetPos = createVector(0, 0); // Temporary displacement from interaction
        this.uniqueRotation = 0;
        this.personalScale = 1.0;
    }

    // --- NEW: INTERACTION METHOD ---
    // This receives the user's position from the webcam (mapped to 3D space)
    interact(userX, userZ) {
        let d = dist(this.x, this.z, userX, userZ);
        let interactionRadius = 300;

        if (d < interactionRadius) {
            // Calculate a unique 'personality' multiplier using the seed
            // Some figures are 'shy' (move away), some are 'curious' (move toward)
            let personality = map(this.seed, 0, 1, -1.5, 1.5);
            let force = map(d, 0, interactionRadius, 1, 0);

            // Apply unique displacement
            this.offsetPos.x = lerp(this.offsetPos.x, (this.x - userX) * force * personality, 0.1);
            this.offsetPos.z = lerp(this.offsetPos.z, (this.z - userZ) * force * personality, 0.1);

            // Apply unique visual change (e.g., spinning or scaling based on seed)
            if (this.seed > 0.7) {
                this.uniqueRotation += force * 0.2; // The 'Spinners'
            } else if (this.seed < 0.3) {
                this.personalScale = 1 + (force * 0.5); // The 'Growers'
            }
        } else {
            // Smoothly return to normal when user is not nearby
            this.offsetPos.mult(0.95);
            this.personalScale = lerp(this.personalScale, 1.0, 0.1);
        }
    }

    update() {
        this.z += this.dz;
        if (this.z > worldDepth / 2) {
            this.z = -worldDepth / 2;
            this.x = random(-worldWidth / 2, worldWidth / 2);
        }
    }

    // Draw arm (no lateral tilt)
    drawArm(xOffset, yOffset, zOffset, swingAngle, isRight) {
        if (!armlegmodel) return;
        push();
        translate(xOffset, 1.2 * yOffset, zOffset);
        rotateX(swingAngle);
        scale(modelScaleFactor * armScaleFactor);
        if (armlegmodel.vertices && window.armModelMinY !== undefined) {
            let armHeight = window.armModelMaxY - window.armModelMinY;
            translate(0, -armHeight / 2, 0);
        }
        ambientMaterial(this.color);
        specularMaterial(100);
        model(armlegmodel);
        pop();
    }

    // Draw leg (with slight lateral tilt)
    drawLeg(xOffset, yOffset, zOffset, swingAngle, isRight) {
        if (!armlegmodel) return;
        push();
        translate(xOffset, yOffset, zOffset);
        rotateX(swingAngle);
        if (isRight) rotateZ(3);
        else rotateZ(-3);
        scale(modelScaleFactor * legScaleFactor);
        if (armlegmodel.vertices && window.armModelMinY !== undefined) {
            let legHeight = window.armModelMaxY - window.armModelMinY;
            translate(0, -legHeight / 2, 0);
        }
        ambientMaterial(this.color);
        specularMaterial(100);
        model(armlegmodel);
        pop();
    }

    show() {
        var f = frameCount * this.speed * 1.5;
        var angle = -10 * sin(f + this.fi);

        if (!bodyandheadmodel) return;
        let walkCycle = frameCount * this.speed * 1.5;
        let leftArmAngle = sin(walkCycle + this.fi) * armSwingAmplitude;
        let rightArmAngle = sin(walkCycle + this.fi + 180) * armSwingAmplitude;
        let leftLegAngle = sin(walkCycle + this.fi + 180) * legSwingAmplitude;
        let rightLegAngle = sin(walkCycle + this.fi) * legSwingAmplitude;

        push();
        rotateX(180);
        
        // translate(this.x, groundY, this.z);
        // --- UPDATED: APPLY INTERACTION DISPLACEMENT ---
        translate(this.x + this.offsetPos.x, groundY, this.z + this.offsetPos.z);

        
        // rotateY(this.angle || 0);
        // scale(modelScaleFactor);
        // --- UPDATED: APPLY UNIQUE ROTATION AND SCALE ---
        rotateY((this.angle || 0) + this.uniqueRotation);
        scale(modelScaleFactor * this.personalScale);

        // Body
        push();
        translate(-modelCenterX, -modelCenterY * 0.35, -modelCenterZ);
        rotateY(angle);
        ambientMaterial(this.color);
        specularMaterial(100);
        model(bodyandheadmodel);
        pop();

        // Limbs
        if (armlegmodel && leftShoulderPos) {
            this.drawArm(leftShoulderPos.x - modelCenterX, leftShoulderPos.y - modelCenterY,
                         leftShoulderPos.z - modelCenterZ, leftArmAngle, false);
            this.drawArm(rightShoulderPos.x - modelCenterX, rightShoulderPos.y - modelCenterY,
                         rightShoulderPos.z - modelCenterZ, rightArmAngle, true);
            this.drawLeg(leftHipPos.x - modelCenterX, leftHipPos.y - modelCenterY,
                         leftHipPos.z - modelCenterZ, leftLegAngle, false);
            this.drawLeg(rightHipPos.x - modelCenterX, rightHipPos.y - modelCenterY,
                         rightHipPos.z - modelCenterZ, rightLegAngle, true);
        }
        pop();
    }

    avoid(others) {
        for (let other of others) {
            if (other === this) continue;
            
            // let dx = this.x - other.x;
            let dx = (this.x + this.offsetPos.x) - (other.x + other.offsetPos.x);
            
            // let dz = this.z - other.z;
            let dz = (this.z + this.offsetPos.z) - (other.z + other.offsetPos.z);
            
            // let dist = sqrt(dx * dx + dz * dz);
            let distSq = dx * dx + dz * dz;
            
            let minDist = this.r + other.r;
                        
            // if (dist < minDist) {
            if (distSq < minDist * minDist) {
                // -- NEW --
                let d = sqrt(distSq);
                // -- NEW --
                
                let angle = atan2(dz, dx);
                
                // let overlap = minDist - dist;
                let overlap = minDist - d;
                let moveX = cos(angle) * overlap * 0.5;
                let moveZ = sin(angle) * overlap * 0.5;
                this.x += moveX;
                this.z += moveZ;
                other.x -= moveX;
                other.z -= moveZ;
            }
        }
    }
}
