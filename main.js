// Game configuration
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game',
        width: '100%',
        height: '100%'
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Game variables
let game = new Phaser.Game(config);
let player;
let platforms;
let cursors;
let background;
let jumpVelocity = -200;  // Initial lower jump height
let hasRocketPack = false;
let rocketPack;
let instructionText;  // Make instruction text globally accessible
let snake; // Snake enemy (UFO)
let snakeDirection = 1; // Initial direction
let snakeSpeed = 70; // Reduced from 100 to 70 for slower movement
let gameOver = false; // Track game state
let attackMode = true; // Track if UFO is attacking or patrolling
let patrolPoint = null; // Target point for patrolling

function preload() {
    // Load bio text
    this.load.text('bioText', 'bio.txt');

    // Load robot character sprites with cropped height
    this.load.spritesheet('player-idle', 
        'robot/Destroyer/Idle.png',
        { 
            frameWidth: 127,     // Keep full width
            frameHeight: 78,     // Half the height to crop top portion
            margin: 0,           // Start from top of image
            spacing: 0
        }
    );
    
    this.load.spritesheet('player-walk', 
        'robot/Destroyer/Walk.png',
        { 
            frameWidth: 127,     // Keep full width
            frameHeight: 78,     // Half the height to crop top portion
            margin: 0,           // Start from top of image
            spacing: 0
        }
    );

    // Load platform assets
    this.load.image('ground', 'platform.png');
    this.load.image('background', 'https://labs.phaser.io/assets/skies/space3.png');
    
    // Make sure rocketpack loads first and remove the star sprite completely
    this.load.image('rocketpack', 'rocketpack2.webp');
    
    // Load SAR satellite image
    this.load.image('sar', 'insar/sar_sat.webp');
    // Load flooding image
    this.load.image('flooding', 'flooding/flooding.webp');
    // Load groundwater image
    this.load.image('groundwater', 'groundwater/groundwater.webp');
    // Load tectonics image
    this.load.image('tectonics', 'tectonics/tectonics.webp');
    
    // Load snake sprite
    this.load.image('snake', 'ufo.png');
}

