import { Trade, TradeWithPrices } from '../types/tradeHistory';
import { HeliusClient } from '../clients/heliusClient';
import { BirdeyeClient } from '../clients/birdeyeClient';
import { PrismaClient } from '@prisma/client';
import { TokenService } from './tokenService';
import { chunk, flatten } from 'lodash';

export class TradeHistoryService {
    private prisma: PrismaClient;
    private heliusClient: HeliusClient;
    private birdeyeClient: BirdeyeClient;
    private tokenService: TokenService;

    constructor(
        heliusClient: HeliusClient,
        birdeyeClient: BirdeyeClient,
        tokenService: TokenService
    ) {
        this.prisma = new PrismaClient();
        this.heliusClient = heliusClient;
        this.birdeyeClient = birdeyeClient;
        this.tokenService = tokenService;
    }

    async getUserTrades(address: string, startTime?: number, endTime?: number): Promise<TradeWithPrices[]> {
        try {
            // First check if we have trades in our database
            const existingTrades = await this.prisma.trade.findMany({
                where: {
                    userAddress: address,
                    timestamp: {
                        gte: startTime ? new Date(startTime * 1000) : undefined,
                        lte: endTime ? new Date(endTime * 1000) : undefined
                    }
                },
                include: {
                    tokenIn: true,
                    tokenOut: true
                },
                orderBy: {
                    timestamp: 'desc'
                }
            });

            if (existingTrades.length > 0) {
                return existingTrades.map(trade => ({
                    signature: trade.signature,
                    timestamp: Math.floor(trade.timestamp.getTime() / 1000),
                    tokenIn: {
                        mint: trade.tokenInMint,
                        amount: trade.tokenInAmount,
                        symbol: trade.tokenIn.symbol,
                        decimals: trade.tokenIn.decimals
                    },
                    tokenOut: {
                        mint: trade.tokenOutMint,
                        amount: trade.tokenOutAmount,
                        symbol: trade.tokenOut.symbol,
                        decimals: trade.tokenOut.decimals
                    },
                    tokenInPrice: trade.tokenInPrice,
                    tokenOutPrice: trade.tokenOutPrice
                }));
            }

            // If no trades in database, fetch from Helius
            const trades = await this.heliusClient.getSwapTransactions(address);

            // Get prices and save trades
            const tradesWithPrices = await Promise.all(
                trades.map(async trade => {
                    // Ensure both tokens exist in our database
                    const [tokenIn, tokenOut] = await Promise.all([
                        this.ensureTokenExists(trade.tokenIn.mint),
                        this.ensureTokenExists(trade.tokenOut.mint)
                    ]);

                    const minute = Math.floor(trade.timestamp / 60) * 60;
                    const minuteEnd = minute + 60;

                    const [tokenInPrice, tokenOutPrice] = await Promise.all([
                        this.birdeyeClient.getHistoricalPrices(
                            trade.tokenIn.mint,
                            minute,
                            minuteEnd,
                            '1M'
                        ),
                        this.birdeyeClient.getHistoricalPrices(
                            trade.tokenOut.mint,
                            minute,
                            minuteEnd,
                            '1M'
                        )
                    ]);

                    const tradeWithPrices = {
                        ...trade,
                        tokenInPrice: tokenInPrice[0]?.price || 0,
                        tokenOutPrice: tokenOutPrice[0]?.price || 0,
                        tokenIn: {
                            ...trade.tokenIn,
                            symbol: tokenIn.symbol,
                            decimals: tokenIn.decimals
                        },
                        tokenOut: {
                            ...trade.tokenOut,
                            symbol: tokenOut.symbol,
                            decimals: tokenOut.decimals
                        }
                    };

                    // Save to database
                    await this.prisma.trade.create({
                        data: {
                            signature: trade.signature,
                            userAddress: address,
                            timestamp: new Date(trade.timestamp * 1000),
                            tokenInMint: trade.tokenIn.mint,
                            tokenInAmount: trade.tokenIn.amount,
                            tokenOutMint: trade.tokenOut.mint,
                            tokenOutAmount: trade.tokenOut.amount,
                            tokenInPrice: tokenInPrice[0]?.price || 0,
                            tokenOutPrice: tokenOutPrice[0]?.price || 0
                        }
                    });

                    return tradeWithPrices;
                })
            );

            return tradesWithPrices;
        } catch (error) {
            console.error('Error fetching user trades:', error);
            return [];
        }
    }

    private async ensureTokenExists(mint: string) {
        try {
            // Try to find token in database
            const existingToken = await this.prisma.token.findUnique({
                where: { mint }
            });

            if (existingToken) {
                return existingToken;
            }

            // If token doesn't exist, fetch and save it
            const tokens = await this.tokenService.getTokens([mint]);
            return tokens[0];
        } catch (error) {
            console.error(`Error ensuring token exists for mint ${mint}:`, error);
            throw error;
        }
    }

    // Optional: Provide some basic aggregations that are commonly needed
    async getTradeStats(address: string, startTime?: number, endTime?: number) {
        const trades = await this.getUserTrades(address, startTime, endTime);

        // Return basic stats that might be useful for quick summaries
        return {
            totalTrades: trades.length,
            volumeUSD: trades.reduce((sum, trade) =>
                sum + (trade.tokenIn.amount * trade.tokenInPrice), 0),
            lastTradeTime: trades[0]?.timestamp || 0
        };
    }

    // Batch price fetching for multiple tokens
    async batchGetPrices(tokens: string[], timestamp: number) {
        const chunks = chunk(tokens, 10); // Process 10 tokens at a time
        const prices = await Promise.all(
            chunks.map(async tokenChunk =>
                Promise.all(tokenChunk.map(token =>
                    this.birdeyeClient.getHistoricalPrices(token, timestamp)
                ))
            )
        );
        return flatten(prices);
    }

    // Batch database operations
    async batchSaveTrades(trades: Trade[]) {
        const chunks = chunk(trades, 100);
        await Promise.all(
            chunks.map(chunk =>
                this.prisma.trade.createMany({
                    data: chunk,
                    skipDuplicates: true
                })
            )
        );
    }
} 