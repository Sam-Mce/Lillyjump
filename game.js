// Game state
let scene, camera, renderer, frog, lilypads = [];
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let isGameOver = false;
let isJumping = false;
let jumpForce = 0;
let currentLilypad = null;
let frogOffsetX = 0;
let cameraTargetZ = 0;
let water;
let waterTexture = null;
let waterBlocks = [];
let waterTime = 0;
let lastTime = performance.now();
let frameCount = 0;
let fps = 0;
let hasInteracted = false;  // Add this flag to track user interaction
const WATER_COLORS = [0x1e6ea3, 0x1e78b3];  // Brighter, more water-like blues
const JUMP_POWER = 0.1;
const GRAVITY = 0.02;
const MIN_LILYPAD_SPEED = 0.05;
const MAX_LILYPAD_SPEED = 0.1;
const LILYPAD_SPAWN_DISTANCE = 20;
const MIN_LILYPAD_SIZE = 1;
const MAX_LILYPAD_SIZE = 2;
const LILYPAD_MOVE_RANGE = 10;
const CAMERA_SMOOTH_SPEED = 0.1;
const MAX_LILYPADS = 8;
const CAMERA_HEIGHT = 5;
const CAMERA_DISTANCE = 10;
let gameMusic;
let jumpSound;

// Sound constructor with error handling
function sound(src) {
    this.sound = document.createElement("audio");
    this.sound.src = src;
    this.sound.setAttribute("preload", "auto");
    this.sound.setAttribute("controls", "none");
    this.sound.style.display = "none";
    document.body.appendChild(this.sound);
    
    // Add error handling
    this.sound.onerror = () => {
        console.error('Error loading audio file:', src);
        // Try alternative path if initial load fails
        if (!src.startsWith('/')) {
            this.sound.src = '/' + src;
        }
    };
    
    this.play = function(){
        const playPromise = this.sound.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error('Error playing audio:', error);
            });
        }
    }
    this.stop = function(){
        this.sound.pause();
        this.sound.currentTime = 0;
    }
    this.setVolume = function(volume) {
        this.sound.volume = volume;
    }
}

// Create a tree
function createTree(x, z, scale = 1) {
    const treeGroup = new THREE.Group();
    
    // Create trunk using boxes
    const trunkHeight = 4 * scale;
    const trunkWidth = 0.8 * scale;
    const trunkGeometry = new THREE.BoxGeometry(trunkWidth, trunkHeight, trunkWidth);
    const trunkMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513,
        flatShading: true
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    treeGroup.add(trunk);
    
    // Create leaves as a single connected structure
    const leafMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2d5a27,
        flatShading: true
    });

    // Create main leaf block
    const mainLeafSize = 2 * scale;
    const mainLeafGeometry = new THREE.BoxGeometry(mainLeafSize, mainLeafSize, mainLeafSize);
    const mainLeaf = new THREE.Mesh(mainLeafGeometry, leafMaterial);
    mainLeaf.position.y = trunkHeight + mainLeafSize/2;
    treeGroup.add(mainLeaf);

    // Add side leaf blocks
    const sideLeafSize = mainLeafSize * 0.8;
    const sideLeafGeometry = new THREE.BoxGeometry(sideLeafSize, sideLeafSize, sideLeafSize);
    
    // Left leaf
    const leftLeaf = new THREE.Mesh(sideLeafGeometry, leafMaterial);
    leftLeaf.position.set(-mainLeafSize/2, trunkHeight + mainLeafSize/2, 0);
    treeGroup.add(leftLeaf);
    
    // Right leaf
    const rightLeaf = new THREE.Mesh(sideLeafGeometry, leafMaterial);
    rightLeaf.position.set(mainLeafSize/2, trunkHeight + mainLeafSize/2, 0);
    treeGroup.add(rightLeaf);
    
    // Top leaf
    const topLeaf = new THREE.Mesh(sideLeafGeometry, leafMaterial);
    topLeaf.position.set(0, trunkHeight + mainLeafSize, 0);
    treeGroup.add(topLeaf);
    
    treeGroup.position.set(x, 0, z);
    return treeGroup;
}

// Create grass patch
function createGrass(x, z, width, length) {
    const grassGeometry = new THREE.PlaneGeometry(width, length, 1, 1);
    const grassMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2d5a27,
        side: THREE.DoubleSide
    });
    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(x, -1.99, z);
    return grass;
}

// Create a snowy tree
function createSnowyTree(x, z, scale = 1) {
    const treeGroup = new THREE.Group();
    
    // Create darker trunk
    const trunkHeight = 6 * scale;  // Keep same height
    const trunkWidth = 0.8 * scale;
    const trunkGeometry = new THREE.BoxGeometry(trunkWidth, trunkHeight, trunkWidth);
    const trunkMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2b1810,  // Very dark brown
        flatShading: true 
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    treeGroup.add(trunk);
    
    // Create fuller snow foliage
    const snowMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffff,  // Pure white
        flatShading: true
    });
    
    // Add more layers of snow blocks, starting from lower
    const layerCount = 6;  // More layers
    for(let i = 0; i < layerCount; i++) {
        const layerY = trunkHeight * (0.3 + (i * 0.15));  // Start lower on trunk
        const layerSize = 2.5 * scale * (1 - (i * 0.15));  // Larger at bottom, smaller at top
        const snowGeometry = new THREE.BoxGeometry(layerSize, layerSize * 0.8, layerSize);
        
        // Add multiple snow blocks per layer for fuller look
        const blocksPerLayer = 4;
        for(let j = 0; j < blocksPerLayer; j++) {
            const snow = new THREE.Mesh(snowGeometry, snowMaterial);
            const angle = (j / blocksPerLayer) * Math.PI * 2;
            const offset = 0.3 * scale * (layerCount - i) / layerCount;  // Larger offset for lower layers
            snow.position.set(
                Math.cos(angle) * offset,
                layerY,
                Math.sin(angle) * offset
            );
            snow.rotation.y = angle;
            treeGroup.add(snow);
        }
        
        // Add center block
        const centerSnow = new THREE.Mesh(snowGeometry, snowMaterial);
        centerSnow.position.y = layerY;
        treeGroup.add(centerSnow);
    }
    
    treeGroup.position.set(x, 0, z);
    return treeGroup;
}

// Create snowy mountain
function createMountain(x, z, scale = 1) {
    const mountainGroup = new THREE.Group();
    const layers = 15;  // Fewer layers for shorter mountains
    const baseWidth = 15 * scale;  // Half the base width
    const layerHeight = 1.5 * scale;  // Shorter layers
    
    for(let i = 0; i < layers; i++) {
        const y = i * layerHeight;
        const width = baseWidth * (1 - (i / layers));  // Linear reduction for pyramid shape
        const geometry = new THREE.BoxGeometry(width, layerHeight, width);
        const material = new THREE.MeshPhongMaterial({
            color: 0xffffff,  // Pure white
            flatShading: true
        });
        const layer = new THREE.Mesh(geometry, material);
        layer.position.set(0, y, 0);
        mountainGroup.add(layer);
    }
    
    mountainGroup.position.set(x, 0, z);
    return mountainGroup;
}

// Create snowy ground
function createSnowyGround(x, z, width, length) {
    const groundGeometry = new THREE.PlaneGeometry(width, length, 10, 10);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffff,
        side: THREE.DoubleSide,
        flatShading: true
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(x, -1.99, z);
    return ground;
}

// Create grassy hill
function createHill(x, z, scale = 1, layers = 10, baseWidth = 30, isSnowBiome = false, customColors = null) {
    const hillGroup = new THREE.Group();
    
    // Colors for each biome
    const snowColors = [
        0xffffff,  // Pure white
        0xf0f5f9,  // Slightly blue white
        0xe8e8e8   // Light grey
    ];
    
    const grassColors = [
        0x2d5a27,  // Dark grass green
        0x3d7a37,  // Medium grass green
        0x4a8f40,  // Brighter green
        0x357a35   // Forest green
    ];

    // Calculate layer properties with slight randomness
    const layerHeight = 1.2 * scale;  // Shorter layers for smoother slope
    
    for(let i = 0; i < layers; i++) {
        const y = i * layerHeight;
        // More gradual width reduction for smoother slope
        const width = baseWidth * (1 - Math.pow(i / layers, 1.5)) * scale;
        
        // Add some randomness to each layer's dimensions for more natural look
        const heightVariation = 0.8 + Math.random() * 0.4;
        const widthVariation = 0.9 + Math.random() * 0.2;
        
        const geometry = new THREE.BoxGeometry(
            width * widthVariation, 
            layerHeight * heightVariation, 
            width * widthVariation
        );
        
        // Choose color based on biome or custom colors
        const colors = customColors || (isSnowBiome ? snowColors : grassColors);
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const material = new THREE.MeshPhongMaterial({
            color: color,
            flatShading: true
        });
        
        const layer = new THREE.Mesh(geometry, material);
        
        // Add slight random offset to position for more natural look
        const offsetX = (Math.random() - 0.5) * 0.5;
        const offsetZ = (Math.random() - 0.5) * 0.5;
        layer.position.set(offsetX, y, offsetZ);
        
        hillGroup.add(layer);
    }
    
    hillGroup.position.set(x, 0, z);
    return hillGroup;
}

