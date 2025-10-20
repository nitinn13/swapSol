import { useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from '@solana/web3.js';
import { useState, useEffect, useRef } from "react";
import { WalletNavbar } from "./components/WalletNavbar";
import { CheckCircle2, Loader2, ExternalLink, Zap, ChevronDown, Search, X, ArrowDownUp } from "lucide-react";
import { solanaTokens } from "./data/tokens";

interface TokenInfo {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  decimals: number;
  isVerified?: boolean;
  usdPrice?: number;
  organicScore?: number;
  balance?: string;
}

const Landing = () => {
    const wallet = useWallet();
    const [initialAmount, setinitialAmount] = useState<string>("");
    const [finalAmount, setfinalAmount] = useState<string>("");
    const [swapStatus, setSwapStatus] = useState<'idle' | 'simulating' | 'signing' | 'executing' | 'success' | 'error'>('idle');
    const [txSignature, setTxSignature] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [rate, setRate] = useState<string>("");
    const userPubKey = wallet.publicKey?.toString();
    const [inputMint, setinputMint] = useState(solanaTokens.SOL.address);
    const [outputMint, setoutputMint] = useState(solanaTokens.USDC.address);
    const [showInputDropdown, setShowInputDropdown] = useState(false);
    const [showOutputDropdown, setShowOutputDropdown] = useState(false);
    const [inputTokenInfo, setInputTokenInfo] = useState<TokenInfo | null>(null);
    const [outputTokenInfo, setOutputTokenInfo] = useState<TokenInfo | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [allTokens, setAllTokens] = useState<TokenInfo[]>([]);
    const [isLoadingTokens, setIsLoadingTokens] = useState(false);
    const [walletTokens, setWalletTokens] = useState<TokenInfo[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const tokenList = Object.values(solanaTokens);

    // Helper function to get reliable icon URLs
    const getTokenIcon = (token: TokenInfo) => {
        if (token.icon && token.icon.startsWith('http')) {
            return token.icon;
        }
        
        // Fallback to Solana Token List icons for known tokens
        const knownIcons: { [key: string]: string } = {
            'So11111111111111111111111111111111111111112': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
            'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
            'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
            'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn/logo.png',
        };
        
        return knownIcons[token.id] || '';
    };

    // Fetch token details including icons
    const fetchTokenDetails = async (mintAddress: string, isInput: boolean) => {
        try {
            const response = await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${mintAddress}`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const tokenInfo = data[0];
                const tokenWithIcon = {
                    ...tokenInfo,
                    icon: getTokenIcon(tokenInfo)
                };
                if (isInput) {
                    setInputTokenInfo(tokenWithIcon);
                } else {
                    setOutputTokenInfo(tokenWithIcon);
                }
            }
        } catch (err) {
            console.error("Error fetching token details:", err);
        }
    };

    // Fetch popular tokens for dropdown
    const fetchPopularTokens = async () => {
        setIsLoadingTokens(true);
        try {
            const response = await fetch('https://lite-api.jup.ag/tokens/v2/top');
            const data = await response.json();
            
            console.log('Token API Response:', data); // Debug log
            
            const tokensWithIcons = data.map((token: TokenInfo) => ({
                ...token,
                icon: getTokenIcon(token),
                balance: (Math.random() * 100).toFixed(6) // Mock balance for demo
            }));
            
            setAllTokens(tokensWithIcons);
            setWalletTokens(tokensWithIcons.slice(0, 8)); // Mock wallet tokens
            
        } catch (err) {
            console.error("Error fetching popular tokens:", err);
            // Fallback to our predefined tokens with proper icons
            const fallbackTokens = tokenList.map(token => ({
                id: token.address,
                name: token.name,
                symbol: token.symbol,
                icon: getTokenIcon({ id: token.address } as TokenInfo),
                decimals: 9,
                balance: (Math.random() * 100).toFixed(6),
                isVerified: true,
                usdPrice: token.symbol === 'SOL' ? 192.42 : token.symbol === 'USDC' ? 1.00 : 0.50,
                organicScore: token.symbol === 'SOL' ? 99 : token.symbol === 'USDC' ? 100 : 95
            }));
            setAllTokens(fallbackTokens);
            setWalletTokens(fallbackTokens.slice(0, 8));
        }
        setIsLoadingTokens(false);
    };

    useEffect(() => {
        fetchTokenDetails(inputMint, true);
        fetchTokenDetails(outputMint, false);
        fetchPopularTokens();
    }, [inputMint, outputMint]);

    useEffect(() => {
        if (showInputDropdown || showOutputDropdown) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        }
    }, [showInputDropdown, showOutputDropdown]);

    const getTokenByAddress = (address: string) => {
        return tokenList.find(token => token.address === address) || solanaTokens.SOL;
    };

    // const inputToken = getTokenByAddress(inputMint);
    // const outputToken = getTokenByAddress(outputMint);

    const filteredTokens = allTokens.filter(token => 
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const quote = async (amount: string) => {
        const tokenAmount = parseFloat(amount);

        if (isNaN(tokenAmount) || tokenAmount <= 0) {
            setfinalAmount("");
            setRate("");
            return;
        }

        try {
            const tokenInfoArray = await (
                await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${inputMint}`)
            ).json();
            if (!tokenInfoArray || tokenInfoArray.length === 0) {
                console.error("Input token not found");
                return;
            }
            const tokenInfo = tokenInfoArray[0];
            const amountInUnits = Math.floor(tokenAmount * Math.pow(10, tokenInfo.decimals));

            if (!userPubKey) return console.error("No wallet connected");

            const quoteResponse = await fetch(
                `https://lite-api.jup.ag/ultra/v1/order?` +
                `inputMint=${inputMint}` +
                `&outputMint=${outputMint}` +
                `&amount=${amountInUnits}` +
                `&taker=${userPubKey}`
            );
            const finalQuote = await quoteResponse.json();
            console.log("Quote:", finalQuote);

            if (finalQuote && finalQuote.outAmount) {
                const outputTokenArray = await (
                    await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${outputMint}`)
                ).json();
                const outputToken = outputTokenArray[0];

                const tokenOut = Number(finalQuote.outAmount) / Math.pow(10, outputToken.decimals);
                setfinalAmount(tokenOut.toFixed(outputToken.decimals));
                setRate((tokenOut / tokenAmount).toFixed(2));
            }

            return finalQuote;
        } catch (err) {
            console.error("Error fetching quote:", err);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (initialAmount) quote(initialAmount);
        }, 500);

        return () => clearTimeout(timeout);
    }, [initialAmount, inputMint, outputMint]);

    const convert = async () => {
        if (!wallet.connected || !wallet.publicKey) {
            setErrorMessage("Wallet not connected");
            setSwapStatus('error');
            return;
        }

        setSwapStatus('simulating');
        setErrorMessage("");
        setTxSignature("");

        const finalQuote = await quote(initialAmount);

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
        setinitialAmount("");
        setfinalAmount("");
        setRate("");
    };

    const handleInputTokenSelect = (token: TokenInfo) => {
        setinputMint(token.id);
        setShowInputDropdown(false);
        setSearchQuery("");
        setinitialAmount("");
        setfinalAmount("");
        setRate("");
    };

    const handleOutputTokenSelect = (token: TokenInfo) => {
        setoutputMint(token.id);
        setShowOutputDropdown(false);
        setSearchQuery("");
        setfinalAmount("");
        setRate("");
    };

    const swapTokens = () => {
        const tempInput = inputMint;
        const tempInputAmount = initialAmount;
        
        setinputMint(outputMint);
        setoutputMint(tempInput);
        setinitialAmount(finalAmount);
        setfinalAmount(tempInputAmount);
    };

    const TokenItem = ({ token, onSelect}: { token: TokenInfo; onSelect: (token: TokenInfo) => void; showBalance?: boolean }) => {
        const [iconError, setIconError] = useState(false);

        const formatAddress = (address: string) => {
            return `${address.slice(0, 4)}...${address.slice(-4)}`;
        };

        const getScoreColor = (score?: number) => {
            if (!score) return "text-neutral-500";
            if (score >= 98) return "text-green-500";
            if (score >= 95) return "text-yellow-500";
            return "text-red-500";
        };

        const getFallbackColor = (symbol: string) => {
            const colors = [
                'bg-gradient-to-br from-purple-500 to-blue-500',
                'bg-gradient-to-br from-green-500 to-emerald-500',
                'bg-gradient-to-br from-orange-500 to-red-500',
                'bg-gradient-to-br from-pink-500 to-rose-500',
                'bg-gradient-to-br from-cyan-500 to-blue-500',
                'bg-gradient-to-br from-yellow-500 to-orange-500'
            ];
            const index = symbol.length % colors.length;
            return colors[index];
        };

        // const calculateUSDValue = () => {
        //     if (!token.usdPrice || !token.balance) return '0.00';
        //     return (parseFloat(token.balance) * token.usdPrice).toFixed(4);
        // };

        return (
            <button
                onClick={() => onSelect(token)}
                className="flex items-center gap-3 w-full px-3 py-2 hover:bg-neutral-800 transition-colors rounded-lg group"
            >
                {/* Token Icon */}
                <div className="relative flex-shrink-0">
                    {token.icon && !iconError ? (
                        <img 
                            src={token.icon} 
                            alt={token.symbol}
                            className="w-10 h-10 rounded-full"
                            onError={() => setIconError(true)}
                        />
                    ) : (
                        <div className={`w-10 h-10 rounded-full ${getFallbackColor(token.symbol)} flex items-center justify-center`}>
                            <span className="text-white text-xs font-medium">
                                {token.symbol.slice(0, 3)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Token Info */}
                <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium text-sm">{token.symbol}</span>
                        {token.organicScore && (
                            <span className={`text-xs font-medium ${getScoreColor(token.organicScore)}`}>
                                {Math.round(token.organicScore)}
                            </span>
                        )}
                        {token.isVerified && (
                            <CheckCircle2 className="text-blue-500" size={12} />
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-neutral-500">{token.name}</span>
                        <span className="text-neutral-700">•</span>
                        <span className="text-neutral-500 font-mono">{formatAddress(token.id)}</span>
                    </div>
                    
                    
                </div>

               
            </button>
        );
    };

    const TokenDropdown = ({ isInput, onSelect }: { isInput: boolean; onSelect: (token: TokenInfo) => void }) => (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-neutral-800">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-semibold">Select token</h3>
                        <button
                            onClick={() => {
                                isInput ? setShowInputDropdown(false) : setShowOutputDropdown(false);
                                setSearchQuery("");
                            }}
                            className="text-neutral-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500" size={16} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder='Search any token. Include " " for exact match.'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-3 text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                        />
                    </div>
                </div>
                
                {/* Token List */}
                <div className="overflow-y-auto max-h-[60vh]">
                    {isLoadingTokens ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="text-neutral-400 animate-spin" size={24} />
                        </div>
                    ) : searchQuery ? (
                        filteredTokens.length === 0 ? (
                            <div className="text-center py-8 text-neutral-500 text-sm">
                                No tokens found
                            </div>
                        ) : (
                            <div className="p-2">
                                {filteredTokens.map((token) => (
                                    <TokenItem key={token.id} token={token} onSelect={onSelect} />
                                ))}
                            </div>
                        )
                    ) : (
                        <>
                            {/* Wallet Tokens Section */}
                            <div className="p-4 border-b border-neutral-800">
                                <h4 className="text-neutral-500 text-xs font-medium uppercase tracking-wide mb-3">Your Tokens</h4>
                                <div className="space-y-2">
                                    {walletTokens.map((token) => (
                                        <TokenItem key={token.id} token={token} onSelect={onSelect} showBalance />
                                    ))}
                                </div>
                            </div>
                            
                            {/* Popular Tokens Section */}
                            <div className="p-4">
                                <h4 className="text-neutral-500 text-xs font-medium uppercase tracking-wide mb-3">Popular Tokens</h4>
                                <div className="space-y-2">
                                    {allTokens.slice(0, 10).map((token) => (
                                        <TokenItem key={token.id} token={token} onSelect={onSelect} />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    const TokenDisplay = ({ tokenInfo, isInput }: { tokenInfo: TokenInfo | null; isInput: boolean }) => {
        const [iconError, setIconError] = useState(false);

        const getFallbackColor = (symbol: string) => {
            return symbol ? 'bg-gradient-to-br from-purple-500 to-blue-500' : 'bg-gradient-to-br from-green-500 to-emerald-500';
        };

        return (
            <div className="flex items-center gap-2">
                {tokenInfo?.icon && !iconError ? (
                    <img 
                        src={tokenInfo.icon} 
                        alt={tokenInfo.symbol}
                        className="w-6 h-6 rounded-full"
                        onError={() => setIconError(true)}
                    />
                ) : (
                    <div className={`w-6 h-6 rounded-full ${getFallbackColor(tokenInfo?.symbol || '')} flex items-center justify-center`}>
                        <span className="text-white text-xs font-medium">
                            {tokenInfo?.symbol?.slice(0, 2) || (isInput ? 'IN' : 'OUT')}
                        </span>
                    </div>
                )}
                <button
                    onClick={() => isInput ? setShowInputDropdown(true) : setShowOutputDropdown(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                    <span className="text-lg font-semibold text-white">{tokenInfo?.symbol || getTokenByAddress(isInput ? inputMint : outputMint).symbol}</span>
                    <ChevronDown className="text-neutral-400" size={16} />
                </button>
                {tokenInfo?.isVerified && (
                    <CheckCircle2 className="text-blue-500" size={14} />
                )}
            </div>
        );
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
                    <p className="text-neutral-500">Exchange tokens instantly</p>
                </div>

                <div className="w-full max-w-md">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
                        {swapStatus === 'idle' && (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs text-neutral-500 font-medium uppercase tracking-wide">From</label>
                                    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors relative">
                                        <div className="flex items-center justify-between mb-3">
                                            <TokenDisplay tokenInfo={inputTokenInfo} isInput={true} />
                                            <span className="text-xs text-neutral-600">Balance: 0.00</span>
                                        </div>
                                        
                                        {showInputDropdown && (
                                            <TokenDropdown isInput={true} onSelect={handleInputTokenSelect} />
                                        )}

                                        <input
                                            type="text"
                                            value={initialAmount}
                                            onChange={(e) => setinitialAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-transparent text-2xl font-medium text-white outline-none placeholder-neutral-800"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-center -my-2 relative z-10">
                                    <button
                                        onClick={swapTokens}
                                        className="bg-neutral-800 p-3 rounded-lg border border-neutral-700 hover:bg-neutral-700 transition-colors"
                                    >
                                        <ArrowDownUp className="text-neutral-400" size={18} />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-neutral-500 font-medium uppercase tracking-wide">To</label>
                                    <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 relative">
                                        <div className="flex items-center justify-between mb-3">
                                            <TokenDisplay tokenInfo={outputTokenInfo} isInput={false} />
                                            <span className="text-xs text-neutral-600">Balance: 0.00</span>
                                        </div>
                                        
                                        {showOutputDropdown && (
                                            <TokenDropdown isInput={false} onSelect={handleOutputTokenSelect} />
                                        )}

                                        <input
                                            type="text"
                                            value={finalAmount}
                                            readOnly
                                            placeholder="0.00"
                                            className="w-full bg-transparent text-2xl font-medium text-white outline-none placeholder-neutral-800"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={convert}
                                    disabled={!wallet.connected || !initialAmount || parseFloat(initialAmount) <= 0}
                                    className="w-full bg-white hover:bg-neutral-200 disabled:bg-neutral-800 disabled:cursor-not-allowed text-black disabled:text-neutral-600 font-semibold py-4 px-6 rounded-lg transition-colors mt-6"
                                >
                                    {wallet.connected ? 'Swap' : 'Connect Wallet'}
                                </button>

                                {rate && inputTokenInfo && outputTokenInfo && (
                                    <div className="pt-4 border-t border-neutral-800 space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-neutral-500">Rate</span>
                                            <span className="text-neutral-300 font-medium">
                                                1 {inputTokenInfo.symbol} ≈ {rate} {outputTokenInfo.symbol}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-neutral-500">Slippage tolerance</span>
                                            <span className="text-neutral-300">0.5%</span>
                                        </div>
                                        {inputTokenInfo.usdPrice && (
                                            <div className="flex justify-between">
                                                <span className="text-neutral-500">Price</span>
                                                <span className="text-neutral-300">
                                                    ${inputTokenInfo.usdPrice.toFixed(2)} / {inputTokenInfo.symbol}
                                                </span>
                                            </div>
                                        )}
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
                                            <span className="text-white font-medium">{initialAmount} {inputTokenInfo?.symbol}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-neutral-500">Received</span>
                                            <span className="text-green-500 font-medium">{finalAmount} {outputTokenInfo?.symbol}</span>
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