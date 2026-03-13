import { Direction, GRID_SIZE, TileType } from '../constants/game';

export interface Position {
    x: number;
    y: number;
}

export enum TankType {
    BASIC = 'BASIC', // Red
    FAST = 'FAST',  // Orange
    POWER = 'POWER' // Gray + Star
}

export interface Tank {
    id: string;
    pos: Position;
    dir: Direction;
    type?: TankType;
    isPlayer: boolean;
    isDestroyed: boolean;
    cooldown: number;
    speed: number;
    maxBullets: number;
    isMoving: boolean;
    mission?: 'EXPLORE' | 'ATTACK';
}

export interface Bullet {
    id: string;
    pos: Position;
    dir: Direction;
    ownerId: string;
}

export interface Explosion {
    id: string;
    pos: Position;
    life: number; // 1.0 to 0
}

export enum PowerUpType {
    HELMET = 'HELMET',
    BOMB = 'BOMB',
    SPEED = 'SPEED',
    SEEKER = 'SEEKER'
}

export interface PowerUp {
    id: string;
    pos: Position;
    type: PowerUpType;
    life: number; // 600 frames = 10s
}

export class GameEngine {
    tanks: Tank[] = [];
    bullets: Bullet[] = [];
    explosions: Explosion[] = [];
    powerUps: PowerUp[] = [];
    map: number[][] = [];
    score: number = 0;
    mapVersion: number = 0;
    isGameOver: boolean = false;
    isWin: boolean = false;
    enemiesLeft: number = 20;
    spawnTimer: number = 0;
    tanksKilled: number = 0;
    level: number = 1;
    lives: number = 3;
    respawnTimer: number = 0;
    skrTokens: number = 0;
    skrCollectedThisGame: number = 0;

    private idCounter: number = 0;
    private lastPlayerInput: Direction | null | 'STOP' = null;

    protectionTimer: number = 0;
    speedTimer: number = 0;

    constructor() {
        this.initMap();
        this.spawnPlayer();
        this.spawnEnemy();
    }

    private getNextId(prefix: string): string {
        return `${prefix}-${this.idCounter++}-${Date.now()}`;
    }

    initMap() {
        this.map = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(TileType.EMPTY));

        const spawnPoints = [
            { x: 0, y: GRID_SIZE - 1 }, // Player
            { x: 0, y: 0 }, // Enemy L
            { x: Math.floor(GRID_SIZE / 2), y: 0 }, // Enemy C
            { x: GRID_SIZE - 1, y: 0 } // Enemy R
        ];

        for (let i = 0; i < 70; i++) {
            const rx = Math.floor(Math.random() * GRID_SIZE);
            const ry = Math.floor(Math.random() * GRID_SIZE);

            const isSpawnArea = spawnPoints.some(p => Math.abs(p.x - rx) <= 1 && Math.abs(p.y - ry) <= 1);

            if (!isSpawnArea) {
                const rand = Math.random();
                if (rand < 0.6) this.map[ry][rx] = TileType.BRICK_3;
                else if (rand < 0.8) this.map[ry][rx] = TileType.STONE_2;
                else if (rand < 0.9) this.map[ry][rx] = TileType.BUSH;
                else this.map[ry][rx] = TileType.WATER;
            }
        }

        const baseX = Math.floor(GRID_SIZE / 2);
        const baseY = GRID_SIZE - 1;
        this.map[baseY][baseX] = TileType.BASE;

