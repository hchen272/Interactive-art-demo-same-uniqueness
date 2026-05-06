// editor.js - with dynamic shoulder/hip offset based on limb length
// Removed "Apply to All" functionality, only "Apply to Random" remains.

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[Editor] DOM loaded, initializing UI...');

        const colorPicker = document.getElementById('bodyColorPicker');
        const neonSelect = document.getElementById('neonTypeSelect');
        const speedSlider = document.getElementById('speedSlider');
        const randomBtn = document.getElementById('applyToRandomBtn');
        // No allBtn
        const armLengthSlider = document.getElementById('armLengthSlider');
        const armThicknessSlider = document.getElementById('armThicknessSlider');
        const legLengthSlider = document.getElementById('legLengthSlider');
        const legThicknessSlider = document.getElementById('legThicknessSlider');

        if (!colorPicker || !neonSelect || !speedSlider || !randomBtn ||
            !armLengthSlider || !armThicknessSlider || !legLengthSlider || !legThicknessSlider) {
            console.error('[Editor] Missing UI elements');
            return;
        }

        let currentStyle = {
            color: '#5588ff',
            neon: 'cyan',
            speed: 1.2
        };

        let armLength = 1.0;
        let armThickness = 1.0;
        let legLength = 1.0;
        let legThickness = 1.0;

        const channel = new BroadcastChannel('cyberpunk_sync');

        function sendCommand(type) {
            channel.postMessage({
                type: type,
                color: currentStyle.color,
                neon: currentStyle.neon,
                speed: currentStyle.speed
            });
            console.log(`[Editor] Sent ${type}`);
        }

        function updateCurrentStyle() {
            currentStyle.color = colorPicker.value;
            currentStyle.neon = neonSelect.value;
            currentStyle.speed = parseFloat(speedSlider.value);
            if (window.editorPreviewPerson) {
                window.editorPreviewPerson.updateStyle(
                    currentStyle.color,
                    currentStyle.neon,
                    currentStyle.speed
                );
            }
            console.log('[Editor] Style updated', currentStyle);
        }

        function updateLimbParams() {
            armLength = parseFloat(armLengthSlider.value);
            armThickness = parseFloat(armThicknessSlider.value);
            legLength = parseFloat(legLengthSlider.value);
            legThickness = parseFloat(legThicknessSlider.value);
            console.log(`[Editor] Limb params: armLen=${armLength}, armThick=${armThickness}, legLen=${legLength}, legThick=${legThickness}`);
        }

        colorPicker.addEventListener('input', updateCurrentStyle);
        neonSelect.addEventListener('change', updateCurrentStyle);
        speedSlider.addEventListener('input', updateCurrentStyle);
        armLengthSlider.addEventListener('input', updateLimbParams);
        armThicknessSlider.addEventListener('input', updateLimbParams);
        legLengthSlider.addEventListener('input', updateLimbParams);
        legThicknessSlider.addEventListener('input', updateLimbParams);
        randomBtn.addEventListener('click', () => sendCommand('applyToRandom'));
        // No allBtn listener

        const sketch = (p) => {
            let bodyModel = null;
            let armModel = null;
            let modelsReady = false;

            let modelCenterX, modelCenterY, modelCenterZ, modelScaleFactor;
            let leftShoulder, rightShoulder, leftHip, rightHip;
            let baseArmScale = 1.0;
            let baseLegScale = 1.0;

            let previewPerson = null;
            let previewAutoRotY = 0;

            p.preload = () => {
                console.log('[Editor-p5] Preloading models...');
                bodyModel = p.loadModel('model/bodyandhead.obj', () => console.log('[Editor-p5] Body model loaded'));
                armModel = p.loadModel('model/armandleg.obj', () => console.log('[Editor-p5] Arm/leg model loaded'));
            };

            p.setup = () => {
                let canvas = p.createCanvas(p.windowWidth - 520, p.windowHeight, p.WEBGL);
                canvas.parent('previewContainer');
                p.colorMode(p.RGB);
                p.noStroke();
                p.angleMode(p.DEGREES);
                p.camera(0, -35, 100, 0, 10, 0, 0, 1, 0);
                console.log('[Editor-p5] Canvas created');

                const checkModels = () => {
                    if (bodyModel && armModel) {
                        modelsReady = true;
                        bodyModel.computeNormals();
                        armModel.computeNormals();
                        computeModelParams();
                        computeBaseLimbScales();

                        previewPerson = {
                            bodyColor: p.color(85, 136, 255),
                            neonType: 'cyan',
                            speed: 1.2,
                            updateStyle: function(colHex, neon, spd) {
                                this.bodyColor = p.color(colHex);
                                this.neonType = neon;
                                this.speed = spd;
                            }
                        };
                        window.editorPreviewPerson = previewPerson;
                        console.log('[Editor-p5] Models ready');
                    } else {
                        setTimeout(checkModels, 100);
                    }
                };
                checkModels();
            };

            p.windowResized = () => {
                p.resizeCanvas(p.windowWidth - 520, p.windowHeight);
                p.camera(0, -35, 100, 0, 10, 0, 0, 1, 0);
            };

            function computeModelParams() {
                const verts = bodyModel.vertices;
                let minX = verts[0].x, maxX = verts[0].x;
                let minY = verts[0].y, maxY = verts[0].y;
                let minZ = verts[0].z, maxZ = verts[0].z;
                for (let v of verts) {
                    minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
                    minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
                    minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
                }
                modelCenterX = (minX + maxX) / 2;
                modelCenterY = (minY + maxY) / 2;
                modelCenterZ = (minZ + maxZ) / 2;
                const bodyHeight = maxY - minY;
                modelScaleFactor = 20 / bodyHeight;

                const shoulderY = minY + bodyHeight * 0.78;
                const shoulderXOffset = (maxX - minX) * 0.65;
                leftShoulder = p.createVector(modelCenterX - shoulderXOffset, shoulderY, modelCenterZ);
                rightShoulder = p.createVector(modelCenterX + shoulderXOffset, shoulderY, modelCenterZ);

                const hipY = minY + bodyHeight * 0.48;
                const hipXOffset = (maxX - minX) * 0.2;
                leftHip = p.createVector(modelCenterX - hipXOffset, hipY, modelCenterZ);
                rightHip = p.createVector(modelCenterX + hipXOffset, hipY, modelCenterZ);
                console.log('[Editor-p5] Model params computed');
            }

            function computeBaseLimbScales() {
                const armVerts = armModel.vertices;
                let armMinY = armVerts[0].y, armMaxY = armVerts[0].y;
                for (let v of armVerts) {
                    armMinY = Math.min(armMinY, v.y);
                    armMaxY = Math.max(armMaxY, v.y);
                }
                const armOriginalLength = armMaxY - armMinY;

                const bodyHeight = (bodyModel.vertices.reduce((max, v) => Math.max(max, v.y), -Infinity) -
                                    bodyModel.vertices.reduce((min, v) => Math.min(min, v.y), Infinity));

                const desiredArmLength = bodyHeight * 0.50;
                const desiredLegLength = bodyHeight * 0.52;

                baseArmScale = desiredArmLength / (armOriginalLength * modelScaleFactor);
                baseLegScale = desiredLegLength / (armOriginalLength * modelScaleFactor);
                console.log(`[Editor-p5] Base arm scale=${baseArmScale}, leg scale=${baseLegScale}`);
            }

            function getNeonRGB(neonType) {
                switch(neonType) {
                    case 'cyan':   return [0, 200, 200];
                    case 'purple': return [200, 0, 200];
                    case 'blue':   return [80, 150, 255];
                    default:       return [0, 200, 200];
                }
            }

            p.draw = () => {
                p.background(20, 20, 40, 180);
                p.ambientLight(100, 100, 120);
                p.directionalLight(200, 200, 220, 0.5, 1, -0.5);
                p.pointLight(150, 100, 200, 0, 50, 0);

                previewAutoRotY += 0.5;
                p.rotateY(previewAutoRotY);

                if (modelsReady && previewPerson) {
                    const time = p.frameCount * previewPerson.speed;
                    const leftArmAngle  = p.sin(time) * 25;
                    const rightArmAngle = -leftArmAngle;
                    const leftLegAngle  = p.sin(time + 180) * 20;
                    const rightLegAngle = p.sin(time) * 20;

                    drawPreviewPerson(p, previewPerson,
                                      leftArmAngle, rightArmAngle,
                                      leftLegAngle, rightLegAngle);
                }
            };

            function drawPreviewPerson(p, person, leftArmAngle, rightArmAngle, leftLegAngle, rightLegAngle) {
                if (!bodyModel || !armModel) return;
                const neonRGB = getNeonRGB(person.neonType);
                const extraScale = 1.9;  // overall character scale (unchanged)

                p.push();
                p.rotateX(180);
                p.translate(0, -8, 0);
                p.scale(modelScaleFactor * extraScale);

                // Torso
                p.push();
                p.translate(-modelCenterX, -modelCenterY * 0.35, -modelCenterZ);
                p.ambientMaterial(person.bodyColor);
                p.specularMaterial(neonRGB[0], neonRGB[1], neonRGB[2]);
                p.model(bodyModel);
                p.pop();

                // Arms with dynamic shoulder offset
                if (leftShoulder) {
                    drawLimb(p, leftShoulder, person.bodyColor, neonRGB, leftArmAngle, true, false);
                    drawLimb(p, rightShoulder, person.bodyColor, neonRGB, rightArmAngle, true, true);
                }
                // Legs with dynamic hip offset
                if (leftHip) {
                    drawLimb(p, leftHip, person.bodyColor, neonRGB, leftLegAngle, false, false);
                    drawLimb(p, rightHip, person.bodyColor, neonRGB, rightLegAngle, false, true);
                }
                p.pop();
            }

            function drawLimb(p, jointPos, bodyColor, neonRGB, angle, isArm, isRight) {
                p.push();

                let yOffset = isArm ? 1.2 * (jointPos.y - modelCenterY) : (jointPos.y - modelCenterY);
                
                let lengthMult = isArm ? armLength : legLength;
                const shiftFactor = 1;  // pixels per unit of length increase
                let extraYShift = (lengthMult - 1.0) * shiftFactor;
                yOffset += extraYShift;

                p.translate(jointPos.x - modelCenterX, yOffset, jointPos.z - modelCenterZ);
                p.rotateX(angle);
                if (!isArm) {
                    if (isRight) p.rotateZ(3);
                    else p.rotateZ(-3);
                }

                let thicknessMult = isArm ? armThickness : legThickness;
                const baseScale = isArm ? baseArmScale : baseLegScale;
                const sx = thicknessMult * baseScale * modelScaleFactor;
                const sy = lengthMult * baseScale * modelScaleFactor;
                const sz = thicknessMult * baseScale * modelScaleFactor;
                p.scale(sx, sy, sz);

                const limbHeight = armModel.vertices.reduce((max, v) => Math.max(max, v.y), -Infinity) -
                                   armModel.vertices.reduce((min, v) => Math.min(min, v.y), Infinity);
                p.translate(0, -limbHeight / 2, 0);
                p.ambientMaterial(bodyColor);
                p.specularMaterial(neonRGB[0], neonRGB[1], neonRGB[2]);
                p.model(armModel);
                p.pop();
            }
        };

        new p5(sketch);
    });
})();