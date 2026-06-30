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

// Core game state
let game = new Phaser.Game(config);
let player;
let platforms;
let cursors;
let background;

// Player state
let jumpVelocity = -200;
let hasRocketPack = false;
let rocketPack;
let hasAirJumped = false;

// Lives & respawn
let lives = 3;
let isInvincible = false;
let respawnX = 150;
let respawnY = 0;

// UFO enemy
let snake;
let snakeSpeed = 50;
let gameOver = false;
let attackMode = false;
let patrolPoint = null;

// Bullets
let bullets;
let lastBulletTime = 0;

// Collectibles
let collectedCount = 0;
const TOTAL_COLLECTIBLES = 10;

// HUD
let instructionText;
let livesDisplay;
let dataText;


function preload() {
    this.load.text('bioText', 'bio.txt');

    this.load.spritesheet('player-idle',
        'robot/Destroyer/Idle.png',
        { frameWidth: 127, frameHeight: 78, margin: 0, spacing: 0 }
    );
    this.load.spritesheet('player-walk',
        'robot/Destroyer/Walk.png',
        { frameWidth: 127, frameHeight: 78, margin: 0, spacing: 0 }
    );

    this.load.image('ground', 'platform.png');
    this.load.image('background', 'https://labs.phaser.io/assets/skies/space3.png');
    this.load.image('rocketpack', 'rocketpack2.webp');
    this.load.image('sar',         'insar/sar_sat.webp');
    this.load.image('flooding',    'flooding/flooding.webp');
    this.load.image('groundwater', 'groundwater/groundwater.webp');
    this.load.image('tectonics',   'tectonics/tectonics.webp');
    this.load.image('snake', 'ufo.png');
}


