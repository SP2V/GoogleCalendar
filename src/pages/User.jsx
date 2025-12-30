import React, { useState, useEffect, useRef } from 'react';
import './User.css';
import TimeDropdown from "../components/AdminDropdown";
import PopupModal from "../components/PopupModal";
import ErrorPopup from "../components/ErrorPopup";
import BookingPreviewModal from "../components/BookingPreviewModal";
import CustomDurationModal from "../components/CustomDurationModal";
import CancelBookingModal from "../components/CancelBookingModal";
import LogoutModal from "../components/LogoutModal";
import TimezoneModal from "../components/TimezoneModal";
import NotificationView from "../components/NotificationView";
import CustomNotificationView from "../components/CustomNotificationView";
import TimezoneSuccessModal from "../components/TimezoneSuccessModal";
import SuccessToast from "../components/SuccessToast";
import NotificationModal from "../components/NotificationModal";
import { thaiTimezones } from "../constants/timezones";
import {
  subscribeSchedules,
  subscribeActivityTypes,
  addBooking,
  subscribeBookings,
  deleteBooking,
  auth,
  messaging
} from '../services/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase'; // Ensure db is imported
import { useNavigate } from 'react-router-dom';
import { createCalendarEvent, deleteCalendarEvent } from '../services/calendarService';
import { subscribeCustomNotifications, addCustomNotification, deleteCustomNotification, updateCustomNotification, subscribeNotificationHistory } from '../services/customNotificationService';
import { Trash2, Eye, Search, LayoutGrid, List, ChevronLeft, ChevronRight, Plus, ChevronDown, User as UserIcon, History, LogOut, SettingsIcon, Bell, Calendar as CalendarLucide, Clock as ClockLucide, AlarmClock } from 'lucide-react';
import { TbTimezone } from "react-icons/tb";
import { MdOutlineCalendarMonth } from "react-icons/md";
import { FaLink } from "react-icons/fa6";

