
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLoginStore } from "@/stores/auth.store";
import SalesOrderGraph from "@/components/dashboard/SalesOrderGraph";
import DonutChartProduct from "@/components/dashboard/DonutChartProduct";
import CountReports from "@/components/dashboard/CountReports";
import DonutChartSales from "@/components/dashboard/DonutChartSales";
import DashboardService from "@/lib/DashboardService";
import RecentOrders from "@/components/dashboard/RecentOrders";
import RecentLeads from "@/components/dashboard/RecentLeads";
import RecentQuotations from "@/components/dashboard/RecentQuotations";
import TimelineLayout from "@/components/timeline-layout";
import { HashLoader } from "react-spinners";

export default function DashboardPage() {
  const { isAuthenticated, token, user, navConfig } = useLoginStore();
  const leadLabel = navConfig?.labels?.leads || "Lead";
  const orderLabel = navConfig?.labels?.orders || "Order";
  const quotationLabel = navConfig?.labels?.Quotation_config_name || "Quotation";

  // Determine available dashboards based on permissions
  const availableDashboards = [];
  if (navConfig?.permissions?.showLeads) {
    availableDashboards.push({ value: "lead", label: `${leadLabel} Dashboard` });
  }
  if (navConfig?.permissions?.showQuotations) {
    availableDashboards.push({ value: "quotation", label: `${quotationLabel} Dashboard` });
  }
  if (navConfig?.permissions?.showOrders) {
    availableDashboards.push({ value: "sales", label: `${orderLabel} Dashboard` });
  }

  const [selectedDashboard, setSelectedDashboard] = useState(availableDashboards[0]?.value || "lead");

  // Show selector only if multiple dashboards are available
  const showSelector = availableDashboards.length > 1;
  const dashboardType = showSelector ? selectedDashboard : availableDashboards[0]?.value || "lead";
  const dashboardTitle = availableDashboards.find((d) => d.value == dashboardType)?.label || "Dashboard";

  // Helper function for pluralization
  const pluralize = (word) => {
    if (word.toLowerCase() == "inquiry") {
      return "Inquiries";
    }
    if (word.toLowerCase().endsWith("y") && !/[aeiou]y$/i.test(word)) {
      return word.slice(0, -1) + "ies";
    }
    return word + "s";
  };

  // Fetch dashboard data using useQuery
  const { data, error, isLoading } = useQuery({
    queryKey: ["dashboardData", token, user?.id],
    queryFn: () => DashboardService.getDashboardData(token, user?.id),
    enabled: !!isAuthenticated && !!token && !!user?.id,
    refetchOnMount: "always",
    staleTime: 0,
    cacheTime: 0,
  });

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading dashboard data: {error?.message}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
        <HashLoader color="#287f71" size={60} speedMultiplier={1.5} />
      </div>
    );
  }

  // Determine type key
  const typeKey = dashboardType == "lead" ? "7" : dashboardType == "quotation" ? "17" : "21";

  // Merge common fields (years, contact) with dashboard-specific data
  const dashboardData = {
    ...data?.DATA?.[typeKey],
    years: data?.DATA?.years,
    contact: data?.DATA?.contact,
    timestamp: data?.DATA?.timestamp,
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">{dashboardTitle}</h1>
        {showSelector && (
          <div className="flex items-center gap-2 px-4">
            <select
              id="dashboardType"
              value={selectedDashboard}
              onChange={(e) => setSelectedDashboard(e.target.value)}
              className="border rounded p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
            >
              {availableDashboards.map((db) => (
                <option key={db.value} value={db.value}>
                  {db.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SalesOrderGraph
          dashboardData={dashboardData}
          dashboardType={dashboardType}
        />
        <CountReports
          dashboardData={dashboardData}
          dashboardType={dashboardType}
        />
        <DonutChartProduct
          dashboardData={dashboardData}
          dashboardType={dashboardType}
        />
        <DonutChartSales
          dashboardData={dashboardData}
          dashboardType={dashboardType}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        {dashboardType == "lead" ? (
          <RecentLeads />
        ) : dashboardType == "quotation" ? (
          <RecentQuotations />
        ) : (
          <RecentOrders />
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <TimelineLayout />
        </div>
      </div>
    </div>
  );
}
