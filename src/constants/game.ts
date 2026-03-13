export const GRID_SIZE = 13;
export const TILE_SIZE = 30;
export const GAME_WIDTH = GRID_SIZE * TILE_SIZE;
export const GAME_HEIGHT = GRID_SIZE * TILE_SIZE;

export enum TileType {
    EMPTY = 0,
    BRICK_3 = 1,      // Full
    BRICK_H_2_T = 11, // Hit from Top, 2 layers left (mid/bot)
    BRICK_H_2_B = 12, // Hit from Bottom, 2 layers left (top/mid)
    BRICK_H_1_T = 13, // Hit from Top twice, 1 layer left (bot)
    BRICK_H_1_B = 14, // Hit from Bottom twice, 1 layer left (top)

    BRICK_V_2_L = 21, // Hit from Left, 2 layers left (mid/right)
    BRICK_V_2_R = 22, // Hit from Right, 2 layers left (left/mid)
    BRICK_V_1_L = 23, // Hit from Left twice, 1 layer left (right)
    BRICK_V_1_R = 24, // Hit from Right twice, 1 layer left (left)

    STONE_2 = 31, // Stone - 2 hits to become BRICK_3
    STONE_1 = 32, // Stone - 1 hit to become BRICK_3

    STEEL = 2,
    WATER = 3,
    BUSH = 4,
    ICE = 5,
    BASE = 9,
}

export enum Direction {
    UP = 'UP',
    DOWN = 'DOWN',
    LEFT = 'LEFT',
    RIGHT = 'RIGHT',
}

export const COLORS = {
    BACKGROUND: '#000000',
    PLAYER: '#4ADE80', // Solana Green
    ENEMY: '#F87171', // Red
    BRICK: '#B45309', // Brown
    STONE: '#4B5563', // Gray (Stone)
    STEEL: '#9CA3AF', // Light Gray (Steel)
    WATER: '#3B82F6', // Blue
    BUSH: '#065F46', // Dark Green
    BASE: '#EAB308', // Gold
    BULLET: '#FFFFFF',
    TEXT: '#FFFFFF',
    ACCENT: '#A855F7', // Solana Purple
};
