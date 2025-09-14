"use client";

import { useState } from "react";

export default function SettingsPage() {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [dashboardTitle, setDashboardTitle] = useState("My Dashboard");
    const [saving, setSaving] = useState(false);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        // Simulate API save delay
        setTimeout(() => {
            setSaving(false);
            alert(`Settings saved:
- Notifications: ${notificationsEnabled ? "Enabled" : "Disabled"}
- Dashboard Title: ${dashboardTitle}`);
        }, 1200);
    }

    return (
        <main className="container mx-auto p-8 max-w-lg">
            <h2 className="text-3xl font-extrabold mb-8">Dashboard Settings</h2>
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Toggle */}
                <div className="flex items-center justify-between">
                    <label htmlFor="notifications" className="font-semibold text-lg">
                        Enable Notifications
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            id="notifications"
                            checked={notificationsEnabled}
                            onChange={() => setNotificationsEnabled(!notificationsEnabled)}
                            className="sr-only"
                        />
                        <div
                            className={`w-11 h-6 bg-gray-300 rounded-full dark:bg-gray-600
                ${notificationsEnabled ? "bg-primary" : ""} transition-colors`}
                        />
                        <div
                            className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow
                transition-transform
                ${notificationsEnabled ? "translate-x-5" : "translate-x-0"}`}
                        />
                    </label>
                </div>

                {/* Dashboard Title Input */}
                <div>
                    <label htmlFor="dashboardTitle" className="block font-semibold text-lg mb-2">
                        Dashboard Title
                    </label>
                    <input
                        id="dashboardTitle"
                        type="text"
                        value={dashboardTitle}
                        onChange={(e) => setDashboardTitle(e.target.value)}
                        className="w-full border border-gray-300 rounded px-4 py-2 dark:bg-gray-800 dark:border-gray-600"
                    />
                    <p className="mt-2 text-gray-500 dark:text-gray-400 italic">
                        Preview: <span className="font-bold">{dashboardTitle}</span>
                    </p>
                </div>

                {/* Save Button */}
                <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center justify-center px-6 py-3 bg-primary text-white rounded hover:bg-primary-dark transition disabled:opacity-50"
                >
                    {saving && (
                        <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            ></circle>
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                            ></path>
                        </svg>
                    )}
                    {saving ? "Saving..." : "Save Settings"}
                </button>
            </form>
        </main>
    );
}