function create() {
    const forceMobile = false;
    const isMobile = forceMobile || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // --- Generate runtime textures ---
    const bg = this.make.graphics({ x: 0, y: 0, add: false });
    bg.fillStyle(0xff4422, 1);
    bg.fillCircle(6, 6, 6);
    bg.generateTexture('bullet', 12, 12);
    bg.destroy();

    const cg = this.make.graphics({ x: 0, y: 0, add: false });
    cg.fillStyle(0x00ffff, 1);
    cg.fillCircle(8, 8, 7);
    cg.fillStyle(0xffffff, 0.6);
    cg.fillCircle(6, 6, 3);
    cg.generateTexture('collectible', 16, 16);
    cg.destroy();

    // --- Background ---
    background = this.add.image(this.scale.width / 2, this.scale.height / 2, 'background');
    background.setOrigin(0.5);
    const bgScaleX = this.scale.width  / background.width;
    const bgScaleY = this.scale.height / background.height;
    background.setScale(Math.max(bgScaleX, bgScaleY) * 1.1);
    background.setScrollFactor(0);
    background.setTint(0x888888);

    // --- Bio panel ---
    const panelWidth  = this.scale.width * 0.22;
    const panelPadding = 20;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x000510, 0.75);
    panelBg.fillRect(0, 0, panelWidth + panelPadding * 2, this.scale.height);
    panelBg.lineStyle(1, 0x00ffff, 0.2);
    panelBg.lineBetween(panelWidth + panelPadding * 2, 0, panelWidth + panelPadding * 2, this.scale.height);
    panelBg.setScrollFactor(0);
    panelBg.setDepth(0);

    const descriptionText = this.cache.text.get('bioText');
    const description = this.add.text(panelPadding * 2, panelPadding * 2, descriptionText, {
        fontSize: '14px',
        fill: '#b0b8c8',
        wordWrap: { width: panelWidth - (panelPadding * 3) },
        lineSpacing: 8
    });
    description.setScrollFactor(0);
    description.setDepth(1);

    const scholarLink = this.add.text(
        panelPadding * 2, description.y + description.height + 16,
        'Publications on Google Scholar ↗',
        { fontSize: '13px', fill: '#00ffff', wordWrap: { width: panelWidth - (panelPadding * 3) } }
    );
    scholarLink.setScrollFactor(0);
    scholarLink.setDepth(1);
    scholarLink.setInteractive({ useHandCursor: true });
    scholarLink.on('pointerdown', () => {
        window.open('https://scholar.google.com/citations?user=A-FaALkAAAAJ&hl=en', '_blank');
    });
    scholarLink.on('pointerover', () => scholarLink.setStyle({ fill: '#ffffff' }));
    scholarLink.on('pointerout',  () => scholarLink.setStyle({ fill: '#00ffff' }));

    // --- Instruction text ---
    instructionText = this.add.text(
        panelWidth + panelPadding * 2, this.scale.height - 44,
        '← → move  |  ↑ jump (double-jump in air!)  |  SPACE enter platform  |  Avoid the UFO!',
        { fontSize: '13px', fill: '#8899aa', stroke: '#000', strokeThickness: 2 }
    );
    instructionText.setScrollFactor(0);
    instructionText.setDepth(10);

    // --- HUD: lives & data ---
    livesDisplay = this.add.text(this.scale.width - 20, 16, '♥ ♥ ♥', {
        fontSize: '22px', fill: '#ff4466', stroke: '#000', strokeThickness: 2
    });
    livesDisplay.setOrigin(1, 0);
    livesDisplay.setScrollFactor(0);
    livesDisplay.setDepth(10);

    dataText = this.add.text(this.scale.width - 20, 46, `Data: 0/${TOTAL_COLLECTIBLES}`, {
        fontSize: '13px', fill: '#00ffff', stroke: '#000', strokeThickness: 2
    });
    dataText.setOrigin(1, 0);
    dataText.setScrollFactor(0);
    dataText.setDepth(10);

    // --- Platforms ---
    platforms = this.physics.add.staticGroup();
    const groundY = this.scale.height - 32;
    respawnY = groundY;

    // Decorative ground segments near the start
    const segments = [
        { x: 150,  width: 0.3                   },  // starting platform
        { x: -100, width: 0.3, y: groundY - 50  },  // left raised (reachable by going left)
    ];
    segments.forEach(seg => {
        const p = platforms.create(seg.x, seg.y || groundY, 'ground');
        p.setScale(seg.width, 0.1);
        p.refreshBody();
        p.startY = seg.y || groundY;
        this.tweens.add({
            targets: p, y: p.startY - 5,
            duration: 1500 + Math.random() * 1000,
            yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut',
            delay: Math.random() * 1000,
            onUpdate: () => p.refreshBody()
        });
    });

    // --- Research zone platforms ---
    // Layout: InSAR at ground level → Flooding up-right → Groundwater further right
    //         Tectonics is ABOVE Flooding (jump up, not right — the surprise)
    //         Secret platform far right from Groundwater
    // Platforms are spaced so you can't see the next one until you travel there.
    const platformWidth  = 200;
    const platformHeight = 30;

    const zoneData = [
        { x: 750,  y: groundY,       name: 'InSAR\nmethodology',     page: 'insar/insar.html'             },
        { x: 1300, y: groundY - 130, name: 'Coastal\nflooding',       page: 'flooding/flooding.html'       },
        { x: 1900, y: groundY - 200, name: 'Groundwater\nsubsidence', page: 'groundwater/groundwater.html' },
        { x: 1300, y: groundY - 320, name: 'Tectonics',               page: 'tectonics/tectonics.html'     },
        { x: 2500, y: groundY - 200, name: 'Original\nWebsite',       page: 'original_site/index.html',  isSecret: true },
    ];

    // Narrow stepping stones between zones — spaced so jumping is needed
    const stepStones = [
        { x: 500,  y: groundY - 50  },   // gap between start and InSAR
        { x: 1000, y: groundY - 70  },   // InSAR → Flooding
        { x: 1580, y: groundY - 165 },   // Flooding → Groundwater
        { x: 1300, y: groundY - 225 },   // Flooding → Tectonics (intermediate)
        { x: 2200, y: groundY - 200 },   // Groundwater → Secret
    ];
    stepStones.forEach(ss => {
        const p = platforms.create(ss.x, ss.y, 'ground');
        p.setScale(100 / p.width, platformHeight / p.height);
        p.refreshBody();
        p.startY = ss.y;
        p.setAlpha(0.5);
        this.tweens.add({
            targets: p, y: ss.y - 5,
            duration: 1500 + Math.random() * 1000,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            delay: Math.random() * 1000,
            onUpdate: () => p.refreshBody()
        });
    });

    zoneData.forEach(zone => {
        const platform = platforms.create(zone.x, zone.y, 'ground');
        platform.setScale(platformWidth / platform.width, platformHeight / platform.height);
        platform.refreshBody();
        platform.zoneName = zone.name;
        platform.page     = zone.page;
        platform.isSecret = zone.isSecret || false;
        platform.startY   = zone.y;
        platform.setDepth(2);

        // Clean label — no background box, just stroked text
        const labelColor = zone.isSecret ? '#ffdd00' : '#ffffff';
        const text = this.add.text(zone.x, zone.y - 42, zone.name, {
            fontSize: '15px',
            fill: labelColor,
            stroke: '#000',
            strokeThickness: 4,
            align: 'center'
        });
        text.setOrigin(0.5);
        text.setDepth(3);
        text.setInteractive({ useHandCursor: true });
        text.on('pointerdown', () => { window.location.href = zone.page; });
        text.on('pointerover', () => text.setStyle({ fill: '#00ffff' }));
        text.on('pointerout',  () => text.setStyle({ fill: labelColor }));

        // Floating animation synced with label
        this.tweens.add({
            targets: platform, y: zone.y - 5,
            duration: 1500 + Math.random() * 1000,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            delay: Math.random() * 1000,
            onUpdate: () => {
                platform.refreshBody();
                text.y = platform.y - 42;
            }
        });

        // Secret platform: show hint only when player lands on it
        if (zone.isSecret) {
            const hintText = this.add.text(zone.x, zone.y - 80,
                '✦ Secret area! ✦', {
                    fontSize: '13px', fill: '#ffdd00', stroke: '#000',
                    strokeThickness: 3, align: 'center'
                }
            );
            hintText.setOrigin(0.5);
            hintText.setDepth(5);
            hintText.setAlpha(0);
            platform.hintText = hintText;
        }
    });

    // --- Player ---
    player = this.physics.add.sprite(150, this.scale.height - 150, 'player-idle');
    player.setBounce(0.2);
    player.setCollideWorldBounds(false);
    player.setScale(0.85);
    player.body.setSize(80, 70);
    player.body.setOffset(24, 8);

    // Return-from-zone: restore position and rocket pack
    const lastPlatform = localStorage.getItem('lastPlatform');
    if (lastPlatform) {
        const zone = zoneData.find(z => z.name === lastPlatform);
        if (zone) {
            player.x = zone.x;
            player.y = zone.y - 50;
            respawnX  = zone.x;
            respawnY  = zone.y;
            hasRocketPack = true;
            jumpVelocity  = -350;
            player.setTint(0xffff00);
            this.cameras.main.centerOn(player.x, player.y);
        }
    }

    this.physics.world.setBounds(-500, -500, 3500, this.scale.height * 2 + 500);

    // --- Rocket pack ---
    rocketPack = this.physics.add.sprite(210, groundY - 80, 'rocketpack');
    rocketPack.setScale(0.035);
    rocketPack.body.setAllowGravity(false);
    if (hasRocketPack) {
        rocketPack.setVisible(false);
        rocketPack.body.enable = false;
    }
    rocketPack.setInteractive({ useHandCursor: true });
    rocketPack.on('pointerover', function() { this.setTint(0x00ffff); });
    rocketPack.on('pointerout',  function() { this.clearTint(); });
    rocketPack.on('pointerdown', function() { collectRocketPack(player, this); });

    this.tweens.add({
        targets: rocketPack, y: groundY - 95,
        duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    this.physics.add.overlap(player, rocketPack, collectRocketPack);

    function collectRocketPack(player, rocket) {
        if (!hasRocketPack) {
            hasRocketPack = true;
            jumpVelocity  = -350;
            rocket.destroy();
            player.setTint(0xffff00);
            instructionText.setText('Rocket pack! ↑ to jump higher, double-tap ↑ for double-jump  |  SPACE enter platform');
        }
    }

    // --- Bullets group ---
    bullets = this.physics.add.group();
    this.physics.add.overlap(player, bullets, (player, bullet) => {
        bullet.destroy();
        loseLife(this);
    }, null, this);

    // --- Collectibles scattered around the level ---
    const collectibles = this.physics.add.group();
    const collectiblePositions = [
        { x: 320,  y: groundY - 140 },  // near start
        { x: 640,  y: groundY - 120 },  // on the way to InSAR
        { x: 900,  y: groundY - 80  },  // just right of InSAR
        { x: 1150, y: groundY - 180 },  // approaching Flooding
        { x: 1300, y: groundY - 240 },  // above Flooding platform
        { x: 1450, y: groundY - 130 },  // right of Flooding
        { x: 1700, y: groundY - 220 },  // midway to Groundwater
        { x: 1300, y: groundY - 440 },  // high above Tectonics — hardest!
        { x: 2100, y: groundY - 170 },  // approaching Secret
        { x: 370,  y: groundY - 260 },  // floats above start, needs double-jump
    ];
    collectiblePositions.forEach(pos => {
        const c = collectibles.create(pos.x, pos.y, 'collectible');
        c.body.setAllowGravity(false);
        c.setDepth(4);
        this.tweens.add({
            targets: c, y: pos.y - 12,
            duration: 800 + Math.random() * 400,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });
    });
    this.physics.add.overlap(player, collectibles, (player, collectible) => {
        collectible.destroy();
        collectedCount++;
        dataText.setText(`Data: ${collectedCount}/${TOTAL_COLLECTIBLES}`);
        this.cameras.main.flash(80, 0, 200, 200, false);
        if (collectedCount === TOTAL_COLLECTIBLES) {
            this.cameras.main.flash(600, 0, 255, 150, false);
            this.cameras.main.shake(400, 0.008);
            lives = Math.min(lives + 1, 4);
            updateLivesDisplay();

            const celebText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 20,
                '★  ALL DATA COLLECTED!  ★\nYou are a true scientist.\n+1 LIFE', {
                    fontSize: '26px', fill: '#00ffff',
                    stroke: '#000', strokeThickness: 5,
                    align: 'center', lineSpacing: 8
                }
            );
            celebText.setOrigin(0.5);
            celebText.setScrollFactor(0);
            celebText.setDepth(20);
            celebText.setAlpha(0);
            this.tweens.add({
                targets: celebText, alpha: 1, y: this.scale.height / 2 - 10,
                duration: 350, ease: 'Back.easeOut',
                onComplete: () => {
                    this.time.delayedCall(3200, () => {
                        this.tweens.add({
                            targets: celebText, alpha: 0, duration: 700,
                            onComplete: () => celebText.destroy()
                        });
                    });
                }
            });
        }
    }, null, this);

    // --- Player animations ---
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('player-walk', { start: 0, end: 4 }),
        frameRate: 10, repeat: -1
    });
    this.anims.create({
        key: 'turn',
        frames: this.anims.generateFrameNumbers('player-idle', { start: 0, end: 4 }),
        frameRate: 10, repeat: -1
    });
    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('player-walk', { start: 0, end: 4 }),
        frameRate: 10, repeat: -1
    });

    player.on('animationupdate', function() {
        if (cursors.left.isDown)       player.setFlipX(true);
        else if (cursors.right.isDown) player.setFlipX(false);
    });

    // --- Platform collider ---
    this.physics.add.collider(player, platforms, (player, platform) => {
        if (player.body.touching.down) {
            // Update checkpoint when standing on research platform
            if (platform.zoneName) {
                respawnX = platform.x;
                respawnY = platform.y;

                // Show secret hint once
                if (platform.isSecret && platform.hintText && platform.hintText.alpha < 0.1) {
                    this.tweens.add({ targets: platform.hintText, alpha: 1, duration: 400 });
                    this.time.delayedCall(4000, () => {
                        if (platform.hintText) {
                            this.tweens.add({ targets: platform.hintText, alpha: 0, duration: 600 });
                        }
                    });
                }
            }

            // Zone entry via spacebar
            if (cursors.space.isDown && platform.zoneName) {
                localStorage.setItem('lastPlatform', platform.zoneName);
                window.location.href = platform.page;
            }
        }
    });

    // --- Keyboard input ---
    cursors = this.input.keyboard.createCursorKeys();

    // --- Camera ---
    if (isMobile) {
        this.cameras.main.startFollow(player, true, 0.05, 0.05);
        this.cameras.main.setZoom(0.7);
        this.cameras.main.setDeadzone(100, 70);
    } else {
        this.cameras.main.startFollow(player, true, 0.08, 0.08);
        this.cameras.main.setZoom(1.0);
        this.cameras.main.setDeadzone(80, 50);
    }

    platforms.children.iterate(p => { if (p) p.setAlpha(0.8); });

    // --- Copyright ---
    const copyrightText = this.add.text(10, this.scale.height - 30, '© 2026 Kyle Murray', {
        fontSize: '10px', fill: '#fff', stroke: '#000', strokeThickness: 2
    });
    copyrightText.setScrollFactor(0);
    copyrightText.setDepth(10);

    // --- Mobile controls ---
    this.mobileControls = {
        left:   { isPressed: false },
        right:  { isPressed: false },
        jump:   { isPressed: false },
        action: { isPressed: false }
    };

    if (isMobile) {
        const screenWidth  = this.scale.width;
        const screenHeight = this.scale.height;
        const buttonSize = Math.min(screenWidth * 0.12, 90);
        const safeAreaBottom = getSafeAreaBottom();
        const baseBottomMargin = Math.max(screenHeight * 0.15, 120);
        const buttonY = screenHeight - baseBottomMargin - safeAreaBottom;
        const buttonSpacing = Math.min(screenWidth * 0.15, 120);
        const iconScale = buttonSize / 80;

        function makeButton(fillFn) {
            const btn = this.add.graphics();
            btn.fillStyle(0x333333, 0.7);
            btn.fillRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, buttonSize * 0.125);
            fillFn(btn);
            btn.setScrollFactor(0);
            btn.setInteractive(
                new Phaser.Geom.Rectangle(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize),
                Phaser.Geom.Rectangle.Contains
            );
            return btn;
        }

        const leftBtn = this.add.graphics();
        leftBtn.fillStyle(0x333333, 0.7);
        leftBtn.fillRoundedRect(-buttonSize/2, -buttonSize/2, buttonSize, buttonSize, buttonSize*0.125);
        leftBtn.fillStyle(0xffffff, 1);
        leftBtn.fillTriangle(-20*iconScale, 0, 5*iconScale, -15*iconScale, 5*iconScale, 15*iconScale);
        leftBtn.x = Math.max(buttonSpacing, buttonSize);
        leftBtn.y = buttonY;
        leftBtn.setScrollFactor(0);
        leftBtn.setInteractive(new Phaser.Geom.Rectangle(-buttonSize/2, -buttonSize/2, buttonSize, buttonSize), Phaser.Geom.Rectangle.Contains);

        const rightBtn = this.add.graphics();
        rightBtn.fillStyle(0x333333, 0.7);
        rightBtn.fillRoundedRect(-buttonSize/2, -buttonSize/2, buttonSize, buttonSize, buttonSize*0.125);
        rightBtn.fillStyle(0xffffff, 1);
        rightBtn.fillTriangle(20*iconScale, 0, -5*iconScale, -15*iconScale, -5*iconScale, 15*iconScale);
        rightBtn.x = Math.max(buttonSpacing*2, buttonSize*2.5);
        rightBtn.y = buttonY;
        rightBtn.setScrollFactor(0);
        rightBtn.setInteractive(new Phaser.Geom.Rectangle(-buttonSize/2, -buttonSize/2, buttonSize, buttonSize), Phaser.Geom.Rectangle.Contains);

        const jumpBtn = this.add.graphics();
        jumpBtn.fillStyle(0x333333, 0.7);
        jumpBtn.fillRoundedRect(-buttonSize/2, -buttonSize/2, buttonSize, buttonSize, buttonSize*0.125);
        jumpBtn.fillStyle(0xffffff, 1);
        jumpBtn.fillTriangle(0, -20*iconScale, -15*iconScale, 5*iconScale, 15*iconScale, 5*iconScale);
        jumpBtn.x = Math.min(screenWidth - buttonSpacing*2, screenWidth - buttonSize*2.5);
        jumpBtn.y = buttonY;
        jumpBtn.setScrollFactor(0);
        jumpBtn.setInteractive(new Phaser.Geom.Rectangle(-buttonSize/2, -buttonSize/2, buttonSize, buttonSize), Phaser.Geom.Rectangle.Contains);

        const actionBtn = this.add.graphics();
        actionBtn.fillStyle(0x333333, 0.7);
        actionBtn.fillRoundedRect(-buttonSize/2, -buttonSize/2, buttonSize, buttonSize, buttonSize*0.125);
        actionBtn.fillStyle(0xffffff, 1);
        actionBtn.fillCircle(0, 0, 15*iconScale);
        actionBtn.x = Math.min(screenWidth - buttonSpacing, screenWidth - buttonSize);
        actionBtn.y = buttonY;
        actionBtn.setScrollFactor(0);
        actionBtn.setInteractive(new Phaser.Geom.Rectangle(-buttonSize/2, -buttonSize/2, buttonSize, buttonSize), Phaser.Geom.Rectangle.Contains);

        const mc = this.mobileControls;
        leftBtn.on('pointerdown',  () => { mc.left.isPressed  = true;  leftBtn.setAlpha(0.5);   });
        leftBtn.on('pointerup',    () => { mc.left.isPressed  = false; leftBtn.setAlpha(1);     });
        leftBtn.on('pointerout',   () => { mc.left.isPressed  = false; leftBtn.setAlpha(1);     });
        rightBtn.on('pointerdown', () => { mc.right.isPressed = true;  rightBtn.setAlpha(0.5);  });
        rightBtn.on('pointerup',   () => { mc.right.isPressed = false; rightBtn.setAlpha(1);    });
        rightBtn.on('pointerout',  () => { mc.right.isPressed = false; rightBtn.setAlpha(1);    });
        jumpBtn.on('pointerdown',  () => { mc.jump.isPressed  = true;  jumpBtn.setAlpha(0.5);   });
        jumpBtn.on('pointerup',    () => { mc.jump.isPressed  = false; jumpBtn.setAlpha(1);     });
        jumpBtn.on('pointerout',   () => { mc.jump.isPressed  = false; jumpBtn.setAlpha(1);     });
        actionBtn.on('pointerdown',() => { mc.action.isPressed= true;  actionBtn.setAlpha(0.5); });
        actionBtn.on('pointerup',  () => { mc.action.isPressed= false; actionBtn.setAlpha(1);   });
        actionBtn.on('pointerout', () => { mc.action.isPressed= false; actionBtn.setAlpha(1);   });
    }

    // --- UFO ---
    createSnake(this);
    this.physics.add.overlap(player, snake, playerHitBySnake, null, this);

    // UFO gets faster over time
    this.time.addEvent({
        delay: 25000,
        callback: () => { if (!gameOver) snakeSpeed = Math.min(snakeSpeed + 12, 130); },
        loop: true
    });

    // Directional hint on first visit
    if (!localStorage.getItem('lastPlatform')) {
        const dirHint = this.add.text(
            this.scale.width * 0.5, this.scale.height * 0.4,
            'Explore to the right →\nGrab the rocket pack first!',
            { fontSize: '15px', fill: '#00ffff', stroke: '#000', strokeThickness: 2, align: 'center' }
        );
        dirHint.setOrigin(0.5);
        dirHint.setScrollFactor(0);
        dirHint.setDepth(10);
        this.tweens.add({
            targets: dirHint, alpha: 0, delay: 5000, duration: 3000,
            onComplete: () => dirHint.destroy()
        });
    }
}


