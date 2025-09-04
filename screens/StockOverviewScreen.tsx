
import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import { useInventory } from '../context/InventoryContext';
import type { InventoryItem, InwardDetails } from '../types';

const StockItemCard: React.FC<{ item: InventoryItem }> = ({ item }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLowStock = item.currentStock <= item.reorderLevel;

  const averagePrice = useMemo(() => {
    const inwardMovements = item.history.filter(mov => mov.type === 'inward');
    if (inwardMovements.length === 0) {
      return item.purchasePrice; // Fallback to initial price if no inward history
    }

    const totalValue = inwardMovements.reduce((acc, mov) => {
        const details = mov.details as InwardDetails;
        return acc + (mov.quantity * details.purchasePrice);
    }, 0);

    const totalQuantity = inwardMovements.reduce((acc, mov) => acc + mov.quantity, 0);

    return totalQuantity > 0 ? totalValue / totalQuantity : item.purchasePrice;
  }, [item.history, item.purchasePrice]);

  return (
    <div className={`bg-surface rounded-lg shadow-md overflow-hidden border-l-4 ${isLowStock ? 'border-danger' : 'border-secondary'}`}>
      <div className="p-4" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-text-primary">{item.name}</h3>
            <p className="text-sm text-text-secondary">{item.description}</p>
          </div>
          <div className="text-right flex-shrink-0 ml-4">
            <p className={`text-2xl font-bold ${isLowStock ? 'text-danger' : 'text-primary'}`}>{item.currentStock}</p>
            <p className="text-sm text-text-secondary">{item.unit}</p>
          </div>
        </div>
        {isLowStock && (
            <p className="text-xs text-danger mt-2 font-semibold">Below reorder level ({item.reorderLevel} {item.unit})</p>
        )}
      </div>
      {isExpanded && (
        <div className="bg-gray-50 p-4 border-t text-sm">
          <div className="grid grid-cols-2 gap-2">
            <p className="text-text-secondary">Avg. Purchase Price:</p><p className="font-medium text-text-primary">₹{averagePrice.toFixed(2)}/{item.unit}</p>
            <p className="text-text-secondary">Reorder Level:</p><p className="font-medium text-text-primary">{item.reorderLevel} {item.unit}</p>
            <p className="text-text-secondary">Opening Date:</p><p className="font-medium text-text-primary">{new Date(item.openingStockDate).toLocaleDateString()}</p>
          </div>
        </div>
      )}
    </div>
  );
};


const StockOverviewScreen: React.FC = () => {
  const { state } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    return state.items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a,b) => a.name.localeCompare(b.name));
  }, [state.items, searchTerm]);

  return (
    <div>
      <Header title="Stock Overview" />
      <div className="p-4">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by material name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent transition"
          />
        </div>

        <div className="space-y-4">
            {filteredItems.length > 0 ? (
                filteredItems.map(item => <StockItemCard key={item.id} item={item} />)
            ) : (
                <div className="text-center py-10">
                    <p className="text-text-secondary">No stock items found.</p>
                    <p className="text-sm text-gray-400">Add items using the 'Inward' screen.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default StockOverviewScreen;