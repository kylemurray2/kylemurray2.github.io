// Game configuration
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game',
        width: '100%',
        height: '100%'
    },
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let game = new Phaser.Game(config);
let player;
let cursors;

function preload() {
    // Load character sprite
    this.load.spritesheet('player', 
        'https://labs.phaser.io/assets/sprites/dude.png',
        { frameWidth: 32, frameHeight: 48 }
    );

    // Load background
    this.load.image('background', 'land.png');
}

function create() {
    // Add description panel first
    const descriptionText = "Dr. Kyle Murray received his PhD in 2020 in geophysics from Cornell University's Earth and Atmospheric Sciences department. Upon completing an NSF postdoctoral fellowship, he continues his research at the University of Hawaii, where he works with the Climate Resilience Collaborative (CRC) in the Earth Sciences department and the Sea Level Center in the Oceanography department. His research focus is on developing data-driven methods to accurately measure and map the Earth's active deformation in both space and time. To learn more about his past and current projects, please explore the research map.";
    const panelWidth = this.scale.width * 0.2;
    
    // Add the text with word wrap
    const description = this.add.text(20, 20, descriptionText, {
        fontSize: '16px',
        fill: '#fff',
        wordWrap: { width: panelWidth - 40 },
        lineSpacing: 10
    });
    
    // Create clickable link
    const linkText = this.add.text(20, description.y + description.height + 20, 'Climate Resilience Collaborative (CRC)', {
        fontSize: '16px',
        fill: '#4CAF50',
        wordWrap: { width: panelWidth - 40 }
    });
    linkText.setInteractive();
    linkText.on('pointerdown', () => {
        window.open('https://www.soest.hawaii.edu/crc/', '_blank');
    });
    
    // Add and center the background
    const bg = this.add.image(0, 0, 'background');
    bg.setOrigin(0, 0);

    // Scale background to fit screen while maintaining aspect ratio
    const scaleX = (this.scale.width - panelWidth) / bg.width;  // Adjust for panel width
    const scaleY = this.scale.height / bg.height;
    const scale = Math.min(scaleX, scaleY);
    bg.setScale(scale);

    // Center the background
    bg.x = panelWidth + ((this.scale.width - panelWidth - bg.width * scale) / 2);  // Offset by panel width
    bg.y = (this.scale.height - bg.height * scale) / 2;

    // Get stored position before creating player
    const storedX = localStorage.getItem('lastPlayerX');
    const storedY = localStorage.getItem('lastPlayerY');
    const hasStoredPosition = storedX && storedY;

    // Create the player with stored or default position
    player = this.physics.add.sprite(
        hasStoredPosition ? parseFloat(storedX) : panelWidth + ((this.scale.width - panelWidth) / 2),
        hasStoredPosition ? parseFloat(storedY) : this.scale.height / 2,
        'player'
    );
    
    // Create player animations first
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'turn',
        frames: [{ key: 'player', frame: 4 }],
        frameRate: 20
    });

    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('player', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    // Add instruction text that follows player
    const instructionText = this.add.text(0, 0, 'Use arrow keys to move', {
        fontSize: '18px',
        fill: '#fff',
        backgroundColor: '#000000aa',
        padding: { x: 10, y: 5 }
    });
    instructionText.setOrigin(0.5);

    // Update instruction text position in game loop
    this.events.on('update', () => {
        instructionText.x = player.x;
        instructionText.y = player.y - 50;
    });

    // Initial demo movement
    let demoComplete = false;
    const movements = [
        { x: player.x - 100, direction: 'left' },
        { x: player.x + 100, direction: 'right' },
        { y: player.y - 100, direction: 'up' },
        { y: player.y + 100, direction: 'down' }
    ];

    const playDemo = async () => {
        for (const move of movements) {
            if (demoComplete) break;
            await new Promise(resolve => {
                this.tweens.add({
                    targets: player,
                    ...move,
                    duration: 1000,
                    onUpdate: () => {
                        if (move.direction === 'left') {
                            player.anims.play('left', true);
                        } else if (move.direction === 'right') {
                            player.anims.play('right', true);
                        } else {
                            player.anims.play('turn');
                        }
                    },
                    onComplete: resolve
                });
            });
        }
    };

    // Start demo after a short delay
    this.time.delayedCall(1000, () => playDemo());

    // Stop demo when player uses controls
    const stopDemo = () => {
        demoComplete = true;
        this.tweens.killAll();
        instructionText.destroy();
    };

    this.input.keyboard.once('keydown-LEFT', stopDemo);
    this.input.keyboard.once('keydown-RIGHT', stopDemo);
    this.input.keyboard.once('keydown-UP', stopDemo);
    this.input.keyboard.once('keydown-DOWN', stopDemo);

    // Set up keyboard input
    cursors = this.input.keyboard.createCursorKeys();

    // Add research zones
    const zones = [
        { name: 'Continental rifting', page: 'rift/rift.html', corner: 'topLeft' },
        { name: 'Coastal flooding', page: 'flooding/flooding.html', corner: 'topRight' },
        { name: 'Groundwater subsidence', page: 'groundwater/groundwater.html', corner: 'bottomLeft' },
        { name: 'Earthquakes and faulting', page: 'faulting/faulting.html', corner: 'bottomRight' }
    ];

    // Calculate background bounds
    const bgBounds = {
        left: bg.x,
        right: bg.x + (bg.width * bg.scale),
        top: bg.y,
        bottom: bg.y + (bg.height * bg.scale)
    };

    // Calculate zone size as 1/6 of background dimensions
    const bgDisplayWidth = bg.width * bg.scale;
    const bgDisplayHeight = bg.height * bg.scale;
    const zoneWidth = bgDisplayWidth / 5.5;
    const zoneHeight = bgDisplayHeight / 5.5;

    zones.forEach(zone => {
        // Calculate zone position based on corner
        let x, y;
        switch (zone.corner) {
            case 'topLeft':
                x = bgBounds.left + zoneWidth;
                y = bgBounds.top + zoneHeight;
                break;
            case 'topRight':
                x = bgBounds.right - zoneWidth;
                y = bgBounds.top + zoneHeight;
                break;
            case 'bottomLeft':
                x = bgBounds.left + zoneWidth;
                y = bgBounds.bottom - zoneHeight;
                break;
            case 'bottomRight':
                x = bgBounds.right - zoneWidth;
                y = bgBounds.bottom - zoneHeight;
                break;
        }

        // Create single rectangle with border and transparency
        const rect = this.add.rectangle(x, y, zoneWidth * 2, zoneHeight * 2, 0x000000, 0.2);
        rect.setStrokeStyle(1, 0xFFFFFF);  // Add white border to the same rectangle
        rect.setInteractive();
        
        // Add text centered in the rectangle
        const text = this.add.text(x, y, zone.name, {
            fontSize: Math.max(16, Math.min(zoneWidth / 15, 24)) + 'px', // Responsive font size
            fill: '#fff',
            backgroundColor: '#000000aa',
            padding: { x: 10, y: 5 }
        });
        text.setOrigin(0.5);

        // Add physics and collision detection
        this.physics.add.existing(rect, true);
        this.physics.add.overlap(player, rect, () => {
            // Calculate return position just outside the zone
            let returnX = player.x;
            let returnY = player.y;
            const buffer = 50;  // Distance to place player from zone edge
            
            switch (zone.corner) {
                case 'topLeft':
                    returnX = x + zoneWidth + buffer;  // Always place to the right
                    returnY = y + zoneHeight + buffer;  // and below
                    break;
                case 'topRight':
                    returnX = x - zoneWidth - buffer;  // Always place to the left
                    returnY = y + zoneHeight + buffer;  // and below
                    break;
                case 'bottomLeft':
                    returnX = x + zoneWidth + buffer;  // Always place to the right
                    returnY = y - zoneHeight - buffer;  // and above
                    break;
                case 'bottomRight':
                    returnX = x - zoneWidth - buffer;  // Always place to the left
                    returnY = y - zoneHeight - buffer;  // and above
                    break;
            }
            
            localStorage.setItem('lastPlayerX', returnX);
            localStorage.setItem('lastPlayerY', returnY);
            localStorage.setItem('lastZone', zone.name);
            window.location.href = zone.page;
        }, null, this);
    });

    // Check if player is spawning inside any zone and adjust if needed
    function adjustPlayerPosition() {
        zones.forEach(zone => {
            const zoneRect = new Phaser.Geom.Rectangle(
                zone.x - zoneWidth,
                zone.y - zoneHeight,
                zoneWidth * 2,
                zoneHeight * 2
            );
            
            if (Phaser.Geom.Rectangle.Contains(zoneRect, player.x, player.y)) {
                // Move player to center of screen if spawning in a zone
                player.x = panelWidth + ((this.scale.width - panelWidth) / 2);
                player.y = this.scale.height / 2;
            }
        });
    }

    // Call position adjustment after player creation
    adjustPlayerPosition.call(this);

    // Handle window resize
    this.scale.on('resize', (gameSize) => {
        const width = gameSize.width;
        const height = gameSize.height;
        
        // Update panel width
        const panelWidth = width * 0.2;
        description.setWordWrapWidth(panelWidth - 40);
        linkText.setWordWrapWidth(panelWidth - 40);
        
        // Rescale background
        const scaleX = (width - panelWidth) / bg.width;
        const scaleY = height / bg.height;
        const scale = Math.min(scaleX, scaleY);
        bg.setScale(scale);
        bg.x = panelWidth + ((width - panelWidth - bg.width * scale) / 2);
        bg.y = (height - bg.height * scale) / 2;
    });
}

function update() {
    if (!cursors) return;

    const speed = 160;

    // Reset velocity
    player.setVelocity(0);

    // Handle movement
    if (cursors.left.isDown) {
        player.setVelocityX(-speed);
        player.anims.play('left', true);
    }
    else if (cursors.right.isDown) {
        player.setVelocityX(speed);
        player.anims.play('right', true);
    }
    else {
        player.anims.play('turn');
    }

    if (cursors.up.isDown) {
        player.setVelocityY(-speed);
    }
    else if (cursors.down.isDown) {
        player.setVelocityY(speed);
    }
}