import axios from 'axios';
import { Token } from '../types/token';

const BIRDEYE_URL = 'https://public-api.birdeye.so';
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;

interface BirdeyePriceResponse {
    value: number;
    updateUnixTime: number;
    updateHour: number;
}

interface BirdeyeHistoricalDataPoint {
    unixTime: number;
    value: number;
}

interface BirdeyeHistoricalResponse {
    data: {
        items: BirdeyeHistoricalDataPoint[];
    };
    success: boolean;
    timestamp: number;
}

export class BirdeyeClient {
    private static instance: BirdeyeClient;
    private readonly axiosInstance;

    public constructor() {
        this.axiosInstance = axios.create({
            baseURL: BIRDEYE_URL,
            headers: {
                'X-API-KEY': BIRDEYE_API_KEY,
                Accept: 'application/json',
            }
        });
    }

    static getInstance(): BirdeyeClient {
        if (!BirdeyeClient.instance) {
            BirdeyeClient.instance = new BirdeyeClient();
        }
        return BirdeyeClient.instance;
    }

    async getCurrentPrice(mintAddress: string): Promise<number> {
        try {
            const { data } = await this.axiosInstance.get<BirdeyePriceResponse>('/defi/price', {
                params: { address: mintAddress }
            });
            return data.value;
        } catch (error) {
            console.error('BirdeyeClient - Error fetching current price:', error);
            throw new Error('Failed to fetch current price from Birdeye');
        }
    }

    async getHistoricalPrices(
        mintAddress: string,
        fromTime: number,
        toTime: number,
        type: '1D' | '1H' | '1M'
    ): Promise<{ date: string; price: number }[]> {
        try {
            const { data } = await this.axiosInstance.get<BirdeyeHistoricalResponse>('/defi/history_price', {
                params: {
                    address: mintAddress,
                    address_type: 'token',
                    type: '1D',
                    time_from: fromTime,
                    time_to: toTime
                }
            });

            // Transform to match your Token type's price format
            return data.data.items.map(item => ({
                date: new Date(item.unixTime * 1000).toISOString(),
                price: item.value
            }));
        } catch (error) {
            console.error('BirdeyeClient - Error fetching historical prices:', error);
            throw new Error('Failed to fetch historical prices from Birdeye');
        }
    }
}

export const birdeyeClient = BirdeyeClient.getInstance();