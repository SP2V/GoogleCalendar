import React, { useState, useEffect, useRef } from 'react';
import './Admin.css';
import TimeDropdown from "../components/AdminDropdown";
import PopupModal from "../components/PopupModal";
import ErrorPopup from "../components/ErrorPopup";
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'; // Added
import {
  auth,
  db,
  subscribeSchedules,
  addScheduleDoc,
  deleteScheduleById,
  updateScheduleDoc,
  subscribeActivityTypes,
  addActivityType,
  updateActivityType,
  deleteActivityType,
  subscribeBookings,   // Import for Sync
  updateBookingDoc,    // Import for Sync
} from '../services/firebase';
import { createCalendarEvent } from '../services/calendarService'; // Import Calendar Service
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { History, LogOut, AlarmClock, Calendar as LucideCalendar, Clock, Trash2, Edit2, X, ChevronLeft, ChevronRight, Settings, UserPlus } from 'lucide-react';
import { TbTimezone } from "react-icons/tb";


// --------------------------- ICONS ---------------------------
// --- ICONS ---
const CalendarIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const Plus = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ChevronDown = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none">
    <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
// Icon Palette (จานสี)
const Palette = ({ className = '', ...props }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

const LinkIcon = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

// Helper: แปลงเวลา "HH:mm" เป็นนาที (เพื่อคำนวณ)
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

// Helper: Match Hex to Google Color ID
const mapHexToGoogleColorId = (hex) => {
  if (!hex) return '7'; // Default Peacock (Blue)

  // Google Calendar Colors
  const colors = {
    1: '#7986cb', // Lavender
    2: '#33b679', // Sage
    3: '#8e24aa', // Grape
    4: '#e67c73', // Flamingo
    5: '#f6c026', // Banana
    6: '#f5511d', // Tangerine
    7: '#039be5', // Peacock
    8: '#616161', // Graphite
    9: '#3f51b5', // Blueberry
    10: '#0b8043', // Basil
    11: '#d50000'  // Tomato
  };

  const hexToRgb = (h) => {
    let r = 0, g = 0, b = 0;
    // 3 digits
    if (h.length === 4) {
      r = parseInt("0x" + h[1] + h[1]);
      g = parseInt("0x" + h[2] + h[2]);
      b = parseInt("0x" + h[3] + h[3]);
    } else if (h.length === 7) {
      r = parseInt("0x" + h[1] + h[2]);
      g = parseInt("0x" + h[3] + h[4]);
      b = parseInt("0x" + h[5] + h[6]);
    }
    return { r, g, b };
  };

  const target = hexToRgb(hex);
  let minDiff = Infinity;
  let bestId = '7';

  Object.entries(colors).forEach(([id, cHex]) => {
    const cRgb = hexToRgb(cHex);
    // Euclidean distance usually sufficient for simple mapping
    const diff = Math.sqrt(
      Math.pow(target.r - cRgb.r, 2) +
      Math.pow(target.g - cRgb.g, 2) +
      Math.pow(target.b - cRgb.b, 2)
    );
    if (diff < minDiff) {
      minDiff = diff;
      bestId = id;
    }
  });

  return bestId;
};

const Admin = () => {
  const [schedules, setSchedules] = useState([]);
  const [types, setTypes] = useState(['เลือกประเภทกิจกรรม']);
  const [activityTypes, setActivityTypes] = useState([]);
  const [formData, setFormData] = useState({ type: '', days: [], startTime: '', endTime: '', duration: '' });

  const [newType, setNewType] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');

  const [editItem, setEditItem] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);

  // Edit Activity Type States
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [editingTypeColor, setEditingTypeColor] = useState('#3B82F6'); // เพิ่ม state สำหรับสีที่กำลังแก้ไข

  const [customDuration, setCustomDuration] = useState('');
  const [currentSchedulePage, setCurrentSchedulePage] = useState(1);
  const [currentTypePage, setCurrentTypePage] = useState(1);
  const [activityFilter, setActivityFilter] = useState('แสดงทั้งหมด');
  const itemsPerPageLeft = 4;
  const itemsPerPageRight = 5;
  const [popupMessage, setPopupMessage] = useState({ type: '', message: '' });

  // Admin Accounts Management
  const [adminAccounts, setAdminAccounts] = useState([]);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);

  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

  const timeOptions = (() => {
    const opts = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 5) {
        opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return opts;
  })();

  const durationOptions = ['30 นาที', '1 ชั่วโมง', '1.5 ชั่วโมง', '2 ชั่วโมง', '3 ชั่วโมง'];

  // --------------------------- AUTH & PROFILE ---------------------------
  const [currentUser, setCurrentUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const profileRef = useRef(null);
  // const navigate = useNavigate(); // keeping getting deleted/added, careful

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const role = localStorage.getItem('sessionRole');
      if (user && role === 'admin') {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
        // Redirect if not authorized
        window.location.href = '/admin-login';
      }
    });
    return () => unsubscribe();
  }, []);

  // --------------------------- FETCH DATA ---------------------------
  useEffect(() => {
    if (!currentUser) {
      setSchedules([]);
      setActivityTypes([]);
      setTypes(['เลือกประเภทกิจกรรม']);
      return;
    }

    const unsubSchedules = subscribeSchedules(setSchedules, currentUser.email);
    const unsubTypes = subscribeActivityTypes((fetchedTypes) => {
      setActivityTypes(fetchedTypes);
      setTypes(['เลือกประเภทกิจกรรม', ...fetchedTypes.map(t => t.name)]);
    }, currentUser.email);

    return () => {
      unsubSchedules();
      unsubTypes();
    };
  }, [currentUser]);

  // --------------------------- SYNC BOOKINGS (Admin Calendar) - DEPRECATED (Moved to Server) ---------------------------
  /* 
  useEffect(() => {
    // ... Client-side sync logic removed/commented out to prevent duplicates with server-side sync ...
  }, [currentUser, activityTypes]);
  */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoutClick = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('isAdminLoggedIn');
      localStorage.removeItem('sessionRole'); // Clear session
      window.location.href = '/admin-login';
    } catch (error) {
      console.error('Logout error:', error);
      setPopupMessage({ type: 'error', message: 'ออกจากระบบไม่สำเร็จ' });
    }
  };

  // --------------------------- AUTO CLOSE POPUP ---------------------------
  useEffect(() => {
    if (popupMessage.type === 'success') {
      const timer = setTimeout(() => {
        setPopupMessage({ type: '', message: '' });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [popupMessage]);

  // --------------------------- FETCH ADMIN ACCOUNTS ---------------------------
  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to adminSettings to get list of synchronized accounts
    const settingsRef = doc(db, 'systemConfig', 'adminSettings');
    const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let accounts = data.accounts || [];

        // Fallback for legacy single account
        if (accounts.length === 0 && data.refresh_token) {
          accounts.push({
            email: data.adminEmail,
            refresh_token: data.refresh_token
          });
        }
        setAdminAccounts(accounts);
      }
    }, (error) => {
      console.error("Error fetching admin accounts:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleDisconnectAccount = async (emailToRemove) => {
    if (!window.confirm(`ต้องการยกเลิกการเชื่อมต่อกับบัญชี ${emailToRemove} ใช่หรือไม่?`)) return;

    try {
      const newAccounts = adminAccounts.filter(acc => acc.email !== emailToRemove);
      await updateDoc(doc(db, 'systemConfig', 'adminSettings'), {
        accounts: newAccounts
      });
      setPopupMessage({ type: 'success', message: 'ยกเลิกการเชื่อมต่อบัญชีสำเร็จ' });
    } catch (error) {
      console.error("Error disconnecting account:", error);
      setPopupMessage({ type: 'error', message: 'เกิดข้อผิดพลาดในการยกเลิกบัญชี' });
    }
  };

  const handleConnectNewAccount = () => {
    // Redirect to server auth flow
    window.location.href = 'http://localhost:3000/auth/google';
  };

  // --------------------------- VALIDATION ---------------------------
  const validateForm = () => {
    if (formData.type === '' || formData.type === 'เลือกประเภทกิจกรรม') {
      setPopupMessage({ type: 'error', message: 'กรุณาเลือกประเภทกิจกรรม' });
      return false;
    }
    if (formData.days.length === 0) {
      setPopupMessage({ type: 'error', message: 'กรุณาเลือกวันทำกิจกรรม' });
      return false;
    }
    if (!formData.startTime) {
      setPopupMessage({ type: 'error', message: 'กรุณาเลือกเวลาเริ่มต้น' });
      return false;
    }
    if (!formData.endTime) {
      setPopupMessage({ type: 'error', message: 'กรุณาเลือกเวลาสิ้นสุด' });
      return false;
    }
    return true;
  };

  // --------------------------- SAVE (ADD & UPDATE) ---------------------------
  const handleSave = async () => {
    if (!validateForm()) return;

    // 1. ตรวจสอบว่าเวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด
    const newStartMin = timeToMinutes(formData.startTime);
    const newEndMin = timeToMinutes(formData.endTime);

    if (newStartMin >= newEndMin) {
      setPopupMessage({ type: 'error', message: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น' });
      return;
    }

    const shortDayMap = {
      'อาทิตย์': 'อา.', 'จันทร์': 'จ.', 'อังคาร': 'อ.', 'พุธ': 'พ.',
      'พฤหัสบดี': 'พฤ.', 'ศุกร์': 'ศ.', 'เสาร์': 'ส.'
    };

    // --- ส่วน Overlap Check ถูกลบออกเพื่อให้สามารถจองซ้ำได้ ---

    // 3. บันทึกข้อมูล
    try {
      if (editItem) {
        if (editItem.ids && Array.isArray(editItem.ids)) {
          await Promise.all(editItem.ids.map(id => deleteScheduleById(id)));
        } else {
          await deleteScheduleById(editItem.id);
        }
      }

      let durationValue = formData.duration || '';
      if (formData.duration === 'Custom' && customDuration) {
        durationValue = customDuration;
      }

      const newSchedules = formData.days.map(day => ({
        day: shortDayMap[day] || day,
        type: formData.type,
        time: `${formData.startTime} - ${formData.endTime}`,
        duration: durationValue,
        createdDate: new Date().toISOString(),
        ownerEmail: currentUser?.email // Save Owner Email
      }));

      await Promise.all(newSchedules.map(s => addScheduleDoc(s)));
      setFormData({ type: '', days: [], startTime: '', endTime: '', duration: '' });
      setCustomDuration('');

      setPopupMessage({ type: 'success', message: editItem ? 'อัปเดตข้อมูลสำเร็จ' : 'บันทึกข้อมูลสำเร็จ' });
      setEditItem(null);
    } catch (err) {
      console.error(err);
      setPopupMessage({ type: 'error', message: 'เกิดข้อผิดพลาดในการบันทึก' });
    }
  };

  const handleDeleteGroup = async (ids) => {
    if (window.confirm(`คุณต้องการลบรายการกิจกรรมทั้งหมด ${ids.length} วันนี้ใช่หรือไม่?`)) {
      try {
        await Promise.all(ids.map(id => deleteScheduleById(id)));
        setPopupMessage({ type: 'success', message: 'ลบข้อมูลตารางเวลาสำเร็จ' });
      } catch (err) {
        console.error(err);
        setPopupMessage({ type: 'error', message: 'เกิดข้อผิดพลาดในการลบ' });
      }
    }
  };

  // --------------------------- ADD NEW TYPE ---------------------------
  const handleAddType = async () => {
    const trimmed = newType.trim();
    if (trimmed && !types.includes(trimmed)) {
      try {
        await addActivityType(trimmed, newColor, currentUser?.email);
        setFormData({ ...formData, type: trimmed });
        setNewType('');
        setNewColor('#3B82F6');
        setPopupMessage({ type: 'success', message: 'เพิ่มประเภทกิจกรรมสำเร็จ' });
      } catch (err) {
        console.error(err);
        setPopupMessage({ type: 'error', message: `เกิดข้อผิดพลาด: ${err.message}` });
      }
    }
  };

  // --------------------------- TOGGLE DAY ---------------------------
  const toggleDay = day => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  // --------------------------- EDIT ACTIVITY TYPE ---------------------------
  const handleEditType = (type) => {
    setEditingTypeId(type.id);
    setEditingTypeName(type.name);
    setEditingTypeColor(type.color || '#3B82F6'); // กำหนดค่าสีเริ่มต้นเมื่อกดแก้ไข
  };

  const handleSaveType = async () => {
    if (!editingTypeName.trim() || !editingTypeId) return;

    // 1. หาข้อมูลเดิมก่อน เพื่อเอาชื่อเก่ามาเทียบ
    const oldTypeObj = activityTypes.find(t => t.id === editingTypeId);
    const oldName = oldTypeObj ? oldTypeObj.name : '';
    const newName = editingTypeName.trim();
    // สีใหม่มาจาก editingTypeColor

    try {
      // 2. อัปเดตชื่อและสีใน Master List (Activity Types)
      // ส่ง editingTypeColor ไปด้วย
      await updateActivityType(editingTypeId, newName, editingTypeColor);

      // 3. (สำคัญ) ถ้าชื่อเปลี่ยน ให้ไปอัปเดตใน Schedules ทั้งหมดที่ใช้ชื่อเก่า
      // (สีไม่ต้อง cascade เพราะ schedules ไม่ได้เก็บสีโดยตรง มัน lookup จากชื่อ/type)
      if (oldName && oldName !== newName) {
        const schedulesToUpdate = schedules.filter(s => s.type === oldName);

        // สั่งอัปเดตทั้งหมดพร้อมกัน
        if (schedulesToUpdate.length > 0) {
          await Promise.all(schedulesToUpdate.map(schedule =>
            updateScheduleDoc(schedule.id, { type: newName })
          ));
        }
      }

      setEditingTypeId(null);
      setEditingTypeName('');
      setEditingTypeColor('#3B82F6');
      setPopupMessage({ type: 'success', message: 'แก้ไขข้อมูลสำเร็จ' });
    } catch (err) {
      console.error(err);
      setPopupMessage({ type: 'error', message: 'เกิดข้อผิดพลาดในการแก้ไข' });
    }
  };

  const handleCancelEditType = () => {
    setEditingTypeId(null);
    setEditingTypeName('');
    setEditingTypeColor('#3B82F6');
  };

  const handleDeleteActivityType = async (id) => {
    if (window.confirm("คุณต้องการลบประเภทกิจกรรมนี้ใช่หรือไม่?")) {
      try {
        await deleteActivityType(id);
        setPopupMessage({ type: 'success', message: 'ลบประเภทกิจกรรมสำเร็จ' });
      } catch (err) {
        console.error(err);
        setPopupMessage({ type: 'error', message: 'เกิดข้อผิดพลาดในการลบ' });
      }
    }
  };

  // --------------------------- RENDER ---------------------------
  return (
    <div className="admin-schedule-container">
      <div className="admin-schedule-wrapper">

        {/* HEADER */}
        <div className="header-card">
          <div className="header-top-row">
            <div className="header-content">
              <div className="header-icon"><CalendarIcon className="icon" /></div>
              <div>
                <h1 className="header-title">Admin Schedule Management</h1>
                <p className="header-subtitle">
                  {isViewMode ? 'ดูรายการกิจกรรมทั้งหมด' : 'จัดการตารางเวลาและกิจกรรม'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                className="session-toggle-btn"
                onClick={() => {
                  const adminEmail = currentUser?.email || '';
                  const url = `${window.location.origin}/login?admin=${encodeURIComponent(adminEmail)}`;
                  navigator.clipboard.writeText(url).then(() => {
                    setPopupMessage({ type: 'success', message: 'คัดลอกลิงก์เรียบร้อยแล้ว' });
                  }).catch(err => {
                    console.error('Failed to copy: ', err);
                    setPopupMessage({ type: 'error', message: 'ไม่สามารถคัดลอกลิงก์ได้' });
                  });
                }}
                style={{ backgroundColor: '#3b82f6' }} // Green color to distinguish
              >
                <span>คัดลอกลิงก์</span>
              </button>


              <button className="session-toggle-btn" onClick={() => setIsViewMode(!isViewMode)}>
                {isViewMode ? 'กลับไปหน้าจัดการ' : 'ดูรายการกิจกรรม'}
              </button>

              {/* Profile Badge */}
              <div className="user-profile-container" ref={profileRef} style={{ position: 'relative', zIndex: 100 }}>
                <button
                  className="user-profile-badge"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  style={{ position: 'relative', top: 0, right: 0, padding: 0, overflow: 'hidden', }}
                >
                  {currentUser && currentUser.photoURL && !imgError ? (
                    <img
                      src={currentUser.photoURL}
                      alt="Profile"
                      className="profile-avatar"
                      style={{ width: '90%', height: '90%', objectFit: 'cover', borderRadius: '50%' }}
                      referrerPolicy="no-referrer"
                      onError={(e) => setImgError(true)}
                    />
                  ) : (
                    <div className="profile-avatar">
                      {currentUser && currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'SC'}
                    </div>
                  )}
                </button>

                {/* Dropdown Menu */}
                {isProfileOpen && (
                  <div className="profile-dropdown-menu">
                    <div className="dropdown-header-info">
                      {currentUser && currentUser.photoURL ? (
                        <img src={currentUser.photoURL} alt="Profile" className="profile-avatar sm" style={{ borderRadius: '50%' }} />
                      ) : (
                        <div className="profile-avatar sm">SC</div>
                      )}
                      <div className="profile-info">
                        <span className="profile-name">{currentUser ? currentUser.displayName : 'Guest'}</span>
                        <span className="profile-email">{currentUser ? currentUser.email : '-'}</span>
                      </div>
                    </div>

                    <div className="dropdown-divider"></div>

                    {/* 
                    // Optional: Restore these if implementing Admin History/Settings later
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsViewMode(true); 
                        setIsProfileOpen(false);
                      }}
                    >
                      <History size={18} />
                      <span>ประวัติการนัดหมาย</span>
                    </button>
                    */}

                    <button className="dropdown-item" onClick={() => { setIsAccountsModalOpen(true); setIsProfileOpen(false); }}>
                      <Settings size={18} />
                      <span>จัดการบัญชีที่เชื่อมต่อ</span>
                    </button>

                    <button className="dropdown-item logout" onClick={handleLogoutClick}>
                      <LogOut size={18} />
                      <span>ออกจากระบบ</span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        {!isViewMode ? (
          <div className="form-card">
            <div className="form-header">
              <Plus className="form-icon" />
              <h2 className="form-title">{editItem ? 'แก้ไขกิจกรรม' : 'กำหนดช่วงเวลากิจกรรม'}</h2>
            </div>

            <div className="form-content">
              {/* TYPE */}
              <div className="form-group">
                <label className="form-label">ประเภทกิจกรรม</label>
                <div className="type-inline-row">
                  <div className="select-wrapper type-select" style={{ flex: 1 }}>
                    <TimeDropdown
                      value={formData.type}
                      onChange={selectedType => setFormData({ ...formData, type: selectedType })}
                      timeOptions={types.filter(t => t !== 'เลือกประเภทกิจกรรม')}
                      placeholder="เลือกประเภทกิจกรรม"
                    />
                  </div>

                  {/* ADD NEW */}
                  <div className="input-with-icon-wrapper" style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="เพิ่มกิจกรรมใหม่..."
                      value={newType}
                      onChange={e => setNewType(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleAddType()}
                      className="add-activity-input"
                      style={{ paddingRight: '40px', width: '100%' }}
                    />
                    <div className="color-picker-container">
                      <input
                        type="color"
                        id="activityColorPickerMain"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        className="hidden-color-input"
                      />
                      <label htmlFor="activityColorPickerMain" className="color-icon-label" title="เลือกสี">
                        <Palette
                          className="w-5 h-5"
                          style={{ color: newColor, fill: newColor, opacity: 0.8, width: '20px', height: '20px' }}
                        />
                      </label>
                    </div>
                  </div>

                  <button type="button" onClick={handleAddType} className="add-activity-btn">
                    <Plus className="button-icon" /> เพิ่ม
                  </button>
                </div>
              </div>

              {/* DAYS */}
              <div className="form-group">
                <label className="form-label">วัน <span className="form-label-hint">(เลือกได้มากกว่า 1 วัน)</span></label>
                <div className="day-buttons">
                  {days.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`day-button ${formData.days.includes(day) ? 'day-button-active' : ''}`}
                    >{day}</button>
                  ))}
                </div>
              </div>

              {/* TIME */}
              <div className="time-grid">
                <div className="form-group">
                  <label className="form-label">เวลาเริ่ม</label>
                  {/* ไม่ส่ง prop bookedSlots เพื่อปลดล็อกการแสดงผลสีเทา */}
                  <TimeDropdown
                    value={formData.startTime}
                    onChange={time => setFormData({ ...formData, startTime: time })}
                    timeOptions={timeOptions}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">เวลาสิ้นสุด</label>
                  {/* ไม่ส่ง prop bookedSlots เพื่อปลดล็อกการแสดงผลสีเทา */}
                  <TimeDropdown
                    value={formData.endTime}
                    onChange={time => setFormData({ ...formData, endTime: time })}
                    timeOptions={timeOptions}
                  />
                </div>
              </div>

              {/* SAVE BUTTON */}
              <button onClick={handleSave} className="submit-button">
                {editItem ? 'อัปเดต' : 'บันทึก'}
              </button>
            </div>
          </div>
        ) : (
          <div className="list-card">
            <h2 className="form-title">รายการกิจกรรมทั้งหมด</h2>

            <div className="list-content-grid">
              {/* Left Column: Activity Types */}
              <div className="list-column-card">
                <h3 style={{ fontSize: '1rem', marginBottom: '1rem', marginTop: '0', color: '#333' }}>กิจกรรม</h3>
                {(() => {
                  const typeTotalPages = Math.ceil(activityTypes.length / itemsPerPageLeft) || 1;
                  const typeStartIndex = (currentTypePage - 1) * itemsPerPageLeft;
                  const currentTypes = activityTypes.slice(typeStartIndex, typeStartIndex + itemsPerPageLeft);

                  return (
                    <>
                      <div className="schedule-list">
                        <div className='schedule-list-add-input' style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div className="input-with-icon-wrapper" style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="เพิ่มกิจกรรมใหม่..."
                              value={newType}
                              onChange={e => setNewType(e.target.value)}
                              onKeyPress={e => e.key === 'Enter' && handleAddType()}
                              className="add-activity-input"
                              style={{ paddingRight: '40px', width: '100%' }}
                            />
                            <div className="color-picker-container">
                              <input
                                type="color"
                                id="activityColorPickerList"
                                value={newColor}
                                onChange={(e) => setNewColor(e.target.value)}
                                className="hidden-color-input"
                              />
                              <label htmlFor="activityColorPickerList" className="color-icon-label" title="เลือกสี">
                                <Palette
                                  className="w-5 h-5"
                                  style={{ color: newColor, fill: newColor, opacity: 0.8, width: '20px', height: '20px' }}
                                />
                              </label>
                            </div>
                          </div>
                          <button type="button" onClick={handleAddType} className="add-activity-btn" style={{ flexShrink: 0 }}>
                            <Plus className="button-icon" /> เพิ่ม
                          </button>
                        </div>

                        {/* ... ส่วน loop activityTypes ... */}
                        {activityTypes.length > 0 ? currentTypes.map(type => (
                          <div key={type.id} className="schedule-item">
                            {editingTypeId === type.id ? (
                              <>
                                {/* --- ส่วนที่แก้ไข: ปรับ UI ให้เหมือนช่อง Add New --- */}
                                <div className="schedule-info" style={{ flex: 1, paddingRight: '10px' }}>
                                  <div className="input-with-icon-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                                    <input
                                      type="text"
                                      value={editingTypeName}
                                      onChange={e => setEditingTypeName(e.target.value)}
                                      onKeyPress={e => {
                                        if (e.key === 'Enter') handleSaveType();
                                        if (e.key === 'Escape') handleCancelEditType();
                                      }}
                                      className="add-activity-input" // ใช้ class เดียวกับช่อง Add
                                      style={{ paddingRight: '40px', width: '100%' }}
                                      autoFocus
                                    />

                                    {/* Color Picker Icon แบบเดียวกับช่อง Add */}
                                    <div className="color-picker-container" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                                      <input
                                        type="color"
                                        id={`editColor-${type.id}`}
                                        value={editingTypeColor}
                                        onChange={(e) => setEditingTypeColor(e.target.value)}
                                        className="hidden-color-input"
                                      />
                                      <label htmlFor={`editColor-${type.id}`} className="color-icon-label" title="เลือกสี" style={{ cursor: 'pointer', display: 'flex' }}>
                                        <Palette
                                          className="w-5 h-5"
                                          style={{
                                            color: editingTypeColor,
                                            fill: editingTypeColor,
                                            opacity: 0.8,
                                            width: '20px',
                                            height: '20px'
                                          }}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                </div>
                                {/* ----------------------------------------------- */}

                                <div className="schedule-actions">
                                  <button className="action-button action-edit" onClick={handleSaveType}>บันทึก</button>
                                  <button className="action-button action-delete" onClick={handleCancelEditType}>ยกเลิก</button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="schedule-info" style={{ display: 'flex', alignItems: 'center' }}>
                                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: type.color || '#e5e7eb', marginRight: '10px', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                                  <p className="schedule-type" style={{ margin: 0 }}>{type.name}</p>
                                </div>
                                <div className="schedule-actions">
                                  <button className="action-button action-edit" onClick={() => handleEditType(type)}>แก้ไข</button>
                                  <button className="action-button action-delete" onClick={() => handleDeleteActivityType(type.id)}>ลบ</button>
                                </div>
                              </>
                            )}
                          </div>
                        )) : (
                          <p className="empty-state">ยังไม่มีกิจกรรมที่บันทึกไว้</p>
                        )}
                      </div>

                      {activityTypes.length > itemsPerPageLeft && (
                        <div className="pagination-controls">
                          <button
                            className="pagination-button"
                            onClick={() => setCurrentTypePage(prev => Math.max(1, prev - 1))}
                            disabled={currentTypePage === 1}
                          >← ก่อนหน้า</button>
                          <span className="pagination-info">หน้า {currentTypePage} จาก {typeTotalPages}</span>
                          <button
                            className="pagination-button"
                            onClick={() => setCurrentTypePage(prev => Math.min(typeTotalPages, prev + 1))}
                            disabled={currentTypePage === typeTotalPages}
                          >ถัดไป →</button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Right Column: Schedule List */}
              <div className="list-column-card">
                <div className="list-row-card">
                  <h3 style={{ fontSize: '1rem', marginBottom: '1rem', marginTop: '0', color: '#333' }}>ตารางเวลากิจกรรม</h3>
                  <div className="w-36">
                    <TimeDropdown
                      value={activityFilter}
                      onChange={(value) => {
                        setActivityFilter(value);
                        setCurrentSchedulePage(1);
                      }}
                      timeOptions={['แสดงทั้งหมด', ...new Set(schedules.map(item => item.type))]}
                      placeholder="กรองกิจกรรม"
                    />
                  </div>
                </div>

                {(() => {
                  // 1. กรองข้อมูล
                  const filteredSchedules = activityFilter === 'แสดงทั้งหมด'
                    ? schedules
                    : schedules.filter(item => item.type === activityFilter);

                  // 2. กำหนดลำดับวัน
                  const dayOrder = { 'อา.': 0, 'จ.': 1, 'อ.': 2, 'พ.': 3, 'พฤ.': 4, 'ศ.': 5, 'ส.': 6 };

                  // 3. Grouping Logic
                  const groupedMap = {};
                  filteredSchedules.forEach(item => {
                    const key = `${item.type}|${item.time}|${item.duration}`;
                    if (!groupedMap[key]) {
                      groupedMap[key] = {
                        ...item,
                        days: [item.day],
                        ids: [item.id]
                      };
                    } else {
                      if (!groupedMap[key].days.includes(item.day)) {
                        groupedMap[key].days.push(item.day);
                      }
                      groupedMap[key].ids.push(item.id);
                    }
                  });
                  let groupedSchedules = Object.values(groupedMap);

                  // 4. Sort
                  groupedSchedules = groupedSchedules.sort((a, b) => {
                    // Sort days inside group
                    a.days.sort((d1, d2) => (dayOrder[d1] || 99) - (dayOrder[d2] || 99));
                    b.days.sort((d1, d2) => (dayOrder[d1] || 99) - (dayOrder[d2] || 99));

                    // Sort by first day
                    const firstDayA = dayOrder[a.days[0]] || 99;
                    const firstDayB = dayOrder[b.days[0]] || 99;
                    if (firstDayA !== firstDayB) return firstDayA - firstDayB;

                    // Sort by type
                    const typeCompare = a.type.localeCompare(b.type, 'th');
                    if (typeCompare !== 0) return typeCompare;

                    // Sort by time
                    return a.time.localeCompare(b.time);
                  });

                  // 5. Pagination
                  const totalPages = Math.ceil(groupedSchedules.length / itemsPerPageRight) || 1;
                  const startIndex = (currentSchedulePage - 1) * itemsPerPageRight;
                  const endIndex = startIndex + itemsPerPageRight;
                  const currentSchedules = groupedSchedules.slice(startIndex, endIndex);

                  return (
                    <>
                      <div className="schedule-list">
                        {groupedSchedules.length > 0 ? currentSchedules.map((item, index) => {
                          const activityColor = activityTypes.find(t => t.name === item.type)?.color || '#e5e7eb';

                          return (
                            <div key={`${item.type}-${item.time}-${index}`} className="schedule-item">
                              <div className="schedule-info">
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                                  <div
                                    style={{
                                      width: '12px',
                                      height: '12px',
                                      borderRadius: '50%',
                                      backgroundColor: activityColor,
                                      marginRight: '8px',
                                      border: '1px solid rgba(0,0,0,0.1)'
                                    }}
                                  />
                                  <p className="schedule-type" style={{ margin: 0 }}>{item.type}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                  {item.days.map(d => (
                                    <div key={d} className="schedule-day-badge">{d}</div>
                                  ))}
                                </div>
                                <p className="schedule-time">{item.time}</p>
                              </div>

                              <div className="schedule-actions">
                                <button
                                  className="action-button action-edit"
                                  onClick={() => {
                                    setEditItem(item);
                                    const fullDayMap = { 'อา.': 'อาทิตย์', 'จ.': 'จันทร์', 'อ.': 'อังคาร', 'พ.': 'พุธ', 'พฤ.': 'พฤหัสบดี', 'ศ.': 'ศุกร์', 'ส.': 'เสาร์' };
                                    const fullDays = item.days.map(d => fullDayMap[d] || d);

                                    const [startTime, endTime] = item.time.split(' - ');
                                    const duration = item.duration || '';

                                    if (duration && !durationOptions.includes(duration)) {
                                      setCustomDuration(duration);
                                      setFormData({ type: item.type, days: fullDays, startTime, endTime, duration: 'Custom' });
                                    } else {
                                      setCustomDuration('');
                                      setFormData({ type: item.type, days: fullDays, startTime, endTime, duration });
                                    }
                                    setIsViewMode(false);
                                  }}
                                >แก้ไข</button>
                                <button className="action-button action-delete" onClick={() => handleDeleteGroup(item.ids)}>ลบ</button>
                              </div>
                            </div>
                          );
                        }) : (
                          <div className="empty-state">ยังไม่มีข้อมูลตารางเวลา</div>
                        )}
                      </div>

                      {groupedSchedules.length > itemsPerPageRight && (
                        <div className="pagination-controls">
                          <button
                            className="pagination-button"
                            onClick={() => setCurrentSchedulePage(prev => Math.max(1, prev - 1))}
                            disabled={currentSchedulePage === 1}
                          >← ก่อนหน้า</button>
                          <span className="pagination-info">หน้า {currentSchedulePage} จาก {totalPages}</span>
                          <button
                            className="pagination-button"
                            onClick={() => setCurrentSchedulePage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentSchedulePage === totalPages}
                          >ถัดไป →</button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
      {popupMessage.type === 'success' && (
        <PopupModal
          message={popupMessage.message}
          onClose={() => setPopupMessage({ type: '', message: '' })}
        />
      )}
      {popupMessage.type === 'error' && (
        <ErrorPopup
          message={popupMessage.message}
          onClose={() => setPopupMessage({ type: '', message: '' })}
        />
      )}
      {/* ACCOUNTS MANAGEMENT MODAL */}
      {isAccountsModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">บัญชี Google Calendar ที่เชื่อมต่อ</h3>
              <button className="close-button" onClick={() => setIsAccountsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
                รายการบัญชีที่ระบบจะทำการซิงค์กิจกรรมลงใน Google Calendar
              </p>

              <div className="accounts-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {adminAccounts.map((acc, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 'bold'
                      }}>
                        {acc.email.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.95rem', color: '#1e293b' }}>{acc.email}</span>
                    </div>
                    <button
                      onClick={() => handleDisconnectAccount(acc.email)}
                      style={{
                        padding: '6px',
                        color: '#ef4444',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        display: 'flex', alignItems: 'center'
                      }}
                      title="ยกเลิกการเชื่อมต่อ"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}

                {adminAccounts.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                    ยังไม่มีบัญชีที่เชื่อมต่อ
                  </div>
                )}
              </div>

              <button
                onClick={handleConnectNewAccount}
                style={{
                  width: '100%',
                  marginTop: '20px',
                  padding: '12px',
                  backgroundColor: 'white',
                  border: '1px dashed #3b82f6',
                  color: '#3b82f6',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <UserPlus size={18} />
                <span>เชื่อมต่อบัญชีเพิ่ม</span>
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;