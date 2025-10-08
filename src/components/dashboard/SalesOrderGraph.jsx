"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useLoginStore } from "@/stores/auth.store";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function SalesOrderGraph({ dashboardData, dashboardType }) {
  const { isAuthenticated, navConfig } = useLoginStore();
  const leadLabel = navConfig?.labels?.leads || "Lead";
  const orderLabel = navConfig?.labels?.orders || "Order";
  const quotationLabel = navConfig?.labels?.Quotation_config_name || "Quotation";

  // Determine label based on dashboard type
  const label = dashboardType == "lead" ? leadLabel : dashboardType == "quotation" ? quotationLabel : orderLabel;

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

  const [selectedYear, setSelectedYear] = useState("");
  const [chartData, setChartData] = useState({
    series: [
      {
        name: dashboardType == "lead" || dashboardType == "quotation" ? pluralize(label) : "Sales",
        data: [],
      },
    ],
    options: {
      chart: {
        type: "bar",
        height: 350,
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "55%",
          borderRadius: 5,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        width: 2,
        colors: ["transparent"],
      },
      xaxis: {
        categories: [],
      },
      yaxis: {
        title: {
          text: dashboardType == "lead" || dashboardType == "quotation" ? `Number of ${pluralize(label)}` : "₹ (Rupees)",
        },
      },
      fill: {
        opacity: 1,
      },
      tooltip: {
        y: {
          formatter: function (val) {
            return dashboardType == "lead" || dashboardType == "quotation"
              ? `${val} ${pluralize(label).toLowerCase()}`
              : `₹ ${val.toFixed(2)}`;
          },
        },
      },
    },
  });

  useEffect(() => {
    if (dashboardData) {
      const years = dashboardData?.years;
      const latestYear = years?.[years.length - 1];
      const currentYear = selectedYear || latestYear;
      setSelectedYear(currentYear);

      const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
      const dataKey = dashboardType == "lead" ? "data_lead" : dashboardType == "quotation" ? "data_quotation" : "data";
      const salesData = months.map((month) =>
        Number(dashboardData?.[dataKey]?.[currentYear]?.[month] || 0).toFixed(
          dashboardType == "lead" || dashboardType == "quotation" ? 0 : 2
        )
      );

      setChartData({
        series: [
          {
            name: dashboardType == "lead" || dashboardType == "quotation" ? pluralize(label) : "Sales",
            data: salesData,
          },
        ],
        options: {
          ...chartData.options,
          xaxis: {
            categories: months,
          },
          yaxis: {
            title: {
              text: dashboardType == "lead" || dashboardType == "quotation" ? `Number of ${pluralize(label)}` : "₹ (Rupees)",
            },
          },
        },
      });
    }
  }, [dashboardData, selectedYear, dashboardType, label]);

  // if (!isAuthenticated) {
  //   return <div className="p-4 text-red-500">Please log in to view the graph.</div>;
  // }

  if (!dashboardData) {
    return <div className="p-4 text-red-500">No data available for the graph.</div>;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold">
          {dashboardType == "lead" ? `${leadLabel} Performance` : dashboardType == "quotation" ? `${quotationLabel} Performance` : "Sales Performance"}
        </h2>
        <div className="flex items-center gap-2">
          <label htmlFor="financialYear" className="font-medium whitespace-nowrap">
            Financial Year:
          </label>
          <select
            id="financialYear"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border rounded p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
          >
            {dashboardData?.years?.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div id="chart" className="mt-0 sm:mt-[100px]">
        <ReactApexChart
          options={chartData.options}
          series={chartData.series}
          type="bar"
          height={350}
        />
      </div>
    </div>
  );
}