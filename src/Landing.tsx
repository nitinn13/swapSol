import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { useState, useEffect } from "react";
import { WalletNavbar } from "./components/WalletNavbar";
import { ArrowDown } from "lucide-react";

const Landing = () => {
    const wallet = useWallet();
    const [solAmount, setSolAmount] = useState<string>("");
    const [usdcAmount, setUsdcAmount] = useState<string>("");

   

    const userPubKey = wallet.publicKey?.toString();

    const connection = new Connection('https://api.mainnet-beta.solana.com');
    // const connection = new Connection('https://api.devnet.solana.com');

    const quote = async (amount: string) => {
        const sol = parseFloat(amount);

        if (isNaN(sol) || sol <= 0) {
            setUsdcAmount("");
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
                setUsdcAmount((Number(finalQuote.outAmount) / 1_000_000).toFixed(6));
            }

            return finalQuote;
        } catch (err) {
            console.error("Error fetching quote:", err);
        }
    };

    // Debounce quote calls
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (solAmount) quote(solAmount);
        }, 500);

        return () => clearTimeout(timeout);
    }, [solAmount]);

    const convert = async () => {
        if (!wallet.connected || !wallet.publicKey) {
            console.error("Wallet not connected");
            return;
        }

        const finalQuote = await quote(solAmount);

        if (!finalQuote) {
            console.error("No quote available");
            return;
        }

        try {

            const transactionBase64 = finalQuote.transaction;

            const transaction = VersionedTransaction.deserialize(Buffer.from(transactionBase64, 'base64'));



            if (!wallet || !wallet.signTransaction) {
                throw new Error("Wallet not connected or signTransaction not available");
            }

            const signedTx = await wallet?.signTransaction(transaction);
            const signedTransaction = Buffer.from(signedTx.serialize()).toString('base64');


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
                console.log(`https://solscan.io/tx/${executeResponse.signature}`);
            } else {
                console.error('Swap failed:', JSON.stringify(executeResponse, null, 2));
                console.log(`https://solscan.io/tx/${executeResponse.signature}`);
            }

        } catch (err) {
            console.error("Swap failed:", err);
        }
    };


    return (
        <div className="min-h-screen bg-black">
            <WalletNavbar />

            <div className="flex flex-col items-center justify-center min-h-screen px-4 py-20">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-semibold text-white mb-2">Token Swap</h1>
                    <p className="text-gray-500">Exchange SOL for USDC</p>
                </div>

                <div className="w-full max-w-md">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">From</label>
                            <div className="bg-black border border-zinc-800 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-lg font-medium text-white">SOL</span>
                                    <span className="text-xs text-gray-600">Balance: 0.00</span>
                                </div>
                                <input
                                    type="text"
                                    value={solAmount}
                                    onChange={(e) => setSolAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-transparent text-xl text-white outline-none placeholder-gray-700"
                                />
                            </div>
                        </div>

                        <div className="flex justify-center py-2">
                            <div className="bg-zinc-800 p-2 rounded-lg">
                                <ArrowDown className="text-gray-400" size={20} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">To</label>
                            <div className="bg-black border border-zinc-800 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-lg font-medium text-white">USDC</span>
                                    <span className="text-xs text-gray-600">Balance: 0.00</span>
                                </div>
                                <input
                                    type="text"
                                    value={usdcAmount}
                                    readOnly
                                    placeholder="0.00"
                                    className="w-full bg-transparent text-xl text-white outline-none placeholder-gray-700"
                                />
                            </div>
                        </div>

                        <button
                            onClick={convert}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors mt-6"
                        >
                            Swap
                        </button>

                        <div className="pt-4 border-t border-zinc-800 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Rate</span>
                                <span className="text-gray-300">1 SOL ≈ </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Swap slippage tolerance</span>
                                <span className="text-gray-300">0.5%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Landing;
