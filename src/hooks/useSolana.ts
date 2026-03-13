import { useState, useCallback, useMemo } from 'react';
import {
    transact,
    Web3MobileWallet
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

export const APP_IDENTITY = {
    name: 'Solana Tanks 1990',
    uri: 'https://mysolanaapp.com', // Replace with actual URI when deploying
    icon: 'favicon.ico', // Relative path from uri
};

import * as base64 from 'base64-js';

import { Platform, Alert } from 'react-native';

export function useSolana() {
    const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
    const [seekerId, setSeekerId] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const connection = useMemo(() => new Connection(clusterApiUrl('devnet')), []);

    const authorizeSession = useCallback(async (wallet: Web3MobileWallet) => {
        const authorizationResult = await wallet.authorize({
            identity: APP_IDENTITY,
        });
        return authorizationResult;
    }, []);

    const connect = useCallback(async () => {
        if (Platform.OS === 'web') {
            alert('Wallet connection via Mobile Wallet Adapter is only available on Android (Solana Seeker).');
            return null;
        }

        setIsConnecting(true);
        try {
            const result = await transact(async (wallet) => {
                const auth = await authorizeSession(wallet);
                const account = auth.accounts[0];

                // MWA returns address in Base64, but PublicKey expects Base58 or bytes
                const addressBytes = base64.toByteArray(account.address);
                const pubKey = new PublicKey(addressBytes);

                setPublicKey(pubKey);
                // Use account label as Seeker ID if available
                setSeekerId(account.label || `${pubKey.toBase58().slice(0, 4)}...${pubKey.toBase58().slice(-4)}`);

                return pubKey;
            });
            return result;
        } catch (error) {
            console.error('Wallet connection failed:', error);
            return null;
        } finally {
            setIsConnecting(false);
        }
    }, [authorizeSession]);

    const disconnect = useCallback(() => {
        setPublicKey(null);
        setSeekerId(null);
    }, []);

    return {
        publicKey,
        seekerId,
        isConnecting,
        connect,
        disconnect,
        connection,
    };
}
