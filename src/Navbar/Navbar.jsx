import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { apiUrl } from "../config/api";

function readAuthUser() {
  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const accountType =
      parsed.accountType === "company" || parsed.accountType === "employee" || parsed.accountType === "admin"
        ? parsed.accountType
        : "employee";
    return { ...parsed, accountType };
  } catch {
    return null;
  }
}

export default function Navbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(() => readAuthUser());
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const forceLogoutRef = useRef(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const syncUser = () => setUser(readAuthUser());
    window.addEventListener("storage", syncUser);
    window.addEventListener("auth-changed", syncUser);
    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("auth-changed", syncUser);
    };
  }, []);

  useEffect(() => {
    if (user) {
      forceLogoutRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!profileRef.current?.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const userInitial = String(user?.name || "U").trim().charAt(0).toUpperCase() || "U";
  const isCompany = user?.accountType === "company";
  const isAdmin = user?.accountType === "admin";

  const handleLogout = () => {
    localStorage.removeItem("auth_user");
    window.dispatchEvent(new Event("auth-changed"));
    setProfileOpen(false);
    setOpen(false);
    navigate("/login");
  };

  useEffect(() => {
    let intervalId = null;
    let cancelled = false;

    const checkSession = async () => {
      const authUser = readAuthUser();
      if (!authUser || forceLogoutRef.current) return;

      const accountType = String(authUser.accountType || "").trim().toLowerCase();
      if (!accountType) return;

      const idToVerify = encodeURIComponent(authUser.dbId || authUser.id || "");
      const emailToVerify = encodeURIComponent(String(authUser.email || "").trim());
      const query = `accountType=${encodeURIComponent(accountType)}&id=${idToVerify}&email=${emailToVerify}`;

      try {
        const res = await fetch(apiUrl(`/api/auth/session-status?${query}`));
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) return;

        if (data?.active === false && data?.forceLogout) {
          forceLogoutRef.current = true;
          localStorage.removeItem("auth_user");
          window.dispatchEvent(new Event("auth-changed"));
          setProfileOpen(false);
          setOpen(false);
          alert(data?.message || "Your account is blocked. Please contact admin.");
          navigate("/login", { replace: true });
        }
      } catch {
        // Ignore temporary network errors and retry in next poll.
      }
    };

    if (user) {
      checkSession();
      intervalId = window.setInterval(checkSession, 2000);
    }

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [navigate, user]);

  return (
    <header className={`nav ${scrolled ? "nav--scrolled" : ""}`}>
      <div className="nav__container">
        {/* Logo */}
        <Link to="/home" className="nav__logo" aria-label="Go to homepage">
          Creative<span>Code</span>
        </Link>

        {/* Menu */}
        <nav className={`nav__menu ${open ? "is-open" : ""}`} aria-label="Primary">
          <Link className="nav__link" to="/home" onClick={() => setOpen(false)}>
            Home
          </Link>
          {user && (
            <>
              {isAdmin ? (
                <Link className="nav__link" to="/admin" onClick={() => setOpen(false)}>
                  Admin Panel
                </Link>
              ) : (
                <>
                  <Link className="nav__link" to="/doct" onClick={() => setOpen(false)}>
                    Doct
                  </Link>
                  {!isCompany && (
                    <Link className="nav__link" to="/manifest" onClick={() => setOpen(false)}>
                      Manifest
                    </Link>
                  )}
                  <Link
                    className="nav__link"
                    to={isCompany ? "/company-data" : "/data"}
                    onClick={() => setOpen(false)}
                  >
                    {isCompany ? "Company Data" : "Data"}
                  </Link>
                  <Link className="nav__link" to="/about" onClick={() => setOpen(false)}>
                    About
                  </Link>
                  <Link className="nav__link" to="/contact" onClick={() => setOpen(false)}>
                    Contact
                  </Link>
                </>
              )}
            </>
          )}

          <div className="nav__auth">
            {user ? (
              <div className="nav__profile" ref={profileRef}>
                <button
                  type="button"
                  className="nav__avatar"
                  onClick={() => setProfileOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  title={user?.name || "User"}
                >
                  {userInitial}
                </button>
                {profileOpen && (
                  <div className="nav__profileMenu" role="menu">
                    <div className="nav__profileName">{user?.name || "User"}</div>
                    <div className="nav__profileId">ID: {user?.id || "-"}</div>
                    <button type="button" className="nav__logout" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="nav__btn nav__btn--ghost" onClick={() => setOpen(false)}>
                  Login
                </Link>
                <Link to="/signup" className="nav__btn" onClick={() => setOpen(false)}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Hamburger */}
        <button
          className={`nav__toggle ${open ? "is-open" : ""}`}
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
          aria-controls="navmenu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
