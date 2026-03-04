import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import { apiUrl } from "../config/api";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: true,
  });

  const [showPass, setShowPass] = useState(false);
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const onBlur = (e) => setTouched((p) => ({ ...p, [e.target.name]: true }));

  const errors = useMemo(() => {
    const er = {};
    if (!form.email.trim()) er.email = "Email required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = "Invalid email";
    if (!form.password) er.password = "Password required";
    return er;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true, remember: true });
    if (!isValid) return;

    try {
      setLoading(true);
      const res = await fetch(apiUrl("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Login failed");
        return;
      }

      const authPayload = data.admin || data.employee || data.company;
      if (!authPayload) {
        alert("Login response invalid");
        return;
      }

      localStorage.setItem(
        "auth_user",
        JSON.stringify({
          ...authPayload,
          accountType:
            authPayload.accountType || (data.company ? "company" : data.admin ? "admin" : "employee"),
        })
      );
      window.dispatchEvent(new Event("auth-changed"));
      alert("Login successful");
      const nextRoute =
        authPayload.accountType === "admin"
          ? "/admin"
          : authPayload.accountType === "company"
            ? "/company-data"
            : "/doct";
      navigate(nextRoute, { replace: true });
    } catch {
      alert("Server error. Check backend is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (name) => touched[name] && errors[name];

  return (
    <div className="li-wrap">
      <div className="li-card">
        <div className="li-left">
          <div className="li-brand">
            <div className="li-logo">CC</div>
            <div>
              <div className="li-brandName">Creative Code Hub</div>
              <div className="li-brandTag">Where code meets creativity.</div>
            </div>
          </div>

          <h2 className="li-title">Welcome back</h2>
          <p className="li-sub">
            Login to access your dashboard, manage orders, and track updates.
          </p>

          <div className="li-tip">
            <span className="dot" /> Secure login with email and password.
          </div>
        </div>

        <div className="li-right">
          <form className="li-form" onSubmit={handleSubmit}>
            <div className="li-head">
              <div className="li-h1">Login</div>
              <div className="li-small">
                New here?{" "}
                <a className="li-link" href="/signup">
                  Create account
                </a>
              </div>
            </div>

            <div className="li-field">
              <label className="li-label">Email</label>
              <div className={`li-inputWrap ${fieldError("email") ? "err" : ""}`}>
                <span className="li-ico">@</span>
                <input
                  className="li-input"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                  onBlur={onBlur}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              {fieldError("email") && <div className="li-err">{errors.email}</div>}
            </div>

            <div className="li-field">
              <label className="li-label">Password</label>
              <div className={`li-inputWrap ${fieldError("password") ? "err" : ""}`}>
                <span className="li-ico">Lock</span>
                <input
                  className="li-input"
                  type={showPass ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  onBlur={onBlur}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="li-eye"
                  onClick={() => setShowPass((s) => !s)}
                  aria-label="Toggle password visibility"
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
              {fieldError("password") && <div className="li-err">{errors.password}</div>}
            </div>

            <div className="li-row">
              <label className="li-check">
                <input
                  type="checkbox"
                  name="remember"
                  checked={form.remember}
                  onChange={onChange}
                />
                Remember me
              </label>
            </div>

            <button className="li-btn" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="li-footer">
              Use your registered email and password.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
