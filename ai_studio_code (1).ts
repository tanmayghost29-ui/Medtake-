import React, { useState, useEffect, useRef } from "react";
import {
  loadDatabase,
  getUserData,
  saveUserData,
  getActiveUsername,
  setActiveUsername
} from "./utils/storage";
import { UserData, Medicine } from "./types";
import { Header } from "./components/Header";
import { HomeTab } from "./components/HomeTab";
import { PatientsTab } from "./components/PatientsTab";
import { MedicinesTab } from "./components/MedicinesTab";
import { HistoryTab } from "./components/HistoryTab";
import { SmsTab } from "./components/SmsTab";
import { ShowcaseTab } from "./components/ShowcaseTab";
import { AuthScreen } from "./components/AuthScreen";
import { PublicLandingPage } from "./components/PublicLandingPage";
import { AlarmModal } from "./components/AlarmModal";
import { playRingtone, stopRingtone, speakReminder } from "./utils/audio";

export function App() {
  const [activeUsername, setActiveUser] = useState<string>(() => getActiveUsername());
  const [userData, setUserData] = useState<UserData>(() => getUserData(activeUsername));
  const [currentTab, setCurrentTab] = useState<string>("home");
  const [showLanding, setShowLanding] = useState<boolean>(() => !activeUsername);
  const [activeAlarmMed, setActiveAlarmMed] = useState<Medicine | null>(null);

  // Sync state whenever active username changes
  useEffect(() => {
    if (activeUsername) {
      setUserData(getUserData(activeUsername));
    }
  }, [activeUsername]);

  // Save changes to storage whenever userData mutates
  const handleUpdateUserData = (updated: UserData) => {
    setUserData(updated);
    if (activeUsername) {
      saveUserData(activeUsername, updated);
    }
  };

  // Medicine Alarm Watchdog Loop
  useEffect(() => {
    if (!activeUsername || !userData.medicines) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      userData.medicines.forEach((med) => {
        if (med.time === currentHHMM && med.last_fired !== currentHHMM) {
          med.last_fired = currentHHMM;
          handleUpdateUserData({ ...userData });
          setActiveAlarmMed(med);
          playRingtone(med.ringtone);

          const patient = userData.patients[med.patient];
          if (patient) {
            speakReminder(patient.name, med.name, med.meal_timing, patient.lang);
          }
        }
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [activeUsername, userData]);

  const handleLoginSuccess = (username: string) => {
    setActiveUsername(username);
    setActiveUser(username);
    setUserData(getUserData(username));
    setShowLanding(false);
  };

  const handleLogout = () => {
    setActiveUsername(null);
    setActiveUser("");
    setShowLanding(true);
  };

  // Render Public Landing Page
  if (showLanding && !activeUsername) {
    return (
      <PublicLandingPage
        onLaunchApp={() => setShowLanding(false)}
        onSignIn={() => setShowLanding(false)}
      />
    );
  }

  // Render Authentication Screen if not logged in
  if (!activeUsername) {
    return (
      <AuthScreen
        onLoginSuccess={handleLoginSuccess}
        onBackToLanding={() => setShowLanding(true)}
      />
    );
  }

  // Render Inner Protected Dashboard
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <Header
        activeTab={currentTab}
        onSelectTab={setCurrentTab}
        username={activeUsername}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-24">
        {currentTab === "home" && (
          <HomeTab
            userData={userData}
            onUpdateUserData={handleUpdateUserData}
            onTriggerAlarm={(med) => setActiveAlarmMed(med)}
          />
        )}
        {currentTab === "patients" && (
          <PatientsTab
            userData={userData}
            onUpdateUserData={handleUpdateUserData}
          />
        )}
        {currentTab === "medicines" && (
          <MedicinesTab
            userData={userData}
            onUpdateUserData={handleUpdateUserData}
          />
        )}
        {currentTab === "history" && (
          <HistoryTab
            userData={userData}
            onUpdateUserData={handleUpdateUserData}
            username={activeUsername}
          />
        )}
        {currentTab === "sms" && (
          <SmsTab
            userData={userData}
            onUpdateUserData={handleUpdateUserData}
          />
        )}
        {currentTab === "showcase" && <ShowcaseTab />}
      </main>

      {activeAlarmMed && (
        <AlarmModal
          medicine={activeAlarmMed}
          patient={userData.patients[activeAlarmMed.patient]}
          onAcknowledge={(status) => {
            stopRingtone();
            setActiveAlarmMed(null);
            // Log adherence in history...
          }}
        />
      )}
    </div>
  );
}

export default App;