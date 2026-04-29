// videoDebug.js - 视频调试面板：显示视频画面 + 关键点骨架

let debugPanel;
let overlayCanvas;
let panelWidth = 320;
let panelHeight = 240;
let debugSetupDone = false;

function setupVideoDebug() {
    if (debugSetupDone) return;
    if (!video || !video.elt) {
        setTimeout(setupVideoDebug, 500);
        return;
    }

    let videoElement = video.elt;
    // 确保视频可见、播放
    videoElement.style.display = 'block';
    videoElement.style.visibility = 'visible';
    videoElement.style.opacity = '1';
    // 如果视频被暂停，尝试播放（可能需要用户交互，但不影响显示）
    videoElement.play().catch(e => console.log("Auto-play prevented, video still visible"));

    // 如果视频已有父节点，先移除（避免重复移动）
    if (videoElement.parentNode && videoElement.parentNode !== document.body) {
        videoElement.parentNode.removeChild(videoElement);
    }

    // 创建浮动容器
    debugPanel = createDiv('');
    debugPanel.id('video-debug-panel');
    debugPanel.style('position', 'fixed');
    debugPanel.style('bottom', '20px');
    debugPanel.style('right', '20px');
    debugPanel.style('width', panelWidth + 'px');
    debugPanel.style('height', panelHeight + 'px');
    debugPanel.style('border', '2px solid cyan');
    debugPanel.style('border-radius', '8px');
    debugPanel.style('overflow', 'hidden');
    debugPanel.style('z-index', '1000');
    debugPanel.style('background', '#000');
    debugPanel.style('box-shadow', '0 0 10px rgba(0,255,255,0.5)');
    debugPanel.style('pointer-events', 'none');

    // 将视频元素放入面板，并调整样式占满面板
    debugPanel.child(videoElement);
    videoElement.style.position = 'absolute';
    videoElement.style.top = '0';
    videoElement.style.left = '0';
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    videoElement.style.objectFit = 'cover';
    videoElement.style.pointerEvents = 'none';

    // 创建叠加层 canvas（用于绘制关键点和连线）
    overlayCanvas = createGraphics(panelWidth, panelHeight);
    overlayCanvas.parent(debugPanel);
    overlayCanvas.style('position', 'absolute');
    overlayCanvas.style('top', '0');
    overlayCanvas.style('left', '0');
    overlayCanvas.style('width', '100%');
    overlayCanvas.style('height', '100%');
    overlayCanvas.style('pointer-events', 'none');

    debugSetupDone = true;
    console.log('✅ Video debug panel ready with overlay canvas');
}

function updateDebugPoses(poses) {
    if (!overlayCanvas || !debugSetupDone) return;
    if (!video || !video.elt) return;

    overlayCanvas.clear();

    if (!poses || poses.length === 0) {
        overlayCanvas.fill(255, 0, 0);
        overlayCanvas.textSize(14);
        overlayCanvas.text('No person detected', 10, 30);
        return;
    }

    let keypoints = poses[0].keypoints;
    // 获取视频实际像素尺寸
    let videoW = video.elt.videoWidth;
    let videoH = video.elt.videoHeight;
    if (videoW === 0 || videoH === 0) {
        // 降级使用 CSS 尺寸
        videoW = video.width;
        videoH = video.height;
    }
    let scaleX = panelWidth / videoW;
    let scaleY = panelHeight / videoH;

    // 绘制关键点（绿色圆点）
    for (let kp of keypoints) {
        if (kp.confidence > 0.2) {
            let x = kp.x * scaleX;
            let y = kp.y * scaleY;
            overlayCanvas.fill(0, 255, 0);
            overlayCanvas.noStroke();
            overlayCanvas.ellipse(x, y, 5, 5);
        }
    }

    // 绘制骨架连线
    const connections = [
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_elbow'],
        ['left_elbow', 'left_wrist'],
        ['right_shoulder', 'right_elbow'],
        ['right_elbow', 'right_wrist'],
        ['left_shoulder', 'left_hip'],
        ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip']
    ];

    let kpMap = {};
    for (let kp of keypoints) kpMap[kp.name] = kp;

    overlayCanvas.stroke(0, 255, 255); // 青色线条
    overlayCanvas.strokeWeight(2);
    for (let conn of connections) {
        let p1 = kpMap[conn[0]];
        let p2 = kpMap[conn[1]];
        if (p1 && p2 && p1.confidence > 0.2 && p2.confidence > 0.2) {
            let x1 = p1.x * scaleX;
            let y1 = p1.y * scaleY;
            let x2 = p2.x * scaleX;
            let y2 = p2.y * scaleY;
            overlayCanvas.line(x1, y1, x2, y2);
        }
    }

    // 显示有效点数
    let valid = keypoints.filter(k => k.confidence > 0.2).length;
    overlayCanvas.fill(255, 255, 0);
    overlayCanvas.textSize(12);
    overlayCanvas.text(`Points: ${valid}/17`, 10, 20);
}