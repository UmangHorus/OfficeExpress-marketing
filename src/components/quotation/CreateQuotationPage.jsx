"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import BranchSelector from "@/components/selectors/BranchSelector";
import CompanySelector from "@/components/selectors/CompanySelector";
import DivisionSelector from "@/components/selectors/DivisionSelector";
import PaymentTermsSelector from "@/components/selectors/PaymentTermsSelector";
import QuotationDeliveryOptions from "@/components/selectors/QuotationDeliveryOptions";
import RemarksField from "@/components/inputs/RemarksField";
import { Columns2 } from "lucide-react";
import ProductSelectionTable from "@/components/lead/ProductSelectionTable";
import { Button } from "@/components/ui/button";
import { ContactSearch } from "@/components/inputs/search";
import { useLoginStore } from "@/stores/auth.store";
import { useSharedDataStore } from "@/stores/sharedData.store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Modal } from "../shared/Modal";
import { ContactForm } from "../forms/ContactForm";
import { OTPDialog } from "../shared/OtpDialog";
import { useRouter, useSearchParams } from "next/navigation";
import useBasicSettingsStore from "@/stores/basicSettings.store";
import { AddressForm } from "../forms/AddressForm";
import WonLeadDialog from "../shared/WonLeadDialog";
import { ContactService } from "@/lib/ContactService";
import { requestLocationPermission } from "@/utils/location";
import useLocationPermission from "@/hooks/useLocationPermission";
import { HashLoader } from "react-spinners";
import { QuotationService } from "@/lib/QuotationService";
import { leadService } from "@/lib/leadService";
import OrderService from "@/lib/OrderService";

