import React, { useEffect, useMemo, useState } from "react";
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

function buildShipmentsCount(employees, companies) {
  const seen = new Set();

  for (const emp of employees) {
    const docs = Array.isArray(emp?.docs) ? emp.docs : [];
    for (const doc of docs) {
      const id = doc?.id;
      if (id !== undefined && id !== null) seen.add(`doc-${id}`);
    }
  }

  for (const company of companies) {
    const docs = Array.isArray(company?.docs) ? company.docs : [];
    for (const doc of docs) {
      const id = doc?.id;
      if (id !== undefined && id !== null) seen.add(`doc-${id}`);
    }
  }

  return seen.size;
}

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
}

function DetailsLine({ label, value }) {
  return (
    <div className="detail-line">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function DocLink({ href, label }) {
  if (!href) return <span className="doc-missing">{label}: N/A</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="doc-link">
      {label}
    </a>
  );
}

export default function AdminDashboard() {
  const user = useMemo(() => readAuthUser(), []);
  const adminKey = (import.meta.env.VITE_ADMIN_PANEL_KEY || "").trim();
  const adminHeaders = useMemo(() => (adminKey ? { "x-admin-key": adminKey } : {}), [adminKey]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [todayShipments, setTodayShipments] = useState(0);
  const [activeModal, setActiveModal] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [actionState, setActionState] = useState({ key: "", loading: false });

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const date = encodeURIComponent(todayLocalDate());

      const [overviewRes, dailyRes] = await Promise.all([
        fetch(apiUrl("/api/admin/overview"), { headers: adminHeaders }),
        fetch(apiUrl(`/api/admin/docs/daily?date=${date}`), { headers: adminHeaders }),
      ]);

      const [overviewData, dailyData] = await Promise.all([overviewRes.json(), dailyRes.json()]);

      if (!overviewRes.ok) {
        setError(overviewData.message || "Failed to load admin dashboard");
        return;
      }
      if (!dailyRes.ok) {
        setError(dailyData.message || "Failed to load daily shipment stats");
        return;
      }

      setEmployees(Array.isArray(overviewData.employees) ? overviewData.employees : []);
      setCompanies(Array.isArray(overviewData.companies) ? overviewData.companies : []);
      setTodayShipments(Number(dailyData.total || 0));
    } catch {
      setError("Server error while loading admin dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const totalShipments = useMemo(() => buildShipmentsCount(employees, companies), [employees, companies]);
  const totalBlockedEmployees = useMemo(
    () => employees.filter((item) => Number(item.is_blocked) === 1 || item.is_blocked === true).length,
    [employees]
  );
  const totalBlockedCompanies = useMemo(
    () => companies.filter((item) => Number(item.is_blocked) === 1 || item.is_blocked === true).length,
    [companies]
  );

  const filteredEmployees = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) => {
      const haystack = `${emp.name || ""} ${emp.email || ""} ${emp.employee_id || ""} ${emp.number || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [employees, searchText]);

  const filteredCompanies = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((company) => {
      const haystack = `${company.company_name || ""} ${company.company_unique_id || ""} ${company.email || ""} ${company.mobile_number || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [companies, searchText]);

  const toggleStatus = async (entityType, id, currentBlocked) => {
    const actionKey = `${entityType}-${id}`;
    try {
      setActionState({ key: actionKey, loading: true });
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
      await loadDashboard();
    } catch {
      alert("Server error while updating status");
    } finally {
      setActionState({ key: "", loading: false });
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSearchText("");
  };

  if (user?.accountType !== "admin") {
    return (
      <div className="admin-page">
        <div className="admin-shell">
          <p className="admin-state admin-state-error">Only admin can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <div className="admin-header">
          <div>
            <h2>Operations Dashboard</h2>
            <p>
              {user?.name || "Admin"} ({user?.email || "-"})
            </p>
          </div>
          <button type="button" className="btn-refresh" onClick={loadDashboard} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading && <p className="admin-state">Loading dashboard...</p>}
        {!loading && error && <p className="admin-state admin-state-error">{error}</p>}

        {!loading && !error && (
          <>
            <div className="metric-grid">
              <article className="metric-card card-a">
                <span>Total Companies</span>
                <strong>{companies.length}</strong>
                <button type="button" onClick={() => setActiveModal("companies")}>View Details</button>
              </article>

              <article className="metric-card card-b">
                <span>Total Employees</span>
                <strong>{employees.length}</strong>
                <button type="button" onClick={() => setActiveModal("employees")}>View Details</button>
              </article>

              <article className="metric-card card-c">
                <span>Today Shipments</span>
                <strong>{todayShipments}</strong>
                <small>{todayLocalDate()}</small>
              </article>

              <article className="metric-card card-d">
                <span>Total Shipments</span>
                <strong>{totalShipments}</strong>
                <small>All-time generated docs</small>
              </article>
            </div>

            <div className="insight-grid">
              <section className="insight-card">
                <h3>People Snapshot</h3>
                <p>Employees: {employees.length}</p>
                <p>Blocked Employees: {totalBlockedEmployees}</p>
                <button type="button" onClick={() => setActiveModal("employees")}>Open Employee Center</button>
              </section>

              <section className="insight-card">
                <h3>Company Snapshot</h3>
                <p>Companies: {companies.length}</p>
                <p>Blocked Companies: {totalBlockedCompanies}</p>
                <button type="button" onClick={() => setActiveModal("companies")}>Open Company Center</button>
              </section>
            </div>
          </>
        )}
      </div>

      {activeModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-screen">
            <div className="modal-head">
              <h3>{activeModal === "employees" ? "Employee Details" : "Company Details"}</h3>
              <div className="modal-actions">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder={`Search ${activeModal}...`}
                />
                <button type="button" className="btn-close" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>

            <div className="modal-body">
              {activeModal === "employees" && (
                <div className="detail-grid">
                  {filteredEmployees.map((emp) => {
                    const isBlocked = Number(emp.is_blocked) === 1 || emp.is_blocked === true;
                    const key = `employee-${emp.id}`;
                    const isActionLoading = actionState.loading && actionState.key === key;

                    return (
                      <article key={emp.id} className="detail-card">
                        <div className="detail-top">
                          <div>
                            <h4>{emp.name || "-"}</h4>
                            <p>{emp.email || "-"}</p>
                          </div>
                          <span className={`status-pill ${isBlocked ? "is-blocked" : "is-active"}`}>
                            {isBlocked ? "Blocked" : "Active"}
                          </span>
                        </div>

                        <div className="detail-list">
                          <DetailsLine label="Employee ID" value={emp.employee_id} />
                          <DetailsLine label="Phone" value={emp.number} />
                          <DetailsLine label="Role" value={emp.role} />
                          <DetailsLine label="Date Of Joining" value={emp.date_of_joining} />
                          <DetailsLine label="Address" value={emp.address} />
                          <DetailsLine label="Last Login" value={formatDateTime(emp.login_time)} />
                          <DetailsLine label="Generated Shipments" value={String(Array.isArray(emp.docs) ? emp.docs.length : 0)} />
                        </div>

                        <div className="doc-links-row">
                          <DocLink href={emp.profile_pdf_link} label="Profile PDF" />
                          <DocLink href={emp.pan_card_link} label="PAN" />
                          <DocLink href={emp.bank_passbook_link} label="Passbook" />
                          <DocLink href={emp.aadhaar_link} label="Aadhaar" />
                          <DocLink href={emp.photo_link} label="Photo" />
                        </div>

                        <button
                          type="button"
                          className={`toggle-btn ${isBlocked ? "unblock" : "block"}`}
                          disabled={isActionLoading}
                          onClick={() => toggleStatus("employee", emp.id, isBlocked)}
                        >
                          {isActionLoading ? "Please wait..." : isBlocked ? "Unblock" : "Block"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}

              {activeModal === "companies" && (
                <div className="detail-grid">
                  {filteredCompanies.map((company) => {
                    const isBlocked = Number(company.is_blocked) === 1 || company.is_blocked === true;
                    const key = `company-${company.id}`;
                    const isActionLoading = actionState.loading && actionState.key === key;

                    return (
                      <article key={company.id} className="detail-card">
                        <div className="detail-top">
                          <div>
                            <h4>{company.company_name || "-"}</h4>
                            <p>{company.email || "-"}</p>
                          </div>
                          <span className={`status-pill ${isBlocked ? "is-blocked" : "is-active"}`}>
                            {isBlocked ? "Blocked" : "Active"}
                          </span>
                        </div>

                        <div className="detail-list">
                          <DetailsLine label="Company ID" value={company.company_unique_id} />
                          <DetailsLine label="Contact Person" value={company.contact_full_name} />
                          <DetailsLine label="Phone" value={company.mobile_number} />
                          <DetailsLine label="Trade Name" value={company.trade_name} />
                          <DetailsLine label="Business Type" value={company.business_type} />
                          <DetailsLine label="GST" value={company.gst_number} />
                          <DetailsLine label="PAN" value={company.pan_number} />
                          <DetailsLine label="CIN" value={company.cin_number} />
                          <DetailsLine label="Registered Address" value={company.registered_address} />
                          <DetailsLine label="Operational Address" value={company.operational_address} />
                          <DetailsLine label="Generated Shipments" value={String(Array.isArray(company.docs) ? company.docs.length : 0)} />
                        </div>

                        <div className="doc-links-row">
                          <DocLink href={company.profile_pdf_link} label="Profile PDF" />
                          <DocLink href={company.pan_card_link} label="PAN Card" />
                        </div>

                        <button
                          type="button"
                          className={`toggle-btn ${isBlocked ? "unblock" : "block"}`}
                          disabled={isActionLoading}
                          onClick={() => toggleStatus("company", company.id, isBlocked)}
                        >
                          {isActionLoading ? "Please wait..." : isBlocked ? "Unblock" : "Block"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
