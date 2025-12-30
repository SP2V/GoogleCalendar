import React, { useState, useEffect, useMemo, useRef } from 'react';
import './TimezoneModal.css';
import { Clock, ChevronDown, AlertCircle, X } from 'lucide-react';
import { thaiTimezones } from '../constants/timezones';
import { TbTimezone } from "react-icons/tb";

const TimezoneModal = ({ isOpen, onClose, onSuccess, currentTimezone }) => {
    // State
    const [selectedTimezone, setSelectedTimezone] = useState({ label: "(GMT+07:00) เวลาอินโดจีน - กรุงเทพ", value: "Asia/Bangkok" });
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Filter state
    const [filterText, setFilterText] = useState("");

    // Effect to prevent body scroll
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

    // Effect to set default
    useEffect(() => {
        if (isOpen) {
            // Priority: currentTimezone passed prop -> localStorage -> Default 'Asia/Bangkok'
            let initialValue = 'Asia/Bangkok';

            if (typeof currentTimezone === 'string') {
                initialValue = currentTimezone;
            } else if (currentTimezone && currentTimezone.value) {
                initialValue = currentTimezone.value;
            } else {
                const savedK = localStorage.getItem('userTimezone');
                if (savedK) initialValue = savedK;
            }

            const found = thaiTimezones.find(t => t.value === initialValue);

            if (found) {
                setSelectedTimezone(found);
            } else {
                // Fallback to Bangkok if not found
                const defaultTz = thaiTimezones.find(t => t.value === 'Asia/Bangkok');
                if (defaultTz) setSelectedTimezone(defaultTz);
                else if (thaiTimezones.length > 0) setSelectedTimezone(thaiTimezones[0]);
            }
        }
    }, [isOpen, currentTimezone]);

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

    const handleSelect = (item) => {
        setSelectedTimezone(item);
        setIsDropdownOpen(false);
        setFilterText("");
    };

    if (!isOpen) return null;

    // Filtered options
    const filteredOptions = thaiTimezones.filter(item =>
        item.label.toLowerCase().includes(filterText.toLowerCase())
    );

    return (
        <div className="timezone-modal-overlay">
            <div className="timezone-modal-box" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="timezone-header-redesign">
                    <div className="timezone-title-main">การตั้งค่าเขตเวลา</div>
                    <div className="timezone-subtitle">จัดการเขตเวลาสำหรับการแสดงผลและการแจ้งเตือน</div>
                    <button className="timezone-close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Selection Card */}
                <div className="timezone-selection-card" ref={dropdownRef} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                    <div className="timezone-icon-box">
                        <TbTimezone size={20} />
                    </div>
                    <div className="timezone-info">
                        <span className="timezone-info-label">เขตเวลาปัจจุบัน</span>
                        <span className="timezone-info-value">{selectedTimezone.label}</span>
                    </div>
                    <div className="timezone-chevron">
                        <ChevronDown size={20} />
                    </div>

                    {/* Custom Dropdown */}
                    {isDropdownOpen && (
                        <div className="timezone-dropdown-list" onClick={e => e.stopPropagation()}>
                            {/* Search Input inside dropdown */}
                            <div style={{ padding: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="ค้นหา..."
                                    style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none' }}
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    autoFocus
                                    onClick={e => e.stopPropagation()} // Prevent closing
                                />
                            </div>
                            {filteredOptions.length > 0 ? filteredOptions.map((item, index) => (
                                <div
                                    key={index}
                                    className={`timezone-dropdown-item ${selectedTimezone.value === item.value ? 'active' : ''}`}
                                    onClick={() => handleSelect(item)}
                                >
                                    {item.label}
                                </div>
                            )) : (
                                <div style={{ padding: '10px', textAlign: 'center', color: '#888' }}>ไม่พบข้อมูล</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <button className="timezone-action-btn" onClick={() => onSuccess && onSuccess(selectedTimezone)}>
                    เปลี่ยนเขตเวลา
                </button>

                {/* Warning Box */}
                <div className="timezone-warning-box">
                    <div className="timezone-warning-icon">
                        <AlertCircle size={20} />
                    </div>
                    <div className="timezone-warning-content">
                        <div className="timezone-warning-title">ข้อมูลสำคัญ</div>
                        <div className="timezone-warning-desc">
                            การเปลี่ยนเขตเวลาจะส่งผลต่อการแสดงเวลาของการนัดหมายและการแจ้งเตือนทั้งหมด
                            กรุณาตรวจสอบให้แน่ใจก่อนบันทึก
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TimezoneModal;
