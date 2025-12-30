import React from 'react';
import { Calendar, X } from 'lucide-react';
import './BookingPreviewModal.css';

const BookingPreviewModal = ({ isOpen, onClose, onConfirm, data, readOnly = false, isHistory }) => {
    if (!isOpen) return null;

    // Helper to format date
    const formatThaiDate = (dateStr) => {
        if (!dateStr) return '-';
        const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
        const [y, m, d] = dateStr.split('-').map(Number);
        return `${d} ${months[m - 1]} ${y + 543}`;
    };

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
    // Logic to determine status
    // Logic to determine status
    const getStatus = () => {
        if (!readOnly) return null;

        let isCompleted = false;

        // Use isHistory prop if available (Most reliable for List View)
        if (typeof isHistory === 'boolean') {
            isCompleted = isHistory;
        }
        // Try to use endTime
        else if (data.endTime) {
            const end = new Date(data.endTime);
            if (!isNaN(end.getTime())) {
                isCompleted = end < new Date();
            }
        }
        // Fallback: If no endTime, maybe use date/timeSlot? 
        // (For robust handling, if we assume bookings without endTime are 'Custom/Legacy', we might check date)
        else if (data.date) {
            // Basic check on date only (completed if date < today)
            // This is less precise but ensures a status is shown
            const dateObj = new Date(data.date); // yyyy-mm-dd
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            if (!isNaN(dateObj.getTime())) {
                isCompleted = dateObj < now;
            }
        }

        return {
            label: isCompleted ? 'เสร็จสิ้นแล้ว' : 'กำลังจะมาถึง',
            color: isCompleted ? '#10b981' : '#f97316', // Green : Orange
            dotColor: isCompleted ? '#10b981' : '#f97316'
        };
    };

    const status = getStatus();

    // Helper to format time range from ISO strings
    const formatTimeRange = (startIso, endIso) => {
        if (!startIso || !endIso) return '-';
        const format = (iso) => new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        return `${format(startIso)} - ${format(endIso)} น.`;
    };

    // Robust data getters
    const getDisplayData = () => {
        return {
            title: data.subject || data.title || '-',
            // Prefer data.date (YYYY-MM-DD) or extract from startTime
            date: data.date ? formatThaiDate(data.date) : (data.startTime ? formatThaiDate(data.startTime.split('T')[0]) : '-'),
            // Prefer data.timeSlot or format from start/end
            time: data.timeSlot || formatTimeRange(data.startTime, data.endTime),
            duration: data.duration || '-',
            location: data.location || '-'
        };
    };

    const display = getDisplayData();

    return (
        <div className="preview-modal-overlay">
            <div className="preview-modal-container">
                {/* Close Button X (Only for ReadOnly view or general close usage) */}
                {readOnly && (
                    <button className="btn-close-x" onClick={onClose}>
                        <X size={24} />
                    </button>
                )}
                {/* Header Icon */}
                <div className="icon-wrapper">
                    <div className="icon-circle">
                        <Calendar size={40} strokeWidth={1.5} />
                    </div>
                </div>

                {/* Title */}
                <div className="modal-header-text">
                    <h2 className="modal-title">{readOnly ? 'รายละเอียดการจอง' : 'ตรวจสอบการจอง'}</h2>
                    {status ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: status.dotColor }}></span>
                            <span style={{ color: status.color, fontSize: '16px', fontWeight: '500' }}>{status.label}</span>
                        </div>
                    ) : (
                        !readOnly && <p className="modal-subtitle">ข้อมูลการจองของคุณ</p>
                    )}
                </div>

                {/* Content Box */}
                <div className="content-box">
                    <div className="details-list">
                        <div className="detail-row">
                            <span className="detail-label">กิจกรรม:</span>
                            <span className="detail-value">{data.type}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">หัวข้อ:</span>
                            <span className="detail-value">{display.title}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">วันที่:</span>
                            <span className="detail-value">{display.date}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">เวลา:</span>
                            <span className="detail-value">{display.time}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">ระยะเวลา:</span>
                            <span className="detail-value">{display.duration}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">รูปแบบ:</span>
                            <span className="detail-value">{data.meetingFormat}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">{data.meetingFormat === 'Online' ? 'ลิงก์:' : 'สถานที่:'}</span>
                            <span className="detail-value">
                                {data.meetingFormat === 'Online' ? (
                                    <a href={display.location} target="_blank" rel="noopener noreferrer" className="link-text">{display.location}</a>
                                ) : (
                                    display.location
                                )}
                            </span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">รายละเอียด:</span>
                            <span className="detail-value">{data.description || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="modal-footer">
                    {!readOnly && (
                        <>
                            <button className="btn-modal btn-edit" onClick={() => {
                                document.body.style.overflow = 'unset';
                                onClose();
                            }}>
                                แก้ไข
                            </button>
                            <button className="btn-modal btn-confirm-modal" onClick={onConfirm}>
                                ยืนยัน
                            </button>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};

export default BookingPreviewModal;
