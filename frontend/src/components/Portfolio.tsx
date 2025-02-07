import React, { useEffect, useState, FC, Suspense, lazy, Component } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { observer } from 'mobx-react-lite';
import { tokenStore } from '../services/tokenStore';
import { getPortfolioValueByDay } from '../util/portfolioValue';
import LoadingSpinner from './LoadingSpinner';

// Lazy load components
const TopBar = lazy(() => import('./TopBar'));
const Sidebar = lazy(() => import('./Sidebar'));
const PriceChart = lazy(() => import('./PriceChart'));

// Error Boundary Component
class ErrorBoundary extends Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="text-red-500 p-4">
                    Something went wrong. Please try refreshing the page.
                </div>
            );
        }
        return this.props.children;
    }
}

const Portfolio: FC = observer(() => {
    const { publicKey } = useWallet();
    const [connectWalletMessage, setMessage] = useState<string>('');
    const [portfolioValueByDay, setPortfolioValueByDay] = useState<{ date: string, value: number }[]>([]);
    const [totalPortfolioValue, setTotalPortfolioValue] = useState<string>('0.00');
    const [deltaColor, setDeltaColor] = useState<string>('rgb(0, 255, 0)');

    useEffect(() => {
        const fetchAssets = async () => {
            if (publicKey) {
                setMessage('Loading...');
                tokenStore.loadUserTokens(publicKey.toString());
                setMessage('');
            } else {
                setMessage('Connect your wallet to view your portfolio');
            }
        };

        fetchAssets();
    }, [publicKey]);

    useEffect(() => {
        const calculatePortfolioValue = async () => {
            if (tokenStore.tokenAccounts.length > 0) {
                const valueByDay = getPortfolioValueByDay(tokenStore.tokenAccounts);
                console.log(valueByDay)
                setPortfolioValueByDay(valueByDay);

                // Only calculate delta color and total value if we have enough data points
                if (valueByDay.length >= 2) {
                    setDeltaColor(valueByDay[0].value > valueByDay[1].value ? 'rgb(0, 255, 0)' : 'rgb(255, 0, 0)');
                }

                // Set total value from the most recent day if available
                if (valueByDay.length > 0) {
                    const totalValue = valueByDay[0].value;
                    setTotalPortfolioValue(totalValue.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                    }));
                }
            }
        }
        calculatePortfolioValue();
    }, [tokenStore.tokenAccounts]);

    // Calculate percentage change only if we have enough data points
    const calculatePercentageChange = () => {
        if (portfolioValueByDay.length >= 2) {
            return ((portfolioValueByDay[0].value - portfolioValueByDay[1].value) / portfolioValueByDay[1].value * 100).toFixed(2) + '%';
        }
        return '0.00%';
    };

    return (
        <ErrorBoundary>
            <div className="flex-1 p-4">
                <Suspense fallback={<LoadingSpinner />}>
                    <TopBar />
                </Suspense>

                {connectWalletMessage &&
                    <p className='text-sm text-slate-500'>{connectWalletMessage}</p>
                }

                <div className='grid grid-cols-10 my-10'>
                    <div className='col-span-9'>
                        <div className="text-5xl font-semibold mt-2">{totalPortfolioValue}</div>
                        <div className="mt-1" style={{ color: deltaColor }}>
                            {calculatePercentageChange()}
                        </div>

                        <Suspense fallback={<LoadingSpinner />}>
                            <div className="h-40 rounded-md mr-10">
                                <PriceChart portfolioValueByDay={portfolioValueByDay} deltaColor={deltaColor} />
                            </div>
                        </Suspense>
                    </div>

                    <div className='col-span-1'>
                        <Suspense fallback={<LoadingSpinner />}>
                            <Sidebar tokenAccounts={tokenStore.tokenAccounts} />
                        </Suspense>
                    </div>
                </div>

                <div className="mt-4">
                    <div className="text-sm text-gray-400">Buying Power</div>
                    <div className="font-semibold">0</div>
                </div>
            </div>
        </ErrorBoundary>
    );
});

export default Portfolio;

