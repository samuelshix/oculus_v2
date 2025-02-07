export interface Trade {
    signature: string;
    timestamp: number;
    tokenIn: {
        mint: string;
        amount: number;
    };
    tokenOut: {
        mint: string;
        amount: number;
    };
}

export interface TradeWithPrices extends Trade {
    tokenInPrice: number;  // USD price at time of trade
    tokenOutPrice: number; // USD price at time of trade
}

export interface DailyPnL {
    date: string;          // ISO date string
    token: string;         // Token mint address
    symbol: string;        // Token symbol
    realizedPnL: number;   // USD value
    trades: TradeWithPrices[];
}

export interface TokenPnLSummary {
    token: string;         // Token mint address
    symbol: string;        // Token symbol
    totalRealizedPnL: number;
    dailyPnL: DailyPnL[];
} 