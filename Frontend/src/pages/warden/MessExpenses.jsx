import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createMessExpense,
  deleteMessExpense,
  listMessExpenses,
  updateMessExpense,
} from '../../services/api';

export default function MessExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [hostel, setHostel] = useState('');
  const [month, setMonth] = useState('');
  const [totalExpense, setTotalExpense] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editMonth, setEditMonth] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const loadExpenses = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const data = await listMessExpenses();
      setExpenses(data?.expenses || []);
      setHostel(data?.hostel || '');
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to load mess expenses');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  async function onAdd(e) {
    e.preventDefault();
    setMsg('');
    setErr('');
    setSaving(true);
    try {
      const res = await createMessExpense({ month, totalExpense });
      setMsg(res?.message || 'Expense recorded');
      setMonth('');
      setTotalExpense('');
      e.target.reset();
      await loadExpenses();
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to add expense');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row) {
    setEditingId(row.id);
    setEditMonth(row.month?.length === 7 ? row.month : row.month);
    setEditAmount(String(row.totalExpense ?? ''));
    setMsg('');
    setErr('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditMonth('');
    setEditAmount('');
  }

  async function onSaveEdit(id) {
    setMsg('');
    setErr('');
    setSaving(true);
    try {
      const res = await updateMessExpense(id, { month: editMonth, totalExpense: editAmount });
      setMsg(res?.message || 'Expense updated');
      cancelEdit();
      await loadExpenses();
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to update expense');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id, monthLabel) {
    if (!window.confirm(`Delete mess expense for ${monthLabel}?`)) return;
    setMsg('');
    setErr('');
    setSaving(true);
    try {
      const res = await deleteMessExpense(id);
      setMsg(res?.message || 'Expense deleted');
      if (editingId === id) cancelEdit();
      await loadExpenses();
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to delete expense');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-left">
      <h3 className="text-xl font-semibold text-gray-900">Mess Expenses</h3>
      <p className="mt-1 text-sm text-gray-600">
        Record total hostel mess spend per calendar month. These amounts feed{' '}
        <Link to="/warden/mess-refunds" className="text-gray-900 underline">
          mess refund
        </Link>{' '}
        calculation (separate from per-resident mess bills).
      </p>
      {hostel && (
        <p className="mt-1 text-xs text-gray-500">
          Hostel: <span className="font-medium">{hostel}</span> — use YYYY-MM for each semester month
          (odd sem: Jul–Dec; even sem: Jan–Jun).
        </p>
      )}

      {msg && <div className="mt-4 p-3 text-sm rounded border bg-green-50 text-green-700">{msg}</div>}
      {err && <div className="mt-4 p-3 text-sm rounded border bg-red-50 text-red-700">{err}</div>}

      <form onSubmit={onAdd} className="mt-6 p-4 border rounded-lg bg-white space-y-4 max-w-md">
        <h4 className="font-medium text-gray-900">Add monthly expense</h4>
        <div>
          <label className="block text-sm">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm">Total expense (₹)</label>
          <input
            type="number"
            min="1"
            step="1"
            value={totalExpense}
            onChange={(e) => setTotalExpense(e.target.value)}
            placeholder="e.g. 185000"
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            required
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm rounded bg-gray-900 text-white disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Add expense'}
        </button>
      </form>

      <div className="mt-8">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-medium text-gray-900">Recorded expenses</h4>
          <button
            type="button"
            onClick={loadExpenses}
            disabled={loading}
            className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="mt-3 overflow-x-auto rounded-lg border bg-white">
          <table className="w-full table-fixed border-collapse text-sm text-left">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-3 py-2 font-medium text-gray-700">Month</th>
                <th className="px-3 py-2 font-medium text-gray-700">Amount (₹)</th>
                <th className="px-3 py-2 font-medium text-gray-700">Added by</th>
                <th className="px-3 py-2 font-medium text-gray-700">Added on</th>
                <th className="px-3 py-2 font-medium text-gray-700 w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((row) =>
                editingId === row.id ? (
                  <tr key={row.id} className="border-b bg-amber-50/50">
                    <td className="px-3 py-2">
                      <input
                        type="month"
                        value={editMonth}
                        onChange={(e) => setEditMonth(e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 text-gray-600" colSpan={2}>
                      {row.uploadedByName || '—'}
                    </td>
                    <td className="px-3 py-2 space-x-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onSaveEdit(row.id)}
                        className="text-sm text-green-800 hover:underline disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="text-sm text-gray-600 hover:underline"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id} className="border-b">
                    <td className="px-3 py-2 font-medium">{row.month}</td>
                    <td className="px-3 py-2">₹{Number(row.totalExpense).toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2">{row.uploadedByName || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {row.uploadedAt
                        ? new Date(row.uploadedAt).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                    <td className="px-3 py-2 space-x-2">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="text-sm text-gray-900 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onDelete(row.id, row.month)}
                        className="text-sm text-red-700 hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              )}
              {!loading && expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                    No mess expenses yet. Add one month at a time before calculating refunds.
                  </td>
                </tr>
              )}
              {loading && expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
