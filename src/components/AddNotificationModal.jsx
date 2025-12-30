import React, { useState, useRef, useEffect } from 'react';
import { X, Calendar, Clock, ChevronDown, Search, ChevronRight, RotateCcw, Check as IconCheck, ChevronLeft as IconChevronLeft } from 'lucide-react';
import { AlarmClock } from 'lucide-react';
import { thaiTimezones } from '../constants/timezones';
import './AddNotificationModal.css';

// --- Time Wheel Picker Component ---
const TimeWheelPickerModal = ({ isOpen, onClose, onConfirm, initialValue }) => {
    if (!isOpen) return null;

    const [selectedHour, setSelectedHour] = useState('09');
    const [selectedMinute, setSelectedMinute] = useState('00');

    const hourListRef = useRef(null);
    const minuteListRef = useRef(null);
    const isScrollingRef = useRef(false);

    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

    // Initial setup
    useEffect(() => {
        if (isOpen) {
            let initialH = '09';
            let initialM = '00';

            if (initialValue) {
                const [h, m] = initialValue.split(':');
                initialH = h;
                initialM = m;
            } else {
                const now = new Date();
                initialH = String(now.getHours()).padStart(2, '0');
                initialM = String(now.getMinutes()).padStart(2, '0');
            }

            setSelectedHour(initialH);
            setSelectedMinute(initialM);

            // Scroll to initial position after render
            setTimeout(() => {
                if (hourListRef.current) {
                    hourListRef.current.scrollTop = parseInt(initialH) * 40;
                }
                if (minuteListRef.current) {
                    minuteListRef.current.scrollTop = parseInt(initialM) * 40;
                }
            }, 0);
        }
    }, [isOpen, initialValue]);

    const handleConfirm = () => {
        onConfirm(`${selectedHour}:${selectedMinute}`);
        onClose();
    };

    const scrollTimeoutRef = useRef(null);

    const handleScroll = (e, type) => {
        if (isScrollingRef.current) return;

        // Clear previous timeout to debounce the state update
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

        scrollTimeoutRef.current = setTimeout(() => {
            const itemHeight = 40;
            const index = Math.round(e.target.scrollTop / itemHeight);

            if (type === 'hour') {
                const val = hours[index];
                if (val && val !== selectedHour) setSelectedHour(val);
            } else {
                const val = minutes[index];
                if (val && val !== selectedMinute) setSelectedMinute(val);
            }
        }, 50); // Small delay to allow smooth scrolling without constant re-renders
    };

    const handleItemClick = (val, type) => {
        isScrollingRef.current = true;
        const itemHeight = 40;

        if (type === 'hour') {
            setSelectedHour(val);
            if (hourListRef.current) {
                hourListRef.current.scrollTo({
                    top: hours.indexOf(val) * itemHeight,
                    behavior: 'smooth'
                });
            }
        } else {
            setSelectedMinute(val);
            if (minuteListRef.current) {
                minuteListRef.current.scrollTo({
                    top: minutes.indexOf(val) * itemHeight,
                    behavior: 'smooth'
                });
            }
        }

        // Reset scrolling lock after animation
        setTimeout(() => {
            isScrollingRef.current = false;
        }, 500);
    };

    return (
        <div className="an-modal-overlay" style={{ zIndex: 1001 }} onClick={onClose}>
            <div className="time-picker-card" onClick={e => e.stopPropagation()}>
                <div className="time-picker-header">
                    <span className="time-picker-label">ชั่วโมง</span>
                    <span className="time-picker-label">นาที</span>
                </div>
                <div className="time-picker-body">
                    {/* Visual Highlight Bar */}
                    <div className="time-selection-bar"></div>

                    {/* Hours Column */}
                    <div className="time-column">
                        <div
                            className="time-scroll-container"
                            ref={hourListRef}
                            onScroll={(e) => handleScroll(e, 'hour')}
                        >
                            {hours.map(h => (
                                <div
                                    key={h}
                                    className={`time-item ${selectedHour === h ? 'selected' : ''}`}
                                    onClick={() => handleItemClick(h, 'hour')}
                                >
                                    {h}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="time-separator">:</div>

                    {/* Minutes Column */}
                    <div className="time-column">
                        <div
                            className="time-scroll-container"
                            ref={minuteListRef}
                            onScroll={(e) => handleScroll(e, 'minute')}
                        >
                            {minutes.map(m => (
                                <div
                                    key={m}
                                    className={`time-item ${selectedMinute === m ? 'selected' : ''}`}
                                    onClick={() => handleItemClick(m, 'minute')}
                                >
                                    {m}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <button className="time-confirm-btn" onClick={handleConfirm}>ตกลง</button>
            </div>
        </div>
    );
};

// --- Custom Date Picker Component ---
const CustomDatePickerModal = ({ isOpen, onClose, onConfirm, initialDate }) => {
    if (!isOpen) return null;

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDateResult, setSelectedDateResult] = useState(null);

    const thaiMonthNames = [
        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];

    useEffect(() => {
        if (isOpen) {
            if (initialDate) {
                const date = new Date(initialDate);
                setCurrentDate(date);
                setSelectedDateResult(date);
            } else {
                const now = new Date();
                setCurrentDate(now);
                setSelectedDateResult(now);
            }
        }
    }, [isOpen, initialDate]);

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleDateClick = (day) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);

        // Check if past date
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (newDate < today) return;

        setSelectedDateResult(newDate);

        // Auto confirm and close
        const year = newDate.getFullYear();
        const month = String(newDate.getMonth() + 1).padStart(2, '0');
        const d = String(newDate.getDate()).padStart(2, '0');
        onConfirm(`${year}-${month}-${d}`);
        onClose();
    };

    const renderDays = () => {
        const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
        const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
        const days = [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="date-day-item empty"></div>);
        }

        // Days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            const thisDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
            const isSelected = selectedDateResult &&
                selectedDateResult.getDate() === i &&
                selectedDateResult.getMonth() === currentDate.getMonth() &&
                selectedDateResult.getFullYear() === currentDate.getFullYear();

            const isDisabled = thisDate < today;

            days.push(
                <div
                    key={i}
                    className={`date-day-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => !isDisabled && handleDateClick(i)}
                >
                    {i}
                </div>
            );
        }

        return days;
    };

    return (
        <div className="an-modal-overlay" style={{ zIndex: 1002 }} onClick={onClose}>
            <div className="date-picker-card" onClick={e => e.stopPropagation()}>
                <div className="date-picker-header">
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        <span className="date-picker-title">เลือกวันที่</span>
                    </div>
                    <div className="date-picker-nav">
                        <button className="date-nav-btn" onClick={handlePrevMonth}><IconChevronLeft size={20} /></button>
                        <span className="date-current-month">
                            {thaiMonthNames[currentDate.getMonth()]} {currentDate.getFullYear() + 543}
                        </span>
                        <button className="date-nav-btn" onClick={handleNextMonth}><ChevronRight size={20} /></button>
                    </div>
                </div>

                <div className="date-picker-body">
                    <div className="date-week-header">
                        <span>อา</span><span>จ</span><span>อ</span><span>พ</span>
                        <span>พฤ</span><span>ศ</span><span>ส</span>
                    </div>
                    <div className="date-grid">
                        {renderDays()}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AddNotificationModal = ({ isOpen, onClose, onSave, initialData = null }) => {
    const [title, setTitle] = useState('');
    const [time, setTime] = useState('');
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false); // New State
    const [date, setDate] = useState('');
    const [timezone, setTimezone] = useState('Asia/Bangkok');

    // Dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [filterText, setFilterText] = useState("");
    const dropdownRef = useRef(null);

    const [view, setView] = useState('MAIN'); // 'MAIN' | 'DAYS'
    const [selectedDays, setSelectedDays] = useState([]); // Array of integers 0-6 (Sun-Sat)
    const [prevSelectedDays, setPrevSelectedDays] = useState([]); // Backup for cancel action

    const daysOfWeek = [
        { id: 0, label: 'ทุกวันอาทิตย์' },
        { id: 1, label: 'ทุกวันจันทร์' },
        { id: 2, label: 'ทุกวันอังคาร' },
        { id: 3, label: 'ทุกวันพุธ' },
        { id: 4, label: 'ทุกวันพฤหัสบดี' },
        { id: 5, label: 'ทุกวันศุกร์' },
        { id: 6, label: 'ทุกวันเสาร์' },
    ];

    // Initial value effect or when opening
    useEffect(() => {
        if (isOpen) {
            setView('MAIN'); // Reset view
            if (initialData) {
                // Edit Mode
                setTitle(initialData.title || '');
                setTime(initialData.time || '');
                setDate(initialData.date || new Date().toLocaleDateString('en-CA'));
                setTimezone(initialData.timezoneRef || initialData.timezone || 'Asia/Bangkok');
                if (initialData.repeatDays) {
                    setSelectedDays(initialData.repeatDays);
                } else {
                    setSelectedDays([]);
                }
            } else {
                // Add Mode
                setTitle('');
                setTime('');
                setDate(new Date().toLocaleDateString('en-CA'));
                setTimezone('Asia/Bangkok');
                setSelectedDays([]);
            }
        }
    }, [isOpen, initialData]);

    // Prevent background scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isDropdownOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!title || !time || (selectedDays.length === 0 && !date)) return;
        const selectedTz = thaiTimezones.find(tz => tz.value === timezone);

        const saveData = {
            title,
            time,
            date: selectedDays.length === 0 ? date : null,
            repeatDays: selectedDays,
            timezoneRef: timezone,
            timezone: selectedTz ? selectedTz.label : timezone
        };

        if (initialData && initialData.id) {
            saveData.id = initialData.id;
        }

        onSave(saveData);
        if (!initialData) handleClose();
        else onClose();
    };

    const handleClose = () => {
        setTitle('');
        setTime('');
        setDate('');
        setTimezone('Asia/Bangkok');
        setSelectedDays([]);
        setView('MAIN');
        onClose();
    };

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
        setFilterText(""); // Reset filter on toggle
    };

    const handleSelectTimezone = (tzValue) => {
        setTimezone(tzValue);
        setIsDropdownOpen(false);
    };

    const toggleDaySelection = (dayId) => {
        setSelectedDays(prev => {
            if (prev.includes(dayId)) {
                return prev.filter(id => id !== dayId);
            } else {
                return [...prev, dayId].sort();
            }
        });
    }

    // Filter timezones
    const filteredTimezones = thaiTimezones.filter(tz =>
        tz.label.toLowerCase().includes(filterText.toLowerCase())
    );

    const selectedTimezoneLabel = thaiTimezones.find(tz => tz.value === timezone)?.label || timezone;

    // Helper to format repeat text
    const getRepeatText = () => {
        if (selectedDays.length === 0) return "ไม่ซ้ำ";
        if (selectedDays.length === 7) return "ทุกวัน";

        // Check for Weekend (Sat + Sun only)
        const isWeekend = selectedDays.length === 2 && selectedDays.includes(0) && selectedDays.includes(6);
        if (isWeekend) return "ทุกวันสุดสัปดาห์";

        // Check for Weekday (Mon-Fri only)
        const isWeekday = selectedDays.length === 5 && [1, 2, 3, 4, 5].every(d => selectedDays.includes(d));
        if (isWeekday) return "ทุกวันธรรมดา";

        // Map ids back to short names if needed, or just list count
        // For now, let's keep it simple or join labels
        return selectedDays.map(id => daysOfWeek.find(d => d.id === id).label.replace('ทุกวัน', '')).join(', ');
    };

    // Sub-view: Select Days
    if (view === 'DAYS') {
        return (
            <div className="an-modal-overlay">
                <div className="an-modal-container slide-in">
                    <div className="an-modal-header">
                        <div className="an-header-nav">
                            <button className="an-nav-btn" onClick={() => {
                                setSelectedDays(prevSelectedDays);
                                setView('MAIN');
                            }} style={{ marginRight: 'auto' }}>
                                <IconChevronLeft size={24} />
                            </button>
                            <span className="an-header-title">เลือกวัน</span>
                            <button className="an-nav-action" onClick={() => setView('MAIN')}>บันทึก</button>
                        </div>
                    </div>
                    <div className="an-modal-body no-padding">
                        <div className="an-day-list">
                            {daysOfWeek.map(day => (
                                <div key={day.id} className="an-day-item" onClick={() => toggleDaySelection(day.id)}>
                                    <span>{day.label}</span>
                                    <div className={`an-checkbox ${selectedDays.includes(day.id) ? 'checked' : ''}`}>
                                        {selectedDays.includes(day.id) && <IconCheck size={14} color="white" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="an-modal-overlay">
            <div className="an-modal-container" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="an-modal-header">
                    <div className="an-title-box">
                        <AlarmClock size={28} strokeWidth={2.5} color="#2563eb" />
                        <span>{initialData ? 'แก้ไขการแจ้งเตือน' : 'ตั้งนาฬิกาเตือน'}</span>
                    </div>
                </div>

                {/* Body */}
                <div className="an-modal-body">
                    {/* Name */}
                    <div className="an-input-group">
                        <label className="an-label">ชื่อการเตือน</label>
                        <input
                            type="text"
                            className="an-input-name"
                            placeholder="ระบุชื่อการแจ้งเตือน"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>

                    {/* Time & Date Row */}
                    <div className="an-input-group" style={{ flex: 1 }}>
                        <label className="an-label">เวลา</label>
                        <div className="an-input-wrapper" onClick={() => setIsTimePickerOpen(true)} style={{ cursor: 'pointer' }}>
                            <Clock className="an-input-icon-left" size={20} strokeWidth={2} />
                            <input
                                type="text"
                                className="an-input with-icon"
                                value={time || '--:--'}
                                readOnly
                                style={{ color: time ? '#1f2937' : '#9ca3af', cursor: 'pointer' }}
                            />
                            <ChevronRight className="an-select-chevron" size={16} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {/* Repeat Days */}
                        <div className="an-input-group" style={{ flex: 1 }}>
                            <label className="an-label">ทำซ้ำ</label>
                            <div className="an-input-wrapper" onClick={() => {
                                setPrevSelectedDays(selectedDays);
                                setView('DAYS');
                            }} style={{ cursor: 'pointer' }}>
                                <RotateCcw className="an-input-icon-left" size={20} strokeWidth={2} />
                                <input
                                    type="text"
                                    className="an-input with-icon"
                                    value={getRepeatText()}
                                    readOnly
                                    style={{ color: '#1f2937', cursor: 'pointer' }}
                                />
                                <ChevronRight className="an-select-chevron" size={16} />
                            </div>
                        </div>
                        {/* Date */}
                        <div className="an-input-group" style={{ flex: 1, opacity: selectedDays.length > 0 ? 0.5 : 1 }}>
                            <label className="an-label">วันที่</label>
                            <div
                                className="an-input-wrapper"
                                onClick={() => {
                                    if (selectedDays.length === 0) setIsDatePickerOpen(true);
                                }}
                                style={{ cursor: selectedDays.length > 0 ? 'not-allowed' : 'pointer', backgroundColor: selectedDays.length > 0 ? '#f3f4f6' : 'white' }}
                            >
                                <Calendar className="an-input-icon-left" size={20} strokeWidth={2} />
                                <input
                                    type="text"
                                    className="an-input with-icon"
                                    value={date ? date.split('-').reverse().join('/') : ''}
                                    placeholder="dd/mm/yyyy"
                                    readOnly
                                    style={{ color: date ? '#1f2937' : '#9ca3af', cursor: selectedDays.length > 0 ? 'not-allowed' : 'pointer', backgroundColor: 'transparent' }}
                                />
                                <ChevronDown className="an-select-chevron" size={16} />
                            </div>
                        </div>
                    </div>

                    {/* Timezone Custom Dropdown */}
                    <div className="an-input-group" style={{ zIndex: 20 }}>
                        <label className="an-label">เขตเวลา</label>
                        <div className="an-select-wrapper" ref={dropdownRef}>
                            <div
                                className="an-input"
                                onClick={toggleDropdown}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                            >
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: '20px' }}>
                                    {selectedTimezoneLabel}
                                </span>
                                <ChevronDown className="an-select-chevron" size={16} style={{ position: 'static', transform: 'none' }} />
                            </div>

                            {isDropdownOpen && (
                                <div className="an-dropdown-list">
                                    <div className="an-search-box">
                                        <Search size={16} color="#9ca3af" style={{ marginRight: '8px' }} />
                                        <input
                                            type="text"
                                            placeholder="ค้นหา..."
                                            className="an-search-input"
                                            value={filterText}
                                            onChange={e => setFilterText(e.target.value)}
                                            autoFocus
                                            onClick={e => e.stopPropagation()}
                                        />
                                    </div>
                                    <div className="an-list-items">
                                        {filteredTimezones.length > 0 ? filteredTimezones.map(tz => (
                                            <div
                                                key={tz.value}
                                                className={`an-dropdown-item ${timezone === tz.value ? 'active' : ''}`}
                                                onClick={() => handleSelectTimezone(tz.value)}
                                            >
                                                {tz.label}
                                            </div>
                                        )) : (
                                            <div className="an-no-results">ไม่พบข้อมูล</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="an-modal-footer">
                    <button className="an-btn cancel" onClick={handleClose}>ยกเลิก</button>
                    <button className="an-btn save" onClick={handleSave}>บันทึก</button>
                </div>
            </div>

            {/* Time Picker Modal Overlay */}
            <TimeWheelPickerModal
                isOpen={isTimePickerOpen}
                initialValue={time}
                onClose={() => setIsTimePickerOpen(false)}
                onConfirm={(newTime) => setTime(newTime)}
            />

            {/* Custom Date Picker Modal Overlay */}
            <CustomDatePickerModal
                isOpen={isDatePickerOpen}
                initialDate={date}
                onClose={() => setIsDatePickerOpen(false)}
                onConfirm={(newDate) => setDate(newDate)}
            />
        </div>
    );
};

export default AddNotificationModal;