function create() {
    // Add device detection
    const forceMobile = false;
    const isMobile = forceMobile || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Add background
    background = this.add.image(this.scale.width / 2, this.scale.height / 2, 'background');
    background.setOrigin(0.5);
    
    // Scale background to cover the screen
    const scaleX = this.scale.width / background.width;
    const scaleY = this.scale.height / background.height;
    const scale = Math.max(scaleX, scaleY) * 1.1;  // Scale up slightly to ensure full coverage
    background.setScale(scale);
    
    // Fix background to camera
    background.setScrollFactor(0);

    // Darken the background slightly for better contrast
    background.setTint(0x888888);

    // Add description panel on the left
    const panelWidth = this.scale.width * 0.22; // 20% of screen width
    const panelPadding = 20;
    
    // Get the description text from loaded bio.txt file
    const descriptionText = this.cache.text.get('bioText');
    
    const description = this.add.text(panelPadding * 2, panelPadding * 2, descriptionText, {
        fontSize: '16px',
        fill: '#fff',
        stroke: '#000',
        strokeThickness: 2,
        wordWrap: { width: panelWidth - (panelPadding * 3) },
        lineSpacing: 10
    });
    description.setScrollFactor(0);

    // Add Google Scholar link below description
    const scholarLink = this.add.text(panelPadding * 2, description.y + description.height + 20,
        'Publications on Google Scholar',
        {
            fontSize: '16px',
            fill: '#00ffff',
            stroke: '#000',
            strokeThickness: 2,
            wordWrap: { width: panelWidth - (panelPadding * 3) }
        }
    );
    scholarLink.setScrollFactor(0);
    scholarLink.setInteractive({ useHandCursor: true });
    scholarLink.on('pointerdown', () => {
        window.open('https://scholar.google.com/citations?user=A-FaALkAAAAJ&hl=en', '_blank');
    });
    
    // Add hover effect for the link
    scholarLink.on('pointerover', () => {
        scholarLink.setStyle({ fill: '#ffffff' });
    });
    scholarLink.on('pointerout', () => {
        scholarLink.setStyle({ fill: '#00ffff' });
    });

    // First, add instruction text (MOVED UP)
    instructionText = this.add.text(panelWidth + panelPadding, this.scale.height - 50,
        'Use arrow keys to move and UP to jump. Find the rocket pack to jump higher!',
        {
            fontSize: '18px',
            fill: '#fff',
        }
    );
    instructionText.setScrollFactor(0);

    // Create platforms group
    platforms = this.physics.add.staticGroup();

    // Create main ground platform
    const groundY = this.scale.height - 32;
    
    // Create segmented ground platforms with gaps
    const segments = [
        { x: 150, width: 0.3 },    // Left segment - starting platform
        { x: -100, width: 0.3, y: groundY - 50 },    // Middle segment - raised up
        { x: 925, width: 0.3, y: groundY + 150 }     // Right segment - lowered
    ];
    
    segments.forEach((segment, index) => {
        const platform = platforms.create(segment.x, segment.y || groundY, 'ground');
        platform.setScale(segment.width, 0.1);
        platform.refreshBody();
        
        // Store original positions
        platform.startY = segment.y || groundY;
        platform.startX = segment.x;
        
        if (index === 2) {  // Third segment (index 2)
            platform.isMoving = true;
            platform.startX = platform.x;  // Store initial position
            
            // Add horizontal movement
            this.tweens.add({
                targets: platform,
                x: platform.x - 300,
                duration: 6000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                onUpdate: function() {
                    platform.refreshBody();
                }
            });
        }
        
        // Vertical floating animation (existing)
        this.tweens.add({
            targets: platform,
            y: platform.startY - 5,
            duration: 1500 + Math.random() * 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: Math.random() * 1000,
            onUpdate: function() {
                platform.refreshBody();
            }
        });
    });

    // Platform dimensions
    const platformWidth = 200;
    const platformHeight = 30;
    const jumpHeight = 130;    // Vertical distance between platforms
    const jumpDistance = 300;  // Horizontal distance between platforms
    const x_offset = 1200;
    // Create research zone platforms
    const zoneData = [
        { x: x_offset + 100, y: groundY , name: 'InSAR\nmethodology', page: 'insar/insar.html' },
        { x: x_offset + 500, y: groundY - 100, name: 'Coastal\nflooding', page: 'flooding/flooding.html' },
        { x: x_offset + 900, y: groundY - 200, name: 'Groundwater\nsubsidence', page: 'groundwater/groundwater.html' },
        { x: x_offset + 1300, y: groundY - 300, name: 'Tectonics', page: 'tectonics/tectonics.html' },
        { 
            x: 0 - jumpDistance,  // Position it to the left of first platform
            y: groundY + 200,  // Position it between ground and first platform
            name: 'Original\nwebsite',
            page: 'original_site/index.html'
        }
    ];

    zoneData.forEach(zone => {
        // Create platform
        const platform = platforms.create(zone.x, zone.y, 'ground');
        platform.setScale(platformWidth / platform.width, platformHeight / platform.height);  // Set both width and height scale
        platform.refreshBody();
        platform.zoneName = zone.name;
        platform.page = zone.page;
        platform.setDepth(2);

        // Store original y position
        platform.startY = zone.y;

        // Create text above platform
        const text = this.add.text(zone.x, zone.y - 50, zone.name, {
            fontSize: '16px',
            fill: '#fff',
            backgroundColor: '#000000aa',
            padding: { x: 10, y: 5 },
            align: 'center'
        });
        text.setOrigin(0.5);
        text.setDepth(1);
        
        // Make text interactive
        text.setInteractive({ useHandCursor: true });
        text.on('pointerdown', () => {
            window.location.href = zone.page;
        });
        
        // Add hover effect
        text.on('pointerover', () => {
            text.setStyle({ fill: '#00ffff' });
        });
        text.on('pointerout', () => {
            text.setStyle({ fill: '#fff' });
        });

        // Add floating animation to platform with random timing
        this.tweens.add({
            targets: platform,
            y: zone.y - 5,
            duration: 1500 + Math.random() * 1000, // Random duration between 1.5-2.5s
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: Math.random() * 1000, // Random start delay
            onUpdate: function() {
                platform.refreshBody();
                // Update text position to follow platform
                text.y = platform.y - 50;
            }
        });

        // Add images centered above text
        const imageOffset = 150;
        if (zone.name === 'InSAR\nmethodology') {
            const sarImage = this.add.image(zone.x, zone.y - imageOffset, 'sar');  // Centered above text
            sarImage.setScale(0.16);
            sarImage.setDepth(0);
            sarImage.setOrigin(0.5);  // Center the image
        }
        
        if (zone.name === 'Coastal\nflooding') {
            const floodImage = this.add.image(zone.x, zone.y - imageOffset, 'flooding');
            floodImage.setScale(0.16);
            floodImage.setDepth(0);
            floodImage.setOrigin(0.5);
        }

        if (zone.name === 'Groundwater\nsubsidence') {
            const groundwaterImage = this.add.image(zone.x, zone.y - imageOffset, 'groundwater');
            groundwaterImage.setScale(0.16);
            groundwaterImage.setDepth(0);
            groundwaterImage.setOrigin(0.5);
        }

        if (zone.name === 'Tectonics') {
            const tectonicsImage = this.add.image(zone.x, zone.y - imageOffset, 'tectonics');
            tectonicsImage.setScale(0.16);
            tectonicsImage.setDepth(0);
            tectonicsImage.setOrigin(0.5);
        }
    });

    // THEN create player and check if returning from zone
    player = this.physics.add.sprite(150, this.scale.height - 150, 'player-idle');
    player.setBounce(0.2);
    player.setCollideWorldBounds(false);
    player.setScale(0.85);  // Keep current scale
    
    // Adjust physics body to better align with platforms
    player.body.setSize(80, 70);     // Increased height slightly
    player.body.setOffset(24, 8);    // Moved hitbox up by adjusting Y offset
    
    // Check if player is returning from a research zone page
    const lastPlatform = localStorage.getItem('lastPlatform');
    if (lastPlatform) {
        // Find the matching platform in zoneData
        const zone = zoneData.find(z => z.name === lastPlatform);
        if (zone) {
            // Position player on this platform
            player.x = zone.x;
            player.y = zone.y - 50; // Position above platform
            
            // Give player rocket pack automatically
            hasRocketPack = true;
            jumpVelocity = -350;
            player.setTint(0xffff00);  // Turn player golden
            
            // NOW we can update instructionText since it exists
            instructionText.setText('Returned from ' + lastPlatform.replace('\n', ' ') + '. Use arrow keys to move, UP to jump, and SPACE to enter research zones');
            
            // Make camera immediately focus on player's position
            this.cameras.main.centerOn(player.x, player.y);
        }
    }
    
    // Debug: Log sprite loading status
    console.log('Idle texture exists:', this.textures.exists('player-idle'));
    console.log('Walk texture exists:', this.textures.exists('player-walk'));

    // Extend world bounds downward to allow falling to lower platform
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height * 2);
    
    // Create rocket pack but hide it if player already has it
    rocketPack = this.physics.add.sprite(
        -100,  // Match x position with right segment
        -100,  // Start above the screen to let it fall
        'rocketpack'
    );
    rocketPack.setScale(0.035);
    rocketPack.setBounce(0.05);
    rocketPack.setCollideWorldBounds(false);
    
    // If player already has rocket pack, hide it
    if (hasRocketPack) {
        rocketPack.setVisible(false);
        rocketPack.body.enable = false;
    }
    
    // Make rocketpack interactive
    rocketPack.setInteractive({ useHandCursor: true });
    
    // Add hover effect
    rocketPack.on('pointerover', function() {
        this.setTint(0x00ffff);
    });
    rocketPack.on('pointerout', function() {
        this.clearTint();
    });
    
    // Add click handler
    rocketPack.on('pointerdown', function() {
        collectRocketPack(player, this);
    });

    // Modify the rocketpack collision handler
    this.physics.add.collider(rocketPack, platforms, function(rocketPack, platform) {
        if (rocketPack.body.velocity.y < 0) return;  // Don't lock it in place while bouncing up
        
        // Only lock it in place after it settles (low velocity)
        if (Math.abs(rocketPack.body.velocity.y) < 10) {
            rocketPack.setVelocity(0, 0);
            rocketPack.body.allowGravity = false;
            rocketPack.setCollideWorldBounds(true);
            
            // If it's the moving platform, store the platform reference
            if (platform.isMoving) {
                rocketPack.movingPlatform = platform;
                rocketPack.relativeX = rocketPack.x - platform.x;
            }
        }
    });

    // Rocket pack collection function
    function collectRocketPack(player, rocket) {
        if (!hasRocketPack) {  // Only collect once
            hasRocketPack = true;
            jumpVelocity = -350;
            rocket.destroy();
            player.setTint(0xffff00);  // Turn player golden immediately
            instructionText.setText('Rocket pack acquired! Use arrow keys to move, UP to jump higher, and SPACE to enter research zones');
        }
    }

    // Add collision detection for rocket pack
    this.physics.add.overlap(player, rocketPack, collectRocketPack);

    // Player animations with correct frame counts
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('player-walk', { start: 0, end: 4 }), // 5 frames
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'turn',
        frames: this.anims.generateFrameNumbers('player-idle', { start: 0, end: 4 }), // 5 frames
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('player-walk', { start: 0, end: 4 }), // 5 frames
        frameRate: 10,
        repeat: -1
    });

    // Add this to handle sprite flipping
    player.on('animationupdate', function() {
        if (cursors.left.isDown) {
            player.setFlipX(true);
        } else if (cursors.right.isDown) {
            player.setFlipX(false);
        }
    });

    // Add collision detection with platforms
    this.physics.add.collider(player, platforms, (player, platform) => {
        if (player.body.touching.down) {
            if (platform.isMoving) {
                // Calculate relative position on platform
                const relativeX = player.x - platform.x;
                
                // Apply platform movement
                const platformDeltaX = platform.x - platform.prevX || 0;
                player.x += platformDeltaX;
            }
            
            // Check for zone entry
            if (cursors.space.isDown && platform.zoneName) {
                localStorage.setItem('lastPlatform', platform.zoneName);
                window.location.href = platform.page;
            }
        }
    });

    // Input handling
    cursors = this.input.keyboard.createCursorKeys();

    // Camera follow player with different settings for mobile
    if (isMobile) {
        // Mobile camera settings - wider view and smoother follow
        this.cameras.main.startFollow(player, true, 0.05, 0.05);  // Smoother follow
        this.cameras.main.setZoom(0.6);  // Zoom out for better overview
        
        // Set camera deadzone for mobile (less aggressive following)
        this.cameras.main.setDeadzone(120, 80);
    } else {
        // Desktop camera settings
        this.cameras.main.startFollow(player, true, 0.08, 0.08);
        this.cameras.main.setZoom(0.8);  // Slightly zoomed out even for desktop
        
        // Smaller deadzone for desktop
        this.cameras.main.setDeadzone(60, 40);
    }

    // Make platforms semi-transparent to match space theme
    platforms.children.iterate(function (platform) {
        if (platform) {
            platform.setAlpha(0.8);
        }
    });

    // Add copyright text in bottom left
    const copyrightText = this.add.text(10, this.scale.height - 30, 
        '© 2025 Kyle Murray', 
        {
            fontSize: '10px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 2
        }
    );
    copyrightText.setScrollFactor(0);  // Fix to screen
    copyrightText.setDepth(10);        // Make sure it's above other elements

    // Add safe area detection function
    this.getSafeAreaBottom = function() {
        // Try to get CSS safe area inset
        if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('padding-bottom', 'env(safe-area-inset-bottom)')) {
            // Create a temporary element to measure safe area
            const testEl = document.createElement('div');
            testEl.style.position = 'fixed';
            testEl.style.bottom = '0';
            testEl.style.left = '0';
            testEl.style.width = '1px';
            testEl.style.height = '1px';
            testEl.style.paddingBottom = 'env(safe-area-inset-bottom)';
            testEl.style.visibility = 'hidden';
            document.body.appendChild(testEl);
            
            const safeArea = parseInt(getComputedStyle(testEl).paddingBottom) || 0;
            document.body.removeChild(testEl);
            return safeArea;
        }
        
        // Fallback: device-specific estimates
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('iphone')) {
            // iPhone with home indicator (X and newer)
            if (window.screen.height >= 812) return 34;
            return 20; // Older iPhones
        } else if (userAgent.includes('android')) {
            return 24; // Android navigation bar estimate
        }
        
        return 20; // Default fallback
    };

    if (isMobile) {
        // Mobile controls setup
        this.mobileControls = {
            left: { isPressed: false },
            right: { isPressed: false },
            jump: { isPressed: false },
            action: { isPressed: false }
        };

        // Create mobile control buttons with responsive positioning
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;
        
        // Responsive button sizing based on screen size
        const buttonSize = Math.min(screenWidth * 0.12, 90); // 12% of width, max 90px
        
        // Safe area calculation for different devices
        const safeAreaBottom = this.getSafeAreaBottom();
        const baseBottomMargin = Math.max(screenHeight * 0.15, 120); // 15% of height, min 120px
        const buttonY = screenHeight - baseBottomMargin - safeAreaBottom;
        
        // Responsive spacing
        const buttonSpacing = Math.min(screenWidth * 0.15, 120);

        // Responsive icon sizing
        const iconScale = buttonSize / 80; // Scale icons relative to button size
        
        // Left button
        const leftButton = this.add.graphics();
        leftButton.fillStyle(0x333333, 0.7);
        leftButton.fillRoundedRect(-buttonSize/2, -buttonSize/2, buttonSize, buttonSize, buttonSize * 0.125);
        leftButton.fillStyle(0xffffff, 1);
        leftButton.fillTriangle(-20 * iconScale, 0, 5 * iconScale, -15 * iconScale, 5 * iconScale, 15 * iconScale);
        leftButton.x = Math.max(buttonSpacing, buttonSize);
        leftButton.y = buttonY;
        leftButton.setScrollFactor(0);
        leftButton.setInteractive(new Phaser.Geom.Rectangle(-buttonSize/2, -buttonSize/2, buttonSize, buttonSize), Phaser.Geom.Rectangle.Contains);

        // Right button
        const rightButton = this.add.graphics();
        rightButton.fillStyle(0x333333, 0.7);
        rightButton.fillRoundedRect(-buttonSize/2, -buttonSize/2, buttonSize, buttonSize, buttonSize * 0.125);
        rightButton.fillStyle(0xffffff, 1);
        rightButton.fillTriangle(20 * iconScale, 0, -5 * iconScale, -15 * iconScale, -5 * iconScale, 15 * iconScale);
        rightButton.x = Math.max(buttonSpacing * 2, buttonSize * 2.5);
        rightButton.y = buttonY;
        rightButton.setScrollFactor(0);
        rightButton.setInteractive(new Phaser.Geom.Rectangle(-buttonSize/2, -buttonSize/2, buttonSize, buttonSize), Phaser.Geom.Rectangle.Contains);

        // Jump button
        const jumpButton = this.add.graphics();
        jumpButton.fillStyle(0x333333, 0.7);
        jumpButton.fillRoundedRect(-buttonSize/2, -buttonSize/2, buttonSize, buttonSize, buttonSize * 0.125);
        jumpButton.fillStyle(0xffffff, 1);
        jumpButton.fillTriangle(0, -20 * iconScale, -15 * iconScale, 5 * iconScale, 15 * iconScale, 5 * iconScale);
        jumpButton.x = Math.min(screenWidth - buttonSpacing * 2, screenWidth - buttonSize * 2.5);
        jumpButton.y = buttonY;
        jumpButton.setScrollFactor(0);
        jumpButton.setInteractive(new Phaser.Geom.Rectangle(-buttonSize/2, -buttonSize/2, buttonSize, buttonSize), Phaser.Geom.Rectangle.Contains);

        // Action button (for entering zones)
        const actionButton = this.add.graphics();
        actionButton.fillStyle(0x333333, 0.7);
        actionButton.fillRoundedRect(-buttonSize/2, -buttonSize/2, buttonSize, buttonSize, buttonSize * 0.125);
        actionButton.fillStyle(0xffffff, 1);
        actionButton.fillCircle(0, 0, 15 * iconScale);
        actionButton.x = Math.min(screenWidth - buttonSpacing, screenWidth - buttonSize);
        actionButton.y = buttonY;
        actionButton.setScrollFactor(0);
        actionButton.setInteractive(new Phaser.Geom.Rectangle(-buttonSize/2, -buttonSize/2, buttonSize, buttonSize), Phaser.Geom.Rectangle.Contains);

        // Button event handlers
        leftButton.on('pointerdown', () => { this.mobileControls.left.isPressed = true; });
        leftButton.on('pointerup', () => { this.mobileControls.left.isPressed = false; });
        leftButton.on('pointerout', () => { this.mobileControls.left.isPressed = false; });

        rightButton.on('pointerdown', () => { this.mobileControls.right.isPressed = true; });
        rightButton.on('pointerup', () => { this.mobileControls.right.isPressed = false; });
        rightButton.on('pointerout', () => { this.mobileControls.right.isPressed = false; });

        jumpButton.on('pointerdown', () => { this.mobileControls.jump.isPressed = true; });
        jumpButton.on('pointerup', () => { this.mobileControls.jump.isPressed = false; });
        jumpButton.on('pointerout', () => { this.mobileControls.jump.isPressed = false; });

        actionButton.on('pointerdown', () => { this.mobileControls.action.isPressed = true; });
        actionButton.on('pointerup', () => { this.mobileControls.action.isPressed = false; });
        actionButton.on('pointerout', () => { this.mobileControls.action.isPressed = false; });

        // Visual feedback for button presses
        leftButton.on('pointerdown', () => { leftButton.setAlpha(0.5); });
        leftButton.on('pointerup', () => { leftButton.setAlpha(1); });
        leftButton.on('pointerout', () => { leftButton.setAlpha(1); });

        rightButton.on('pointerdown', () => { rightButton.setAlpha(0.5); });
        rightButton.on('pointerup', () => { rightButton.setAlpha(1); });
        rightButton.on('pointerout', () => { rightButton.setAlpha(1); });

        jumpButton.on('pointerdown', () => { jumpButton.setAlpha(0.5); });
        jumpButton.on('pointerup', () => { jumpButton.setAlpha(1); });
        jumpButton.on('pointerout', () => { jumpButton.setAlpha(1); });

        actionButton.on('pointerdown', () => { actionButton.setAlpha(0.5); });
        actionButton.on('pointerup', () => { actionButton.setAlpha(1); });
        actionButton.on('pointerout', () => { actionButton.setAlpha(1); });

    } else {
        // Initialize empty mobile controls to prevent errors
        this.mobileControls = {
            left: { isPressed: false },
            right: { isPressed: false },
            jump: { isPressed: false },
            action: { isPressed: false }
        };
    }

    // After creating player and platforms, add the snake
    createSnake(this);
    
    // Add collision between snake and player
    this.physics.add.overlap(player, snake, playerHitBySnake, null, this);
    
    // Add instruction about the snake
    if (instructionText) {
        const existingText = instructionText.text;
        instructionText.setText(existingText + '. Watch out for the UFO!');
    }
}

