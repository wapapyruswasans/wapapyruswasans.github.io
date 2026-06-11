const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 게임 설정 환경 변수
const GRID_ROWS = 5;
const GRID_COLS = 9;
let cellWidth = 0;
let cellHeight = 0;
let gridStartX = 0;
let gridStartY = 0;

const skewX = 14; 
const ROW_OFFSET_FACTOR = 0.95; 

// 게임 상태 변수
let isGameOver = false;
let currentWave = 1;
let waveTimer = 0;
const WAVE_DURATION = 3600;
let zombieSpawnInterval = 10000; 
let lastZombieSpawnTime = 0;

// 게임 객체 저장소
let plants = [];
let zombies = [];
let projectiles = [];
let suns = []; 
let lawnMovers = []; 
let sunPoints = 200; 

// 게임 오버 효과 변수
let gameOverEffect = {
    active: false,
    alpha: 0,
    scale: 0,
    x: 0,
    y: 0
};

// 이미지 객체 선언 및 상태 관리
const bgImage = new Image();
const zombieImage = new Image();
const sunflowerImage = new Image();
const potatoImage = new Image();
const plantImage = new Image();
const sunImage = new Image();
const shovelImage = new Image();
const lawnMoverImage = new Image();
const goldenImage = new Image();

let isBgLoaded = false;
let isZombieLoaded = false;
let isSunflowerLoaded = false;
let isPotatoLoaded = false;
let isPlantLoaded = false;
let isSunLoaded = false;
let isShovelLoaded = false;
let isLawnMoverLoaded = false;
let isGoldenLoaded = false;

bgImage.onload = () => { isBgLoaded = true; };
zombieImage.onload = () => { isZombieLoaded = true; };
sunflowerImage.onload = () => { isSunflowerLoaded = true; };
potatoImage.onload = () => { isPotatoLoaded = true; };
plantImage.onload = () => { isPlantLoaded = true; };
sunImage.onload = () => { isSunLoaded = true; };
shovelImage.onload = () => { isShovelLoaded = true; };
lawnMoverImage.onload = () => { isLawnMoverLoaded = true; };
goldenImage.onload = () => { isGoldenLoaded = true; };

// 이미지 경로 설정
bgImage.src = 'all_image/background.png'; 
zombieImage.src = 'all_image/zombie.png';
sunflowerImage.src = 'all_image/sunflower.webp';
potatoImage.src = 'all_image/potato.png';
plantImage.src = 'all_image/plant.svg';
sunImage.src = 'all_image/sun.webp';
shovelImage.src = 'all_image/111px-Shovel2.webp';
lawnMoverImage.src = 'all_image/zandi.webp';
goldenImage.src = 'all_image/golden.jpeg';

const PLANT_TYPES = {
    sunflower: { name: '해바라기', cost: 50, color: '#FFD700', img: sunflowerImage, getLoaded: () => isSunflowerLoaded, maxHp: 150 },
    plant: { name: '완두콩', cost: 100, color: '#00FF00', img: plantImage, getLoaded: () => isPlantLoaded, maxHp: 300 },
    potato: { name: '감자벽', cost: 50, color: '#D2B48C', img: potatoImage, getLoaded: () => isPotatoLoaded, maxHp: 1500 }
};

let selectedPlantType = 'plant'; 
let isShovelSelected = false; 

function init() {
    resizeCanvas();
    initLawnMovers(); 
    window.addEventListener('resize', () => {
        resizeCanvas();
        lawnMovers.forEach(lm => {
            if (!lm.isTriggered) {
                lm.x = gridStartX + ((GRID_ROWS - 1 - lm.row) * skewX) - 275;
            }
            lm.y = gridStartY + (lm.row * cellHeight * ROW_OFFSET_FACTOR) + (cellHeight / 2) - (lm.height / 2) - 40;
        });
    });
    canvas.addEventListener('click', handleCanvasClick);
    
    setInterval(spawnNaturalSun, 7000);
    setInterval(produceSunflowerSun, 4000);
    
    lastZombieSpawnTime = Date.now();
    requestAnimationFrame(gameLoop);
}

