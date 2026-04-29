// preview.js - 独立预览画布，实时同步主场景中 previewPerson 的外观

let autoRotY = 0;

function startPreview() {
    if (!bodyandheadmodel || !armlegmodel) {
        console.log("Waiting for models to load...");
        setTimeout(startPreview, 200);
        return;
    }
    console.log("Starting preview canvas");

    const sketch = (p) => {
        p.setup = () => {
            const canvas = p.createCanvas(320, 320, p.WEBGL);
            canvas.parent('previewContainer');
            p.colorMode(p.RGB);
            p.noStroke();
            p.angleMode(p.DEGREES);
            p.camera(0, -35, 80, 0, 10, 0, 0, 1, 0);
            p.background(20, 20, 40);
        };

        p.draw = () => {
            p.background(20, 20, 40, 180);
            p.ambientLight(100, 100, 120);
            p.directionalLight(200, 200, 220, 0.5, 1, -0.5);
            p.pointLight(150, 100, 200, 0, 50, 0);

            autoRotY += 0.3;
            p.rotateY(autoRotY);

            if (window.previewPerson) {
                const person = window.previewPerson;
                let leftArmAngle, rightArmAngle, leftLegAngle, rightLegAngle;

                // 优先使用 ml5 检测到的角度
                if (person.leftArmML5Angle !== undefined && person.rightArmML5Angle !== undefined) {
                    leftArmAngle = person.leftArmML5Angle;
                    rightArmAngle = person.rightArmML5Angle;
                    leftLegAngle = person.leftLegML5Angle || 0;
                    rightLegAngle = person.rightLegML5Angle || 0;
                } else {
                    // 回退为走路摆动动画
                    let speed = person.speed || 1.2;
                    let time = p.frameCount * speed;
                    leftArmAngle = p.sin(time) * armSwingAmplitude;
                    rightArmAngle = -leftArmAngle;
                    leftLegAngle = p.sin(time + 180) * legSwingAmplitude;
                    rightLegAngle = -leftLegAngle;
                }

                let bodyCol = person.bodyColor;
                let neonType = person.neonType;
                let neonRGB = getNeonColorFromType(neonType);
                drawPeople(p, bodyCol, neonRGB, leftArmAngle, rightArmAngle, leftLegAngle, rightLegAngle);
            }
        };
    };

    new p5(sketch, 'previewContainer');
}

function getNeonColorFromType(neonType) {
    switch(neonType) {
        case 'cyan': return [0, 200, 200];
        case 'purple': return [200, 0, 200];
        case 'blue': return [80, 150, 255];
        default: return [0, 200, 200];
    }
}

// 修改函数签名，接收四个角度参数
function drawPeople(p, bodyColor, neonRGB, leftArmAngle, rightArmAngle, leftLegAngle, rightLegAngle) {
    if (!bodyandheadmodel || !armlegmodel) return;
    p.push();
    p.rotateX(180);
    p.translate(0, -8, 0);
    p.scale(modelScaleFactor);

    // 身体
    p.push();
    p.translate(-modelCenterX, -modelCenterY * 0.35, -modelCenterZ);
    p.ambientMaterial(bodyColor);
    p.specularMaterial(neonRGB[0], neonRGB[1], neonRGB[2]);
    p.model(bodyandheadmodel);
    p.pop();

    // 四肢
    if (leftShoulderPos) {
        drawLimb(p, leftShoulderPos, bodyColor, neonRGB, false, leftArmAngle);
        drawLimb(p, rightShoulderPos, bodyColor, neonRGB, true, rightArmAngle);
        drawLegLimb(p, leftHipPos, bodyColor, neonRGB, false, leftLegAngle);
        drawLegLimb(p, rightHipPos, bodyColor, neonRGB, true, rightLegAngle);
    }
    p.pop();
}

function drawLimb(p, pos, bodyColor, neonRGB, isRight, swingAngle) {
    p.push();
    p.translate(pos.x - modelCenterX, 1.2 * (pos.y - modelCenterY), pos.z - modelCenterZ);
    p.rotateX(swingAngle);
    p.scale(modelScaleFactor * armScaleFactor);
    if (window.armModelMinY !== undefined) {
        let armHeight = window.armModelMaxY - window.armModelMinY;
        p.translate(0, -armHeight / 2, 0);
    }
    p.ambientMaterial(bodyColor);
    p.specularMaterial(neonRGB[0], neonRGB[1], neonRGB[2]);
    p.model(armlegmodel);
    p.pop();
}

function drawLegLimb(p, pos, bodyColor, neonRGB, isRight, swingAngle) {
    p.push();
    p.translate(pos.x - modelCenterX, pos.y - modelCenterY, pos.z - modelCenterZ);
    p.rotateX(swingAngle);
    if (isRight) p.rotateZ(3);
    else p.rotateZ(-3);
    p.scale(modelScaleFactor * legScaleFactor);
    if (window.armModelMinY !== undefined) {
        let legHeight = window.armModelMaxY - window.armModelMinY;
        p.translate(0, -legHeight / 2, 0);
    }
    p.ambientMaterial(bodyColor);
    p.specularMaterial(neonRGB[0], neonRGB[1], neonRGB[2]);
    p.model(armlegmodel);
    p.pop();
}

function initPreview() {
    if (bodyandheadmodel && armlegmodel) {
        startPreview();
    } else {
        setTimeout(initPreview, 200);
    }
}
initPreview();