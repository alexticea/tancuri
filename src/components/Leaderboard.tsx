import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Trophy, Coins, User, ArrowLeft } from 'lucide-react-native';
import { COLORS } from '../constants/game';
import { API_URL } from '../config';

interface ScoreEntry {
    id: string;
    displayName: string;
    totalScore: number;
    totalSKR: number;
    gamesPlayed: number;
}

export const Leaderboard = ({ onBack }: { onBack: () => void }) => {
    const [data, setData] = useState<ScoreEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLeaderboard = async () => {
        try {
            const response = await fetch(`${API_URL}/leaderboard`);
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const renderItem = ({ item, index }: { item: ScoreEntry, index: number }) => (
        <View style={styles.entryRow}>
            <View style={styles.rankContainer}>
                <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.nameText} numberOfLines={1}>
                    {item.displayName || 'Anonymous'}
                </Text>
                <Text style={styles.gamesText}>{item.gamesPlayed} Missions</Text>
            </View>
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Trophy size={14} color={COLORS.BASE} />
                    <Text style={styles.scoreText}>{item.totalScore.toLocaleString()}</Text>
                </View>
                <View style={styles.statItem}>
                    <Coins size={14} color={COLORS.PLAYER} />
                    <Text style={styles.skrText}>{item.totalSKR}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <ArrowLeft color="#FFF" size={24} />
                </TouchableOpacity>
                <Trophy color={COLORS.ACCENT} size={32} />
                <Text style={styles.headerTitle}>HALL OF FAME</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.ACCENT} />
                </View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>No data available yet</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
        height: 60,
    },
    backButton: {
        padding: 10,
        marginRight: 10,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 2,
        marginLeft: 15,
    },
    listContent: {
        paddingBottom: 40,
    },
    entryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginHorizontal: 15,
        marginVertical: 4,
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    rankContainer: {
        width: 30,
        alignItems: 'center',
    },
    rankText: {
        color: COLORS.ACCENT,
        fontSize: 18,
        fontWeight: '900',
    },
    infoContainer: {
        flex: 1,
        marginLeft: 15,
    },
    nameText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    gamesText: {
        color: '#666',
        fontSize: 12,
    },
    statsContainer: {
        alignItems: 'flex-end',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    scoreText: {
        color: COLORS.BASE,
        fontSize: 16,
        fontWeight: '900',
        marginLeft: 6,
        fontFamily: 'monospace',
    },
    skrText: {
        color: COLORS.PLAYER,
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 6,
        fontFamily: 'monospace',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#444',
        fontSize: 18,
    }
});
