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
    
    // Remove or comment out the star sprite
    // this.load.image('rocketpack', 'https://labs.phaser.io/assets/sprites/star.png');
    
    // Load SAR satellite image
    this.load.image('sar', 'insar/sar_sat.webp');
    // Load flooding image
    this.load.image('flooding', 'flooding/flooding.webp');
    // Load groundwater image
    this.load.image('groundwater', 'groundwater/groundwater.webp');
    // Load tectonics image
    this.load.image('tectonics', 'tectonics/tectonics.webp');
}

function create() {
    // Add debug flag to force mobile mode
    const forceMobile = false;  // Set to true to test mobile controls
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

    // Create player with adjusted scale
    player = this.physics.add.sprite(150, this.scale.height - 150, 'player-idle');
    player.setBounce(0.2);
    player.setCollideWorldBounds(false);
    player.setScale(0.85);  // Keep current scale
    
    // Adjust physics body to better align with platforms
    player.body.setSize(80, 70);     // Increased height slightly
    player.body.setOffset(24, 8);    // Moved hitbox up by adjusting Y offset

    // Debug: Log sprite loading status
    console.log('Idle texture exists:', this.textures.exists('player-idle'));
    console.log('Walk texture exists:', this.textures.exists('player-walk'));

    // Extend world bounds downward to allow falling to lower platform
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height * 2);
    
    // Create rocket pack above the lowered right segment
    rocketPack = this.physics.add.sprite(
        -100,  // Match x position with right segment
        -100,  // Start above the screen to let it fall
        'rocketpack'
    );
    rocketPack.setScale(0.035);
    rocketPack.setBounce(0.05);
    rocketPack.setCollideWorldBounds(false);
    
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

    // Add instruction text at the bottom of the screen
    instructionText = this.add.text(panelWidth + panelPadding, this.scale.height - 50,
        'Use arrow keys to move and UP to jump. Find the rocket pack to jump higher!',
        {
            fontSize: '18px',
            fill: '#fff',
        }
    );
    instructionText.setScrollFactor(0);

    // Camera follow player
    this.cameras.main.startFollow(player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);

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

    if (isMobile) {
        // Create mobile controls
        const controlsConfig = {
            jump: {
                x: 50,                    // Keep jump on left bottom
                y: this.scale.height / 1.5,
                text: '↑',
                size: '40px'
            },
            left: {
                x: this.scale.width - 180,  // Keep x position
                y: this.scale.height / 1.5,   // Move to vertical middle
                text: '←',
                size: '60px'               // Make arrows bigger
            },
            right: {
                x: this.scale.width - 80,   // Keep x position
                y: this.scale.height / 1.5 ,   // Move to vertical middle
                text: '→',
                size: '60px'               // Make arrows bigger
            },
            action: {
                x: 150,                     // Keep action button position
                y: this.scale.height - 60,
                text: '⚡',
                size: '40px'
            }
        };

        // Create touch buttons
        this.mobileControls = {};
        Object.entries(controlsConfig).forEach(([key, config]) => {
            const button = this.add.text(config.x, config.y, config.text, {
                fontSize: config.size,          // Use size from config
                backgroundColor: '#00000088',
                padding: { x: 25, y: 15 },     // Increased padding
                fill: '#ffffff'
            });
            button.setScrollFactor(0);
            button.setInteractive();
            button.setDepth(100);
            button.alpha = 0.7;

            // Add touch handlers
            button.on('pointerdown', () => button.isPressed = true);
            button.on('pointerup', () => button.isPressed = false);
            button.on('pointerout', () => button.isPressed = false);

            this.mobileControls[key] = button;
        });

        // Modify instruction text for mobile - split into two lines
        instructionText.setText('Use arrow buttons to move and jump.\nFind the rocket pack to jump higher!');
        instructionText.setFontSize('14px');
        instructionText.setLineSpacing(10);  // Add space between lines
    }
}

function update() {
    // Use same debug flag
    const forceMobile = false;  // Set to true to test mobile controls
    const isMobile = forceMobile || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Mobile controls
        if (this.mobileControls.left.isPressed) {
            player.setVelocityX(-200);
            player.anims.play('left', true);
        } else if (this.mobileControls.right.isPressed) {
            player.setVelocityX(200);
            player.anims.play('right', true);
        } else {
            player.setVelocityX(0);
            player.anims.play('turn');
        }

        // Handle jumping
        if (this.mobileControls.jump.isPressed && player.body.touching.down) {
            player.setVelocityY(jumpVelocity);
            if (hasRocketPack) {
                player.setTint(0xffff00);
            }
        }

        // Handle action button (space equivalent)
        if (this.mobileControls.action.isPressed && player.body.touching.down) {
            platforms.children.iterate((platform) => {
                if (platform && platform.zoneName && 
                    Phaser.Geom.Intersects.RectangleToRectangle(player.getBounds(), platform.getBounds())) {
                    localStorage.setItem('lastPlatform', platform.zoneName);
                    window.location.href = platform.page;
                }
            });
        }
    } else {
        // Existing desktop controls
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

        // Handle jumping with visual effect
        if (cursors.up.isDown && player.body.touching.down) {
            player.setVelocityY(jumpVelocity);
            if (hasRocketPack) {
                player.setTint(0xffff00);
            } else {
                player.clearTint();
            }
        }

        // If the player falls below the screen, redirect to a "death" page with a meme.
        if (player.y > this.scale.height * 2) {  // Let them fall twice the screen height
            window.location.href = "death.html";
        }

        // Update platform previous positions and move rocketpack
        platforms.children.iterate(function (platform) {
            if (platform && platform.isMoving) {
                if (rocketPack && rocketPack.movingPlatform === platform) {
                    const platformDeltaX = platform.x - platform.prevX;
                    rocketPack.x += platformDeltaX;
                }
                platform.prevX = platform.x;
            }
        });
    }
}
