export interface HeliusSwapTransaction {
    signature: string;
    timestamp: number; // Unix timestamp
    tokenIn: {
        mint: string;
        amount: number;
    };
    tokenOut: {
        mint: string;
        amount: number;
    };
} 