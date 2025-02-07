import axios from 'axios';
import { Token } from '../types/token';

const JUPITER_API_URL = 'https://token.jup.ag';

export class JupiterClient {
    private static instance: JupiterClient;
    private readonly axiosInstance;

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: JUPITER_API_URL
        });
    }

    static getInstance(): JupiterClient {
        if (!JupiterClient.instance) {
            JupiterClient.instance = new JupiterClient();
        }
        return JupiterClient.instance;
    }

    async getAllTokens(): Promise<Token[]> {
        try {
            const { data } = await this.axiosInstance.get('/tokens/v1/tagged/verified');
            return data.map((token: any) => ({
                mint: token.address,
                name: token.name,
                symbol: token.symbol,
                decimals: token.decimals,
                logoURI: token.logoURI,
                prices: []
            }));
        } catch (error) {
            console.error('JupiterClient - Error fetching all tokens:', error);
            throw new Error('Failed to fetch tokens from Jupiter');
        }
    }
}

export const jupiterClient = JupiterClient.getInstance(); 