        // Base protection: Stone on top, Brick on sides
        if (baseY > 0) {
            this.map[baseY - 1][baseX] = TileType.STONE_2;
            if (baseX > 0) this.map[baseY - 1][baseX - 1] = TileType.STONE_2;
            if (baseX < GRID_SIZE - 1) this.map[baseY - 1][baseX + 1] = TileType.STONE_2;
        }
        if (baseX > 0) this.map[baseY][baseX - 1] = TileType.BRICK_3;
        if (baseX < GRID_SIZE - 1) this.map[baseY][baseX + 1] = TileType.BRICK_3;
    }

    spawnPlayer() {
        const pId = 'player';
        const existing = this.tanks.find(t => t.id === pId);
        if (existing) {
            existing.pos = { x: 0, y: GRID_SIZE - 1 };
            existing.isDestroyed = false;
            existing.dir = Direction.UP;
            existing.isMoving = false; // Initialize isMoving
            return;
        }
        this.tanks.push({
            id: pId,
            pos: { x: 0, y: GRID_SIZE - 1 },
            dir: Direction.UP,
            type: TankType.BASIC,
            isPlayer: true,
            isDestroyed: false,
            cooldown: 0,
            speed: 0.17,
            maxBullets: 1,
            isMoving: false // Initialize isMoving
        });
    }

    spawnEnemy() {
        if (this.enemiesLeft <= 0) return false;
        const spawnPoints = [{ x: 0, y: 0 }, { x: Math.floor(GRID_SIZE / 2), y: 0 }, { x: GRID_SIZE - 1, y: 0 }];
        const point = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];

        const isOccupied = this.tanks.some(t => !t.isDestroyed && Math.abs(t.pos.x - point.x) < 0.95 && Math.abs(t.pos.y - point.y) < 0.95);

        if (!isOccupied && this.tanks.filter(t => !t.isPlayer && !t.isDestroyed).length < 20) {
            let type = TankType.BASIC;
            if (this.level > 1) {
                const rand = Math.random();
                if (rand > 0.8) type = TankType.POWER;
                else if (rand > 0.5) type = TankType.FAST;
            }
            const newTank: Tank = {
                id: this.getNextId('enemy'),
                pos: { ...point },
                dir: Direction.DOWN,
                type,
                isPlayer: false,
                isDestroyed: false,
                cooldown: 0,
                speed: type === TankType.BASIC ? 0.11 :
                    type === TankType.FAST ? 0.14 : 0.17,
                maxBullets: 1,
                isMoving: true,
                mission: Math.random() < 0.5 ? 'EXPLORE' : 'ATTACK'
            };
            this.tanks.push(newTank);
            this.enemiesLeft--;

            const nx = newTank.pos.x;
            const ny = newTank.pos.y + newTank.speed;
            if (this.isValidMove(nx, ny, newTank.id)) {
                newTank.pos.y = ny;
            }
            return true;
        }
        return false;
    }

    moveTank(tankId: string, dir: Direction | null) {
        const tank = this.tanks.find(t => t.id === tankId);
        if (!tank || tank.isDestroyed) return;

        if (tank.isPlayer) {
            // This block is now handled by the new logic in the update method
            // The `playerDir` parameter in `update` will drive player movement.
            // This `moveTank` method is primarily used by AI for enemies.
            // If player movement was to be controlled here, it would need `isMoving` logic.
            // For now, keeping it as is, assuming `update` handles player.
        } else { // Enemy tank movement logic
            if (dir !== null) {
                const oldDir = tank.dir;
                tank.dir = dir;
                const isAxisChange = ((dir === Direction.UP || dir === Direction.DOWN) && (oldDir === Direction.LEFT || oldDir === Direction.RIGHT)) ||
                    ((dir === Direction.LEFT || dir === Direction.RIGHT) && (oldDir === Direction.UP || oldDir === Direction.DOWN));
                if (isAxisChange) {
                    if (dir === Direction.UP || dir === Direction.DOWN) tank.pos.x = Math.round(tank.pos.x);
                    else tank.pos.y = Math.round(tank.pos.y);
                }
            }
        }
    }

    isValidMove(x: number, y: number, tankId: string) {
        // Broad boundary check
        const MARGIN = 0.05;
        if (x < -MARGIN || x > GRID_SIZE - 1 + MARGIN || y < -MARGIN || y > GRID_SIZE - 1 + MARGIN) return false;

        // Use a very permissive collision box (0.7) for a 1.0 wide lane
        const boxSize = 0.7;
        const offset = (1 - boxSize) / 2;
        const left = x + offset;
        const right = x + boxSize + offset;
        const top = y + offset;
        const bottom = y + boxSize + offset;

        // Check tiles (check only the area the box overlaps)
        for (let ix = Math.floor(left + 0.01); ix < Math.ceil(right - 0.01); ix++) {
            for (let iy = Math.floor(top + 0.01); iy < Math.ceil(bottom - 0.01); iy++) {
                if (ix < 0 || ix >= GRID_SIZE || iy < 0 || iy >= GRID_SIZE) continue;
                const tile = this.map[iy][ix];
                if (tile !== TileType.EMPTY && tile !== TileType.BUSH) return false;
            }
        }

        // Check tanks
        return !this.tanks.some(t => {
            if (t.id === tankId || t.isDestroyed) return false;
            // Generous tank-to-tank clearance
            return Math.abs(t.pos.x - x) < 0.75 && Math.abs(t.pos.y - y) < 0.75;
        });
    }

    shoot(tankId: string) {
        const tank = this.tanks.find(t => t.id === tankId);
        if (!tank || tank.isDestroyed || tank.cooldown > 0) return;

        const activeBullets = this.bullets.filter(b => b.ownerId === tankId).length;
        if (activeBullets >= tank.maxBullets) return;

        this.bullets.push({
            id: this.getNextId('bullet'),
            pos: {
                x: tank.isPlayer ? tank.pos.x : Math.round(tank.pos.x),
                y: tank.isPlayer ? tank.pos.y : Math.round(tank.pos.y)
            },
            dir: tank.dir,
            ownerId: tankId
        });

        tank.cooldown = tank.isPlayer ? 0 : 60; // Instant for player, delay for enemies
    }

    spawnPowerUp() {
        const types = [PowerUpType.HELMET, PowerUpType.BOMB, PowerUpType.SPEED];
        const type = types[Math.floor(Math.random() * types.length)];
        let x, y;
        do { x = Math.floor(Math.random() * GRID_SIZE); y = Math.floor(Math.random() * GRID_SIZE); }
        while (this.map[y][x] !== TileType.EMPTY);
        this.powerUps.push({ id: this.getNextId('pw'), pos: { x, y }, type, life: 600 });
    }

    triggerBomb() {
        this.tanks.forEach(tank => {
            if (!tank.isPlayer && !tank.isDestroyed) {
                tank.isDestroyed = true;
                this.tanksKilled++;
                let reward = 100;
                if (tank.type === TankType.FAST) reward = 200;
                if (tank.type === TankType.POWER) reward = 300;
                this.score += reward;
                this.explosions.push({ id: this.getNextId('exp-bomb'), pos: { ...tank.pos }, life: 1.0 });
                if (this.tanksKilled % 2 === 0) this.spawnPowerUp();
            }
        });
    }

    update(playerDir: Direction | null | 'STOP') {
        if (this.isGameOver) return;
        if (this.protectionTimer > 0) this.protectionTimer--;
        if (this.speedTimer > 0) this.speedTimer--;

        if (this.respawnTimer > 0) {
            this.respawnTimer--;
            if (this.respawnTimer === 0) {
                this.spawnPlayer();
                this.protectionTimer = 180;
            }
        }

        const player = this.tanks.find(t => t.isPlayer);
        if (player) {
            const activeEnemies = this.tanks.filter(t => !t.isPlayer && !t.isDestroyed).length;
            const totalRemaining = this.enemiesLeft + activeEnemies;
            player.maxBullets = totalRemaining < 10 ? 2 : 1;
        }
        const baseX = Math.floor(GRID_SIZE / 2);
        const baseY = GRID_SIZE - 1;

        this.tanks.forEach(tank => {
            if (tank.isDestroyed) {
                if (tank.cooldown > 0) tank.cooldown--;
                return;
            };

            if (tank.cooldown > 0) tank.cooldown--;
            if (tank.isPlayer) {
                const command = playerDir === 'STOP' ? 'STOP' : playerDir;

                // Start moving if not already moving (ignore STOP)
                if (!tank.isMoving) {
                    if (command && command !== 'STOP' && command !== null) {
                        tank.dir = command;
                        tank.isMoving = true;
                    }
                }

                if (tank.isMoving) {
                    let speed = tank.speed * (this.speedTimer > 0 ? 1.5 : 1.0);
                    let nx = tank.pos.x;
                    let ny = tank.pos.y;

                    // Determine next integer target in current direction
                    let targetX = tank.pos.x;
                    let targetY = tank.pos.y;
                    if (tank.dir === Direction.UP) targetY = Math.floor(tank.pos.y - 0.001);
                    else if (tank.dir === Direction.DOWN) targetY = Math.ceil(tank.pos.y + 0.001);
                    else if (tank.dir === Direction.LEFT) targetX = Math.floor(tank.pos.x - 0.001);
                    else if (tank.dir === Direction.RIGHT) targetX = Math.ceil(tank.pos.x + 0.001);

                    const dist = Math.abs(tank.pos.x - targetX) + Math.abs(tank.pos.y - targetY);

                    let arrived = false;
                    if (speed >= dist - 0.001) {
                        nx = targetX;
                        ny = targetY;
                        arrived = true;
                    } else {
                        if (tank.dir === Direction.UP) { ny -= speed; nx = Math.round(nx); }
                        else if (tank.dir === Direction.DOWN) { ny += speed; nx = Math.round(nx); }
                        else if (tank.dir === Direction.LEFT) { nx -= speed; ny = Math.round(ny); }
                        else if (tank.dir === Direction.RIGHT) { nx += speed; ny = Math.round(ny); }
                    }

                    if (this.isValidMove(nx, ny, tank.id)) {
                        tank.pos.x = nx;
                        tank.pos.y = ny;

                        if (arrived) {
                            // Hold logic: continue if the same direction is still held
                            // Otherwise stop at this grid point
                            if (playerDir === tank.dir) {
                                tank.isMoving = true;
                            } else {
                                tank.isMoving = false;
                            }
                        }
                    } else {
                        // Blocked: snap to grid and stop
                        tank.isMoving = false;
                        tank.pos.x = Math.round(tank.pos.x);
                        tank.pos.y = Math.round(tank.pos.y);
                    }
                }
                return;
            }

            // ENEMY BASIC MOVEMENT
            let speed = tank.speed;
            let nx = tank.pos.x;
            let ny = tank.pos.y;
            if (tank.dir === Direction.UP) ny -= speed;
            else if (tank.dir === Direction.DOWN) ny += speed;
            else if (tank.dir === Direction.LEFT) nx -= speed;
            else if (tank.dir === Direction.RIGHT) nx += speed;

            if (this.isValidMove(nx, ny, tank.id)) {
                tank.pos.x = nx;
                tank.pos.y = ny;
            } else {
                // Blocked: pick a random direction
                const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
                tank.dir = dirs[Math.floor(Math.random() * dirs.length)];
            }
        });

        // Advanced AI Tactical Decisions (Pathfinding and Shooting)
        this.tanks.forEach(tank => {
            if (tank.isPlayer || tank.isDestroyed) return;

            // Mission-based direction logic
            if (tank.mission === 'ATTACK') {
                if (Math.random() < 0.1) { // 10% chance per frame to steer towards target
                    const targetPos = (player && !player.isDestroyed && Math.random() < 0.5)
                        ? player.pos
                        : { x: baseX, y: baseY };

                    const possibleDirs: Direction[] = [];
                    if (Math.abs(tank.pos.y - targetPos.y) > 0.3) {
                        possibleDirs.push(tank.pos.y < targetPos.y ? Direction.DOWN : Direction.UP);
                    }
                    if (Math.abs(tank.pos.x - targetPos.x) > 0.3) {
                        possibleDirs.push(tank.pos.x < targetPos.x ? Direction.RIGHT : Direction.LEFT);
                    }
                    if (possibleDirs.length > 0) {
                        tank.dir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
                    }
                }
            } else {
                // EXPLORE mission: random direction change occasionally
                if (Math.random() < 0.02) {
                    const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
                    tank.dir = dirs[Math.floor(Math.random() * dirs.length)];
                }
            }

            // Line of Sight Shooting
            let shouldFire = Math.random() < 0.01;
            if (player && !player.isDestroyed) {
                // Check if player is in a bush
                const px = Math.round(player.pos.x);
                const py = Math.round(player.pos.y);
                const isInBush = px >= 0 && px < GRID_SIZE && py >= 0 && py < GRID_SIZE && this.map[py][px] === TileType.BUSH;

                if (!isInBush) {
                    const dx = player.pos.x - tank.pos.x;
                    const dy = player.pos.y - tank.pos.y;
                    if (tank.dir === Direction.DOWN && Math.abs(dx) < 0.5 && dy > 0) shouldFire = true;
                    if (tank.dir === Direction.UP && Math.abs(dx) < 0.5 && dy < 0) shouldFire = true;
                    if (tank.dir === Direction.RIGHT && Math.abs(dy) < 0.5 && dx > 0) shouldFire = true;
                    if (tank.dir === Direction.LEFT && Math.abs(dy) < 0.5 && dx < 0) shouldFire = true;
                }
            }
            const bdx = baseX - tank.pos.x;
            const bdy = baseY - tank.pos.y;
            if (tank.dir === Direction.DOWN && Math.abs(bdx) < 0.8 && bdy > 0) shouldFire = true;

            if (shouldFire) this.shoot(tank.id);
        });

        this.bullets = this.bullets.filter(bullet => {
            const bSpeed = 0.31;
            if (bullet.dir === Direction.UP) bullet.pos.y -= bSpeed;
            else if (bullet.dir === Direction.DOWN) bullet.pos.y += bSpeed;
            else if (bullet.dir === Direction.LEFT) bullet.pos.x -= bSpeed;
            else if (bullet.dir === Direction.RIGHT) bullet.pos.x += bSpeed;

            const bx = Math.round(bullet.pos.x);
            const by = Math.round(bullet.pos.y);

            const resetCooldown = () => {
                const owner = this.tanks.find(t => t.id === bullet.ownerId);
                if (owner) owner.cooldown = 0;
            };

            if (bx < 0 || bx >= GRID_SIZE || by < 0 || by >= GRID_SIZE) { resetCooldown(); return false; }
            const tile = this.map[by][bx];

            if (tile === TileType.STONE_2) { this.map[by][bx] = TileType.STONE_1; this.mapVersion++; resetCooldown(); return false; }
            if (tile === TileType.STONE_1) { this.map[by][bx] = TileType.BRICK_3; this.mapVersion++; resetCooldown(); return false; }
            if (tile === TileType.BRICK_3) {
                if (bullet.dir === Direction.DOWN) this.map[by][bx] = TileType.BRICK_H_2_T;
                else if (bullet.dir === Direction.UP) this.map[by][bx] = TileType.BRICK_H_2_B;
                else if (bullet.dir === Direction.RIGHT) this.map[by][bx] = TileType.BRICK_V_2_L;
                else if (bullet.dir === Direction.LEFT) this.map[by][bx] = TileType.BRICK_V_2_R;
                this.mapVersion++;
                resetCooldown(); return false;
            }
            if (tile === TileType.BRICK_H_2_T) { this.map[by][bx] = TileType.BRICK_H_1_T; this.mapVersion++; resetCooldown(); return false; }
            if (tile === TileType.BRICK_H_2_B) { this.map[by][bx] = TileType.BRICK_H_1_B; this.mapVersion++; resetCooldown(); return false; }
            if (tile === TileType.BRICK_V_2_L) { this.map[by][bx] = TileType.BRICK_V_1_L; this.mapVersion++; resetCooldown(); return false; }
            if (tile === TileType.BRICK_V_2_R) { this.map[by][bx] = TileType.BRICK_V_1_R; this.mapVersion++; resetCooldown(); return false; }
            if ([TileType.BRICK_H_1_T, TileType.BRICK_H_1_B, TileType.BRICK_V_1_L, TileType.BRICK_V_1_R].includes(tile)) {
                this.map[by][bx] = TileType.EMPTY;
                this.mapVersion++;
                // Spawn physical SEEKER coin on full destruction
                if (this.skrCollectedThisGame < 5 && Math.random() < 0.25) {
                    this.powerUps.push({
                        id: this.getNextId('seeker'),
                        pos: { x: bx, y: by },
                        type: PowerUpType.SEEKER,
                        life: 1200 // Long life (20s) for tokens
                    });
                    this.skrCollectedThisGame++;
                }
                resetCooldown(); return false;
            }
            if (tile === TileType.STEEL) { resetCooldown(); return false; }
            if (tile === TileType.BASE) { this.isGameOver = true; return false; }

            const hitTank = this.tanks.find(t => !t.isDestroyed && t.id !== bullet.ownerId && Math.abs(t.pos.x - bullet.pos.x) < 0.6 && Math.abs(t.pos.y - bullet.pos.y) < 0.6);
            if (hitTank) {
                const owner = this.tanks.find(ot => ot.id === bullet.ownerId);
                if (owner && !owner.isPlayer && !hitTank.isPlayer) return true;
                if (hitTank.isPlayer && this.protectionTimer > 0) return false;

                if (hitTank.isPlayer) {
                    this.lives--;
                    hitTank.isDestroyed = true;
                    if (this.lives > 0) {
                        this.respawnTimer = 1;
                    } else {
                        this.isGameOver = true;
                    }
                } else {
                    hitTank.isDestroyed = true;
                }

                this.explosions.push({ id: this.getNextId('exp'), pos: { x: Math.round(hitTank.pos.x), y: Math.round(hitTank.pos.y) }, life: 1.0 });
                if (bullet.ownerId === 'player') {
                    let reward = 100;
                    if (hitTank.type === TankType.FAST) reward = 200;
                    if (hitTank.type === TankType.POWER) reward = 300;
                    this.score += reward; this.tanksKilled++;
                    // Standard rewards (score and powerups)
                    if (this.tanksKilled % 2 === 0) this.spawnPowerUp();
                }
                resetCooldown(); return false;
            }
            return true;
        });

        this.powerUps = this.powerUps.filter(pw => {
            pw.life--;
            if (player && !player.isDestroyed && Math.abs(player.pos.x - pw.pos.x) < 0.8 && Math.abs(player.pos.y - pw.pos.y) < 0.8) {
                if (pw.type === PowerUpType.HELMET) this.protectionTimer = 600;
                else if (pw.type === PowerUpType.SPEED) this.speedTimer = 600;
                else if (pw.type === PowerUpType.BOMB) this.triggerBomb();
                else if (pw.type === PowerUpType.SEEKER) this.skrTokens++;
                return false;
            }
            return pw.life > 0;
        });

        this.explosions = this.explosions.filter(exp => { exp.life -= 0.05; return exp.life > 0; });
        this.spawnTimer++;
        if (this.spawnTimer >= 120) { if (this.spawnEnemy()) this.spawnTimer = 0; }
        if (this.isGameOver && !this.isWin) {
            this.skrTokens = 0; // Reset tokens on loss
        }

        if (this.enemiesLeft === 0 && this.tanks.filter(t => !t.isPlayer && !t.isDestroyed).length === 0) {
            this.isWin = true; this.isGameOver = true;
        }
    }
}
