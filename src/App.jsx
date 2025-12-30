// นำเข้า React Router DOM สำหรับจัดการ routing
import { Routes, Route, Navigate } from 'react-router-dom'
// นำเข้า Navigation component สำหรับแสดงเมนูนำทาง
// import Navigation from './components/Navigation' from './components/Navigation'
// นำเข้า Admin component สำหรับหน้า Admin
import Admin from './pages/Admin'
// นำเข้า User component สำหรับหน้า User
import User from './pages/User'
import Login from './pages/Login'
// นำเข้า CSS สำหรับ App component
import './App.css'

/**
 * App Component - Component หลักของแอปพลิเคชัน
 * ทำหน้าที่จัดการ routing และแสดง Navigation bar
 */
function App() {
  return (
    <div className="app">
      {/* แสดง Navigation bar ที่ด้านบนของทุกหน้า */}
      {/* <Navigation /> */}

      {/* กำหนด Routes สำหรับการนำทางระหว่างหน้า */}
      <Routes>
        {/* Route หลัก (/) จะ redirect ไปที่หน้า Login แทน User */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Route สำหรับหน้า Login */}
        <Route path="/login" element={<Login />} />

        {/* Route สำหรับหน้า User */}
        <Route path="/user" element={<User />} />

        {/* Route สำหรับหน้า Admin */}
        <Route path="/admin" element={<Admin />} />

      </Routes>
    </div>
  )
}

export default App
