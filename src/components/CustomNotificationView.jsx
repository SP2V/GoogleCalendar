import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Globe, MoreVertical, Plus, ChevronLeft, ChevronRight, Trash, SquarePen, RotateCcw } from 'lucide-react';
import { AlarmClock } from 'lucide-react';
import AddNotificationModal from './AddNotificationModal';
import DeleteNotificationModal from './DeleteNotificationModal';
import './CustomNotificationView.css';

const CustomNotificationView = ({ notifications = [], onSaveNotification, onDeleteNotification }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [deleteItem, setDeleteItem] = useState(null);
    const [editItem, setEditItem] = useState(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeMenuId && !event.target.closest('.cn-card-menu') && !event.target.closest('.cn-menu-btn')) {
                setActiveMenuId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeMenuId]);

    const [activeTab, setActiveTab] = useState('one-time'); // 'one-time' or 'repeating'

    // Filter notifications based on active tab
    const filteredNotifications = notifications.filter(item => {
        const isRepeating = item.repeatDays && item.repeatDays.length > 0;
        return activeTab === 'repeating' ? isRepeating : !isRepeating;
    });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 3;

    // Reset page when tab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    // Calculate pagination properties
    const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;

    // Use filtered notifications
    const displayData = filteredNotifications.slice(indexOfFirstItem, indexOfLastItem);

    const handleSaveNotification = (data) => {
        if (onSaveNotification) {
            onSaveNotification(data);
        }
        setIsModalOpen(false);
    };

    // Helper to format date to Thai: "YYYY-MM-DD" -> "D MMMM YYYY"
    const formatDateThai = (dateStr) => {
        if (!dateStr) return "";
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div className="cn-container">
            <div className="cn-header">
                <div className="cn-header-left">
                    <AlarmClock size={30} strokeWidth={2.5} color="#2563eb" />
                    <h2 className="cn-title">การแจ้งเตือนของฉัน</h2>
                </div>
                <button className="cn-add-btn" onClick={() => setIsModalOpen(true)}>
                    <Plus size={24} strokeWidth={2.5} />
                </button>
            </div>

            {/* TAB SWITCHER */}
            <div className="cn-tab-container">
                <div className="cn-tab-switcher">
                    <div className={`cn-tab-glider ${activeTab}`}></div>
                    <button
                        onClick={() => setActiveTab('one-time')}
                        className={`cn-tab-btn ${activeTab === 'one-time' ? 'active' : ''}`}
                    >
                        ครั้งเดียว
                    </button>
                    <button
                        onClick={() => setActiveTab('repeating')}
                        className={`cn-tab-btn ${activeTab === 'repeating' ? 'active' : ''}`}
                    >
                        ซ้ำตามวัน
                    </button>
                </div>
            </div>

            <div className="cn-list">
                {displayData.length > 0 ? (
                    displayData.map((item) => (
                        <div key={item.id} className="cn-card">
                            <div className="cn-card-header">
                                <h3 className="cn-card-title">{item.title}</h3>
                                <div className="cn-meta-row">
                                    <div className="cn-meta-item">
                                        <Clock className="cn-icon" />
                                        <span>{item.time} น.</span>
                                    </div>
                                    <div className="cn-meta-item">
                                        <Globe className="cn-icon" />
                                        <span>{item.timezone}</span>
                                    </div>
                                    <div className="cn-meta-item">
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

                                            let icon = <RotateCcw className="cn-icon" />;
                                            let text = "ไม่ซ้ำ";

                                            if (item.repeatDays && item.repeatDays.length > 0) {
                                                if (item.repeatDays.length === 7) {
                                                    text = "ทุกวัน";
                                                } else {
                                                    // Check for Weekend
                                                    const isWeekend = item.repeatDays.length === 2 && item.repeatDays.includes(0) && item.repeatDays.includes(6);

                                                    // Check for Weekday
                                                    const isWeekday = item.repeatDays.length === 5 && [1, 2, 3, 4, 5].every(d => item.repeatDays.includes(d));

                                                    if (isWeekend) {
                                                        text = "ทุกวันสุดสัปดาห์";
                                                    } else if (isWeekday) {
                                                        text = "ทุกวันธรรมดา";
                                                    } else {
                                                        text = item.repeatDays
                                                            .map(id => daysOfWeek.find(d => d.id === parseInt(id))?.label.replace('ทุกวัน', ''))
                                                            .filter(Boolean)
                                                            .join(', ');
                                                    }
                                                }
                                            } else if (item.date) {
                                                icon = <Calendar className="cn-icon" />;
                                                text = formatDateThai(item.date);
                                            }

                                            return (
                                                <>
                                                    {icon}
                                                    <span className="truncate-text" title={text}>{text}</span>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                            <div className="cn-header-actions">
                                {/* Toggle Switch - Only for Repeating Alarms */}
                                {item.repeatDays && item.repeatDays.length > 0 && (
                                    <label className="cn-switch">
                                        <input
                                            type="checkbox"
                                            checked={item.isEnabled !== false}
                                            onChange={(e) => {
                                                handleSaveNotification({ ...item, isEnabled: e.target.checked, silent: true });
                                            }}
                                        />
                                        <span className="cn-slider round"></span>
                                    </label>
                                )}

                                <div style={{ position: 'relative' }}>
                                    <button
                                        className="cn-menu-btn"
                                        onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                                    >
                                        <MoreVertical size={20} />
                                    </button>
                                    {activeMenuId === item.id && (
                                        <div className="cn-card-menu" style={{
                                            position: 'absolute',
                                            right: 0,
                                            top: '100%',
                                            background: 'white',
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                            borderRadius: '12px',
                                            padding: '8px',
                                            zIndex: 10,
                                            minWidth: '120px',
                                            border: 'none',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}>
                                            <button
                                                className="cn-menu-item"
                                                onClick={() => {
                                                    setEditItem(item);
                                                    setActiveMenuId(null);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    color: '#374151',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '0.95rem',
                                                    borderRadius: '8px',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                            >
                                                <SquarePen size={18} strokeWidth={2.5} />
                                                <span style={{ fontWeight: 500 }}>แก้ไข</span>
                                            </button>

                                            <button
                                                className="cn-menu-item"
                                                onClick={() => {
                                                    setDeleteItem(item);
                                                    setActiveMenuId(null);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    color: '#ef4444',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '0.95rem',
                                                    borderRadius: '8px',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                            >
                                                <Trash size={18} strokeWidth={2.5} />
                                                <span style={{ fontWeight: 500 }}>ลบ</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                        {activeTab === 'one-time' ? 'ยังไม่มีรายการแจ้งเตือนครั้งเดียว' : 'ยังไม่มีรายการแจ้งเตือนแบบซ้ำ'}
                    </div>
                )}
            </div>

            <div className="cn-footer">
                <div className="cn-footer-text">
                    แสดง {displayData.length} รายการจากทั้งหมด {filteredNotifications.length} รายการ
                </div>
                {totalPages > 1 && (
                    <div className="cn-pagination">
                        <button
                            className="cn-page-btn"
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
                                    className={`cn-page-btn ${currentPage === page ? 'active' : ''}`}
                                    onClick={() => typeof page === 'number' && setCurrentPage(page)}
                                    disabled={page === '...'}
                                    style={page === '...' ? { cursor: 'default', backgroundColor: 'transparent', border: 'none', color: '#6b7280' } : {}}
                                >
                                    {page}
                                </button>
                            ));
                        })()}
                        <button
                            className="cn-page-btn"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            <AddNotificationModal
                isOpen={isModalOpen || !!editItem}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditItem(null);
                }}
                onSave={handleSaveNotification}
                initialData={editItem}
            />

            <DeleteNotificationModal
                isOpen={!!deleteItem}
                onClose={() => setDeleteItem(null)}
                onConfirm={() => {
                    if (onDeleteNotification && deleteItem) {
                        onDeleteNotification(deleteItem.id);
                    }
                    setDeleteItem(null);
                }}
                notification={deleteItem}
            />
        </div>
    );
};

export default CustomNotificationView;
