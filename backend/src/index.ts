import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';

import userRoutes from './routes/userRoutes';
import tokenAccountRoutes from './routes/tokenAccountRoutes';
import tokenRoutes from './routes/tokenRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(bodyParser.json());

app.use('/api/users', userRoutes);
app.use('/api/token-accounts', tokenAccountRoutes);
app.use('/api/tokens', tokenRoutes);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});