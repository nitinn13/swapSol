import { SolanaWalletProvider } from './components/WalletProvider';
import Landing from './Landing';
const App = () => {
  return (
    <SolanaWalletProvider>
      <Landing />
    </SolanaWalletProvider>
  )
}

export default App