import React, { useState, useRef, useEffect } from "react";
import "./AdminDropdown.css";

const TimeDropdown = ({ value, onChange, timeOptions, placeholder = "เลือกเวลา", bookedSlots = [], className = "" }) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value || "");
    const [filteredOptions, setFilteredOptions] = useState(timeOptions || []);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // อัปเดต inputValue เมื่อ value เปลี่ยนจากภายนอก
    useEffect(() => {
        setInputValue(value || "");
    }, [value]);

    // แก้ไข 1: useEffect นี้เอาไว้แค่ซิงค์ข้อมูลเริ่มต้น ไม่ต้องกรองที่นี่
    useEffect(() => {
        setFilteredOptions(timeOptions || []);
    }, [timeOptions]);

    // ปิด dropdown เมื่อคลิกข้างนอก
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpen(false);
                if (inputValue !== value) {
                    setInputValue(value || "");
                }
            }
        };

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open, inputValue, value]);

    // แก้ไข 2: ย้ายการกรองมาทำตอนพิมพ์ (User Typing) เท่านั้น
    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);

        if (!open) {
            setOpen(true);
        }

        // Logic การกรองอยู่ที่นี่
        if (timeOptions) {
            if (newValue.trim() !== "") {
                const filtered = timeOptions.filter(option => {
                    const optionStr = typeof option === 'string' ? option : option.toString();
                    return optionStr.toLowerCase().includes(newValue.toLowerCase()) ||
                        optionStr.toLowerCase().startsWith(newValue.toLowerCase());
                });
                setFilteredOptions(filtered);
            } else {
                setFilteredOptions(timeOptions);
            }
        }

        onChange(newValue);
    };

    // แก้ไข 3: เมื่อคลิกเมาส์ที่ Input ให้แสดงทั้งหมด (Reset Filter)
    const handleInputFocus = (e) => {
        setOpen(true);
        setFilteredOptions(timeOptions || []); // แสดงทั้งหมดเสมอเมื่อเริ่มคลิก
        setTimeout(() => {
            e.target.select();
        }, 0);
    };

    const handleSelectOption = (option) => {
        setInputValue(option);
        onChange(option);
        setOpen(false);
        inputRef.current?.blur();
    };

    const handleInputKeyDown = (e) => {
        if (e.key === "Enter" && filteredOptions.length > 0) {
            handleSelectOption(filteredOptions[0]);
        } else if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
        }
    };

    return (
        <div className={`time-dropdown ${className}`} ref={dropdownRef}>
            <input
                ref={inputRef}
                type="text"
                className={`time-input ${inputValue ? 'has-value' : ''}`}
                value={inputValue}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onKeyDown={handleInputKeyDown}
                placeholder={placeholder}
            />
            <div
                className="dropdown-arrow"
                onClick={() => {
                    if (!open) {
                        // แก้ไข 4: กดลูกศรก็ต้องแสดงทั้งหมด
                        setFilteredOptions(timeOptions || []);
                        setOpen(true);
                        inputRef.current?.focus();
                        setTimeout(() => {
                            inputRef.current?.select();
                        }, 0);
                    } else {
                        setOpen(false);
                    }
                }}
            >
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
                    <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>

            {open && filteredOptions.length > 0 && (
                <div className="dropdown-list">
                    {filteredOptions.map((t) => {
                        const optionValue = typeof t === 'string' ? t : (t.name || t.toString());
                        const optionKey = typeof t === 'string' ? t : (t.id || t.toString());
                        return (
                            <div
                                key={optionKey}
                                className={`dropdown-item ${bookedSlots.includes(optionValue) ? 'booked-slot' : ''}`}
                                onMouseDown={() => !bookedSlots.includes(optionValue) && handleSelectOption(optionValue)}
                                title={bookedSlots.includes(optionValue) ? 'เวลานี้ถูกจองแล้ว' : ''}
                            >
                                {optionValue}
                                {bookedSlots.includes(optionValue) && <span style={{ marginLeft: '5px', color: '#666' }}>(จองแล้ว)</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TimeDropdown;