// --- UFO creation & AI ---

function createSnake(scene) {
    const gfx = scene.add.graphics();
    gfx.fillStyle(0x00ff00, 1);
    gfx.fillTriangle(0, -8, 16, 0, 0, 8);
    gfx.fillStyle(0xff0000, 1);
    gfx.fillCircle(4, -3, 2);
    gfx.generateTexture('snake', 20, 16);
    gfx.destroy();

    const x = Phaser.Math.Between(100, scene.scale.width - 100);
    const y = Phaser.Math.Between(50, scene.scale.height / 2);

    snake = scene.physics.add.sprite(x, y, 'snake');
    snake.setCollideWorldBounds(false);
    snake.setScale(0.06);
    snake.body.setAllowGravity(false);
    snake.body.setSize(snake.width * 0.8, snake.height * 0.8);

    startBehaviorSwitchTimer(scene);

    // UFO fires bullets periodically
    scene.time.addEvent({
        delay: 3500,
        callback: () => {
            if (!gameOver && snake && snake.active) {
                fireBullet(scene);
            }
        },
        loop: true
    });
}

function fireBullet(scene) {
    if (gameOver || !snake || !player || !bullets) return;
    const bullet = bullets.create(snake.x, snake.y, 'bullet');
    if (!bullet) return;
    bullet.body.setAllowGravity(false);
    bullet.setDepth(5);
    const angle = Phaser.Math.Angle.Between(snake.x, snake.y, player.x, player.y);
    const speed = 130;
    bullet.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    // Bullets expire after 5 seconds
    scene.time.delayedCall(5000, () => {
        if (bullet && bullet.active) bullet.destroy();
    });
}

