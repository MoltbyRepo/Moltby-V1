/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ConnectWallet } from "./components/onboarding/ConnectWallet";
import { AgentName } from "./components/onboarding/AgentName";
import { BotToken } from "./components/onboarding/BotToken";
import { ChatId } from "./components/onboarding/ChatId";
import { LoadingScreen } from "./components/onboarding/LoadingScreen";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";

type Step = "wallet" | "name" | "token" | "chatId" | "loading" | "dashboard";

export default function App() {
  const [step, setStep] = useState<Step>("wallet");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [agentData, setAgentData] = useState({
    name: "",
    token: "",
    chatId: "",
  });

  const handleWalletConnect = async (address: string) => {
    setWalletAddress(address);
    
    // Check if user exists in localStorage
    const savedData = localStorage.getItem(`moltby_user_${address}`);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setAgentData(parsedData);
        
        // Start the bot if data exists
        if (parsedData.token) {
          try {
            await fetch("/api/bot/start", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                token: parsedData.token,
                chatId: parsedData.chatId,
              }),
            });
          } catch (error) {
            console.error("Failed to start bot from saved data:", error);
          }
        }

        setStep("dashboard");
      } catch (e) {
        console.error("Failed to parse user data", e);
        setStep("name");
      }
    } else {
      setStep("name");
    }
  };

  const handleNameSubmit = (name: string) => {
    setAgentData(prev => ({ ...prev, name }));
    setStep("token");
  };

  const handleTokenSubmit = (token: string) => {
    setAgentData(prev => ({ ...prev, token }));
    setStep("chatId");
  };

  const handleChatIdSubmit = (chatId: string) => {
    setAgentData(prev => ({ ...prev, chatId }));
    setStep("loading");
  };

  const handleLoadingComplete = async () => {
    // Save user data to localStorage
    if (walletAddress) {
      localStorage.setItem(`moltby_user_${walletAddress}`, JSON.stringify(agentData));
    }

    // Start the Telegram bot
    try {
      await fetch("/api/bot/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: agentData.token,
          chatId: agentData.chatId,
        }),
      });
    } catch (error) {
      console.error("Failed to start bot:", error);
    }

    setStep("dashboard");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      <AnimatePresence mode="wait">
        {step === "wallet" && (
          <motion.div key="wallet" className="h-full" exit={{ opacity: 0 }}>
            <ConnectWallet onConnect={handleWalletConnect} />
          </motion.div>
        )}
        {step === "name" && (
          <motion.div key="name" className="h-full" exit={{ opacity: 0 }}>
            <AgentName onNext={handleNameSubmit} />
          </motion.div>
        )}
        {step === "token" && (
          <motion.div key="token" className="h-full" exit={{ opacity: 0 }}>
            <BotToken onNext={handleTokenSubmit} />
          </motion.div>
        )}
        {step === "chatId" && (
          <motion.div key="chatId" className="h-full" exit={{ opacity: 0 }}>
            <ChatId onNext={handleChatIdSubmit} token={agentData.token} />
          </motion.div>
        )}
        {step === "loading" && (
          <motion.div key="loading" className="h-full" exit={{ opacity: 0 }}>
            <LoadingScreen onComplete={handleLoadingComplete} />
          </motion.div>
        )}
        {step === "dashboard" && (
          <motion.div key="dashboard" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <DashboardLayout />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