// --- ICONS (SVG) ---
const CalendarIcon = ({ style }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const ClockIcon = ({ style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);
const FileTextIcon = ({ style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
);
const MonitorIcon = ({ style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
);
const MapPinIcon = ({ style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
);

const User = () => {
  // --- STATES ---
  const [schedules, setSchedules] = useState([]);
  const [types, setTypes] = useState(['เลือกกิจกรรม']);
  const [activityTypes, setActivityTypes] = useState([]);
  const [bookings, setBookings] = useState([]); // New state for bookings
  const [currentUser, setCurrentUser] = useState(null); // Auth State
  const [notificationPopup, setNotificationPopup] = useState({ isOpen: false, title: '', time: '' });
  const [successToast, setSuccessToast] = useState({ isOpen: false, title: '', subTitle: '' });

  // Form State
  const [formData, setFormData] = useState({
    type: '',
    days: [],
    startTime: '',
    endTime: '',
    duration: '',
    subject: '',
    meetingFormat: 'Online',
    location: '',
    description: ''
  });
  const [customDuration, setCustomDuration] = useState('');
  const [customDurationUnit, setCustomDurationUnit] = useState('นาที'); // New state for unit
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [isTimeExpanded, setIsTimeExpanded] = useState(false); // State for Show More functionality
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768); // Responsive state

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Restore Session (Required for Background Notifications)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth State Changed:", user ? user.email : "Logged Out");
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // View/Delete State
  const [viewingBooking, setViewingBooking] = useState(null); // For Viewing Details
  const [cancellingBooking, setCancellingBooking] = useState(null); // For Cancel Modal
  const [imgError, setImgError] = useState(false); // New state for image error handling

  const profileRef = useRef(null);

  // Close profile dropdown when clicking outside
  const notificationRef = useRef(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeNotificationTab, setActiveNotificationTab] = useState('All');

  const [notifications, setNotifications] = useState([]);
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    const saved = localStorage.getItem('readNotificationIds');
    return saved ? JSON.parse(saved) : [];
  });

  // Custom Notifications State
  const [customNotifications, setCustomNotifications] = useState([]);

  useEffect(() => {
    if (currentUser) {
      console.log("User.jsx: Subscribing to notifications for", currentUser.uid);
      const unsub = subscribeCustomNotifications(currentUser.uid, (data) => {
        console.log("User.jsx: Received custom notifications update:", data);
        setCustomNotifications(data);
        latestNotificationsRef.current = data;
      });
      return () => unsub();
    } else {
      setCustomNotifications([]);
    }
  }, [currentUser]);

  // Initial state empty, loaded via effect when user is known
  const [timezoneNotifications, setTimezoneNotifications] = useState([]);

  // Timezone State
  const [selectedTimezone, setSelectedTimezone] = useState(() => {
    return localStorage.getItem('userTimezone') || 'Asia/Bangkok';
  });

  // Re-apply Isolation: Load user-specific timezone
  useEffect(() => {
    if (currentUser?.email) {
      const saved = localStorage.getItem(`userTimezone_${currentUser.email}`);
      if (saved) {
        setSelectedTimezone(saved);
      } else {
        // Fallback to default if no specific setting for this user
        setSelectedTimezone('Asia/Bangkok');
      }
    }
  }, [currentUser]);

  // Load timezone notifications for specific user
  useEffect(() => {
    if (currentUser && currentUser.email) {
      const key = `timezoneNotifications_${currentUser.email}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setTimezoneNotifications(JSON.parse(saved));
      } else {
        setTimezoneNotifications([]);
      }
    } else {
      setTimezoneNotifications([]);
    }
  }, [currentUser]);

  const [notificationHistory, setNotificationHistory] = useState([]);

  useEffect(() => {
    if (currentUser?.uid) {
      const unsub = subscribeNotificationHistory(currentUser.uid, (data) => {
        setNotificationHistory(data);
      });
      return () => unsub();
    } else {
      setNotificationHistory([]);
    }
  }, [currentUser]);

  // Real-time ticker to update notifications every 30 seconds
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000); // Update UI every 1 second for real-time badges
    return () => clearInterval(timer);
  }, []);

  // State to hold the token so we can save it once user is logged in
  const [fcmToken, setFcmToken] = useState(null);

  // 1. Request Notification Permission and FCM Token on Mount
  useEffect(() => {
    const YOUR_PUBLIC_VAPID_KEY_HERE = 'BEHYS-JenESNxWjzJ8OeKTY8_u3MEYo1KjS02m2gIdTiQILiSZi5KaTN5xRYXyHit6-3hc--Aey8QLxgDqxEOnk';
    const setupFCM = async () => {
      // Native Permission Check
      if ("Notification" in window && messaging) {
        try {
          // Request simple permission first
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            // Get Token
            const currentToken = await getToken(messaging, {
              vapidKey: YOUR_PUBLIC_VAPID_KEY_HERE
            });
            if (currentToken) {
              console.log('FCM Token:', currentToken);
              setFcmToken(currentToken); // Store in state common
            }
          }
        } catch (err) {
          console.log('An error occurred while retrieving token. ', err);
        }

        // Handle Foreground Messages
        onMessage(messaging, (payload) => {
          console.log('Message received. ', payload);
          // With Data-Only payload, title/body are in payload.data
          const title = payload.notification?.title || payload.data?.title || 'Notification';
          const body = payload.notification?.body || payload.data?.body || '';

          setNotificationPopup({
            isOpen: true,
            title: title,
            time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
          });

          if (Notification.permission === 'granted') {
            new Notification(title, {
              body: body,
              icon: '/logo192.png'
            });
          }
        });
      }
    };

    setupFCM();
  }, []);

  // 2. Save Token to Firestore ONLY when we have BOTH user and token
  useEffect(() => {
    const saveTokenToDb = async () => {
      if (currentUser && fcmToken) {
        try {
          // Save to 'users' collection used by Vercel Cron
          const userRef = doc(db, 'users', currentUser.uid);
          await setDoc(userRef, { fcmToken: fcmToken }, { merge: true });
          console.log('✅ FCM Token saved to Firestore for user:', currentUser.uid);
        } catch (e) {
          console.error('❌ Error saving FCM Token:', e);
        }
      }
    };
    saveTokenToDb();
  }, [currentUser, fcmToken]);

  useEffect(() => {
    // Generate notifications from bookings
    // Generate notifications from bookings & timezone changes & triggered custom notifications
    if ((!bookings || bookings.length === 0) && timezoneNotifications.length === 0 && notificationHistory.length === 0) {
      setNotifications([]);
      return;
    }

    const now = new Date();
    // Notify only 30 minutes before
    const next30Minutes = new Date(now.getTime() + 30 * 60 * 1000);

    const upcomingBookings = bookings
      .filter(b => {
        if (b.status === 'cancelled') return false;
        const start = new Date(b.startTime);
        // Show if started within last 7 days OR starts in next 30 mins
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return start > oneWeekAgo && start <= next30Minutes && (currentUser && b.email === currentUser.email);
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const bookingNotifications = upcomingBookings.map(b => {
      const start = new Date(b.startTime);
      // const diffMs = start - now;
      const end = new Date(b.endTime);

      let timeDesc = '';
      if (now > end) {
        timeDesc = 'กิจกรรมจบไปแล้ว';
      } else if (now >= start) {
        timeDesc = 'กำลังดำเนินอยู่';
      } else {
        timeDesc = `จะเริ่มในอีก 30 นาที`;
      }

      // Thai Date
      const dateThai = start.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: selectedTimezone });
      const timeThai = start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: selectedTimezone });

      // Eng Date
      const dateEng = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: selectedTimezone });
      const timeEng = start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: selectedTimezone });

      return {
        id: b.id,
        type: 'booking',
        title: b.subject || 'การประชุมกำลังจะเริ่ม',
        desc: timeDesc,
        fullThaiInfo: `${dateThai} เวลา ${timeThai}`,
        dayOfMonth: start.getDate(),
        footerTime: `${dateEng}, ${timeEng} (${selectedTimezone})`,
        startTime: b.startTime, // Add raw start time for filtering
        read: readNotificationIds.includes(b.id) // Check if read
      };
    });

    // --- Custom Notifications Logic ---
    const activeCustomNotifications = customNotifications.filter(n => {
      // Must have time. Date is optional if repeating.
      if (!n.time) return false;
      if (n.isEnabled === false) return false;

      const tz = n.timezoneRef || 'Asia/Bangkok';
      const now = new Date();

      // Get Current Info in Target TZ
      const nowDateInTz = now.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
      const nowTimeInTz = now.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }); // HH:mm
      const dayOfWeek = new Date(now.toLocaleString('en-US', { timeZone: tz })).getDay(); // 0-6 Sun-Sat

      // 1. Repeating Alarm
      if (n.repeatDays && n.repeatDays.length > 0) {
        // Show in list if: It matches TODAY's day AND Time has passed (so it's a recent notification)
        // We only show "Today's" history for repeating alarms to avoid clogging.
        if (n.repeatDays.includes(dayOfWeek) && nowTimeInTz >= n.time) {
          return true;
        }
        return false;
      }

      // 2. One-time Alarm
      if (n.date) {
        if (nowDateInTz > n.date) return true; // Past date
        if (nowDateInTz === n.date && nowTimeInTz >= n.time) return true; // Today, past time
      }

      return false;
    }).map(n => {
      const tz = n.timezoneRef || 'Asia/Bangkok';
      const now = new Date();

      // Construct a Date object for display/sorting
      // If repeating and happened today, trust Today's date.
      // If one-time, use n.date.
      let targetDateStr = n.date;

      // If repeating, we calculate 'today's' date string for the target TZ to represent this instance
      if (n.repeatDays && n.repeatDays.length > 0) {
        targetDateStr = now.toLocaleDateString('en-CA', { timeZone: tz });
      }

      // Fallback for missing dateStr?
      if (!targetDateStr) targetDateStr = new Date().toISOString().split('T')[0];

      const [y, m, d] = targetDateStr.split('-').map(Number);
      const [h, min] = n.time.split(':').map(Number);

      const notifDate = new Date(y, m - 1, d, h, min);

      // Thai Date
      const dateThai = notifDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
      const timeThai = notifDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

      // Eng Date
      const dateEng = notifDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const timeEng = notifDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

      // Generate a unique ID for this instance if it's repeating OR if time changed
      // Format: {id}_{YYYY-MM-DD}_{HH:mm}
      const instanceId = (n.repeatDays && n.repeatDays.length > 0)
        ? `${n.id}_${targetDateStr}_${n.time}`
        : `${n.id}_${n.time}`;

      return {
        id: instanceId,
        type: 'custom',
        title: n.title,
        desc: 'ถึงเวลาแล้ว',
        fullThaiInfo: `${dateThai} เวลา ${timeThai}`,
        dayOfMonth: notifDate.getDate(),
        footerTime: `${dateEng}, ${timeEng} (${n.timezoneRef || n.timezone})`,
        startTime: notifDate.toISOString(),
        read: readNotificationIds.includes(instanceId),
        date: targetDateStr,
        time: n.time,
        timezoneRef: n.timezoneRef || n.timezone
      };
    });

    const combinedNotifications = [
      ...bookingNotifications,
      ...timezoneNotifications.map(tz => ({
        ...tz,
        read: readNotificationIds.includes(tz.id)
      })),
      ...notificationHistory.map(n => ({
        ...n,
        // Ensure consistent ID for reading status
        id: n.id, // Firestore ID
        read: readNotificationIds.includes(n.id) || n.read // Server read status or local override
      }))
    ].sort((a, b) => {
      // Calculate "Notification Time" (When did it pop up?)
      // For Bookings: Start Time - 30 Minutes
      // For Custom/Timezone: Start Time (Immediate)

      const getNotifTime = (item) => {
        if (item.type === 'custom') {
          // For history items, we have a timestamp
          if (item.timestamp && item.timestamp.toDate) return item.timestamp.toDate().getTime();
          if (item.timestamp) return new Date(item.timestamp).getTime();

          // Fallback if timestamp missing
          const tzItem = thaiTimezones.find(z => z.value === (item.timezoneRef || 'Asia/Bangkok'));
          const offsetMatch = tzItem ? tzItem.label.match(/\(GMT([+-]\d{2}:\d{2})\)/) : null;
          const offset = offsetMatch ? offsetMatch[1] : '+07:00';
          // Construct ISO string with offset to get absolute timestamp
          const isoString = `${item.date}T${item.time}:00${offset}`;
          return Date.parse(isoString);
        }

        let t = item.startTime ? new Date(item.startTime).getTime() : 0;
        if (item.type === 'booking') {
          t -= 30 * 60 * 1000;
        }
        return t;
      };

      const timeA = getNotifTime(a);
      const timeB = getNotifTime(b);

      return timeB - timeA; // Newest Notification First
    });

    setNotifications(combinedNotifications);
  }, [bookings, timezoneNotifications, notificationHistory, readNotificationIds, currentUser, selectedTimezone, tick]);



  // Alert Trigger Logic
  // Initialize from localStorage to prevent re-trigger on refresh
  // Alert Trigger Logic
  // Initialize from localStorage to prevent re-trigger on refresh
  const shownNotificationIds = useRef(null);
  if (!shownNotificationIds.current) {
    const saved = localStorage.getItem('shownNotificationIds');
    shownNotificationIds.current = saved ? new Set(JSON.parse(saved)) : new Set();
  }
  const latestNotificationsRef = useRef(customNotifications); // Ref to access latest state in interval

  // Keep ref updated
  useEffect(() => {
    latestNotificationsRef.current = customNotifications;
  }, [customNotifications]);

  useEffect(() => {
    // We don't depend on customNotifications here anymore for the interval-creation,
    // getting rid of constant re-creation of interval.
    // Instead we start ONE interval and read from Ref.

    // Actually, if we want to run interval always, we can just mount it once.
    // But let's keep it simple.

    const interval = setInterval(() => {
      const now = new Date();
      const currentNotifs = latestNotificationsRef.current;

      if (!currentNotifs || currentNotifs.length === 0) return;

      currentNotifs.forEach(n => {
        if (!n.time) return;
        if (n.isEnabled === false) return;

        // Timezone Check
        const tz = n.timezoneRef || 'Asia/Bangkok';

        // Current Time in Target Timezone
        const nowDateInTz = now.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
        const nowTimeInTz = now.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }); // HH:mm
        const dayOfWeek = new Date(now.toLocaleString('en-US', { timeZone: tz })).getDay(); // 0-6

        let shouldTrigger = false;

        // Logic: Exact Minute Match

        // Robust Time Comparison
        const [targetH, targetM] = n.time.split(':').map(Number);
        const [currentH, currentM] = nowTimeInTz.split(':').map(Number);

        // Check Match
        const isTimeMatch = (targetH === currentH && targetM === currentM);

        // 1. Repeating Alarm
        if (n.repeatDays && n.repeatDays.length > 0) {
          if (n.repeatDays.map(Number).includes(dayOfWeek) && isTimeMatch) {
            shouldTrigger = true;
          }
        }
        // 2. One-time Alarm
        else if (n.date) {
          if (nowDateInTz === n.date && isTimeMatch) {
            shouldTrigger = true;
          }
        }

        const triggerKey = `${n.id}_${nowDateInTz}_${n.time}`;

        if (shouldTrigger && !shownNotificationIds.current.has(triggerKey)) {
          setNotificationPopup({
            isOpen: true,
            title: n.title,
            time: n.time
          });

          if ("Notification" in window && Notification.permission === 'granted') {
            new Notification(n.title, {
              body: `ถึงเวลา ${n.time} แล้ว`,
              icon: '/logo192.png' // Optional
            });
          }
          shownNotificationIds.current.add(triggerKey);
          // Save to localStorage
          localStorage.setItem('shownNotificationIds', JSON.stringify([...shownNotificationIds.current]));

          // Optional: Clean up old keys if Set gets too big? 
          // For now, it's fine for a session.
        }
      });
    }, 1000); // Check every 1 second

    return () => clearInterval(interval);
  }, []); // Mount once!

  // Persist read status
  useEffect(() => {
    localStorage.setItem('readNotificationIds', JSON.stringify(readNotificationIds));
  }, [readNotificationIds]);


  const handleMarkAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadNotificationIds(prev => [...new Set([...prev, ...allIds])]);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // UI States
  const [currentView, setCurrentView] = useState('form'); // 'form', 'list', 'notifications'

  // Mapping for backward compatibility
  const isViewMode = currentView === 'list';
  const setIsViewMode = (mode) => setCurrentView(mode ? 'list' : 'form');

  const [popupMessage, setPopupMessage] = useState({ type: '', message: '' });
  const [currentDate, setCurrentDate] = useState(new Date());

  // Redesign: List View Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('แสดงทั้งหมด');
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'completed'
  const [viewLayout, setViewLayout] = useState('grid'); // 'grid' or 'list'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const daysOfWeek = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const fullDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const STANDARD_DURATIONS = ['30 นาที', '1 ชั่วโมง', '1.5 ชั่วโมง', '2 ชั่วโมง', '3 ชั่วโมง'];
  const duration = [...STANDARD_DURATIONS, 'กำหนดเอง']; // Legacy support if needed, but we use displayDurations
  // เพิ่มจุด (.) ให้ตรงกับ Database
  const dayAbbreviations = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

  // --- HELPER FUNCTIONS ---
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const changeMonth = (offset) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));

  const formatDateId = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getThaiDayNameFromDateStr = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return dayAbbreviations[date.getDay()];
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${d} ${thaiMonths[m - 1]} ${y + 543}`;
  };

  // --- NEW LOGIC: Time & Duration Helpers ---

  // ฟังก์ชันแปลงข้อความระยะเวลาเป็นตัวเลขนาที (ใช้ร่วมกันหลายที่)
  const getDurationInMinutes = (durationStr, customVal, customUnit = 'นาที') => {
    if (!durationStr) return 0;

    // Robust parsing for strings like "30 นาที", "1 ชั่วโมง", "1.5 ชั่วโมง", etc.
    if (durationStr === 'กำหนดเอง') {
      const val = parseFloat(customVal) || 0;
      if (customUnit === 'ชั่วโมง') return val * 60;
      return val;
    }

    // Try to parse number from string
    const match = durationStr.match(/([\d\.]+)/);
    if (!match) return 0;

    const val = parseFloat(match[1]);

    // Check for hour keywords
    if (durationStr.includes('ชั่วโมง') || durationStr.includes('ชม.')) {
      return val * 60;
    }

    return val; // Assume minutes if no hour keyword or just minutes
  };

  // แปลงนาที (นับจากเที่ยงคืน) กลับเป็นเวลา HH:MM
  const minutesToTimeStr = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // แปลงเวลา HH:MM เป็นนาที
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    // เผื่อกรณีมีขีดติดมา ตัดเอาเฉพาะเวลาตัวแรก
    const cleanTime = timeStr.includes('-') ? timeStr.split('-')[0].trim() : timeStr;
    const [hours, minutes] = cleanTime.split(':').map(Number);
    return (hours * 60) + (minutes || 0);
  };

  const calculateEndTime = (startTime, durationStr) => {
    if (!startTime || !durationStr) return '';
    const minsToAdd = getDurationInMinutes(durationStr, customDuration, customDurationUnit);
    const [startH, startM] = startTime.split(/[.:]/).map(Number);
    if (isNaN(startH)) return startTime;

    const totalMins = (startH * 60) + startM + minsToAdd;
    return `${startTime}-${minutesToTimeStr(totalMins)}`;
  };

  // Check if a specific time slot is booked
  const isTimeSlotBooked = (timeStr) => {
    if (formData.days.length === 0) return false;

    // Parse selected Date
    const dateStr = formData.days[0];
    const [year, month, day] = dateStr.split('-').map(Number);

    // Parse Slot Start Time
    // FIX: checking against local timezone is wrong if browser != Bangkok
    // Construct checkDate using explicit +07:00
    // const [h, m] = timeStr.split(':').map(Number);
    // const slotStart = new Date(year, month - 1, day, h, m);

    // Improved Logic:
    const slotStart = new Date(Date.parse(`${dateStr}T${timeStr}:00+07:00`));

    // Calculate Slot End Time
    const durationMins = getDurationInMinutes(formData.duration, customDuration, customDurationUnit);
    // If no duration selected yet, default to 1 min check or 30 mins just to see if start time overlaps
    // But logically, we need duration to know if it overlaps "into" a booking
    // For safety, let's use 1 minute if 0, to at least check start point
    const bufferMins = durationMins > 0 ? durationMins : 1;
    const slotEnd = new Date(slotStart.getTime() + bufferMins * 60000);

    // Filter bookings for this day
    const dayBookings = bookings.filter(b => {
      // Basic check: is it non-cancelled? (Assuming 'confirmed' status or similar)
      // If you have cancelled status, filter it out here. 
      // For now assume all in 'bookings' collection are active.
      if (b.status === 'cancelled') return false;

      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);

      // Check if booking falls on the same day
      return bStart.getDate() === day &&
        bStart.getMonth() === (month - 1) &&
        bStart.getFullYear() === year;
    });

    // Check overlap
    return dayBookings.some(b => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);

      // Overlap logic: (StartA < EndB) and (EndA > StartB)
      return slotStart < bEnd && slotEnd > bStart;
    });
  };

  // --- CORE LOGIC: Generate Time Slots ---
  const getAvailableTimeSlots = () => {
    if (!formData.type || formData.type === 'เลือกกิจกรรม') return [];
    if (formData.days.length === 0) return [];

    const selectedDateStr = formData.days[0];
    const targetDayName = getThaiDayNameFromDateStr(selectedDateStr);

    // 1. ดึง Schedule ที่ตรงกับวันและประเภท
    const matchingSchedules = schedules.filter(schedule =>
      schedule.type === formData.type &&
      schedule.day === targetDayName &&
      schedule.time
    );

    // 2. ดึง Duration ของผู้ใช้มาเตรียมคำนวณ
    const userDurationMins = getDurationInMinutes(formData.duration, customDuration, customDurationUnit);
    // ถ้ายังไม่เลือก Duration ให้ใช้ค่า Default 60 นาทีในการแสดงผลไปก่อน (หรือจะใช้ 30 ก็ได้)
    const durationCheck = userDurationMins > 0 ? userDurationMins : 60;

    const generatedSlots = new Set();

    matchingSchedules.forEach(sch => {
      const timeStr = sch.time;

      if (timeStr.includes('-')) {
        // กรณีเป็นช่วงเวลา เช่น "19:00 - 22:00"
        const [startStr, endStr] = timeStr.split('-').map(s => s.trim());

        let currentMins = timeToMinutes(startStr);
        const endMins = timeToMinutes(endStr);

        // Loop สร้างปุ่มเวลา โดยขยับทีละ 30 นาที (Interval)
        const STEP_INTERVAL = userDurationMins > 0 ? userDurationMins : 30;

        while (currentMins + durationCheck <= endMins) {
          generatedSlots.add(minutesToTimeStr(currentMins));
          currentMins += STEP_INTERVAL;
        }

      } else {
        // กรณีเป็นเวลาเดี่ยว เช่น "19:00" ก็ใส่ไปเลย
        generatedSlots.add(timeStr);
      }
    });

    // Helper to format display time in selected timezone
    // Assumes base time is today/given day in Bangkok (+07:00)
    // We treat 'timeStr' (e.g. "09:00") as Bangkok Time.
    const formatDisplayTime = (originalTimeStr) => {
      if (!originalTimeStr) return '';
      // Construct ISO string for Bangkok Time on the selected date
      // Note: formData.days[0] is YYYY-MM-DD
      const datePart = formData.days[0];
      const isoString = `${datePart}T${originalTimeStr}:00+07:00`;
      const dateObj = new Date(Date.parse(isoString));

      return dateObj.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: selectedTimezone
      });
    };

    // แปลงกลับเป็น Array และเรียงลำดับ แล้ว map เป็น object
    return Array.from(generatedSlots)
      .sort((a, b) => timeToMinutes(a) - timeToMinutes(b))
      .map(original => {
        // Calculate Start DateObj (Bangkok Time +07:00)
        const datePart = formData.days[0];
        const startIso = `${datePart}T${original}:00+07:00`;
        const startObj = new Date(Date.parse(startIso));

        // Calculate End DateObj
        // Use the same duration logic as generation (durationCheck was calculating logic, but here we want what the user SEE)
        // If userDurationMins > 0, we use it. If not, maybe we shouldn't show a range?
        // But the design requires a range. Let's assume default 60 or 30 same as generation interval?
        // Actually, if duration is not selected, we might just show start time?
        // But the user usually selects duration first (required).
        // Let's fallback to 60 mins if unknown, just for display.
        const dMins = userDurationMins > 0 ? userDurationMins : 30;
        const endObj = new Date(startObj.getTime() + dMins * 60000);

        const displayStart = startObj.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: selectedTimezone
        });

        const displayEnd = endObj.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: selectedTimezone
        });

        return {
          original: original,
          display: `${displayStart} - ${displayEnd}`
        };
      });
  };

  const availableTimeSlots = getAvailableTimeSlots();

  // --- EFFECTS ---
  useEffect(() => {
    const unsubSchedules = subscribeSchedules(setSchedules);
    const unsubTypes = subscribeActivityTypes((fetchedTypes) => {
      setActivityTypes(fetchedTypes);
      setTypes(['เลือกกิจกรรม', ...fetchedTypes.map(t => t.name)]);
    });
    const unsubBookings = subscribeBookings(setBookings);
    return () => { unsubSchedules(); unsubTypes(); unsubBookings(); };
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setImgError(false); // Reset error on new user
      } else {
        setCurrentUser(null);
        // navigate('/login'); // Optional: Auto redirect if not logged in
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (popupMessage.type === 'success') {
      const timer = setTimeout(() => setPopupMessage({ type: '', message: '' }), 1000);
      return () => clearTimeout(timer);
    }
  }, [popupMessage]);



  // --- HANDLERS ---
  const handleDaySelect = (dayNum) => {
    const selectedDateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDateObj < today) return;
    const dateId = formatDateId(selectedDateObj);
    setFormData(prev => {
      const isSameDate = prev.days.includes(dateId);
      return { ...prev, days: isSameDate ? [] : [dateId], startTime: '' };
    });
  };

  const handleDurationChange = (val) => {
    // If user selects "กำหนดเอง" OR selects a custom-like value that is not in standard list
    // (In practice, if they click the already-selected custom value (e.g., "5 ชั่วโมง") in the dropdown,
    // we want to let them edit it.
    // However, typical dropdown logic: clicking the same value might just re-trigger onChange.

    // Check if standard
    const isStandard = STANDARD_DURATIONS.includes(val);

    if (val === 'กำหนดเอง' || (!isStandard && val === formData.duration)) {
      // If clicking "กำหนดเอง" OR re-clicking their custom value -> Open Modal
      setShowDurationModal(true);
      // Important: if it's "กำหนดเอง", we don't set formData.duration yet until they confirm strings
      // But if they clicked their existing custom value, we keep it as is until modal confirms
    } else {
      setFormData({ ...formData, duration: val });
      // If they pick a standard one, clear custom duration/unit states? 
      // Optional, but safer to keep them clean or just ignore them.
    }
  };

  const handleCustomDurationConfirm = (val, unit) => {
    setCustomDuration(val);
    setCustomDurationUnit(unit);
    setShowDurationModal(false);

    // Directly set the duration string to proper format
    const newDurationStr = `${val} ${unit}`;
    setFormData(prev => ({ ...prev, duration: newDurationStr }));
  };

  const handleCustomDurationCancel = () => {
    setShowDurationModal(false);
    // If we were on "กำหนดเอง" but cancelled, and didn't have a previous custom value...
    // logic is tricky. If formData.duration is "กำหนดเอง", we might want to revert?
    // But here formData.duration is likely still the old value or empty.
    if (!formData.duration || formData.duration === 'กำหนดเอง') {
      setFormData(prev => ({ ...prev, duration: '' }));
    }
  };


  // Helper to match Hex to Google Color ID
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

  const handleReview = () => {
    if (!formData.type || formData.type === 'เลือกกิจกรรม') { setPopupMessage({ type: 'error', message: 'กรุณาเลือกประเภทกิจกรรม' }); return; }
    if (!formData.subject || formData.subject.trim() === '') { setPopupMessage({ type: 'error', message: 'กรุณากรอกหัวข้อการประชุม' }); return; }

    // Check if custom duration is selected but value is empty
    if (formData.duration === 'กำหนดเอง') {
      const val = parseFloat(customDuration);
      let totalMinutes = val;
      if (customDurationUnit === 'ชั่วโมง') totalMinutes = val * 60;

      if (!val || val <= 0) {
        setPopupMessage({ type: 'error', message: 'กรุณาระบุระยะเวลา (เลขจำนวนเต็ม/ทศนิยม)' });
        return;
      }
      if (totalMinutes < 10) {
        setPopupMessage({ type: 'error', message: 'กรุณาระบุระยะเวลาอย่างน้อย 10 นาที' });
        return;
      }
    } else {
      if (!formData.duration || formData.duration.trim() === '') { setPopupMessage({ type: 'error', message: 'กรุณาระบุระยะเวลา' }); return; }
    }
    if (formData.days.length === 0) { setPopupMessage({ type: 'error', message: 'กรุณาเลือกวันที่จากปฏิทิน' }); return; }
    if (!formData.startTime) { setPopupMessage({ type: 'error', message: 'กรุณาเลือกเวลาที่ต้องการจอง' }); return; }
    if (formData.meetingFormat === 'Online' && (!formData.location || formData.location.trim() === '')) { setPopupMessage({ type: 'error', message: 'กรุณากรอกลิงก์การประชุม' }); return; }
    if (formData.meetingFormat === 'On-site' && (!formData.location || formData.location.trim() === '')) { setPopupMessage({ type: 'error', message: 'กรุณาระบุสถานที่' }); return; }

    setShowPreviewModal(true);
  };

  const handleConfirmBooking = async () => {
    setShowPreviewModal(false);

    // --- Google Calendar Integration ---
    try {
      const dateStr = formData.days[0];
      const timeStr = formData.startTime;
      const [year, month, day] = dateStr.split('-').map(Number);
      // const [hour, minute] = timeStr.split(':').map(Number);

      // FIX: Create Start Time explicitly in Bangkok Time (+07:00)
      // This ensures that "09:00" selected means "09:00 Bangkok", regardless of browser timezone.
      const startDateTime = new Date(Date.parse(`${dateStr}T${timeStr}:00+07:00`));

      const durationMins = getDurationInMinutes(formData.duration, customDuration, customDurationUnit);
      const endDateTime = new Date(startDateTime.getTime() + durationMins * 60000);

      // Determine Color ID
      const selectedActivity = activityTypes.find(t => t.name === formData.type);
      let colorId = '7'; // Default Peacock (Blue)
      if (selectedActivity && selectedActivity.color) {
        colorId = mapHexToGoogleColorId(selectedActivity.color);
      }

      const eventPayload = {
        title: `[${formData.type}] ${formData.subject}`,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        description: `${formData.description || '-'}`,
        location: formData.location,
        colorId: colorId,
        userEmail: currentUser ? currentUser.email : '' // Send User Email for Guest Sync
      };

      setPopupMessage({ type: 'success', message: 'กำลังบันทึก...' });

      const result = await createCalendarEvent(eventPayload);

      if (result.status === 'success') {
        // Save to Firestore
        await addBooking({
          ...eventPayload,
          googleCalendarEventId: result.eventId || null,
          status: 'confirmed',
          type: formData.type,
          subject: formData.subject, // Explicitly save subject
          meetingFormat: formData.meetingFormat,
          email: currentUser ? currentUser.email : '' // Save User Email
        });

        setPopupMessage({ type: 'success', message: 'จองนัดหมายและบันทึกลงปฏิทินเรียบร้อยแล้ว' });

        // Clear form
        setFormData({
          type: '',
          days: [],
          startTime: '',
          endTime: '',
          duration: '',
          subject: '',
          meetingFormat: 'Online',
          location: '',
          description: ''
        });
        setCustomDuration('');
        setCustomDurationUnit('นาที');
      } else {
        throw new Error(result.message || 'Unknown error');
      }

    } catch (error) {
      console.error("Calendar Error:", error);
      setPopupMessage({ type: 'error', message: `เชื่อมต่อไม่ได้: ${error.message}` });
    }
  };

  // --- ACTIONS ---
  const handleDeleteBooking = (id) => {
    const bookingToDelete = bookings.find(b => b.id === id);
    if (bookingToDelete) {
      setCancellingBooking(bookingToDelete);
    }
  };

  const confirmDeleteBooking = async (id) => {
    setCancellingBooking(null); // Close modal
    try {
      // 1. Find the booking to get Google Calendar Event ID
      const bookingToDelete = bookings.find(b => b.id === id);

      // 2. Delete from Google Calendar if linked
      if (bookingToDelete && bookingToDelete.googleCalendarEventId) {
        try {
          await deleteCalendarEvent(bookingToDelete.googleCalendarEventId);
        } catch (calError) {
          console.warn("Failed to delete from Google Calendar:", calError);
          // Continue to delete from local DB even if calendar fails
        }
      }

      // 3. Delete from Firestore
      await deleteBooking(id);
      setPopupMessage({ type: 'success', message: 'ลบรายการเรียบร้อยแล้ว' });
    } catch (error) {
      console.error("Delete Error:", error);
      setPopupMessage({ type: 'error', message: 'ลบรายการไม่สำเร็จ' });
    }
  };

  const handleViewBookingDetails = (booking) => {
    // Transform booking data for Modal
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);

    // Format Date: YYYY-MM-DD
    const dateStr = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');

    // Format Time: HH:MM - HH:MM with Timezone
    // Use selectedTimezone for display
    const formatTimeTz = (date) => date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: selectedTimezone
    });

    const timeStr = `${formatTimeTz(start)} - ${formatTimeTz(end)} น. (${selectedTimezone})`;

    // Calculate Duration
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    let durationStr = `${diffMins} นาที`;
    if (diffMins >= 60) {
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      durationStr = m > 0 ? `${h} ชม. ${m} นาที` : `${h} ชั่วโมง`;
    }

    const normalizedFormat = booking.type === 'Training' ? 'On-site' : // Example heuristic correction if needed, but better to trust data
      (booking.meetingFormat || booking.bookingData?.meetingFormat || (booking.location && booking.location.includes('http') ? 'Online' : 'On-site'));

    setViewingBooking({
      type: booking.type || 'นัดหมาย',
      subject: booking.title || booking.subject || '-',
      date: dateStr,
      timeSlot: timeStr,
      duration: durationStr,
      meetingFormat: normalizedFormat,
      location: booking.location || '-',
      description: booking.description || '-'
    });
  };

  // Handle saving custom notification
  const handleSaveCustomNotification = async (data) => {
    if (!currentUser) return;
    try {
      const isSilent = data.silent;
      // create a copy to avoid mutating state directly if coming from state, and remove 'silent' flag from DB payload
      const payload = { ...data };
      delete payload.silent;

      if (data.id) {
        await updateCustomNotification(data.id, payload);
        // Show Success Toast ONLY if not silent
        if (!isSilent) {
          setSuccessToast({ isOpen: true, title: 'แก้ไขการแจ้งเตือนสำเร็จ', subTitle: 'บันทึกการแก้ไขเรียบร้อยแล้ว' });
          setTimeout(() => setSuccessToast(prev => ({ ...prev, isOpen: false })), 3000);
        }
      } else {
        await addCustomNotification(currentUser.uid, payload);
        // Add always shows toast (usually explicit user action)
        setSuccessToast({ isOpen: true, title: 'สร้างการแจ้งเตือนสำเร็จ', subTitle: 'เพิ่มรายการแจ้งเตือนเรียบร้อยแล้ว' });
        setTimeout(() => setSuccessToast(prev => ({ ...prev, isOpen: false })), 3000);
      }
    } catch (error) {
      console.error("Failed to save custom notification", error);
      setPopupMessage({ type: 'error', message: 'เกิดข้อผิดพลาดในการบันทึก' });
    }
  };

  // Handle deleting custom notification
  const handleDeleteCustomNotification = async (id) => {
    if (!currentUser) return;
    // if (!window.confirm("คุณแน่ใจว่าต้องการลบการแจ้งเตือนนี้?")) return;
    try {
      await deleteCustomNotification(id);
      setPopupMessage({ type: 'success', message: 'ลบการแจ้งเตือนเรียบร้อยแล้ว' });
    } catch (error) {
      console.error("Failed to delete custom notification", error);
      setPopupMessage({ type: 'error', message: 'ลบการไม่สำเร็จ' });
    }
  };

  // --- RENDER HELPERS ---
  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayIndex = getFirstDayOfMonth(currentDate);
    const gridItems = [];
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstDayIndex; i++) { gridItems.push(<div key={`empty-${i}`} className="user-day-empty"></div>); }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateId = formatDateId(currentDayDate);
      const isSelected = formData.days.includes(dateId);
      const isPast = currentDayDate < todayObj;
      const isToday = currentDayDate.getTime() === todayObj.getTime();

      let btnClass = 'user-day-btn';
      if (isSelected) btnClass += ' active';
      if (isToday) btnClass += ' today';

      gridItems.push(
        <button key={day} disabled={isPast} className={btnClass} onClick={() => handleDaySelect(day)}>
          {day}
        </button>
      );
    }
    return gridItems;
  };

  // Calculate display duration options
  let displayDurations = [...STANDARD_DURATIONS];

  // Logic: 
  // 1. If we have a custom duration that is NOT standard, we add it to the list so it can be shown/selected.
  // 2. We ALWAYS show 'กำหนดเอง' at the end to allow user to pick it (or clear/reset).

  // Note: if formData.duration is empty, includes returns false, so we check truthiness first
  const isCustomActive = formData.duration && !STANDARD_DURATIONS.includes(formData.duration);

  if (isCustomActive) {
    // Show the custom value
    displayDurations.push(formData.duration);
  }
  // Always show 'กำหนดเอง' option
  displayDurations.push('กำหนดเอง');

  // Profile Dropdown State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();

  // Logout Logic
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  // Timezone Logic
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [showTimezoneSuccessModal, setShowTimezoneSuccessModal] = useState(false);
  const [successTimezoneInfo, setSuccessTimezoneInfo] = useState('');

  const handleTimezoneSuccess = (tzData) => {
    // tzData should be the object { label, value } or just value if we changed it differently.
    // Based on TimezoneModal update: onSuccess(selectedTimezone) -> which is entire object.

    const tzLabel = tzData.label || tzData; // Fallback if just string
    const tzValue = tzData.value || 'Asia/Bangkok';

    setShowTimezoneModal(false);
    setSuccessTimezoneInfo(tzLabel);
    setShowTimezoneSuccessModal(true);

    // Update State & Persistent Storage
    // Update State & Persistent Storage
    setSelectedTimezone(tzValue);

    // Save per user if logged in
    if (currentUser && currentUser.email) {
      localStorage.setItem(`userTimezone_${currentUser.email}`, tzValue);
    }
    // Also update global default for this device/browser preference
    localStorage.setItem('userTimezone', tzValue);

    // Create Notification Object
    const newNotification = {
      id: `tz-${Date.now()}`,
      type: 'timezone',
      title: 'เปลี่ยนเขตเวลาเรียบร้อย',
      desc: `ระบบตั้งค่าเป็น ${tzLabel}`,
      fullThaiInfo: '',
      dayOfMonth: new Date().getDate(),
      footerTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tzValue }),
      startTime: new Date().toISOString(), // Use current time for sorting
      read: false
    };

    // Update State & LocalStorage
    const updatedTzNotifs = [newNotification, ...timezoneNotifications];
    setTimezoneNotifications(updatedTzNotifs);

    if (currentUser && currentUser.email) {
      localStorage.setItem(`timezoneNotifications_${currentUser.email}`, JSON.stringify(updatedTzNotifs));
    }

    // Auto close success modal after 3 seconds (optional)
    setTimeout(() => {
      setShowTimezoneSuccessModal(false);
    }, 3000);
  };

  const handleLogoutClick = () => {
    // Close dropdown and show modal
    setIsProfileOpen(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    navigate('/login');
  };

  return (
    <div className="user-schedule-container">
      <div className="user-schedule-wrapper">
        {/* --- HEADER --- */}
        <div className="user-header-card">
          <div className="user-header-left">
            <div className="user-header-icon-box"><CalendarIcon /></div>
            <div className="user-header-info">
              <h1>Book an Appointment</h1>
              <p>
                {currentView === 'list' ? 'รายการจองนัดหมาย' :
                  currentView === 'notifications' ? 'การแจ้งเตือนทั้งหมด' :
                    currentView === 'custom_notifications' ? 'ตั้งค่าการแจ้งเตือนสำหรับกิจกรรมของฉัน' :
                      'จองตารางนัดหมาย'}
              </p>
            </div>
          </div>
          <div className="user-header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="user-header-btn-back" onClick={() => {
              if (currentView === 'notifications') setCurrentView('form');
              else if (currentView === 'list') setCurrentView('form');
              else if (currentView === 'custom_notifications') setCurrentView('form');
              else setCurrentView('list');
            }}>
              {currentView === 'list' ? '+ เพิ่มรายการ' :
                currentView === 'notifications' ? 'รายการนัดหมายของฉัน' :
                  currentView === 'custom_notifications' ? '+ เพิ่มการนัดหมาย' :
                    'รายการนัดหมายของฉัน'}
            </button>

            {/* Notification Bell */}
            <div className="user-notification-container" ref={notificationRef} style={{ position: 'relative' }}>
              <button
                className="user-header-bell-btn"
                onClick={() => { setShowNotifications(!showNotifications); handleMarkAllAsRead(); }}
              >
                <Bell size={25} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="notification-badge-count">{notifications.filter(n => !n.read).length}</span>
                )}
              </button>

              {showNotifications && (
                <div className="profile-dropdown-menu notification-dropdown-override" style={{ width: '380px', right: '-70px' }}>
                  <div className="dropdown-header-info" style={{ flexDirection: 'column', alignItems: 'flex-start', background: 'white', padding: '10px 16px 0 16px' }}>
                    <h3 style={{ margin: '0', fontSize: '1.1rem' }}>การแจ้งเตือน</h3>
                    <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0' }}>อัปเดตเกี่ยวกับการจองและเขตเวลาของคุณ</p>
                  </div>

                  <div className="dropdown-divider"></div>

                  <div className="notification-list-scroll" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {(() => {
                      const todayNotifications = notifications.filter(n => {
                        if (!n.startTime) return false;
                        const nDate = new Date(n.startTime);
                        const today = new Date();
                        return nDate.getDate() === today.getDate() &&
                          nDate.getMonth() === today.getMonth() &&
                          nDate.getFullYear() === today.getFullYear();
                      });

                      if (todayNotifications.length === 0) {
                        return <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>ไม่มีการแจ้งเตือน</div>;
                      }

                      return todayNotifications.map(item => (
                        <div key={item.id} className={`dropdown-item ${!item.read ? 'unread' : ''}`} style={{ alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fff', cursor: 'default' }}>
                          <div style={{ position: 'relative', marginRight: '12px' }}>
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '10px',
                              background: item.type === 'timezone' ? '#fef2f2' : '#f0f9ff',
                              color: item.type === 'timezone' ? '#ef4444' : '#3b82f6',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              border: '1px solid white',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}>
                              {item.type === 'timezone' ? <ClockLucide size={20} /> : (
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <CalendarIcon size={20} strokeWidth={2} />
                                  <span style={{ position: 'absolute', top: '9px', fontSize: '8px', fontWeight: 'bold' }}>{item.dayOfMonth}</span>
                                </div>
                              )}
                            </div>
                            {!item.read && (
                              <span style={{
                                position: 'absolute', top: '-2px', right: '-2px',
                                width: '10px', height: '10px', borderRadius: '50%',
                                background: '#ef4444', border: '2px solid white'
                              }}></span>
                            )}
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '2px' }}>
                              <span style={{
                                fontWeight: 500, fontSize: '0.9rem', color: '#1f2937', marginBottom: '2px',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block'
                              }}>{item.title}</span>
                              <span style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: '1.4', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                {item.desc} {item.fullThaiInfo}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>{item.footerTime}</span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  <div className="dropdown-divider"></div>

                  <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 16px' }}>
                    <button
                      style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}
                      onClick={() => { setShowNotifications(false); setCurrentView('notifications'); }}
                    >
                      ดูการแจ้งเตือนทั้งหมด
                    </button>
                  </div>
                </div>
              )}
            </div>

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

                  <button
                    className={`dropdown-item ${activeTab === 'completed' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('completed');
                      setCurrentPage(1);
                      setIsViewMode(true);
                      setIsProfileOpen(false);
                    }}
                  >
                    <History size={18} />
                    <span>ประวัติการนัดหมาย</span>
                  </button>

                  <button className="dropdown-item" onClick={() => { setIsProfileOpen(false); setCurrentView('custom_notifications'); }}>
                    <AlarmClock size={18} />
                    <span>เพิ่มการแจ้งเตือน</span>
                  </button>

                  <button className="dropdown-item" onClick={() => { setIsProfileOpen(false); setShowTimezoneModal(true); }}>
                    <TbTimezone style={{ width: '18px', height: '18px' }} />
                    <span>เขตเวลา</span>
                  </button>

                  <div className="dropdown-divider"></div>

                  <button className="dropdown-item logout" onClick={handleLogoutClick}>
                    <LogOut size={18} />
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- MODALS --- */}
        <LogoutModal
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={confirmLogout}
        />
        <TimezoneModal
          isOpen={showTimezoneModal}
          onClose={() => setShowTimezoneModal(false)}
          onSuccess={handleTimezoneSuccess}
        />
        <TimezoneSuccessModal
          isOpen={showTimezoneSuccessModal}
          onClose={() => setShowTimezoneSuccessModal(false)}
          timezoneLabel={successTimezoneInfo}
        />

        {/* --- CONTENT --- */}
        {currentView === 'notifications' ? (
          <NotificationView notifications={notifications} onMarkAllRead={handleMarkAllAsRead} />
        ) : currentView === 'custom_notifications' ? (
          <CustomNotificationView
            notifications={customNotifications}
            onSaveNotification={handleSaveCustomNotification}
            onDeleteNotification={handleDeleteCustomNotification}
          />
        ) : !isViewMode ? (
          <div className="user-form-card">
            <h2 className="user-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileTextIcon style={{ width: 30, height: 30, color: '#2563eb' }} />
              รายละเอียดการนัดหมาย
            </h2>

            {/* Row 1: Activity */}
            <div className="form-section-Activity">
              <label className="input-label">เลือกกิจกรรม <span className="required">*</span></label>
              <TimeDropdown
                className="dropdown-full"
                value={formData.type}
                onChange={val => setFormData({ ...formData, type: val, startTime: '', days: [] })}
                timeOptions={types.filter(t => t !== 'เลือกกิจกรรม')}
                placeholder="เลือกกิจกรรม"
              />
            </div>

            {/* Row 2: Details */}
            <div className="form-section">
              <div className="flex-row-wrap">
                <div className="col-2">
                  <label className="input-label">หัวข้อการประชุม (Subject) <span className="required">*</span></label>
                  <input type="text" placeholder="เช่น ประชุมสรุปงานออกแบบ UX" className="user-custom-input"
                    value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} />
                </div>
                <div className="col-1">
                  <label className="input-label">ระยะเวลา (Duration) <span className="required">*</span></label>
                  <div className="duration-group">
                    <TimeDropdown
                      className="dropdown-time"
                      value={formData.duration} onChange={handleDurationChange}
                      timeOptions={displayDurations} placeholder="ระยะเวลา"
                    />
                    {/* CUSTOM DISPLAY REMOVED IN FAVOR OF IN-DROPDOWN DISPLAY */}
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Grid Layout (Calendar & Time) */}
            <div className="user-grid-layout">
              {/* Calendar Panel */}
              <div className="user-gray-panel">
                <div className="user-calendar-header">
                  <span className="user-section-title" style={{ margin: 0 }}>เลือกวันที่</span>
                  <div className="calendar-nav">
                    <span className="nav-btn" onClick={() => changeMonth(-1)}>&lt;</span>
                    <span className="nav-month">{thaiMonths[currentDate.getMonth()]} {currentDate.getFullYear() + 543}</span>
                    <span className="nav-btn" onClick={() => changeMonth(1)}>&gt;</span>
                  </div>
                </div>
                <div className="user-calendar-grid">
                  {daysOfWeek.map(d => (<div key={d} className="user-calendar-day-label">{d}</div>))}
                  {renderCalendarGrid()}
                </div>
              </div>

              {/* Time Panel */}
              <div className="user-gray-panel">
                <div className="user-section-title" style={{ marginBottom: '10px' }}>เลือกเวลา</div>
                <div className={`time-slot-container ${isTimeExpanded ? 'expanded' : ''}`}>
                  {(!formData.type || formData.type === 'เลือกกิจกรรม') ?
                    <div className="empty-state-text">กรุณาเลือกประเภทกิจกรรมก่อน</div>
                    : (!formData.duration) ?
                      <div className="empty-state-text">กรุณาระบุระยะเวลาก่อน</div>
                      : formData.days.length === 0 ?
                        <div className="empty-state-text">กรุณาเลือกวันที่จากปฏิทิน</div>
                        : availableTimeSlots.length > 0 ?
                          (
                            <>
                              {/* Slicing Logic: On Mobile, if not expanded, show only 8. On Desktop, show all. */}
                              {availableTimeSlots.slice(0, (isMobile && !isTimeExpanded) ? 8 : availableTimeSlots.length).map((slotObj, index) => {
                                const isBooked = isTimeSlotBooked(slotObj.original);
                                const isSelected = formData.startTime === slotObj.original;
                                return (
                                  <button
                                    key={index}
                                    type="button"
                                    disabled={isBooked}
                                    className={`time-slot-btn ${isSelected ? 'active' : ''} ${isBooked ? 'booked' : ''}`}
                                    onClick={() => setFormData({ ...formData, startTime: slotObj.original })}
                                  >
                                    {slotObj.display}
                                  </button>
                                );
                              })}
                            </>
                          )
                          : <div className="error-state-box">ไม่มีรอบเวลาว่าง</div>}
                </div>
                {/* Show More Button: Only on Mobile and if plenty of slots */}
                {isMobile && availableTimeSlots.length > 8 && (
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <button
                      type="button"
                      className="show-more-time-btn"
                      onClick={() => setIsTimeExpanded(!isTimeExpanded)}
                    >
                      {isTimeExpanded ? 'ดูน้อยลง' : 'ดูเวลาเพิ่มเติม'} <ChevronDown size={16} style={{ transform: isTimeExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="bottom-layout">

              {/* LEFT: Format & Input */}
              <div className="format-section">
                <h3 className="user-section-title">รูปแบบการประชุม</h3>

                <div className="toggle-container">
                  <button
                    className={`toggle-btn ${formData.meetingFormat === 'Online' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, meetingFormat: 'Online', location: '' })}
                  >
                    <MonitorIcon /> Online
                  </button>
                  <button
                    className={`toggle-btn ${formData.meetingFormat === 'On-site' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, meetingFormat: 'On-site', location: '' })}
                  >
                    <MapPinIcon /> On-site
                  </button>
                </div>

                <div className="input-group">
                  <label className="input-label">
                    {formData.meetingFormat === 'Online' ? 'ลิงก์ประชุมออนไลน์' : 'สถานที่นัดหมาย'} <span className="required">*</span>
                  </label>
                  <input type="text" className="user-custom-input"
                    placeholder={formData.meetingFormat === 'Online' ? "วางลิงก์ Google Meet / Zoom / Teams" : "ระบุชื่อห้องประชุม หรือ สถานที่"}
                    value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                </div>

                <div className="input-group">
                  <label className="input-label">รายละเอียดเพิ่มเติม </label>
                  <textarea className="user-custom-input"
                    placeholder="ระบุรายละเอียดเพิ่มเติม..."
                    value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
              </div>

              {/* RIGHT: Summary Box */}
              <div className="summary-box">
                <h3 className="summary-title"><FileTextIcon /> สรุปการจอง</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <div className="summary-label"><CalendarIcon style={{ width: '14px' }} /> กิจกรรม</div>
                    <p className="summary-value">{formData.type || '-'}</p>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label"><MdOutlineCalendarMonth style={{ width: '14px' }} /> วันที่</div>
                    <p className="summary-value">{formData.days.length > 0 ? formatDisplayDate(formData.days[0]) : '-'}</p>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label"><FileTextIcon style={{ width: '14px' }} /> หัวข้อ</div>
                    <p className="summary-value">{formData.subject || '-'}</p>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label"><ClockIcon style={{ width: '14px' }} /> ระยะเวลา</div>
                    <p className="summary-value">{formData.duration === 'กำหนดเอง' ? `${customDuration} ${customDurationUnit}` : (formData.duration || '-')}</p>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label"><ClockIcon style={{ width: '14px' }} /> เวลา</div>
                    <p className="summary-value">
                      {formData.startTime
                        ? (() => {
                          // Display confirm time in correct timezone
                          const startObj = new Date(Date.parse(`${formData.days[0]}T${formData.startTime}:00+07:00`));
                          const endObj = new Date(startObj.getTime() + (getDurationInMinutes(formData.duration, customDuration, customDurationUnit) * 60000));

                          const s = startObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: selectedTimezone });
                          const e = endObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: selectedTimezone });
                          return `${s} - ${e} น.`;
                        })()
                        : '-'
                      }
                    </p>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">{formData.meetingFormat === 'Online' ? <MonitorIcon style={{ width: '14px' }} /> : <MapPinIcon style={{ width: '14px' }} />} รูปแบบ</div>
                    <p className="summary-value">{formData.meetingFormat}</p>
                  </div>
                  <div className="summary-item">
                    <label className="summary-label">
                      {formData.meetingFormat === 'Online' ? <FaLink style={{ width: '14px' }} /> : <MapPinIcon style={{ width: '14px' }} />}<span>{formData.meetingFormat === 'Online' ? 'ลิงก์ประชุมออนไลน์' : 'สถานที่นัดหมาย'}</span>
                    </label>
                    <p className="summary-value">{formData.location || '-'}</p>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label"><FileTextIcon style={{ width: '14px' }} /> รายละเอียดเพิ่มเติม</div>
                    <p className="summary-value">{formData.description || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="user-action-footer">
              <button className="btn-confirm" onClick={handleReview}>ยืนยันการจอง</button>
            </div>

          </div>

        ) : (
          <div className="user-view-container">
            {/* Filter Bar */}
            <div className="filter-bar">
              {/* Left: Tabs */}
              <div className="filter-tabs">
                <button
                  className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('upcoming'); setCurrentPage(1); }}
                >
                  กำลังจะมาถึง
                </button>
                <div className="tab-divider"></div>
                <button
                  className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('completed'); setCurrentPage(1); }}
                >
                  ประวัติการจอง
                </button>
              </div>

              {/* Right: Actions */}
              <div className="filter-actions-right">
                <div className="search-wrapper">
                  <input
                    type="text"
                    placeholder="ค้นหาการจอง..."
                    className="search-input"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
                <div className="filter-dropdown-wrapper">
                  <TimeDropdown
                    className="compact-dropdown"
                    value={filterType}
                    onChange={(val) => setFilterType(val)}
                    timeOptions={['แสดงทั้งหมด', ...new Set(schedules.map(item => item.type))]}
                    placeholder="เลือกกิจกรรมที่ต้องการ"
                  />
                </div>
                <div className="view-toggles">
                  <button
                    className={`view-toggle-btn ${viewLayout === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewLayout('grid')}
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button
                    className={`view-toggle-btn ${viewLayout === 'list' ? 'active' : ''}`}
                    onClick={() => setViewLayout('list')}
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Content Display */}
            <div className="bookings-content">
              {(() => {
                // Filter Logic
                // Filter Logic
                const filtered = bookings.filter(b => {
                  const sub = b.title || b.subject || ''; // Use title (which has subj) or subject
                  const desc = b.description || '';
                  const matchesSearch = sub.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    desc.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesType = filterType === 'แสดงทั้งหมด' || b.type === filterType;

                  // Tab Logic
                  const now = new Date();
                  const endTime = new Date(b.endTime);
                  const isCompleted = endTime < now;
                  const matchesTab = activeTab === 'upcoming' ? !isCompleted : isCompleted;

                  // User Logic
                  const matchesUser = currentUser && b.email === currentUser.email;

                  return matchesSearch && matchesType && matchesTab && matchesUser;
                }).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

                if (filtered.length === 0) {
                  return (
                    <div className="empty-state-view">
                      <div className="empty-icon-box">
                        <CalendarIcon style={{ width: 48, height: 48, color: '#9ca3af' }} />
                      </div>
                      <p>ไม่พบรายการที่ค้นหา</p>
                    </div>
                  );
                }

                // Pagination Logic
                const totalPages = Math.ceil(filtered.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);

                return (
                  <>
                    {/* Grid / List Layout */}
                    {/* Grid / List Layout */}
                    {viewLayout === 'grid' ? (
                      <div className="bookings-grid">
                        {currentItems.map(item => {
                          const starT = new Date(item.startTime);
                          const endT = new Date(item.endTime);
                          // Use selectedTimezone for Date
                          const dateStr = starT.toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            timeZone: selectedTimezone
                          });
                          // Use selectedTimezone for Time
                          const formatTime = (d) => d.toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: selectedTimezone
                          });
                          const timeRange = `${formatTime(starT)} - ${formatTime(endT)} น.`;
                          const isOnline = item.meetingFormat === 'Online' || (item.location && item.location.includes('http'));

                          return (
                            <div key={item.id} className={`booking-card ${activeTab === 'completed' ? 'history-card' : ''}`}>
                              <div className={`history-status-badge ${activeTab === 'upcoming' ? 'upcoming' : ''}`}>
                                <span className={`status-dot ${activeTab === 'upcoming' ? 'upcoming' : ''}`}></span>
                                {activeTab === 'upcoming' ? 'กำลังจะมาถึง' : 'เสร็จสิ้นแล้ว'}
                              </div>

                              <div className="card-header">
                                <h3 className="card-type">{item.type || 'นัดหมาย'}</h3>
                                <p className="card-subject">
                                  {item.subject || item.title.replace(/^\[.*?\]\s*/, '')}
                                </p>
                              </div>
                              <div className="card-body">
                                <div className="card-row">
                                  <CalendarIcon style={{ width: 18, height: 18 }} />
                                  <span>{dateStr}</span>
                                </div>
                                <div className="card-row">
                                  <ClockIcon style={{ width: 18, height: 18 }} />
                                  <span>{timeRange}</span>
                                </div>
                                <div className="card-row">
                                  {isOnline ? <MonitorIcon style={{ width: 18, height: 18 }} /> : <MapPinIcon style={{ width: 18, height: 18 }} />}
                                  <span className={`status-badge-text ${isOnline ? 'online' : 'onsite'}`}>
                                    {isOnline ? 'online' : 'on-site'}
                                  </span>
                                </div>
                              </div>
                              <div className="card-actions">
                                <button className="btn-card-action view" onClick={() => handleViewBookingDetails(item)}>
                                  ดูรายละเอียด
                                </button>
                                {activeTab === 'completed' ? (
                                  <button className="btn-card-action rebook" onClick={() => {
                                    // Logic to rebook: populate form with this item's details
                                    setFormData({
                                      ...formData,
                                      type: item.type,
                                      subject: item.subject || item.title.replace(/^\[.*?\]\s*/, ''),
                                      meetingFormat: item.meetingFormat || (item.location && item.location.includes('http') ? 'Online' : 'On-site'),
                                      location: item.location || '',
                                      description: item.description || ''
                                    });
                                    setIsViewMode(false); // Switch to form view
                                  }}>
                                    จองอีกครั้ง
                                  </button>
                                ) : (
                                  <button className="btn-card-action cancel" onClick={() => handleDeleteBooking(item.id)}>
                                    ยกเลิก
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bookings-list-container">
                        <table className="bookings-table">
                          <thead>
                            <tr>
                              <th>หัวข้อ</th>
                              <th style={{ padding: '5px', width: '50px', }}>กิจกรรม</th>
                              <th>วันที่</th>
                              <th>เวลา</th>
                              <th>รูปแบบ</th>
                              <th style={{ width: '90px', padding: '1rem', textAlign: 'center' }}>สถานะ</th>
                              <th>การดำเนินการ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentItems.map(item => {
                              const starT = new Date(item.startTime);
                              const endT = new Date(item.endTime);
                              // Use selectedTimezone for Date
                              const dateStr = starT.toLocaleDateString('th-TH', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                timeZone: selectedTimezone
                              });
                              // Use selectedTimezone for Time
                              const formatTime = (d) => d.toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: selectedTimezone
                              });
                              const timeRange = `${formatTime(starT)} - ${formatTime(endT)} น.`;
                              const isOnline = item.meetingFormat === 'Online' || (item.location && item.location.includes('http'));

                              return (
                                <tr key={item.id}>
                                  <td className="cell-subject" style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.subject || item.title.replace(/^\[.*?\]\s*/, '')}
                                  </td>
                                  <td style={{ padding: '5px', width: '50px', textAlign: 'center' }}>{item.type || 'นัดหมาย'}</td>
                                  <td style={{ padding: '5px', width: '120px', textAlign: 'center' }}>{dateStr}</td>
                                  <td style={{ padding: '16px', width: '120px', textAlign: 'center' }}>{timeRange}</td>
                                  <td style={{ padding: '5px', width: '100px', textAlign: 'center' }}>
                                    <span className={`status-badge-text ${isOnline ? 'online' : 'onsite'}`}>
                                      {isOnline ? 'Online' : 'On-site'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '2px', width: '90px', textAlign: 'center' }}>
                                    <div className={`history-status-badge ${activeTab === 'upcoming' ? 'upcoming' : ''}`} style={{ position: 'static', justifyContent: 'center' }}>
                                      <span className={`status-dot ${activeTab === 'upcoming' ? 'upcoming' : ''}`}></span>
                                      {activeTab === 'upcoming' ? 'กำลังจะมาถึง' : 'เสร็จสิ้นแล้ว'}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="table-actions">
                                      <button className="btn-table-action view" onClick={() => handleViewBookingDetails(item)}>
                                        ดูรายละเอียด
                                      </button>
                                      {activeTab === 'completed' ? (
                                        <button className="btn-table-action rebook" onClick={() => {
                                          setFormData({
                                            ...formData,
                                            type: item.type,
                                            subject: item.subject || item.title.replace(/^\[.*?\]\s*/, ''),
                                            meetingFormat: item.meetingFormat || (item.location && item.location.includes('http') ? 'Online' : 'On-site'),
                                            location: item.location || '',
                                            description: item.description || ''
                                          });
                                          setIsViewMode(false);
                                        }}>
                                          จองอีกครั้ง
                                        </button>
                                      ) : (
                                        <button className="btn-table-action cancel" onClick={() => handleDeleteBooking(item.id)}>
                                          ยกเลิก
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 0 && (
                      <div className="pagination-metrics">
                        <div className="pagination-text">
                          แสดง {currentItems.length} รายการจากทั้งหมด {filtered.length} รายการ
                        </div>
                        {totalPages > 1 && (
                          <div className="pagination-controls">
                            <button
                              className="page-btn"
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            >
                              <ChevronLeft size={16} />
                            </button>
                            {(() => {
                              let pages = [];
                              if (totalPages <= 7) {
                                pages = Array.from({ length: totalPages }, (_, i) => i + 1);
                              } else {
                                if (currentPage <= 4) {
                                  pages = [1, 2, 3, 4, 5, '...', totalPages];
                                } else if (currentPage >= totalPages - 3) {
                                  pages = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                                } else {
                                  pages = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
                                }
                              }

                              return pages.map((page, index) => (
                                <button
                                  key={index}
                                  className={`page-btn ${currentPage === page ? 'active' : ''} ${page === '...' ? 'dots' : ''}`}
                                  onClick={() => typeof page === 'number' && setCurrentPage(page)}
                                  disabled={page === '...'}
                                  style={page === '...' ? { cursor: 'default', backgroundColor: 'transparent', border: 'none', color: '#6b7280' } : {}}
                                >
                                  {page}
                                </button>
                              ));
                            })()}
                            <button
                              className="page-btn"
                              disabled={currentPage === totalPages}
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      <BookingPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onConfirm={handleConfirmBooking}
        data={{
          type: formData.type,
          subject: formData.subject,
          date: formData.days[0],
          timeSlot: formData.startTime ? `${formData.startTime} - ${calculateEndTime(formData.startTime, formData.duration).split('-')[1]} น.` : '-',
          duration: formData.duration === 'กำหนดเอง' ? `${customDuration} ${customDurationUnit}` : formData.duration,
          meetingFormat: formData.meetingFormat,
          location: formData.location,
          description: formData.description
        }}
      />

      {/* View Details Modal */}
      {
        viewingBooking && (
          <BookingPreviewModal
            isOpen={!!viewingBooking}
            onClose={() => setViewingBooking(null)}
            readOnly={true}
            data={viewingBooking}
            isHistory={activeTab === 'completed'}
          />
        )
      }

      <CustomDurationModal
        isOpen={showDurationModal}
        onClose={handleCustomDurationCancel}
        onConfirm={handleCustomDurationConfirm}
        initialValue={customDuration}
        initialUnit={customDurationUnit}
      />

      <TimezoneModal
        isOpen={showTimezoneModal}
        onClose={() => setShowTimezoneModal(false)}
        onSuccess={handleTimezoneSuccess}
        currentTimezone={selectedTimezone}
      />

      <SuccessToast
        isOpen={successToast.isOpen}
        onClose={() => setSuccessToast(prev => ({ ...prev, isOpen: false }))}
        title={successToast.title}
        subTitle={successToast.subTitle}
      />

      <NotificationModal
        isOpen={notificationPopup.isOpen}
        onClose={() => setNotificationPopup(prev => ({ ...prev, isOpen: false }))}
        title={notificationPopup.title}
        time={notificationPopup.time}
      />

      <CancelBookingModal
        isOpen={!!cancellingBooking}
        booking={cancellingBooking}
        onClose={() => setCancellingBooking(null)}
        onConfirm={confirmDeleteBooking}
      />

      {popupMessage.type === 'success' && <PopupModal message={popupMessage.message} onClose={() => setPopupMessage({ type: '', message: '' })} />}
      {popupMessage.type === 'error' && <ErrorPopup message={popupMessage.message} onClose={() => setPopupMessage({ type: '', message: '' })} />}
    </div >
  );
};
export default User;
