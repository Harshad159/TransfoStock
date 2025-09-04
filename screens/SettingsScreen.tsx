
import React from 'react';
import Header from '../components/Header';
import Card from '../components/Card';

const SettingsScreen: React.FC = () => {
    return (
        <div>
            <Header title="Settings" />
            <div className="p-4 space-y-6">
                <Card title="Profile Settings">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Username</label>
                            <input type="text" value="Shopkeeper01" disabled className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md"/>
                        </div>
                        <div>
                            <button className="w-full bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-800 transition">Change Password</button>
                        </div>
                    </div>
                </Card>

                <Card title="Notification Settings">
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-text-primary">Enable Low Stock Alerts</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                        </label>
                    </div>
                </Card>

                <Card title="Data & Backup">
                     <div className="space-y-3">
                        <button onClick={() => alert('Syncing with cloud... (demo)')} className="w-full text-left flex items-center p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                            Sync with Cloud
                        </button>
                        <button onClick={() => alert('Creating local backup... (demo)')} className="w-full text-left flex items-center p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                            Create Local Backup
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default SettingsScreen;
