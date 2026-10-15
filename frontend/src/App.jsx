import React, { useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import RegisterBatch from "./pages/RegisterBatch";
import Shipments from "./pages/Shipments";
import TemperatureSimulator from "./pages/TemperatureSimulator";
import BatchDetails from "./pages/BatchDetails";
import VerifyCertificate from "./pages/VerifyCertificate";
import { useWallet } from "./hooks/useWallet";

export default function App() {
  const wallet = useWallet();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedBatch, setSelectedBatch] = useState(null);

  const handleSelectBatch = (batch) => {
    setSelectedBatch(batch);
  };

  const handleNavigate = (tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <Navbar
        wallet={wallet}
        activeTab={activeTab}
        onToggleSidebar={() => {}}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleNavigate}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl">
          {activeTab === "dashboard" && (
            <Dashboard
              onNavigate={handleNavigate}
              onSelectBatch={handleSelectBatch}
            />
          )}

          {activeTab === "register" && (
            <RegisterBatch
              wallet={wallet}
              onBatchRegistered={(newBatch) => {
                setSelectedBatch(newBatch);
                handleNavigate("dashboard");
              }}
            />
          )}

          {activeTab === "shipments" && (
            <Shipments
              wallet={wallet}
              onSelectBatch={handleSelectBatch}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === "simulator" && (
            <TemperatureSimulator
              wallet={wallet}
              activeBatch={selectedBatch}
              onSelectBatch={handleSelectBatch}
            />
          )}

          {activeTab === "details" && (
            <BatchDetails
              wallet={wallet}
              batch={selectedBatch}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === "verify" && (
            <VerifyCertificate
              wallet={wallet}
            />
          )}
        </main>
      </div>
    </div>
  );
}
