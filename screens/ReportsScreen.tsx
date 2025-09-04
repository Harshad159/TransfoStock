import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import { useInventory } from '../context/InventoryContext';
import type { StockMovement, InwardDetails, OutwardDetails, ReturnDetails } from '../types';

const MovementDetail: React.FC<{ movement: StockMovement }> = ({ movement }) => {
    const renderDetails = () => {
        switch (movement.type) {
            case 'inward':
                const iDetails = movement.details as InwardDetails;
                return `from ${iDetails.purchaserName} (Bill: ${iDetails.billNo})`;
            case 'outward':
                const oDetails = movement.details as OutwardDetails;
                return `to ${oDetails.givenTo} (Site: ${oDetails.siteName})`;
            case 'return':
                const rDetails = movement.details as ReturnDetails;
                return `from ${rDetails.returnedBy} (Reason: ${rDetails.reason})`;
            default:
                return '';
        }
    };

    const isPositive = movement.type === 'inward';

    return (
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
                <p className="font-semibold capitalize text-text-primary">{movement.type}</p>
                <p className="text-xs text-text-secondary">{renderDetails()}</p>
            </div>
            <div className="text-right">
                <p className={`font-bold text-lg ${isPositive ? 'text-secondary' : 'text-accent'}`}>
                    {isPositive ? '+' : '-'}{movement.quantity}
                </p>
                <p className="text-xs text-gray-500">{new Date(movement.date).toLocaleString()}</p>
            </div>
        </div>
    );
};


const ReportsScreen: React.FC = () => {
    const { state } = useInventory();
    const [selectedItemId, setSelectedItemId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly' | 'custom' | null>(null);

    const selectedItem = state.items.find(item => item.id === selectedItemId);

    const getPeriodDates = (p: typeof period) => {
        const end = new Date();
        const start = new Date();
        if (p === 'monthly') start.setMonth(start.getMonth() - 1);
        else if (p === 'quarterly') start.setMonth(start.getMonth() - 3);
        else if (p === 'yearly') start.setFullYear(start.getFullYear() - 1);
        else return null;
        return { start, end };
    };

    const filteredHistory = useMemo(() => {
        if (!selectedItem) return [];

        let dateRange;
        if (period && period !== 'custom') {
            dateRange = getPeriodDates(period);
        } else if (period === 'custom' && startDate && endDate) {
            dateRange = { start: new Date(startDate), end: new Date(endDate) };
            // Add one day to end date to include the whole day
            dateRange.end.setDate(dateRange.end.getDate() + 1);
        }

        if (!dateRange) return selectedItem.history;

        return selectedItem.history.filter(mov => {
            const moveDate = new Date(mov.date);
            return moveDate >= dateRange!.start && moveDate <= dateRange!.end;
        });
    }, [selectedItem, period, startDate, endDate]);


    const handleExport = () => {
        if (!selectedItem) {
            alert('Please select an item to export.');
            return;
        }
        alert(`Exporting report for ${selectedItem.name} in a professional Excel format... (This is a demo feature)`);
    };

    const inputClass = "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary";
    const buttonClass = "p-2 text-sm border rounded-lg transition-colors";
    const activeButtonClass = "bg-primary text-white border-primary";
    const inactiveButtonClass = "bg-surface text-text-primary border-gray-300 hover:bg-gray-100";

    return (
        <div>
            <Header title="Reports & History" />
            <div className="p-4 space-y-4">
                <Card title="View & Export History">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Select Item to View History</label>
                            <select
                                value={selectedItemId}
                                onChange={(e) => setSelectedItemId(e.target.value)}
                                className={inputClass}
                            >
                                <option value="">-- Select an Item --</option>
                                {state.items.map(item => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                           <label className="block text-sm font-medium text-text-secondary mb-1">Select Period</label>
                           <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => setPeriod('monthly')} className={`${buttonClass} ${period === 'monthly' ? activeButtonClass : inactiveButtonClass}`}>Monthly</button>
                                <button onClick={() => setPeriod('quarterly')} className={`${buttonClass} ${period === 'quarterly' ? activeButtonClass : inactiveButtonClass}`}>Quarterly</button>
                                <button onClick={() => setPeriod('yearly')} className={`${buttonClass} ${period === 'yearly' ? activeButtonClass : inactiveButtonClass}`}>Yearly</button>
                           </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Or Select Date Range</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-gray-500">From</label>
                                    <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPeriod('custom'); }} className={inputClass} />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">To</label>
                                    <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPeriod('custom'); }} className={inputClass} />
                                </div>
                            </div>
                        </div>
                         {selectedItem && (
                            <button onClick={handleExport} className="w-full p-3 bg-secondary text-white rounded-lg hover:bg-green-700 transition font-bold">Export as Excel</button>
                         )}
                    </div>
                </Card>

                {selectedItem && (
                    <Card title={`History for ${selectedItem.name}`}>
                        <div className="space-y-2">
                            {filteredHistory.length > 0 ? (
                                filteredHistory.map(mov => <MovementDetail key={mov.id} movement={mov} />)
                            ) : (
                                <p className="text-text-secondary text-center p-4">No history for this item in the selected period.</p>
                            )}
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default ReportsScreen;
