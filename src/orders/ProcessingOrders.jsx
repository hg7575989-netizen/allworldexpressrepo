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

const QR_PREFIX = "ALLWORLD_QR::";
const MANIFEST_QR_PREFIX = "ALLWORLD_MANIFEST_QR::";

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
  return `${QR_PREFIX}${JSON.stringify({
    docId: order.id,
    awbNo: order.awb_no,
    boxCount: order.box_count,
    boxNumber,
    totalBoxes,
  })}`;
}

function buildManifestQrPayload(manifest, orders) {
  return `${MANIFEST_QR_PREFIX}${JSON.stringify({
    manifestNumber: manifest.manifestNumber,
    docIds: orders.map((order) => order.id),
    awbNos: orders.map((order) => order.awb_no),
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

function toInputDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function getNumericValue(value) {
  const match = String(value || "").match(/[\d.]+/);
  if (!match) return 0;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function summarizeDestination(orders) {
  const values = orders.map((order) => String(order?.destination || "").trim()).filter(Boolean);
  if (!values.length) return "";
  const first = values[0].toLowerCase();
  return values.every((value) => value.toLowerCase() === first) ? values[0] : "";
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

async function downloadBlob(fileName, blob) {
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(downloadUrl);
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
    const qrDataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 512 });
    const qrImage = await pdfDoc.embedPng(dataUrlToUint8Array(qrDataUrl));
    const qrX = x + (cellWidth - qrSize) / 2;
    const qrY = y + 34;

    page.drawRectangle({ x, y, width: cellWidth, height: cellHeight, borderWidth: 1, borderColor: rgb(0.84, 0.88, 0.95) });
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    page.drawText(String(order.awb_no || "AWB"), { x: x + 12, y: y + cellHeight - 22, size: 11, font: boldFont, color: rgb(0.1, 0.16, 0.32) });
    page.drawText(`Box ${index + 1} of ${totalBoxes}`, { x: x + 12, y: y + 16, size: 10, font, color: rgb(0.22, 0.28, 0.43) });
  }

  const pdfBytes = await pdfDoc.save();
  await downloadBlob(`${String(order.awb_no || "qr-codes").trim() || "qr-codes"}.pdf`, new Blob([pdfBytes], { type: "application/pdf" }));
}
async function downloadManifestPdf(manifestDetails, orders) {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 18;
  const rowsPerPage = 12;
  const tableTop = 292;
  const rowHeight = 32;
  const columnWidths = [40, 96, 96, 90, 44, 42, 56, 96];
  const headers = ["C.No", "Destination", "Consignee", "Products", "PSC", "BOX", "Weight", "Delivery"];
  const totalBoxes = orders.reduce((sum, order) => sum + getNumericValue(order.box_count), 0);
  const totalWeight = orders.reduce((sum, order) => sum + getNumericValue(order.total_weight), 0);
  const totalPages = Math.max(1, Math.ceil(orders.length / rowsPerPage));
  const manifestQrDataUrl = await QRCode.toDataURL(buildManifestQrPayload(manifestDetails, orders), { margin: 1, width: 256 });
  const manifestQrImageBytes = dataUrlToUint8Array(manifestQrDataUrl);

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const manifestQrImage = await pdfDoc.embedPng(manifestQrImageBytes);
    const startIndex = pageIndex * rowsPerPage;
    const pageRows = orders.slice(startIndex, startIndex + rowsPerPage);

    page.drawRectangle({ x: 0, y: pageHeight - 160, width: pageWidth, height: 160, color: rgb(0.18, 0.62, 0.92) });
    page.drawText("ALL WORLD EXPRESS", { x: 155, y: pageHeight - 58, size: 28, font: titleFont, color: rgb(0.06, 0.08, 0.14) });
    page.drawText("LUCKNOW", { x: 228, y: pageHeight - 92, size: 24, font: titleFont, color: rgb(0.06, 0.08, 0.14) });
    page.drawImage(manifestQrImage, { x: 24, y: pageHeight - 122, width: 84, height: 84 });
    page.drawText(`MANIFEST-${manifestDetails.manifestNumber}`, { x: 140, y: pageHeight - 132, size: 25, font: titleFont, color: rgb(0.06, 0.08, 0.14) });
    page.drawText("Phone No.9733899877,", { x: 448, y: pageHeight - 42, size: 11, font: bold, color: rgb(1, 1, 1) });
    page.drawText("9336593941", { x: 498, y: pageHeight - 56, size: 11, font: bold, color: rgb(1, 1, 1) });
    page.drawText(`To, ${manifestDetails.toName || ""}`, { x: 18, y: pageHeight - 205, size: 18, font: bold, color: rgb(0.12, 0.12, 0.12) });
    page.drawText(`Date: ${manifestDetails.manifestDate}`, { x: 388, y: pageHeight - 205, size: 18, font: bold, color: rgb(0.12, 0.12, 0.12) });
    page.drawText(`Destination: ${manifestDetails.destination}`, { x: 18, y: pageHeight - 245, size: 16, font: bold, color: rgb(0.12, 0.12, 0.12) });
    page.drawText(`Through: ${manifestDetails.through || ""}`, { x: 388, y: pageHeight - 245, size: 16, font: bold, color: rgb(0.12, 0.12, 0.12) });

    let cursorX = margin;
    const headerY = pageHeight - tableTop;
    headers.forEach((header, columnIndex) => {
      const width = columnWidths[columnIndex];
      page.drawRectangle({ x: cursorX, y: headerY, width, height: rowHeight, borderWidth: 1, borderColor: rgb(0.55, 0.58, 0.64) });
      page.drawText(header, { x: cursorX + 4, y: headerY + 10, size: columnIndex === headers.length - 1 ? 9 : 10, font: bold, color: rgb(0.16, 0.18, 0.22) });
      cursorX += width;
    });

    pageRows.forEach((order, rowIndex) => {
      const y = headerY - rowHeight * (rowIndex + 1);
      const values = [String(startIndex + rowIndex + 1), String(order.destination || "").trim() || "NA", String(order.customer_name || "").trim() || "NA", String(order.order_category || "").trim() || "NA", "NA", String(order.box_count || "").trim() || "NA", String(order.total_weight || "").trim() || "NA", ""];
      let valueX = margin;
      values.forEach((value, columnIndex) => {
        const width = columnWidths[columnIndex];
        page.drawRectangle({ x: valueX, y, width, height: rowHeight, borderWidth: 1, borderColor: rgb(0.78, 0.8, 0.84) });
        page.drawText(String(value).slice(0, columnIndex === 3 ? 20 : 18), { x: valueX + 4, y: y + 10, size: 9, font: regular, color: rgb(0.18, 0.2, 0.24) });
        valueX += width;
      });
    });

    if (pageIndex === totalPages - 1) {
      const totalsY = headerY - rowHeight * (pageRows.length + 1.2);
      page.drawRectangle({ x: margin, y: totalsY, width: columnWidths.slice(0, 4).reduce((sum, width) => sum + width, 0), height: 42, borderWidth: 1, borderColor: rgb(0.55, 0.58, 0.64) });
      page.drawText("Total Dispatch", { x: 66, y: totalsY + 12, size: 24, font: titleFont, color: rgb(0.1, 0.12, 0.18) });
      const totals = [
        { label: "Total PSC", value: "NA", width: columnWidths[4] },
        { label: "Total BOX", value: String(totalBoxes), width: columnWidths[5] },
        { label: "Total Weight", value: String(totalWeight), width: columnWidths[6] + columnWidths[7] },
      ];
      let totalsX = margin + columnWidths.slice(0, 4).reduce((sum, width) => sum + width, 0);
      totals.forEach((item) => {
        page.drawRectangle({ x: totalsX, y: totalsY, width: item.width, height: 42, borderWidth: 1, borderColor: rgb(0.55, 0.58, 0.64) });
        page.drawText(item.label, { x: totalsX + 4, y: totalsY + 23, size: 9, font: regular, color: rgb(0.18, 0.2, 0.24) });
        page.drawText(item.value, { x: totalsX + 4, y: totalsY + 8, size: 12, font: bold, color: rgb(0.08, 0.1, 0.16) });
        totalsX += item.width;
      });
      page.drawLine({ start: { x: 40, y: 50 }, end: { x: 430, y: 50 }, thickness: 1, color: rgb(0.4, 0.43, 0.5) });
      page.drawText("Signature & Stamp", { x: 445, y: 40, size: 14, font: bold, color: rgb(0.12, 0.12, 0.12) });
    }
  }

  const pdfBytes = await pdfDoc.save();
  await downloadBlob(`MANIFEST-${manifestDetails.manifestNumber}.pdf`, new Blob([pdfBytes], { type: "application/pdf" }));
}

function createManifestSummary(orders, manifestNumber) {
  const items = orders.filter((order) => String(order?.manifest_number || "").trim() === manifestNumber);
  const first = items[0];
  if (!first) return null;

  return {
    id: manifestNumber,
    manifestNumber,
    toName: first.manifest_to_name || "",
    destination: first.manifest_destination || first.destination || "",
    manifestDate: toInputDate(first.manifest_date || first.created_at),
    through: first.manifest_through || "",
    orders: items,
    totalOrders: items.length,
    totalBoxes: items.reduce((sum, order) => sum + getNumericValue(order.box_count), 0),
    totalWeight: items.reduce((sum, order) => sum + getNumericValue(order.total_weight), 0),
  };
}

export default function ProcessingOrders() {
  const user = useMemo(() => readAuthUser(), []);
  const isCompanyUser = user?.accountType === "company";
  const isEmployeeUser = user?.accountType === "employee";
  const [activeTab, setActiveTab] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [manifestForm, setManifestForm] = useState({ toName: "", destination: "", manifestDate: toInputDate(), through: "", manifestNumber: "" });
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [creatingManifest, setCreatingManifest] = useState(false);
  const [editingManifestNumber, setEditingManifestNumber] = useState("");
  const [editingManifestOrders, setEditingManifestOrders] = useState([]);
  const [editingManifestAddedOrderIds, setEditingManifestAddedOrderIds] = useState([]);
  const [addOrdersModalOpen, setAddOrdersModalOpen] = useState(false);

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
    if (isCompanyUser) return TABS.filter((tab) => tab.key !== "manifest");
    return TABS;
  }, [isCompanyUser]);

  const scopedOrders = useMemo(() => {
    if (user?.accountType === "company") {
      const companyName = String(user?.name || "").trim().toLowerCase();
      return orders.filter((order) => String(order?.consignor_name || "").trim().toLowerCase() === companyName);
    }

    if (user?.accountType === "employee") {
      const employeeId = String(user?.id || "").trim().toLowerCase();
      return orders.filter((order) => String(order?.generated_by_employee_id || "").trim().toLowerCase() === employeeId);
    }

    return orders;
  }, [orders, user]);

  const manifestRows = useMemo(() => {
    const manifestNumbers = Array.from(new Set(scopedOrders.map((order) => String(order?.manifest_number || "").trim()).filter(Boolean)));
    return manifestNumbers.map((manifestNumber) => createManifestSummary(scopedOrders, manifestNumber)).filter(Boolean);
  }, [scopedOrders]);

  const grouped = useMemo(() => ({
    all: scopedOrders.filter((item) => String(item?.order_status || "").toLowerCase() === "processing" && !String(item?.manifest_number || "").trim()),
    manifest: manifestRows,
    in_transit: scopedOrders.filter((item) => String(item?.order_status || "").toLowerCase() === "in_transit"),
    out_for_delivery: scopedOrders.filter((item) => String(item?.order_status || "").toLowerCase() === "out_for_delivery"),
    delivered: scopedOrders.filter((item) => String(item?.order_status || "").toLowerCase() === "delivered"),
  }), [manifestRows, scopedOrders]);

  const currentRows = grouped[activeTab] || [];
  const selectedOrders = useMemo(() => scopedOrders.filter((order) => selectedOrderIds.includes(order.id)), [scopedOrders, selectedOrderIds]);
  const canManageManifest = !isCompanyUser && activeTab === "all";
  const isManifestTab = activeTab === "manifest";
  const addableOrders = useMemo(() => {
    if (!editingManifestNumber) return [];
    return grouped.all.filter((order) => !editingManifestAddedOrderIds.includes(order.id));
  }, [editingManifestAddedOrderIds, editingManifestNumber, grouped.all]);

  useEffect(() => {
    setSelectedOrderIds((prev) => prev.filter((id) => grouped.all.some((order) => order.id === id)));
  }, [grouped.all]);

  const toggleOrderSelection = (orderId) => {
    if (!canManageManifest) return;
    setSelectedOrderIds((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]));
  };

  const toggleSelectAllCurrent = () => {
    if (!canManageManifest || !currentRows.length) return;
    const currentIds = currentRows.map((order) => order.id);
    const allSelected = currentIds.every((id) => selectedOrderIds.includes(id));
    setSelectedOrderIds((prev) => (allSelected ? prev.filter((id) => !currentIds.includes(id)) : Array.from(new Set([...prev, ...currentIds]))));
  };

  const openCreateManifestModal = async () => {
    if (!selectedOrders.length) {
      alert("Manifest banane ke liye pehle orders select karo.");
      return;
    }

    try {
      const res = await fetch(apiUrl("/api/manifests/next-number"));
      const data = await res.json();
      if (!res.ok) {
        alert(data?.message || "Manifest number generate nahi ho paaya.");
        return;
      }

      setEditingManifestNumber("");
      setManifestForm({ toName: "", destination: summarizeDestination(selectedOrders), manifestDate: toInputDate(), through: "", manifestNumber: data?.manifest?.manifestNumber || "" });
      setManifestModalOpen(true);
    } catch {
      alert("Manifest popup open nahi ho paaya.");
    }
  };

  const openEditManifestModal = (manifest) => {
    setEditingManifestNumber(manifest.manifestNumber);
    setManifestForm({ toName: manifest.toName || "", destination: manifest.destination || "", manifestDate: toInputDate(manifest.manifestDate), through: manifest.through || "", manifestNumber: manifest.manifestNumber });
    setEditingManifestOrders(Array.isArray(manifest.orders) ? manifest.orders : []);
    setEditingManifestAddedOrderIds([]);
    setManifestModalOpen(true);
  };

  const closeManifestModal = () => {
    if (creatingManifest) return;
    setManifestModalOpen(false);
    setEditingManifestNumber("");
    setEditingManifestOrders([]);
    setEditingManifestAddedOrderIds([]);
  };

  const handleManifestFormChange = (event) => {
    const { name, value } = event.target;
    setManifestForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateQr = async (order) => {
    try {
      setBusyId(`order-${order.id}`);
      await downloadQrPdf(order);
    } catch {
      alert("QR code PDF generate nahi ho paya.");
    } finally {
      setBusyId("");
    }
  };

  const handleDownloadManifest = async (manifest) => {
    try {
      setBusyId(`manifest-${manifest.manifestNumber}`);
      await downloadManifestPdf({ manifestNumber: manifest.manifestNumber, toName: manifest.toName, destination: manifest.destination, manifestDate: manifest.manifestDate, through: manifest.through }, manifest.orders);
    } catch {
      alert("Manifest PDF download nahi ho paaya.");
    } finally {
      setBusyId("");
    }
  };

  const handleManifestSubmit = async () => {
    if (!manifestForm.destination.trim()) {
      alert("Destination required hai.");
      return;
    }
    if (!manifestForm.manifestNumber.trim()) {
      alert("Manifest number required hai.");
      return;
    }
    if (editingManifestNumber && editingManifestOrders.length === 0) {
      alert("Manifest me kam se kam ek order rehna chahiye.");
      return;
    }

    try {
      setCreatingManifest(true);

      if (editingManifestNumber) {
        const res = await fetch(apiUrl(`/api/manifests/${editingManifestNumber}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toName: manifestForm.toName.trim(),
            destination: manifestForm.destination.trim(),
            manifestDate: manifestForm.manifestDate,
            through: manifestForm.through.trim(),
            keepDocIds: editingManifestOrders.map((order) => order.id),
            addDocIds: editingManifestAddedOrderIds,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data?.message || "Manifest update nahi ho paaya.");
          setCreatingManifest(false);
          return;
        }

        const keepIds = editingManifestOrders.map((order) => order.id);
        const addIds = editingManifestAddedOrderIds;
        setOrders((prev) =>
          prev.map((order) => {
            if (addIds.includes(order.id)) {
              return {
                ...order,
                order_status: "in_transit",
                manifest_number: editingManifestNumber,
                manifest_to_name: manifestForm.toName.trim(),
                manifest_destination: manifestForm.destination.trim(),
                manifest_date: manifestForm.manifestDate,
                manifest_through: manifestForm.through.trim(),
              };
            }
            if (String(order.manifest_number || "").trim() !== editingManifestNumber) {
              return order;
            }

            if (!keepIds.includes(order.id)) {
              return {
                ...order,
                order_status: "processing",
                manifest_number: "",
                manifest_to_name: "",
                manifest_destination: "",
                manifest_date: null,
                manifest_through: "",
              };
            }

            return {
              ...order,
              order_status: "in_transit",
              manifest_to_name: manifestForm.toName.trim(),
              manifest_destination: manifestForm.destination.trim(),
              manifest_date: manifestForm.manifestDate,
              manifest_through: manifestForm.through.trim(),
            };
          })
        );
        setManifestModalOpen(false);
        setEditingManifestNumber("");
        setEditingManifestOrders([]);
        setEditingManifestAddedOrderIds([]);
        setCreatingManifest(false);
        return;
      }

      if (!selectedOrders.length) {
        alert("Selected orders nahi mile.");
        setCreatingManifest(false);
        return;
      }

      const payload = { docIds: selectedOrders.map((order) => order.id), manifestNumber: manifestForm.manifestNumber.trim(), toName: manifestForm.toName.trim(), destination: manifestForm.destination.trim(), manifestDate: manifestForm.manifestDate, through: manifestForm.through.trim() };
      const res = await fetch(apiUrl("/api/manifests"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.message || "Manifest create nahi ho paaya.");
        setCreatingManifest(false);
        return;
      }

      setOrders((prev) => prev.map((order) => payload.docIds.includes(order.id) ? { ...order, order_status: "in_transit", manifest_number: payload.manifestNumber, manifest_to_name: payload.toName, manifest_destination: payload.destination, manifest_date: payload.manifestDate, manifest_through: payload.through } : order));
      setSelectedOrderIds((prev) => prev.filter((id) => !payload.docIds.includes(id)));
      setManifestModalOpen(false);
      setEditingManifestOrders([]);
      setEditingManifestAddedOrderIds([]);
      setCreatingManifest(false);
    } catch {
      setCreatingManifest(false);
      alert("Manifest save nahi ho paaya.");
    }
  };

  const handleRemoveOrderFromManifest = (orderId) => {
    setEditingManifestOrders((prev) => prev.filter((order) => order.id !== orderId));
  };

  const handleAddOrderToManifest = (orderId) => {
    setEditingManifestAddedOrderIds((prev) => (prev.includes(orderId) ? prev : [...prev, orderId]));
  };

  const handleUndoAddedOrder = (orderId) => {
    setEditingManifestAddedOrderIds((prev) => prev.filter((id) => id !== orderId));
  };

  const openAddOrdersModal = () => {
    setAddOrdersModalOpen(true);
  };

  const closeAddOrdersModal = () => {
    setAddOrdersModalOpen(false);
  };

  const handleDeleteManifest = async (manifestNumber) => {
    const confirmed = window.confirm(`Manifest ${manifestNumber} delete karna hai?`);
    if (!confirmed) return;

    try {
      setBusyId(`manifest-delete-${manifestNumber}`);
      const res = await fetch(apiUrl(`/api/manifests/${manifestNumber}`), {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.message || "Manifest delete nahi ho paaya.");
        setBusyId("");
        return;
      }

      setOrders((prev) =>
        prev.map((order) =>
          String(order.manifest_number || "").trim() === manifestNumber
            ? {
                ...order,
                order_status: "processing",
                manifest_number: "",
                manifest_to_name: "",
                manifest_destination: "",
                manifest_date: null,
                manifest_through: "",
              }
            : order
        )
      );
      setBusyId("");
    } catch {
      setBusyId("");
      alert("Manifest delete nahi ho paaya.");
    }
  };
  return (
    <div className="po-wrap">
      <div className="po-card">
        <div className="po-tabs">
          {visibleTabs.map((tab) => {
            const count = Array.isArray(grouped[tab.key]) ? grouped[tab.key].length : 0;
            return <button key={tab.key} type="button" className={`po-tab ${activeTab === tab.key ? "is-active" : ""}`} onClick={() => setActiveTab(tab.key)}>{tab.label} ({count})</button>;
          })}
        </div>

        {canManageManifest && (
          <div className="po-toolbar">
            <div className="po-toolbarText">Selected: <b>{selectedOrders.length}</b></div>
            <button type="button" className="po-qrBtn" onClick={openCreateManifestModal} disabled={!selectedOrders.length}>Create Manifest</button>
          </div>
        )}

        {loading && <p className="po-state">Loading orders...</p>}
        {!loading && error && <p className="po-state po-state-error">{error}</p>}

        {!loading && !error && (
          <div className="po-tableWrap">
            <table className="po-table">
              <thead>
                <tr>
                  <th>{canManageManifest ? <input type="checkbox" checked={currentRows.length > 0 && currentRows.every((order) => selectedOrderIds.includes(order.id))} onChange={toggleSelectAllCurrent} /> : null}</th>
                  <th>Customer</th>
                  <th>Route</th>
                  <th>Payment</th>
                  <th>Order</th>
                  <th>Weight</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.length === 0 && <tr><td colSpan="7" className="po-empty">No orders found.</td></tr>}

                {!isManifestTab && currentRows.map((order) => {
                  const dateText = order.created_at ? new Date(order.created_at).toLocaleString() : "-";
                  const scanLocation = formatScanLocation(order);
                  const scanLocationLink = buildLocationLink(order);
                  const scanTime = order.last_scan_at ? new Date(order.last_scan_at).toLocaleString() : "";

                  return (
                    <tr key={order.id}>
                      <td><input type="checkbox" checked={selectedOrderIds.includes(order.id)} onChange={() => toggleOrderSelection(order.id)} disabled={!canManageManifest} /></td>
                      <td>
                        <div className="po-customer">{order.customer_name || "N/A"}</div>
                        <div className="po-small">{order.customer_phone || order.awb_no || "-"}</div>
                        <div className="po-rowInfo"><span className="po-status">{statusLabel(order.order_status)}</span><span className="po-small">{dateText}</span></div>
                        {scanLocation && <div className="po-small po-meta">Current: {scanLocation}</div>}
                        {order.last_scan_ip && <div className="po-small po-meta">IP: {order.last_scan_ip}</div>}
                        {scanTime && <div className="po-small po-meta">Last Scan: {scanTime}</div>}
                      </td>
                      <td><div>{order.origin || "-"}</div><div className="po-small">to</div><div>{order.destination || "-"}</div></td>
                      <td><div className="po-pay">{order.payment_label || "Prepaid"}</div><div className="po-small">{order.payment_mode || "Prepaid"}</div><div className="po-small">{order.service_type || "B2C"}</div></td>
                      <td><div className="po-orderRef">{order.order_reference || "-"}</div><div className="po-small">{order.order_category || "-"}</div></td>
                      <td><div>{order.weight_summary || "-"}</div><div className="po-small">Vol: {order.box_count || "-"} | Wt: {order.total_weight || "-"} Kg</div></td>
                      <td>
                        {String(order.order_status || "").toLowerCase() === "in_transit" ? (
                          <div className="po-actionInfo">
                            {scanLocation ? <><div className="po-small">Last Location</div><div className="po-actionText">{scanLocation}</div><a className="po-locationLink" href={scanLocationLink} target="_blank" rel="noreferrer">Open Location</a></> : order.last_scan_ip ? <><div className="po-small">Last Scan IP</div><div className="po-actionText">{order.last_scan_ip}</div></> : <span className="po-small">Location pending</span>}
                            {isEmployeeUser && <button type="button" className="po-qrBtn" onClick={() => handleGenerateQr(order)} disabled={busyId === `order-${order.id}`}>{busyId === `order-${order.id}` ? "Preparing..." : "Re-download QR PDF"}</button>}
                          </div>
                        ) : isEmployeeUser ? (
                          <button type="button" className="po-qrBtn" onClick={() => handleGenerateQr(order)} disabled={busyId === `order-${order.id}`}>{busyId === `order-${order.id}` ? "Preparing..." : "Generate QR Code"}</button>
                        ) : <span className="po-small">-</span>}
                      </td>
                    </tr>
                  );
                })}

                {isManifestTab && currentRows.map((manifest) => (
                  <tr key={manifest.manifestNumber}>
                    <td />
                    <td><div className="po-customer">Manifest #{manifest.manifestNumber}</div><div className="po-small">{manifest.totalOrders} orders</div><div className="po-rowInfo"><span className="po-status">Manifest</span><span className="po-small">{new Date(manifest.manifestDate).toLocaleDateString()}</span></div></td>
                    <td><div>{manifest.destination || "-"}</div><div className="po-small">through</div><div>{manifest.through || "-"}</div></td>
                    <td><div className="po-pay">{manifest.toName || "NA"}</div><div className="po-small">Manifest To</div></td>
                    <td><div className="po-orderRef">#{manifest.manifestNumber}</div><div className="po-small">{manifest.orders.slice(0, 3).map((order) => order.awb_no).join(", ")}{manifest.orders.length > 3 ? "..." : ""}</div></td>
                    <td><div>{manifest.totalBoxes} Box</div><div className="po-small">Wt: {manifest.totalWeight} Kg</div></td>
                    <td><div className="po-actionInfo"><button type="button" className="po-qrBtn" onClick={() => handleDownloadManifest(manifest)} disabled={busyId === `manifest-${manifest.manifestNumber}`}>{busyId === `manifest-${manifest.manifestNumber}` ? "Preparing..." : "Download Manifest"}</button><button type="button" className="po-ghostBtn" onClick={() => openEditManifestModal(manifest)}>Edit Manifest</button><button type="button" className="po-removeBtn" onClick={() => handleDeleteManifest(manifest.manifestNumber)} disabled={busyId === `manifest-delete-${manifest.manifestNumber}`}>{busyId === `manifest-delete-${manifest.manifestNumber}` ? "Deleting..." : "Delete Manifest"}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {manifestModalOpen && (
        <div className="po-modal">
          <div className="po-modalCard po-manifestCard">
            <h3>{editingManifestNumber ? "Edit Manifest" : "Create Manifest"}</h3>
            <div className="po-manifestGrid">
              <label className="po-field"><span>To</span><input name="toName" value={manifestForm.toName} onChange={handleManifestFormChange} /></label>
              <label className="po-field"><span>Destination</span><input name="destination" value={manifestForm.destination} onChange={handleManifestFormChange} /></label>
              <label className="po-field"><span>Current Date</span><input type="date" name="manifestDate" value={manifestForm.manifestDate} onChange={handleManifestFormChange} /></label>
              <label className="po-field"><span>Through</span><input name="through" value={manifestForm.through} onChange={handleManifestFormChange} /></label>
              <label className="po-field"><span>Manifest Number</span><input name="manifestNumber" value={manifestForm.manifestNumber} onChange={handleManifestFormChange} disabled={Boolean(editingManifestNumber)} /></label>
            </div>

            {!editingManifestNumber && (
              <div className="po-preview">
                {selectedOrders.map((order, index) => (
                  <div key={order.id} className="po-previewRow">
                    <span>{index + 1}</span>
                    <span>{order.destination || "-"}</span>
                    <span>{order.customer_name || "-"}</span>
                    <span>{order.order_category || "-"}</span>
                    <span>NA</span>
                    <span>{order.box_count || "-"}</span>
                    <span>{order.total_weight || "-"}</span>
                  </div>
                ))}
              </div>
            )}

            {editingManifestNumber && (
              <>
                <div className="po-sectionTitle">Current Manifest Orders</div>
                <div className="po-preview">
                  {editingManifestOrders.map((order, index) => (
                    <div key={order.id} className="po-previewRow">
                      <span>{index + 1}</span>
                      <span>{order.destination || "-"}</span>
                      <span>{order.customer_name || "-"}</span>
                      <span>{order.order_category || "-"}</span>
                      <span>{order.box_count || "-"}</span>
                      <span>{order.total_weight || "-"}</span>
                      <button
                        type="button"
                        className="po-removeBtn"
                        onClick={() => handleRemoveOrderFromManifest(order.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="po-sectionHeader">
                  <div className="po-sectionTitle">Add More DOCT From Processing Orders</div>
                  <button type="button" className="po-iconBtn" onClick={openAddOrdersModal}>+</button>
                </div>
                <div className="po-preview">
                  {editingManifestAddedOrderIds.map((orderId) => {
                    const order = grouped.all.find((item) => item.id === orderId);
                    if (!order) return null;
                    return (
                      <div key={`added-${order.id}`} className="po-previewRow">
                        <span>+</span>
                        <span>{order.destination || "-"}</span>
                        <span>{order.customer_name || "-"}</span>
                        <span>{order.order_category || "-"}</span>
                        <span>{order.box_count || "-"}</span>
                        <span>{order.total_weight || "-"}</span>
                        <button
                          type="button"
                          className="po-removeBtn"
                          onClick={() => handleUndoAddedOrder(order.id)}
                        >
                          Undo
                        </button>
                      </div>
                    );
                  })}
                  {editingManifestAddedOrderIds.length === 0 && (
                    <div className="po-emptyInline">Koi extra DOCT abhi select nahi kiya gaya.</div>
                  )}
                </div>
              </>
            )}

            <div className="po-modalActions">
              <button type="button" className="po-ghostBtn" onClick={closeManifestModal} disabled={creatingManifest}>Cancel</button>
              <button type="button" className="po-qrBtn" onClick={handleManifestSubmit} disabled={creatingManifest}>{creatingManifest ? "Saving..." : editingManifestNumber ? "Update Manifest" : "Create Manifest"}</button>
            </div>
          </div>
        </div>
      )}
      {addOrdersModalOpen && (
        <div className="po-modal">
          <div className="po-modalCard po-pickerCard">
            <div className="po-sectionHeader">
              <h3>Add DOCT To Manifest</h3>
              <button type="button" className="po-iconBtn" onClick={closeAddOrdersModal}>x</button>
            </div>
            <div className="po-preview">
              {addableOrders.length === 0 && <div className="po-emptyInline">Processing orders available nahi hain.</div>}
              {addableOrders.map((order) => (
                <div key={`available-${order.id}`} className="po-previewRow">
                  <span>{order.id}</span>
                  <span>{order.destination || "-"}</span>
                  <span>{order.customer_name || "-"}</span>
                  <span>{order.order_category || "-"}</span>
                  <span>{order.box_count || "-"}</span>
                  <span>{order.total_weight || "-"}</span>
                  <button
                    type="button"
                    className="po-addBtn"
                    onClick={() => handleAddOrderToManifest(order.id)}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
