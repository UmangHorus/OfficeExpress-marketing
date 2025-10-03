"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Tag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductSearch } from "../inputs/search";
import { toast } from "sonner";
import { leadService } from "@/lib/leadService";
import { useLoginStore } from "@/stores/auth.store";
import ProdMultiAttrDialog from "../shared/ProdMultiAttrDialog";
import api from "@/lib/api/axios";

const MeasurementProductSelectionTable = ({
  formValues,
  setFormValues,
  productList,
}) => {
  const baseurl = api.defaults.baseURL;
  const { user = {}, token } = useLoginStore();

  // State for selected product and dialog open/close
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isAttrModalOpen, setIsAttrModalOpen] = useState(false);

  // Function to add a new row
  const addFormFields = () => {
    setFormValues([
      ...formValues,
      {
        unique_id: Date.now(),
        productid: "",
        productname: "",
        productcode: "",
        product_image: "",
        Attribute_data: {},
        attribute: {}, // Initialize attribute object for new rows
      },
    ]);
  };

  // Function to remove a row
  const removeFormFields = (index) => {
    if (formValues.length === 1 && !formValues[0].productid) {
      return;
    }

    const newFormValues = [...formValues];
    newFormValues.splice(index, 1);

    const updatedFormValues = newFormValues.map((item, newIndex) => {
      if (item.productid && item.attribute) {
        const oldKey = Object.keys(item.attribute)[0];
        if (oldKey) {
          const [productId, oldIndex] = oldKey.split("_");
          const newKey = `${productId}_${newIndex}`;

          // Create new attribute object with updated key
          const newAttribute = {};
          newAttribute[newKey] = item.attribute[oldKey];

          return {
            ...item,
            attribute: newAttribute,
          };
        }
      }
      return item;
    });

    if (updatedFormValues.length === 0) {
      const baseDefault = {
        unique_id: Date.now(),
        productid: "",
        productname: "",
        productcode: "",
        product_image: "",
        Attribute_data: {},
        attribute: {},
      };
      setFormValues([baseDefault]);
    } else {
      setFormValues(updatedFormValues);
    }
  };

  // Handle product selection
  const productSelect = (product, index) => {
    if (!product?.product_id) return;
    getProductUnit(product, index);
  };

  // Fetch product unit details
  const getProductUnit = async (product, index) => {
    try {
      if (!token || !product?.product_id) {
        throw new Error("Invalid parameters: Missing required fields");
      }

      const response = await leadService.getProductUnit(
        token,
        product?.product_id,
        user?.id,
        user?.type
      );
      const data = Array.isArray(response) ? response[0] : response;
      const productData = data?.DATA;

      if (data?.STATUS === "SUCCESS") {
        let newFormValues = [...formValues];
        newFormValues[index] = {
          unique_id: newFormValues[index].unique_id || Date.now(),
          productid: product?.product_id ?? "",
          productname: product?.name ?? "",
          productcode: productData?.productcode ?? "",
          product_image: productData?.product_image ?? "",
          Attribute_data: productData?.Attribute_data || {},
          attribute: newFormValues[index]?.attribute || {}, // Preserve existing attributes
        };
        setFormValues(newFormValues);
      } else {
        const newFormValues = [...formValues];
        newFormValues[index] = {
          unique_id: newFormValues[index].unique_id || Date.now(),
          productid: "",
          productname: "",
          productcode: "",
          product_image: "",
          Attribute_data: {},
          attribute: newFormValues[index]?.attribute || {},
        };
        setFormValues(newFormValues);
        toast.error(data?.MSG || "Failed to fetch product details");
      }
    } catch (error) {
      console.error("Error fetching product unit:", error);
      const newFormValues = [...formValues];
      newFormValues[index] = {
        unique_id: newFormValues[index].unique_id || Date.now(),
        productid: "",
        productname: "",
        productcode: "",
        product_image: "",
        Attribute_data: {},
        attribute: newFormValues[index]?.attribute || {},
      };
      setFormValues(newFormValues);
      toast.error("Error fetching product details");
    }
  };

  // Handle attributes click
  const handleShowAttributes = (element) => {
    setSelectedProduct(element);
    setIsAttrModalOpen(true);
  };

  // Get the number of attribute rows for a product
  const getAttributeRowCount = (element, index) => {
    const productAttrKey = `${element.productid}_${index}`;
    const attrRows = element?.attribute?.[productAttrKey] || [];
    return Array.isArray(attrRows) ? attrRows.length : 0;
  };

  return (
    <div className="w-full">
      {/* Desktop View */}
      <div className="hidden md:block productsearch-table">
        <Table className="min-w-[800px] table-wide z-10">
          <TableHeader>
            <TableRow className="bg-[#4a5a6b] text-white text-center hover:bg-[#4a5a6b]">
              <TableHead className="text-white text-sm sm:text-base px-2 sm:px-4 py-2">
                Attributes
              </TableHead>
              <TableHead className="text-white text-sm sm:text-base px-2 sm:px-4 py-2">
                Image
              </TableHead>
              <TableHead className="text-white text-sm sm:text-base px-2 sm:px-4 py-2">
                Product
              </TableHead>
              <TableHead className="text-white text-sm sm:text-base px-2 sm:px-4 py-2">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formValues.map((element, index) => (
              <TableRow key={element.unique_id} className="text-center">
                <TableCell className="text-left py-1 px-0">
                  <div className="flex items-center">
                    <Tag
                      className={`${element.productid &&
                        Object.keys(element.Attribute_data || {}).length > 0
                          ? "text-[#26994e] cursor-pointer rotate-90"
                          : "text-gray-400 cursor-not-allowed opacity-50 rotate-90"
                        }`}
                      size={22}
                      onClick={() => {
                        if (
                          element.productid &&
                          Object.keys(element.Attribute_data || {}).length > 0
                        ) {
                          handleShowAttributes(element);
                        }
                      }}
                      disabled={
                        !element.productid ||
                        Object.keys(element.Attribute_data || {}).length === 0
                      }
                    />
                    <span className="ml-2 text-sm">
                      ({getAttributeRowCount(element, index)} rows)
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-left py-1 px-0">
                  <img
                    alt="product-image"
                    src={
                      element.product_image
                        ? `${baseurl}/viewimage/getproduct/${element.product_image}/normal`
                        : `${baseurl}/viewimage/getproduct/normal`
                    }
                    className="w-8 h-8"
                  />
                </TableCell>
                <TableCell className="text-left py-1 px-0">
                  {element.productid ? (
                    <div className="w-[250px]">
                      {element.productname || ""} ({element.productcode || ""})
                    </div>
                  ) : (
                    <div className="w-[250px]">
                      <ProductSearch
                        products={productList}
                        onSelect={(product) => productSelect(product, index)}
                      />
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-left py-1 px-0">
                  <div className="">
                    <Trash2
                      className={`h-8 w-8 sm:h-9 sm:w-9 p-2 rounded-full ${formValues.length === 1 && !element.productid
                          ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                          : "text-red-500 hover:bg-red-100 cursor-pointer"
                        }`}
                      onClick={() => {
                        if (formValues.length > 1 || element.productid) {
                          removeFormFields(index);
                        }
                      }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Desktop Add Row Button */}
        <div className="hidden md:block text-end mt-2 px-2 sm:px-4 py-4">
          <Button
            type="button"
            className="bg-[#287f71] hover:bg-[#20665a] text-white text-sm sm:text-base px-4 py-2"
            onClick={addFormFields}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Row
          </Button>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4 mb-4">
        {formValues.map((element, index) => (
          <div
            key={element.unique_id}
            className="border rounded-lg p-4 bg-white shadow-sm"
          >
            <div className="grid grid-cols-1 gap-4 mb-3">
              <div className="flex justify-end">
                <Trash2
                  className={`h-8 w-8 sm:h-9 sm:w-9 p-2 rounded-full ${formValues.length === 1 && !element.productid
                      ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                      : "text-red-500 hover:bg-red-100 cursor-pointer"
                    }`}
                  onClick={() => {
                    if (formValues.length > 1 || element.productid) {
                      removeFormFields(index);
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-500 w-32">
                    Attributes:
                  </label>
                  <div className="flex items-center">
                    <Tag
                      className={`${element.productid &&
                        Object.keys(element.Attribute_data || {}).length > 0
                          ? "text-[#26994e] cursor-pointer rotate-90"
                          : "text-gray-400 cursor-not-allowed opacity-50 rotate-90"
                        }`}
                      size={22}
                      onClick={() => {
                        if (
                          element.productid &&
                          Object.keys(element.Attribute_data || {}).length > 0
                        ) {
                          handleShowAttributes(element);
                        }
                      }}
                      disabled={
                        !element.productid ||
                        Object.keys(element.Attribute_data || {}).length === 0
                      }
                    />
                    <span className="ml-2 text-sm">
                      ({getAttributeRowCount(element, index)} rows)
                    </span>
                  </div>
                </div>
                <div className="flex items-center">
                  <label className="text-sm font-medium text-gray-500 w-32">
                    Image:
                  </label>
                  <img
                    alt="product-image"
                    src={
                      element.product_image
                        ? `${baseurl}/viewimage/getproduct/${element.product_image}/normal`
                        : `${baseurl}/viewimage/getproduct/normal`
                    }
                    className="w-8 h-8"
                  />
                </div>
                <div
                  className={`${element.productid ? "flex items-center" : ""}`}
                >
                  <label className="text-sm font-medium text-gray-500 w-32">
                    Product:
                  </label>
                  {element.productid ? (
                    <div className="flex items-center">
                      <span className="text-sm flex-1">
                        {element.productname || ""} ({element.productcode || ""})
                      </span>
                    </div>
                  ) : (
                    <ProductSearch
                      products={productList}
                      onSelect={(product) => productSelect(product, index)}
                      className="mt-1"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div className="flex justify-end">
          <Button
            type="button"
            className="bg-[#287f71] hover:bg-[#20665a] text-white text-sm sm:text-base px-4 py-2"
            onClick={addFormFields}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Row
          </Button>
        </div>
      </div>

      {/* Attributes Dialog */}
      <ProdMultiAttrDialog
        key={selectedProduct?.unique_id || "no-product"}
        open={isAttrModalOpen}
        setOpen={setIsAttrModalOpen}
        product={selectedProduct}
        index={formValues.findIndex(
          (item) => item.unique_id === selectedProduct?.unique_id
        )}
        formValues={formValues}
        setFormValues={setFormValues}
      />
    </div>
  );
};

export default MeasurementProductSelectionTable;