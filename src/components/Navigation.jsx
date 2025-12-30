// นำเข้า Link และ useLocation จาก react-router-dom
// Link ใช้สำหรับสร้างลิงก์ที่สามารถนำทางได้โดยไม่ reload หน้า
// useLocation ใช้สำหรับตรวจสอบ path ปัจจุบัน
import { Link, useLocation } from 'react-router-dom'
// นำเข้า CSS สำหรับ Navigation component
import './Navigation.css'

/**
 * Navigation Component - Component สำหรับแสดงเมนูนำทาง
 * แสดงที่ด้านบนของทุกหน้าและมีลิงก์ไปยังหน้า User และ Admin
 */
function Navigation() {
  // ใช้ useLocation hook เพื่อดึง path ปัจจุบัน
  // เพื่อใช้ในการ highlight หน้า active
  const location = useLocation()

  return (
    <nav className="navigation">
      <div className="nav-container">
        {/* ส่วนแสดงชื่อแอปพลิเคชัน */}
        <div className="nav-brand">
          <h2>Calendar App</h2>
        </div>
        
        {/* ส่วนแสดงลิงก์เมนู
        <div className="nav-links">
          {/* ลิงก์ไปยังหน้า User 
          <Link
            to="/user"
            // เพิ่ม class 'active' ถ้า path ปัจจุบันคือ /user
            className={`nav-link ${location.pathname === '/user' ? 'active' : ''}`}
          >
            หน้า User
          </Link>
          
          ลิงก์ไปยังหน้า Admin
          <Link
            to="/admin"
            // เพิ่ม class 'active' ถ้า path ปัจจุบันคือ /admin
            className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
          >
            หน้า Admin
          </Link>
        </div> */}
      </div>
    </nav>
  )
}

export default Navigation

