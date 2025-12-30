import React, { useEffect } from 'react';
import { Trash } from 'lucide-react';
import './DeleteNotificationModal.css';

const DeleteNotificationModal = ({ isOpen, onClose, onConfirm, notification }) => {
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

    if (!isOpen || !notification) return null;

    const formatFullDate = (dateStr, timeStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const thaiDate = date.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        return `${thaiDate} ${timeStr}น.`;
    };

    return (
        <div className="dn-modal-overlay" onClick={onClose}>
            <div className="dn-modal-container" onClick={e => e.stopPropagation()}>
                <div className="dn-icon-wrapper">
                    <Trash size={32} color="white" strokeWidth={2.5} />
                </div>

                <h3 className="dn-title">ลบการแจ้งเตือน</h3>
                <p className="dn-subtitle">คุณต้องการลบการเตือนนี้หรือไหม?</p>

                <div className="dn-info-box">
                    <div className="dn-info-title">{notification.title}</div>
                    <div className="dn-info-date">
                        {(() => {
                            const daysOfWeek = [
                                { id: 0, label: 'ทุกวันอาทิตย์' },
                                { id: 1, label: 'ทุกวันจันทร์' },
                                { id: 2, label: 'ทุกวันอังคาร' },
                                { id: 3, label: 'ทุกวันพุธ' },
                                { id: 4, label: 'ทุกวันพฤหัสบดี' },
                                { id: 5, label: 'ทุกวันศุกร์' },
                                { id: 6, label: 'ทุกวันเสาร์' },
                            ];

                            let dateText = "";
                            if (notification.repeatDays && notification.repeatDays.length > 0) {
                                if (notification.repeatDays.length === 7) {
                                    dateText = "ทุกวัน";
                                } else {
                                    const isWeekend = notification.repeatDays.length === 2 && notification.repeatDays.includes(0) && notification.repeatDays.includes(6);
                                    const isWeekday = notification.repeatDays.length === 5 && [1, 2, 3, 4, 5].every(d => notification.repeatDays.includes(d));

                                    if (isWeekend) dateText = "ทุกวันสุดสัปดาห์";
                                    else if (isWeekday) dateText = "ทุกวันธรรมดา";
                                    else {
                                        dateText = notification.repeatDays
                                            .map(id => daysOfWeek.find(d => d.id === parseInt(id))?.label.replace('ทุกวัน', ''))
                                            .filter(Boolean)
                                            .join(', ');
                                    }
                                }
                            } else if (notification.date) {
                                const date = new Date(notification.date);
                                dateText = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
                            }

                            return `${notification.time} น. | ${dateText}`;
                        })()}
                    </div>
                </div>

                <div className="dn-actions">
                    <button className="dn-btn cancel" onClick={onClose}>
                        ปิด
                    </button>
                    <button className="dn-btn confirm" onClick={onConfirm}>
                        ยืนยัน
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteNotificationModal;