function startBehaviorSwitchTimer(scene) {
    scene.time.delayedCall(
        Phaser.Math.Between(10000, 20000),
        () => {
            attackMode = !attackMode;
            if (!attackMode) {
                patrolPoint = {
                    x: Phaser.Math.Between(100, scene.scale.width - 100),
                    y: Phaser.Math.Between(50, scene.scale.height - 100)
                };
            }
            if (!gameOver) startBehaviorSwitchTimer(scene);
        }
    );
}

function updateSnakeMovement(scene) {
    if (gameOver || !snake) { if (snake) snake.setVelocity(0, 0); return; }

    let targetX, targetY;
    if (attackMode) {
        targetX = player.x;
        targetY = player.y;
    } else {
        if (!patrolPoint ||
            (Math.abs(snake.x - patrolPoint.x) < 50 && Math.abs(snake.y - patrolPoint.y) < 50)) {
            patrolPoint = {
                x: Phaser.Math.Between(100, scene.scale.width - 100),
                y: Phaser.Math.Between(50, scene.scale.height - 100)
            };
        }
        targetX = patrolPoint.x;
        targetY = patrolPoint.y;
    }

    const dx = targetX - snake.x;
    const dy = targetY - snake.y;
    const angle = Math.atan2(dy, dx);
    const speed = attackMode ? snakeSpeed : snakeSpeed * 0.7;
    snake.setVelocityX(Math.cos(angle) * speed);
    snake.setVelocityY(Math.sin(angle) * speed);
    snake.setFlipX(dx < 0);
}

