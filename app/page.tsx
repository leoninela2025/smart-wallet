"use client";

import { useSignerStatus } from "@account-kit/react";
import UserInfoCard from "./components/user-info-card";
import LoginCard from "./components/login-card";
import Header from "./components/header";
import UsdcTransferCard from "./components/usdc-transfer-card";
import LogisticsChatbot from "./components/logistics-chatbot";

import { useEffect, useState } from "react";
import ViemVerifyComponent from "./components/VerifySig";

export default function Page() {
  const signerStatus = useSignerStatus();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Set it initially

    // Listen for storage events (optional if setting from another tab)
    console.log(localStorage)
    const handleStorageChange = () => {
      setSessionId(localStorage.getItem('currentSessionId'));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Optional: also update it reactively if you expect updates from the same tab
  useEffect(() => {
    const interval = setInterval(() => {
      const current = localStorage.getItem('currentSessionId');
      setSessionId(prev => (prev !== current ? current : prev));
    }, 1000); // poll every second or as needed

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Header />
      <div className="bg-bg-main bg-cover bg-center bg-no-repeat h-[calc(100vh-4rem)]">
        <main className="container mx-auto px-4 py-8 h-full">
          {signerStatus.isConnected ? (
            <div className="flex flex-col gap-8">
              <ViemVerifyComponent/>
              <UserInfoCard />
              <UsdcTransferCard/>
              {sessionId && <LogisticsChatbot />}
            </div>
          ) : (
            <div className="flex justify-center items-center h-full pb-[4rem]">
              <LoginCard />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}