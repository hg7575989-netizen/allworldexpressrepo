import React, { useEffect, useMemo, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import "./ProcessingOrders.css";
import { apiUrl } from "../config/api";

const TABS = [
  { key: "all", label: "Processing Orders" },
  { key: "manifest", label: "Manifest" },
  { key: "in_transit", label: "In Transit" },
  { key: "out_for_delivery", label: "Out For Delivery" },
  { key: "delivered", label: "Delivered" },
];

function statusLabel(status) {
  const clean = String(status || "").trim().toLowerCase();
  if (clean === "manifest") return "Manifest";
  if (clean === "in_transit") return "In Transit";
  if (clean === "out_for_delivery") return "Out For Delivery";
  if (clean === "delivered") return "Delivered";
  return "Processing";
}

function readAuthUser() {
  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildQrPayload(order, boxNumber, totalBoxes) {
  return `ALLWORLD_QR::${JSON.stringify({
    docId: order.id,
    awbNo: order.awb_no,
    boxCount: order.box_count,
    boxNumber,
    totalBoxes,
  })}`;
}

function getTotalBoxes(order) {
  const raw = String(order?.box_count ?? "").trim();
  const match = raw.match(/\d+/);
  const parsed = match ? Number(match[0]) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function dataUrlToUint8Array(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function downloadQrPdf(order) {
  const totalBoxes = getTotalBoxes(order);
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 30;
  const columns = 3;
  const rows = 3;
  const gap = 12;
  const cellWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
  const cellHeight = (pageHeight - margin * 2 - gap * (rows - 1)) / rows;
  const qrSize = Math.min(cellWidth - 24, cellHeight - 58);

  let page = null;

  for (let index = 0; index < totalBoxes; index += 1) {
    if (index % 9 === 0) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
    }

    const cellIndex = index % 9;
    const rowIndex = Math.floor(cellIndex / columns);
    const columnIndex = cellIndex % columns;
    const x = margin + columnIndex * (cellWidth + gap);
    const y = pageHeight - margin - (rowIndex + 1) * cellHeight - rowIndex * gap;

    const payload = buildQrPayload(order, index + 1, totalBoxes);
    const qrDataUrl = await QRCode.toDataURL(payload, {
      margin: 1,
      width: 512,
    });
    const qrImage = await pdfDoc.embedPng(dataUrlToUint8Array(qrDataUrl));
    const qrX = x + (cellWidth - qrSize) / 2;
    const qrY = y + 34;

    page.drawRectangle({
      x,
      y,
      width: cellWidth,
      height: cellHeight,
      borderWidth: 1,
      borderColor: rgb(0.84, 0.88, 0.95),
    });
    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });
    page.drawText(String(order.awb_no || "AWB"), {
      x: x + 12,
      y: y + cellHeight - 22,
      size: 11,
      font: boldFont,
      color: rgb(0.1, 0.16, 0.32),
    });
    page.drawText(`Box ${index + 1} of ${totalBoxes}`, {
      x: x + 12,
      y: y + 16,
      size: 10,
      font,
      color: rgb(0.22, 0.28, 0.43),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const fileName = `${String(order.awb_no || "qr-codes").trim() || "qr-codes"}.pdf`;
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

function formatScanLocation(order) {
  const lat = order?.last_scan_latitude;
  const lng = order?.last_scan_longitude;
  if (lat === null || lat === undefined || lng === null || lng === undefined) return "";
  return `${lat}, ${lng}`;
}

function buildLocationLink(order) {
  const lat = order?.last_scan_latitude;
  const lng = order?.last_scan_longitude;
  if (lat === null || lat === undefined || lng === null || lng === undefined) return "";
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default function ProcessingOrders() {
  const user = useMemo(() => readAuthUser(), []);
  const isCompanyUser = user?.accountType === "company";
  const isEmployeeUser = user?.accountType === "employee";
  const [activeTab, setActiveTab] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatingOrderId, setGeneratingOrderId] = useState(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setError("");
        const res = await fetch(apiUrl("/api/orders"));
        const data = await res.json();
        if (!res.ok) {
          setError(data?.message || "Failed to load orders");
          return;
        }
        setOrders(Array.isArray(data?.docs) ? data.docs : []);
      } catch {
        setError("Server error while loading orders");
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    loadOrders();
    const intervalId = window.setInterval(loadOrders, 10000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (isCompanyUser && activeTab === "manifest") {
      setActiveTab("all");
    }
  }, [activeTab, isCompanyUser]);

  const visibleTabs = useMemo(() => {
    if (isCompanyUser) {
      return TABS.filter((tab) => tab.key !== "manifest");
    }
    return TABS;
  }, [isCompanyUser]);

  const scopedOrders = useMemo(() => {
    if (user?.accountType === "company") {
      const companyName = String(user?.name || "").trim().toLowerCase();
      return orders.filter(
        (order) => String(order?.consignor_name || "").trim().toLowerCase() === companyName
      );
    }

    if (user?.accountType === "employee") {
      const employeeId = String(user?.id || "").trim().toLowerCase();
      return orders.filter(
        (order) => String(order?.generated_by_employee_id || "").trim().toLowerCase() === employeeId
      );
    }

    return orders;
  }, [orders, user]);

  const grouped = useMemo(() => {
    const manifest = scopedOrders.filter(
      (item) =>
        String(item?.form_type || "").toLowerCase() === "manifest" ||
        String(item?.order_status || "").toLowerCase() === "manifest"
    );
    const inTransit = scopedOrders.filter(
      (item) => String(item?.order_status || "").toLowerCase() === "in_transit"
    );
    const outForDelivery = scopedOrders.filter(
      (item) => String(item?.order_status || "").toLowerCase() === "out_for_delivery"
    );
    const delivered = scopedOrders.filter(
      (item) => String(item?.order_status || "").toLowerCase() === "delivered"
    );

    return {
      all: scopedOrders,
      manifest,
      in_transit: inTransit,
      out_for_delivery: outForDelivery,
      delivered,
    };
  }, [scopedOrders]);

  const currentRows = grouped[activeTab] || [];

  const handleGenerateQr = async (order) => {
    try {
      setGeneratingOrderId(order.id);

      const markRes = await fetch(apiUrl("/api/orders/mark-in-transit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: order.id,
          awbNo: order.awb_no,
        }),
      });
      const markData = await markRes.json();
      if (!markRes.ok) {
        alert(markData?.message || "QR generate karte waqt status update nahi ho paya.");
        setGeneratingOrderId(null);
        return;
      }

      await downloadQrPdf(order);

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? { ...item, order_status: "in_transit" }
            : item
        )
      );

      setGeneratingOrderId(null);
    } catch {
      setGeneratingOrderId(null);
      alert("QR code PDF generate nahi ho paya.");
    }
  };

  const handleRedownloadQr = async (order) => {
    try {
      setGeneratingOrderId(order.id);
      await downloadQrPdf(order);
    } catch {
      alert("QR code PDF dobara download nahi ho paya.");
    } finally {
      setGeneratingOrderId(null);
    }
  };

  return (
    <div className="po-wrap">
      <div className="po-card">
        <div className="po-tabs">
          {visibleTabs.map((tab) => {
            const count = (grouped[tab.key] || []).length;
            return (
              <button
                key={tab.key}
                type="button"
                className={`po-tab ${activeTab === tab.key ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        {loading && <p className="po-state">Loading orders...</p>}
        {!loading && error && <p className="po-state po-state-error">{error}</p>}

        {!loading && !error && (
          <div className="po-tableWrap">
            <table className="po-table">
              <thead>
                <tr>
                  <th />
                  <th>Customer</th>
                  <th>Route</th>
                  <th>Payment</th>
                  <th>Order</th>
                  <th>Weight</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.length === 0 && (
                  <tr>
                    <td colSpan="7" className="po-empty">
                      No orders found.
                    </td>
                  </tr>
                )}
                {currentRows.map((order) => {
                  const dateText = order.created_at ? new Date(order.created_at).toLocaleString() : "-";
                  const scanLocation = formatScanLocation(order);
                  const scanLocationLink = buildLocationLink(order);
                  const scanTime = order.last_scan_at ? new Date(order.last_scan_at).toLocaleString() : "";

                  return (
                    <tr key={order.id}>
                      <td>
                        <input type="checkbox" />
                      </td>
                      <td>
                        <div className="po-customer">{order.customer_name || "N/A"}</div>
                        <div className="po-small">{order.customer_phone || order.awb_no || "-"}</div>
                        <div className="po-rowInfo">
                          <span className="po-status">{statusLabel(order.order_status)}</span>
                          <span className="po-small">{dateText}</span>
                        </div>
                        {scanLocation && (
                          <div className="po-small po-meta">Current: {scanLocation}</div>
                        )}
                        {order.last_scan_ip && (
                          <div className="po-small po-meta">IP: {order.last_scan_ip}</div>
                        )}
                        {scanTime && (
                          <div className="po-small po-meta">Last Scan: {scanTime}</div>
                        )}
                      </td>
                      <td>
                        <div>{order.origin || "-"}</div>
                        <div className="po-small">to</div>
                        <div>{order.destination || "-"}</div>
                      </td>
                      <td>
                        <div className="po-pay">{order.payment_label || "Prepaid"}</div>
                        <div className="po-small">{order.payment_mode || "Prepaid"}</div>
                        <div className="po-small">{order.service_type || "B2C"}</div>
                      </td>
                      <td>
                        <div className="po-orderRef">{order.order_reference || "-"}</div>
                        <div className="po-small">{order.order_category || "-"}</div>
                      </td>
                      <td>
                        <div>{order.weight_summary || "-"}</div>
                        <div className="po-small">
                          Vol: {order.box_count || "-"} | Wt: {order.total_weight || "-"} Kg
                        </div>
                      </td>
                      <td>
                        {String(order.order_status || "").toLowerCase() === "in_transit" ? (
                          <div className="po-actionInfo">
                            {scanLocation ? (
                              <>
                                <div className="po-small">Last Location</div>
                                <div className="po-actionText">{scanLocation}</div>
                                <a
                                  className="po-locationLink"
                                  href={scanLocationLink}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open Location
                                </a>
                              </>
                            ) : order.last_scan_ip ? (
                              <>
                                <div className="po-small">Last Scan IP</div>
                                <div className="po-actionText">{order.last_scan_ip}</div>
                              </>
                            ) : (
                              <span className="po-small">Location pending</span>
                            )}
                            {isEmployeeUser && (
                              <button
                                type="button"
                                className="po-qrBtn"
                                onClick={() => handleRedownloadQr(order)}
                                disabled={generatingOrderId === order.id}
                              >
                                {generatingOrderId === order.id ? "Preparing..." : "Re-download QR PDF"}
                              </button>
                            )}
                          </div>
                        ) : isEmployeeUser ? (
                          <button
                            type="button"
                            className="po-qrBtn"
                            onClick={() => handleGenerateQr(order)}
                            disabled={generatingOrderId === order.id}
                          >
                            {generatingOrderId === order.id ? "Generating..." : "Generate QR Code"}
                          </button>
                        ) : (
                          <span className="po-small">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
