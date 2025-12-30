import React from 'react';
import './LogoutModal.css';
import { LogOut } from 'lucide-react';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {

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

    if (!isOpen) return null;

    return (
        <div className="logout-modal-overlay">
            <div className="logout-modal-box" onClick={e => e.stopPropagation()}>
                <div className="logout-content-wrapper">
                    <div className="logout-icon-wrapper">
                        <LogOut size={32} />
                    </div>
                    <h3 className="logout-title">ออกจากระบบ</h3>
                    <p className="logout-description">
                        คุณจะต้องเข้าสู่ระบบใหม่เพื่อใช้งานอีกครั้ง<br />
                        แน่ใจหรือไม่ว่าต้องการออกจากระบบ?
                    </p>
                </div>

                <div className="logout-actions-row">
                    <button className="btn-logout-action cancel" onClick={onClose}>
                        ยกเลิก
                    </button>
                    <button className="btn-logout-action confirm" onClick={onConfirm}>
                        ออกจากระบบ
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogoutModal;