// Create a billboard tree (2D tree that always faces camera)
function createBillboardTree(x, z, scale = 1) {
    const treeGroup = new THREE.Group();
    
    // Create trunk using a vertical plane
    const trunkHeight = 4 * scale;
    const trunkWidth = 0.8 * scale;
    const trunkGeometry = new THREE.PlaneGeometry(trunkWidth, trunkHeight);
    const trunkMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B4513,
        side: THREE.DoubleSide,
        flatShading: true
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.rotation.y = Math.PI / 4;  // 45-degree angle to be visible from more angles
    treeGroup.add(trunk);
    
    // Create foliage using two crossed planes
    const leafColors = [
        0x2d5a27, // Dark forest green
        0x355e2c, // Medium forest green
        0x3a6631  // Deep green
    ];
    const leafColor = leafColors[Math.floor(Math.random() * leafColors.length)];
    const leafMaterial = new THREE.MeshPhongMaterial({ 
        color: leafColor,
        side: THREE.DoubleSide,
        flatShading: true
    });

    const foliageHeight = trunkHeight * 2;
    const foliageWidth = trunkHeight * 1.5;
    const foliageGeometry = new THREE.PlaneGeometry(foliageWidth, foliageHeight);
    
    // Create two crossed planes for foliage
    const foliage1 = new THREE.Mesh(foliageGeometry, leafMaterial);
    foliage1.position.y = trunkHeight + foliageHeight/3;
    foliage1.rotation.y = Math.PI / 4;
    treeGroup.add(foliage1);
    
    const foliage2 = new THREE.Mesh(foliageGeometry, leafMaterial);
    foliage2.position.y = trunkHeight + foliageHeight/3;
    foliage2.rotation.y = -Math.PI / 4;
    treeGroup.add(foliage2);
    
    treeGroup.position.set(x, 0, z);
    return treeGroup;
}

// Create a varied tree
function createVariedTree(x, z, scale = 1) {
    const treeGroup = new THREE.Group();
    const treeType = Math.floor(Math.random() * 4); // 0-3 different tree types
    
    // Varied colors for different parts of trees
    const trunkColors = [
        0x8B4513,  // Saddle Brown
        0x654321,  // Dark Brown
        0x8B5742,  // Light Brown
        0x6B4423   // Medium Brown
    ];
    
    const leafColors = [
        0x2d5a27,  // Dark forest green
        0x3d7a37,  // Medium forest green
        0x4a8f40,  // Bright forest green
        0x355e2c,  // Deep forest green
        0x2f6e1f   // Moss green
    ];

    const trunkColor = trunkColors[Math.floor(Math.random() * trunkColors.length)];
    const leafColor = leafColors[Math.floor(Math.random() * leafColors.length)];
    
    const trunkMaterial = new THREE.MeshPhongMaterial({ 
        color: trunkColor,
        flatShading: true
    });
    
    const leafMaterial = new THREE.MeshPhongMaterial({ 
        color: leafColor,
        flatShading: true
    });

    switch(treeType) {
        case 0: // Tall pine style
            const trunkHeight = (6 + Math.random() * 2) * scale;
            const trunkWidth = 0.8 * scale;
            const trunk = new THREE.Mesh(
                new THREE.BoxGeometry(trunkWidth, trunkHeight, trunkWidth),
                trunkMaterial
            );
            trunk.position.y = trunkHeight / 2;
            treeGroup.add(trunk);

            // Add pine layers
            const layers = 5 + Math.floor(Math.random() * 3);
            for(let i = 0; i < layers; i++) {
                const layerSize = (3 - (i * 0.4)) * scale;
                const layer = new THREE.Mesh(
                    new THREE.BoxGeometry(layerSize, layerSize, layerSize),
                    leafMaterial
                );
                layer.position.y = trunkHeight * (0.5 + (i * 0.15));
                treeGroup.add(layer);
            }
            break;

        case 1: // Round bushy tree
            const bushTrunkHeight = (3 + Math.random() * 2) * scale;
            const bushTrunk = new THREE.Mesh(
                new THREE.BoxGeometry(scale, bushTrunkHeight, scale),
                trunkMaterial
            );
            bushTrunk.position.y = bushTrunkHeight / 2;
            treeGroup.add(bushTrunk);

            // Create round canopy
            const segments = 4;
            const canopySize = (3 + Math.random()) * scale;
            for(let i = 0; i < segments; i++) {
                const size = canopySize * (1 - (i * 0.2));
                const leaf = new THREE.Mesh(
                    new THREE.BoxGeometry(size, size, size),
                    leafMaterial
                );
                leaf.position.y = bushTrunkHeight + (size * 0.3);
                treeGroup.add(leaf);
            }
            break;

        case 2: // Tall skinny tree
            const tallTrunkHeight = (8 + Math.random() * 3) * scale;
            const tallTrunk = new THREE.Mesh(
                new THREE.BoxGeometry(0.6 * scale, tallTrunkHeight, 0.6 * scale),
                trunkMaterial
            );
            tallTrunk.position.y = tallTrunkHeight / 2;
            treeGroup.add(tallTrunk);

            // Add sparse leaf clusters
            const clusterCount = 3 + Math.floor(Math.random() * 3);
            for(let i = 0; i < clusterCount; i++) {
                const clusterSize = (1.5 + Math.random()) * scale;
                const cluster = new THREE.Mesh(
                    new THREE.BoxGeometry(clusterSize, clusterSize, clusterSize),
                    leafMaterial
                );
                cluster.position.y = tallTrunkHeight * (0.6 + (i * 0.15));
                cluster.position.x = (Math.random() - 0.5) * scale;
                cluster.position.z = (Math.random() - 0.5) * scale;
                treeGroup.add(cluster);
            }
            break;

        case 3: // Wide branching tree
            const wideTrunkHeight = (4 + Math.random() * 2) * scale;
            const wideTrunk = new THREE.Mesh(
                new THREE.BoxGeometry(scale, wideTrunkHeight, scale),
                trunkMaterial
            );
            wideTrunk.position.y = wideTrunkHeight / 2;
            treeGroup.add(wideTrunk);

            // Add wide branches with leaves
            const branchCount = 4 + Math.floor(Math.random() * 3);
            for(let i = 0; i < branchCount; i++) {
                const angle = (i / branchCount) * Math.PI * 2;
                const branchLength = (2 + Math.random()) * scale;
                const leafSize = (2 + Math.random()) * scale;
                
                const leaf = new THREE.Mesh(
                    new THREE.BoxGeometry(leafSize, leafSize, leafSize),
                    leafMaterial
                );
                leaf.position.set(
                    Math.cos(angle) * branchLength,
                    wideTrunkHeight * (0.7 + Math.random() * 0.3),
                    Math.sin(angle) * branchLength
                );
                treeGroup.add(leaf);
            }
            break;
    }

    treeGroup.position.set(x, 0, z);
    return treeGroup;
}

