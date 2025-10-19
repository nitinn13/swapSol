import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { useState, useEffect } from "react";
import { WalletNavbar } from "./components/WalletNavbar";
import { ArrowDown, CheckCircle2, Loader2, ExternalLink, Zap } from "lucide-react";

const Landing = () => {
    const wallet = useWallet();
    const [solAmount, setSolAmount] = useState<string>("");
    const [usdcAmount, setUsdcAmount] = useState<string>("");
    const [swapStatus, setSwapStatus] = useState<'idle' | 'simulating' | 'signing' | 'executing' | 'success' | 'error'>('idle');
    const [txSignature, setTxSignature] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [rate, setRate] = useState<string>("");

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
        <div className="min-h-screen bg-neutral-950">
            <WalletNavbar />

            <div className="flex flex-col items-center justify-center min-h-screen px-4 py-20">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 mb-6">
                        <Zap className="text-neutral-400" size={14} />
                        <span className="text-neutral-400 text-xs font-medium uppercase tracking-wide">Powered by Jupiter</span>
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-3">
                        Token Swap
                    </h1>
                    <p className="text-neutral-500">Exchange SOL for USDC instantly</p>
                </div>

                <div className="w-full max-w-md">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
                        {swapStatus === 'idle' && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs text-neutral-500 font-medium uppercase tracking-wide">From</label>
                                    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white rounded-full"></div>
                                                <span className="text-lg font-semibold text-white">SOL</span>
                                            </div>
                                            <span className="text-xs text-neutral-600">Balance: 0.00</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={solAmount}
                                            onChange={(e) => setSolAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-transparent text-2xl font-medium text-white outline-none placeholder-neutral-800"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-center -my-2 relative z-10">
                                    <div className="bg-neutral-800 p-3 rounded-lg border border-neutral-700">
                                        <ArrowDown className="text-neutral-400" size={18} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-neutral-500 font-medium uppercase tracking-wide">To</label>
                                    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
                                                <span className="text-lg font-semibold text-white">USDC</span>
                                            </div>
                                            <span className="text-xs text-neutral-600">Balance: 0.00</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={usdcAmount}
                                            readOnly
                                            placeholder="0.00"
                                            className="w-full bg-transparent text-2xl font-medium text-white outline-none placeholder-neutral-800"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={convert}
                                    disabled={!wallet.connected || !solAmount || parseFloat(solAmount) <= 0}
                                    className="w-full bg-white hover:bg-neutral-200 disabled:bg-neutral-800 disabled:cursor-not-allowed text-black disabled:text-neutral-600 font-semibold py-4 px-6 rounded-lg transition-colors mt-6"
                                >
                                    {wallet.connected ? 'Swap' : 'Connect Wallet'}
                                </button>

                                {rate && (
                                    <div className="pt-4 border-t border-neutral-800 space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-neutral-500">Rate</span>
                                            <span className="text-neutral-300 font-medium">1 SOL ≈ {rate} USDC</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-neutral-500">Slippage tolerance</span>
                                            <span className="text-neutral-300">0.5%</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {(swapStatus === 'simulating' || swapStatus === 'signing' || swapStatus === 'executing') && (
                            <div className="py-12 flex flex-col items-center justify-center space-y-6">
                                <Loader2 className="text-white animate-spin" size={48} />
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-semibold text-white">
                                        {swapStatus === 'simulating' && 'Simulating Swap'}
                                        {swapStatus === 'signing' && 'Awaiting Signature'}
                                        {swapStatus === 'executing' && 'Executing Swap'}
                                    </h3>
                                    <p className="text-neutral-500 text-sm">
                                        {swapStatus === 'simulating' && 'Getting the best route for your swap'}
                                        {swapStatus === 'signing' && 'Please sign the transaction in your wallet'}
                                        {swapStatus === 'executing' && 'Processing transaction on Solana'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {swapStatus === 'success' && (
                            <div className="py-12 flex flex-col items-center justify-center space-y-6">
                                <CheckCircle2 className="text-green-500" size={48} />
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-semibold text-white">Swap Successful</h3>
                                    <p className="text-neutral-500 text-sm">Your tokens have been swapped</p>
                                </div>
                                
                                <div className="w-full space-y-3">
                                    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-500">Swapped</span>
                                            <span className="text-white font-medium">{solAmount} SOL</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-500">Received</span>
                                            <span className="text-green-500 font-medium">{usdcAmount} USDC</span>
                                        </div>
                                    </div>

                                    {txSignature && (
                                        <a
                                            href={`https://solscan.io/tx/${txSignature}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                                        >
                                            View on Solscan
                                            <ExternalLink size={16} />
                                        </a>
                                    )}

                                    <button
                                        onClick={resetSwap}
                                        className="w-full bg-white hover:bg-neutral-200 text-black font-semibold py-3 px-6 rounded-lg transition-colors"
                                    >
                                        New Swap
                                    </button>
                                </div>
                            </div>
                        )}

                        {swapStatus === 'error' && (
                            <div className="py-12 flex flex-col items-center justify-center space-y-6">
                                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center">
                                    <span className="text-2xl">⚠️</span>
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-xl font-semibold text-white">Swap Failed</h3>
                                    <p className="text-neutral-500 text-sm">{errorMessage || 'Something went wrong'}</p>
                                </div>
                                
                                <div className="w-full space-y-3">
                                    {txSignature && (
                                        <a
                                            href={`https://solscan.io/tx/${txSignature}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                                        >
                                            View Transaction
                                            <ExternalLink size={16} />
                                        </a>
                                    )}

                                    <button
                                        onClick={resetSwap}
                                        className="w-full bg-white hover:bg-neutral-200 text-black font-semibold py-3 px-6 rounded-lg transition-colors"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-neutral-600 text-xs">
                            Always verify transaction details before confirming
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Landing;