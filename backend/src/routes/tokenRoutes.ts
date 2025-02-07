import express from 'express';
import { TokenService } from '../services/tokenService';
import { ServiceFactory } from '../services/serviceFactory';

const router = express.Router();
const useMockData = process.env.USE_MOCK_DATA !== 'false';
const tokenService = ServiceFactory.getTokenService(useMockData);

router.post('/sync-all', async (req, res) => {
    try {
        const result = await tokenService.syncAllTokens();
        res.json({
            message: 'Successfully synced tokens',
            tokensProcessed: result.length
        });
    } catch (error) {
        console.error('Error syncing tokens:', error);
        res.status(500).json({
            message: error instanceof Error ? error.message : 'Server Error'
        });
    }
});

export default router; 