import { PrismaClient, Token, TokenPrice } from '@prisma/client';
import { BirdeyeClient, birdeyeClient } from '../clients/birdeyeClient';
import { JupiterClient, jupiterClient } from '../clients/jupiterClient';

export class TokenService {
    private prisma: PrismaClient;
    private jupiterClient: JupiterClient;
    private birdeyeClient: BirdeyeClient;

    constructor(
        jupiterAPI: JupiterClient = jupiterClient,
        birdeyeApi: BirdeyeClient = birdeyeClient
    ) {
        this.prisma = new PrismaClient();
        this.jupiterClient = jupiterAPI;
        this.birdeyeClient = birdeyeApi;
    }

    async getJupiterTokenData(mints: string[]): Promise<Token[]> {
        const allTokens = await this.jupiterClient.getAllTokens();
        return allTokens.filter(token => mints.includes(token.mint));
    }

    async getTokens(mints: string[]): Promise<Token[]> {
        let existingTokens = await this.prisma.token.findMany({
            where: { mint: { in: mints } },
            include: { tokenPrice: true },
        });

        let missingMints;
        if (existingTokens) {
            const existingMints = existingTokens.map((t: Token) => t.mint);
            missingMints = mints.filter((mint) => !existingMints.includes(mint));
        } else {
            existingTokens = [];
            missingMints = mints;
        }
        // Get and save missing tokens
        const newTokens = missingMints.length > 0
            ? await Promise.all(
                (await this.getJupiterTokenData(missingMints))
                    .map(token => this.saveToken(token))
            )
            : [];

        await Promise.all(
            [...existingTokens, ...newTokens].map(token =>
                this.getHistoricalTokenPrices(token, 30)
            )
        );

        // Read updated tokens with new prices
        return this.prisma.token.findMany({
            where: { mint: { in: mints } },
            include: { tokenPrice: true }
        });
    }

    async saveToken(token: Token): Promise<Token> {
        console.log("Saving token", token)
        const savedToken = await this.prisma.token.create({
            data: {
                mint: token.mint,
                name: token.name || '',
                symbol: token.symbol || '',
                decimals: token.decimals || 0,
                logoURI: token.logoURI || ''
            }
        });

        return savedToken;
    }

    async getHistoricalTokenPrices(token: Token, days: number): Promise<TokenPrice[]> {
        try {
            const todayUnixTime = Math.floor(Date.now() / 1000);
            const fromTime = todayUnixTime - days * 24 * 60 * 60;

            // Fetch existing prices for the last 30 days
            const existingPrices = await this.prisma.tokenPrice.findMany({
                where: {
                    tokenMint: token.mint,
                    timestamp: {
                        gte: new Date(fromTime * 1000) // Convert to milliseconds
                    }
                }
            });

            // Create a set of existing dates
            const existingDates = new Set(existingPrices.map(price => price.timestamp.toISOString().split('T')[0]));

            // Fetch new prices
            const allPrices = await this.birdeyeClient.getHistoricalPrices(
                token.mint,
                fromTime,
                todayUnixTime,
                '1D'
            );

            const newPrices = allPrices.filter(price => {
                const priceDate = new Date(price.date).toISOString().split('T')[0];
                return !existingDates.has(priceDate);
            });

            // Save only new prices
            if (newPrices.length > 0) {
                await this.savePrices(token.mint, newPrices);
            }

            return this.prisma.tokenPrice.findMany({
                where: { tokenMint: token.mint },
                orderBy: {
                    timestamp: 'desc'
                }
            });

        } catch (error) {
            console.error('Error fetching historical prices:', error);
            return [];
        }
    }

    private async savePrices(mint: string, prices: { date: string, price: number }[]): Promise<void> {
        try {
            const validPrices = prices.filter(p =>
                p.date &&
                !isNaN(new Date(p.date).getTime()) &&
                typeof p.price === 'number' &&
                !isNaN(p.price)
            );

            await this.prisma.tokenPrice.createMany({
                data: validPrices.map(price => ({
                    tokenMint: mint,
                    timestamp: new Date(price.date),
                    price: price.price
                })),
                skipDuplicates: true
            });
        } catch (error) {
            console.error('Error saving prices:', error);
        }
    }

    // async getCurrentPrice(mint: string): Promise<void> {
    //     try {
    //         await this.birdeyeClient.getCurrentPrice(mint);
    //     } catch (error) {
    //         console.error('Error fetching current price:', error);    
    //     }
    // }

    async syncAllTokens(): Promise<Token[]> {
        try {
            console.log('Starting token sync...');
            const allTokens = await this.jupiterClient.getAllTokens();
            console.log(`Found ${allTokens.length} tokens from Jupiter`);

            const batchSize = 100;
            const savedTokens: Token[] = [];

            // Process tokens in batches to avoid overwhelming the database
            for (let i = 0; i < allTokens.length; i += batchSize) {
                const batch = allTokens.slice(i, i + batchSize);
                console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(allTokens.length / batchSize)}`);

                const batchPromises = batch.map(token =>
                    this.prisma.token.upsert({
                        where: { mint: token.mint },
                        update: {
                            name: token.name || '',
                            symbol: token.symbol || '',
                            decimals: token.decimals || 0,
                            logoURI: token.logoURI || ''
                        },
                        create: {
                            mint: token.mint,
                            name: token.name || '',
                            symbol: token.symbol || '',
                            decimals: token.decimals || 0,
                            logoURI: token.logoURI || ''
                        }
                    }).catch(error => {
                        console.error(`Error saving token ${token.mint}:`, error);
                        return null;
                    })
                );

                const batchResults = await Promise.all(batchPromises);
                savedTokens.push(...batchResults.filter((t): t is Token => t !== null));
            }

            console.log(`Successfully saved ${savedTokens.length} tokens`);
            return savedTokens;
        } catch (error) {
            console.error('Error syncing all tokens:', error);
            throw error;
        }
    }
}

export const tokenService = new TokenService();