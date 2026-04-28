function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);
    smooth();
    // Adjust camera position: zoom out and raise to better see the ground
    camera(0, -400, 800, 0, 0, 0, 0, 1, 0);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    angleMode(DEGREES);
    noStroke();

    // Initialize webcam
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide(); // Hide the raw feed

    // Initialize BodyPose
    bodyPose = ml5.bodyPose(video, modelReady);
}

function draw() {
    background(30);
    ambientLight(80, 80, 100);
    directionalLight(200, 180, 150, 0.5, 1, -0.5);
    rotateX(camRotationX);
    rotateY(camRotationY);

    // Wait for models to load before initializing crowd
    if (modelsReady && people.length === 0) {
        initPeople();
        console.log('👥 Crowd initialized, total:', people.length, 'people');
    }

    // Update and draw people
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

    drawGrid();
    drawAxes();

    // new change
    for (let person of peopleArray) {
    // Pass the vision data into your update function
    person.update(userMovement);
    person.display();
    }
}

function initPeople() {
    for (let i = 0; i < peopleCount; i++) {
        let x = random(-worldWidth / 2, worldWidth / 2);
        let z = random(-worldDepth / 2, worldDepth / 2);
        let col = color(150, 150, 150);
        people.push(new People3D(x, z, col));
    }
}

// Helper: draw grid
function drawGrid() {
    push();
    stroke(100);
    strokeWeight(0.5);
    noFill();
    let size = 400;
    let step = 40;
    for (let x = -size; x <= size; x += step) {
        line(x, 0, -size, x, 0, size);
        line(-size, 0, x, size, 0, x);
    }
    pop();
}

// Helper: draw axes
function drawAxes() {
    push();
    strokeWeight(2);
    stroke(255, 0, 0); line(-200, 0, 0, 200, 0, 0);
    stroke(0, 255, 0); line(0, -200, 0, 0, 200, 0);
    stroke(0, 0, 255); line(0, 0, -200, 0, 0, 200);
    pop();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

// new function
function modelReady() {
  bodyPose.detectStart(video, gotPoses);
}

// new function
function gotPoses(results) {
  poses = results;
  if (poses.length > 0) {
    // Track the nose as the primary interaction point
    let nose = poses[0].nose;
    // Map webcam coordinates (0 to 640) to WebGL coordinates (-width/2 to width/2)
    userMovement.x = map(nose.x, 0, 640, width/2, -width/2); // Mirrored for natural feel
    userMovement.y = map(nose.y, 0, 480, -height/2, height/2);
    userMovement.active = true;
  }
}