// Create a lilypad
function createLilypad(x, y, z, isStationary = false) {
    const size = MIN_LILYPAD_SIZE + Math.random() * (MAX_LILYPAD_SIZE - MIN_LILYPAD_SIZE);
    const lilypadGroup = new THREE.Group();
    
    // Use the actual game score to determine biome
    const isSnowBiome = score >= 50 && score <= 100;
    const isDesertBiome = score > 100 && score < 150;
    const isSpaceBiome = score >= 150;
    
    // Create base material with flat shading for blocky look
    const padMaterial = new THREE.MeshPhongMaterial({ 
        color: isSpaceBiome ? 0x4B0082 : (isDesertBiome ? 0x8B4513 : (isSnowBiome ? 0x1f4d1f : 0x2d5a27)),  // Purple for space
        flatShading: true 
    });
    const darkPadMaterial = new THREE.MeshPhongMaterial({ 
        color: isSpaceBiome ? 0x2A0A29 : (isDesertBiome ? 0x654321 : (isSnowBiome ? 0x0f2f0f : 0x1a3d18)),  // Dark purple for space
        flatShading: true 
    });

    // Desert sand colors
    const sandColors = [
        0xd2b48c,  // Tan
        0xdeb887,  // BurlyWood
        0xf4a460   // Sandy Brown
    ];

    // Frost colors
    const frostColors = [
        0xffffff,  // Pure white
        0xf0f5f9,  // Slightly blue white
        0xe8e8e8,  // Light grey
    ];

    // Function to add a cube segment
    function addCube(x, z, isEdge = false) {
        const cubeSize = 0.4 * size;
        const height = 0.2;
        const geometry = new THREE.BoxGeometry(cubeSize, height, cubeSize);
        const material = isEdge ? darkPadMaterial : padMaterial;
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x * cubeSize, 0, z * cubeSize);
        
        // Add biome-specific effects
        if (isSnowBiome && Math.random() < 0.7) {  // Snow effect
            const frostGeometry = new THREE.BoxGeometry(
                cubeSize * (0.3 + Math.random() * 0.3),
                0.05,
                cubeSize * (0.3 + Math.random() * 0.3)
            );
            const frostMaterial = new THREE.MeshPhongMaterial({
                color: frostColors[Math.floor(Math.random() * frostColors.length)],
                flatShading: true,
                transparent: true,
                opacity: 0.8
            });
            const frost = new THREE.Mesh(frostGeometry, frostMaterial);
            frost.position.y = height / 2 + 0.025;
            frost.rotation.y = Math.random() * Math.PI * 2;
            cube.add(frost);
        } else if (isDesertBiome && Math.random() < 0.5) {  // Sand effect
            const sandGeometry = new THREE.BoxGeometry(
                cubeSize * (0.2 + Math.random() * 0.2),
                0.03,
                cubeSize * (0.2 + Math.random() * 0.2)
            );
            const sandMaterial = new THREE.MeshPhongMaterial({
                color: sandColors[Math.floor(Math.random() * sandColors.length)],
                flatShading: true,
                transparent: true,
                opacity: 0.9
            });
            const sand = new THREE.Mesh(sandGeometry, sandMaterial);
            sand.position.y = height / 2 + 0.015;
            sand.rotation.y = Math.random() * Math.PI * 2;
            cube.add(sand);
        }
        
        return cube;
    }

    // Define the lilypad shape pattern (1 represents a cube, 2 represents edge cube)
    const pattern = [
        [0, 2, 2, 2, 0],
        [2, 1, 1, 1, 2],
        [2, 1, 1, 1, 2],
        [2, 1, 1, 1, 2],
        [0, 2, 2, 2, 0]
    ];

    // Create the lilypad using the pattern
    const offset = -(pattern.length - 1) / 2;
    pattern.forEach((row, rowIndex) => {
        row.forEach((value, colIndex) => {
            if (value > 0) {
                const cube = addCube(
                    offset + colIndex, 
                    offset + rowIndex, 
                    value === 2
                );
                lilypadGroup.add(cube);
            }
        });
    });

    // Add some random height variation to cubes for texture
    lilypadGroup.children.forEach(cube => {
        if (Math.random() > 0.7) {
            cube.position.y += (Math.random() * 0.05);
        }
    });

    // Set up lilypad properties
    lilypadGroup.position.set(x, y, z);
    lilypadGroup.isStationary = isStationary;
    lilypadGroup.moveDirection = Math.random() < 0.5 ? 1 : -1;
    lilypadGroup.speed = MIN_LILYPAD_SPEED + Math.random() * (MAX_LILYPAD_SPEED - MIN_LILYPAD_SPEED);
    lilypadGroup.originalSpeed = lilypadGroup.speed;
    lilypadGroup.radius = size * 1.2; // Adjust collision radius for new shape

    scene.add(lilypadGroup);
    lilypads.push(lilypadGroup);
    return lilypadGroup;
}

// Handle keyboard input
function handleKeyDown(event) {
    if (isGameOver) return;

    switch(event.code) {
        case 'Space':
            if (!isJumping) {
                // Start background music on first jump if not already playing
                if (!gameMusic.sound.playing) {
                    gameMusic.play();
                }
                isJumping = true;
                jumpForce = JUMP_POWER;
                // Move frog forward when jumping
                frog.position.z += 5;
                cameraTargetZ = frog.position.z - 10;
                
                // Resume movement of the previous lilypad
                if (currentLilypad && !currentLilypad.isStationary) {
                    currentLilypad.speed = currentLilypad.originalSpeed;
                }
                currentLilypad = null;
                frogOffsetX = 0;
            }
            break;
        case 'ArrowLeft':
            if (!isJumping) {
                frog.position.x += 0.1; // Reversed direction
                if (currentLilypad) {
                    frogOffsetX = frog.position.x - currentLilypad.position.x;
                }
            }
            break;
        case 'ArrowRight':
            if (!isJumping) {
                frog.position.x -= 0.1; // Reversed direction
                if (currentLilypad) {
                    frogOffsetX = frog.position.x - currentLilypad.position.x;
                }
            }
            break;
    }
}

function handleKeyUp(event) {
    // Add any key up handling if needed
}

// Get the lilypad the frog is currently on
function getCurrentLilypad() {
    for (const lilypad of lilypads) {
        const dx = frog.position.x - lilypad.position.x;
        const dz = frog.position.z - lilypad.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        if (distance < lilypad.radius) {
            return lilypad;
        }
    }
    return null;
}

// Check if frog is on a lilypad
function isOnLilypad() {
    return getCurrentLilypad() !== null;
}

// Leaderboard functions
async function fetchLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const scores = await response.json();
        updateLeaderboardDisplay(scores);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
    }
}

function updateLeaderboardDisplay(leaderboard) {
    const container = document.getElementById('leaderboardEntries');
    if (!container) return;  // Guard against missing container
    
    container.innerHTML = leaderboard.map((entry, index) => `
        <div class="leaderboard-entry">
            <span>${index + 1}. ${entry.name}</span>
            <span>${entry.score}</span>
        </div>
    `).join('');
}

