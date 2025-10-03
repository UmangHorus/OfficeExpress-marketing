"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, ArrowUpDown, MapPin, Eye, Pencil, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import QuotationDetailsDialog from "../shared/QuotationDetailsDialog";
import { QuotationService } from "@/lib/QuotationService";
import { useLoginStore } from "@/stores/auth.store";
import { useSharedDataStore } from "@/stores/sharedData.store";

const QuotationTable = () => {
  const { user, token } = useLoginStore();
  const { templateList } =
    useSharedDataStore();
  const router = useRouter();
  const orderLabel = useLoginStore(
    (state) => state.navConfig?.labels?.orders || "Order"
  );
  const contactLabel = useLoginStore(
    (state) => state.navConfig?.labels?.contacts || "Contact"
  );
  const quotationLabel = useLoginStore(
    (state) => state.navConfig?.labels?.Quotation_config_name || "Quotation"
  );
  const [data, setData] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({ id: false });
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [selectedQuotationId, setSelectedQuotationId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(""); // State for selected template
  const [downloading, setDownloading] = useState({}); // Track downloading state per quotation
  const queryClient = useQueryClient();
  

  const {
    data: quotationData,
    error: quotationError,
    isLoading: quotationLoading,
    refetch: refetchQuotations,
  } = useQuery({
    queryKey: ["quotations", user?.id, token],
    queryFn: () => QuotationService.getQuotation(token, user?.id), // Assuming it takes token and user.id
    enabled: !!token && !!user?.id,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (quotationData) {
      const responseData = Array.isArray(quotationData) ? quotationData[0] : quotationData;
      if (responseData?.STATUS === "SUCCESS") {
        const quotationList = responseData?.DATA
          .filter((item) => item && item.quotation_id)
          .map((quotation) => ({
            id: quotation.quotation_id || "",
            fullquotationno: quotation.fullquotationno || "",
            customername: quotation.contact_name || "Unknown",
            createdate: quotation.created_dt || "",
            status_flg: quotation.status_flg || "N/A",
            location: quotation.gmapAddress || "", // Assume added in future
            gmapAddress: quotation.gmapAddress || "", // Assume added in future
            gmapurl: quotation.gmapurl || "", // Assume added in future
            customer_address: quotation.contact_address || "", // Assume added in future
            create_from: quotation.create_from || "",
            created_by: quotation.employee_name || "", // Use employee_name for display
          }));
        setData(quotationList);
      } else {
        // toast.error(responseData?.MSG || "Failed to fetch quotation data");
        console.error(responseData?.MSG || "Failed to fetch quotation data"); // Log for debugging
      }
    }
    if (quotationError) {
      // toast.error("Error fetching quotations: " + quotationError.message);
      console.error("Error fetching quotations:", quotationError.message); // Log for debugging
    }
  }, [quotationData, quotationError]);

  const handleCreateQuotation = () => {
    router.push("/quotations/create");
  };


 const handleDownloadTemplate = async (quotationId) => {
  if (!selectedTemplate) {
    toast.error("Please select a template before downloading.");
    return;
  }

  setDownloading((prev) => ({ ...prev, [quotationId]: true }));

  try {
    const response = await QuotationService.downloadTemplate(
      token,
      quotationId,
      "17",
      selectedTemplate
    );

    if (response?.STATUS !== "SUCCESS") {
      throw new Error(response?.MSG || "Failed to fetch template download path");
    }

    const { transaction_id, path } = response?.DATA || {};
    if (!path) {
      throw new Error("No download path provided in response");
    }

    // Get the selected template name
    const template = templateList?.data?.["17"]?.find(
      (t) => t.id == selectedTemplate
    );
    const templateName = template?.name || "template";
    // Get the full quotation number
    const quotation = data.find((q) => q.id == quotationId);
    const fullQuotationNo = quotation?.fullquotationno || transaction_id;
    // Get the file extension from the path
    const fileExtension = path.split(".").pop() || "pdf";

    // Fetch the file as a blob
    const fileResponse = await fetch(path);
    if (!fileResponse.ok) {
      throw new Error("Failed to fetch the file");
    }
    const blob = await fileResponse.blob();

    // Create a URL for the blob and trigger download with dynamic filename
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${templateName}_${fullQuotationNo}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading template:", error.message, error.response?.data);
    toast.error(error.message || "Failed to download template");
  } finally {
    setDownloading((prev) => ({ ...prev, [quotationId]: false }));
  }
};
const columns = useMemo(
  () => [
    {
      accessorFn: (row) => ({
        CustomerAddress: row.customer_address,
        CreatedAddress: row.location,
      }),
      id: "location",
      header: () => <div className="text-center text-white">Location</div>,
      cell: ({ row }) => {
        const { CustomerAddress, CreatedAddress } = row.getValue("location");
        const isCustomerAddressDisabled =
          !CustomerAddress || CustomerAddress.trim() === "";
        const isCreatedAddressDisabled =
          !CreatedAddress || CreatedAddress.trim() === "";

        return (
          <div className="flex items-center justify-center">
            {isCustomerAddressDisabled ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={true}
                title="No contact address available"
                className="cursor-not-allowed pr-0"
              >
                <MapPin className="h-4 w-4 text-gray-400" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                asChild
                title={`Contact Address: ${CustomerAddress}`}
              >
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    CustomerAddress
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#287F71] hover:text-[#1a5c4d] pr-0"
                >
                  <MapPin className="h-4 w-4" />
                </a>
              </Button>
            )}
            {isCreatedAddressDisabled ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={true}
                title="No followup address available"
                className="cursor-not-allowed pr-0"
              >
                <MapPin className="h-4 w-4 text-gray-400" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                asChild
                title={`Created Address: ${CreatedAddress}`}
              >
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    CreatedAddress
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="created-address-icon pr-0"
                >
                  <MapPin className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "fullquotationno",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
        >
          {`${quotationLabel} Number`}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-left">{row.getValue("fullquotationno")}</div>
      ),
    },
    {
      accessorKey: "createdate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
        >
          Created Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="capitalize text-left">{row.getValue("createdate")}</div>
      ),
    },
    {
      accessorKey: "customername",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
        >
          {`${contactLabel} Name`}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-left">{row.getValue("customername")}</div>
      ),
    },
    {
      accessorKey: "created_by",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-left w-full justify-start text-white hover:text-white hover:bg-[#4a5a6b]"
        >
          Created By
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-left">{row.getValue("created_by")}</div>
      ),
    },
    {
      accessorKey: "status_flg",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-center w-full justify-center text-white hover:text-white hover:bg-[#4a5a6b]"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const status = row.getValue("status_flg");
        const displayStatus =
          status == "A"
            ? "Approved"
            : status == "C"
              ? "Rejected"
              : status == "P"
                ? "Pending"
                : "N/A";
        const badgeStyles = {
          Approved: "bg-[#287F71] text-white",
          Rejected: "bg-[#ec344c] text-white",
          Pending: "bg-[#f59440] text-white",
          "N/A": "bg-gray-500 text-white",
        };
        return (
          <div className="text-center">
            <Badge
              className={`${badgeStyles[displayStatus] || "bg-gray-500 text-white"}`}
            >
              {displayStatus}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "create_from",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="text-center w-full justify-center text-white hover:text-white hover:bg-[#4a5a6b]"
        >
          Source
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const createFrom = row.getValue("create_from");
        let displaySource;
        if (createFrom === "OE" || createFrom === "officeexpre") {
          displaySource = "Office Express";
        } else if (createFrom === "NP") {
          displaySource = "E-Commerce";
        } else if (
          createFrom === "" ||
          createFrom === null ||
          createFrom.includes("salesorder_")
        ) {
          displaySource = "H-Office";
        } else {
          displaySource = createFrom || "N/A";
        }
        return <div className="text-center">{displaySource}</div>;
      },
    },
    {
      id: "viewQuotation",
      header: () => <div className="text-center text-white">Actions</div>,
      cell: ({ row }) => {
        const quotation = row.original;
        return (
          <div className="text-center flex justify-center gap-2">
            <Eye
              className="h-5 w-5 text-[#287F71] hover:text-[#1a5c50] cursor-pointer"
              onClick={() => {
                setSelectedQuotationId(quotation.id);
                setDialogOpen(true);
              }}
            />
            <Pencil
              className="h-5 w-5 text-[#D97706] hover:text-[#B45309] cursor-pointer"
              onClick={() => {
                router.push(`/quotations/create?quotationId=${quotation.id}`);
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownloadTemplate(quotation.id)}
              disabled={downloading[quotation.id]}
              className="p-0 h-auto"
            >
              {downloading[quotation.id] ? (
                <span className="animate-spin inline-block h-5 w-5 border-2 border-t-transparent border-[#287F71] rounded-full"></span>
              ) : (
                <Download className="text-[#287F71] hover:text-[#1a5c4d] cursor-pointer" />
              )}
            </Button>
          </div>
        );
      },
      enableHiding: false,
    },
    {
      id: "createOrder",
      header: () => <div className="text-center text-white">Create SO</div>,
      cell: ({ row }) => {
        const quotation = row.original;
        return (
          <div className="text-center flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                router.push(`/orders/create?quotationId=${quotation.id}`);
              }}
              className="w-full sm:w-auto bg-[#287F71] hover:bg-[#1a5c4d] text-white hover:text-white"
              title="Create Sales Order from Quotation"
            >
              Create SO
            </Button>
          </div>
        );
      },
      enableHiding: false,
    },
  ],
  [selectedTemplate, downloading, setSelectedQuotationId, setDialogOpen, router, quotationLabel, contactLabel, handleDownloadTemplate]
);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      return (
        row.getValue("fullquotationno")?.toLowerCase().includes(search) ||
        row.getValue("createdate")?.toLowerCase().includes(search) ||
        row.getValue("customername")?.toLowerCase().includes(search) ||
        (row.getValue("status_flg") === "A"
          ? "Approved"
          : row.getValue("status_flg") === "C"
            ? "Rejected"
            : row.getValue("status_flg") === "P"
              ? "Pending"
              : "N/A"
        )
          .toLowerCase()
          .includes(search) ||
        (row.getValue("create_from") === "OE" ||
          row.getValue("create_from") === "officeexpre"
          ? "Office Express"
          : row.getValue("create_from") === "NP"
            ? "E-Commerce"
            : row.getValue("create_from") === "" ||
              row.getValue("create_from") === null ||
              row.getValue("create_from").includes("salesorder_")
              ? "H-Office"
              : row.getValue("create_from") || "N/A"
        )
          .toLowerCase()
          .includes(search) ||
        row.getValue("created_by")?.toLowerCase().includes(search)
      );
    },
    onPaginationChange: (updater) => {
      setPagination((prev) => {
        const newPagination =
          typeof updater === "function" ? updater(prev) : updater;
        return {
          ...prev,
          ...newPagination,
          pageIndex:
            newPagination.pageSize !== prev.pageSize
              ? 0
              : newPagination.pageIndex,
        };
      });
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination,
    },
  });

  // CSV Export function
  const handleExportCSV = () => {
    // Excel-compatible CSV format with BOM for UTF-8
    const BOM = "\uFEFF";
    const headers = [
      `${contactLabel} Address`,
      "Created Address",
      `${quotationLabel} Number`,
      "Create Date", // Will show as "27/06/2025 03:25 pm"
      `${contactLabel} Name`,
      "Created By",
      "Status", // Will show human-readable status
      "Source", // Will show human-readable source
    ];

    const csvData = data.map((quotation) => {
      const escapeCsv = (str) => {
        if (!str) return "";
        return `"${String(str).replace(/"/g, '""')}"`;
      };

      // Status display logic
      const displayStatus =
        quotation.status_flg == "A"
          ? "Approved"
          : quotation.status_flg == "C"
            ? "Rejected"
            : quotation.status_flg == "P"
              ? "Pending"
              : "N/A";

      // Source display logic
      const displaySource =
        quotation.create_from === "OE" || quotation.create_from === "officeexpre"
          ? "Office Express"
          : quotation.create_from === "NP"
            ? "E-Commerce"
            : quotation.create_from === "" ||
              quotation.create_from === null ||
              (quotation.create_from && quotation.create_from.includes("salesorder_"))
              ? "H-Office"
              : quotation.create_from || "N/A";

      return [
        escapeCsv(quotation.customer_address),
        escapeCsv(quotation.location),
        escapeCsv(quotation.fullquotationno),
        escapeCsv(quotation.createdate), // Keep original date format
        escapeCsv(quotation.customername),
        escapeCsv(quotation.created_by),
        escapeCsv(displayStatus), // Use formatted status
        escapeCsv(displaySource), // Use formatted source
      ];
    });

    const csvContent =
      BOM +
      [headers.join(","), ...csvData.map((row) => row.join(","))].join("\r\n");

    // Download with current date in filename
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadFile(csvContent, `quotations_report_${dateStr}.csv`);
  };

  // Helper function for download (unchanged)
  const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 py-4">
        {/* Search and Template Selection Section */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Input
            placeholder={`Search ${quotationLabel}`}
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="w-full sm:max-w-sm bg-[#fff]"
          />
          <Select
            value={selectedTemplate}
            onValueChange={setSelectedTemplate}
            disabled={templateList?.isLoading || !templateList?.data?.["17"]?.length}
          >
            <SelectTrigger className="w-full sm:max-w-[200px] bg-white">
              <SelectValue placeholder={templateList?.isLoading ? "Loading templates..." : "Select Printing Template"} />
            </SelectTrigger>
            <SelectContent>
              {templateList?.data?.["17"]?.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons Section */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:ml-auto">
          {/* Columns Visibility Dropdown */}
          <div className="flex justify-end w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-auto">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id.replace(/_/g, " ")}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Export and Create Buttons */}
          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              onClick={handleExportCSV}
              className="w-full sm:w-auto bg-[#287F71] hover:bg-[#1a5c4d] text-white"
              disabled={data.length === 0}
            >
              Export CSV
            </Button>
            <Button
              onClick={handleCreateQuotation}
              className="w-full sm:w-auto bg-[#287F71] hover:bg-[#1a5c4d] text-white"
            >
              {`Create ${quotationLabel}`}
            </Button>
          </div>
        </div>
      </div>
      <div>
        <Table className="min-w-full listing-tables">
          <TableHeader className="text-left">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="bg-[#4a5a6b] text-white text-center"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="bg-white text-center">
            {quotationLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-left">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4 pagination-responsive">
        <div className="flex flex-col md:flex-row items-center space-x-4 ">
          <div className="flex items-center rows-per-page-container gap-2">
            <span className="text-sm text-muted-foreground">
              Rows per page:
            </span>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="w-[70px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 75, 100].map((pageSize) => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length === 0
              ? "0-0 of 0 rows"
              : `${pagination.pageIndex * pagination.pageSize + 1}-${Math.min(
                (pagination.pageIndex + 1) * pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )} of ${table.getFilteredRowModel().rows.length} rows`}
          </div>
          <div className="flex pagination-buttons gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              Last
            </Button>
          </div>
        </div>
      </div>
      {selectedQuotationId && (
        <QuotationDetailsDialog
          quotationId={selectedQuotationId} // Changed prop name assuming the dialog expects quotationId
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
};

export default QuotationTable;