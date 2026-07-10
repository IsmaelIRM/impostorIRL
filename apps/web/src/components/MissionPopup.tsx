import React from "react";

interface MissionPopupProps {
  html: string;
  onClose: () => void;
}

export function MissionPopup({ html, onClose }: MissionPopupProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}