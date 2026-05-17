import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Cashier from './pages/Cashier'
import MobilePay from './pages/MobilePay'

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-400 selection:bg-emerald-500 selection:text-white">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cashier" element={<Cashier />} />
        <Route path="/mobile-pay" element={<MobilePay />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

