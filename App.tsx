import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { useSolana } from './src/hooks/useSolana';
import { GameStage } from './src/components/GameStage';
import { COLORS } from './src/constants/game';
import { Wallet, Play, ShieldAlert as AlertTriangle, Trophy, List as ListIcon, Coins } from 'lucide-react-native';
import { Leaderboard } from './src/components/Leaderboard';
import { API_URL } from './src/config';

export default function App() {
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAMEOVER' | 'LEADERBOARD'>('MENU');
  const [lastScore, setLastScore] = useState(0);
  const [lastSKR, setLastSKR] = useState(0);
  const { publicKey, seekerId, isConnecting, connect, disconnect } = useSolana();

  const startGame = () => setGameState('PLAYING');
  const handleGameOver = async (score: number, skr: number) => {
    setLastScore(score);
    setLastSKR(skr);
    setGameState('GAMEOVER');

    const id = seekerId || publicKey?.toBase58();
    if (id) {
      try {
        await fetch(`${API_URL}/scores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            displayName: seekerId || (publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : 'GUEST'),
            score,
            skr
          })
        });
      } catch (e) {
        console.warn('Leaderboard error:', e);
      }
    }
  };

  const renderMenu = () => (
    <View style={styles.menuContainer}>
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>SOLANA</Text>
        <Text style={styles.subtitleText}>TANKS 1990</Text>
      </View>

      <View style={styles.walletInfo}>
        {publicKey ? (
          <View style={styles.connectedBox}>
            <Text style={styles.walletText}>
              SEEKER ID: {seekerId}
            </Text>
            <TouchableOpacity onPress={disconnect}>
              <Text style={styles.disconnectLink}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.connectButton}
            onPress={connect}
            disabled={isConnecting}
          >
            <Wallet color="#FFF" size={24} style={{ marginRight: 10 }} />
            <Text style={styles.buttonText}>{isConnecting ? 'CONNECTING...' : 'CONNECT WALLET'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.playButton} onPress={startGame}>
        <Play color="#FFF" size={32} style={{ marginRight: 10 }} />
        <Text style={styles.playButtonText}>START MISSION</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.connectButton, { marginTop: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]}
        onPress={() => setGameState('LEADERBOARD')}
      >
        <Trophy color={COLORS.BASE} size={24} style={{ marginRight: 10 }} />
        <Text style={[styles.buttonText, { color: COLORS.BASE }]}>LEADERBOARD</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <AlertTriangle color="#666" size={16} />
        <Text style={styles.footerText}>Compatible with Solana Seeker</Text>
      </View>
    </View>
  );

  const renderGameOver = () => (
    <View style={styles.menuContainer}>
      <Trophy color={COLORS.BASE} size={64} />
      <Text style={[styles.titleText, { fontSize: 40 }]}>GAME OVER</Text>
      <View style={{ alignItems: 'center', marginVertical: 20 }}>
        <Text style={styles.finalScore}>SCORE: {lastScore.toLocaleString()}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
          <Coins color={COLORS.PLAYER} size={24} style={{ marginRight: 8 }} />
          <Text style={[styles.finalScore, { color: COLORS.PLAYER, marginVertical: 0 }]}>SKR COLLECTED: {lastSKR}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.playButton} onPress={startGame}>
        <Text style={styles.playButtonText}>RETRY</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.playButton, { backgroundColor: COLORS.ACCENT, marginTop: 10 }]} onPress={() => setGameState('LEADERBOARD')}>
        <Text style={styles.playButtonText}>HALL OF FAME</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.playButton, { backgroundColor: '#333', marginTop: 10 }]} onPress={() => setGameState('MENU')}>
        <Text style={styles.playButtonText}>BACK TO MENU</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {gameState === 'MENU' && renderMenu()}
      {gameState === 'PLAYING' && (
        <GameStage
          onGameOver={handleGameOver}
          walletAddress={publicKey?.toBase58()}
          seekerId={seekerId}
        />
      )}
      {gameState === 'GAMEOVER' && renderGameOver()}
      {gameState === 'LEADERBOARD' && (
        <Leaderboard onBack={() => setGameState('MENU')} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  menuContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  titleText: {
    color: COLORS.ACCENT,
    fontSize: 50,
    fontWeight: '900',
    letterSpacing: 4,
  },
  subtitleText: {
    color: COLORS.PLAYER,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: -10,
    letterSpacing: 8,
  },
  walletInfo: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  connectButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.ACCENT,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
    width: '80%',
    justifyContent: 'center',
  },
  connectedBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.PLAYER,
  },
  walletText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'monospace',
  },
  disconnectLink: {
    color: COLORS.ENEMY,
    marginTop: 5,
    textDecorationLine: 'underline',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  playButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.PLAYER,
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 15,
    alignItems: 'center',
    width: '80%',
    justifyContent: 'center',
    marginTop: 20,
    elevation: 10,
    shadowColor: COLORS.PLAYER,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  playButtonText: {
    color: '#000',
    fontSize: 22,
    fontWeight: '900',
  },
  finalScore: {
    color: '#FFF',
    fontSize: 28,
    marginVertical: 20,
    fontFamily: 'monospace',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    marginLeft: 8,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
