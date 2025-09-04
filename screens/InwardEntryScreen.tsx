import React, { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';
import { useInventory } from '../context/InventoryContext';
import type { InventoryItem, StockMovement, InwardDetails } from '../types';

const InwardEntryScreen: React.FC = () => {
  const { dispatch, state } = useInventory();
  const [formState, setFormState] = useState({
    itemName: '',
    unit: '',
    purchasePrice: '',
    description: '',
    openingStockDate: new Date().toISOString().split('T')[0],
    reorderLevel: '',
    purchaserName: '',
    billNo: '',
    billDate: new Date().toISOString().split('T')[0],
    quantity: ''
  });
  const [isNewItem, setIsNewItem] = useState(true);
  const [suggestions, setSuggestions] = useState<InventoryItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleItemNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormState(prev => ({ ...prev, itemName: value }));

    const perfectMatch = state.items.find(i => i.name.toLowerCase() === value.toLowerCase());
    
    if (perfectMatch) {
        setIsNewItem(false);
        setFormState(prev => ({
            ...prev,
            itemName: perfectMatch.name,
            unit: perfectMatch.unit,
            purchasePrice: String(perfectMatch.purchasePrice),
            description: perfectMatch.description,
            reorderLevel: String(perfectMatch.reorderLevel),
        }));
    } else {
        if (isNewItem === false) { 
             // Clear details if user types a new name after selecting an existing one
            setFormState(prev => ({ 
                ...prev, 
                itemName: value, 
                unit: '', purchasePrice: '', description: '', reorderLevel: ''
            }));
        }
        setIsNewItem(true);
    }

    if (value) {
        const filteredSuggestions = state.items.filter(item => item.name.toLowerCase().includes(value.toLowerCase()));
        setSuggestions(filteredSuggestions);
        setShowSuggestions(true);
    } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsNewItem(true);
    }
  };

  const handleSuggestionClick = (item: InventoryItem) => {
      setIsNewItem(false);
      setFormState(prev => ({
          ...prev,
          itemName: item.name,
          unit: item.unit,
          purchasePrice: String(item.purchasePrice), // Use last price as default, but it's editable
          description: item.description,
          reorderLevel: String(item.reorderLevel),
      }));
      setShowSuggestions(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState.quantity || parseFloat(formState.quantity) <= 0) {
        setFeedback({ type: 'error', message: 'Please enter a valid quantity.'});
        return;
    }
    
    if (!formState.itemName.trim()) {
        setFeedback({ type: 'error', message: 'Please enter an item name.' });
        return;
    }

    const inwardDetails: InwardDetails = {
      purchaserName: formState.purchaserName,
      billNo: formState.billNo,
      billDate: formState.billDate,
      purchasePrice: parseFloat(formState.purchasePrice) || 0
    };
    
    const movement: StockMovement = {
      id: `mov-${Date.now()}`,
      type: 'inward',
      date: new Date().toISOString(),
      quantity: parseFloat(formState.quantity),
      details: inwardDetails,
    };

    const existingItem = state.items.find(i => i.name.toLowerCase() === formState.itemName.trim().toLowerCase());

    const itemPayload: InventoryItem = {
      id: existingItem ? existingItem.id : `item-${Date.now()}`,
      name: formState.itemName.trim(),
      unit: formState.unit,
      purchasePrice: parseFloat(formState.purchasePrice) || 0,
      description: formState.description,
      openingStockDate: formState.openingStockDate,
      reorderLevel: parseInt(formState.reorderLevel, 10) || 0,
      currentStock: 0, 
      history: []
    };
    
    dispatch({ type: 'ADD_INWARD_ENTRY', payload: { item: itemPayload, movement } });
    setFeedback({ type: 'success', message: 'Stock added successfully!' });
    
    setFormState({
        itemName: '', unit: '', purchasePrice: '', description: '',
        openingStockDate: new Date().toISOString().split('T')[0],
        reorderLevel: '', purchaserName: '', billNo: '',
        billDate: new Date().toISOString().split('T')[0], quantity: ''
    });
    setIsNewItem(true);
    setShowSuggestions(false);
    setSuggestions([]);

    setTimeout(() => setFeedback(null), 3000);
  };
  
  const inputClass = "w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition";
  const disabledInputClass = `${inputClass} bg-gray-100 cursor-not-allowed`;

  return (
    <div>
      <Header title="Inward Entry" />
      <div className="p-4">
        {feedback && (
          <div className={`p-3 rounded-md mb-4 text-white ${feedback.type === 'success' ? 'bg-secondary' : 'bg-danger'}`}>
            {feedback.message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
                <label className="block text-sm font-medium text-text-secondary mb-1">Item Name</label>
                <input
                    type="text"
                    name="itemName"
                    value={formState.itemName}
                    onChange={handleItemNameChange}
                    onFocus={() => { if (formState.itemName) setShowSuggestions(true); }}
                    autoComplete="off"
                    placeholder="Type to search or add new item..."
                    className={inputClass}
                    required
                />
                {showSuggestions && suggestions.length > 0 && (
                    <ul ref={suggestionsRef} className="absolute z-20 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                    {suggestions.map(item => (
                        <li
                        key={item.id}
                        onClick={() => handleSuggestionClick(item)}
                        className="p-2 hover:bg-gray-100 cursor-pointer text-text-primary"
                        >
                        {item.name}
                        </li>
                    ))}
                    </ul>
                )}
            </div>
        
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Unit</label>
            <input type="text" name="unit" value={formState.unit} onChange={handleChange} className={isNewItem ? inputClass : disabledInputClass} required disabled={!isNewItem}/>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Purchase Price</label>
                <input type="number" name="purchasePrice" value={formState.purchasePrice} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Reorder Level</label>
                <input type="number" name="reorderLevel" value={formState.reorderLevel} onChange={handleChange} className={isNewItem ? inputClass : disabledInputClass} required disabled={!isNewItem}/>
              </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
            <textarea name="description" value={formState.description} onChange={handleChange} className={isNewItem ? inputClass : disabledInputClass} rows={2} disabled={!isNewItem}></textarea>
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-md font-semibold text-primary mb-2">Transaction Details</h3>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Quantity</label>
                    <input type="number" name="quantity" value={formState.quantity} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Purchaser Name</label>
                    <input type="text" name="purchaserName" value={formState.purchaserName} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Bill No</label>
                    <input type="text" name="billNo" value={formState.billNo} onChange={handleChange} className={inputClass} required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Bill Date</label>
                    <input type="date" name="billDate" value={formState.billDate} onChange={handleChange} className={inputClass} required />
                </div>
            </div>
          </div>
          
          <button type="submit" className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-800 transition-colors">Add Inward Entry</button>
        </form>
      </div>
    </div>
  );
};

export default InwardEntryScreen;