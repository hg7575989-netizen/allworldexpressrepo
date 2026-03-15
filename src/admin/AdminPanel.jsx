import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../config/api";
import "./AdminPanel.css";

function readAuthUser() {
  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function todayLocalDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function AdminPanel() {
  const user = useMemo(() => readAuthUser(), []);
  const adminKey = (import.meta.env.VITE_ADMIN_PANEL_KEY || "").trim();
  const adminHeaders = useMemo(
    () => (adminKey ? { "x-admin-key": adminKey } : {}),
    [adminKey]
  );

  const [activeTab, setActiveTab] = useState("accounts");
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState("");

  const [selectedDate, setSelectedDate] = useState(todayLocalDate());
  const [dailyDocs, setDailyDocs] = useState([]);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [dailyError, setDailyError] = useState("");

  const loadOverview = useCallback(async () => {
    try {
      setOverviewError("");
      setLoadingOverview(true);
      const res = await fetch(apiUrl("/api/admin/overview"), { headers: adminHeaders });
      const data = await res.json();
      if (!res.ok) {
        setOverviewError(data.message || "Failed to load admin overview");
        return;
      }
      setEmployees(Array.isArray(data.employees) ? data.employees : []);
      setCompanies(Array.isArray(data.companies) ? data.companies : []);
    } catch {
      setOverviewError("Server error while loading admin overview");
    } finally {
      setLoadingOverview(false);
    }
  }, [adminHeaders]);

  const loadDailyDocs = useCallback(async (date) => {
    try {
      setDailyError("");
      setLoadingDaily(true);
      const qDate = encodeURIComponent(date || todayLocalDate());
      const res = await fetch(apiUrl(`/api/admin/docs/daily?date=${qDate}`), {
        headers: adminHeaders,
      });
      const data = await res.json();
      if (!res.ok) {
        setDailyError(data.message || "Failed to load daily documents");
        return;
      }
      setDailyDocs(Array.isArray(data.docs) ? data.docs : []);
      setDailyTotal(Number(data.total || 0));
    } catch {
      setDailyError("Server error while loading daily documents");
    } finally {
      setLoadingDaily(false);
    }
  }, [adminHeaders]);

  useEffect(() => {
    loadOverview();
    loadDailyDocs(selectedDate);
  }, [loadDailyDocs, loadOverview, selectedDate]);

  const toggleStatus = async (entityType, id, currentBlocked) => {
    try {
      const res = await fetch(apiUrl(`/api/admin/${entityType}/${encodeURIComponent(id)}/block`), {
        method: "PATCH",
        headers: {
          ...adminHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ blocked: !currentBlocked }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Failed to update status");
        return;
      }
      await loadOverview();
    } catch {
      alert("Server error while updating status");
    }
  };

  const onDateSearch = (e) => {
    e.preventDefault();
    loadDailyDocs(selectedDate);
  };

  if (user?.accountType !== "admin") {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <p className="admin-state admin-state-error">Only admin can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-card">
        <div className="admin-header">
          <h2>Admin Control Panel</h2>
          <p>
            Logged in as <b>{user?.name || "Admin"}</b> ({user?.email || "-"})
          </p>
          <div className="admin-header-actions">
            <Link className="admin-generate-link" to="/doct?admin=1&generatedBy=admin">
              Generate Doct As Admin
            </Link>
          </div>
        </div>

        <div className="admin-tabs">
          <button
            type="button"
            className={activeTab === "accounts" ? "is-active" : ""}
            onClick={() => setActiveTab("accounts")}
          >
            Employees & Companies
          </button>
          <button
            type="button"
            className={activeTab === "daily" ? "is-active" : ""}
            onClick={() => setActiveTab("daily")}
          >
            Daily Doct Tracker
          </button>
        </div>

        {activeTab === "accounts" && (
          <div className="admin-section">
            {loadingOverview && <p className="admin-state">Loading overview...</p>}
            {!loadingOverview && overviewError && (
              <p className="admin-state admin-state-error">{overviewError}</p>
            )}

            {!loadingOverview && !overviewError && (
              <>
                <h3>Employees ({employees.length})</h3>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Contact</th>
                        <th>Profile Docs</th>
                        <th>Generated Docs</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => (
                        <tr key={emp.id}>
                          <td>
                            <div>{emp.name || "-"}</div>
                            <div className="subtxt">DB: {emp.id} | ID: {emp.employee_id || "-"}</div>
                            <div className="subtxt">Role: {emp.role || "-"}</div>
                            <div className="subtxt">Join: {emp.date_of_joining || "-"}</div>
                            <div className="subtxt">Address: {emp.address || "-"}</div>
                          </td>
                          <td>
                            <div>{emp.email || "-"}</div>
                            <div className="subtxt">{emp.number || "-"}</div>
                            <div className="subtxt">Last Login: {emp.login_time || "-"}</div>
                          </td>
                          <td>
                            <DocLink href={emp.profile_pdf_link} label="Profile PDF" />
                            <DocLink href={emp.pan_card_link} label="PAN" />
                            <DocLink href={emp.bank_passbook_link} label="Passbook" />
                            <DocLink href={emp.aadhaar_link} label="Aadhaar" />
                            <DocLink href={emp.photo_link} label="Photo" />
                          </td>
                          <td>
                            {Array.isArray(emp.docs) && emp.docs.length > 0 ? (
                              <ul className="admin-mini-list">
                                {emp.docs.map((doc) => (
                                  <li key={doc.id}>
                                    {doc.awb_no || "-"} |{" "}
                                    <a href={doc.pdf_link || "#"} target="_blank" rel="noreferrer">
                                      PDF
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>
                            <span className={`status-pill ${emp.is_blocked ? "is-blocked" : "is-active"}`}>
                              {emp.is_blocked ? "Blocked" : "Active"}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`admin-action ${emp.is_blocked ? "is-unblock" : "is-block"}`}
                              onClick={() => toggleStatus("employee", emp.id, Boolean(emp.is_blocked))}
                            >
                              {emp.is_blocked ? "Unblock" : "Block"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h3>Companies ({companies.length})</h3>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Contact</th>
                        <th>Documents</th>
                        <th>Doct Records</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map((company) => (
                        <tr key={company.id}>
                          <td>
                            <div>{company.company_name || "-"}</div>
                            <div className="subtxt">DB: {company.id} | ID: {company.company_unique_id || "-"}</div>
                            <div className="subtxt">Trade: {company.trade_name || "-"}</div>
                            <div className="subtxt">Type: {company.business_type || "-"}</div>
                            <div className="subtxt">GST: {company.gst_number || "-"}</div>
                            <div className="subtxt">PAN: {company.pan_number || "-"}</div>
                            <div className="subtxt">CIN: {company.cin_number || "-"}</div>
                            <div className="subtxt">Reg Addr: {company.registered_address || "-"}</div>
                            <div className="subtxt">Op Addr: {company.operational_address || "-"}</div>
                          </td>
                          <td>
                            <div>{company.contact_full_name || "-"}</div>
                            <div className="subtxt">{company.mobile_number || "-"}</div>
                            <div className="subtxt">{company.email || "-"}</div>
                          </td>
                          <td>
                            <DocLink href={company.profile_pdf_link} label="Profile PDF" />
                            <DocLink href={company.pan_card_link} label="PAN Card" />
                          </td>
                          <td>
                            {Array.isArray(company.docs) && company.docs.length > 0 ? (
                              <ul className="admin-mini-list">
                                {company.docs.map((doc) => (
                                  <li key={`${company.id}-${doc.id}`}>
                                    {doc.awb_no || "-"} |{" "}
                                    <a href={doc.pdf_link || "#"} target="_blank" rel="noreferrer">
                                      PDF
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>
                            <span className={`status-pill ${company.is_blocked ? "is-blocked" : "is-active"}`}>
                              {company.is_blocked ? "Blocked" : "Active"}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`admin-action ${company.is_blocked ? "is-unblock" : "is-block"}`}
                              onClick={() => toggleStatus("company", company.id, Boolean(company.is_blocked))}
                            >
                              {company.is_blocked ? "Unblock" : "Block"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "daily" && (
          <div className="admin-section">
            <form className="daily-filter" onSubmit={onDateSearch}>
              <label>
                Date
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </label>
              <button type="submit">Load</button>
              <div className="daily-total">Total Doct: {dailyTotal}</div>
            </form>

            {loadingDaily && <p className="admin-state">Loading daily docs...</p>}
            {!loadingDaily && dailyError && <p className="admin-state admin-state-error">{dailyError}</p>}

            {!loadingDaily && !dailyError && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>AWB Number</th>
                      <th>Generated By</th>
                      <th>Created At</th>
                      <th>PDF</th>
                      <th>Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyDocs.length === 0 && (
                      <tr>
                        <td colSpan="5">No doct records found for selected date.</td>
                      </tr>
                    )}
                    {dailyDocs.map((doc) => (
                      <tr key={doc.id}>
                        <td>{doc.awb_no || "-"}</td>
                        <td>
                          {doc.generated_by_name || "-"}
                          <div className="subtxt">{doc.generated_by_employee_id || "-"}</div>
                        </td>
                        <td>{doc.created_at ? new Date(doc.created_at).toLocaleString() : "-"}</td>
                        <td>
                          {doc.pdf_link ? (
                            <a href={doc.pdf_link} target="_blank" rel="noreferrer">
                              Open PDF
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          <a href={doc.edit_url || "#"}>Edit</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DocLink({ href, label }) {
  if (!href) return <div className="subtxt">- {label}: N/A</div>;
  return (
    <div className="subtxt">
      -{" "}
      <a href={href} target="_blank" rel="noreferrer">
        {label}
      </a>
    </div>
  );
}
