import React, { useState } from 'react';
import { Calendar as CalendarLucide, Clock as ClockLucide } from 'lucide-react';
import './NotificationView.css';

const NotificationView = ({ notifications, onMarkAllRead }) => {
    const [activeTab, setActiveTab] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const filteredNotifications = notifications.filter(n => {
        if (activeTab === 'All') return true;
        return n.type === activeTab.toLowerCase();
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentNotifications = filteredNotifications.slice(startIndex, startIndex + itemsPerPage);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setCurrentPage(1); // Reset to first page on tab change
    };

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return (
        <div className="notification-view-container">
            <div className="nv-header">
                <h2 className="nv-title">การแจ้งเตือน</h2>
                <p className="nv-subtitle">อัปเดตเกี่ยวกับการจองและเขตเวลาของคุณ</p>
            </div>

            <div className="nv-tabs">
                {['All', 'Booking', 'Timezone'].map(tab => (
                    <button
                        key={tab}
                        className={`nv-tab-btn ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => handleTabChange(tab)}
                    >
                        {tab === 'All' ? 'ทั้งหมด' : tab === 'Booking' ? 'การจอง' : 'เขตเวลา'}
                    </button>
                ))}
            </div>

            <div className="nv-body">
                {currentNotifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                        ไม่มีการแจ้งเตือนในขณะนี้
                    </div>
                ) : (
                    currentNotifications.map(item => (
                        <div key={item.id} className={`nv-list-item ${!item.read ? 'unread' : ''}`}>
                            <div className="nv-icon-box" style={{
                                background: item.type === 'timezone' ? '#fef2f2' : '#f0f9ff',
                                color: item.type === 'timezone' ? '#ef4444' : '#3b82f6',
                            }}>
                                {item.type === 'timezone' ? <ClockLucide size={24} /> : (
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CalendarLucide size={24} strokeWidth={2} />
                                        <span style={{ position: 'absolute', top: '9px', fontSize: '9px', fontWeight: 'bold' }}>{item.dayOfMonth}</span>
                                    </div>
                                )}
                                {!item.read && <div className="nv-unread-dot"></div>}
                            </div>

                            <div className="nv-content">
                                <div className="nv-header-row">
                                    <div className="nv-item-title">
                                        {item.title}
                                    </div>
                                    <div className="nv-timestamp">{item.footerTime}</div>
                                </div>
                                <div className="nv-desc">{item.desc}</div>
                                <div className="nv-sub-desc">{item.fullThaiInfo}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="nv-footer">
                <span className="nv-footer-count">แสดง {currentNotifications.length} รายการจากทั้งหมด {filteredNotifications.length} รายการ</span>

                {totalPages > 1 && (
                    <div className="nv-pagination">
                        <button
                            className="nv-page-btn"
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                        >
                            &lt;
                        </button>

                        {(() => {
                            let pages = [];
                            if (totalPages <= 5) {
                                pages = Array.from({ length: totalPages }, (_, i) => i + 1);
                            } else {
                                if (currentPage <= 3) {
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
                                    className={`nv-page-btn ${currentPage === page ? 'active' : ''}`}
                                    onClick={() => typeof page === 'number' && handlePageChange(page)}
                                    disabled={page === '...'}
                                    style={page === '...' ? { cursor: 'default', backgroundColor: 'transparent', border: 'none', color: '#6b7280' } : {}}
                                >
                                    {page}
                                </button>
                            ));
                        })()}

                        <button
                            className="nv-page-btn"
                            disabled={currentPage === totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                        >
                            &gt;
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationView;
