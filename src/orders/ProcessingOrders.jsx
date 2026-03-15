import React, { useEffect, useMemo, useState } from "react";
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

export default function ProcessingOrders() {
  const user = useMemo(() => readAuthUser(), []);
  const isCompanyUser = user?.accountType === "company";
  const isEmployeeUser = user?.accountType === "employee";
  const [activeTab, setActiveTab] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
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

    loadOrders();
  }, []);

  useEffect(() => {
    if (isCompanyUser && activeTab === "manifest") {
      setActiveTab("all");
    }
  }, [activeTab, isCompanyUser]);

  const grouped = useMemo(() => {
    const manifest = orders.filter(
      (item) =>
        String(item?.form_type || "").toLowerCase() === "manifest" ||
        String(item?.order_status || "").toLowerCase() === "manifest"
    );
    const inTransit = orders.filter(
      (item) => String(item?.order_status || "").toLowerCase() === "in_transit"
    );
    const outForDelivery = orders.filter(
      (item) => String(item?.order_status || "").toLowerCase() === "out_for_delivery"
    );
    const delivered = orders.filter(
      (item) => String(item?.order_status || "").toLowerCase() === "delivered"
    );

    return {
      all: orders,
      manifest,
      in_transit: inTransit,
      out_for_delivery: outForDelivery,
      delivered,
    };
  }, [orders]);

  const visibleTabs = useMemo(() => {
    if (isCompanyUser) {
      return TABS.filter((tab) => tab.key !== "manifest");
    }
    return TABS;
  }, [isCompanyUser]);

  const currentRows = grouped[activeTab] || [];

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
                        {isEmployeeUser ? (
                          <button type="button" className="po-qrBtn">
                            Generate QR Code
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
