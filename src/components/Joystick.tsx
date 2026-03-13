import React, { useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, Animated, Dimensions } from 'react-native';
import { Direction, COLORS } from '../constants/game';

interface JoystickProps {
    onMove: (direction: Direction | null) => void;
    size?: number;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove, size = 120 }) => {
    const pan = useRef(new Animated.ValueXY()).current;
    const joystickSize = size;
    const thumbSize = size / 2.5;
    const radius = joystickSize / 2;

    const [currentDir, setCurrentDir] = useState<Direction | null>(null);

    const getDirection = (x: number, y: number): Direction | null => {
        const dist = Math.sqrt(x * x + y * y);
        if (dist < 10) return null; // Dead zone

        const angle = Math.atan2(y, x) * (180 / Math.PI);

        // Convert angle to Direction
        // 0 is RIGHT, 90 is DOWN, 180 is LEFT, -90 is UP
        if (angle >= -135 && angle < -45) return Direction.UP;
        if (angle >= -45 && angle < 45) return Direction.RIGHT;
        if (angle >= 45 && angle < 135) return Direction.DOWN;
        return Direction.LEFT;
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: (evt, gestureState) => {
                let { dx, dy } = gestureState;

                // Calculate distance from center
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Constrain movement to radius
                if (dist > radius) {
                    const ratio = radius / dist;
                    dx *= ratio;
                    dy *= ratio;
                }

                pan.setValue({ x: dx, y: dy });

                const newDir = getDirection(dx, dy);
                if (newDir !== currentDir) {
                    setCurrentDir(newDir);
                    onMove(newDir);
                }
            },
            onPanResponderRelease: () => {
                Animated.spring(pan, {
                    toValue: { x: 0, y: 0 },
                    useNativeDriver: false,
                }).start();
                setCurrentDir(null);
                onMove(null);
            },
        })
    ).current;

    return (
        <View style={[styles.container, { width: joystickSize, height: joystickSize }]}>
            {/* Base */}
            <View style={[styles.base, { borderRadius: radius }]}>
                {/* Visual indicators for directions */}
                <View style={[styles.indicator, { top: 5, alignSelf: 'center' }]} />
                <View style={[styles.indicator, { bottom: 5, alignSelf: 'center' }]} />
                <View style={[styles.indicator, { left: 5, top: '50%', marginTop: -2 }]} />
                <View style={[styles.indicator, { right: 5, top: '50%', marginTop: -2 }]} />
            </View>

            {/* Thumb */}
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.thumb,
                    {
                        width: thumbSize,
                        height: thumbSize,
                        borderRadius: thumbSize / 2,
                        transform: pan.getTranslateTransform(),
                    },
                ]}
            >
                <View style={styles.thumbInner} />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    base: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 2,
        borderColor: 'rgba(168, 85, 247, 0.3)', // COLORS.ACCENT (purple)
    },
    thumb: {
        backgroundColor: 'rgba(168, 85, 247, 0.8)', // COLORS.ACCENT
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    thumbInner: {
        width: '60%',
        height: '60%',
        borderRadius: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    indicator: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    }
});
