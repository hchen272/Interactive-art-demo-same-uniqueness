class People3D {
    constructor(x, z, baseColor = null, baseNeon = 'cyan', baseSpeed = null, accessories = null, armLen = 1.0, armThick = 1.0, legLen = 1.0, legThick = 1.0) {
        this.x = x;
        this.z = z;
        this.speed = baseSpeed !== null ? baseSpeed : random(1.2, 2.2);
        this.dz = 0.2 * this.speed;
        this.fi = random(100);
        this.r = 10;
        
        this.bodyColor = baseColor || color(150, 150, 150);
        this.neonType = baseNeon;   // 'cyan', 'purple', 'blue'
        this.customSpeed = this.speed;

        this.leftArmML5Angle = undefined;
        this.rightArmML5Angle = undefined;
        this.leftLegML5Angle = undefined;
        this.rightLegML5Angle = undefined;
        this.accessories = accessories || [];

        this.armLength = armLen;
        this.armThickness = armThick;
        this.legLength = legLen;
        this.legThickness = legThick;

    }
    
    updateStyle(newColor, newNeonType, newSpeed = null, newAccessories = null,
            newArmLength = null, newArmThickness = null, newLegLength = null, newLegThickness = null) {
        if (newColor) this.bodyColor = newColor;
        if (newNeonType) this.neonType = newNeonType;
        if (newSpeed !== null) {
            this.speed = newSpeed;
            this.dz = 0.2 * this.speed;
        }
        if (newAccessories) this.accessories = newAccessories;
        if (newArmLength !== null) this.armLength = newArmLength;
        if (newArmThickness !== null) this.armThickness = newArmThickness;
        if (newLegLength !== null) this.legLength = newLegLength;
        if (newLegThickness !== null) this.legThickness = newLegThickness;
    }

    drawAccessories() {
        if (!this.accessories || this.accessories.length === 0) return;
        if (!window.accessoryModels) return;
        const extraScale = 1.9;
        for (let acc of this.accessories) {
            let accModel = window.accessoryModels[acc.name];
            if (!accModel) continue;
            push();
            let totalScale = modelScaleFactor * extraScale;
            translate(acc.pos.x * totalScale, acc.pos.y * totalScale, acc.pos.z * totalScale);
            if (acc.rot) {
                rotateX(acc.rot.x);
                rotateY(acc.rot.y);
                rotateZ(acc.rot.z);
            }
            scale(acc.scale * totalScale);
            
            // Diffuse color (ambient)
            let accessoryColor = acc.color ? color(acc.color) : this.bodyColor;
            ambientMaterial(accessoryColor);
            
            // Specular color (highlight) - use accessory's specularColor or fallback to neon
            let specColor;
            if (acc.specularColor) {
                specColor = color(acc.specularColor);
            } else {
                specColor = this.getNeonColor();
            }
            specularMaterial(specColor);
            
            window.model(accModel);
            pop();
        }
    }

    isDefault(defaultColor, defaultNeon) {
        let isDefaultColor = (this.bodyColor.levels[0] === defaultColor.levels[0] &&
                            this.bodyColor.levels[1] === defaultColor.levels[1] &&
                            this.bodyColor.levels[2] === defaultColor.levels[2]);
        return isDefaultColor && this.neonType === defaultNeon;
    }
    
    update() {
        this.z += this.dz;
        if (this.z > 510) {
            this.z = -worldDepth / 2;
            this.x = random(-worldWidth / 2 + 5, worldWidth / 2 - 5);
        }
    }
    
    getNeonColor() {
        switch(this.neonType) {
            case 'cyan': return color(0, 200, 200);
            case 'purple': return color(200, 0, 200);
            case 'blue': return color(80, 150, 255);
            default: return color(0, 200, 200);
        }
    }
    
    drawArm(xOffset, yOffset, zOffset, swingAngle, isRight) {
        if (!armlegmodel) return;
        push();
        translate(xOffset, 1.2 * yOffset, zOffset);
        rotateX(swingAngle);
        // Use instance arm length & thickness
        let sx = this.armThickness * armScaleFactor * modelScaleFactor;
        let sy = this.armLength * armScaleFactor * modelScaleFactor;
        let sz = this.armThickness * armScaleFactor * modelScaleFactor;
        scale(sx, sy, sz);
        if (armlegmodel.vertices && window.armModelMinY !== undefined) {
            let armHeight = window.armModelMaxY - window.armModelMinY;
            translate(0, -armHeight / 2, 0);
        }
        ambientMaterial(this.bodyColor);
        specularMaterial(this.getNeonColor());
        model(armlegmodel);
        pop();
    }
    
    drawLeg(xOffset, yOffset, zOffset, swingAngle, isRight) {
        if (!armlegmodel) return;
        push();
        translate(xOffset, yOffset, zOffset);
        rotateX(swingAngle);
        if (isRight) rotateZ(3);
        else rotateZ(-3);
        let sx = this.legThickness * legScaleFactor * modelScaleFactor;
        let sy = this.legLength * legScaleFactor * modelScaleFactor;
        let sz = this.legThickness * legScaleFactor * modelScaleFactor;
        scale(sx, sy, sz);
        if (armlegmodel.vertices && window.armModelMinY !== undefined) {
            let legHeight = window.armModelMaxY - window.armModelMinY;
            translate(0, -legHeight / 2, 0);
        }
        ambientMaterial(this.bodyColor);
        specularMaterial(this.getNeonColor());
        model(armlegmodel);
        pop();
    }

    show() {
        var f = frameCount * this.speed * 1.5;
        var angle = -10 * sin(f + this.fi);
        
        if (!bodyandheadmodel) return;
        let leftArmAngle, rightArmAngle, leftLegAngle, rightLegAngle;
        if (this.leftArmML5Angle !== undefined && this.rightArmML5Angle !== undefined) {
            leftArmAngle = this.leftArmML5Angle;
            rightArmAngle = this.rightArmML5Angle;
            leftLegAngle = this.leftLegML5Angle || 0;
            rightLegAngle = this.rightLegML5Angle || 0;
        } else {
            let walkCycle = frameCount * this.speed * 1.5;
            leftArmAngle = sin(walkCycle + this.fi) * armSwingAmplitude;
            rightArmAngle = sin(walkCycle + this.fi + 180) * armSwingAmplitude;
            leftLegAngle = sin(walkCycle + this.fi + 180) * legSwingAmplitude;
            rightLegAngle = sin(walkCycle + this.fi) * legSwingAmplitude;
        }
        if (aiControlActive && this === previewPerson) {
            fill(255, 0, 0, 100);
            ellipse(0, -20, 40);
        }
        push();
        rotateX(180);
        let legYOffset = (this.legLength - 1.0) * 2.5;
        translate(this.x, -8 + legYOffset, this.z);
        rotateY(this.angle || 0);
        scale(modelScaleFactor);
        
        push();
        translate(-modelCenterX, -modelCenterY * 0.35, -modelCenterZ);
        rotateY(angle);
        ambientMaterial(this.bodyColor);
        specularMaterial(this.getNeonColor());
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
        this.drawAccessories();
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

    updateFromPose(keypoints) {
        if (!keypoints) return;
        const get = (name) => keypoints.find(kp => kp.name === name);
        
        const calcArmAngle = (shoulder, elbow, wrist) => {
            if (!shoulder || !elbow || !wrist) return null;
            let vSE = { x: elbow.x - shoulder.x, y: elbow.y - shoulder.y };
            let vEW = { x: wrist.x - elbow.x, y: wrist.y - elbow.y };
            let dot = vSE.x * vEW.x + vSE.y * vEW.y;
            let magSE = Math.hypot(vSE.x, vSE.y);
            let magEW = Math.hypot(vEW.x, vEW.y);
            if (magSE === 0 || magEW === 0) return null;
            let rad = Math.acos(Math.min(1, Math.max(-1, dot / (magSE * magEW))));
            let deg = rad * 180 / Math.PI;
  
            let sign = (wrist.x - shoulder.x) > 0 ? 1 : -1;
            return sign * deg;
        };
        
        let ls = get('left_shoulder'), le = get('left_elbow'), lw = get('left_wrist');
        let leftDeg = calcArmAngle(ls, le, lw);
        if (leftDeg !== null) {
            let mapped = map(leftDeg, -90, 90, -armSwingAmplitude, armSwingAmplitude);
            this.leftArmML5Angle = mapped;
        }
        
        let rs = get('right_shoulder'), re = get('right_elbow'), rw = get('right_wrist');
        let rightDeg = calcArmAngle(rs, re, rw);
        if (rightDeg !== null) {
            let mapped = map(rightDeg, -90, 90, -armSwingAmplitude, armSwingAmplitude);
            this.rightArmML5Angle = mapped;
        }
    }

    // Add difusion decorations
    copyAccessoriesFrom(other) {
        this.accessories = [];
        for (let acc of other.accessories) {
            if (acc.name === 'arrow') continue;
            let newAcc = {
                name: acc.name,
                pos: createVector(acc.pos.x, acc.pos.y, acc.pos.z),
                scale: acc.scale,
                rot: acc.rot ? createVector(acc.rot.x, acc.rot.y, acc.rot.z) : null,
                color: acc.color,
                specularColor: acc.specularColor
            };
            this.accessories.push(newAcc);
        }
    }

    hasAnyAccessories() {
        if (!this.accessories) return false;
        return this.accessories.some(acc => acc.name !== 'arrow');
    }
}