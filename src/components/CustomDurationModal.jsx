import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import './CustomDurationModal.css';

const CustomDurationModal = ({ isOpen, onClose, onConfirm, initialValue, initialUnit }) => {
    const [value, setValue] = useState(initialValue || '');
    const [unit, setUnit] = useState(initialUnit || 'นาที');

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue || '');
            setUnit(initialUnit || 'นาที');
        }
    }, [isOpen, initialValue, initialUnit]);

    // Prevent body scroll when modal is open
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

    if (!isOpen) return null;

    const handleConfirm = () => {
        const numVal = parseFloat(value);
        let totalMinutes = numVal;
        if (unit === 'ชั่วโมง') {
            totalMinutes = numVal * 60;
        }

        if (!numVal || totalMinutes < 10) {
            alert('กรุณาระบุระยะเวลาอย่างน้อย 10 นาที');
            return;
        }

        onConfirm(value, unit);
    };

    return (
        <div className="custom-duration-modal-overlay">
            <div className="custom-duration-modal-container">
                <h2 className="duration-modal-title">ระบุระยะเวลา</h2>

                <div className="duration-input-group">
                    <input
                        type="text"
                        className="duration-input"
                        placeholder="ระบุตัวเลข"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        autoFocus
                    />
                    <select
                        className="duration-select"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                    >
                        <option value="นาที">นาที</option>
                        <option value="ชั่วโมง">ชั่วโมง</option>
                    </select>
                </div>

                <div className="duration-modal-footer">
                    <button className="btn-duration-cancel" onClick={onClose}>
                        ยกเลิก
                    </button>
                    <button className="btn-duration-confirm" onClick={handleConfirm}>
                        ตกลง
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CustomDurationModal;
