import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';


export function WalletNavbar() {

    return (
        <div className="flex justify-end items-center p-4 relative z-40">
            
            <div className="flex items-center space-x-4">
                <WalletMultiButton className="!bg-[#6C45FF] !rounded-lg !text-white !font-semibold !py-2 !px-4 !transition-colors !duration-300 !text-sm" />
            </div>
        </div>
    );
}