import {
  getCurrentLocation,
  requestLocationPermission,
} from "@/utils/location";
import api from "./api/axios";
import { format } from "date-fns";

const AUTHORIZE_KEY = process.env.NEXT_PUBLIC_API_AUTH_KEY || "";

const getLocationPayload = async () => {
  try {
    // First check if we have permission
    const permission = await requestLocationPermission();
    if (permission !== "granted") {
      throw new Error("LOCATION_PERMISSION_REQUIRED");
    }

    // Then get the location
    const location = await getCurrentLocation();
    return {
      gmapurl: location?.gmapLink || null,
      gmapAddress: location?.address || null,
      error: null,
    };
  } catch (error) {
    console.error("Location error:", error);
    return {
      gmapurl: null,
      gmapAddress: null,
      error: error.message.includes("LOCATION_PERMISSION_REQUIRED")
        ? "Location access is required. Please enable location permissions."
        : "Could not determine your location. Please ensure location services are enabled.",
    };
  }
};

export const QuotationService = {
  // Fetch template list
  getTemplateList: async (token) => {
    try {
      const formData = new FormData();
      formData.append("PHPTOKEN", token || "");
      formData.append("AUTHORIZEKEY", AUTHORIZE_KEY || "");

      const response = await api.post(
        "/expo_access_api/getTemplateList/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error in getTemplateList:",
        error.message,
        error.response?.data
      );
      throw error; // Propagate error to useQuery
    }
  },

  // Download template
  downloadTemplate: async (
    token,
    transaction_id,
    transaction_type,
    template_id
  ) => {
    try {
      const formData = new FormData();
      formData.append("PHPTOKEN", token || "");
      formData.append("AUTHORIZEKEY", AUTHORIZE_KEY || "");
      formData.append("transaction_id", transaction_id || "");
      formData.append("transaction_type", transaction_type || "");
      formData.append("template_id", template_id || "");

      const response = await api.post(
        "/expo_access_api/downloadTemplate/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        "Error in downloadTemplate:",
        error.message,
        error.response?.data
      );
      throw error; // Propagate error to caller
    }
  },

  getQuotation: async (token, userId) => {
    const formData = new FormData();

    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY || "");
    formData.append("created_by", userId || "");
    // formData.append("company_id", 1 || "");
    const response = await api.post(
      "/expo_access_api/getQuotation/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  QuotationDetail: async (quotationId) => {
    const formData = new FormData();

    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY || "");
    formData.append("quotation_id", quotationId || "");
    const response = await api.post(
      "/expo_access_api/QuotationDetail/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  // Save new quotation data
  saveQuotationData: async (quotationData) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);

    try {
      // Get current location with proper error handling
      const locationPayload = await getLocationPayload();

      // If we got an error from location, but have fallback location in quotationData
      if (locationPayload.error && quotationData.location) {
        if (quotationData.location.gmapLink) {
          formData.append("gmapurl", quotationData.location.gmapLink);
        }
        if (quotationData.location.address) {
          formData.append("gmapAddress", quotationData.location.address);
        }
      }
      // If we got location data successfully
      else if (!locationPayload.error) {
        if (locationPayload.gmapurl) {
          formData.append("gmapurl", locationPayload.gmapurl);
        }
        if (locationPayload.gmapAddress) {
          formData.append("gmapAddress", locationPayload.gmapAddress);
        }
      }
      // If no location at all, the API will handle missing location fields

      // Conditional fields with specified key-value logic
      formData.append(
        "contact_id",
        quotationData.user?.isEmployee
          ? quotationData.selectedContact?.id
          : quotationData.user?.id
      );
      formData.append(
        "object_type",
        quotationData.user?.isEmployee
          ? quotationData.selectedContact?.type
          : quotationData.user?.type
      );
      if (quotationData.user?.isEmployee) {
        formData.append("created_assigned_by", quotationData.user?.id);
      }

      // Handle company_id
      const companyToSend = quotationData.user?.isEmployee
        ? quotationData.selectedCompany
        : quotationData.maincompany_id;
      if (companyToSend) {
        formData.append("company_id", companyToSend);
      }

      // Handle branch_id
      const branchToSend = quotationData.user?.isEmployee
        ? quotationData.selectedBranch
        : quotationData.mainbranch_id;
      if (branchToSend) {
        formData.append("branch_id", branchToSend);
      }

      // Static and optional fields
      formData.append("create_from", "OE");
      formData.append("division_id", quotationData.selectedDivision);

      // Patient name
      const patientName = quotationData.user?.isEmployee
        ? quotationData.selectedContact?.title
        : quotationData.user?.name;
      if (patientName) {
        formData.append("patient_name", patientName);
      }

      if (quotationData.isSameAddress) {
        formData.append("billing_address_id", quotationData.isSameAddress);
        formData.append("shipping_address_id", quotationData.isSameAddress);
      } else if (quotationData.billToAddress && quotationData.shipToAddress) {
        formData.append("billing_address_id", quotationData.billToAddress);
        formData.append("shipping_address_id", quotationData.shipToAddress);
      }

      if (quotationData?.selectedTerm) {
        formData.append("payments_terms", quotationData?.selectedTerm);
      }

      if (quotationData?.selectedTerm == "F") {
        formData.append("credit_days", quotationData?.customDays);
      }

      if (quotationData.user?.isEmployee) {
        formData.append("created_by", quotationData.user?.id);
      }

      if (quotationData?.remarks) {
        formData.append("remarks", quotationData?.remarks);
      }

      if (quotationData?.selectedWonLead?.lead_id) {
        formData.append(
          "reference_id",
          quotationData?.selectedWonLead?.lead_id
        );
        formData.append("reference_type", "7");
      }

      // Handle products
      if (quotationData.formValues && quotationData.formValues.length > 0) {
        const formattedProducts = quotationData.formValues.map((product) => {
          const formattedDate = format(
            new Date(product.scheduleDate),
            "dd-MM-yyyy"
          );
          const { Attribute_data, ...productWithoutAttributes } = product;
          return {
            ...productWithoutAttributes,
            scheduleDate: formattedDate,
          };
        });
        formData.append("products", JSON.stringify(formattedProducts));
      }

      const response = await api.post(
        "/expo_access_api/SaveQuotationData/",
        formData
      );
      return response.data;
    } catch (error) {
      if (error.message.includes("LOCATION_PERMISSION_REQUIRED")) {
        throw new Error(
          "Location access is required for creating quotations. Please enable location permissions."
        );
      }
      throw error;
    }
  },

  // Edit existing quotation data
  editQuotationData: async (quotationData) => {
    const formData = new FormData();
    formData.append("AUTHORIZEKEY", AUTHORIZE_KEY);
    formData.append(
      "quotation_id",
      quotationData.quotationDetails?.quotation_id
    );

    try {
      // Get current location with proper error handling
      const locationPayload = await getLocationPayload();

      // If we got an error from location, but have fallback location in quotationData
      if (locationPayload.error && quotationData.location) {
        if (quotationData.location.gmapLink) {
          formData.append("gmapurl", quotationData.location.gmapLink);
        }
        if (quotationData.location.address) {
          formData.append("gmapAddress", quotationData.location.address);
        }
      }
      // If we got location data successfully
      else if (!locationPayload.error) {
        if (locationPayload.gmapurl) {
          formData.append("gmapurl", locationPayload.gmapurl);
        }
        if (locationPayload.gmapAddress) {
          formData.append("gmapAddress", locationPayload.gmapAddress);
        }
      }

      // Contact information
      formData.append("contact_id", quotationData.quotationDetails?.contact_id);
      formData.append(
        "object_type",
        quotationData.quotationDetails?.contact_type.toString()
      );

      if (quotationData.user?.isEmployee) {
        formData.append("created_assigned_by", quotationData.user?.id);
      }

      // Company and branch information
      formData.append("company_id", quotationData.quotationDetails?.company_id);
      formData.append("branch_id", quotationData.quotationDetails?.branch_id);

      // Static fields
      formData.append("create_from", "OE");
      formData.append(
        "division_id",
        quotationData.quotationDetails?.division_id
      );

      // Patient name
      if (quotationData.quotationDetails?.patient_name) {
        formData.append(
          "patient_name",
          quotationData.quotationDetails.patient_name
        );
      }

      // Address information
      if (quotationData.quotationDetails?.billing_address_id) {
        formData.append(
          "billing_address_id",
          quotationData.quotationDetails.billing_address_id
        );
      }
      if (quotationData.quotationDetails?.shipping_address_id) {
        formData.append(
          "shipping_address_id",
          quotationData.quotationDetails.shipping_address_id
        );
      }

      // Payment terms
      if (quotationData.quotationDetails?.payments_terms) {
        formData.append(
          "payments_terms",
          quotationData.quotationDetails.payments_terms
        );
      }

      if (quotationData.quotationDetails?.payments_terms == "F") {
        formData.append(
          "credit_days",
          quotationData.quotationDetails.credit_days
        );
      }

      if (quotationData.user?.isEmployee) {
        formData.append("created_by", quotationData.user?.id);
      }

      // Remarks
      if (quotationData.quotationDetails?.remarks) {
        formData.append("remarks", quotationData.quotationDetails.remarks);
      }

      // Handle products
      if (quotationData.formValues && quotationData.formValues.length > 0) {
        const formattedProducts = quotationData.formValues.map((product) => {
          const formattedDate = format(
            new Date(product.scheduleDate),
            "dd-MM-yyyy"
          );
          const { Attribute_data, ...productWithoutAttributes } = product;
          return {
            ...productWithoutAttributes,
            scheduleDate: formattedDate,
          };
        });
        formData.append("products", JSON.stringify(formattedProducts));
      }

      const response = await api.post(
        "/expo_access_api/SaveQuotationData/",
        formData
      );
      return response.data;
    } catch (error) {
      if (error.message.includes("LOCATION_PERMISSION_REQUIRED")) {
        throw new Error(
          "Location access is required for editing quotations. Please enable location permissions."
        );
      }
      throw error;
    }
  },
};
