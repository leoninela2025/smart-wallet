import { Button } from "@/components/ui/button";
import { LogOut, Wallet, Brain } from "lucide-react";
import { useLogout, useSignerStatus } from "@account-kit/react";
import Image from "next/image";

export default function Header() {
  const { logout } = useLogout();
  const { isConnected } = useSignerStatus();

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Wallet className="h-6 w-6 text-blue-600" />
              <Brain className="h-4 w-4 text-purple-600 absolute -top-1 -right-1" />
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-gray-900">x402 × Agentic AI</h1>
            <p className="text-sm text-gray-600 -mt-1">with Smart Wallet</p>
          </div>
        </div>

        {isConnected && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        )}
      </div>
    </header>
  );
}
