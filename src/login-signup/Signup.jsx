import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Signup.css";
import { apiUrl } from "../config/api";

export default function Signup() {
  const navigate = useNavigate();
  const IMAGE_MAX_BYTES = 100 * 1024;
  const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const CIN_REGEX = /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
  const TERMS_POINTS = [
    "Employee will follow company operational and security policies.",
    "Documents shared during onboarding must be valid and authentic.",
    "Confidential information must not be disclosed without authorization.",
    "Attendance and reporting timelines must be followed.",
  ];
  const [signupAs, setSignupAs] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    number: "",
    email: "",
    password: "",
    otp: "",
    address: "",
    dob: "",
    panCardImage: null,
    bankAccountNumber: "",
    bankPassbookImage: null,
    aadhaarImage: null,
    photoImage: null,
    dateOfJoining: "",
    role: "Employee",
    acceptedTerms: false,
  });
  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    tradeName: "",
    businessType: "",
    gstNumber: "",
    panNumber: "",
    panCardImage: null,
    cinNumber: "",
    registeredAddress: "",
    operationalAddress: "",
    contactFullName: "",
    mobileNumber: "",
    companyEmail: "",
    companyPassword: "",
    companyOtp: "",
  });

  const [touched, setTouched] = useState({});
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [creating, setCreating] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const companyFieldNames = new Set([
    "companyName",
    "tradeName",
    "businessType",
    "gstNumber",
    "panNumber",
    "panCardImage",
    "cinNumber",
    "registeredAddress",
    "operationalAddress",
    "contactFullName",
    "mobileNumber",
    "companyEmail",
    "companyPassword",
    "companyOtp",
  ]);

  const chooseSignupType = (type) => {
    setSignupAs(type);
    setTouched({});
    setOtpSent(false);
    setOtpVerified(false);
  };

  const onChange = (e) => {
    const { name, value, type, files } = e.target;

    if (type === "checkbox") {
      setForm((p) => ({ ...p, [name]: e.target.checked }));
      return;
    }

    if (type === "file") {
      const nextFile = files && files[0] ? files[0] : null;
      if (companyFieldNames.has(name) || name.startsWith("company")) {
        setCompanyForm((p) => ({ ...p, [name]: nextFile }));
      } else {
        setForm((p) => ({ ...p, [name]: nextFile }));
      }
      return;
    }

    if (name === "email") {
      setOtpSent(false);
      setOtpVerified(false);
      setForm((p) => ({ ...p, email: value, otp: "" }));
      return;
    }

    if (name === "companyEmail") {
      setOtpSent(false);
      setOtpVerified(false);
      setCompanyForm((p) => ({ ...p, companyEmail: value, companyOtp: "" }));
      return;
    }

    if (companyFieldNames.has(name) || name.startsWith("company")) {
      const normalizedValue =
        name === "gstNumber" || name === "panNumber" || name === "cinNumber"
          ? value.toUpperCase()
          : value;
      setCompanyForm((p) => ({ ...p, [name]: normalizedValue }));
      return;
    }

    setForm((p) => ({ ...p, [name]: value }));
  };

  const onBlur = (e) => setTouched((p) => ({ ...p, [e.target.name]: true }));

  const errors = useMemo(() => {
    const er = {};
    if (signupAs === "employee") {
      if (!form.fullName.trim()) er.fullName = "Full name required";
      if (!form.number.trim()) er.number = "Number required";
      else if (!/^[0-9+\-()\s]{7,15}$/.test(form.number)) {
        er.number = "Invalid number format";
      }

      if (!form.email.trim()) er.email = "Email required";
      else if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = "Invalid email";

      if (!form.password) er.password = "Password required";
      else if (form.password.length < 8) er.password = "Password must be at least 8 characters";

      if (!form.address.trim()) er.address = "Address required";
      if (!form.dob) er.dob = "DOB required";
      if (!form.panCardImage) er.panCardImage = "PAN card image required";
      else if (form.panCardImage.size > IMAGE_MAX_BYTES) er.panCardImage = "Max 100KB allowed";
      if (!form.bankAccountNumber.trim()) er.bankAccountNumber = "Bank account number required";
      else if (!/^\d{8,20}$/.test(form.bankAccountNumber.trim())) {
        er.bankAccountNumber = "Bank account number should be 8-20 digits";
      }
      if (!form.bankPassbookImage) er.bankPassbookImage = "Passbook image required";
      else if (form.bankPassbookImage.size > IMAGE_MAX_BYTES) {
        er.bankPassbookImage = "Max 100KB allowed";
      }
      if (!form.aadhaarImage) er.aadhaarImage = "Aadhaar image required";
      else if (form.aadhaarImage.size > IMAGE_MAX_BYTES) er.aadhaarImage = "Max 100KB allowed";
      if (!form.photoImage) er.photoImage = "Photo image required";
      else if (form.photoImage.size > IMAGE_MAX_BYTES) er.photoImage = "Max 100KB allowed";
      if (!form.dateOfJoining) er.dateOfJoining = "Date of joining required";
      if (!form.role.trim()) er.role = "Role required";
      if (!form.acceptedTerms) er.acceptedTerms = "Please accept terms and conditions";

      if (otpSent && !form.otp.trim()) er.otp = "OTP required";
      else if (otpSent && !/^\d{6}$/.test(form.otp.trim())) er.otp = "OTP must be 6 digits";
    }

    if (signupAs === "company") {
      if (!companyForm.companyName.trim()) er.companyName = "Company name required";
      if (!companyForm.businessType.trim()) er.businessType = "Business type required";
      if (!companyForm.gstNumber.trim()) er.gstNumber = "GST number required";
      else if (!GSTIN_REGEX.test(companyForm.gstNumber.trim().toUpperCase())) {
        er.gstNumber = "Invalid GSTIN format";
      }
      if (!companyForm.panNumber.trim()) er.panNumber = "PAN number required";
      else if (!PAN_REGEX.test(companyForm.panNumber.trim().toUpperCase())) {
        er.panNumber = "Invalid PAN format";
      }
      if (!companyForm.panCardImage) {
        er.panCardImage = "PAN image required";
      }
      if (!companyForm.cinNumber.trim()) er.cinNumber = "CIN number required";
      else if (!CIN_REGEX.test(companyForm.cinNumber.trim().toUpperCase())) {
        er.cinNumber = "Invalid CIN format";
      }
      if (!companyForm.registeredAddress.trim()) er.registeredAddress = "Registered address required";
      if (!companyForm.operationalAddress.trim()) er.operationalAddress = "Operational address required";
      if (!companyForm.contactFullName.trim()) er.contactFullName = "Contact full name required";
      if (!companyForm.mobileNumber.trim()) er.mobileNumber = "Mobile number required";
      else if (!/^[0-9+\-()\s]{7,15}$/.test(companyForm.mobileNumber.trim())) {
        er.mobileNumber = "Invalid mobile format";
      }

      if (!companyForm.companyEmail.trim()) er.companyEmail = "Email required";
      else if (!/^\S+@\S+\.\S+$/.test(companyForm.companyEmail)) er.companyEmail = "Invalid email";
      if (!companyForm.companyPassword) er.companyPassword = "Password required";
      else if (companyForm.companyPassword.length < 8) {
        er.companyPassword = "Password must be at least 8 characters";
      }

      if (otpSent && !companyForm.companyOtp.trim()) er.companyOtp = "OTP required";
      else if (otpSent && !/^\d{6}$/.test(companyForm.companyOtp.trim())) {
        er.companyOtp = "OTP must be 6 digits";
      }
    }

    return er;
  }, [form, companyForm, otpSent, signupAs]);

  const fieldError = (name) => touched[name] && errors[name];

  const sendOtp = async () => {
    const emailField = signupAs === "company" ? "companyEmail" : "email";
    const activeEmail = signupAs === "company" ? companyForm.companyEmail : form.email;
    setTouched((p) => ({ ...p, [emailField]: true }));
    if (errors[emailField]) return;

    try {
      setSendingOtp(true);
      const res = await fetch(apiUrl("/api/signup/send-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: activeEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to send OTP");
        return;
      }

      setOtpSent(true);
      setOtpVerified(false);
      alert("OTP sent to your email");
    } catch {
      alert("Server error while sending OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    const emailValue = signupAs === "company" ? companyForm.companyEmail : form.email;
    const otpField = signupAs === "company" ? "companyOtp" : "otp";
    const otpValue = signupAs === "company" ? companyForm.companyOtp : form.otp;
    setTouched((p) => ({ ...p, [otpField]: true }));
    if (errors[otpField]) return;

    try {
      setVerifyingOtp(true);
      const res = await fetch(apiUrl("/api/signup/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue, otp: otpValue }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "OTP verification failed");
        return;
      }

      setOtpVerified(true);
      alert("Email verified successfully");
    } catch {
      alert("Server error while verifying OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (signupAs === "company") {
      setTouched({
        companyName: true,
        tradeName: true,
        businessType: true,
        gstNumber: true,
        panNumber: true,
        panCardImage: true,
        cinNumber: true,
        registeredAddress: true,
        operationalAddress: true,
        contactFullName: true,
        mobileNumber: true,
        companyEmail: true,
        companyPassword: true,
        companyOtp: true,
      });

      const errorKeys = Object.keys(errors);
      if (errorKeys.length > 0) {
        const firstErrorKey = errorKeys[0];
        const firstErrorMessage = errors[firstErrorKey];
        if (firstErrorMessage) alert(firstErrorMessage);
        const firstInvalidField = document.querySelector(`[name="${firstErrorKey}"]`);
        if (firstInvalidField && typeof firstInvalidField.focus === "function") {
          firstInvalidField.focus();
          if (typeof firstInvalidField.scrollIntoView === "function") {
            firstInvalidField.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
        return;
      }

      if (!otpVerified) {
        alert("Please verify OTP before creating company account");
        return;
      }

      try {
        setCreating(true);
        const companyPayload = new FormData();
        companyPayload.append("company_name", companyForm.companyName);
        companyPayload.append("trade_name", companyForm.tradeName);
        companyPayload.append("business_type", companyForm.businessType);
        companyPayload.append("gst_number", companyForm.gstNumber);
        companyPayload.append("pan_number", companyForm.panNumber);
        companyPayload.append("cin_number", companyForm.cinNumber);
        companyPayload.append("registered_address", companyForm.registeredAddress);
        companyPayload.append("operational_address", companyForm.operationalAddress);
        companyPayload.append("contact_full_name", companyForm.contactFullName);
        companyPayload.append("mobile_number", companyForm.mobileNumber);
        companyPayload.append("email", companyForm.companyEmail);
        companyPayload.append("password", companyForm.companyPassword);
        if (companyForm.panCardImage) {
          companyPayload.append("panCardImage", companyForm.panCardImage);
        }

        const res = await fetch(apiUrl("/api/company/signup"), {
          method: "POST",
          body: companyPayload,
        });

        const data = await res.json();
        if (!res.ok) {
          alert(data.message || "Company signup failed");
          return;
        }

        alert(
          data?.company?.id
            ? `Company account created successfully.\nCompany ID: ${data.company.id}`
            : "Company account created successfully"
        );
        if (data?.company?.profilePdfLink) {
          window.open(data.company.profilePdfLink, "_blank", "noopener,noreferrer");
        }

        localStorage.setItem(
          "auth_user",
          JSON.stringify({
            id: data?.company?.id || "",
            dbId: data?.company?.dbId || "",
            name: data?.company?.company_name || companyForm.companyName || "Company",
            email: data?.company?.email || companyForm.companyEmail || "",
            accountType: "company",
          })
        );
        window.dispatchEvent(new Event("auth-changed"));

        setCompanyForm({
          companyName: "",
          tradeName: "",
          businessType: "",
          gstNumber: "",
          panNumber: "",
          panCardImage: null,
          cinNumber: "",
          registeredAddress: "",
          operationalAddress: "",
          contactFullName: "",
          mobileNumber: "",
          companyEmail: "",
          companyPassword: "",
          companyOtp: "",
        });
        setTouched({});
        setOtpSent(false);
        setOtpVerified(false);

        if (window.opener) {
          window.close();
        } else {
          navigate("/", { replace: true });
        }
      } catch {
        alert("Server error. Check backend is running on port 5000.");
      } finally {
        setCreating(false);
      }
      return;
    }

    if (signupAs !== "employee") return;

    setTouched({
      fullName: true,
      number: true,
      email: true,
      password: true,
      otp: true,
      address: true,
      dob: true,
      panCardImage: true,
      bankAccountNumber: true,
      bankPassbookImage: true,
      aadhaarImage: true,
      photoImage: true,
      dateOfJoining: true,
      role: true,
      acceptedTerms: true,
    });

    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const firstErrorKey = errorKeys[0];
      const firstErrorMessage = errors[firstErrorKey];
      if (firstErrorMessage) {
        alert(firstErrorMessage);
      }

      const firstInvalidField = document.querySelector(`[name="${firstErrorKey}"]`);
      if (firstInvalidField && typeof firstInvalidField.focus === "function") {
        firstInvalidField.focus();
        if (typeof firstInvalidField.scrollIntoView === "function") {
          firstInvalidField.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      return;
    }
    if (!otpVerified) {
      alert("Please verify OTP before creating account");
      return;
    }

    try {
      setCreating(true);
      const payload = new FormData();
      payload.append("fullName", form.fullName);
      payload.append("number", form.number);
      payload.append("email", form.email);
      payload.append("password", form.password);
      payload.append("address", form.address);
      payload.append("dob", form.dob);
      payload.append("bank_account_number", form.bankAccountNumber);
      payload.append("date_of_joining", form.dateOfJoining);
      payload.append("role", form.role);
      payload.append("terms_points", TERMS_POINTS.join("\n"));
      payload.append("panCardImage", form.panCardImage);
      payload.append("bankPassbookImage", form.bankPassbookImage);
      payload.append("aadhaarImage", form.aadhaarImage);
      payload.append("photoImage", form.photoImage);

      const res = await fetch(apiUrl("/api/signup"), {
        method: "POST",
        body: payload,
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Signup failed");
        return;
      }

      const createdId = data?.employee?.id;
      localStorage.setItem(
        "auth_user",
        JSON.stringify({
          id: createdId || "",
          name: form.fullName,
          email: form.email,
          accountType: "employee",
        })
      );
      window.dispatchEvent(new Event("auth-changed"));

      alert(
        createdId
          ? `Account created successfully.\nYour ID: ${createdId}`
          : "Account created successfully"
      );
      if (data?.employee?.profilePdfLink) {
        window.open(data.employee.profilePdfLink, "_blank", "noopener,noreferrer");
      }
      setForm({
        fullName: "",
        number: "",
        email: "",
        password: "",
        otp: "",
        address: "",
        dob: "",
        panCardImage: null,
        bankAccountNumber: "",
        bankPassbookImage: null,
        aadhaarImage: null,
        photoImage: null,
        dateOfJoining: "",
        role: "Employee",
        acceptedTerms: false,
      });
      setTouched({});
      setOtpSent(false);
      setOtpVerified(false);

      // If signup is opened in a separate window, close it; otherwise redirect home.
      if (window.opener) {
        window.close();
      } else {
        navigate("/", { replace: true });
      }
    } catch {
      alert("Server error. Check backend is running on port 5000.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="su-wrap">
      <div className="su-card">
        <div className="su-left">
          <div className="su-brand">
            <div className="su-logo">CC</div>
            <div>
              <div className="su-brandName">Creative Code Hub</div>
              <div className="su-brandTag">Where code meets creativity.</div>
            </div>
          </div>

          <h2 className="su-title">Create your account</h2>
          <p className="su-sub">
            Select signup type, then continue with email OTP verification.
          </p>

          <ul className="su-points">
            <li>Choose Employee or Company</li>
            <li>Secure OTP-based email verification</li>
            <li>Fast onboarding flow</li>
            <li>Employee entry in database</li>
          </ul>
        </div>

        <div className="su-right">
          {!signupAs && (
            <div className="su-typeBox">
              <div className="su-head">
                <div className="su-h1">Sign Up</div>
                <div className="su-small">
                  Already have an account?{" "}
                  <a className="su-link" href="/login">
                    Login
                  </a>
                </div>
              </div>
              <div className="su-typeTitle">Signup as</div>
              <button
                type="button"
                className="su-typeBtn"
                onClick={() => chooseSignupType("employee")}
              >
                Employee
              </button>
              <button
                type="button"
                className="su-typeBtn su-typeBtnAlt"
                onClick={() => chooseSignupType("company")}
              >
                Company
              </button>
            </div>
          )}

          {signupAs === "company" && (
            <form className="su-form" onSubmit={handleSubmit}>
              <div className="su-head">
                <div className="su-h1">Company Sign Up</div>
                <button type="button" className="su-backBtn" onClick={() => chooseSignupType("")}>
                  Back
                </button>
              </div>

              <div className="su-field">
                <label className="su-label">Company Name</label>
                <div className={`su-inputWrap ${fieldError("companyName") ? "err" : ""}`}>
                  <input
                    className="su-input"
                    name="companyName"
                    value={companyForm.companyName}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder="ABC Logistics Pvt Ltd"
                  />
                </div>
                {fieldError("companyName") && <div className="su-err">{errors.companyName}</div>}
              </div>

              <div className="su-grid2">
                <div className="su-field">
                  <label className="su-label">Trade Name</label>
                  <div className={`su-inputWrap ${fieldError("tradeName") ? "err" : ""}`}>
                    <input
                      className="su-input"
                      name="tradeName"
                      value={companyForm.tradeName}
                      onChange={onChange}
                      onBlur={onBlur}
                      placeholder="ABC Trade"
                    />
                  </div>
                </div>

                <div className="su-field">
                  <label className="su-label">Business Type</label>
                  <div className={`su-inputWrap ${fieldError("businessType") ? "err" : ""}`}>
                    <input
                      className="su-input"
                      name="businessType"
                      value={companyForm.businessType}
                      onChange={onChange}
                      onBlur={onBlur}
                      placeholder="Transport / Courier"
                    />
                  </div>
                  {fieldError("businessType") && <div className="su-err">{errors.businessType}</div>}
                </div>
              </div>

              <div className="su-grid2">
                <div className="su-field">
                  <label className="su-label">GST Number</label>
                  <div className={`su-inputWrap ${fieldError("gstNumber") ? "err" : ""}`}>
                    <input
                      className="su-input"
                      name="gstNumber"
                      value={companyForm.gstNumber}
                      onChange={onChange}
                      onBlur={onBlur}
                      placeholder="GSTIN"
                    />
                  </div>
                  {fieldError("gstNumber") && <div className="su-err">{errors.gstNumber}</div>}
                </div>

                <div className="su-field">
                  <label className="su-label">PAN Number</label>
                  <div className={`su-inputWrap ${fieldError("panNumber") ? "err" : ""}`}>
                    <input
                      className="su-input"
                      name="panNumber"
                      value={companyForm.panNumber}
                      onChange={onChange}
                      onBlur={onBlur}
                      placeholder="PAN"
                    />
                  </div>
                  {fieldError("panNumber") && <div className="su-err">{errors.panNumber}</div>}
                </div>
              </div>

              <div className="su-grid2">
                <div className="su-field">
                  <label className="su-label">CIN Number</label>
                  <div className={`su-inputWrap ${fieldError("cinNumber") ? "err" : ""}`}>
                    <input
                      className="su-input"
                      name="cinNumber"
                      value={companyForm.cinNumber}
                      onChange={onChange}
                      onBlur={onBlur}
                      placeholder="CIN"
                    />
                  </div>
                  {fieldError("cinNumber") && <div className="su-err">{errors.cinNumber}</div>}
                </div>

                <div className="su-field">
                  <label className="su-label">PAN Card Image</label>
                  <div className={`su-inputWrap ${fieldError("panCardImage") ? "err" : ""}`}>
                    <input
                      className="su-input"
                      type="file"
                      accept="image/*"
                      name="panCardImage"
                      onChange={onChange}
                      onBlur={onBlur}
                    />
                  </div>
                  {companyForm.panCardImage && (
                    <div className="su-hint">{companyForm.panCardImage.name}</div>
                  )}
                  {fieldError("panCardImage") && <div className="su-err">{errors.panCardImage}</div>}
                </div>
              </div>

              <div className="su-field">
                <label className="su-label">Registered Address</label>
                <div className={`su-inputWrap ${fieldError("registeredAddress") ? "err" : ""}`}>
                  <textarea
                    className="su-input su-textareaInput"
                    name="registeredAddress"
                    value={companyForm.registeredAddress}
                    onChange={onChange}
                    onBlur={onBlur}
                    rows={3}
                    placeholder="Registered address"
                  />
                </div>
                {fieldError("registeredAddress") && (
                  <div className="su-err">{errors.registeredAddress}</div>
                )}
              </div>

              <div className="su-field">
                <label className="su-label">Operational Address</label>
                <div className={`su-inputWrap ${fieldError("operationalAddress") ? "err" : ""}`}>
                  <textarea
                    className="su-input su-textareaInput"
                    name="operationalAddress"
                    value={companyForm.operationalAddress}
                    onChange={onChange}
                    onBlur={onBlur}
                    rows={3}
                    placeholder="Operational address"
                  />
                </div>
                {fieldError("operationalAddress") && (
                  <div className="su-err">{errors.operationalAddress}</div>
                )}
              </div>

              <div className="su-grid2">
                <div className="su-field">
                  <label className="su-label">Contact Full Name</label>
                  <div className={`su-inputWrap ${fieldError("contactFullName") ? "err" : ""}`}>
                    <input
                      className="su-input"
                      name="contactFullName"
                      value={companyForm.contactFullName}
                      onChange={onChange}
                      onBlur={onBlur}
                      placeholder="Contact person"
                    />
                  </div>
                  {fieldError("contactFullName") && (
                    <div className="su-err">{errors.contactFullName}</div>
                  )}
                </div>

                <div className="su-field">
                  <label className="su-label">Mobile Number</label>
                  <div className={`su-inputWrap ${fieldError("mobileNumber") ? "err" : ""}`}>
                    <input
                      className="su-input"
                      name="mobileNumber"
                      value={companyForm.mobileNumber}
                      onChange={onChange}
                      onBlur={onBlur}
                      placeholder="9876543210"
                    />
                  </div>
                  {fieldError("mobileNumber") && <div className="su-err">{errors.mobileNumber}</div>}
                </div>
              </div>

              <div className="su-field">
                <label className="su-label">Company Email</label>
                <div className={`su-inputWrap ${fieldError("companyEmail") ? "err" : ""}`}>
                  <input
                    className="su-input"
                    name="companyEmail"
                    value={companyForm.companyEmail}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder="company@example.com"
                    autoComplete="email"
                  />
                </div>
                {fieldError("companyEmail") && <div className="su-err">{errors.companyEmail}</div>}
              </div>

              <div className="su-field">
                <label className="su-label">Password</label>
                <div className={`su-inputWrap ${fieldError("companyPassword") ? "err" : ""}`}>
                  <input
                    className="su-input"
                    type={showPass ? "text" : "password"}
                    name="companyPassword"
                    value={companyForm.companyPassword}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="su-eye"
                    onClick={() => setShowPass((prev) => !prev)}
                    aria-label="Toggle password visibility"
                  >
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
                {fieldError("companyPassword") && (
                  <div className="su-err">{errors.companyPassword}</div>
                )}

                <button
                  type="button"
                  className="su-btn su-btn-inline"
                  onClick={sendOtp}
                  disabled={sendingOtp || !!errors.companyEmail}
                >
                  {sendingOtp ? "Sending OTP..." : otpSent ? "Resend OTP" : "Send OTP"}
                </button>
              </div>

              {otpSent && (
                <div className="su-field">
                  <label className="su-label">Enter OTP</label>
                  <div className={`su-inputWrap ${fieldError("companyOtp") ? "err" : ""}`}>
                    <input
                      className="su-input"
                      name="companyOtp"
                      value={companyForm.companyOtp}
                      onChange={onChange}
                      onBlur={onBlur}
                      placeholder="6-digit OTP"
                      maxLength={6}
                    />
                  </div>
                  {fieldError("companyOtp") && <div className="su-err">{errors.companyOtp}</div>}

                  <button
                    type="button"
                    className="su-btn su-btn-inline"
                    onClick={verifyOtp}
                    disabled={verifyingOtp || !!errors.companyOtp}
                  >
                    {verifyingOtp ? "Verifying..." : otpVerified ? "Verified" : "Verify OTP"}
                  </button>
                </div>
              )}

              <button className="su-btn" type="submit" disabled={creating || !otpVerified}>
                {creating ? "Creating..." : "Create Company Account"}
              </button>

              <div className="su-footer">
                Email verification is required before company account creation.
              </div>
            </form>
          )}

          {signupAs === "employee" && (
            <form className="su-form" onSubmit={handleSubmit}>
              <div className="su-head">
                <div className="su-h1">Employee Sign Up</div>
                <button type="button" className="su-backBtn" onClick={() => chooseSignupType("")}>
                  Back
                </button>
              </div>

              <div className="su-field">
                <label className="su-label">Full Name</label>
                <div className={`su-inputWrap ${fieldError("fullName") ? "err" : ""}`}>
                  <input
                    className="su-input"
                    name="fullName"
                    value={form.fullName}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder="Harshit Gupta"
                    autoComplete="name"
                  />
                </div>
                {fieldError("fullName") && <div className="su-err">{errors.fullName}</div>}
              </div>

              <div className="su-field">
                <label className="su-label">Mobile Number</label>
                <div className={`su-inputWrap ${fieldError("number") ? "err" : ""}`}>
                  <input
                    className="su-input"
                    name="number"
                    value={form.number}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder="9876543210"
                  />
                </div>
                {fieldError("number") && <div className="su-err">{errors.number}</div>}
              </div>

              <div className="su-field">
                <label className="su-label">Email</label>
                <div className={`su-inputWrap ${fieldError("email") ? "err" : ""}`}>
                  <input
                    className="su-input"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                {fieldError("email") && <div className="su-err">{errors.email}</div>}

                <button
                  type="button"
                  className="su-btn su-btn-inline"
                  onClick={sendOtp}
                  disabled={sendingOtp || !!errors.email}
                >
                  {sendingOtp ? "Sending OTP..." : otpSent ? "Resend OTP" : "Send OTP"}
                </button>
              </div>

              <div className="su-field">
                <label className="su-label">Password</label>
                <div className={`su-inputWrap ${fieldError("password") ? "err" : ""}`}>
                  <input
                    className="su-input"
                    type={showPass ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="su-eye"
                    onClick={() => setShowPass((prev) => !prev)}
                    aria-label="Toggle password visibility"
                  >
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
                {fieldError("password") && <div className="su-err">{errors.password}</div>}
              </div>

              {otpSent && (
                <div className="su-field">
                  <label className="su-label">Enter OTP</label>
                  <div className={`su-inputWrap ${fieldError("otp") ? "err" : ""}`}>
                    <input
                      className="su-input"
                      name="otp"
                      value={form.otp}
                      onChange={onChange}
                      onBlur={onBlur}
                      placeholder="6-digit OTP"
                      maxLength={6}
                    />
                  </div>
                  {fieldError("otp") && <div className="su-err">{errors.otp}</div>}

                  <button
                    type="button"
                    className="su-btn su-btn-inline"
                    onClick={verifyOtp}
                    disabled={verifyingOtp || !!errors.otp}
                  >
                    {verifyingOtp ? "Verifying..." : otpVerified ? "Verified" : "Verify OTP"}
                  </button>
                </div>
              )}

              <div className="su-field">
                <label className="su-label">Address</label>
                <div className={`su-inputWrap ${fieldError("address") ? "err" : ""}`}>
                  <input
                    className="su-input"
                    name="address"
                    value={form.address}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder="Full address"
                  />
                </div>
                {fieldError("address") && <div className="su-err">{errors.address}</div>}
              </div>

              <div className="su-grid2">
                <div className="su-field">
                  <label className="su-label">Date of Birth</label>
                  <div className={`su-inputWrap ${fieldError("dob") ? "err" : ""}`}>
                    <input
                      className="su-input"
                      type="date"
                      name="dob"
                      value={form.dob}
                      onChange={onChange}
                      onBlur={onBlur}
                    />
                  </div>
                  {fieldError("dob") && <div className="su-err">{errors.dob}</div>}
                </div>

                <div className="su-field">
                  <label className="su-label">Date of Joining</label>
                  <div className={`su-inputWrap ${fieldError("dateOfJoining") ? "err" : ""}`}>
                    <input
                      className="su-input"
                      type="date"
                      name="dateOfJoining"
                      value={form.dateOfJoining}
                      onChange={onChange}
                      onBlur={onBlur}
                    />
                  </div>
                  {fieldError("dateOfJoining") && (
                    <div className="su-err">{errors.dateOfJoining}</div>
                  )}
                </div>
              </div>

              <div className="su-field">
                <label className="su-label">PAN Card Image (max 100KB)</label>
                <div className={`su-inputWrap ${fieldError("panCardImage") ? "err" : ""}`}>
                  <input
                    className="su-input"
                    type="file"
                    accept="image/*"
                    name="panCardImage"
                    onChange={onChange}
                    onBlur={onBlur}
                  />
                </div>
                {form.panCardImage && <div className="su-hint">{form.panCardImage.name}</div>}
                {fieldError("panCardImage") && <div className="su-err">{errors.panCardImage}</div>}
              </div>

              <div className="su-field">
                <label className="su-label">Bank Account Number</label>
                <div className={`su-inputWrap ${fieldError("bankAccountNumber") ? "err" : ""}`}>
                  <input
                    className="su-input"
                    name="bankAccountNumber"
                    value={form.bankAccountNumber}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder="Account number"
                  />
                </div>
                {fieldError("bankAccountNumber") && (
                  <div className="su-err">{errors.bankAccountNumber}</div>
                )}
              </div>

              <div className="su-field">
                <label className="su-label">Bank Passbook Image (max 100KB)</label>
                <div className={`su-inputWrap ${fieldError("bankPassbookImage") ? "err" : ""}`}>
                  <input
                    className="su-input"
                    type="file"
                    accept="image/*"
                    name="bankPassbookImage"
                    onChange={onChange}
                    onBlur={onBlur}
                  />
                </div>
                {form.bankPassbookImage && <div className="su-hint">{form.bankPassbookImage.name}</div>}
                {fieldError("bankPassbookImage") && (
                  <div className="su-err">{errors.bankPassbookImage}</div>
                )}
              </div>

              <div className="su-field">
                <label className="su-label">Aadhaar Image (max 100KB)</label>
                <div className={`su-inputWrap ${fieldError("aadhaarImage") ? "err" : ""}`}>
                  <input
                    className="su-input"
                    type="file"
                    accept="image/*"
                    name="aadhaarImage"
                    onChange={onChange}
                    onBlur={onBlur}
                  />
                </div>
                {form.aadhaarImage && <div className="su-hint">{form.aadhaarImage.name}</div>}
                {fieldError("aadhaarImage") && <div className="su-err">{errors.aadhaarImage}</div>}
              </div>

              <div className="su-field">
                <label className="su-label">Photo Image (max 100KB)</label>
                <div className={`su-inputWrap ${fieldError("photoImage") ? "err" : ""}`}>
                  <input
                    className="su-input"
                    type="file"
                    accept="image/*"
                    name="photoImage"
                    onChange={onChange}
                    onBlur={onBlur}
                  />
                </div>
                {form.photoImage && <div className="su-hint">{form.photoImage.name}</div>}
                {fieldError("photoImage") && <div className="su-err">{errors.photoImage}</div>}
              </div>

              <div className="su-field">
                <label className="su-label">Role</label>
                <div className={`su-inputWrap ${fieldError("role") ? "err" : ""}`}>
                  <input
                    className="su-input"
                    name="role"
                    value={form.role}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder="Employee"
                  />
                </div>
                {fieldError("role") && <div className="su-err">{errors.role}</div>}
              </div>

              <div className="su-field">
                <label className="su-checkline">
                  <input
                    type="checkbox"
                    name="acceptedTerms"
                    checked={form.acceptedTerms}
                    onChange={onChange}
                    onBlur={onBlur}
                  />
                  <span>
                    I agree to{" "}
                    <button
                      type="button"
                      className="su-inlineLinkBtn"
                      onClick={() => setShowTermsModal(true)}
                    >
                      Employee Terms & Conditions
                    </button>
                  </span>
                </label>
                {fieldError("acceptedTerms") && <div className="su-err">{errors.acceptedTerms}</div>}
              </div>

              <button className="su-btn" type="submit" disabled={creating || !otpVerified}>
                {creating ? "Creating..." : "Create Account"}
              </button>

              <div className="su-footer">
                Email verification is required before account creation.
              </div>
            </form>
          )}
        </div>
      </div>

      {showTermsModal && (
        <div className="su-modalBack" role="dialog" aria-modal="true">
          <div className="su-modalCard">
            <div className="su-modalHead">
              <div className="su-h1">Employee Terms & Conditions</div>
              <button
                type="button"
                className="su-backBtn"
                onClick={() => setShowTermsModal(false)}
              >
                Close
              </button>
            </div>
            <ul className="su-modalList">
              {TERMS_POINTS.map((line, idx) => (
                <li key={`term-${idx}`}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
