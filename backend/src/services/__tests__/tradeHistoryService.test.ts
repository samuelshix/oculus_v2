import { TradeHistoryService } from '../tradeHistoryService';
import { mockHeliusClient } from '../../clients/mock/mockHeliusClient';
import { mockBirdeyeClient } from '../../clients/mock/mockBirdeyeClient';
import { mockSwapTransactions } from '../../mockData/mockSwapData';
import { HeliusClient } from '../../clients/heliusClient';
import { TokenService } from '../tokenService';
import { mockJupiterClient } from '../../clients/mock/mockJupiterClient';
import { JupiterClient } from '../../clients/jupiterClient';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        trade: {
            findMany: jest.fn().mockResolvedValue([]),
            create: jest.fn()
        },
        token: {
            findUnique: jest.fn()
        }
    }))
}));

describe('TradeHistoryService', () => {
    let tradeHistoryService: TradeHistoryService;
    let mockTokenService: TokenService;
    let prisma: jest.Mocked<PrismaClient>;

    beforeEach(() => {
        prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
        mockTokenService = new TokenService(mockJupiterClient as JupiterClient);
        tradeHistoryService = new TradeHistoryService(
            mockHeliusClient as HeliusClient,
            mockBirdeyeClient,
            mockTokenService
        );
        (tradeHistoryService as any).prisma = prisma;
    });

    describe('getUserTrades', () => {
        it('should return trades with prices when fetching from Helius', async () => {
            const address = 'test-address';
            // Mock token service to return some token data
            jest.spyOn(mockTokenService, 'getTokens').mockResolvedValue([{
                mint: mockSwapTransactions[0].tokenIn.mint,
                symbol: 'SOL',
                name: 'Solana',
                decimals: 9,
                logoURI: 'test-uri'
            }]);

            const result = await tradeHistoryService.getUserTrades(address);

            expect(result.length).toBe(mockSwapTransactions.length);
            expect(result[0]).toHaveProperty('tokenInPrice');
            expect(result[0]).toHaveProperty('tokenOutPrice');
            expect(typeof result[0].tokenInPrice).toBe('number');
            expect(typeof result[0].tokenOutPrice).toBe('number');
            expect(prisma.trade.create).toHaveBeenCalled();
        });

        it('should return trades from database if they exist', async () => {
            const mockDbTrades = [{
                signature: 'test-sig',
                timestamp: new Date(),
                tokenInMint: 'mint1',
                tokenInAmount: 1.0,
                tokenOutMint: 'mint2',
                tokenOutAmount: 2.0,
                tokenInPrice: 100,
                tokenOutPrice: 50,
                tokenIn: {
                    symbol: 'SOL',
                    decimals: 9
                },
                tokenOut: {
                    symbol: 'USDC',
                    decimals: 6
                }
            }];

            (prisma.trade.findMany as jest.Mock).mockResolvedValueOnce(mockDbTrades);

            const result = await tradeHistoryService.getUserTrades('test-address');

            expect(result.length).toBe(mockDbTrades.length);
            expect(result[0].tokenIn.symbol).toBe('SOL');
            expect(result[0].tokenOut.symbol).toBe('USDC');
            expect(mockHeliusClient.getSwapTransactions).not.toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            const errorHeliusClient = {
                getSwapTransactions: jest.fn().mockRejectedValue(new Error('API Error')),
                getTokenBalances: jest.fn(),
                axiosInstance: {}
            } as unknown as HeliusClient;

            const errorTradeHistoryService = new TradeHistoryService(
                errorHeliusClient,
                mockBirdeyeClient,
                mockTokenService
            );
            (errorTradeHistoryService as any).prisma = prisma;

            const result = await errorTradeHistoryService.getUserTrades('test-address');
            expect(result).toEqual([]);
        });
    });

    describe('getTradeStats', () => {
        it('should return basic trade statistics', async () => {
            const mockTrades = [{
                signature: 'test-sig',
                timestamp: 1234567890,
                tokenIn: {
                    mint: 'mint1',
                    amount: 1.0
                },
                tokenOut: {
                    mint: 'mint2',
                    amount: 2.0
                },
                tokenInPrice: 100,
                tokenOutPrice: 50
            }];

            jest.spyOn(tradeHistoryService, 'getUserTrades').mockResolvedValue(mockTrades as any);

            const result = await tradeHistoryService.getTradeStats('test-address');

            expect(result).toHaveProperty('totalTrades', 1);
            expect(result).toHaveProperty('volumeUSD');
            expect(result).toHaveProperty('lastTradeTime');
            expect(result.lastTradeTime).toBe(1234567890);
        });

        it('should handle empty trade list', async () => {
            jest.spyOn(tradeHistoryService, 'getUserTrades').mockResolvedValue([]);

            const result = await tradeHistoryService.getTradeStats('test-address');

            expect(result).toEqual({
                totalTrades: 0,
                volumeUSD: 0,
                lastTradeTime: 0
            });
        });
    });
}); 