import React from "react";
import CasesTodayCard from "../components/Dashboard/CasesTodayCard";
import CasesLast30DaysCard from "../components/Dashboard/CasesLast30DaysCard";
import InboundCallsCard from "../components/Dashboard/InboundCallsCard";
import CallMetricsCard from "../components/Dashboard/CallMetricsCard";
import QueueCard from "../components/Dashboard/QueueCard";
import AgentsAvailableCard from "../components/Dashboard/AgentsAvailableCard";
import CSAT7DaysChart from "../components/Dashboard/CSAT7DaysChart";
import AbandonedCallsCard from "../components/Dashboard/AbandonedCallsCard";
import TopResolversCard from "../components/Dashboard/TopResolversCard";
import "./Dashboard.css";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">
        Dashboard Overview
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <CasesTodayCard />
        <CasesLast30DaysCard />
        <InboundCallsCard />
        <CallMetricsCard />
        <QueueCard />
        <AgentsAvailableCard />
        <CSAT7DaysChart />
        <AbandonedCallsCard />
        <TopResolversCard />
      </div>
    </div>
  );
}