function playerHitBySnake(player, snakeSprite) {
    snakeSprite.setVelocity(0, 0);
    loseLife(this);
}


// --- Lives / respawn ---

function loseLife(scene) {
    if (isInvincible || gameOver) return;
    lives--;
    updateLivesDisplay();

    if (lives <= 0) {
        gameOver = true;
        player.setTint(0xff0000);
        if (snake) snake.setVelocity(0, 0);
        scene.time.delayedCall(1000, () => {
            localStorage.clear();
            window.location.href = 'death.html';
        });
        return;
    }

    // Respawn at last checkpoint with invincibility
    isInvincible = true;
    player.setPosition(respawnX, respawnY - 100);
    player.setVelocity(0, 0);
    player.setAlpha(1);

    // Flash effect
    scene.tweens.add({
        targets: player, alpha: 0,
        duration: 140, yoyo: true, repeat: 9,
        onComplete: () => {
            player.setAlpha(1);
            isInvincible = false;
            if (hasRocketPack) player.setTint(0xffff00);
            else player.clearTint();
        }
    });

    // Camera shake
    scene.cameras.main.shake(300, 0.01);
}

function updateLivesDisplay() {
    const full  = '♥ '.repeat(Math.max(lives, 0)).trim();
    const empty = '♡ '.repeat(Math.max(3 - lives, 0)).trim();
    livesDisplay.setText([full, empty].filter(Boolean).join(' '));
}


