import { HeliusSwapTransaction } from '../types/heliusSwapTransaction';

export const mockSwapTransactions: HeliusSwapTransaction[] = [
    {
        signature: '5xAt37Mhf1BXU1g6tYYGPt4vbP6DgYJjHrrpWEhzKxj4TD2QZ3HXBfYwXJXdAb4Qh9bxqQT6FLvAXbGe5UeqxPgo',
        timestamp: 1707235200, // 2024-02-06 12:00:00
        tokenIn: {
            mint: 'So11111111111111111111111111111111111111112',
            amount: 1000000000 // 1 SOL
        },
        tokenOut: {
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            amount: 110000000 // 110 USDC
        }
    },
    {
        signature: '4vC38Tg5HNS8yhvZQQh2qNtgXYmtqE9uVJ9X3JwEAHGFLNHMWZfHs9Wv3Qr6KX8Y9bxqQT6FLvAXbGe5UeqxPgo',
        timestamp: 1707148800, // 2024-02-05 12:00:00
        tokenIn: {
            mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            amount: 50000000 // 50 USDC
        },
        tokenOut: {
            mint: 'So11111111111111111111111111111111111111112',
            amount: 450000000 // 0.45 SOL
        }
    }
]; 