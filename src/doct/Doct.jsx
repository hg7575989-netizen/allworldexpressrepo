import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./Doct.css";
import { apiUrl } from "../config/api";

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 5v14M5 12h14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

const staticConsignorOptions = [
  "All World Exports (LKO)",
  "Sai Distributros (LKO)",
  "Axis Aglo PVT LTD (LKO)",
  "M-Power (LKO)",
];

const originOptions = ["Lucknow", "Barabanki", "Mirjapur"];

const staticConsignorContentMap = {
  "Sai Distributros (LKO)": "Hand Set",
  "M-Power (LKO)": "Accessories",
  "Axis Aglo PVT LTD (LKO)": "Medicine",
};

const initialFormState = {
  airwayBill: "",
  date: "",
  origin: "",
  destination: "",
  consignor: "",
  consignee: "",
  contentDescription: "",
  noOfBox: "",
  totalWeight: "",
};

function readAuthUser() {
  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function DoctForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editDocId = searchParams.get("docId");
  const adminEmployeeIdFromQuery = searchParams.get("employeeId");
  const adminCompanyIdFromQuery = searchParams.get("companyId");
  const adminGeneratedByFromQuery = searchParams.get("generatedBy");
  const isAdminEdit = searchParams.get("admin") === "1";
  const getToday = () => new Date().toISOString().split("T")[0];

  const [form, setForm] = useState(initialFormState);
  const [useCurrentDate, setUseCurrentDate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingAwb, setGeneratingAwb] = useState(false);
  const [awbError, setAwbError] = useState("");
  const [existingPdfLink, setExistingPdfLink] = useState("");
  const [loadedDocAwb, setLoadedDocAwb] = useState("");
  const [dynamicConsignorOptions, setDynamicConsignorOptions] = useState([]);
  const [dynamicConsignorContentMap, setDynamicConsignorContentMap] = useState({});

  const [invoices, setInvoices] = useState([""]);
  const [prices, setPrices] = useState([""]);
  const authUser = useMemo(() => readAuthUser(), []);
  const isCompanyUser = authUser?.accountType === "company";

  const resolveDocActor = useCallback((authUser) => {
    if (!authUser) {
      return { employeeId: "", companyId: "", accountType: "" };
    }

    if (authUser.accountType === "admin" && isAdminEdit) {
      const employeeId = String(adminEmployeeIdFromQuery || "").trim();
      if (employeeId) {
        return { employeeId, companyId: "", accountType: "employee" };
      }
      const companyId = String(adminCompanyIdFromQuery || "").trim();
      if (companyId) {
        return { employeeId: "", companyId, accountType: "company" };
      }
      if (String(adminGeneratedByFromQuery || "").trim().toLowerCase() === "admin") {
        return { employeeId: "", companyId: "", accountType: "admin" };
      }
      return { employeeId: "", companyId: "", accountType: "admin" };
    }

    if (authUser.accountType === "admin") {
      return {
        employeeId: "",
        companyId: "",
        accountType: "admin",
      };
    }

    if (authUser.accountType === "company") {
      return {
        employeeId: "",
        companyId: String(authUser.dbId || authUser.id || "").trim(),
        accountType: "company",
      };
    }

    return {
      employeeId: String(authUser.dbId || authUser.id || "").trim(),
      companyId: "",
      accountType: "employee",
    };
  }, [adminCompanyIdFromQuery, adminEmployeeIdFromQuery, adminGeneratedByFromQuery, isAdminEdit]);

  const consignorOptions = useMemo(() => {
    if (isCompanyUser) {
      const selfCompanyName = String(authUser?.name || "").trim();
      return selfCompanyName ? [selfCompanyName] : [];
    }

    const out = [...staticConsignorOptions];
    const seen = new Set(staticConsignorOptions.map((item) => String(item).trim().toLowerCase()));
    for (const item of dynamicConsignorOptions) {
      const cleanItem = String(item || "").trim();
      if (!cleanItem) continue;
      const key = cleanItem.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(cleanItem);
    }
    return out;
  }, [isCompanyUser, authUser?.name, dynamicConsignorOptions]);

  const consignorContentMap = useMemo(
    () => ({ ...staticConsignorContentMap, ...dynamicConsignorContentMap }),
    [dynamicConsignorContentMap]
  );

  useEffect(() => {
    const loadConsignorCompanies = async () => {
      if (authUser?.accountType === "company") {
        return;
      }
      try {
        const res = await fetch(apiUrl("/api/companies/consignors"));
        const data = await res.json();
        if (!res.ok || !Array.isArray(data?.companies)) return;

        const options = [];
        const dynamicMap = {};
        const seen = new Set();

        for (const row of data.companies) {
          const companyName = String(row?.company_name || "").trim();
          if (!companyName) continue;

          const normalizedName = companyName.toLowerCase();
          if (seen.has(normalizedName)) continue;
          seen.add(normalizedName);
          options.push(companyName);

          const businessType = String(row?.business_type || "").trim();
          if (businessType) {
            dynamicMap[companyName] = businessType;
          }
        }

        setDynamicConsignorOptions(options);
        setDynamicConsignorContentMap(dynamicMap);
      } catch {
        // Keep static consignor options if dynamic list cannot be loaded.
      }
    };

    loadConsignorCompanies();
  }, [authUser?.accountType]);

  useEffect(() => {
    const selfCompanyName = String(authUser?.name || "").trim();
    if (!isCompanyUser || !selfCompanyName) return;

    setForm((prev) => {
      if (String(prev.consignor || "").trim() === selfCompanyName) return prev;
      return {
        ...prev,
        consignor: selfCompanyName,
        airwayBill: editDocId ? prev.airwayBill : "",
        contentDescription: consignorContentMap[selfCompanyName] || prev.contentDescription,
      };
    });
  }, [isCompanyUser, authUser?.name, consignorContentMap, editDocId]);

  useEffect(() => {
    const loadDocForEdit = async () => {
      if (!editDocId) return;

      const authUser = readAuthUser();
      if (!authUser?.id && !authUser?.dbId) return;
      const actor = resolveDocActor(authUser);
      if (!actor.employeeId && !actor.companyId) return;

      try {
        const docId = encodeURIComponent(editDocId);
        const query = actor.employeeId
          ? `employeeId=${encodeURIComponent(actor.employeeId)}`
          : actor.companyId
            ? `companyId=${encodeURIComponent(actor.companyId)}`
            : "accountType=admin";
        const res = await fetch(apiUrl(`/api/docs/${docId}?${query}`));
        const data = await res.json();
        if (!res.ok || !data?.doc) {
          if (res.status === 404) {
            navigate("/doct", { replace: true });
          }
          return;
        }
        setExistingPdfLink(String(data.doc.pdf_link || ""));
        setLoadedDocAwb(String(data.doc.awb_no || ""));

        const snap = data.doc.form_data || {};
        if (snap.form && typeof snap.form === "object") {
          setForm((prev) => ({
            ...prev,
            ...snap.form,
            airwayBill: String(snap.form.airwayBill || data.doc.awb_no || prev.airwayBill || ""),
          }));
        } else {
          setForm((prev) => ({
            ...prev,
            airwayBill: data.doc.awb_no || prev.airwayBill,
          }));
        }

        if (Array.isArray(snap.invoices) && snap.invoices.length) {
          setInvoices(snap.invoices);
        }
        if (Array.isArray(snap.prices) && snap.prices.length) {
          setPrices(snap.prices);
        }
      } catch {
        // Ignore edit preload errors and keep manual mode available.
      }
    };

    loadDocForEdit();
  }, [editDocId, navigate, resolveDocActor]);

  const invoiceLines = useMemo(
    () => invoices.filter(Boolean).map((v, i) => `INV-${i + 1}: ${v}`),
    [invoices]
  );

  const priceLines = useMemo(
    () => prices.filter(Boolean).map((v, i) => `PRICE-${i + 1}: ${v}`),
    [prices]
  );

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === "consignor") {
      setForm((p) => ({
        ...p,
        consignor: value,
        airwayBill: editDocId ? p.airwayBill : "",
        contentDescription: consignorContentMap[value] || "",
      }));
      setAwbError("");
      return;
    }
    setForm((p) => ({ ...p, [name]: value }));
  };

  const onUseCurrentDateChange = (e) => {
    const checked = e.target.checked;
    setUseCurrentDate(checked);
    if (checked) {
      setForm((p) => ({ ...p, date: getToday() }));
    }
  };

  const addInvoice = () => setInvoices((p) => [...p, ""]);
  const addPrice = () => setPrices((p) => [...p, ""]);

  const updateArray = (setter, idx, value) => {
    setter((prev) => prev.map((x, i) => (i === idx ? value : x)));
  };

  const removeItem = (setter, idx) => {
    setter((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const requestNextAwb = async (consignorName) => {
    const selectedConsignor = String(consignorName || form.consignor || "").trim();
    if (!selectedConsignor) return null;

    const actor = resolveDocActor(authUser);
    setGeneratingAwb(true);
    setAwbError("");
    try {
      const payload = {
        formType: "Doct",
        consignor: selectedConsignor,
      };
      if (actor.employeeId) {
        payload.employeeId = actor.employeeId;
      }
      if (actor.companyId) {
        payload.companyId = actor.companyId;
      }
      if (actor.accountType) {
        payload.accountType = actor.accountType;
      }
      const res = await fetch(apiUrl("/api/docs/next-awb"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const awbNo = data?.awb?.awbNo ? String(data.awb.awbNo) : "";
      if (!res.ok || !awbNo) {
        setAwbError(data?.message || "Airway Bill Number generate nahi ho paaya.");
        return null;
      }
      setForm((prev) => {
        if (String(prev.consignor || "").trim() !== selectedConsignor) return prev;
        return { ...prev, airwayBill: awbNo };
      });
      return awbNo;
    } catch {
      setAwbError("Airway Bill Number generate nahi ho paaya. Backend check karein.");
      return null;
    } finally {
      setGeneratingAwb(false);
    }
  };

  const validateRequiredFields = (airwayBillOverride = "") => {
    const awbToValidate = String(airwayBillOverride || form.airwayBill || "").trim();
    if (!awbToValidate) {
      alert("Airway Bill Number generate nahi hua. Please try again.");
      return false;
    }

    const requiredFields = [
      ["date", "Date"],
      ["origin", "Origin"],
      ["destination", "Destination"],
      ["consignor", "Consignor"],
      ["consignee", "Consignee"],
      ["contentDescription", "Content Description"],
      ["noOfBox", "No. of Box (PCS)"],
      ["totalWeight", "Total Weight"],
    ];

    const missing = requiredFields
      .filter(([key]) => !String(form[key] || "").trim())
      .map(([, label]) => label);

    if (!invoices.every((v) => String(v || "").trim())) {
      missing.push("Invoice Number(s)");
    }

    if (!prices.every((v) => String(v || "").trim())) {
      missing.push("Price(s)");
    }

    if (missing.length) {
      alert(`Please fill all required fields:\n- ${missing.join("\n- ")}`);
      return false;
    }

    return true;
  };

  // ✅ PDF generator
  // PDF generator
  const generatePDF = async () => {
    if (saving) return;
    if (generatingAwb) {
      alert("Please wait, airway bill number is being generated.");
      return;
    }

    let awbNo = String(form.airwayBill || "").trim();
    if (!awbNo && !editDocId) {
      awbNo = (await requestNextAwb(form.consignor)) || "";
      if (!awbNo) {
        alert("Airway Bill Number generate nahi ho paaya. Backend/API check karein.");
        return;
      }
    }
    if (!awbNo && editDocId) {
      awbNo = String(loadedDocAwb || "").trim();
      if (awbNo) {
        setForm((prev) => ({ ...prev, airwayBill: awbNo }));
      }
    }

    if (!validateRequiredFields(awbNo)) return;

    if (!authUser?.id && !authUser?.dbId) {
      alert("Please login first to generate and save DOCT.");
      return;
    }
    const actor = resolveDocActor(authUser);
    const editingEmployeeId = actor.employeeId;
    const editingCompanyId = actor.companyId;
    const editingAccountType = actor.accountType;

    const templateUrl = "/sdf.jpg";
    const imgBytes = await fetch(templateUrl).then((r) => r.arrayBuffer());

    const pdfDoc = await PDFDocument.create();
    const jpgImage = await pdfDoc.embedJpg(imgBytes);

    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;
    const halfSheetHeight = A4_HEIGHT / 2;

    const { width: imgWidth, height: imgHeight } = jpgImage.scale(1);
    const padding = 2;
    const availableWidth = A4_WIDTH - padding * 2;
    const availableHeight = halfSheetHeight - padding * 2;
    const imageScale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
    const placedWidth = imgWidth * imageScale;
    const placedHeight = imgHeight * imageScale;
    const imageX = (A4_WIDTH - placedWidth) / 2;

    const copiesPerPage = 2;
    const totalCopies = 2;
    const totalPages = Math.ceil(totalCopies / copiesPerPage);
    const copyTags = [
      { text: "Duplicate Transporter ", x: 632, y: 460, size: 13 },
      { text: "Duplicate Receiver ", x: 632, y: 460, size: 14 },
    ];

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
      const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

      for (let slotIndex = 0; slotIndex < copiesPerPage; slotIndex += 1) {
        const copyIndex = pageIndex * copiesPerPage + slotIndex;
        if (copyIndex >= totalCopies) break;

        const sectionBottomY = slotIndex === 0 ? halfSheetHeight : 0;
        const imageY = sectionBottomY + (halfSheetHeight - placedHeight) / 2;

        page.drawImage(jpgImage, {
          x: imageX,
          y: imageY,
          width: placedWidth,
          height: placedHeight,
        });

        const currentCopyTag = copyTags[copyIndex];
        if (currentCopyTag?.text) {
          page.drawText(currentCopyTag.text, {
            x: imageX + currentCopyTag.x * imageScale,
            y: imageY + currentCopyTag.y * imageScale,
            size: Math.max(8, (currentCopyTag.size || 16) * imageScale),
            font: fontBold,
            color: rgb(0.02, 0.2, 0.75),
          });
        }

        const draw = (text, x, y, size = 12, bold = false) => {
          if (!text) return;
          const mappedX = imageX + x * imageScale;
          const mappedY = imageY + y * imageScale;
          page.drawText(String(text), {
            x: mappedX,
            y: mappedY,
            size: Math.max(6, size * imageScale),
            font: bold ? fontBold : font,
            color: rgb(0.02, 0.2, 0.75),
          });
        };

        draw(awbNo || form.airwayBill, 635, 510, 15, true);
        draw(form.date, 365, 510, 15, true);
        draw(form.origin, 500, 510, 15, true);
        draw(form.destination, 490, 458, 15, true);

        draw(form.consignor, 70, 420, 20, true);
        draw(form.consignee, 370, 420, 20);

        draw(form.contentDescription, 70, 250, 20, true);
        draw(form.noOfBox, 205, 250, 15, true);
        draw(form.totalWeight, 290, 250, 15, true);

        const invoiceX = 575;
        const priceX = 675;
        const maxCharsPerLine = 500;
        const invoiceStartY = 295;
        const priceStartY = 295;

        const wrappedInvoiceLines = invoiceLines
          .flatMap((line) => chunkText(line, maxCharsPerLine))
          .slice(0, 10);
        wrappedInvoiceLines.forEach((line, i) => {
          draw(line, invoiceX, invoiceStartY - i * 16, 11);
        });

        const wrappedPriceLines = priceLines
          .flatMap((line) => chunkText(line, maxCharsPerLine))
          .slice(0, 10);
        wrappedPriceLines.forEach((line, i) => {
          draw(line, priceX, priceStartY - i * 16, 11);
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const fileName = `DOCT-${awbNo || form.airwayBill || "document"}.pdf`;
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

    try {
      setSaving(true);
      const uploadForm = new FormData();
      uploadForm.append("file", blob, fileName);
      uploadForm.append("fileName", fileName);
      if (editDocId) {
        uploadForm.append("docId", String(editDocId));
      }
      if (editingEmployeeId) {
        uploadForm.append("employeeId", String(editingEmployeeId));
      }
      if (editDocId && existingPdfLink) {
        uploadForm.append("existingLink", existingPdfLink);
      }

      const uploadRes = await fetch(apiUrl("/api/drive/upload"), {
        method: "POST",
        body: uploadForm,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        alert(uploadData.message || "PDF generated, but Drive upload failed.");
        return;
      }

      const res = await fetch(apiUrl("/api/docs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: editDocId ? Number(editDocId) : undefined,
          employeeId: editingEmployeeId || undefined,
          companyId: editingCompanyId || undefined,
          accountType: editingAccountType || undefined,
          awbNo: awbNo || form.airwayBill,
          formType: "Doct",
          pdfLink: uploadData.link,
          formData: {
            form,
            invoices,
            prices,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "PDF generated and uploaded, but failed to save DB record.");
        return;
      }

      if (data?.doc?.pdf_link) {
        setExistingPdfLink(String(data.doc.pdf_link));
      } else if (uploadData?.link) {
        setExistingPdfLink(String(uploadData.link));
      }

      setForm(initialFormState);
      setInvoices([""]);
      setPrices([""]);
      setUseCurrentDate(false);
      setAwbError("");
      setExistingPdfLink("");
      alert("PDF generated, uploaded to Drive, and DOCT record saved.");
    } catch {
      alert("PDF generated, but server is unreachable for saving record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="doctWrap">
      <div className="doctCard">
        <div className="doctHead">
          <div className="doctHeadInfo">
            <h2>DOCT Form</h2>
            <p>Fill details → Generate PDF (template ke boxes me print hoga)</p>
          </div>
          <Field
            label="Airway Bill Number"
            name="airwayBill"
            value={form.airwayBill}
            onChange={onChange}
            readOnly
            required
            className="airwayHeadField"
          />
          <button
            className="btnPrimary"
            onClick={generatePDF}
            disabled={saving || generatingAwb}
          >
            {saving ? "Saving..." : generatingAwb ? "Generating AWB..." : "Generate PDF"}
          </button>
        </div>
        <p style={{ marginTop: 8, marginBottom: 0, fontSize: 13, color: awbError ? "#c62828" : "#475467" }}>
          {awbError
            ? awbError
            : generatingAwb
              ? "Airway Bill Number auto-generate ho raha hai..."
              : form.airwayBill
                ? "Airway Bill Number auto-generated hai, editable nahi hai."
                : "Generate PDF par Airway Bill Number auto-generate hoga."}
        </p>

        <div className="grid">
          <label className="field">
            <span>Date</span>
            <input
              className="input"
              type="date"
              name="date"
              value={form.date}
              onChange={onChange}
              disabled={useCurrentDate}
              required
            />
            <label className="useCurrentDate">
              <input type="checkbox" checked={useCurrentDate} onChange={onUseCurrentDateChange} />
              Use current date
            </label>
          </label>
          <Field
            label="Origin"
            name="origin"
            value={form.origin}
            onChange={onChange}
            options={originOptions}
            placeholder="Select origin"
            required
          />
          <Field label="Destination" name="destination" value={form.destination} onChange={onChange} required />

          <Field
            label="Consignor"
            name="consignor"
            value={form.consignor}
            onChange={onChange}
            options={consignorOptions}
            placeholder="Select consignor"
            readOnly={isCompanyUser}
            required
          />
          <Field
            label="Content Description"
            name="contentDescription"
            value={form.contentDescription}
            onChange={onChange}
            required
          />
          <Field label="Consignee" name="consignee" value={form.consignee} onChange={onChange} multiline rows={3} required />
          <Field label="No. of Box (PCS)" name="noOfBox" value={form.noOfBox} onChange={onChange} highlight required />
          <Field label="Total Weight" name="totalWeight" value={form.totalWeight} onChange={onChange} highlight required />
        </div>

        <div className="twoCols">
          {/* Invoice list */}
          <div className="box">
            <div className="boxHead">
              <h3>Invoice Number(s)</h3>
              <button className="iconBtn" onClick={addInvoice} type="button" title="Add invoice">
                <PlusIcon /> Add
              </button>
            </div>

            {invoices.map((val, idx) => (
              <div className="row" key={`inv-${idx}`}>
                <input
                  className="input"
                  placeholder={`Invoice #${idx + 1}`}
                  value={val}
                  onChange={(e) => updateArray(setInvoices, idx, e.target.value)}
                  required
                />
                <button className="miniBtn" onClick={() => removeItem(setInvoices, idx)} type="button">
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Price list */}
          <div className="box">
            <div className="boxHead">
              <h3>Price(s)</h3>
              <button className="iconBtn" onClick={addPrice} type="button" title="Add price">
                <PlusIcon /> Add
              </button>
            </div>

            {prices.map((val, idx) => (
              <div className="row" key={`price-${idx}`}>
                <input
                  className="input"
                  placeholder={`Price #${idx + 1}`}
                  value={val}
                  onChange={(e) => updateArray(setPrices, idx, e.target.value)}
                  required
                />
                <button className="miniBtn" onClick={() => removeItem(setPrices, idx)} type="button">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  multiline = false,
  rows = 3,
  options,
  placeholder = "Select option",
  required = false,
  highlight = false,
  className = "",
  readOnly = false,
}) {
  return (
    <label className={`field${highlight ? " fieldHighlight" : ""}${className ? ` ${className}` : ""}`}>
      <span>{label}</span>
      {options?.length ? (
        <select className="input" name={name} value={value} onChange={onChange} required={required} disabled={readOnly}>
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          className="input textareaInput"
          name={name}
          value={value}
          onChange={onChange}
          rows={rows}
          required={required}
          readOnly={readOnly}
        />
      ) : (
        <input
          className="input"
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          readOnly={readOnly}
        />
      )}
    </label>
  );
}

// simple chunk wrap
function chunkText(text, n) {
  if (!text) return [];
  const out = [];
  let i = 0;
  while (i < text.length) {
    out.push(text.slice(i, i + n));
    i += n;
  }
  return out;
}
