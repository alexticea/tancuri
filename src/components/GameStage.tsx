import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, PanResponder, Animated } from 'react-native';
import Svg, { Rect, G, Circle, Path, Text as SvgText } from 'react-native-svg';
import { GameEngine, Tank, Bullet, Explosion, PowerUp, PowerUpType, TankType } from '../game/engine';
import { COLORS, GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, TileType, Direction, GRID_SIZE } from '../constants/game';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Crosshair, Heart, Coins, User } from 'lucide-react-native';

const { width } = Dimensions.get('window');
// Adjust scale to account for the extra 2 tiles of stone border (1 left, 1 right)
const TOTAL_GRID_SIZE = GRID_SIZE + 2;
const SCALE = (width * 0.95) / (TOTAL_GRID_SIZE * TILE_SIZE);

interface GameStageProps {
    onGameOver: (score: number, skr: number) => void;
    walletAddress?: string;
    seekerId?: string | null;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
    header: { width: '100%', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
    profileSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    profileInfo: { flexDirection: 'row', alignItems: 'center' },
    profileName: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginLeft: 10, letterSpacing: 1 },
    profileStats: { flexDirection: 'row', alignItems: 'center' },
    headerStat: { alignItems: 'center', flexDirection: 'row' },
    headerStatLabel: { color: '#AAA', fontSize: 10, fontWeight: 'bold', marginRight: 6 },
    headerStatValue: { color: COLORS.PLAYER, fontSize: 16, fontWeight: 'bold', fontFamily: 'monospace' },
    headerStatDivider: { width: 1, height: 15, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 12 },
    gameBoard: { borderRadius: 4, overflow: 'hidden', backgroundColor: '#000' },
    statusPanel: { flexDirection: 'row', alignItems: 'center', marginTop: 15, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    statusItem: { flexDirection: 'row', alignItems: 'center' },
    statusLabel: { color: '#AAA', fontSize: 13, fontWeight: 'bold', marginRight: 8, letterSpacing: 1 },
    statusValue: { color: COLORS.ENEMY, fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' },
    unifiedControls: { width: '100%', height: 260, backgroundColor: 'rgba(255,255,255,0.02)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 30 },
    dpadContainer: {
        marginLeft: 0,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 26,
    },
    dpadBtn: {
        width: 62,
        height: 62,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        margin: 1,
    },
    gameBoyContainer: {
        width: 140,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gbTouchArea: {
        position: 'absolute',
        width: 70,
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gbButtonA: {
        width: 60,
        height: 60,
        backgroundColor: '#2D8B3D',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(0,0,0,0.3)',
        elevation: 5,
    },
    gbButtonB: {
        width: 60,
        height: 60,
        backgroundColor: '#8B1D1D',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(0,0,0,0.3)',
        elevation: 5,
    },
    gbButtonActive: {
        backgroundColor: '#4ade80',
        transform: [{ scale: 0.95 }],
    },
    stopInner: {
        width: 15,
        height: 15,
        backgroundColor: '#FFF',
        borderRadius: 2,
    },
    gbLabel: {
        color: '#FFF',
        fontSize: 8,
        fontWeight: 'bold',
        marginTop: 2,
        opacity: 0.8,
    },
    dpadBtnActive: { backgroundColor: COLORS.PLAYER, borderColor: '#FFF', elevation: 10 },
});

const DPadButton = ({ direction, active, onStateChange }: { direction: Direction, active: boolean, onStateChange: (dir: Direction | null) => void }) => {
    const rotation = {
        [Direction.UP]: '0deg',
        [Direction.DOWN]: '180deg',
        [Direction.LEFT]: '270deg',
        [Direction.RIGHT]: '90deg',
    };

    return (
        <View
            onTouchStart={() => onStateChange(direction)}
            onTouchEnd={() => onStateChange(null)}
            onTouchCancel={() => onStateChange(null)}
            style={[
                styles.dpadBtn,
                active && styles.dpadBtnActive,
            ]}
        >
            <Svg width={24} height={24} viewBox="0 0 24 24" style={{ transform: [{ rotate: rotation[direction] }] }}>
                <Path d="M12 4l10 16H2z" fill={active ? "#FFF" : "rgba(255,255,255,0.4)"} />
            </Svg>
        </View>
    );
};

const UnifiedControls = ({ onDirectionChange, onFireStateChange }: { onDirectionChange: (dir: Direction | null | 'STOP') => void, onFireStateChange: (pressed: boolean) => void }) => {
    const [activeDir, setActiveDir] = useState<Direction | null>(null);
    const [isFiring, setIsFiring] = useState(false);

    const handleDirChange = (dir: Direction | null | 'STOP') => {
        setActiveDir(dir === 'STOP' ? null : dir as Direction | null);
        onDirectionChange(dir);
    };

    return (
        <View style={styles.unifiedControls} collapsable={false}>
            {/* Left Side: D-Pad (10% larger, 10% higher) */}
            <View style={styles.dpadContainer}>
                <DPadButton direction={Direction.UP} active={activeDir === Direction.UP} onStateChange={handleDirChange} />
                <View style={{ flexDirection: 'row' }}>
                    <DPadButton direction={Direction.LEFT} active={activeDir === Direction.LEFT} onStateChange={handleDirChange} />
                    <View style={{ width: 62 }} />
                    <DPadButton direction={Direction.RIGHT} active={activeDir === Direction.RIGHT} onStateChange={handleDirChange} />
                </View>
                <DPadButton direction={Direction.DOWN} active={activeDir === Direction.DOWN} onStateChange={handleDirChange} />
            </View>

            {/* Right Side: GameBoy Style A/B Buttons (High Responsiveness) */}
            <View style={styles.gameBoyContainer}>
                {/* Button B (STOP) - Lower Left */}
                <View
                    onTouchStart={() => handleDirChange('STOP')}
                    style={[styles.gbTouchArea, { bottom: 0, left: 0 }]}
                >
                    <View style={styles.gbButtonB}>
                        <View style={styles.stopInner} />
                        <Text style={styles.gbLabel}>B / STOP</Text>
                    </View>
                </View>

                {/* Button A (FIRE) - Upper Right */}
                <View
                    onTouchStart={() => { setIsFiring(true); onFireStateChange(true); }}
                    onTouchEnd={() => { setIsFiring(false); onFireStateChange(false); }}
                    onTouchCancel={() => { setIsFiring(false); onFireStateChange(false); }}
                    style={[styles.gbTouchArea, { top: 0, right: 0 }]}
                >
                    <View style={[styles.gbButtonA, isFiring && styles.gbButtonActive]}>
                        <Crosshair color="#FFF" size={24} />
                        <Text style={styles.gbLabel}>A / FIRE</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const StoneBlock = ({ x, y, size }: { x: number, y: number, size: number }) => (
    <G>
        <Rect x={x + 1} y={y + 1} width={size - 2} height={size - 2} fill={COLORS.STONE} rx={2} />
        {/* Bevel effect */}
        <Rect x={x + 2} y={y + 2} width={size - 4} height={1.5} fill="rgba(255,255,255,0.2)" />
        <Rect x={x + 2} y={y + 2} width={1.5} height={size - 4} fill="rgba(255,255,255,0.2)" />
        <Rect x={x + 2} y={y + size - 3.5} width={size - 4} height={1.5} fill="rgba(0,0,0,0.4)" />
        <Rect x={x + size - 3.5} y={y + 2} width={1.5} height={size - 4} fill="rgba(0,0,0,0.4)" />
        {/* Subtle texture */}
        <Rect x={x + size / 2} y={y + size / 2} width={2} height={2} fill="rgba(255,255,255,0.1)" rx={1} />
    </G>
);

const renderTile = (type: number, x: number, y: number) => {
    if (type === TileType.EMPTY) return null;

    const isBrick = [
        TileType.BRICK_3,
        TileType.BRICK_H_2_T, TileType.BRICK_H_2_B,
        TileType.BRICK_H_1_T, TileType.BRICK_H_1_B,
        TileType.BRICK_V_2_L, TileType.BRICK_V_2_R,
        TileType.BRICK_V_1_L, TileType.BRICK_V_1_R
    ].includes(type);

    if (isBrick) {
        let layers = 3;
        let direction: 'H' | 'V' = 'H';
        let alignment: 'T' | 'B' | 'L' | 'R' = 'B';

        if (type === TileType.BRICK_3) { layers = 3; }
        else if (type === TileType.BRICK_H_2_T) { layers = 2; direction = 'H'; alignment = 'B'; }
        else if (type === TileType.BRICK_H_2_B) { layers = 2; direction = 'H'; alignment = 'T'; }
        else if (type === TileType.BRICK_H_1_T) { layers = 1; direction = 'H'; alignment = 'B'; }
        else if (type === TileType.BRICK_H_1_B) { layers = 1; direction = 'H'; alignment = 'T'; }
        else if (type === TileType.BRICK_V_2_L) { layers = 2; direction = 'V'; alignment = 'R'; }
        else if (type === TileType.BRICK_V_2_R) { layers = 2; direction = 'V'; alignment = 'L'; }
        else if (type === TileType.BRICK_V_1_L) { layers = 1; direction = 'V'; alignment = 'R'; }
        else if (type === TileType.BRICK_V_1_R) { layers = 1; direction = 'V'; alignment = 'L'; }

        const stepSize = (TILE_SIZE - 2) / 3;

        return (
            <G key={`tile-${x}-${y}`}>
                {[...Array(layers)].map((_, i) => {
                    const isHorizontal = direction === 'H';
                    let rx = x * TILE_SIZE + 1;
                    let ry = y * TILE_SIZE + 1;
                    let rw = TILE_SIZE - 2;
                    let rh = TILE_SIZE - 2;

                    if (isHorizontal) {
                        rh = stepSize - 1;
                        const posIndex = alignment === 'B' ? (2 - i) : i;
                        ry = y * TILE_SIZE + 1 + posIndex * stepSize;
                    } else {
                        rw = stepSize - 1;
                        const posIndex = alignment === 'R' ? (2 - i) : i;
                        rx = x * TILE_SIZE + 1 + posIndex * stepSize;
                    }

                    return (
                        <G key={`layer-${i}`}>
                            <Rect x={rx} y={ry} width={rw} height={rh} fill={COLORS.BRICK} rx={1} />
                            <Rect x={rx} y={ry + rh * 0.33} width={rw} height={0.5} fill="#9CA3AF" />
                            <Rect x={rx} y={ry + rh * 0.66} width={rw} height={0.5} fill="#9CA3AF" />
                            <Rect x={rx + rw * 0.33} y={ry} width={0.5} height={rh} fill="#9CA3AF" />
                            <Rect x={rx + rw * 0.66} y={ry} width={0.5} height={rh} fill="#9CA3AF" />
                        </G>
                    );
                })}
            </G>
        );
    }

    const isStone = [TileType.STONE_2, TileType.STONE_1].includes(type);

    if (isStone) {
        return (
            <G key={`tile-${x}-${y}`}>
                <Rect x={x * TILE_SIZE + 1} y={y * TILE_SIZE + 1} width={TILE_SIZE - 2} height={TILE_SIZE - 2} fill={COLORS.STONE} rx={2} />
                {type === TileType.STONE_1 && (
                    <G>
                        <Rect x={x * TILE_SIZE + 5} y={y * TILE_SIZE + 5} width={TILE_SIZE - 10} height={1} fill="rgba(255,255,255,0.2)" transform={`rotate(45, ${x * TILE_SIZE + TILE_SIZE / 2}, ${y * TILE_SIZE + TILE_SIZE / 2})`} />
                        <Rect x={x * TILE_SIZE + 5} y={y * TILE_SIZE + 5} width={TILE_SIZE - 10} height={1} fill="rgba(255,255,255,0.2)" transform={`rotate(-45, ${x * TILE_SIZE + TILE_SIZE / 2}, ${y * TILE_SIZE + TILE_SIZE / 2})`} />
                    </G>
                )}
            </G>
        );
    }

    if (type === TileType.BASE) {
        const padding = 3;
        const w = TILE_SIZE - padding * 2;
        const h = TILE_SIZE - padding * 2;
        const tx = x * TILE_SIZE + padding;
        const ty = y * TILE_SIZE + padding;
        return (
            <G key={`base-${x}-${y}`}>
                <Rect x={x * TILE_SIZE} y={y * TILE_SIZE} width={TILE_SIZE} height={TILE_SIZE} fill="rgba(168, 85, 247, 0.2)" rx={4} />
                <Path d={`M ${tx} ${ty + h} L ${tx + w / 2} ${ty} L ${tx + w} ${ty + h} Z`} fill="#EAB308" />
                <Circle cx={tx + w / 2} cy={ty + h / 2} r={w / 4} fill="#8b5cf6" />
            </G>
        );
    }

    if (type === TileType.WATER) {
        return (
            <G key={`water-${x}-${y}`}>
                <Rect x={x * TILE_SIZE} y={y * TILE_SIZE} width={TILE_SIZE} height={TILE_SIZE} fill={COLORS.WATER} />
                <Path d={`M ${x * TILE_SIZE} ${y * TILE_SIZE + 10} Q ${x * TILE_SIZE + 7} ${y * TILE_SIZE + 5} ${x * TILE_SIZE + TILE_SIZE} ${y * TILE_SIZE + 10}`} stroke="rgba(255,255,255,0.3)" fill="none" />
                <Path d={`M ${x * TILE_SIZE} ${y * TILE_SIZE + 20} Q ${x * TILE_SIZE + 7} ${y * TILE_SIZE + 15} ${x * TILE_SIZE + TILE_SIZE} ${y * TILE_SIZE + 20}`} stroke="rgba(255,255,255,0.3)" fill="none" />
            </G>
        );
    }

    if (type === TileType.BUSH) {
        return (
            <G key={`bush-${x}-${y}`}>
                <Rect x={x * TILE_SIZE} y={y * TILE_SIZE} width={TILE_SIZE} height={TILE_SIZE} fill={COLORS.BUSH} />
                <Circle cx={x * TILE_SIZE + 8} cy={y * TILE_SIZE + 8} r={5} fill="rgba(0,0,0,0.1)" />
                <Circle cx={x * TILE_SIZE + 22} cy={y * TILE_SIZE + 22} r={5} fill="rgba(0,0,0,0.1)" />
            </G>
        );
    }

    let color = COLORS.BRICK;
    if (type === TileType.STEEL) color = COLORS.STEEL;
    return <Rect key={`tile-${x}-${y}`} x={x * TILE_SIZE} y={y * TILE_SIZE} width={TILE_SIZE - 1} height={TILE_SIZE - 1} fill={color} rx={2} />;
};

export const GameStage: React.FC<GameStageProps> = ({ onGameOver, walletAddress, seekerId }) => {
    const [engine] = useState(() => new GameEngine());
    const [frame, setFrame] = useState(0);
    const requestRef = useRef<number | null>(null);
    const activeDir = useRef<Direction | null | 'STOP'>(null);
    const isShooting = useRef(false);

    // STATIC MAP MEMO - Layered
    const memoBaseMap = React.useMemo(() => {
        return engine.map.map((row, y) => row.map((type, x) => (type !== TileType.BUSH ? renderTile(type, x, y) : null)));
    }, [engine.level, engine.mapVersion]);

    const memoBushMap = React.useMemo(() => {
        return engine.map.map((row, y) => row.map((type, x) => (type === TileType.BUSH ? renderTile(type, x, y) : null)));
    }, [engine.level, engine.mapVersion]);

    const update = () => {
        if (isShooting.current) {
            if (frame % 3 === 0) engine.shoot('player');
        }
        engine.update(activeDir.current);
        setFrame(prev => prev + 1);

        if (engine.isGameOver) {
            onGameOver(engine.score, engine.skrTokens);
            return;
        }
        requestRef.current = requestAnimationFrame(update);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    const renderStoneBorder = () => {
        const blocks = [];
        // Top and Bottom
        for (let x = -1; x <= GRID_SIZE; x++) {
            blocks.push(<StoneBlock key={`bt-${x}`} x={x * TILE_SIZE} y={-TILE_SIZE} size={TILE_SIZE} />);
            blocks.push(<StoneBlock key={`bb-${x}`} x={x * TILE_SIZE} y={GRID_SIZE * TILE_SIZE} size={TILE_SIZE} />);
        }
        // Left and Right
        for (let y = 0; y < GRID_SIZE; y++) {
            blocks.push(<StoneBlock key={`bl-${y}`} x={-TILE_SIZE} y={y * TILE_SIZE} size={TILE_SIZE} />);
            blocks.push(<StoneBlock key={`br-${y}`} x={GRID_SIZE * TILE_SIZE} y={y * TILE_SIZE} size={TILE_SIZE} />);
        }
        return blocks;
    };

    const renderTank = (tank: Tank) => {
        if (tank.isDestroyed) return null;
        const { x, y } = tank.pos;
        const rotation = tank.dir === Direction.UP ? 0 : tank.dir === Direction.RIGHT ? 90 : tank.dir === Direction.DOWN ? 180 : 270;
        const treadOffset = (Math.floor(frame / 2) % 4) * 2;

        return (
            <G key={tank.id}>
                <G transform={`rotate(${rotation}, ${x * TILE_SIZE + TILE_SIZE / 2}, ${y * TILE_SIZE + TILE_SIZE / 2})`}>
                    <Rect x={x * TILE_SIZE + 4} y={y * TILE_SIZE + 4} width={TILE_SIZE - 4} height={TILE_SIZE - 4} fill="black" opacity={0.3} rx={4} />
                    {[0, 1].map(side => (
                        <G key={`tread-side-${side}`}>
                            <Rect x={x * TILE_SIZE + (side === 0 ? 0 : TILE_SIZE - 5)} y={y * TILE_SIZE + 2} width={5} height={TILE_SIZE - 4} fill="#666" rx={1} />
                            {[0, 1, 2, 3].map(i => (
                                <Rect key={`seg-${side}-${i}`} x={x * TILE_SIZE + (side === 0 ? 0 : TILE_SIZE - 5)} y={y * TILE_SIZE + 2 + ((i * 5 + treadOffset) % (TILE_SIZE - 6))} width={5} height={2} fill="#AAA" />
                            ))}
                        </G>
                    ))}
                    <Rect
                        x={x * TILE_SIZE + 4} y={y * TILE_SIZE + 4} width={TILE_SIZE - 8} height={TILE_SIZE - 8}
                        fill={tank.isPlayer ? COLORS.PLAYER : tank.type === TankType.FAST ? '#FB923C' : tank.type === TankType.POWER ? '#9CA3AF' : COLORS.ENEMY} rx={3}
                    />
                    <Rect
                        x={x * TILE_SIZE + 7} y={y * TILE_SIZE + 7} width={TILE_SIZE - 14} height={TILE_SIZE - 14}
                        fill={tank.isPlayer ? "#22C55E" : tank.type === TankType.FAST ? '#F97316' : tank.type === TankType.POWER ? '#6B7280' : "#EF4444"} rx={2}
                    />
                    {!tank.isPlayer && tank.type === TankType.POWER && (
                        <Path d={`M ${x * TILE_SIZE + TILE_SIZE / 2} ${y * TILE_SIZE + TILE_SIZE / 2 - 4} L ${x * TILE_SIZE + TILE_SIZE / 2 + 1} ${y * TILE_SIZE + TILE_SIZE / 2 - 1} H ${x * TILE_SIZE + TILE_SIZE / 2 + 4} L ${x * TILE_SIZE + TILE_SIZE / 2 + 1.5} ${y * TILE_SIZE + TILE_SIZE / 2 + 1} L ${x * TILE_SIZE + TILE_SIZE / 2 + 2.5} ${y * TILE_SIZE + TILE_SIZE / 2 + 4} L ${x * TILE_SIZE + TILE_SIZE / 2} ${y * TILE_SIZE + TILE_SIZE / 2 + 2} L ${x * TILE_SIZE + TILE_SIZE / 2 - 2.5} ${y * TILE_SIZE + TILE_SIZE / 2 + 4} L ${x * TILE_SIZE + TILE_SIZE / 2 - 1.5} ${y * TILE_SIZE + TILE_SIZE / 2 + 1} L ${x * TILE_SIZE + TILE_SIZE / 2 - 4} ${y * TILE_SIZE + TILE_SIZE / 2 - 1} H ${x * TILE_SIZE + TILE_SIZE / 2 - 1} Z`} fill="white" />
                    )}
                    <Rect x={x * TILE_SIZE + TILE_SIZE / 2 - 2} y={y * TILE_SIZE - 2} width={4} height={12} fill={tank.isPlayer ? COLORS.PLAYER : tank.type === TankType.FAST ? '#FB923C' : tank.type === TankType.POWER ? '#9CA3AF' : COLORS.ENEMY} rx={1} />
                    <Rect x={x * TILE_SIZE + TILE_SIZE / 2 - 1} y={y * TILE_SIZE - 2} width={2} height={4} fill="rgba(255,255,255,0.3)" />
                    {tank.isPlayer && engine.protectionTimer > 0 && (
                        <Circle cx={x * TILE_SIZE + TILE_SIZE / 2} cy={y * TILE_SIZE + TILE_SIZE / 2} r={TILE_SIZE * 0.7} fill="transparent" stroke="#14F195" strokeWidth={2} strokeDasharray="4,4" />
                    )}
                    {tank.isPlayer && engine.speedTimer > 0 && (
                        <Rect x={x * TILE_SIZE - 2} y={y * TILE_SIZE - 2} width={TILE_SIZE + 4} height={TILE_SIZE + 4} fill="transparent" stroke="#9945FF" strokeWidth={2} rx={6} />
                    )}
                </G>
                {tank.isPlayer && (engine.protectionTimer > 0 || engine.speedTimer > 0) && (
                    <G>
                        {engine.protectionTimer > 0 && <Path d={`M ${x * TILE_SIZE} ${y * TILE_SIZE - 10} h ${TILE_SIZE} v 2 h -${TILE_SIZE} z`} fill="#14F195" scaleX={engine.protectionTimer / 600} />}
                        {engine.speedTimer > 0 && <Path d={`M ${x * TILE_SIZE} ${y * TILE_SIZE - 14} h ${TILE_SIZE} v 2 h -${TILE_SIZE} z`} fill="#9945FF" scaleX={engine.speedTimer / 600} />}
                    </G>
                )}
            </G>
        );
    };

    const renderBullet = (bullet: Bullet) => {
        const rotation = bullet.dir === Direction.UP ? 0 : bullet.dir === Direction.RIGHT ? 90 : bullet.dir === Direction.DOWN ? 180 : 270;
        const cx = bullet.pos.x * TILE_SIZE + TILE_SIZE / 2;
        const cy = bullet.pos.y * TILE_SIZE + TILE_SIZE / 2;

        return (
            <G key={bullet.id} transform={`rotate(${rotation}, ${cx}, ${cy})`}>
                {/* Bullet Body - Orange */}
                <Rect x={cx - 2} y={cy - 1} width={4} height={4} fill="#F97316" rx={0.5} />
                {/* Bullet Tip - Gray */}
                <Path
                    d={`M ${cx - 2} ${cy - 1} Q ${cx} ${cy - 5} ${cx + 2} ${cy - 1} Z`}
                    fill="#9CA3AF"
                />
                {/* Bottom detail for contrast */}
                <Rect x={cx - 2} y={cy + 2} width={4} height={1} fill="rgba(0,0,0,0.2)" />
            </G>
        );
    };

    const renderExplosion = (exp: Explosion) => {
        const size = TILE_SIZE * (1 + (1 - exp.life));
        return <Circle key={exp.id} cx={exp.pos.x * TILE_SIZE + TILE_SIZE / 2} cy={exp.pos.y * TILE_SIZE + TILE_SIZE / 2} r={size / 2} fill="#FFD700" opacity={exp.life} />;
    };

    const renderPowerUp = (pw: PowerUp) => {
        const color = pw.type === PowerUpType.HELMET ? '#14F195' : pw.type === PowerUpType.SPEED ? '#9945FF' : '#F87171';
        const blink = Math.sin(frame * 0.2) * 0.5 + 0.5;
        const cx = pw.pos.x * TILE_SIZE + TILE_SIZE / 2;
        const cy = pw.pos.y * TILE_SIZE + TILE_SIZE / 2;
        return (
            <G key={pw.id}>
                <Circle cx={cx} cy={cy} r={TILE_SIZE / 2 - 1} fill="transparent" stroke={color} strokeWidth={1} opacity={blink} />
                <Circle cx={cx} cy={cy} r={TILE_SIZE / 2 - 3} fill={color} opacity={0.8} />
                {pw.type === PowerUpType.HELMET && <Path d={`M ${cx} ${cy - 4} L ${cx - 3} ${cy - 2} V ${cy + 1} C ${cx - 3} ${cy + 3} ${cx + 3} ${cy + 3} ${cx + 3} ${cy + 1} V ${cy - 2} Z`} fill="white" />}
                {pw.type === PowerUpType.SPEED && <Path d={`M ${cx + 1} ${cy - 4} L ${cx - 3} ${cy} H ${cx} L ${cx - 1} ${cy + 4} L ${cx + 3} ${cy} H ${cx - 1} Z`} fill="white" />}
                {pw.type === PowerUpType.BOMB && (
                    <G>
                        <Circle cx={cx} cy={cy + 1} r={3} fill="white" />
                        <Path d={`M ${cx} ${cy - 3} Q ${cx + 2} ${cy - 4} ${cx + 3} ${cy - 2}`} stroke="white" strokeWidth={1} fill="none" />
                    </G>
                )}
                {pw.type === PowerUpType.SEEKER && (
                    <G>
                        <Circle cx={cx} cy={cy} r={TILE_SIZE / 2 - 4} fill="#EAB308" stroke="#CA8A04" strokeWidth={1} />
                        <Circle cx={cx} cy={cy} r={TILE_SIZE / 2 - 7} fill="transparent" stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
                        <SvgText
                            x={cx}
                            y={cy + 4}
                            fontSize={12}
                            fontWeight="bold"
                            fill="white"
                            textAnchor="middle"
                        >S</SvgText>
                    </G>
                )}
            </G>
        );
    };

    const formatDisplayName = () => {
        if (seekerId && !seekerId.includes('...')) return seekerId;
        if (walletAddress) return `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
        return 'GUEST PLAYER';
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.profileSection}>
                    <View style={styles.profileInfo}>
                        <User color="#FFF" size={24} />
                        <Text style={styles.profileName}>{formatDisplayName()}</Text>
                    </View>
                    <View style={styles.profileStats}>
                        <View style={styles.headerStat}>
                            <Text style={styles.headerStatLabel}>SCORE</Text>
                            <Text style={styles.headerStatValue}>{engine.score.toLocaleString()}</Text>
                        </View>
                        <View style={styles.headerStatDivider} />
                        <View style={styles.headerStat}>
                            <Coins color="#EAB308" size={16} style={{ marginRight: 6 }} />
                            <Text style={styles.headerStatLabel}>SKR</Text>
                            <Text style={[styles.headerStatValue, { color: '#EAB308' }]}>{engine.skrTokens}</Text>
                        </View>
                    </View>
                </View>
            </View>
            <View style={styles.gameBoard}>
                <Svg
                    width={(GAME_WIDTH + 2 * TILE_SIZE) * SCALE}
                    height={(GAME_HEIGHT + 2 * TILE_SIZE) * SCALE}
                    viewBox={`-${TILE_SIZE} -${TILE_SIZE} ${GAME_WIDTH + 2 * TILE_SIZE} ${GAME_HEIGHT + 2 * TILE_SIZE}`}
                >
                    {renderStoneBorder()}
                    <Rect width={GAME_WIDTH} height={GAME_HEIGHT} fill={COLORS.BACKGROUND} />
                    {memoBaseMap}
                    {engine.tanks.map(renderTank)}
                    {engine.bullets.map(renderBullet)}
                    {memoBushMap}
                    {engine.explosions.map(renderExplosion)}
                    {engine.powerUps.map(renderPowerUp)}
                </Svg>
            </View>
            <View style={styles.statusPanel}>
                <View style={styles.statusItem}>
                    <Heart color="#EF4444" size={20} fill="#EF4444" style={{ marginRight: 8 }} />
                    <Text style={[styles.statusValue, { color: COLORS.PLAYER }]}>{engine.lives}</Text>
                </View>
                <View style={{ width: 2, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 15 }} />
                <View style={styles.statusItem}>
                    <Text style={styles.statusLabel}>ENEMIES:</Text>
                    <Text style={styles.statusValue}>{engine.enemiesLeft}</Text>
                </View>
                <View style={{ width: 2, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 15 }} />
                <View style={styles.statusItem}>
                    <Coins color="#EAB308" size={20} style={{ marginRight: 8 }} />
                    <Text style={styles.statusLabel}>SKR:</Text>
                    <Text style={[styles.statusValue, { color: '#EAB308' }]}>{engine.skrTokens}</Text>
                </View>
            </View>
            <UnifiedControls
                onDirectionChange={(dir) => { activeDir.current = dir; }}
                onFireStateChange={(pressed) => { isShooting.current = pressed; }}
            />
        </View>
    );
};

