class People3D {
    constructor(x, z, color) {
        this.x = x;
        this.z = z;
        this.color = color;
        this.speed = random(2, 3);
        this.dz = 0.2 * this.speed;
        this.fi = random(100);
        this.r = 10;
        // Optional: log creation
        // console.log(`Created person at (${x.toFixed(1)}, ${z.toFixed(1)})`);
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
        translate(this.x, groundY, this.z);
        rotateY(this.angle || 0);
        scale(modelScaleFactor);

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
            let dx = this.x - other.x;
            let dz = this.z - other.z;
            let dist = sqrt(dx * dx + dz * dz);
            let minDist = this.r + other.r;
            if (dist < minDist) {
                let angle = atan2(dz, dx);
                let overlap = minDist - dist;
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