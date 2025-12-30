import React, { useEffect } from 'react';
import './TimezoneSuccessModal.css';
import { Check } from 'lucide-react';

const TimezoneSuccessModal = ({ isOpen, onClose, timezoneLabel }) => {

    // Scroll lock removed for toast notification behavior

    if (!isOpen) return null;

    // Parse the label to get cleaner display if needed
    // Label format: "(GMT+07:00) เวลาอินโดจีน - กรุงเทพ"
    // Desired subtitle: "ระบบตั้งค่าเป็น [Region] (GMT...)" or just rely on the label passed in.
    // The image shows: "ระบบตั้งค่าเป็น Singapore (GMT+08:00)"

    // Let's try to reformat the label to match "City (Offset)" if possible, 
    // or just display what we have but reordered.
    // Input: "(GMT+07:00) เวลาอินโดจีน - กรุงเทพ"
    // Output: "เวลาอินโดจีน - กรุงเทพ (GMT+07:00)" looks better logically?
    // Or just use the label as is. The user image has "Singapore (GMT+08:00)"

    let displayMask = timezoneLabel;
    const match = timezoneLabel.match(/^\((GMT[+-]\d{2}:\d{2})\)\s+(.+)$/);
    if (match) {
        const offset = match[1];
        const name = match[2];
        displayMask = `${name} ${offset}`;
    }

    return (
        <div className="tz-success-overlay" onClick={onClose}>
            <div className="tz-success-box" onClick={e => e.stopPropagation()}>
                <div className="tz-success-icon-wrapper">
                    <Check strokeWidth={3} />
                </div>
                <div className="tz-success-content">
                    <div className="tz-success-title">เปลี่ยนเขตเวลาเรียบร้อย</div>
                    <div className="tz-success-subtitle">ระบบตั้งค่าเป็น {displayMask}</div>
                </div>
            </div>
        </div>
    );
};

export default TimezoneSuccessModal;
