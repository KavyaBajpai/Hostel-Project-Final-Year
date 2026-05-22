import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getMessRefunds } from '../../services/api';

export default function MessRefunds() {
  const [session, setSession] = useState('');
  const [semester, setSemester] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function fetchRefunds(e) {
    e?.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const res = await getMessRefunds({ session, semester });
      setData(res);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to calculate refunds');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-left">
      <h3 className="text-xl font-semibold text-gray-900">Mess Refunds</h3>
      <p className="mt-1 text-sm text-gray-600">
        Calculate end-of-semester refunds from ₹20,000 deposits, monthly mess expenses, meal opt-out points per day (max 45 per student), and fines.
        Extra refund uses a fair share of the points pool (no single student can take it all).{' '}
        <Link to="/warden/mess-expenses" className="text-gray-900 underline">
          Add or edit mess expenses
        </Link>{' '}
        for each semester month first.
      </p>

      <form onSubmit={fetchRefunds} className="mt-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-sm">Session</label>
          <input
            value={session}
            onChange={(e) => setSession(e.target.value)}
            placeholder="2025-26"
            className="border rounded px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm">Semester</label>
          <input
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            placeholder="3"
            className="border rounded px-3 py-2 text-sm"
            required
          />
        </div>
        <button className="px-4 py-2 text-sm rounded bg-gray-900 text-white" disabled={loading}>
          {loading ? 'Calculating...' : 'Calculate refunds'}
        </button>
      </form>

      {err && <div className="mt-3 p-3 border rounded bg-red-50 text-red-700 text-sm">{err}</div>}

      {data && (
        <div className="mt-6 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <SummaryCard label="Students" value={data.studentCount} />
            <SummaryCard label="Collected" value={`₹${data.totalCollected ?? '—'}`} />
            <SummaryCard label="Mess expenses" value={`₹${data.totalExpenses ?? '—'}`} />
            <SummaryCard label="Leftover" value={`₹${data.leftoverFunds ?? '—'}`} />
          </div>

          {data.includedExpenseMonths?.length > 0 && (
            <p className="text-xs text-gray-600">
              Expense months included: {data.includedExpenseMonths.join(', ')}
            </p>
          )}

          {(data.pointsPoolReturnedToBase > 0 || data.hostelPointCapacity) && (
            <p className="text-xs text-gray-600">
              Points pool: ₹{data.pointsPool ?? '—'} (₹{data.poolPerCapacityPoint ?? '—'} per capacity point).
              {data.pointsPoolReturnedToBase > 0 && (
                <> Unallocated ₹{data.pointsPoolReturnedToBase} added back to base refund for everyone.</>
              )}
            </p>
          )}

          {data.message && (
            <p className={`text-sm ${data.refunds?.length ? 'text-green-700' : 'text-amber-800'}`}>{data.message}</p>
          )}

          {data.saved && (
            <p className="text-xs text-gray-500">Results saved — residents can view their refund for this semester.</p>
          )}

          {data.refunds?.length > 0 && (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="w-full table-fixed border-collapse text-sm text-left">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-3 py-2 font-medium text-gray-700">Student</th>
                    <th className="px-3 py-2 font-medium text-gray-700">Points</th>
                    <th className="px-3 py-2 font-medium text-gray-700">Base</th>
                    <th className="px-3 py-2 font-medium text-gray-700">Extra</th>
                    <th className="px-3 py-2 font-medium text-gray-700">Gross</th>
                    <th className="px-3 py-2 font-medium text-gray-700">Fines</th>
                    <th className="px-3 py-2 font-medium text-gray-700">Net refund</th>
                  </tr>
                </thead>
                <tbody>
                  {data.refunds.map((r) => (
                    <tr key={r.studentId} className="border-b">
                      <td className="px-3 py-2">{r.studentName}</td>
                      <td className="px-3 py-2">{r.points}</td>
                      <td className="px-3 py-2">₹{r.baseRefund}</td>
                      <td className="px-3 py-2">₹{r.extraRefund}</td>
                      <td className="px-3 py-2">₹{r.grossRefund}</td>
                      <td className="px-3 py-2 text-red-700">₹{r.fineDeduction}</td>
                      <td className="px-3 py-2 font-medium">₹{r.totalRefund}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="p-3 border rounded-lg bg-white">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-medium text-gray-900">{value}</p>
    </div>
  );
}