function createSnake(scene) {
    // Create a graphics object instead of using an image
    snake = scene.add.graphics();
    
    // Draw a triangle for the snake head (pointing right)
    snake.fillStyle(0x00ff00, 1); // Green fill
    snake.fillTriangle(0, -8, 16, 0, 0, 8);
    
    // Add eyes
    snake.fillStyle(0xff0000, 1); // Red eyes
    snake.fillCircle(4, -3, 2);
    
    // Convert to sprite
    const texture = snake.generateTexture('snake', 20, 16);
    snake.destroy();
    
    // Now create the actual snake sprite
    const x = Phaser.Math.Between(100, scene.scale.width - 100);
    const y = Phaser.Math.Between(100, scene.scale.height - 100);
    
    snake = scene.physics.add.sprite(x, y, 'snake');
    snake.setCollideWorldBounds(false);
    snake.setBounce(0.2);
    snake.setScale(0.06); // Set to 5% of original size
    
    // Make snake unaffected by gravity
    snake.body.setAllowGravity(false);
    
    // Set custom body size for better collision detection
    snake.body.setSize(snake.width * 0.8, snake.height * 0.8);
    
    // Make snake collide with platforms
    scene.physics.add.collider(snake, platforms);
    
    // Initialize behavior switching timer
    startBehaviorSwitchTimer(scene);
}

