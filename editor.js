// editor.js - with multi-select accessories, individual colors, and Y-rotation slider for hats
(function() {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[Editor] DOM loaded, initializing UI...');

        const colorPicker = document.getElementById('bodyColorPicker');
        const neonSelect = document.getElementById('neonTypeSelect');
        const speedSlider = document.getElementById('speedSlider');
        const randomBtn = document.getElementById('applyToRandomBtn');
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
            let accessoriesData = null;
            if (window.editorPreviewPerson && window.editorPreviewPerson.accessories) {
                const enabled = window.editorPreviewPerson.accessories.filter(acc => acc.enabled);
                if (enabled.length > 0) {
                    accessoriesData = enabled.map(acc => ({
                        name: acc.name,
                        pos: { x: acc.pos.x, y: acc.pos.y, z: acc.pos.z },
                        scale: acc.scale,
                        rot: acc.rot ? { x: acc.rot.x, y: acc.rot.y, z: acc.rot.z } : null,
                        color: acc.color || '#ffffff',
                        specularColor: acc.specularColor || '#ffffff'   // <-- 新增
                    }));
                }
            }
            channel.postMessage({
                type: type,
                color: currentStyle.color,
                neon: currentStyle.neon,
                speed: currentStyle.speed,
                accessories: accessoriesData,
                armLength: armLength,
                armThickness: armThickness,
                legLength: legLength,
                legThickness: legThickness
            });
            console.log(`[Editor] Sent ${type} with ${accessoriesData?.length || 0} accessories`);
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

        // p5 sketch
        const sketch = (p) => {
            let bodyModel = null;
            let armModel = null;
            let bowModel, tieModel, glasses01Model, glasses02Model, hat01Model, hat02Model, hat03Model;
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
                bowModel = p.loadModel('model/bow.obj', () => console.log('[Editor-p5] Bow loaded'));
                tieModel = p.loadModel('model/tie.obj', () => console.log('[Editor-p5] Tie loaded'));
                glasses01Model = p.loadModel('model/glasses01.obj', () => console.log('[Editor-p5] Glasses01 loaded'));
                glasses02Model = p.loadModel('model/glasses02.obj', () => console.log('[Editor-p5] Glasses02 loaded'));
                hat01Model = p.loadModel('model/hat01.obj', () => console.log('[Editor-p5] hat01 loaded'));
                hat02Model = p.loadModel('model/hat02.obj', () => console.log('[Editor-p5] hat02 loaded'));
                hat03Model = p.loadModel('model/hat03.obj', () => console.log('[Editor-p5] hat03 loaded'));
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
                    if (bodyModel && armModel && 
                        bowModel && tieModel && glasses01Model && glasses02Model &&
                        hat01Model && hat02Model && hat03Model) {
                        modelsReady = true;
                        bodyModel.computeNormals();
                        armModel.computeNormals();
                        computeModelParams();
                        computeBaseLimbScales();

                        const accessoriesList = [
                            { model: bowModel, name: 'bow', pos: p.createVector(-0.05, 0.52, 0), scale: 0.05, rot: p.createVector(0, 0, 20), enabled: false, color: '#ff0000' },
                            { model: tieModel, name: 'tie', pos: p.createVector(0, 0.15, 0.1), scale: 0.1, rot: p.createVector(0, 90, 270), enabled: false, color: '#00ff00' },
                            { model: glasses01Model, name: 'glasses01', pos: p.createVector(0, 0.4, 0.15), scale: 0.03, rot: p.createVector(0, 90, 90), enabled: false, color: '#ffff00' },
                            { model: glasses02Model, name: 'glasses02', pos: p.createVector(0, 0.4, 0.15), scale: 0.03, rot: p.createVector(0, 90, 90), enabled: false, color: '#00ffff' },
                            { model: hat01Model, name: 'hat01', pos: p.createVector(0, 0.47, 0), scale: 0.15, rot: p.createVector(0, 0, 0), enabled: false, color: '#ff00ff' },
                            { model: hat02Model, name: 'hat02', pos: p.createVector(0, 0.47, 0), scale: 0.12, rot: p.createVector(0, 90, 0), enabled: false, color: '#ff8800' },
                            { model: hat03Model, name: 'hat03', pos: p.createVector(0, 0.50, 0), scale: 0.09, rot: p.createVector(0, 0, 0), enabled: false, color: '#88ff00' }
                        ];

                        previewPerson = {
                            bodyColor: p.color(85, 136, 255),
                            neonType: 'cyan',
                            speed: 1.2,
                            accessories: accessoriesList,
                            selectedAccessoryName: 'bow',
                            updateStyle: function(colHex, neon, spd) {
                                this.bodyColor = p.color(colHex);
                                this.neonType = neon;
                                this.speed = spd;
                            }
                        };
                        window.editorPreviewPerson = previewPerson;

                        const container = document.getElementById('accessoryCheckboxes');
                        if (container) {
                            container.innerHTML = '';
                            previewPerson.accessories.forEach((acc) => {
                                const div = document.createElement('div');
                                div.className = 'accessory-item';
                                const cb = document.createElement('input');
                                cb.type = 'checkbox';
                                cb.id = `acc_${acc.name}`;
                                cb.checked = acc.enabled;
                                cb.addEventListener('change', (e) => { acc.enabled = e.target.checked; });
                                const label = document.createElement('label');
                                label.htmlFor = `acc_${acc.name}`;
                                let displayName = acc.name.charAt(0).toUpperCase() + acc.name.slice(1);
                                if (acc.name.startsWith('glasses')) displayName = 'Glasses ' + acc.name.slice(-2);
                                if (acc.name.startsWith('hat')) displayName = 'Hat ' + acc.name.slice(-2);
                                label.innerText = displayName;
                                const colorPicker = document.createElement('input');
                                colorPicker.type = 'color';
                                colorPicker.value = acc.color || '#ffffff';
                                colorPicker.addEventListener('input', (e) => { acc.color = e.target.value; });
                                const specularPicker = document.createElement('input');
                                specularPicker.type = 'color';
                                specularPicker.value = acc.specularColor || '#ffffff';   // fallback to white
                                specularPicker.style.marginLeft = '4px';
                                specularPicker.title = 'Specular highlight color';
                                specularPicker.addEventListener('input', (e) => { acc.specularColor = e.target.value; });

                                div.appendChild(cb);
                                div.appendChild(label);
                                div.appendChild(colorPicker);
                                div.appendChild(specularPicker);
                                // 对于 hat01 和 hat02 添加 Y 轴滑块
                                if (acc.name === 'hat01' || acc.name === 'hat02') {
                                    const sliderWrapper = document.createElement('div');
                                    sliderWrapper.style.display = 'inline-flex';
                                    sliderWrapper.style.alignItems = 'center';
                                    sliderWrapper.style.gap = '6px';
                                    sliderWrapper.style.marginLeft = '8px';
                                    const sliderLabel = document.createElement('span');
                                    sliderLabel.innerText = 'Y°';
                                    sliderLabel.style.fontSize = '12px';
                                    const slider = document.createElement('input');
                                    slider.type = 'range';
                                    slider.min = 0;
                                    slider.max = 360;
                                    slider.step = 1;
                                    slider.value = acc.rot ? acc.rot.y : 0;
                                    slider.addEventListener('input', (e) => {
                                        if (!acc.rot) acc.rot = p.createVector(0, 0, 0);
                                        acc.rot.y = parseInt(e.target.value);
                                        angleSpan.innerText = acc.rot.y;
                                    });
                                    const angleSpan = document.createElement('span');
                                    angleSpan.innerText = slider.value;
                                    angleSpan.style.fontSize = '12px';
                                    angleSpan.style.width = '30px';
                                    sliderWrapper.appendChild(sliderLabel);
                                    sliderWrapper.appendChild(slider);
                                    sliderWrapper.appendChild(angleSpan);
                                    div.appendChild(sliderWrapper);
                                }
                                container.appendChild(div);
                            });
                        }

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
                const extraScale = 1.9;

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

                // Arms
                if (leftShoulder) {
                    drawLimb(p, leftShoulder, person.bodyColor, neonRGB, leftArmAngle, true, false);
                    drawLimb(p, rightShoulder, person.bodyColor, neonRGB, rightArmAngle, true, true);
                }
                // Legs
                if (leftHip) {
                    drawLimb(p, leftHip, person.bodyColor, neonRGB, leftLegAngle, false, false);
                    drawLimb(p, rightHip, person.bodyColor, neonRGB, rightLegAngle, false, true);
                }

                // Draw enabled accessories
                if (person.accessories) {
                    for (let acc of person.accessories) {
                        if (!acc.enabled || !acc.model) continue;
                        p.push();
                        let totalScale = modelScaleFactor * extraScale;
                        let xOff = acc.pos.x * totalScale;
                        let yOff = acc.pos.y * totalScale;
                        let zOff = acc.pos.z * totalScale;
                        p.translate(xOff, yOff, zOff);
                        if (acc.rot) {
                            p.rotateX(acc.rot.x);
                            p.rotateY(acc.rot.y);
                            p.rotateZ(acc.rot.z);
                        }
                        p.scale(acc.scale * totalScale);
                        let accColor = acc.color ? p.color(acc.color) : person.bodyColor;
                        p.ambientMaterial(accColor);
                        p.specularMaterial(neonRGB[0], neonRGB[1], neonRGB[2]);
                        p.model(acc.model);
                        p.pop();
                    }
                }

                p.pop();
            }

            function drawLimb(p, jointPos, bodyColor, neonRGB, angle, isArm, isRight) {
                p.push();
                let yOffset = isArm ? 1.2 * (jointPos.y - modelCenterY) : (jointPos.y - modelCenterY);
                let lengthMult = isArm ? armLength : legLength;
                let extraYShift = (lengthMult - 1.0) * 1;
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