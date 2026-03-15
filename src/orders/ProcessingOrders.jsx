import React, { useEffect, useMemo, useState } from "react";
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

function buildQrPayload(order) {
  return `ALLWORLD_QR::${JSON.stringify({
    docId: order.id,
    awbNo: order.awb_no,
    boxCount: order.box_count,
  })}`;
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
  const [qrImage, setQrImage] = useState("");
  const [qrOrder, setQrOrder] = useState(null);
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

  const closeQrModal = () => {
    setQrImage("");
    setQrOrder(null);
    setGeneratingOrderId(null);
  };

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

      const payload = buildQrPayload(order);
      const qrDataUrl = await QRCode.toDataURL(payload, {
        margin: 2,
        width: 320,
      });

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? { ...item, order_status: "in_transit" }
            : item
        )
      );

      setQrOrder({ ...order, order_status: "in_transit" });
      setQrImage(qrDataUrl);
      setGeneratingOrderId(null);
    } catch {
      setGeneratingOrderId(null);
      alert("QR code generate nahi ho paya.");
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
                          scanLocation ? (
                            <div className="po-actionInfo">
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
                            </div>
                          ) : order.last_scan_ip ? (
                            <div className="po-actionInfo">
                              <div className="po-small">Last Scan IP</div>
                              <div className="po-actionText">{order.last_scan_ip}</div>
                            </div>
                          ) : (
                            <span className="po-small">Location pending</span>
                          )
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

      {qrImage && qrOrder && (
        <div className="po-modal">
          <div className="po-modalCard">
            <h3>QR Code Ready</h3>
            <p className="po-small">
              AWB: <b>{qrOrder.awb_no}</b> | Boxes: <b>{qrOrder.box_count}</b>
            </p>
            <img className="po-qrImage" src={qrImage} alt={`QR for ${qrOrder.awb_no}`} />
            <button type="button" className="po-qrBtn" onClick={closeQrModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
