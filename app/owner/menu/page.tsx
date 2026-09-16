'use client';

import { useEffect, useState } from 'react';
import OwnerNav from '@/components/OwnerNav';
import { FileSpreadsheet, Download, Upload, Plus, Edit2, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
  active: boolean;
  stockMode: string;
  currentStock: number;
}

export default function OwnerMenuManagementPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[] | null>(null);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvSubmitting, setCsvSubmitting] = useState(false);

  // Add/Edit Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stockMode, setStockMode] = useState('COUNT');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchMenu = () => {
    fetch('/api/owner/menu')
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleDownloadTemplate = () => {
    window.location.href = '/api/owner/menu/template';
  };

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCsvFile(file);
      setCsvErrors([]);
      handlePreviewCsv(file);
    }
  };

  const handlePreviewCsv = async (file: File) => {
    setCsvSubmitting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('confirm', 'false');

    try {
      const res = await fetch('/api/owner/menu/csv', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setCsvErrors(data.errors || [data.error || 'Invalid CSV file.']);
        setCsvPreview(null);
      } else {
        setCsvPreview(data.previewItems || []);
        setCsvErrors(data.errors || []);
      }
    } catch (err) {
      setCsvErrors(['Failed to parse CSV file.']);
    }
    setCsvSubmitting(false);
  };

  const handleConfirmCsvImport = async () => {
    if (!csvFile) return;
    setCsvSubmitting(true);
    const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('confirm', 'true');

    try {
      const res = await fetch('/api/owner/menu/csv', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || 'Menu imported successfully!');
        setCsvFile(null);
        setCsvPreview(null);
        setCsvErrors([]);
        fetchMenu();
      } else {
        setCsvErrors(data.errors || [data.error]);
      }
    } catch (err) {
      setCsvErrors(['Import failed.']);
    }
    setCsvSubmitting(false);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const method = editingItem ? 'PUT' : 'POST';
    const body = editingItem
      ? { id: editingItem.id, name, category, price, stockMode }
      : { name, category, price, stockMode, initialStock: 0 };

    try {
      const res = await fetch('/api/owner/menu', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowAddModal(false);
        setEditingItem(null);
        setName('');
        setCategory('');
        setPrice('');
        fetchMenu();
      } else {
        const data = await res.json();
        setError(data.error || 'Save failed.');
      }
    } catch (err) {
      setError('Connection error.');
    }
  };

  const toggleItemActive = async (item: MenuItem) => {
    try {
      await fetch('/api/owner/menu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, active: !item.active }),
      });
      fetchMenu();
    } catch (e) {}
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-500 font-medium">Loading menu catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pt-16">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Menu Catalog & CSV Import</h1>
          <p className="text-xs text-slate-500">Manage item master list and upload CSV menu templates.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-300"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV Template</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setName('');
              setCategory('Snacks');
              setPrice('');
              setShowAddModal(true);
            }}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* CSV Import Box */}
      <div className="surface-card p-5 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase">
          <FileSpreadsheet className="w-4 h-4 text-sky-600" />
          <span>Bulk CSV Menu Upload</span>
        </div>

        <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-center">
          <p className="text-xs font-semibold text-slate-600 mb-2">
            Upload CSV file with headers: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-900">Item Name,Category,Price</code>
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvFileSelect}
            className="hidden"
            id="csv-file-input"
          />
          <label
            htmlFor="csv-file-input"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 cursor-pointer shadow-sm"
          >
            <Upload className="w-4 h-4 text-sky-600" />
            <span>Select CSV File</span>
          </label>
        </div>

        {/* CSV Errors Display */}
        {csvErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1 text-xs text-red-700">
            <div className="font-bold flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>CSV Validation Warnings ({csvErrors.length})</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              {csvErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* CSV Preview Table */}
        {csvPreview && csvPreview.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
              <span>CSV PREVIEW ({csvPreview.length} valid items found)</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCsvPreview(null);
                    setCsvFile(null);
                  }}
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCsvImport}
                  disabled={csvSubmitting}
                  className="px-4 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs shadow-sm"
                >
                  {csvSubmitting ? 'Importing...' : 'Import Menu'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                  <tr>
                    <th className="p-2.5">Item Name</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {csvPreview.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-bold text-slate-900">{row.name}</td>
                      <td className="p-2.5 text-slate-600">{row.category}</td>
                      <td className="p-2.5 font-bold text-slate-900">₹{row.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Existing Menu Items List */}
      <div className="surface-card p-5 rounded-2xl border border-slate-200 space-y-3">
        <h3 className="text-base font-extrabold text-slate-900">Current Canteen Menu ({items.length} items)</h3>

        <div className="grid gap-2.5 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                    {item.category}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-700 mt-1">
                  ₹{item.price} • Stock Mode: <span className="text-sky-700 font-bold">{item.stockMode}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleItemActive(item)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                    item.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {item.active ? 'ACTIVE' : 'DISABLED'}
                </button>

                <button
                  onClick={() => {
                    setEditingItem(item);
                    setName(item.name);
                    setCategory(item.category);
                    setPrice(item.price.toString());
                    setStockMode(item.stockMode);
                    setShowAddModal(true);
                  }}
                  className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900">{editingItem ? 'Edit Item' : 'Add Menu Item'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Samosa"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Snacks"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Price (₹)</label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="15"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Stock Mode</label>
                <select
                  value={stockMode}
                  onChange={(e) => setStockMode(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold"
                >
                  <option value="COUNT">COUNT (e.g. Samosas, Vadas)</option>
                  <option value="CAPACITY">CAPACITY (e.g. Tea, Dosa Portions)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl shadow-sm mt-2"
              >
                Save Item
              </button>
            </form>
          </div>
        </div>
      )}

      <OwnerNav />
    </div>
  );
}
