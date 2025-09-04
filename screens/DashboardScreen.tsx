
import React from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import { useInventory } from '../context/InventoryContext';
import { useNavigate } from 'react-router-dom';

const ArrowTrendingDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l-3.182-1.591m3.182 1.591L19.5 18M2.25 6h4.5m-4.5 0v4.5" /></svg>
);
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
);
const MinusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>
);


const DashboardScreen: React.FC = () => {
  const { state } = useInventory();
  const navigate = useNavigate();

  const lowStockItems = state.items.filter(item => item.currentStock <= item.reorderLevel);
  const totalItemTypes = state.items.length;

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" />
      <div className="p-4 space-y-4">
        <Card title="Quick Stats">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{totalItemTypes}</p>
              <p className="text-sm text-text-secondary">Item Types</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-danger' : 'text-secondary'}`}>{lowStockItems.length}</p>
              <p className="text-sm text-text-secondary">Low Stock Alerts</p>
            </div>
          </div>
        </Card>
        
        <Card title="Quick Actions">
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => navigate('/inward')} className="flex items-center justify-center p-4 bg-secondary/10 text-secondary font-bold rounded-lg hover:bg-secondary/20 transition-colors">
                    <PlusIcon className="w-6 h-6 mr-2" />
                    Inward
                </button>
                <button onClick={() => navigate('/outward')} className="flex items-center justify-center p-4 bg-accent/10 text-accent font-bold rounded-lg hover:bg-accent/20 transition-colors">
                    <MinusIcon className="w-6 h-6 mr-2" />
                    Outward
                </button>
             </div>
        </Card>

        <Card title="Low Stock Items">
          {lowStockItems.length > 0 ? (
            <ul className="space-y-3">
              {lowStockItems.map(item => (
                <li key={item.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-text-primary">{item.name}</p>
                    <p className="text-sm text-text-secondary">Reorder at {item.reorderLevel} {item.unit}</p>
                  </div>
                  <div className="text-right">
                      <p className="text-lg font-bold text-danger">{item.currentStock} {item.unit}</p>
                      <p className="text-xs text-danger">Stock Left</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6">
                <ArrowTrendingDownIcon className="w-12 h-12 mx-auto text-gray-300"/>
              <p className="mt-2 text-text-secondary">No items are currently low on stock.</p>
              <p className="text-sm text-gray-400">Great job!</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardScreen;
