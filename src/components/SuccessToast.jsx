import React from 'react';
import './SuccessToast.css';
import { Check } from 'lucide-react';

const SuccessToast = ({ isOpen, onClose, title, subTitle }) => {
    if (!isOpen) return null;

    return (
        <div className="st-overlay" onClick={onClose}>
            <div className="st-box" onClick={e => e.stopPropagation()}>
                <div className="st-icon-wrapper">
                    <Check strokeWidth={3} />
                </div>
                <div className="st-content">
                    <div className="st-title">{title}</div>
                    {subTitle && <div className="st-subtitle">{subTitle}</div>}
                </div>
            </div>
        </div>
    );
};

export default SuccessToast;