// --- Safe-area utility ---
function getSafeAreaBottom() {
    if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('padding-bottom', 'env(safe-area-inset-bottom)')) {
        const el = document.createElement('div');
        el.style.cssText = 'position:fixed;bottom:0;left:0;width:1px;height:1px;padding-bottom:env(safe-area-inset-bottom);visibility:hidden';
        document.body.appendChild(el);
        const val = parseInt(getComputedStyle(el).paddingBottom) || 0;
        document.body.removeChild(el);
        return val;
    }
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('iphone')) return window.screen.height >= 812 ? 34 : 20;
    if (ua.includes('android')) return 24;
    return 20;
}


// --- Main game loop ---

function update() {
    if (gameOver) return;

    const forceMobile = false;
    const isMobile = forceMobile || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Reset air jump when grounded
    if (player.body.touching.down) {
        hasAirJumped = false;
    }

    if (isMobile) {
        const mobileSpeed = 180;

        if (this.mobileControls.left.isPressed && this.mobileControls.right.isPressed) {
            player.setVelocityX(0);
            player.anims.play('turn');
        } else if (this.mobileControls.left.isPressed) {
            player.setVelocityX(-mobileSpeed);
            player.anims.play('left', true);
        } else if (this.mobileControls.right.isPressed) {
            player.setVelocityX(mobileSpeed);
            player.anims.play('right', true);
        } else {
            const vx = player.body.velocity.x;
            player.setVelocityX(Math.abs(vx) > 10 ? vx * 0.8 : 0);
            if (Math.abs(vx) <= 10) player.anims.play('turn');
        }

        // Double-jump for mobile
        if (this.mobileControls.jump.isPressed && !this.jumpCooldown) {
            if (player.body.touching.down) {
                const v = hasRocketPack ? jumpVelocity * 0.9 : jumpVelocity * 1.1;
                player.setVelocityY(v);
                hasAirJumped = false;
                this.jumpCooldown = true;
                this.time.delayedCall(200, () => { this.jumpCooldown = false; });
            } else if (!hasAirJumped) {
                player.setVelocityY(jumpVelocity * 0.85);
                hasAirJumped = true;
                this.jumpCooldown = true;
                this.time.delayedCall(200, () => { this.jumpCooldown = false; });
            }
        }
        if (hasRocketPack) player.setTint(0xffff00);

        // Zone entry
        if (this.mobileControls.action.isPressed && player.body.touching.down) {
            platforms.children.iterate(p => {
                if (p && p.zoneName &&
                    Phaser.Geom.Intersects.RectangleToRectangle(player.getBounds(), p.getBounds())) {
                    localStorage.setItem('lastPlatform', p.zoneName);
                    window.location.href = p.page;
                }
            });
        }

    } else {
        // Desktop movement
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

        // Double-jump: fire on leading edge of up key
        const upJustPressed = cursors.up.isDown && !this.prevUpKey;
        this.prevUpKey = cursors.up.isDown;

        if (upJustPressed) {
            if (player.body.touching.down) {
                player.setVelocityY(jumpVelocity);
                hasAirJumped = false;
                if (hasRocketPack) player.setTint(0xffff00);
            } else if (!hasAirJumped) {
                player.setVelocityY(jumpVelocity * 0.85);
                hasAirJumped = true;
                if (hasRocketPack) player.setTint(0xffff00);
            } else if (!this.jumpSpentHint) {
                // Third jump attempt: show brief "no more jumps" flash
                this.jumpSpentHint = true;
                const hint = this.add.text(player.x, player.y - 40, 'land to jump again',
                    { fontSize: '12px', fill: '#ff8844', stroke: '#000', strokeThickness: 2 }
                );
                hint.setOrigin(0.5);
                hint.setDepth(20);
                this.tweens.add({
                    targets: hint, alpha: 0, y: hint.y - 20, duration: 900,
                    onComplete: () => { hint.destroy(); this.jumpSpentHint = false; }
                });
            }
        }

        // Zone entry via spacebar
        if (cursors.space.isDown && player.body.touching.down) {
            platforms.children.iterate(p => {
                if (p && p.zoneName &&
                    Phaser.Geom.Intersects.RectangleToRectangle(player.getBounds(), p.getBounds())) {
                    localStorage.setItem('lastPlatform', p.zoneName);
                    window.location.href = p.page;
                }
            });
        }
    }

    // UFO movement
    if (snake && player) updateSnakeMovement(this);

    // Fell out of world → lose a life and respawn at checkpoint
    if (player.y > this.scale.height * 2 || player.y < -600 || player.x < -600) {
        loseLife(this);
    }
}
