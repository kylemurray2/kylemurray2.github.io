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
    
    // Add the description text
    const descriptionText = "Dr. Kyle Murray received his PhD in 2020 in geophysics from Cornell University's Earth and Atmospheric Sciences department. Upon completing an NSF postdoctoral fellowship, he continues his research at the University of Hawaii, where he works with the Climate Resilience Collaborative (CRC) in the Earth Sciences department and the Sea Level Center in the Oceanography department. His research focus is on developing data-driven methods to accurately measure and map the Earth's active deformation in both space and time. To learn more about his past and current projects, please explore the research map.";
    
    const description = this.add.text(panelPadding * 2, panelPadding * 2, descriptionText, {
        fontSize: '16px',
        fill: '#fff',
        stroke: '#000',  // Add black outline to text
        strokeThickness: 2,  // Make text more readable against space background
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
        { x: 500, width: 0.3 },    // Middle segment - bigger gap
        { x: 900, width: 0.3 }     // Right segment - bigger gap
    ];
    
    segments.forEach(segment => {
        const platform = platforms.create(segment.x, groundY, 'ground');
        platform.setScale(segment.width, 0.1);  // Reduce vertical scale to 0.1 for thinner platforms
        platform.refreshBody();
        
        // Store original y position
        platform.startY = groundY;
        
        // Add floating animation with random timing
        this.tweens.add({
            targets: platform,
            y: groundY - 5,
            duration: 1500 + Math.random() * 1000, // Random duration between 1.5-2.5s
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: Math.random() * 1000, // Random start delay
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

    // Create research zone platforms
    const zoneData = [
        { x: 100, y: groundY - jumpHeight, name: 'InSAR\nmethodology', page: 'insar/insar.html' },
        { x: 100 + jumpDistance, y: groundY - jumpHeight * 1.8, name: 'Coastal\nflooding', page: 'flooding/flooding.html' },
        { x: 100, y: groundY - jumpHeight * 2.6, name: 'Groundwater\nsubsidence', page: 'groundwater/groundwater.html' },
        { x: 100 + jumpDistance, y: groundY - jumpHeight * 3.4, name: 'Tectonics', page: 'tectonics/tectonics.html' }
    ];

    zoneData.forEach(zone => {
        // Create platform
        const platform = platforms.create(zone.x, zone.y, 'ground');
        platform.setScale(platformWidth / platform.width, platformHeight / platform.height);
        platform.refreshBody();
        platform.zoneName = zone.name;
        platform.page = zone.page;
        platform.setDepth(2);

        // Store original y position
        platform.startY = zone.y;

        // Create text above platform
        const text = this.add.text(zone.x, zone.y - 30, zone.name, {
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
                text.y = platform.y - 30;
            }
        });

        // Add SAR image for InSAR methodology platform
        if (zone.name === 'InSAR\nmethodology') {
            const sarImage = this.add.image(zone.x - 100, zone.y - 80, 'sar');
            sarImage.setScale(0.16);
            sarImage.setDepth(0);  // Set images to lowest depth
        }
        
        // Add flooding image for coastal flooding platform
        if (zone.name === 'Coastal\nflooding') {
            const floodImage = this.add.image(zone.x + 100, zone.y - 80, 'flooding');
            floodImage.setScale(0.16);
            floodImage.setDepth(0);  // Set images to lowest depth
        }

        // Add groundwater image for groundwater subsidence platform
        if (zone.name === 'Groundwater\nsubsidence') {
            const groundwaterImage = this.add.image(zone.x - 100, zone.y - 80, 'groundwater');
            groundwaterImage.setScale(0.16);
            groundwaterImage.setDepth(0);
        }

        // Add tectonics image for tectonics platform
        if (zone.name === 'Tectonics') {
            const tectonicsImage = this.add.image(zone.x + 100, zone.y - 80, 'tectonics');
            tectonicsImage.setScale(0.16);
            tectonicsImage.setDepth(0);
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

    // Create rocket pack slightly to the left of player's starting position
    rocketPack = this.physics.add.sprite(
        player.x + 800,  // Left of player
        50,  // Start at top of screen
        'rocketpack'
    );
    rocketPack.setScale(0.05);  // Make rocket pack half as big
    // Add physics properties to rocket pack
    rocketPack.setBounce(0.2);
    rocketPack.setCollideWorldBounds(true);
    // Add collision between rocket pack and platforms
    this.physics.add.collider(rocketPack, platforms);

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

    // Add collision detection
    this.physics.add.collider(player, platforms, (player, platform) => {
        // Check if player is standing on platform (not hitting from side)
        if (player.body.touching.down && cursors.space.isDown && platform.zoneName) {
            localStorage.setItem('lastPlatform', platform.zoneName);
            window.location.href = platform.page;
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

    // Camera follow player
    this.cameras.main.startFollow(player, true, 0.08, 0.08);
    this.cameras.main.setZoom(1);

    // Make platforms semi-transparent to match space theme
    platforms.children.iterate(function (platform) {
        if (platform) {
            platform.setAlpha(0.8);
        }
    });
}

function update() {
    // Handle movement
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
}
