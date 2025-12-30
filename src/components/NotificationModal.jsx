import React, { useState, useEffect, useRef } from 'react';
import './NotificationModal.css';
import { AlarmClock, ChevronRight } from 'lucide-react';

const NotificationModal = ({ isOpen, onClose, title, time }) => {
    const [sliderValue, setSliderValue] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef(null);
    const containerRef = useRef(null);
    const sliderValueRef = useRef(0); // Track value for event (ref)

    useEffect(() => {
        if (isOpen) {
            setSliderValue(0); // Reset on open
        }
    }, [isOpen]);

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

    useEffect(() => {
        sliderValueRef.current = sliderValue;
    }, [sliderValue]);

    const handleStart = (e) => {
        setIsDragging(true);
    };

    const handleMove = (e) => {
        if (!isDragging || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;

        // Calculate position relative to container
        let newValue = clientX - containerRect.left - (sliderRef.current ? sliderRef.current.offsetWidth / 2 : 25);

        // Clamping
        const maxVal = containerRect.width - (sliderRef.current ? sliderRef.current.offsetWidth : 50);

        if (newValue < 0) newValue = 0;
        if (newValue > maxVal) newValue = maxVal;

        setSliderValue(newValue);
    };

    const handleEnd = () => {
        setIsDragging(false);
        if (!containerRef.current) return;

        const containerWidth = containerRef.current.offsetWidth;
        const sliderWidth = sliderRef.current ? sliderRef.current.offsetWidth : 50;
        const maxVal = containerWidth - sliderWidth;
        const currentVal = sliderValueRef.current; // Read from Ref

        // Threshold to trigger close (e.g., 90%)
        if (currentVal > maxVal * 0.9) {
            setSliderValue(maxVal); // Snap to end
            setTimeout(() => {
                onClose();
            }, 200);
        } else {
            setSliderValue(0); // Snap back
        }
    };

    // Global event listeners for drag while mouse is down outside the element are hard in React without window listeners.
    // simpler to put listeners on the modal or window during drag.
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleMove);
            window.addEventListener('touchend', handleEnd);
        } else {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging]);


    if (!isOpen) return null;

    return (
        <div className="notif-modal-overlay">
            <div className="notif-modal-container">
                {/* Removed X Button */}

                <div className="notif-modal-icon-wrapper">
                    <div className="notif-modal-icon-circle">
                        <AlarmClock size={36} color="white" />
                    </div>
                </div>

                <h2 className="notif-modal-header">ถึงเวลาต้อง "{title}" แล้ว!</h2>
                <p className="notif-modal-time">
                    นาฬิกาตั้งไว้เวลา <span className="notif-modal-time-value">{time}</span>
                </p>

                {/* iPhone Style Slider */}
                <div className="slider-container" ref={containerRef}>
                    <div
                        className={`slider-fill ${isDragging ? 'dragging' : ''}`}
                        style={{ width: `${sliderValue > 0 ? sliderValue + 46 : 0}px` }}
                    />
                    <div className="slider-track-text" style={{ opacity: 1 - (sliderValue / 200) }}>เลื่อนเพื่อปิด</div>
                    <div
                        className="slider-knob"
                        ref={sliderRef}
                        style={{ transform: `translateX(${sliderValue}px)` }}
                        onMouseDown={handleStart}
                        onTouchStart={handleStart}
                    >
                        <ChevronRight size={24} color="#666" />
                    </div>
                </div>
            </div>
        </div>
    );
};


export default NotificationModal;