function initLawnMovers() {
    lawnMovers = [];
    const imgH = 285; 
    
    for (let r = 0; r < GRID_ROWS; r++) {
        lawnMovers.push({
            x: gridStartX + ((GRID_ROWS - 1 - r) * skewX) - 275, 
            y: gridStartY + (r * cellHeight * ROW_OFFSET_FACTOR) + (cellHeight / 2) - (imgH / 2) - 40,
            row: r,
            width: 390, height: imgH, speed: 0,
            isTriggered: false, isActive: true
        });
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gridStartY = 165; 
    const tempCellWidth = Math.floor((canvas.width - 200 - 50) / (GRID_COLS + 4));
    cellWidth = tempCellWidth;
    
    cellHeight = Math.floor((canvas.height - gridStartY - 80) / GRID_ROWS);
    gridStartX = 205 + (cellWidth * 3); 
}

function spawnZombie() {
    const randomRow = Math.floor(Math.random() * GRID_ROWS);
    const yPos = gridStartY + (randomRow * cellHeight * ROW_OFFSET_FACTOR) + (cellHeight / 2) - 135; 
    
    const waveBonusHp = (currentWave - 1) * 100;
    const baseHp = 150 + waveBonusHp;
    const waveBonusSpeed = (currentWave - 1) * 0.1;

    zombies.push({
        x: canvas.width,
        y: yPos,
        row: randomRow,
        width: 140, 
        height: 190, 
        hp: baseHp,     
        maxHp: baseHp,
        speed: 0.1 + Math.min(waveBonusSpeed, 0.1)
    });
}

function spawnNaturalSun() {
    if (isGameOver) return;
    const startX = Math.random() * (canvas.width - 200) + 100;
    const targetY = Math.random() * (canvas.height - 300) + 100;
    suns.push({
        x: startX,
        y: 0,
        targetY: targetY,
        width: 40,
        height: 40,
        speed: 1.5,
        landedTime: null
    });
}

function produceSunflowerSun() {
    if (isGameOver) return;
    plants.forEach(p => {
        if (p.type === 'sunflower') {
            suns.push({
                x: p.x + (Math.random() * 40 - 20),
                y: p.y,
                targetY: p.y + 30,
                width: 40,
                height: 40,
                speed: 1.0,
                landedTime: null
            });
        }
    });
}

function triggerGameOver() {
    if (isGameOver) return;
    isGameOver = true;
    
    // 게임 오버 효과 시작
    gameOverEffect.active = true;
    gameOverEffect.alpha = 0;
    gameOverEffect.scale = 0;
    gameOverEffect.x = canvas.width / 2;
    gameOverEffect.y = canvas.height / 2;
}

function handleCanvasClick(e) {
    if (isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 햇빛 줍기 처리 (가장 먼저 실행)
    for (let i = suns.length - 1; i >= 0; i--) {
        const s = suns[i];
        if (mouseX >= s.x && mouseX <= s.x + s.width && mouseY >= s.y && mouseY <= s.y + s.height) {
            sunPoints += 25;
            suns.splice(i, 1);
            return; // 햇빛을 주웠으면 더 이상의 액션은 실행하지 않음
        }
    }

    // 식물 선택 UI 클릭 처리
    if (mouseY >= 55 && mouseY <= 90) {
        if (mouseX >= 30 && mouseX <= 130) { selectedPlantType = 'sunflower'; isShovelSelected = false; return; }
        if (mouseX >= 140 && mouseX <= 240) { selectedPlantType = 'plant'; isShovelSelected = false; return; }
        if (mouseX >= 250 && mouseX <= 350) { selectedPlantType = 'potato'; isShovelSelected = false; return; }
        if (mouseX >= 380 && mouseX <= 440) { isShovelSelected = true; return; }
    }

    // 그리드 클릭 처리 (식물 설치/삭제)
    const calcRow = Math.floor((mouseY - gridStartY) / (cellHeight * ROW_OFFSET_FACTOR));
    if (calcRow >= 0 && calcRow < GRID_ROWS) {
        const calcCol = Math.floor((mouseX - gridStartX - ((GRID_ROWS - 1 - calcRow) * skewX)) / cellWidth);

        if (calcCol >= 0 && calcCol < GRID_COLS) {
            const existingPlantIndex = plants.findIndex(p => p.col === calcCol && p.row === calcRow);
            
            if (isShovelSelected) {
                if (existingPlantIndex > -1) {
                    plants.splice(existingPlantIndex, 1);
                }
                isShovelSelected = false; 
            } else {
                const currentConfig = PLANT_TYPES[selectedPlantType];
                if (existingPlantIndex === -1 && sunPoints >= currentConfig.cost) {
                    sunPoints -= currentConfig.cost;
                    
                    plants.push({
                        col: calcCol,
                        row: calcRow,
                        x: gridStartX + (calcCol * cellWidth) + ((GRID_ROWS - 1 - calcRow) * skewX) + (cellWidth / 2) - 45,
                        y: gridStartY + (calcRow * cellHeight * ROW_OFFSET_FACTOR) + (cellHeight / 2) + 5,
                        type: selectedPlantType,
                        hp: currentConfig.maxHp,
                        maxHp: currentConfig.maxHp,
                        lastShot: 0,
                        shootInterval: 1500 
                    });
                }
            }
        }
    }
}

function update() {
    if (isGameOver) {
        // [변경] 게임 오버 효과 업데이트 - 더 빠르게 커짐 (0.08 -> 0.2)
        if (gameOverEffect.active) {
            gameOverEffect.scale += 0.4; // 훨씬 빠르게 커짐
            gameOverEffect.alpha += 0.08;
            
            // [변경] 화면을 더 꽉 채우도록 최대 스케일 증가 (3.5 -> 6.0)
            if (gameOverEffect.scale >= 6.0) {
                gameOverEffect.scale = 6.0;
            }
        }
        return;
    }

    const now = Date.now();

    waveTimer++;
    if (waveTimer >= WAVE_DURATION) {
        currentWave++;
        waveTimer = 0;
        zombieSpawnInterval = Math.max(1500, 10000 - (currentWave * 50));
    }

    if (now - lastZombieSpawnTime > zombieSpawnInterval) {
        spawnZombie();
        lastZombieSpawnTime = now;
    }

    for (let i = suns.length - 1; i >= 0; i--) {
        const s = suns[i];
        if (s.y < s.targetY) {
            s.y += s.speed;
        } else {
            if (s.landedTime === null) {
                s.landedTime = now;
            }
            if (now - s.landedTime > 6000) {
                suns.splice(i, 1);
            }
        }
    }

    plants.forEach(plant => {
        if (plant.type === 'plant') {
            const zombieInRow = zombies.some(z => z.row === plant.row && z.x > plant.x);
            if (zombieInRow && now - plant.lastShot > plant.shootInterval) {
                projectiles.push({
                    x: plant.x + 20,
                    y: plant.y - 10,
                    row: plant.row,
                    speed: 4,
                    damage: 20
                });
                plant.lastShot = now;
            }
        }
    });

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.speed;

        if (p.x > canvas.width) {
            projectiles.splice(i, 1);
            continue;
        }

        for (let j = zombies.length - 1; j >= 0; j--) {
            const z = zombies[j];
            if (p.row === z.row && p.x >= z.x && p.x <= z.x + z.width) {
                z.hp -= p.damage;
                if (z.hp < 0) z.hp = 0;
                projectiles.splice(i, 1);
                if (z.hp <= 0) zombies.splice(j, 1);
                break;
            }
        }
    }

    for (let i = lawnMovers.length - 1; i >= 0; i--) {
        const lm = lawnMovers[i];
        if (!lm.isActive) continue;

        if (lm.isTriggered) {
            lm.x += lm.speed;
            if (lm.x > canvas.width) {
                lm.isActive = false;
                continue;
            }

            for (let j = zombies.length - 1; j >= 0; j--) {
                const z = zombies[j];
                if (z.row === lm.row && z.x <= lm.x + 120 && z.x + z.width >= lm.x + 50) {
                    zombies.splice(j, 1);
                }
            }
        }
    }

    for (let i = zombies.length - 1; i >= 0; i--) {
        const z = zombies[i];
        const targetPlant = plants.find(p => p.row === z.row && z.x <= p.x + 10 && z.x + z.width >= p.x - 40);

        if (targetPlant) {
            targetPlant.hp -= 1.5; 
            if (targetPlant.hp < 0) targetPlant.hp = 0;
            if (targetPlant.hp <= 0) {
                const idx = plants.indexOf(targetPlant);
                if (idx > -1) plants.splice(idx, 1);
            }
        } else {
            z.x -= z.speed;
        }

        const triggerLimit = gridStartX + ((GRID_ROWS - 1 - z.row) * skewX) - 150;
        if (z.x < triggerLimit) {
            const lm = lawnMovers.find(l => l.row === z.row && l.isActive);
            if (lm && !lm.isTriggered) {
                lm.isTriggered = true;
                lm.speed = 5; 
            } else if (!lm || !lm.isActive) {
                triggerGameOver();
            }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#228B22'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isBgLoaded) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        for (let r = 0; r <= GRID_ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(gridStartX + ((GRID_ROWS - r) * skewX), gridStartY + r * cellHeight * ROW_OFFSET_FACTOR);
            ctx.lineTo(gridStartX + ((GRID_ROWS - r) * skewX) + GRID_COLS * cellWidth, gridStartY + r * cellHeight * ROW_OFFSET_FACTOR);
            ctx.stroke();
        }
        for (let c = 0; c <= GRID_COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(gridStartX + c * cellWidth + (GRID_ROWS * skewX), gridStartY);
            ctx.lineTo(gridStartX + c * cellWidth, gridStartY + GRID_ROWS * cellHeight * ROW_OFFSET_FACTOR);
            ctx.stroke();
        }
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, canvas.width - 20, 120);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`SUN: ${sunPoints}`, 30, 40);

    ctx.fillStyle = '#FF4500';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`WAVE: ${currentWave}`, 500, 40);

    let cardX = 30;
    Object.keys(PLANT_TYPES).forEach(type => {
        const pData = PLANT_TYPES[type];
        ctx.fillStyle = (!isShovelSelected && selectedPlantType === type) ? '#FF0000' : '#444';
        ctx.fillRect(cardX, 55, 100, 35);
        ctx.fillStyle = '#FFF';
        ctx.font = '12px Arial';
        ctx.fillText(`${pData.name}(${pData.cost})`, cardX + 5, 77);
        cardX += 110;
    });

    ctx.fillStyle = isShovelSelected ? '#FF0000' : '#444';
    ctx.fillRect(380, 55, 60, 35);
    if (isShovelLoaded) {
        ctx.drawImage(shovelImage, 395, 57, 30, 30);
    } else {
        ctx.fillStyle = '#FFF';
        ctx.font = '12px Arial';
        ctx.fillText('삽', 400, 77);
    }

    lawnMovers.forEach(lm => {
        if (lm.isActive) {
            if (isLawnMoverLoaded) {
                ctx.drawImage(lawnMoverImage, lm.x, lm.y, lm.width, lm.height);
            } else {
                ctx.fillStyle = '#808080';
                ctx.fillRect(lm.x, lm.y, lm.width, lm.height);
                ctx.fillStyle = '#FFF';
                ctx.font = '14px Arial';
                ctx.fillText('Mower', lm.x + (lm.width/2) - 20, lm.y + (lm.height/2));
            }
        }
    });

    // 식물 그리기
    plants.forEach(plant => {
        const config = PLANT_TYPES[plant.type];
        if (config.getLoaded()) {
            ctx.drawImage(config.img, plant.x - 30, plant.y - 45, 60, 90);
        } else {
            ctx.beginPath();
            ctx.arc(plant.x, plant.y, 25, 0, Math.PI * 2);
            ctx.fillStyle = config.color;
            ctx.fill();
        }
    });
    
    // 식물 체력바
    plants.forEach(plant => {
        const plantHpPercent = Math.max(0, Math.min(1, plant.hp / plant.maxHp));
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(plant.x - 25, plant.y - 65, 50, 5);
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(plant.x - 25, plant.y - 65, plantHpPercent * 50, 5);
    });

    // 좀비 그리기
    zombies.forEach(z => {
        if (isZombieLoaded) {
            ctx.drawImage(zombieImage, z.x, z.y, z.width, z.height);
        } else {
            ctx.fillStyle = '#4B5320';
            ctx.fillRect(z.x, z.y, z.width, z.height);
        }
    });
    
    // 좀비 체력바
    zombies.forEach(z => {
        const zombieHpPercent = Math.max(0, Math.min(1, z.hp / z.maxHp));
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(z.x, z.y - 15, z.width, 6);
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(z.x, z.y - 15, zombieHpPercent * z.width, 6);
    });

    projectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#00FF00';
        ctx.fill();
    });

    const now = Date.now();
    suns.forEach(s => {
        let currentAlpha = 1.0;
        if (s.landedTime !== null) {
            const elapsed = now - s.landedTime;
            if (elapsed > 3000) {
                currentAlpha = 0.6 + Math.sin(elapsed * 0.015) * 0.4;
            }
        }
        
        ctx.save();
        ctx.globalAlpha = Math.max(0.1, Math.min(1, currentAlpha));
        if (isSunLoaded) {
            ctx.drawImage(sunImage, s.x, s.y, s.width, s.height);
        } else {
            ctx.beginPath();
            ctx.arc(s.x + 20, s.y + 20, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFF00';
            ctx.fill();
        }
        ctx.restore();
    });

    // [변경] 게임 오버 효과 - 더 빠르고 더 크게
    if (gameOverEffect.active && isGoldenLoaded) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // [변경] 이미지가 화면을 완전히 덮도록 스케일 계산
        // 화면 대각선 길이 기준으로 최소한의 스케일 보장
        const screenDiagonal = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height);
        const imgDiagonal = Math.sqrt(goldenImage.width * goldenImage.width + goldenImage.height * goldenImage.height);
        const minCoverScale = Math.max(1.5, screenDiagonal / imgDiagonal);
        
        const currentScale = gameOverEffect.scale;
        const scaledWidth = goldenImage.width * currentScale;
        const scaledHeight = goldenImage.height * currentScale;
        
        ctx.save();
        ctx.globalAlpha = Math.min(0.95, gameOverEffect.alpha);
        ctx.drawImage(
            goldenImage, 
            centerX - scaledWidth / 2, 
            centerY - scaledHeight / 2, 
            scaledWidth, 
            scaledHeight
        );
        ctx.restore();
        
        // 효과가 완전히 커지면 텍스트 표시 (minCoverScale 이상일 때)
        if (gameOverEffect.scale >= minCoverScale) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 60px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
            
            ctx.font = '36px Arial';
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`최종 웨이브: ${currentWave}`, canvas.width / 2, canvas.height / 2 + 50);
            ctx.textAlign = 'left';
        }
    } else if (isGameOver && !gameOverEffect.active) {
        // 기존 게임 오버 화면 (fallback)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 20);

        ctx.fillStyle = '#FFF';
        ctx.font = '24px Arial';
        ctx.fillText(`최종 진행 웨이브: ${currentWave}`, canvas.width / 2, canvas.height / 2 + 40);
        ctx.textAlign = 'left'; 
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

window.onload = init;
