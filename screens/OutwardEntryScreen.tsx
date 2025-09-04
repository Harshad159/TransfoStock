import React, { useState } from 'react';
import Header from '../components/Header';
import { useInventory } from '../context/InventoryContext';
import type { StockMovement, OutwardDetails } from '../types';

const OutwardEntryScreen: React.FC = () => {
  const { state, dispatch, getItemById } = useInventory();
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [givenTo, setGivenTo] = useState('');
  const [siteName, setSiteName] = useState('');
  const [tenderNo, setTenderNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const selectedItem = getItemById(selectedItemId);
  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedItem) {
        setFeedback({ type: 'error', message: 'Please select a valid item.' });
        return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
        setFeedback({ type: 'error', message: 'Please enter a valid quantity.' });
        return;
    }

    if (qty > selectedItem.currentStock) {
        setFeedback({ type: 'error', message: `Quantity exceeds available stock of ${selectedItem.currentStock} ${selectedItem.unit}.` });
        return;
    }
    
    const outwardDetails: OutwardDetails = {
      givenTo,
      siteName,
      tenderNo,
    };
    
    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      type: 'outward',
      date: new Date(date).toISOString(),
      quantity: qty,
      details: outwardDetails,
    };

    dispatch({ type: 'ADD_OUTWARD_ENTRY', payload: { itemId: selectedItemId, movement } });
    
    setFeedback({ type: 'success', message: 'Outward entry confirmed!' });
    // Reset form
    setSelectedItemId('');
    setQuantity('');
    setGivenTo('');
    setSiteName('');
    setTenderNo('');
    setDate(today);

    setTimeout(() => setFeedback(null), 3000);
  };
  
  const inputClass = "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition";

  return (
    <div>
      <Header title="Outward Entry" />
      <div className="p-4">
        {feedback && (
            <div className={`p-3 rounded-md mb-4 text-white ${feedback.type === 'success' ? 'bg-secondary' : 'bg-danger'}`}>
                {feedback.message}
            </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={today} className={inputClass} required />
            </div>

            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Item Name</label>
                <select value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)} className={inputClass} required>
                    <option value="" disabled>-- Select an Item --</option>
                    {state.items.filter(item => item.currentStock > 0).map(item => (
                        <option key={item.id} value={item.id}>{item.name} ({item.currentStock} {item.unit})</option>
                    ))}
                </select>
            </div>
            
            {selectedItem && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-primary">
                    Available Stock: <span className="font-bold">{selectedItem.currentStock} {selectedItem.unit}</span>
                </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Quantity</label>
                    <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder={`e.g., 5`} className={inputClass} required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Unit</label>
                    <input type="text" value={selectedItem?.unit || ''} className={inputClass} readOnly />
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Given to/ Labor Name/ Agency Name</label>
                <input type="text" value={givenTo} onChange={(e) => setGivenTo(e.target.value)} className={inputClass} required />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Site Name</label>
                <input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)} className={inputClass} required />
            </div>

            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">For Tender No. (Optional)</label>
                <input type="text" value={tenderNo} onChange={(e) => setTenderNo(e.target.value)} className={inputClass} />
            </div>
          
            <button type="submit" className="w-full bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-amber-600 transition-colors">Confirm Outward Entry</button>
        </form>
      </div>
    </div>
  );
};

export default OutwardEntryScreen;