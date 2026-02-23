import { motion } from "motion/react";
import { Wallet, ArrowRight, AlertCircle } from "lucide-react";
import { useState } from "react";

interface ConnectWalletProps {
  onConnect: (address: string) => void;
}

declare global {
  interface Window {
    ethereum?: any;
    solana?: any;
  }
}

export function ConnectWallet({ onConnect }: ConnectWalletProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectMetamask = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        onConnect(accounts[0]);
      } else {
        setError("MetaMask is not installed. Please install it to continue.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to MetaMask.");
    } finally {
      setIsConnecting(false);
    }
  };

  const connectPhantom = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      if (typeof window.solana !== 'undefined' && window.solana.isPhantom) {
        const resp = await window.solana.connect();
        onConnect(resp.publicKey.toString());
      } else {
        setError("Phantom wallet is not installed. Please install it to continue.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to Phantom.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-cyan-600/5 blur-[80px] rounded-full mix-blend-screen" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full space-y-8 relative z-10"
      >
        <div className="space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-20 h-20 rounded-2xl mx-auto shadow-2xl shadow-white/10 overflow-hidden"
          >
            <img src="/logo.png" alt="Moltby" className="w-full h-full object-cover" />
          </motion.div>
          
          <div>
            <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl bg-gradient-to-b from-white via-white to-zinc-500 bg-clip-text text-transparent pb-2">
              Moltby
            </h1>
            <p className="text-zinc-400 text-lg">
              Manage your Telegram agents with ease. <br />
              Connect your wallet to login or register.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(246, 133, 27, 0.2)" }}
            whileTap={{ scale: 0.98 }}
            onClick={connectMetamask}
            disabled={isConnecting}
            className="group w-full flex items-center justify-center gap-3 bg-[#f6851b] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#e2761b] transition-all duration-200 shadow-lg shadow-[#f6851b]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wallet className="w-5 h-5 transition-transform group-hover:-rotate-12" />
            Connect MetaMask
            <ArrowRight className="w-5 h-5 ml-auto opacity-50 group-hover:translate-x-1 transition-transform" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(171, 159, 242, 0.2)" }}
            whileTap={{ scale: 0.98 }}
            onClick={connectPhantom}
            disabled={isConnecting}
            className="group w-full flex items-center justify-center gap-3 bg-[#ab9ff2] text-black px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[#9a8ee0] transition-all duration-200 shadow-lg shadow-[#ab9ff2]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wallet className="w-5 h-5 transition-transform group-hover:-rotate-12" />
            Connect Phantom
            <ArrowRight className="w-5 h-5 ml-auto opacity-50 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-200 text-sm text-left"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-zinc-600"
        >
          By connecting, you agree to our Terms of Service and Privacy Policy.
        </motion.p>
      </motion.div>
    </div>
  );
}
