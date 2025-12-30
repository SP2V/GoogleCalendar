import React from 'react';
import './CancelBookingModal.css';
import { CalendarX } from 'lucide-react';

const CancelBookingModal = ({ isOpen, onClose, onConfirm, booking }) => {
    // Prevent body scroll when modal is open
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !booking) return null;

    // Format date and time for display
    const startDate = new Date(booking.startTime);
    const endDate = new Date(booking.endTime);

    const dateStr = startDate.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const timeStr = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')} - ${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')} น.`;

    return (
        <div className="cancel-modal-overlay" onClick={onClose}>
            <div className="cancel-modal-box" onClick={e => e.stopPropagation()}>
                <div className="cancel-icon-wrapper">
                    <div className="cancel-icon-inner">
                        {/* Using a custom SVG or Lucide icon. The user image shows a calendar with X */}
                        <CalendarX size={40} strokeWidth={1.5} />
                    </div>
                </div>

                <h3 className="cancel-modal-title">ยกเลิกการจอง</h3>
                <p className="cancel-modal-message">คุณต้องการยกเลิกการจองนี้หรือไม่?</p>

                <div className="booking-details-box">
                    <p className="booking-detail-text">
                        {booking.type || 'นัดหมาย'}: {booking.subject || booking.title}
                    </p>
                    <p className="booking-detail-text" style={{ color: '#4b5563', fontSize: '0.9rem', marginTop: '4px' }}>
                        {dateStr} {timeStr}
                    </p>
                </div>

                <div className="cancel-modal-actions">
                    <button className="btn-modal-cancel" onClick={onClose}>
                        ปิด
                    </button>
                    <button className="btn-modal-confirm" onClick={() => onConfirm(booking.id)}>
                        ยืนยันการยกเลิก
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CancelBookingModal;
