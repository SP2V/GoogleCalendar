// นำเข้า StrictMode จาก React เพื่อช่วยตรวจสอบปัญหาต่างๆ ในระหว่างพัฒนา
import { StrictMode } from 'react'
// นำเข้า createRoot จาก react-dom/client สำหรับสร้าง root และ render component
import { createRoot } from 'react-dom/client'
// นำเข้า BrowserRouter จาก react-router-dom สำหรับจัดการ routing ด้วย URL
import { BrowserRouter } from 'react-router-dom'
// นำเข้า CSS หลักของแอปพลิเคชัน
import './index.css'
// นำเข้า App component หลัก
import App from './App.jsx'

/**
 * จุดเริ่มต้นของแอปพลิเคชัน
 * - สร้าง root element และ render App component ลงใน DOM
 * - ใช้ StrictMode เพื่อช่วยตรวจสอบปัญหาในโหมด development
 * - ใช้ BrowserRouter เพื่อให้สามารถใช้ routing ได้
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter ครอบ App เพื่อให้สามารถใช้ routing ได้ */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
