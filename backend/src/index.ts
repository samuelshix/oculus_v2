import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';

import userRoutes from './routes/userRoutes';
import tokenRoutes from './routes/tokenRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Configure CORS for both development and production
const allowedOrigins = [
    'http://localhost:3000',
    'https://portfolio-snapshot.vercel.app'  // Remove trailing slash
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));

app.use(bodyParser.json());
app.use('/api/users', userRoutes);
app.use('/api/tokens', tokenRoutes);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});