async function submitScore(name, score) {
    try {
        console.log('Attempting to submit score:', { name, score });
        const response = await fetch('/api/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, score })
        });
        
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error('Failed to parse response as JSON:', e);
            throw new Error(`Invalid response format: ${responseText}`);
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, message: ${result.error || responseText}`);
        }
        
        if (!result.success) {
            throw new Error('Server returned unsuccessful response: ' + (result.error || 'Unknown error'));
        }
        
        console.log('Score submitted successfully:', result);
        return true;
    } catch (error) {
        console.error('Error submitting score:', error);
        return false;
    }
}

// Game over handling
function gameOver() {
    isGameOver = true;
    document.getElementById('gameOver').style.display = 'block';
    
    // Show final score
    document.getElementById('finalScore').textContent = score;
    
    // Set up score submission handler
    const submitButton = document.getElementById('submitScore');
    const nameInput = document.getElementById('playerName');
    
    submitButton.onclick = async () => {
        const name = nameInput.value.trim();
        if (!name) {
            alert('Please enter your name!');
            return;
        }
        
        submitButton.disabled = true;
        try {
            const success = await submitScore(name, score);
            if (success) {
                nameInput.value = '';
                // Update the leaderboard without page reload
                await fetchLeaderboard();
                alert('Score submitted successfully!');
            } else {
                alert('Failed to submit score. Please check the console for details and try again.');
            }
        } catch (error) {
            console.error('Error in score submission:', error);
            alert('Error submitting score: ' + error.message);
        } finally {
            submitButton.disabled = false;
        }
    };
    
    // Initial leaderboard fetch
    fetchLeaderboard();
}

// Reset game state and setup
function restartGame() {
    // Hide game over screen
    document.getElementById('gameOver').style.display = 'none';

    // First, store the lights before clearing the scene
    const lights = [];
    scene.traverse((object) => {
        if (object.isLight) {
            lights.push(object);
        }
    });

    // Clear the scene
    while(scene.children.length > 0) { 
        const object = scene.children[0];
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
            } else {
                object.material.dispose();
            }
        }
        if (object.geometry) {
            object.geometry.dispose();
        }
        scene.remove(object);
    }

    // Add lights back
    lights.forEach(light => scene.add(light));

    // Reset game state
    score = 0;  // Reset score to 0 instead of 149
    isGameOver = false;
    isJumping = false;
    jumpForce = 0;
    lilypads = [];
    currentLilypad = null;
    frogOffsetX = 0;
    cameraTargetZ = 0;

    // Reset camera to initial game position
    camera.position.set(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
    camera.rotation.set(-0.4, 0, 0); // Set proper camera angle
    camera.lookAt(0, 0, 0);

    // Set sky color
    scene.background = new THREE.Color(0x87CEEB); // Sky blue

    // Add clouds
    const clouds = [];
    for(let i = 0; i < 30; i++) {
        const cloud = createCloud();
        cloud.position.set(
            (Math.random() - 0.5) * 200,
            20 + Math.random() * 20,
            -100 + Math.random() * 1000
        );
        cloud.speed = 0.02 + Math.random() * 0.03;
        clouds.push(cloud);
        scene.add(cloud);
    }
    scene.userData.clouds = clouds;

    // Create water (reusing texture)
    water = createWater();
    scene.add(water);

    // Add sun
    const sun = createSun();
    scene.add(sun);

    // Create frog
    frog = createFrog();
    scene.add(frog);
    
    // Create initial lilypads
    createLilypad(0, 0, 0, true);
    for (let i = 1; i < 5; i++) {
        createLilypad(
            (Math.random() - 0.5) * 10,
            0,
            i * 5,
            false
        );
    }

    // Create initial forest section
    createForestSection(-50, 450);
    
    // Update score display
    updateScore();
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('highScore').textContent = `High Score: ${highScore}`;
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize the game
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue

    // Initialize background music
    gameMusic = new sound("/music/background-music.mp3");
    gameMusic.setVolume(0.3); // Set background music volume to 30%
    gameMusic.sound.loop = true; // Enable looping for background music
    
    // Set initial score
    score = 0;

    // Create water texture once
    waterTexture = createWaterTexture();

    // Add clouds
    const clouds = [];
    for(let i = 0; i < 30; i++) {
        const cloud = createCloud();
        cloud.position.set(
            (Math.random() - 0.5) * 200,
            20 + Math.random() * 20,
            -100 + Math.random() * 1000
        );
        cloud.speed = 0.02 + Math.random() * 0.03;
        clouds.push(cloud);
        scene.add(cloud);
    }
    scene.userData.clouds = clouds;

    // Create FPS display
    const fpsDisplay = document.createElement('div');
    fpsDisplay.id = 'fpsDisplay';
    fpsDisplay.style.position = 'fixed';
    fpsDisplay.style.top = '10px';
    fpsDisplay.style.right = '10px';
    fpsDisplay.style.color = 'white';
    fpsDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    fpsDisplay.style.padding = '5px 10px';
    fpsDisplay.style.borderRadius = '3px';
    fpsDisplay.style.fontFamily = 'monospace';
    fpsDisplay.style.fontSize = '14px';
    document.body.appendChild(fpsDisplay);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
    camera.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create water
    water = createWater();
    scene.add(water);

    // Add sun
    const sun = createSun();
    scene.add(sun);

    // Create frog
    frog = createFrog();
    scene.add(frog);

    // Create initial lilypads
    createLilypad(0, 0, 0, true);
    for (let i = 1; i < 5; i++) {
        createLilypad(
            (Math.random() - 0.5) * 10,
            0,
            i * 5,
            false
        );
    }

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', onWindowResize, false);

    // Create initial forest section
    createForestSection(-50, 450);

    // Update score display
    updateScore();

    // Start game loop
    animate();
}

// Game loop
function animate() {
    requestAnimationFrame(animate);

    // Calculate FPS
    frameCount++;
    const currentTime = performance.now();
    if (currentTime > lastTime + 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
        document.getElementById('fpsDisplay').textContent = `FPS: ${fps}`;
    }

    if (!isGameOver) {
        // Move lilypads left and right
        lilypads.forEach(lilypad => {
            if (!lilypad.isStationary) {
                lilypad.position.x += lilypad.speed * lilypad.moveDirection;
                if (Math.abs(lilypad.position.x) > LILYPAD_MOVE_RANGE) {
                    lilypad.moveDirection *= -1;
                }
                if (currentLilypad === lilypad) {
                    lilypad.speed = 0;
                    frog.position.x = lilypad.position.x + frogOffsetX;
                }
            }
        });

        // Handle jumping
        if (isJumping) {
            frog.position.y += jumpForce;
            jumpForce -= GRAVITY;

            if (frog.position.y <= 0.5) {
                frog.position.y = 0.5;
                isJumping = false;
                jumpForce = 0;

                const landedLilypad = getCurrentLilypad();
                if (!landedLilypad) {
                    gameOver();
                } else {
                    // If we're about to hit score 50, 101, or 150, make the lilypad stationary
                    if (score === 49 || score === 100 || score === 149) {
                        landedLilypad.isStationary = true;
                        landedLilypad.speed = 0;
                    }
                    
                    score++;
                    updateScore();
                    
                    if (score === 50 || score === 101 || score === 150) {
                        // Store current lilypads to avoid modification during iteration
                        const currentLilypads = [...lilypads];
                        const oldCurrentLilypad = currentLilypad;
                        
                        // Clear lilypads array since we'll be rebuilding it
                        lilypads = [];
                        
                        // For each existing lilypad, create a new biome-specific one at the same position
                        currentLilypads.forEach(oldLilypad => {
                            const newLilypad = createLilypad(
                                oldLilypad.position.x,
                                oldLilypad.position.y,
                                oldLilypad.position.z,
                                oldLilypad.isStationary
                            );
                            
                            // Copy over movement properties
                            newLilypad.moveDirection = oldLilypad.moveDirection;
                            newLilypad.speed = oldLilypad.speed;
                            newLilypad.originalSpeed = oldLilypad.originalSpeed;
                            
                            // If this was the lilypad the frog was on, update the reference
                            if (oldLilypad === oldCurrentLilypad) {
                                currentLilypad = newLilypad;
                                newLilypad.speed = 0;
                                frog.position.x = newLilypad.position.x + frogOffsetX;
                            }
                            
                            // Remove old lilypad
                            scene.remove(oldLilypad);
                        });
                        
                        // Find and remove only terrain objects (excluding clouds for snow biome)
                        const objectsToRemove = [];
                        scene.traverse((object) => {
                            if (object !== water && 
                                object !== frog && 
                                !lilypads.includes(object) && 
                                object !== scene && 
                                !object.isLight && 
                                (score === 101 || score === 150 || !scene.userData.clouds.includes(object)) && 
                                !lilypads.some(pad => pad.children.includes(object))) {
                                objectsToRemove.push(object);
                            }
                        });
                        
                        // Safely remove old terrain
                        objectsToRemove.forEach(obj => {
                            scene.remove(obj);
                            if (obj.geometry) obj.geometry.dispose();
                            if (obj.material) {
                                if (Array.isArray(obj.material)) {
                                    obj.material.forEach(mat => mat.dispose());
                                } else {
                                    obj.material.dispose();
                                }
                            }
                        });
                        
                        // Create new biome sections
                        const currentZ = frog.position.z;
                        createForestSection(currentZ - 100, currentZ + 400);
                    } else {
                        currentLilypad = landedLilypad;
                        if (!landedLilypad.isStationary) {
                            landedLilypad.speed = 0;
                        }
                        frogOffsetX = frog.position.x - currentLilypad.position.x;
                    }
                }
            }
        }

        // Update camera
        camera.position.x = frog.position.x;
        camera.position.z += (frog.position.z - CAMERA_DISTANCE - camera.position.z) * CAMERA_SMOOTH_SPEED;
        camera.lookAt(frog.position);

        // Update clouds
        scene.userData.clouds.forEach(cloud => {
            // Move clouds slowly
            cloud.position.x += cloud.speed;
            
            // Wrap clouds around when they go too far
            if(cloud.position.x > 100) {
                cloud.position.x = -100;
                cloud.position.z = camera.position.z + 100 + Math.random() * 300;
            }
            
            // Keep clouds ahead of camera
            if(cloud.position.z < camera.position.z - 100) {
                cloud.position.z = camera.position.z + 300 + Math.random() * 100;
            }
        });

        // Update sun position
        scene.children.forEach(child => {
            if (child.isSun) {
                child.position.z = camera.position.z + 300;
            }
        });

        // Remove off-screen lilypads and create new ones
        lilypads = lilypads.filter(lilypad => {
            if (lilypad.position.z < frog.position.z - 10) {
                scene.remove(lilypad);
                return false;
            }
            return true;
        });

        // Create new forest sections with appropriate biome
        while (lilypads.length < MAX_LILYPADS) {
            const lastLilypad = lilypads[lilypads.length - 1];
            createLilypad(
                (Math.random() - 0.5) * 10,
                0,
                lastLilypad.position.z + 5,
                false
            );
            
            // Create new forest section if needed
            if (lastLilypad.position.z % 500 < 5) {
                createForestSection(lastLilypad.position.z, lastLilypad.position.z + 500);
            }
        }
    }

    renderer.render(scene, camera);
}

// Modify createForestSection to handle different biomes
function createForestSection(startZ, endZ) {
    const waterWidth = 100;
    const isSnowBiome = score >= 50 && score <= 100;
    const isDesertBiome = score > 100 && score < 150;
    const isSpaceBiome = score >= 150;
    const groundY = -1.98;  // Ground level y-position
    
    // Create main ground on both sides
    const groundGeometry = new THREE.PlaneGeometry(waterWidth/2, endZ - startZ);
    const groundMaterial = new THREE.MeshPhongMaterial({
        color: isSpaceBiome ? 0x4B0082 : (isDesertBiome ? 0xd2b48c : (isSnowBiome ? 0xffffff : 0x2d5a27)),
        side: THREE.DoubleSide
    });
    
    const leftGround = new THREE.Mesh(groundGeometry, groundMaterial);
    const rightGround = new THREE.Mesh(groundGeometry.clone(), groundMaterial.clone());
    
    leftGround.rotation.x = -Math.PI / 2;
    rightGround.rotation.x = -Math.PI / 2;
    
    leftGround.position.set(-(waterWidth * 0.75), groundY, (endZ + startZ)/2);
    rightGround.position.set(waterWidth * 0.75, groundY, (endZ + startZ)/2);
    
    scene.add(leftGround);
    scene.add(rightGround);

    // Add hills for forest and snow biomes
    if (!isDesertBiome && !isSpaceBiome) {
        const hillSpacing = 120;
        const numHillRows = Math.ceil((endZ - startZ) / hillSpacing);
        
        const hillColors = isSnowBiome ? [
            0xffffff,  // Pure white
            0xf0f0f0,  // Slightly darker white
            0xe8e8e8   // Light grey white
        ] : [
            0x2d5a27,  // Dark forest green
            0x3d7a37,  // Medium forest green
            0x4a8f40   // Bright forest green
        ];
        
        for (let i = 0; i < numHillRows; i++) {
            const z = startZ + (i * hillSpacing);
            createHillRow(0, z, true, isSnowBiome, hillColors);   // Left side
            createHillRow(0, z, false, isSnowBiome, hillColors);  // Right side
        }
    }

    if (isSpaceBiome) {
        // Change sky color to dark space
        scene.background = new THREE.Color(0x000033);

        // Remove clouds in space biome
        scene.userData.clouds.forEach(cloud => {
            cloud.visible = false;
        });

        // Replace sun with moon
        scene.children.forEach(child => {
            if (child.isSun) {
                scene.remove(child);
                const moon = createMoon();
                scene.add(moon);
            }
        });

        // Add stars
        const numStars = 100;  // Number of stars to add
        const starField = new THREE.Group();
        
        for (let i = 0; i < numStars; i++) {
            const x = (Math.random() - 0.5) * 300;  // Wider spread for stars
            const y = 20 + Math.random() * 60;      // Height variation
            const z = startZ + Math.random() * (endZ - startZ);  // Along section length
            const scale = 0.5 + Math.random() * 1;  // Random star sizes
            
            const star = createStar(x, y, z, scale);
            // Random rotation for variety
            star.rotation.y = Math.random() * Math.PI * 2;
            starField.add(star);
        }
        
        scene.add(starField);

        // Add space objects
        const spaceObjectSpacing = 100;
        const numSpaceRows = Math.ceil((endZ - startZ) / spaceObjectSpacing);
        
        for (let i = 0; i < numSpaceRows; i++) {
            const z = startZ + (i * spaceObjectSpacing);
            const objectsPerSide = 2 + Math.floor(Math.random() * 2);
            
            // Left side objects
            for (let j = 0; j < objectsPerSide; j++) {
                const xOffset = (Math.random() - 0.5) * 40;
                const zOffset = (Math.random() - 0.5) * 40;
                const scale = 0.8 + Math.random() * 0.4;
                
                const objectType = Math.random();
                let spaceObject;
                
                if (objectType < 0.4) {
                    spaceObject = createAlien(
                        -(waterWidth * (1.2 + j * 0.3)) + xOffset,
                        z + zOffset,
                        scale
                    );
                } else if (objectType < 0.7) {
                    spaceObject = createSpaceship(
                        -(waterWidth * (1.2 + j * 0.3)) + xOffset,
                        z + zOffset,
                        scale
                    );
                } else {
                    spaceObject = createAlienHouse(
                        -(waterWidth * (1.2 + j * 0.3)) + xOffset,
                        z + zOffset,
                        scale
                    );
                }
                
                spaceObject.position.y = groundY;
                scene.add(spaceObject);
            }
            
            // Right side objects
            for (let j = 0; j < objectsPerSide; j++) {
                const xOffset = (Math.random() - 0.5) * 40;
                const zOffset = (Math.random() - 0.5) * 40;
                const scale = 0.8 + Math.random() * 0.4;
                
                const objectType = Math.random();
                let spaceObject;
                
                if (objectType < 0.4) {
                    spaceObject = createAlien(
                        (waterWidth * (1.2 + j * 0.3)) + xOffset,
                        z + zOffset,
                        scale
                    );
                } else if (objectType < 0.7) {
                    spaceObject = createSpaceship(
                        (waterWidth * (1.2 + j * 0.3)) + xOffset,
                        z + zOffset,
                        scale
                    );
                } else {
                    spaceObject = createAlienHouse(
                        (waterWidth * (1.2 + j * 0.3)) + xOffset,
                        z + zOffset,
                        scale
                    );
                }
                
                spaceObject.position.y = groundY;
                scene.add(spaceObject);
            }
        }
    } else if (isDesertBiome) {
        // Add pyramids
        const pyramidSpacing = 80;
        const numPyramidRows = Math.ceil((endZ - startZ) / pyramidSpacing);
        
        for (let i = 0; i < numPyramidRows; i++) {
            const z = startZ + (i * pyramidSpacing);
            const pyramidsPerSide = 2 + Math.floor(Math.random() * 2);
            
            // Left side pyramids
            for (let j = 0; j < pyramidsPerSide; j++) {
                const scale = 1.5 + Math.random() * 1.0;
                const xOffset = (Math.random() - 0.5) * 40;
                const zOffset = (Math.random() - 0.5) * 40;
                
                const pyramid = createSandDune(
                    -(waterWidth * (1.2 + j * 0.3)) + xOffset,
                    z + zOffset,
                    scale
                );
                pyramid.position.y = groundY;
                scene.add(pyramid);
            }
            
            // Right side pyramids
            for (let j = 0; j < pyramidsPerSide; j++) {
                const scale = 1.5 + Math.random() * 1.0;
                const xOffset = (Math.random() - 0.5) * 40;
                const zOffset = (Math.random() - 0.5) * 40;
                
                const pyramid = createSandDune(
                    (waterWidth * (1.2 + j * 0.3)) + xOffset,
                    z + zOffset,
                    scale
                );
                pyramid.position.y = groundY;
                scene.add(pyramid);
            }
            
            // Add camels
            if (Math.random() < 0.8) {
                const numCamels = 1 + Math.floor(Math.random() * 2);
                
                // Left side camels
                for (let k = 0; k < numCamels; k++) {
                    const camel = createCamel(
                        -(waterWidth * 0.75) + (Math.random() * 30 - 15),
                        z + (Math.random() - 0.5) * 30,
                        0.8 + Math.random() * 0.4
                    );
                    camel.position.y = groundY;
                    camel.rotation.y = Math.random() * Math.PI * 2;
                    scene.add(camel);
                }
                
                // Right side camels
                for (let k = 0; k < numCamels; k++) {
                    const camel = createCamel(
                        (waterWidth * 0.75) + (Math.random() * 30 - 15),
                        z + (Math.random() - 0.5) * 30,
                        0.8 + Math.random() * 0.4
                    );
                    camel.position.y = groundY;
                    camel.rotation.y = Math.random() * Math.PI * 2;
                    scene.add(camel);
                }
            }
        }
        
        // Add cacti
        const cactiPerSide = 40;
        const cactiSpacing = (endZ - startZ) / cactiPerSide;
        
        for (let i = 0; i < cactiPerSide; i++) {
            const z = startZ + (i * cactiSpacing) + (Math.random() * cactiSpacing * 0.5);
            const scale = 0.8 + Math.random() * 0.4;
            
            if (Math.random() < 0.7) {
                // Left side cactus
                const leftX = -(waterWidth * 0.75) + (Math.random() * 30 - 15);
                const cactus = createCactus(leftX, z, scale);
                cactus.position.y = groundY;
                scene.add(cactus);
                
                if (Math.random() < 0.4) {
                    const nearbyX = leftX + (Math.random() * 10 - 5);
                    const nearbyCactus = createCactus(nearbyX, z + (Math.random() * 10 - 5), scale * 0.8);
                    nearbyCactus.position.y = groundY;
                    scene.add(nearbyCactus);
                }
            }
            
            if (Math.random() < 0.7) {
                // Right side cactus
                const rightX = (waterWidth * 0.75) + (Math.random() * 30 - 15);
                const cactus = createCactus(rightX, z, scale);
                cactus.position.y = groundY;
                scene.add(cactus);
                
                if (Math.random() < 0.4) {
                    const nearbyX = rightX + (Math.random() * 10 - 5);
                    const nearbyCactus = createCactus(nearbyX, z + (Math.random() * 10 - 5), scale * 0.8);
                    nearbyCactus.position.y = groundY;
                    scene.add(nearbyCactus);
                }
            }
        }
    } else {
        // Add trees for forest and snow biomes
        const sectionLength = endZ - startZ;
        const treesPerSide = isSnowBiome ? 50 : 75;
        const spacing = sectionLength / treesPerSide;
        const groundWidth = waterWidth/2;

        for (let i = 0; i < treesPerSide; i++) {
            const z = startZ + (i * spacing) + (Math.random() * spacing * 0.5);
            const scale = 0.8 + Math.random() * 0.8;

            if (isSnowBiome) {
                if (Math.random() < 0.7) {
                    const leftX = -(waterWidth * 0.75) + (Math.random() * (groundWidth * 0.9) - groundWidth * 0.45);
                    const leftTree = createSnowyTree(leftX, z, scale);
                    leftTree.position.y = groundY;
                    scene.add(leftTree);
                }
                
                if (Math.random() < 0.05) {
                    const leftX = -(waterWidth * 0.75) + (Math.random() * (groundWidth * 0.9) - groundWidth * 0.45);
                    const leftIgloo = createIgloo(leftX, z, 1.2);
                    leftIgloo.position.y = groundY;
                    leftIgloo.rotation.y = Math.random() * Math.PI * 2;
                    scene.add(leftIgloo);
                }

                if (Math.random() < 0.7) {
                    const rightX = (waterWidth * 0.75) + (Math.random() * (groundWidth * 0.9) - groundWidth * 0.45);
                    const rightTree = createSnowyTree(rightX, z, scale);
                    rightTree.position.y = groundY;
                    scene.add(rightTree);
                }
                
                if (Math.random() < 0.05) {
                    const rightX = (waterWidth * 0.75) + (Math.random() * (groundWidth * 0.9) - groundWidth * 0.45);
                    const rightIgloo = createIgloo(rightX, z, 1.2);
                    rightIgloo.position.y = groundY;
                    rightIgloo.rotation.y = Math.random() * Math.PI * 2;
                    scene.add(rightIgloo);
                }
            } else {
                const treesAtPosition = 2 + Math.floor(Math.random() * 2);
                
                for (let j = 0; j < treesAtPosition; j++) {
                    const leftX = -(waterWidth * 0.75) + (Math.random() * (groundWidth * 0.9) - groundWidth * 0.45);
                    const leftTree = createVariedTree(leftX, z + (Math.random() * spacing * 0.3), scale);
                    leftTree.position.y = groundY;
                    scene.add(leftTree);
                }

                for (let j = 0; j < treesAtPosition; j++) {
                    const rightX = (waterWidth * 0.75) + (Math.random() * (groundWidth * 0.9) - groundWidth * 0.45);
                    const rightTree = createVariedTree(rightX, z + (Math.random() * spacing * 0.3), scale);
                    rightTree.position.y = groundY;
                    scene.add(rightTree);
                }
            }
        }
    }
}

// Modify the createIgloo function to make the entrance more visible
function createIgloo(x, z, scale = 1) {
    const iglooGroup = new THREE.Group();
    
    // Colors
    const snowColor = 0xffffff;  // Pure white for main blocks
    const shadowColor = 0xe0e0e0;  // Slightly darker for alternating blocks
    const entranceColor = 0xd0d0d0;  // Darker for entrance
    
    // Materials
    const snowMaterial = new THREE.MeshPhongMaterial({
        color: snowColor,
        flatShading: true
    });
    const shadowMaterial = new THREE.MeshPhongMaterial({
        color: shadowColor,
        flatShading: true
    });
    const entranceMaterial = new THREE.MeshPhongMaterial({
        color: entranceColor,
        flatShading: true
    });

    // Create dome with distinct blocks
    const baseRadius = 3 * scale;
    const domeHeight = 3.5 * scale;
    const layers = 8;  // More layers for smoother dome
    
    // Create layers of blocks for the dome
    for(let layer = 0; layer < layers; layer++) {
        // Calculate radius for this layer (gets smaller as we go up)
        const layerRadius = baseRadius * Math.cos(layer / layers * Math.PI/2);
        const y = layer * (domeHeight/layers);
        
        // Calculate number of blocks in this layer (fewer as we go up)
        const blocksInLayer = Math.max(4, Math.floor(8 * Math.cos(layer / layers * Math.PI/2)));
        
        for(let i = 0; i < blocksInLayer; i++) {
            const angle = (i / blocksInLayer) * Math.PI * 2;
            
            // Make blocks wider and flatter
            const blockWidth = (2 * Math.PI * layerRadius) / blocksInLayer * 0.95;  // Slight gap between blocks
            const blockHeight = domeHeight/layers * 0.95;  // Slight gap between layers
            const blockDepth = scale * 1.2;  // Deeper blocks
            
            const blockGeometry = new THREE.BoxGeometry(
                blockWidth,
                blockHeight,
                blockDepth
            );
            
            // Alternate materials for checkerboard effect
            const material = (layer + i) % 2 === 0 ? snowMaterial : shadowMaterial;
            const block = new THREE.Mesh(blockGeometry, material);
            
            block.position.set(
                Math.cos(angle) * layerRadius,
                y,
                Math.sin(angle) * layerRadius
            );
            block.rotation.y = angle;
            iglooGroup.add(block);
        }
    }

    // Create entrance tunnel (rectangular)
    const entranceWidth = 1.8 * scale;
    const entranceHeight = 2.2 * scale;
    const entranceDepth = 2.5 * scale;
    
    // Main entrance tunnel
    const entrance = new THREE.Mesh(
        new THREE.BoxGeometry(entranceWidth, entranceHeight, entranceDepth),
        entranceMaterial
    );
    entrance.position.set(0, entranceHeight/2, baseRadius);
    iglooGroup.add(entrance);

    // Add blocks around entrance
    const entranceFrameBlocks = 6;  // Number of blocks around entrance
    for(let i = 0; i < entranceFrameBlocks; i++) {
        const blockGeometry = new THREE.BoxGeometry(
            entranceWidth/entranceFrameBlocks,
            entranceHeight * 0.2,
            entranceDepth * 0.3
        );
        const block = new THREE.Mesh(blockGeometry, snowMaterial);
        
        // Position blocks in an arch shape
        const angle = (i / (entranceFrameBlocks-1)) * Math.PI;
        const radius = entranceWidth/2 + 0.2 * scale;
        block.position.set(
            Math.cos(angle) * radius,
            entranceHeight + Math.sin(angle) * radius,
            baseRadius
        );
        block.rotation.z = angle;
        iglooGroup.add(block);
    }

    iglooGroup.position.set(x, 0, z);
    iglooGroup.scale.set(1.2, 1.2, 1.2);  // Make overall igloo slightly larger
    return iglooGroup;
}

// Create a cactus
function createCactus(x, z, scale = 1) {
    const cactusGroup = new THREE.Group();
    
    // Materials
    const cactusMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2d5a27,  // Dark green for cactus
        flatShading: true 
    });
    
    // Main body
    const bodyHeight = 6 * scale;
    const bodyWidth = 1.2 * scale;
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyWidth),
        cactusMaterial
    );
    body.position.y = bodyHeight/2;
    cactusGroup.add(body);
    
    // Add arms
    const armHeight = 2 * scale;
    const armPositions = [
        { y: bodyHeight * 0.6, dir: 1 },  // Right arm
        { y: bodyHeight * 0.4, dir: -1 }  // Left arm
    ];
    
    armPositions.forEach(({y, dir}) => {
        const arm = new THREE.Mesh(
            new THREE.BoxGeometry(bodyWidth * 2, armHeight, bodyWidth),
            cactusMaterial
        );
        arm.position.set(dir * bodyWidth, y, 0);
        cactusGroup.add(arm);
        
        // Add vertical part of arm
        const armTop = new THREE.Mesh(
            new THREE.BoxGeometry(bodyWidth, bodyHeight * 0.3, bodyWidth),
            cactusMaterial
        );
        armTop.position.set(dir * bodyWidth * 1.5, y + armHeight/2, 0);
        cactusGroup.add(armTop);
    });
    
    cactusGroup.position.set(x, 0, z);
    return cactusGroup;
}

// Create a sand dune
function createSandDune(x, z, scale = 1) {
    const duneGroup = new THREE.Group();
    
    const sandColors = [
        0xd2b48c,  // Tan
        0xdeb887,  // BurlyWood
        0xf4a460   // Sandy Brown
    ];
    
    // Increased size and layers for more pyramid-like appearance
    const layers = 15;  // More layers
    const baseWidth = 40 * scale;  // Much wider base
    const layerHeight = 2.5 * scale;  // Taller layers
    
    for(let i = 0; i < layers; i++) {
        const y = i * layerHeight;
        // More gradual reduction for pyramid shape
        const width = baseWidth * (1 - (i / layers) * 0.9);
        
        const geometry = new THREE.BoxGeometry(
            width,
            layerHeight,
            width
        );
        
        const material = new THREE.MeshPhongMaterial({
            color: sandColors[Math.floor(Math.random() * sandColors.length)],
            flatShading: true
        });
        
        const layer = new THREE.Mesh(geometry, material);
        layer.position.set(
            (Math.random() - 0.5) * 1,  // Slight random offset
            y,
            (Math.random() - 0.5) * 1
        );
        
        duneGroup.add(layer);
    }
    
    duneGroup.position.set(x, 0, z);
    return duneGroup;
}

// Create desert ground
function createDesertGround(x, z, width, length) {
    const groundGeometry = new THREE.PlaneGeometry(width, length, 10, 10);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xd2b48c,  // Tan color for sand
        side: THREE.DoubleSide,
        flatShading: true
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(x, -1.99, z);
    return ground;
}

// Create desert sun (larger version of regular sun)
function createDesertSun() {
    const sunGroup = new THREE.Group();
    sunGroup.isSun = true;
    
    const sunColor = 0xFFA500;  // More orange for desert sun
    const sunGlowColor = 0xFF8C00;  // Darker orange for outer blocks
    
    const coreMaterial = new THREE.MeshPhongMaterial({
        color: sunColor,
        flatShading: true,
        emissive: sunColor,
        emissiveIntensity: 0.7  // Increased intensity
    });
    
    const glowMaterial = new THREE.MeshPhongMaterial({
        color: sunGlowColor,
        flatShading: true,
        emissive: sunGlowColor,
        emissiveIntensity: 0.5
    });

    // Larger center cube
    const coreSize = 12;  // Increased from 8
    const core = new THREE.Mesh(
        new THREE.BoxGeometry(coreSize, coreSize, coreSize),
        coreMaterial
    );
    sunGroup.add(core);

    // Larger glow blocks
    const glowSize = 4;  // Increased from 3
    const positions = [
        { x: coreSize/2 + glowSize/2, y: 0, z: 0 },
        { x: -(coreSize/2 + glowSize/2), y: 0, z: 0 },
        { x: 0, y: coreSize/2 + glowSize/2, z: 0 },
        { x: 0, y: -(coreSize/2 + glowSize/2), z: 0 }
    ];

    positions.forEach(pos => {
        const glowBlock = new THREE.Mesh(
            new THREE.BoxGeometry(glowSize, glowSize, glowSize),
            glowMaterial
        );
        glowBlock.position.set(pos.x, pos.y, pos.z);
        sunGroup.add(glowBlock);
    });

    const diagonalPositions = [
        { x: 1, y: 1 }, { x: 1, y: -1 },
        { x: -1, y: 1 }, { x: -1, y: -1 }
    ];

    diagonalPositions.forEach(pos => {
        const glowBlock = new THREE.Mesh(
            new THREE.BoxGeometry(glowSize, glowSize, glowSize),
            glowMaterial
        );
        const offset = (coreSize/2 + glowSize/2) * 0.7;
        glowBlock.position.set(pos.x * offset, pos.y * offset, 0);
        sunGroup.add(glowBlock);
    });

    sunGroup.position.set(0, 40, 200);  // Higher in the sky
    return sunGroup;
}

// Create a camel
function createCamel(x, z, scale = 1) {
    const camelGroup = new THREE.Group();
    
    // Materials
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xC19A6B,  // Sandy brown for camel body
        flatShading: true 
    });
    const darkMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x8B7355,  // Darker brown for details
        flatShading: true 
    });

    // Body dimensions
    const bodyWidth = 2 * scale;
    const bodyHeight = 2 * scale;
    const bodyLength = 4 * scale;

    // Main body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength),
        bodyMaterial
    );
    body.position.y = bodyHeight * 2;
    camelGroup.add(body);

    // Neck
    const neck = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth * 0.6, bodyHeight * 1.5, bodyWidth * 0.6),
        bodyMaterial
    );
    neck.position.set(0, bodyHeight * 2.8, bodyLength/2 - bodyWidth * 0.3);
    neck.rotation.x = -Math.PI * 0.15;
    camelGroup.add(neck);

    // Head
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth * 0.7, bodyWidth * 0.8, bodyWidth * 1.2),
        bodyMaterial
    );
    head.position.set(0, bodyHeight * 3.5, bodyLength/2 + bodyWidth * 0.3);
    camelGroup.add(head);

    // Humps (two humps)
    const humpPositions = [-0.7, 0.7];
    humpPositions.forEach(pos => {
        const hump = new THREE.Mesh(
            new THREE.BoxGeometry(bodyWidth * 0.8, bodyHeight * 0.8, bodyWidth * 0.8),
            darkMaterial
        );
        hump.position.set(0, bodyHeight * 2.6, bodyLength * pos/2);
        camelGroup.add(hump);
    });

    // Legs
    const legPositions = [
        {x: -0.35, z: 0.35}, {x: 0.35, z: 0.35},
        {x: -0.35, z: -0.35}, {x: 0.35, z: -0.35}
    ];
    
    legPositions.forEach(pos => {
        const leg = new THREE.Mesh(
            new THREE.BoxGeometry(bodyWidth * 0.3, bodyHeight * 2, bodyWidth * 0.3),
            darkMaterial
        );
        leg.position.set(
            pos.x * bodyWidth,
            bodyHeight,
            pos.z * bodyLength
        );
        camelGroup.add(leg);
    });

    camelGroup.position.set(x, 0, z);
    return camelGroup;
}

// Create frog
function createFrog() {
    const frogGroup = new THREE.Group();
    
    // Materials
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x4CAF50,  // Bright green
        flatShading: true 
    });
    const darkGreenMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2E7D32,  // Darker green for belly
        flatShading: true 
    });
    const blackMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x000000,  // Black for eyes and feet
        flatShading: true 
    });

    const blockUnit = 0.25; // Base unit for blocks

    // Create main body (square proportions)
    const bodyWidth = blockUnit * 4;  // 4 units wide
    const bodyHeight = blockUnit * 4; // 4 units tall
    const bodyDepth = blockUnit * 4;  // 4 units deep

    // Top green part
    const topBody = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth, bodyHeight * 0.75, bodyDepth),
        bodyMaterial
    );
    topBody.position.y = bodyHeight * 0.5;
    frogGroup.add(topBody);

    // Bottom dark green part
    const bottomBody = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth, bodyHeight * 0.25, bodyDepth),
        darkGreenMaterial
    );
    bottomBody.position.y = bodyHeight * 0.125;
    frogGroup.add(bottomBody);

    // Add eyes (black 1x1 blocks)
    const eyeSize = blockUnit;
    const createEye = (isLeft) => {
        const eye = new THREE.Mesh(
            new THREE.BoxGeometry(eyeSize, eyeSize, eyeSize),
            blackMaterial
        );
        eye.position.set(
            isLeft ? -bodyWidth/4 : bodyWidth/4,
            bodyHeight,
            0
        );
        return eye;
    };
    
    frogGroup.add(createEye(true));   // Left eye
    frogGroup.add(createEye(false));  // Right eye

    // Create legs (2 legs, one on each side)
    const legWidth = blockUnit * 1.2;
    const legHeight = blockUnit * 2;  // Taller legs
    const legDepth = blockUnit * 1.2;
    const footSize = blockUnit * 1.4;  // Slightly larger feet
    const footHeight = blockUnit * 0.3;  // Much shorter black feet

    const createLeg = (isLeft) => {
        const legGroup = new THREE.Group();
        
        // Main leg part (green)
        const leg = new THREE.Mesh(
            new THREE.BoxGeometry(legWidth, legHeight, legDepth),
            bodyMaterial
        );
        leg.position.y = legHeight/2;
        legGroup.add(leg);
        
        // Foot part (black) - now much shorter
        const foot = new THREE.Mesh(
            new THREE.BoxGeometry(footSize, footHeight, footSize),
            blackMaterial
        );
        foot.position.y = 0;
        legGroup.add(foot);
        
        // Position the entire leg group
        legGroup.position.set(
            isLeft ? -bodyWidth/2 : bodyWidth/2,
            0,
            0
        );
        
        return legGroup;
    };

    // Add both legs
    frogGroup.add(createLeg(true));    // Left leg
    frogGroup.add(createLeg(false));   // Right leg

    // Position the entire frog
    frogGroup.position.y = 0.5;  // Lift frog to stand on ground
    
    return frogGroup;
}

// Create a blocky sun
function createSun() {
    const sunGroup = new THREE.Group();
    sunGroup.isSun = true;  // Add this property to identify the sun
    
    // Sun colors
    const sunColor = 0xFFD700;  // Golden yellow
    const sunGlowColor = 0xFFA500;  // Orange for outer blocks
    
    // Materials
    const coreMaterial = new THREE.MeshPhongMaterial({
        color: sunColor,
        flatShading: true,
        emissive: sunColor,
        emissiveIntensity: 0.5
    });
    
    const glowMaterial = new THREE.MeshPhongMaterial({
        color: sunGlowColor,
        flatShading: true,
        emissive: sunGlowColor,
        emissiveIntensity: 0.3
    });

    // Create center cube
    const coreSize = 8;
    const core = new THREE.Mesh(
        new THREE.BoxGeometry(coreSize, coreSize, coreSize),
        coreMaterial
    );
    sunGroup.add(core);

    // Add glow blocks around the core
    const glowSize = 3;
    const positions = [
        { x: coreSize/2 + glowSize/2, y: 0, z: 0 },
        { x: -(coreSize/2 + glowSize/2), y: 0, z: 0 },
        { x: 0, y: coreSize/2 + glowSize/2, z: 0 },
        { x: 0, y: -(coreSize/2 + glowSize/2), z: 0 }
    ];

    positions.forEach(pos => {
        const glowBlock = new THREE.Mesh(
            new THREE.BoxGeometry(glowSize, glowSize, glowSize),
            glowMaterial
        );
        glowBlock.position.set(pos.x, pos.y, pos.z);
        sunGroup.add(glowBlock);
    });

    // Add diagonal blocks
    const diagonalPositions = [
        { x: 1, y: 1 }, { x: 1, y: -1 },
        { x: -1, y: 1 }, { x: -1, y: -1 }
    ];

    diagonalPositions.forEach(pos => {
        const glowBlock = new THREE.Mesh(
            new THREE.BoxGeometry(glowSize, glowSize, glowSize),
            glowMaterial
        );
        const offset = (coreSize/2 + glowSize/2) * 0.7;
        glowBlock.position.set(pos.x * offset, pos.y * offset, 0);
        sunGroup.add(glowBlock);
    });

    // Position the sun high in the sky
    sunGroup.position.set(0, 30, 200);
    return sunGroup;
}

// Create a blocky cloud
function createCloud() {
    const cloudGroup = new THREE.Group();
    
    // Cloud colors
    const cloudColors = [
        0xFFFFFF,  // Pure white
        0xFAFAFA,  // Snow white
        0xF0F0F0   // Light grey
    ];
    
    // Create random cloud shape with larger dimensions
    const blockSize = 4;  // Doubled from 2 to 4
    const layers = 3 + Math.floor(Math.random() * 2);  // 3-4 layers instead of 2-3
    const baseWidth = 5 + Math.floor(Math.random() * 4);  // 5-8 blocks wide instead of 3-5
    
    for(let layer = 0; layer < layers; layer++) {
        const layerWidth = baseWidth - Math.floor(Math.random() * 2);
        const layerDepth = 3 + Math.floor(Math.random() * 3);  // 3-5 blocks deep instead of 2-3
        
        for(let x = 0; x < layerWidth; x++) {
            for(let z = 0; z < layerDepth; z++) {
                const color = cloudColors[Math.floor(Math.random() * cloudColors.length)];
                const material = new THREE.MeshPhongMaterial({
                    color: color,
                    flatShading: true,
                    transparent: true,
                    opacity: 0.9
                });
                
                const block = new THREE.Mesh(
                    new THREE.BoxGeometry(blockSize, blockSize, blockSize),
                    material
                );
                
                // Add more randomness to position for fluffier appearance
                block.position.set(
                    (x - layerWidth/2) * blockSize + (Math.random() - 0.5) * 2,
                    layer * blockSize + (Math.random() - 0.5) * 2,
                    (z - layerDepth/2) * blockSize + (Math.random() - 0.5) * 2
                );
                
                cloudGroup.add(block);
            }
        }
    }
    
    // Random rotation for variety
    cloudGroup.rotation.y = Math.random() * Math.PI * 2;
    
    return cloudGroup;
}

// Create water texture once and reuse
function createWaterTexture() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 512;

    // Create gradient pattern
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1e6ea3');
    gradient.addColorStop(0.3, '#2980b9');
    gradient.addColorStop(0.7, '#1e6ea3');
    gradient.addColorStop(1, '#2980b9');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add ripple effect
    for (let i = 0; i < 1000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 2 + 1;
        const alpha = Math.random() * 0.1;
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
    }

    // Create and configure texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 20);
    
    return texture;
}

// Create water mesh
function createWater() {
    const waterGeometry = new THREE.PlaneGeometry(100, 1000);
    const waterMaterial = new THREE.MeshPhongMaterial({
        color: 0x1e6ea3,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        map: waterTexture
    });
    
    const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(0, -2, 200);
    return waterMesh;
}

// Create an alien
function createAlien(x, z, scale = 1) {
    const alienGroup = new THREE.Group();
    
    // Materials
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00FF00,  // Bright green for alien
        flatShading: true,
        emissive: 0x00FF00,
        emissiveIntensity: 0.2
    });
    const eyeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x000000,  // Black eyes
        flatShading: true 
    });

    // Body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(scale * 1.5, scale * 2.5, scale),
        bodyMaterial
    );
    alienGroup.add(body);

    // Large head
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(scale * 2, scale * 1.5, scale * 1.5),
        bodyMaterial
    );
    head.position.y = scale * 2;
    alienGroup.add(head);

    // Large eyes
    const eyeSize = scale * 0.5;
    [-0.5, 0.5].forEach(x => {
        const eye = new THREE.Mesh(
            new THREE.BoxGeometry(eyeSize, eyeSize * 1.5, eyeSize * 0.1),
            eyeMaterial
        );
        eye.position.set(x * scale, scale * 2, scale * 0.75);
        alienGroup.add(eye);
    });

    // Thin arms
    [-0.8, 0.8].forEach(x => {
        const arm = new THREE.Mesh(
            new THREE.BoxGeometry(scale * 0.4, scale * 1.5, scale * 0.4),
            bodyMaterial
        );
        arm.position.set(x * scale, scale * 0.5, 0);
        alienGroup.add(arm);
    });

    alienGroup.position.set(x, 0, z);
    return alienGroup;
}

// Create a spaceship
function createSpaceship(x, z, scale = 1) {
    const shipGroup = new THREE.Group();
    
    // Materials
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x808080,  // Metallic gray
        flatShading: true,
        emissive: 0x404040,
        emissiveIntensity: 0.2
    });
    const glowMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00FFFF,  // Cyan glow
        flatShading: true,
        emissive: 0x00FFFF,
        emissiveIntensity: 0.5
    });

    // Main saucer body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(scale * 6, scale, scale * 6),
        bodyMaterial
    );
    shipGroup.add(body);

    // Top dome
    const dome = new THREE.Mesh(
        new THREE.BoxGeometry(scale * 3, scale * 2, scale * 3),
        bodyMaterial
    );
    dome.position.y = scale * 1.5;
    shipGroup.add(dome);

    // Glow lights around the edge
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const light = new THREE.Mesh(
            new THREE.BoxGeometry(scale * 0.5, scale * 0.5, scale * 0.5),
            glowMaterial
        );
        light.position.set(
            Math.cos(angle) * scale * 3,
            0,
            Math.sin(angle) * scale * 3
        );
        shipGroup.add(light);
    }

    shipGroup.position.set(x, scale * 10, z);  // Hover higher in the air
    return shipGroup;
}

// Create an alien house (like a dome structure)
function createAlienHouse(x, z, scale = 1) {
    const houseGroup = new THREE.Group();
    
    // Materials
    const domeMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x4B0082,  // Deep purple
        flatShading: true,
        emissive: 0x4B0082,
        emissiveIntensity: 0.2
    });
    const windowMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00FFFF,  // Cyan windows
        flatShading: true,
        emissive: 0x00FFFF,
        emissiveIntensity: 0.5
    });

    // Base
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(scale * 6, scale * 0.5, scale * 6),
        domeMaterial
    );
    houseGroup.add(base);

    // Dome structure (made of stacked boxes)
    const layers = 6;
    for (let i = 0; i < layers; i++) {
        const size = scale * (6 - i);
        const layer = new THREE.Mesh(
            new THREE.BoxGeometry(size, scale, size),
            domeMaterial
        );
        layer.position.y = scale * (i * 0.8 + 0.5);
        houseGroup.add(layer);
    }

    // Windows
    const windowPositions = [
        {x: 1, z: 0}, {x: -1, z: 0},
        {x: 0, z: 1}, {x: 0, z: -1}
    ];

    windowPositions.forEach(pos => {
        const window = new THREE.Mesh(
            new THREE.BoxGeometry(scale, scale, scale * 0.1),
            windowMaterial
        );
        window.position.set(
            pos.x * scale * 2,
            scale * 2,
            pos.z * scale * 2
        );
        if (pos.x === 0) window.rotation.y = Math.PI / 2;
        houseGroup.add(window);
    });

    houseGroup.position.set(x, 0, z);
    return houseGroup;
}

// Create a moon (replaces sun in space biome)
function createMoon() {
    const moonGroup = new THREE.Group();
    moonGroup.isSun = true;  // Keep this for compatibility
    
    const moonMaterial = new THREE.MeshPhongMaterial({
        color: 0xE6E6E6,  // Light gray
        flatShading: true,
        emissive: 0xE6E6E6,
        emissiveIntensity: 0.3
    });

    // Main moon body (larger central cube)
    const moonCore = new THREE.Mesh(
        new THREE.BoxGeometry(10, 10, 10),
        moonMaterial
    );
    moonGroup.add(moonCore);

    // Add craters (smaller darker boxes)
    const craterMaterial = new THREE.MeshPhongMaterial({
        color: 0xA9A9A9,  // Darker gray
        flatShading: true
    });

    // Add several craters at random positions
    for (let i = 0; i < 6; i++) {
        const craterSize = 1 + Math.random();
        const crater = new THREE.Mesh(
            new THREE.BoxGeometry(craterSize, craterSize, craterSize),
            craterMaterial
        );
        
        // Position craters on the visible face of the moon
        crater.position.set(
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6,
            4
        );
        moonGroup.add(crater);
    }

    moonGroup.position.set(0, 40, 200);
    return moonGroup;
}

// Function to create a row of hills (updated to handle both snow and forest biomes)
function createHillRow(baseX, z, isLeftSide, isSnowBiome, hillColors) {
    const hillCount = 2;
    const baseScale = 2.5;
    
    for (let i = 0; i < hillCount; i++) {
        const scale = baseScale * (0.9 + Math.random() * 0.3);
        const xOffset = (Math.random() - 0.5) * 30;
        const zOffset = (Math.random() - 0.5) * 40;
        
        const x = isLeftSide ? 
            -(100 * 1.5) + xOffset :
            (100 * 1.5) + xOffset;
        
        const hill = createHill(
            x,
            z + zOffset,
            scale,
            12 + Math.floor(Math.random() * 4),
            35,
            isSnowBiome,
            hillColors
        );
        hill.position.y = -1.98;
        scene.add(hill);
    }
}

// Create a star for space biome
function createStar(x, y, z, scale = 1) {
    const starGroup = new THREE.Group();
    
    // Star material with glow effect
    const starMaterial = new THREE.MeshPhongMaterial({
        color: 0xFFFFFF,
        flatShading: true,
        emissive: 0xFFFFFF,
        emissiveIntensity: 0.8
    });

    // Create main star cube
    const core = new THREE.Mesh(
        new THREE.BoxGeometry(scale, scale, scale),
        starMaterial
    );
    starGroup.add(core);

    // Add smaller cubes around the core for sparkle effect
    const sparklePositions = [
        { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 }
    ];

    sparklePositions.forEach(pos => {
        const sparkle = new THREE.Mesh(
            new THREE.BoxGeometry(scale * 0.3, scale * 0.3, scale * 0.3),
            starMaterial
        );
        sparkle.position.set(
            pos.x * scale * 0.5,
            pos.y * scale * 0.5,
            pos.z * scale * 0.5
        );
        starGroup.add(sparkle);
    });

    starGroup.position.set(x, y, z);
    return starGroup;
}

// Start the game
init(); 