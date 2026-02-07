// src/context/GiftingContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { socketService } from '../services/socketService';
import GiftingOverlay from '../components/GiftingOverlay';

const GiftingContext = createContext();

export const GiftingProvider = ({ children }) => {
  const [activeGift, setActiveGift] = useState(null);

  useEffect(() => {
    const handleGift = (data) => {
      setActiveGift({
        id: data.giftId,
        senderName: data.senderName,
        combo: data.combo
      });
    };

    socketService.on('gift_received', handleGift);
    return () => socketService.off('gift_received', handleGift);
  }, []);

  const triggerGiftOverlay = (id, senderName, combo) => {
    setActiveGift({ id, senderName, combo });
  };

  return (
    <GiftingContext.Provider value={{ triggerGiftOverlay }}>
      {children}
      {activeGift && (
        <GiftingOverlay
          giftId={activeGift.id}
          senderName={activeGift.senderName}
          combo={activeGift.combo}
          onComplete={() => setActiveGift(null)}
        />
      )}
    </GiftingContext.Provider>
  );
};

export const useGifting = () => useContext(GiftingContext);