function startBehaviorSwitchTimer(scene) {
    scene.time.delayedCall(
        Phaser.Math.Between(4000, 8000), // Switch every 4-8 seconds
        () => {
            // Switch behavior mode
            attackMode = !attackMode;
            
            if (!attackMode) {
                // Generate a new random patrol point
                patrolPoint = {
                    x: Phaser.Math.Between(100, scene.scale.width - 100),
                    y: Phaser.Math.Between(100, scene.scale.height - 100)
                };
            }
            
            // Schedule next switch
            if (!gameOver) {
                startBehaviorSwitchTimer(scene);
            }
        }
    );
}

function updateSnakeMovement(scene) {
    // If the game is over, stop UFO movement
    if (gameOver) {
        snake.setVelocity(0, 0);
        return;
    }
    
    let targetX, targetY;
    
    if (attackMode) {
        // Attack mode: target the player
        targetX = player.x;
        targetY = player.y;
    } else {
        // Patrol mode: move to random point
        if (!patrolPoint || (Math.abs(snake.x - patrolPoint.x) < 50 && Math.abs(snake.y - patrolPoint.y) < 50)) {
            // If reached patrol point or no patrol point, set a new one
            patrolPoint = {
                x: Phaser.Math.Between(100, scene.scale.width - 100),
                y: Phaser.Math.Between(100, scene.scale.height - 100)
            };
        }
        targetX = patrolPoint.x;
        targetY = patrolPoint.y;
    }
    
    // Calculate direction to target
    const dx = targetX - snake.x;
    const dy = targetY - snake.y;
    const angle = Math.atan2(dy, dx);
    
    // Set UFO velocity based on angle to target
    const speed = attackMode ? snakeSpeed : snakeSpeed * 0.7; // Move slower in patrol mode
    snake.setVelocityX(Math.cos(angle) * speed);
    snake.setVelocityY(Math.sin(angle) * speed);
    
    // Optional: flip UFO sprite based on direction
    if (dx < 0) {
        snake.setFlipX(true);
    } else {
        snake.setFlipX(false);
    }
}

