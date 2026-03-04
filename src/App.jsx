import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Navbar from './Navbar/Navbar';
import Home from "./Home/Home";
import DoctForm from "./doct/Doct";
import Manifest from "./Manifest/Manifest";
import Data from "./Data/Data";
import CompanyData from "./Data/Company_Data";
import About from "./Abuot/About";
import Contact from "./Contact/Contact";
import Login from "./login-signup/Login";
import Signup from "./login-signup/Signup";
import AdminPanel from "./admin/AdminPanel";

function readAuthUser() {
  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function ProtectedRoute({ element }) {
  const user = readAuthUser();
  return user ? element : <Navigate to="/login" replace />;
}

function AdminRoute({ element }) {
  const user = readAuthUser();
  if (!user) return <Navigate to="/login" replace />;
  return user.accountType === "admin" ? element : <Navigate to="/home" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/doct" element={<ProtectedRoute element={<DoctForm />} />} />
        <Route path="/manifest" element={<ProtectedRoute element={<Manifest />} />} />
        <Route path="/data" element={<ProtectedRoute element={<Data />} />} />
        <Route path="/company-data" element={<ProtectedRoute element={<CompanyData />} />} />
        <Route path="/about" element={<ProtectedRoute element={<About />} />} />
        <Route path="/contact" element={<ProtectedRoute element={<Contact />} />} />
        <Route path="/admin" element={<AdminRoute element={<AdminPanel />} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
