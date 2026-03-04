import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./Data.css";
import { apiUrl } from "../config/api";

function readAuthUser() {
  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function Data() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = useMemo(() => readAuthUser(), []);

  useEffect(() => {
    const loadDocs = async () => {
      if (!user?.id && !user?.dbId) {
        setError("Please login first.");
        setLoading(false);
        return;
      }

      try {
        const employeeId = encodeURIComponent(user.dbId || user.id);
        const res = await fetch(apiUrl(`/api/docs?employeeId=${employeeId}`));
        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Failed to fetch records");
          setLoading(false);
          return;
        }

        setDocs(Array.isArray(data.docs) ? data.docs : []);
      } catch {
        setError("Server error while loading records");
      } finally {
        setLoading(false);
      }
    };

    loadDocs();
  }, [user]);

  return (
    <div className="data-page">
      <div className="data-card">
        <div className="data-head">
          <h2>Employee Documents</h2>
          <p>
            Logged in as: <b>{user?.name || "-"}</b> ({user?.email || "-"})
          </p>
        </div>

        {loading && <p className="data-state">Loading...</p>}
        {!loading && error && <p className="data-state data-state-error">{error}</p>}

        {!loading && !error && docs.length === 0 && <p className="data-state">No records found.</p>}

        {!loading && !error && docs.length > 0 && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>AWB No</th>
                  <th>Form Type</th>
                  <th>Created At</th>
                  <th>PDF Link</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc, idx) => (
                  <tr key={doc.id} style={{ animationDelay: `${idx * 60}ms` }}>
                    <td>{doc.id}</td>
                    <td className="data-awb">{doc.awb_no}</td>
                    <td>
                      <span className={`data-pill ${doc.form_type === "Doct" ? "is-doct" : "is-other"}`}>
                        {doc.form_type}
                      </span>
                    </td>
                    <td>{new Date(doc.created_at).toLocaleString()}</td>
                    <td>
                      {doc.pdf_link ? (
                        <a className="data-pdf-link" href={doc.pdf_link} target="_blank" rel="noreferrer">
                          Open PDF
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {doc.form_type === "Doct" ? (
                        <Link className="data-edit-link" to={`/doct?docId=${doc.id}`}>
                          Edit
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
