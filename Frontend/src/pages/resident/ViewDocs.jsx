import { useState } from 'react';
import { getResidentDocuments } from '../../services/api';

function toHttps(url) {
  if (!url) return url;
  return url.replace(/^http:\/\//i, 'https://');
}

export default function ViewDocs() {
  const [semester, setSemester] = useState('');
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  async function fetchDocs(e) {
    e?.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const data = await getResidentDocuments(semester);
      setRows(data?.documents || []);
      setFetched(true);
    } catch (apiErr) {
      setErr(apiErr?.response?.data?.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-left">
      <h3 className="text-xl font-semibold text-gray-900">View Uploaded Documents</h3>
      <p className="text-sm text-gray-600 mt-1">Select a semester to see documents you have uploaded.</p>

      <form onSubmit={fetchDocs} className="mt-4 flex gap-2 items-end">
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
          {loading ? 'Loading...' : 'Fetch'}
        </button>
      </form>

      {err && <div className="mt-3 p-3 border rounded bg-red-50 text-red-700 text-sm">{err}</div>}

      <div className="mt-6 overflow-x-auto rounded-lg border bg-white text-left">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[12%]" />
            <col className="w-[40%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-700">Document Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Semester</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Uploaded</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">File</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((doc) => (
              <tr key={doc.id} className="border-b last:border-b-0">
                <td className="px-4 py-3 align-top break-words">{doc.docType}</td>
                <td className="px-4 py-3 align-top">{doc.semester}</td>
                <td className="px-4 py-3 align-top whitespace-nowrap">
                  {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3 align-top">
                  {doc.fileUrl ? (
                    <a
                      href={toHttps(doc.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Open
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
            {fetched && rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-gray-500 text-center" colSpan={4}>
                  No documents for this semester
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
