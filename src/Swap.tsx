import { useWallet } from "@solana/wallet-adapter-react";
import {  VersionedTransaction } from '@solana/web3.js';
import { useState, useEffect } from "react";
import { WalletNavbar } from "./components/WalletNavbar";
import { ArrowDown, CheckCircle2, Loader2, ExternalLink, Settings, RefreshCw, Info, TrendingUp } from "lucide-react";

const Landing = () => {
    const wallet = useWallet();
    const [solAmount, setSolAmount] = useState<string>("");
    const [usdcAmount, setUsdcAmount] = useState<string>("");
    const [swapStatus, setSwapStatus] = useState<'idle' | 'simulating' | 'signing' | 'executing' | 'success' | 'error'>('idle');
    const [txSignature, setTxSignature] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [rate, setRate] = useState<string>("");
    const [priceImpact] = useState<string>("0.01");

    const userPubKey = wallet.publicKey?.toString();
    // const connection = new Connection('https://api.mainnet-beta.solana.com');

    const quote = async (amount: string) => {
        const sol = parseFloat(amount);

        if (isNaN(sol) || sol <= 0) {
            setUsdcAmount("");
            setRate("");
            return;
        }

        try {
            const amountInLamports = Math.floor(sol * 1_000_000_000);

            if (!userPubKey) return console.error("No wallet connected");
            const quoteResponse = await fetch(
                `https://lite-api.jup.ag/ultra/v1/order?` +
                `inputMint=So11111111111111111111111111111111111111112` +
                `&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` +
                `&amount=${amountInLamports}` +
                `&taker=${userPubKey}`
            );

            const finalQuote = await quoteResponse.json();
            console.log("Quote:", finalQuote);

            if (finalQuote && finalQuote.outAmount) {
                const usdcOut = Number(finalQuote.outAmount) / 1_000_000;
                setUsdcAmount(usdcOut.toFixed(6));
                setRate((usdcOut / sol).toFixed(2));
            }

            return finalQuote;
        } catch (err) {
            console.error("Error fetching quote:", err);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (solAmount) quote(solAmount);
        }, 500);

        return () => clearTimeout(timeout);
    }, [solAmount]);

    const convert = async () => {
        if (!wallet.connected || !wallet.publicKey) {
            setErrorMessage("Wallet not connected");
            setSwapStatus('error');
            return;
        }

        setSwapStatus('simulating');
        setErrorMessage("");
        setTxSignature("");

        const finalQuote = await quote(solAmount);

        if (!finalQuote) {
            setErrorMessage("Unable to get quote");
            setSwapStatus('error');
            return;
        }

        try {
            const transactionBase64 = finalQuote.transaction;
            const transaction = VersionedTransaction.deserialize(Buffer.from(transactionBase64, 'base64'));

            if (!wallet || !wallet.signTransaction) {
                throw new Error("Wallet not connected or signTransaction not available");
            }

            setSwapStatus('signing');
            const signedTx = await wallet?.signTransaction(transaction);
            const signedTransaction = Buffer.from(signedTx.serialize()).toString('base64');

            setSwapStatus('executing');
            const executeResponse = await (
                await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        signedTransaction: signedTransaction,
                        requestId: finalQuote.requestId,
                    }),
                })
            ).json();

            if (executeResponse.status === "Success") {
                console.log('Swap successful:', JSON.stringify(executeResponse, null, 2));
                setTxSignature(executeResponse.signature);
                setSwapStatus('success');
            } else {
                setErrorMessage("Swap failed");
                setSwapStatus('error');
                if (executeResponse.signature) {
                    setTxSignature(executeResponse.signature);
                }
            }

        } catch (err: any) {
            console.error("Swap failed:", err);
            setErrorMessage(err?.message || "Swap failed");
            setSwapStatus('error');
        }
    };

    const resetSwap = () => {
        setSwapStatus('idle');
        setTxSignature("");
        setErrorMessage("");
        setSolAmount("");
        setUsdcAmount("");
        setRate("");
    };

    return (
        <div className="min-h-screen bg-black">
            <WalletNavbar />

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                    {/* Main Swap Interface */}
                    <div className="lg:col-span-2">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                            {/* Header */}
                            <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button className="text-white font-semibold text-lg">Swap</button>
                                    <button className="text-zinc-500 font-medium text-lg hover:text-zinc-300 transition-colors">Limit</button>
                                    <button className="text-zinc-500 font-medium text-lg hover:text-zinc-300 transition-colors">DCA</button>
                                </div>
                                <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                                    <Settings className="text-zinc-400" size={20} />
                                </button>
                            </div>

                            {/* Swap Content */}
                            <div className="p-6">
                                {swapStatus === 'idle' && (
                                    <div className="space-y-3">
                                        {/* From Token */}
                                        <div className="bg-black border border-zinc-800 rounded-xl p-5">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs text-zinc-500 font-medium">You Pay</span>
                                                <span className="text-xs text-zinc-500">Balance: 0.00</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 transition-colors">
                                                    <div className="w-6 h-6 bg-white rounded-full"></div>
                                                    <span className="text-white font-semibold">SOL</span>
                                                    <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                                <input
                                                    type="text"
                                                    value={solAmount}
                                                    onChange={(e) => setSolAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="flex-1 bg-transparent text-3xl font-semibold text-white outline-none placeholder-zinc-800 text-right"
                                                />
                                            </div>
                                            {solAmount && rate && (
                                                <div className="mt-3 text-right">
                                                    <span className="text-sm text-zinc-500">≈ ${(parseFloat(solAmount) * parseFloat(rate)).toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Swap Direction Button */}
                                        <div className="flex justify-center -my-2 relative z-10">
                                            <button className="bg-zinc-900 hover:bg-zinc-800 border-4 border-black p-2 rounded-xl transition-colors">
                                                <ArrowDown className="text-zinc-400" size={20} />
                                            </button>
                                        </div>

                                        {/* To Token */}
                                        <div className="bg-black border border-zinc-800 rounded-xl p-5">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs text-zinc-500 font-medium">You Receive</span>
                                                <span className="text-xs text-zinc-500">Balance: 0.00</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 transition-colors">
                                                    <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
                                                    <span className="text-white font-semibold">USDC</span>
                                                    <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                                <input
                                                    type="text"
                                                    value={usdcAmount}
                                                    readOnly
                                                    placeholder="0.00"
                                                    className="flex-1 bg-transparent text-3xl font-semibold text-white outline-none placeholder-zinc-800 text-right"
                                                />
                                            </div>
                                            {usdcAmount && (
                                                <div className="mt-3 text-right">
                                                    <span className="text-sm text-zinc-500">≈ ${parseFloat(usdcAmount).toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Route Info */}
                                        {rate && (
                                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3 mt-4">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-zinc-400">Rate</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-medium">1 SOL = {rate} USDC</span>
                                                        <button className="p-1 hover:bg-zinc-800 rounded">
                                                            <RefreshCw className="text-zinc-500" size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-zinc-400">Price Impact</span>
                                                        <Info className="text-zinc-600" size={14} />
                                                    </div>
                                                    <span className="text-green-500 font-medium">&lt; {priceImpact}%</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-zinc-400">Minimum Received</span>
                                                        <Info className="text-zinc-600" size={14} />
                                                    </div>
                                                    <span className="text-white font-medium">{(parseFloat(usdcAmount) * 0.995).toFixed(6)} USDC</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-zinc-400">Network Fee</span>
                                                    <span className="text-white font-medium">~0.000005 SOL</span>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={convert}
                                            disabled={!wallet.connected || !solAmount || parseFloat(solAmount) <= 0}
                                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white disabled:text-zinc-600 font-semibold py-4 px-6 rounded-xl transition-colors mt-4"
                                        >
                                            {wallet.connected ? 'Swap' : 'Connect Wallet'}
                                        </button>
                                    </div>
                                )}

                                {(swapStatus === 'simulating' || swapStatus === 'signing' || swapStatus === 'executing') && (
                                    <div className="py-16 flex flex-col items-center justify-center space-y-6">
                                        <Loader2 className="text-blue-500 animate-spin" size={48} />
                                        <div className="text-center space-y-2">
                                            <h3 className="text-xl font-semibold text-white">
                                                {swapStatus === 'simulating' && 'Preparing Swap'}
                                                {swapStatus === 'signing' && 'Confirm in Wallet'}
                                                {swapStatus === 'executing' && 'Processing Transaction'}
                                            </h3>
                                            <p className="text-zinc-500 text-sm">
                                                {swapStatus === 'simulating' && 'Finding the best route...'}
                                                {swapStatus === 'signing' && 'Please approve the transaction'}
                                                {swapStatus === 'executing' && 'This may take a few seconds'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {swapStatus === 'success' && (
                                    <div className="py-16 flex flex-col items-center justify-center space-y-6">
                                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                                            <CheckCircle2 className="text-green-500" size={32} />
                                        </div>
                                        <div className="text-center space-y-2">
                                            <h3 className="text-2xl font-bold text-white">Swap Successful!</h3>
                                            <p className="text-zinc-500">Your transaction has been confirmed</p>
                                        </div>
                                        
                                        <div className="w-full max-w-md space-y-3">
                                            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-zinc-400">Swapped</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 bg-white rounded-full"></div>
                                                        <span className="text-white font-semibold">{solAmount} SOL</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-zinc-400">Received</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 bg-blue-500 rounded-full"></div>
                                                        <span className="text-green-500 font-semibold">{usdcAmount} USDC</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {txSignature && (
                                                <a
                                                    href={`https://solscan.io/tx/${txSignature}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-2 w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
                                                >
                                                    View on Solscan
                                                    <ExternalLink size={16} />
                                                </a>
                                            )}

                                            <button
                                                onClick={resetSwap}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                                            >
                                                Make Another Swap
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {swapStatus === 'error' && (
                                    <div className="py-16 flex flex-col items-center justify-center space-y-6">
                                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                                            <span className="text-3xl">⚠️</span>
                                        </div>
                                        <div className="text-center space-y-2">
                                            <h3 className="text-2xl font-bold text-white">Transaction Failed</h3>
                                            <p className="text-zinc-500">{errorMessage || 'Something went wrong'}</p>
                                        </div>
                                        
                                        <div className="w-full max-w-md space-y-3">
                                            {txSignature && (
                                                <a
                                                    href={`https://solscan.io/tx/${txSignature}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center gap-2 w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-6 rounded-xl transition-colors"
                                                >
                                                    View Failed Transaction
                                                    <ExternalLink size={16} />
                                                </a>
                                            )}

                                            <button
                                                onClick={resetSwap}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                                            >
                                                Try Again
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info Banner */}
                        <div className="mt-4 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-start gap-3">
                            <Info className="text-blue-500 mt-0.5 flex-shrink-0" size={18} />
                            <div>
                                <p className="text-zinc-400 text-sm">
                                    <span className="text-white font-medium">Powered by Jupiter Aggregator.</span> Always verify transaction details before confirming. Trades are final once executed.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar - Stats & Activity */}
                    <div className="space-y-6">
                        {/* Market Stats */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                                <TrendingUp size={18} />
                                Market Stats
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-zinc-500 text-xs mb-1">24h Volume</div>
                                    <div className="text-white text-xl font-bold">$2.4B</div>
                                </div>
                                <div>
                                    <div className="text-zinc-500 text-xs mb-1">Total Swaps</div>
                                    <div className="text-white text-xl font-bold">847K</div>
                                </div>
                                <div>
                                    <div className="text-zinc-500 text-xs mb-1">Active Users</div>
                                    <div className="text-white text-xl font-bold">12.3K</div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                            <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
                            <div className="space-y-2">
                                <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium py-3 px-4 rounded-lg transition-colors text-left">
                                    View Transaction History
                                </button>
                                <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium py-3 px-4 rounded-lg transition-colors text-left">
                                    Portfolio Overview
                                </button>
                                <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium py-3 px-4 rounded-lg transition-colors text-left">
                                    Manage Tokens
                                </button>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                            <h3 className="text-white font-semibold mb-4">Recent Activity</h3>
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-zinc-800 rounded-full"></div>
                                            <div>
                                                <div className="text-white font-medium">SOL → USDC</div>
                                                <div className="text-zinc-500 text-xs">{i}m ago</div>
                                            </div>
                                        </div>
                                        <div className="text-zinc-400">0.5 SOL</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Landing;