const CreateQuotationPage = () => {
  const { user, token, navConfig, appConfig, location } = useLoginStore();
  const searchParams = useSearchParams();
  const {
    companyBranchDivisionData,
    companyInfo,
    companyDetails,
    setCompanyBranchDivisionData,
    setCompanyInfo,
    setCompanyDetails,
  } = useSharedDataStore();
  const { maincompany_id, mainbranch_id, setLoading, setError } =
    useBasicSettingsStore();
  const contactLabel = useLoginStore(
    (state) => state.navConfig?.labels?.contacts || "Contact"
  );
  const quotationLabel = useLoginStore(
    (state) => state.navConfig?.labels?.Quotation_config_name || "Quotation"
  );
  const checkAndRequestLocation = useLocationPermission();
  const router = useRouter();
  const queryClient = useQueryClient();
  const secUnitConfig = companyDetails?.sec_unit_config || "0";
  const quotationsLabel = navConfig?.labels?.quotations || "Quotation";
  const addressType = companyDetails?.address_type || "";
  const unitMaster = companyDetails?.unit_master;
  const contactIdParam = searchParams.get("contact_id");
  const contactTypeParam = searchParams.get("contact_type");
  const evIdParam = searchParams.get("ev_id");
  const quotationIdParam = searchParams.get("quotationId");
  const enabledOtpPortal = companyDetails?.enabled_otp_portal;
  const companies = companyBranchDivisionData?.companies || [];
  const divisions = companyBranchDivisionData?.division || [];
  const [quotationDetails, setQuotationDetails] = useState(null);
  const [selectedtypeOption, setSelectedTypeOption] = useState("quotation-option");
  const [isSaveContact, setIsSaveContact] = useState(false);

  const generateUniqueId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const getInitialFormValues = (
    selectedtypeOption,
    secUnitConfig,
    selectedWonLead
  ) => {
    const baseFormValues = {
      unique_id: generateUniqueId(),
      productid: "",
      productname: "",
      productqty: "",
      unit: "",
      stock: "",
      rate: "",
      product_image: "",
      secondary_base_qty: "0",
      sec_unit: "",
      productcode: "",
      totalrate: "",
      SecQtyReverseCalculate: 0,
      unitvalue: "0",
      proddivision: "",
      stock_data: [],
      price_list_flg: false,
      Attribute_data: {},
      attribute: {},
      scheduleDate: format(new Date(), "yyyy-MM-dd"),
      discount: "",
      discount_amount: "",
      mrp_price: "",
      sec_unit_mrp_rate: "",
      unit_con_mode: null,
      sec_unit_rate: "0",
    };

    const enhancedFormValues = {
      ...baseFormValues,
      conversion_flg: "1",
      primary_unit_id: "",
      secondary_unit_id: "",
      SecQtyTotal: "",
    };

    if (selectedWonLead?.products && selectedWonLead.products.length > 0) {
      const updatedFormValues = selectedWonLead.products.map((product) => {
        const baseProductValues = {
          unique_id: product?.unique_id || generateUniqueId(),
          productid: product.product_id || "",
          productname: product.productname || "",
          productqty: "",
          unit: product.unit_name || "",
          stock: product.current_stock || "",
          rate: product.productrate || "0",
          product_image: product.product_image || "",
          secondary_base_qty: product.prod_conversion || "0",
          sec_unit: secUnitConfig == "1" ? product.second_unit : "",
          productcode: product.productcode || "",
          totalrate: "",
          SecQtyReverseCalculate: product.SecQtyReverseCalculate || 0,
          unitvalue: "0",
          proddivision: product.proddivision || "",
          stock_data: [],
          price_list_flg: product?.price_list_flg || false,
          Attribute_data: product.Attribute_data || {},
          attribute: {},
          scheduleDate: format(new Date(), "yyyy-MM-dd"),
          discount: "",
          discount_amount: "",
          mrp_price: "",
          sec_unit_mrp_rate: "",
          unit_con_mode: null,
          sec_unit_rate: "0",
        };

        if (selectedtypeOption == "lead-option") {
          return baseProductValues;
        } else if (
          (selectedtypeOption == "salesorder-option" || selectedtypeOption == "quotation-option") &&
          secUnitConfig == "0"
        ) {
          return baseProductValues;
        } else if (
          (selectedtypeOption == "salesorder-option" || selectedtypeOption == "quotation-option") &&
          secUnitConfig == "1"
        ) {
          const primaryUnit = unitMaster.find(
            (unit) =>
              unit.unit_name.toLowerCase() ==
              (product.unit_name || "").toLowerCase()
          );
          const secondaryUnit = unitMaster.find(
            (unit) =>
              unit.unit_name.toLowerCase() ==
              (product.second_unit || "").toLowerCase()
          );

          return {
            ...baseProductValues,
            conversion_flg: "1",
            primary_unit_id: primaryUnit ? primaryUnit.unit_id : "",
            secondary_unit_id: secondaryUnit ? secondaryUnit.unit_id : "",
            SecQtyTotal: "",
          };
        } else {
          return baseProductValues;
        }
      });
      return updatedFormValues;
    } else {
      if (selectedtypeOption == "lead-option") {
        return [baseFormValues];
      } else if (
        (selectedtypeOption == "salesorder-option" || selectedtypeOption == "quotation-option") &&
        secUnitConfig == "0"
      ) {
        return [baseFormValues];
      } else if (
        (selectedtypeOption == "salesorder-option" || selectedtypeOption == "quotation-option") &&
        secUnitConfig == "1"
      ) {
        return [enhancedFormValues];
      } else {
        return [baseFormValues];
      }
    }
  };

  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [remarks, setRemarks] = useState("");
  const [showAddButton, setShowAddButton] = useState(true);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [contactList, setContactList] = useState([]);
  const [productList, setProductList] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [pendingContactDetails, setPendingContactDetails] = useState(null);
  const [contactBillingAddresses, setContactBillingAddresses] = useState([]);
  const [wonLeadData, setWonLeadData] = useState([]);
  const [showClickHere, setShowClickHere] = useState(false);
  const [selectedWonLead, setSelectedWonLead] = useState(null);
  const [isWonLeadModalOpen, setIsWonLeadModalOpen] = useState(false);
  const [billToAddress, setBillToAddress] = useState(null);
  const [shipToAddress, setShipToAddress] = useState(null);
  const [isSameAddress, setIsSameAddress] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState("F");
  const [customDays, setCustomDays] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpKey, setOtpKey] = useState("");

  const paymentOptions = [
    { value: "A", label: "100% Advance" },
    { value: "F", label: "Full(Credit days)" },
    { value: "P", label: "Part / Advance" },
    { value: "E", label: "EMI" },
  ];

  const deliveryOptions = contactBillingAddresses.map((address) => ({
    id: address.address_id,
    address: [
      address.address_1,
      address.address_2,
      address.area,
      address.city_name,
      address.state,
      address.country,
      address.zipcode,
    ]
      .filter(Boolean)
      .join(", "),
  }));

  useEffect(() => {
    if (!selectedContact) {
      setShowClickHere(false);
      setWonLeadData([]);
      setSelectedWonLead(null);
      setCustomDays("");
      setSelectedTerm("F");
    }
  }, [selectedContact]);

  const handlePaymentTermsChange = ({ term, days }) => {
    setSelectedTerm(term);
    setCustomDays(days);
  };

  const [formValues, setFormValues] = useState([]);

  useEffect(() => {
    if (selectedWonLead) {
      const newFormValues = getInitialFormValues(
        selectedtypeOption,
        secUnitConfig,
        selectedWonLead
      );
      setFormValues(newFormValues);
    } else {
      const newFormValues = getInitialFormValues(
        selectedtypeOption,
        secUnitConfig
      );
      setFormValues(newFormValues);
    }
  }, [selectedWonLead, selectedtypeOption, secUnitConfig]);

  const {
    data: quotationData,
    error: quotationError,
    isLoading: quotationLoading,
  } = useQuery({
    queryKey: ["quotationDetails", quotationIdParam],
    queryFn: () => QuotationService.QuotationDetail(quotationIdParam),
    enabled: !!quotationIdParam,
    refetchOnMount: "always",
    staleTime: 0,
    cacheTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
    keepPreviousData: false,
  });

  useEffect(() => {
    if (quotationData && quotationData?.STATUS == "SUCCESS") {
      setQuotationDetails(quotationData?.DATA?.QuotationDetail?.Quotation);
    } else if (quotationData && quotationData?.STATUS == "ERROR") {
      console.error("Failed to fetch quotation details:", quotationData?.MSG);
    }
    if (quotationError) {
      console.error("Error fetching quotation details:", quotationError);
    }
  }, [quotationData, quotationError]);

  useEffect(() => {
    if (searchParams && contactList?.length > 0 && !quotationIdParam) {
      let contactType;
      if (contactTypeParam == "C") {
        contactType = 1;
      } else if (contactTypeParam == "RC") {
        contactType = 6;
      }

      if (contactIdParam && contactType) {
        const foundContact = contactList.find(
          (contact) =>
            contact.id == contactIdParam && contact.type == contactType
        );

        if (foundContact) {
          setSelectedContact(foundContact);
        } else {
          console.warn("No matching contact found for the given parameters");
        }
      }
    }
  }, [
    searchParams,
    contactList,
    contactIdParam,
    contactTypeParam,
    quotationIdParam,
  ]);

  useEffect(() => {
    if (quotationDetails && contactList?.length > 0 && quotationIdParam) {
      const contactType = quotationDetails.contact_type;

      if (quotationDetails.contact_id && contactType) {
        const foundContact = contactList.find(
          (contact) =>
            contact.id == quotationDetails.contact_id &&
            contact.type == contactType
        );

        if (foundContact) {
          setSelectedContact(foundContact);
        } else {
          console.warn("No matching contact found for quotation details");
        }
      }
    }
  }, [quotationDetails, contactList, quotationIdParam]);

  useEffect(() => {
    if (quotationDetails && quotationIdParam) {
      if (
        quotationDetails.billing_address_id &&
        quotationDetails.shipping_address_id
      ) {
        const isSame =
          quotationDetails.billing_address_id ==
          quotationDetails.shipping_address_id;
        if (isSame) {
          setIsSameAddress(quotationDetails.billing_address_id);
          setBillToAddress(null);
          setShipToAddress(null);
        } else {
          setIsSameAddress(null);
          setBillToAddress(quotationDetails.billing_address_id);
          setShipToAddress(quotationDetails.shipping_address_id);
        }
      }
    }
  }, [quotationDetails, quotationIdParam]);

  const generateOtpMutation = useMutation({
    mutationFn: (contactMobile) => leadService.generateOtp(contactMobile),
    onSuccess: (data, contactMobile) => {
      const responseData = Array.isArray(data) ? data[0] : data;
      if (responseData?.STATUS === "SUCCESS") {
        setOtpKey(responseData.DATA || "");
        setOtpDialogOpen(true);
        setOtpValue("");
        setTimeout(
          () =>
            document
              .querySelector('input[autocomplete="one-time-code"]')
              ?.focus(),
          100
        );
        toast.success(responseData.MSG || `OTP sent to ${contactMobile}`, {
          duration: 2000,
        });
      } else {
        throw new Error(responseData?.MSG || "Failed to send OTP");
      }
    },
    onError: (error) => {
      console.error("Generate OTP error:", error);
      toast.error(error.message || "Failed to generate OTP");
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: ({ contact, objectId, objectType, verifyOTP, key }) =>
      leadService.verifyOtp(contact, objectId, objectType, verifyOTP, key),
    onSuccess: async (data) => {
      const responseData = Array.isArray(data) ? data[0] : data;
      if (responseData?.STATUS === "SUCCESS") {
        if (!responseData.PHPTOKEN) {
          throw new Error("Authentication token missing");
        }
        toast.success(
          "OTP verified successfully. Proceeding to save quotation.",
          {
            duration: 2000,
          }
        );

        if (quotationIdParam) {
          await saveEditQuotationMutation.mutateAsync({
            quotationDetails: quotationDetails,
            formValues: formValues,
            location: location,
            user: user,
          });
        } else {
          await saveQuotationMutation.mutateAsync({
            selectedContact: selectedContact,
            user: user,
            selectedCompany: selectedCompany,
            selectedBranch: appConfig?.branch_id,
            maincompany_id: maincompany_id,
            mainbranch_id: mainbranch_id,
            selectedDivision: selectedDivision,
            location: location,
            formValues: formValues,
            billToAddress: billToAddress,
            shipToAddress: shipToAddress,
            isSameAddress: isSameAddress,
            selectedTerm: selectedTerm,
            customDays: customDays,
            remarks: remarks,
            selectedWonLead: selectedWonLead,
          });
        }
      } else {
        throw new Error(responseData?.MSG || "OTP verification failed");
      }
    },
    onError: (error) => {
      throw error;
    },
  });

  const saveQuotationMutation = useMutation({
    mutationFn: (quotationData) => {
      if (!quotationData) {
        throw new Error("quotationData is undefined");
      }
      return QuotationService.saveQuotationData(quotationData);
    },
    onSuccess: async (data) => {
      const responseData = Array.isArray(data) ? data[0] : data;
      if (responseData?.STATUS === "SUCCESS") {
        setFormValues(getInitialFormValues());
        setSelectedContact(null);
        setOtpValue("");
        setOtpKey("");
        setBillToAddress(null);
        setShipToAddress(null);
        setIsSameAddress(null);
        setSelectedTerm("F");
        setCustomDays("");
        setContactBillingAddresses([]);
        setSelectedWonLead(null);
        setWonLeadData([]);
        setShowClickHere(false);

        if (contactIdParam && contactTypeParam && evIdParam) {
          try {
            const referenceType = contactTypeParam == "C" ? "1" : "6";
            const visitorResponse = await ContactService.employeeVisitorInOut(
              token,
              "out",
              user.id,
              contactIdParam,
              referenceType,
              evIdParam
            );

            const visitorResult = visitorResponse[0] || {};
            if (visitorResult.STATUS == "SUCCESS") {
              toast.success(
                `${quotationLabel} created and Visit Out recorded successfully.`,
                {
                  duration: 2000,
                }
              );
            } else {
              toast.error(visitorResult.MSG || "Visit Out recording failed.");
            }
            router.push("/contacts");
          } catch (error) {
            console.error("Error recording Visit Out:", error);
            toast.error(
              `${quotationLabel} created but failed to record Visit Out.`
            );
          }
        } else {
          toast.success(
            `${quotationLabel} created successfully`,
            {
              duration: 2000,
            }
          );
          router.push("/quotations");
        }
      } else {
        throw new Error(responseData?.MSG || "Failed to save quotation");
      }
    },
    onError: (error) => {
      console.error("Save quotation error:", error);
      toast.error(error.message || "Failed to save quotation");
    },
  });

  const saveEditQuotationMutation = useMutation({
    mutationFn: (quotationData) => {
      if (!quotationData) {
        throw new Error("quotationData is undefined");
      }
      return QuotationService.editQuotationData(quotationData);
    },
    onSuccess: async (data) => {
      const responseData = Array.isArray(data) ? data[0] : data;
      if (responseData?.STATUS === "SUCCESS") {
        setFormValues(getInitialFormValues());
        setSelectedContact(null);
        setOtpValue("");
        setOtpKey("");
        setBillToAddress(null);
        setShipToAddress(null);
        setIsSameAddress(null);
        setSelectedTerm("F");
        setCustomDays("");
        setContactBillingAddresses([]);
        setSelectedWonLead(null);
        setWonLeadData([]);
        setShowClickHere(false);

        // Clear quotationDetails query cache to ensure fresh fetch on next edit
        queryClient.removeQueries({ queryKey: ["quotationDetails", quotationIdParam] });

        toast.success(`${quotationLabel} updated successfully`, {
          duration: 2000,
        });
        router.push("/quotations");
      } else {
        throw new Error(responseData?.MSG || "Failed to update quotation");
      }
    },
    onError: (error) => {
      console.error("Update quotation error:", error);
      toast.error(error.message || "Failed to update quotation");
    },
  });

  const handleCreateQuotation = async () => {
    try {
      await checkAndRequestLocation(`${quotationsLabel} creation`);

      if (user?.isEmployee && !selectedContact) {
        toast.error(`Please select a ${contactLabel.toLowerCase()} to proceed`, {
          duration: 2000,
        });
        return;
      }

      if (user?.isEmployee && !selectedContact?.mobile) {
        toast.error(
          "The selected contact does not have a valid mobile number. OTP cannot be sent.",
          {
            duration: 2000,
          }
        );
        return;
      }

      if (!formValues || formValues.length == 0) {
        toast.error("Please select at least one product to proceed", {
          duration: 2000,
        });
        return;
      }

      for (const product of formValues) {
        if (!product.productid || product.productid == "") {
          toast.error(
            `Please select a valid product for ${product.productname || "item"}`,
            {
              duration: 2000,
            }
          );
          return;
        }

        if (product.conversion_flg == "1") {
          if (
            !product.productqty ||
            product.productqty == "" ||
            Number(product.productqty) <= 0 ||
            isNaN(Number(product.productqty))
          ) {
            toast.error(
              `Product ${product.productname || "item"}: Primary quantity must be greater than 0`,
              {
                duration: 2000,
              }
            );
            return;
          }
        } else if (product.conversion_flg == "2") {
          if (
            !product.SecQtyTotal ||
            product.SecQtyTotal == "" ||
            Number(product.SecQtyTotal) <= 0 ||
            isNaN(Number(product.SecQtyTotal))
          ) {
            toast.error(
              `Product ${product.productname || "item"}: Secondary quantity must be greater than 0`,
              {
                duration: 2000,
              }
            );
            return;
          }
        } else {
          if (
            !product.productqty ||
            product.productqty == "" ||
            Number(product.productqty) <= 0 ||
            isNaN(Number(product.productqty))
          ) {
            toast.error(
              `Product ${product.productname || "item"}: Quantity must be greater than 0`,
              {
                duration: 2000,
              }
            );
            return;
          }
        }
      }

      if (!isSameAddress) {
        if (!billToAddress) {
          toast.error("Please select a bill to address", {
            duration: 2000,
          });
          return;
        }
        if (!shipToAddress) {
          toast.error("Please select a ship to address", {
            duration: 2000,
          });
          return;
        }
      }

      if (!user?.isEmployee) {
        if (quotationIdParam) {
          await saveEditQuotationMutation.mutateAsync({
            quotationDetails: quotationDetails,
            formValues: formValues,
            location: location,
            user: user,
          });
        } else {
          await saveQuotationMutation.mutateAsync({
            selectedContact: selectedContact,
            user: user,
            selectedCompany: selectedCompany,
            selectedBranch: appConfig?.branch_id,
            maincompany_id: maincompany_id,
            mainbranch_id: mainbranch_id,
            selectedDivision: selectedDivision,
            location: location,
            formValues: formValues,
            billToAddress: billToAddress,
            shipToAddress: shipToAddress,
            isSameAddress: isSameAddress,
            selectedTerm: selectedTerm,
            customDays: customDays,
            remarks: remarks,
            selectedWonLead: selectedWonLead,
          });
        }
      } else {
        if (enabledOtpPortal == 0) {
          if (quotationIdParam) {
            await saveEditQuotationMutation.mutateAsync({
              quotationDetails: quotationDetails,
              formValues: formValues,
              location: location,
              user: user,
            });
          } else {
            await saveQuotationMutation.mutateAsync({
              selectedContact: selectedContact,
              user: user,
              selectedCompany: selectedCompany,
              selectedBranch: appConfig?.branch_id,
              maincompany_id: maincompany_id,
              mainbranch_id: mainbranch_id,
              selectedDivision: selectedDivision,
              location: location,
              formValues: formValues,
              billToAddress: billToAddress,
              shipToAddress: shipToAddress,
              isSameAddress: isSameAddress,
              selectedTerm: selectedTerm,
              customDays: customDays,
              remarks: remarks,
              selectedWonLead: selectedWonLead,
            });
          }
        } else {
          generateOtpMutation.mutate(selectedContact?.mobile);
        }
      }
    } catch (error) {
      toast.error(error.message, {
        position: "top-right",
        duration: 3000,
      });
    }
  };

  const onSubmitOtp = async (otp) => {
    if (!selectedContact) {
      throw new Error("No contact selected");
    }
    await verifyOtpMutation.mutateAsync({
      contact: selectedContact.mobile,
      objectId: selectedContact.id,
      objectType: selectedContact.type,
      verifyOTP: otp,
      key: otpKey,
    });
  };

  const handleResendOtp = async () => {
    if (!selectedContact?.mobile) {
      throw new Error("No contact mobile selected");
    }
    await generateOtpMutation.mutateAsync(selectedContact.mobile);
  };

  const {
    data: companyData,
    error: companyError,
    isLoading: companyLoading,
  } = useQuery({
    queryKey: ["companyBranchDivisionData", user?.id, token],
    queryFn: () => OrderService.getCompanyBranchDivisionData(token, user?.id),
    enabled: !!user?.id && !!token && !companyBranchDivisionData,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const {
    data: contactData,
    error: contactError,
    isLoading: contactLoading,
  } = useQuery({
    queryKey: [
      "contactList",
      token,
      quotationIdParam ? quotationDetails?.company_id : selectedCompany,
    ],
    queryFn: () =>
      OrderService.getContactRawcontactAutoComplete(
        token,
        quotationIdParam ? quotationDetails?.company_id : selectedCompany
      ),
    enabled:
      !!token &&
      (quotationIdParam ? !!quotationDetails?.company_id : !!selectedCompany),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const {
    data: productData,
    error: productError,
    isLoading: productLoading,
  } = useQuery({
    queryKey: [
      "productList",
      token,
      quotationIdParam ? quotationDetails?.company_id : selectedCompany,
      quotationIdParam ? quotationDetails?.division_id : selectedDivision,
      user?.id,
    ],
    queryFn: () =>
      leadService.getProductBasedOnCompany(
        token,
        quotationIdParam ? quotationDetails?.company_id : selectedCompany,
        quotationIdParam ? quotationDetails?.division_id : selectedDivision,
        user?.id
      ),
    enabled:
      !!token &&
      !!user?.id &&
      (user?.isEmployee
        ? !!(quotationIdParam ? quotationDetails?.company_id : selectedCompany)
        : true),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const {
    data: companyDetailsData,
    error: companyDetailsError,
    isLoading: companyDetailsLoading,
  } = useQuery({
    queryKey: ["companyDetails"],
    queryFn: () => leadService.getCompanyDetails(),
    enabled: !companyInfo && !companyDetails,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const {
    data: billingAddressData,
    error: billingAddressError,
    isLoading: billingAddressLoading,
  } = useQuery({
    queryKey: [
      "contactBillingAddress",
      quotationIdParam
        ? quotationDetails?.contact_id
        : user?.isEmployee
          ? selectedContact?.id
          : user?.id,
      quotationIdParam
        ? quotationDetails?.contact_type
        : user?.isEmployee
          ? selectedContact?.type
          : user?.type,
      token,
    ],
    queryFn: () =>
      leadService.getContactBillingAddressForBot(
        token,
        quotationIdParam
          ? quotationDetails.contact_id
          : user?.isEmployee
            ? selectedContact.id
            : user.id,
        quotationIdParam
          ? quotationDetails.contact_type
          : user?.isEmployee
            ? selectedContact.type
            : user.type
      ),
    enabled:
      !!token &&
      (quotationIdParam
        ? !!quotationDetails?.contact_id && !!quotationDetails?.contact_type
        : user?.isEmployee
          ? !!selectedContact?.id && !!selectedContact?.type
          : !!user?.id && !!user?.type),
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: "always",
  });

  const {
    data: wonLeadResponse,
    error: wonLeadError,
    isLoading: wonLeadLoading,
  } = useQuery({
    queryKey: ["wonLeads", selectedContact?.id, token],
    queryFn: () =>
      OrderService.getWonLeadWithoutSO({
        token,
        object_id: selectedContact?.id,
        object_type: selectedContact?.type,
      }),
    enabled: !!token && !!selectedContact?.id,
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (companyData) {
      const responseData = Array.isArray(companyData)
        ? companyData[0]
        : companyData;
      if (responseData?.STATUS === "SUCCESS") {
        setCompanyBranchDivisionData(responseData.DATA);
      } else {
        toast.error(responseData?.MSG || "Invalid company response data");
      }
    }

    const companies = companyBranchDivisionData?.companies || [];
    const divisions = companyBranchDivisionData?.division || [];

    if (companies.length > 0 && !selectedCompany) {
      setSelectedCompany(companies[0].company_id);
    }

    if (divisions.length > 0 && !selectedDivision) {
      setSelectedDivision(divisions[0].cd_id);
    }
  }, [
    companyData,
    companyBranchDivisionData,
    selectedCompany,
    selectedDivision,
  ]);

  useEffect(() => {
    if (contactData) {
      const responseData = Array.isArray(contactData)
        ? contactData[0]
        : contactData;
      if (
        responseData?.STATUS === "SUCCESS" &&
        Array.isArray(responseData?.DATA?.contacts)
      ) {
        setContactList(responseData.DATA.contacts);
      } else {
        toast.error(responseData?.MSG || "Invalid contact response data");
        setContactList([]);
      }
    }
  }, [contactData]);

  useEffect(() => {
    if (productData) {
      const responseData = Array.isArray(productData)
        ? productData[0]
        : productData;
      if (
        responseData?.STATUS === "SUCCESS" &&
        Array.isArray(responseData?.DATA?.products)
      ) {
        setProductList(responseData.DATA.products);
      } else {
        toast.error(responseData?.MSG || "Invalid product response data");
        setProductList([]);
      }
    }
  }, [productData]);

  useEffect(() => {
    if (companyDetailsData) {
      const responseData = Array.isArray(companyDetailsData)
        ? companyDetailsData[0]
        : companyDetailsData;
      if (responseData?.STATUS === "SUCCESS") {
        setCompanyInfo(responseData.DATA.Companyinfo);
        setCompanyDetails(responseData.DETAILS);
      } else {
        toast.error(
          responseData?.MSG || "Invalid company details response data"
        );
      }
    }
  }, [companyDetailsData]);

  useEffect(() => {
    if (billingAddressData) {
      const responseData = Array.isArray(billingAddressData)
        ? billingAddressData[0]
        : billingAddressData;
      if (
        responseData?.STATUS === "SUCCESS" &&
        Array.isArray(responseData?.DATA)
      ) {
        setContactBillingAddresses(responseData.DATA);
      } else {
        toast.error(responseData?.MSG || "Failed to fetch billing addresses");
        setContactBillingAddresses([]);
      }
    }
  }, [billingAddressData]);

  useEffect(() => {
    if (wonLeadResponse) {
      const responseData = Array.isArray(wonLeadResponse)
        ? wonLeadResponse[0]
        : wonLeadResponse;
      if (responseData?.STATUS == "SUCCESS") {
        if (Array.isArray(responseData?.DATA) && responseData.DATA.length > 0) {
          setWonLeadData(responseData.DATA);
          setShowClickHere(!quotationIdParam);
        } else {
          setShowClickHere(false);
          setWonLeadData([]);
        }
      } else {
        setShowClickHere(false);
        setWonLeadData([]);
      }
    }
  }, [wonLeadResponse]);

  useEffect(() => {
    if (user?.isEmployee && !selectedContact) {
      setBillToAddress(null);
      setShipToAddress(null);
      setIsSameAddress(null);
      setContactBillingAddresses([]);
    }
  }, [selectedContact]);

  const contactSelect = (contact) => {
    setSelectedContact(contact);
  };

  useEffect(() => {
    if (pendingContactDetails && contactList.length > 0) {
      const contact_details = pendingContactDetails;
      let matchedContact = null;
      if (contact_details?.contact_id && contact_details?.company_id) {
        matchedContact = contactList.find(
          (contact) =>
            contact?.id == contact_details.company_id &&
            contact?.type == contact_details.company_type
        );
      } else if (contact_details?.contact_id) {
        matchedContact = contactList.find(
          (contact) =>
            contact?.id == contact_details.contact_id &&
            contact?.type == contact_details.contact_type
        );
      }
      if (matchedContact) {
        contactSelect(matchedContact);
      }
      setPendingContactDetails(null);
    }
  }, [contactList, pendingContactDetails]);

  const addContactMutation = useMutation({
    mutationFn: async ({ data, selectedcompany, inputvalue }) => {
      const contactData = {
        country: data.country,
        state: data.state,
        contact_title: data.title,
        name: data.name,
        company_name: selectedcompany ? selectedcompany.title : inputvalue,
        email: data.Email,
        mobile: data.mobile,
        address1: data.address,
        city: data.city,
        industry_id: data.industry,
        zipcode: data.pincode,
        area: data.area,
        created_by: user.id,
        routes: data.routes,
      };

      const response = await leadService.saveRawContact(contactData);
      return { response };
    },
    onMutate: () => {
      setIsSaveContact(true);
    },
    onSuccess: async ({ response }) => {
      const responseData = Array.isArray(response) ? response[0] : response;
      if (responseData?.STATUS === "SUCCESS") {
        setContactList([]);
        setIsContactModalOpen(false);
        toast.success("Contact added successfully!", {
          duration: 2000,
        });
        if (responseData.CONTACT_DETAILS) {
          setPendingContactDetails(responseData.CONTACT_DETAILS);
        }
        await queryClient.refetchQueries({
          queryKey: ["contactList", token],
        });
      } else {
        throw new Error(responseData?.MSG || "Failed to add contact");
      }
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.MSG ||
        error.message ||
        "Failed to add contact. Please try again.";
      toast.error(errorMessage);
    },
    onSettled: () => {
      setIsSaveContact(false);
    },
  });

  const handleAddContact = (data, selectedcompany, inputvalue) => {
    addContactMutation.mutate({ data, selectedcompany, inputvalue });
  };

  const addAddressMutation = useMutation({
    mutationFn: async (values) => {
      const addressData = {
        contact_id: user?.isEmployee ? selectedContact?.id : user?.id,
        contact_type: user?.isEmployee ? selectedContact?.type : user?.type,
        nickname: values.nickname,
        address1: values.address1,
        address2: values.address2,
        area: values.area,
        city: values.city,
        selcountry: values.selcountry,
        selstate: values.selstate,
        zipcode: values.zipcode,
      };

      const response = await QuotationService.saveContactAddress(addressData);
      return response;
    },
    onSuccess: async (response) => {
      const responseData = Array.isArray(response) ? response[0] : response;
      if (responseData?.STATUS == "SUCCESS") {
        setIsAddressModalOpen(false);
        toast.success("Address added successfully!", {
          duration: 2000,
        });
        setBillToAddress(null);
        setShipToAddress(null);
        setIsSameAddress(null);
        await queryClient.refetchQueries({
          queryKey: [
            "contactBillingAddress",
            user?.isEmployee ? selectedContact?.id : user?.id,
            user?.isEmployee ? selectedContact?.type : user?.type,
            token,
          ],
        });
      } else {
        throw new Error(responseData?.MSG || "Failed to add address");
      }
    },
    onError: (error) => {
      const errorMessage =
        error.response?.data?.MSG ||
        error.message ||
        "Failed to add address. Please try again.";
      toast.error(errorMessage);
    },
  });

  const handleAddAddress = (values) => {
    addAddressMutation.mutate(values);
  };

  const resetForm = () => {
    setRemarks("");
    setSelectedWonLead(null);
    setWonLeadData([]);
    setShowClickHere(false);
    setFormValues(() => {
      const baseFormValues = {
        unique_id: generateUniqueId(),
        productid: "",
        productname: "",
        productqty: "",
        unit: "",
        stock: "",
        rate: "",
        product_image: "",
        secondary_base_qty: "0",
        sec_unit: "",
        productcode: "",
        totalrate: "",
        SecQtyReverseCalculate: 0,
        unitvalue: "0",
        proddivision: "",
        stock_data: [],
        price_list_flg: false,
        Attribute_data: {},
        attribute: {},
        scheduleDate: format(new Date(), "yyyy-MM-dd"),
        discount: "",
        discount_amount: "",
        mrp_price: "",
        sec_unit_mrp_rate: "",
        unit_con_mode: null,
        sec_unit_rate: "0",
      };

      const enhancedFormValues = {
        ...baseFormValues,
        conversion_flg: "1",
        primary_unit_id: "",
        secondary_unit_id: "",
        SecQtyTotal: "",
      };

      if (selectedtypeOption == "lead-option") {
        return [baseFormValues];
      } else if (
        (selectedtypeOption == "salesorder-option" || selectedtypeOption == "quotation-option") &&
        secUnitConfig == "0"
      ) {
        return [baseFormValues];
      } else if (
        (selectedtypeOption == "salesorder-option" || selectedtypeOption == "quotation-option") &&
        secUnitConfig == "1"
      ) {
        return [enhancedFormValues];
      } else {
        return [baseFormValues];
      }
    });
  };

  useEffect(() => {
    resetForm();
  }, []);

  if (quotationIdParam && !quotationDetails) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
        <HashLoader color="#287f71" size={60} speedMultiplier={1.5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-[#4a5a6b] flex items-center gap-2">
        <Columns2 />
        {quotationIdParam ? "Edit" : "Create New"} Quotation
      </h1>

      <Card>
        <CardContent className="pt-6">
          <form className="">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
              <>
                <CompanySelector
                  options={companies}
                  value={selectedCompany}
                  onValueChange={setSelectedCompany}
                  entityIdParam={quotationIdParam}
                  entityDetails={quotationDetails}
                  entityType="quotation"
                />
                <BranchSelector
                  entityIdParam={quotationIdParam}
                  entityDetails={quotationDetails}
                  entityType="quotation"
                />
                <DivisionSelector
                  options={divisions}
                  value={selectedDivision}
                  onValueChange={setSelectedDivision}
                  entityIdParam={quotationIdParam}
                  entityDetails={quotationDetails}
                  entityType="quotation"
                />
              </>
            </div>

            <div className="mt-11 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {user?.isEmployee && (
                <div className="lg:col-span-1">
                  <div className="space-y-2">
                    <h3 className="block text-base font-medium text-[#4a5a6b]">
                      Select {contactLabel}{" "}
                      <span className="text-red-500">*</span>
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <div className="relative flex-1">
                          <ContactSearch
                            contacts={contactList}
                            onSelect={contactSelect}
                            productSearch={false}
                            selectedItem={selectedContact}
                          />
                        </div>
                        {showAddButton && !contactIdParam && !quotationIdParam && (
                          <>
                            <Button
                              className="h-9 px-4 ml-0 rounded-l-none bg-[#287f71] hover:bg-[#20665a] text-white"
                              type="button"
                              onClick={() => setIsContactModalOpen(true)}
                            >
                              Add
                            </Button>
                            <Modal
                              open={isContactModalOpen}
                              onOpenChange={setIsContactModalOpen}
                              title={`Add New ${contactLabel}`}
                            >
                              <ContactForm
                                onAddContactSubmit={handleAddContact}
                                onCancel={() => setIsContactModalOpen(false)}
                                isSaveContact={isSaveContact}
                              />
                            </Modal>
                          </>
                        )}
                      </div>
                      {showClickHere && (
                        <div className="text-center">
                          <a
                            className="text-[#287f71] hover:text-[#20665a] hover:underline text-sm cursor-pointer font-bold"
                            onClick={() => setIsWonLeadModalOpen(true)}
                          >
                            Click here to show won lead
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div
                className={user?.isEmployee ? "lg:col-span-1" : "lg:col-span-2"}
              >
                <PaymentTermsSelector
                  options={paymentOptions}
                  selectedTerm={selectedTerm}
                  customDays={customDays}
                  onChange={handlePaymentTermsChange}
                  selectedContact={selectedContact}
                  entityIdParam={quotationIdParam}
                  entityDetails={quotationDetails}
                  entityType="quotation"
                />
              </div>
            </div>

            <div className="mt-11 space-y-2">
              <h3 className="block text-base font-medium text-[#4a5a6b]">
                Select Products
              </h3>
              <ProductSelectionTable
                formValues={formValues}
                setFormValues={setFormValues}
                productList={productList}
                selectedtypeOption={selectedtypeOption}
                selectedCompany={selectedCompany}
                selectedContact={selectedContact}
                entityIdParam={quotationIdParam}
                entityDetails={quotationDetails}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="lg:col-span-1">
                <QuotationDeliveryOptions
                  deliveryOptions={deliveryOptions}
                  billToAddress={billToAddress}
                  setBillToAddress={setBillToAddress}
                  shipToAddress={shipToAddress}
                  setShipToAddress={setShipToAddress}
                  isSameAddress={isSameAddress}
                  setIsSameAddress={setIsSameAddress}
                  selectedContact={selectedContact}
                  entityIdParam={quotationIdParam}
                  entityDetails={quotationDetails}
                />

                {selectedContact && !quotationIdParam && (
                  <div className="mt-4">
                    <Button
                      className="h-9 px-4 bg-[#287f71] hover:bg-[#20665a] text-white"
                      type="button"
                      onClick={() => setIsAddressModalOpen(true)}
                    >
                      Add Address
                    </Button>
                    <Modal
                      open={isAddressModalOpen}
                      onOpenChange={setIsAddressModalOpen}
                      title="Add New Address"
                    >
                      <AddressForm
                        onAddAddressSubmit={handleAddAddress}
                        onCancel={() => setIsAddressModalOpen(false)}
                        addressType={addressType}
                        isSubmitting={addAddressMutation.isPending}
                      />
                    </Modal>
                  </div>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <div className="px-6 py-4">
          <label className="block text-base font-medium text-[#4a5a6b]">
            Remarks (Optional)
          </label>
        </div>

        <hr className="border-t border-gray-300" />
        <CardContent className="py-5">
          <RemarksField
            value={remarks}
            onChange={setRemarks}
            entityIdParam={quotationIdParam}
            entityDetails={quotationDetails}
            entityType="quotation"
          />
        </CardContent>
      </Card>

      <Button
        type="button"
        className="bg-[#287f71] hover:bg-[#20665a] text-white text-sm sm:text-base px-4 py-2"
        disabled={
          quotationIdParam
            ? user?.isEmployee && enabledOtpPortal == 0
              ? saveEditQuotationMutation.isPending
              : generateOtpMutation.isPending
            : user?.isEmployee
              ? enabledOtpPortal == 0
                ? saveQuotationMutation.isPending
                : generateOtpMutation.isPending
              : saveQuotationMutation.isPending
        }
        onClick={handleCreateQuotation}
      >
        {quotationIdParam ? "Update" : "Create"} Quotation
      </Button>

      <WonLeadDialog
        open={isWonLeadModalOpen}
        onOpenChange={setIsWonLeadModalOpen}
        wonLeadData={wonLeadData}
        selectedWonLead={selectedWonLead}
        setSelectedWonLead={setSelectedWonLead}
      />

      <OTPDialog
        open={otpDialogOpen}
        setOpen={setOtpDialogOpen}
        otpValue={otpValue}
        setOtpValue={setOtpValue}
        selectedContact={selectedContact}
        otpKey={otpKey}
        onSubmitOtp={onSubmitOtp}
        handleResendOtp={handleResendOtp}
      />
    </div>
  );
};

export default CreateQuotationPage;