function playerHitBySnake(player, snake) {
    if (gameOver) return;
    
    gameOver = true;
    
    // Stop player movement
    player.setVelocity(0, 0);
    player.setTint(0xff0000); // Turn player red
    
    // Stop snake movement
    snake.setVelocity(0, 0);
    
    // Delay before going to death screen
    this.time.delayedCall(1000, () => {
        // Clear localStorage when player dies
        localStorage.clear();
        // Then redirect to death page
        window.location.href = "death.html";
    });
}

function update() {
    // At beginning of update function, check if game is over
    if (gameOver) return;
    
    // Use same debug flag
    const forceMobile = false;
    const isMobile = forceMobile || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Mobile controls logic with improved responsiveness
        const mobileSpeed = 180; // Slightly slower for better control
        
        // Handle horizontal movement (independent of jump)
        if (this.mobileControls.left.isPressed && this.mobileControls.right.isPressed) {
            // Both pressed - stop moving
            player.setVelocityX(0);
            player.anims.play('turn');
        } else if (this.mobileControls.left.isPressed) {
            player.setVelocityX(-mobileSpeed);
            player.anims.play('left', true);
        } else if (this.mobileControls.right.isPressed) {
            player.setVelocityX(mobileSpeed);
            player.anims.play('right', true);
        } else {
            // Smoother stopping with slight deceleration
            const currentVelX = player.body.velocity.x;
            if (Math.abs(currentVelX) > 10) {
                player.setVelocityX(currentVelX * 0.8); // Gradual slowdown
            } else {
                player.setVelocityX(0);
                player.anims.play('turn');
            }
        }

        // Handle jump independently (allows running jumps)
        if (this.mobileControls.jump.isPressed && player.body.touching.down) {
            // Prevent rapid-fire jumping
            if (!this.jumpCooldown) {
                // Slightly higher jump for mobile to compensate for touch controls
                const mobileJumpVelocity = hasRocketPack ? jumpVelocity * 0.9 : jumpVelocity * 1.1;
                player.setVelocityY(mobileJumpVelocity);
                if (hasRocketPack) {
                    player.setTint(0xffff00);
                } else {
                    player.clearTint();
                }
                
                // Set jump cooldown
                this.jumpCooldown = true;
                this.time.delayedCall(100, () => {
                    this.jumpCooldown = false;
                });
            }
        }

        // Zone entry with action button
        if (this.mobileControls.action.isPressed && player.body.touching.down) {
            platforms.children.iterate((platform) => {
                if (platform && platform.zoneName && 
                    Phaser.Geom.Intersects.RectangleToRectangle(player.getBounds(), platform.getBounds())) {
                    localStorage.setItem('lastPlatform', platform.zoneName);
                    window.location.href = platform.page;
                }
            });
        }

        // Platform and rocketpack movement
        platforms.children.iterate(function (platform) {
            if (platform && platform.isMoving) {
                if (rocketPack && rocketPack.movingPlatform === platform) {
                    const platformDeltaX = platform.x - platform.prevX || 0;
                    rocketPack.x += platformDeltaX;
                }
                platform.prevX = platform.x;
            }
        });
    } else {
        // Desktop controls - basic version
        if (cursors.left.isDown) {
            player.setVelocityX(-200);
            player.anims.play('left', true);
        } else if (cursors.right.isDown) {
            player.setVelocityX(200);
            player.anims.play('right', true);
        } else {
            player.setVelocityX(0);
            player.anims.play('turn');
        }

        // Jump
        if (cursors.up.isDown && player.body.touching.down) {
            player.setVelocityY(jumpVelocity);
            if (hasRocketPack) {
                player.setTint(0xffff00);
            } else {
                player.clearTint();
            }
        }

        // Zone entry with spacebar
        if (cursors.space.isDown && player.body.touching.down) {
            platforms.children.iterate((platform) => {
                if (platform && platform.zoneName && 
                    Phaser.Geom.Intersects.RectangleToRectangle(player.getBounds(), platform.getBounds())) {
                    localStorage.setItem('lastPlatform', platform.zoneName);
                    window.location.href = platform.page;
                }
            });
        }

        // Platform and rocketpack movement
        platforms.children.iterate(function (platform) {
            if (platform && platform.isMoving) {
                if (rocketPack && rocketPack.movingPlatform === platform) {
                    const platformDeltaX = platform.x - platform.prevX || 0;
                    rocketPack.x += platformDeltaX;
                }
                platform.prevX = platform.x;
            }
        });
    }

    // Update snake movement
    if (snake && player) {
        updateSnakeMovement(this);
    }

    // Existing death check is still valid:
    if (player.y > this.scale.height * 2) {
        // Clear all localStorage when player dies
        localStorage.clear();
        // Then redirect to death page
        window.location.href = "death.html";
    }
}
