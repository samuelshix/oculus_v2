import { HeliusBalancesResponse } from '@/types/heliusBalancesResponse';
import { HeliusClient } from '../heliusClient';
import { heliusBalancesResponse } from '../../mockData/mockAPIDData';
import { mockSwapTransactions } from '../../mockData/mockSwapData';
import { HeliusSwapTransaction } from '../../types/heliusSwapTransaction';

export class MockHeliusClient extends HeliusClient {
    async getTokenBalances(address: string): Promise<HeliusBalancesResponse> {
        return heliusBalancesResponse.data;
    }

    async getSwapTransactions(address: string): Promise<HeliusSwapTransaction[]> {
        return mockSwapTransactions;
    }
}

export const mockHeliusClient = new MockHeliusClient(); 