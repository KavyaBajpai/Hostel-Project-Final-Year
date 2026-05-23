import { Link } from 'react-router-dom'
import WardenPushSetup from '../components/WardenPushSetup.jsx'

export default function WardenDashboard() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-semibold text-gray-900">Warden Dashboard</h2>
      <p className="mt-1 text-sm text-gray-600">Manage resident services for your hostel.</p>

      <WardenPushSetup />

      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card title="Leaves" to="/warden/leaves" desc="View and act on leave applications." />
        <Card title="Complaints" to="/warden/complaints" desc="Filter complaints by status." />
        <Card title="Residents" to="/warden/residents" desc="View resident information." />
        <Card title="Issue Notice" to="/warden/notice" desc="Publish a notice (file optional)." />
        <Card title="Mess Expenses" to="/warden/mess-expenses" desc="Record monthly hostel mess spend for refunds." />
        <Card title="Mess Refunds" to="/warden/mess-refunds" desc="Calculate semester-wise refunds." />
        <Card title="Attendance" to="/warden/attendance" desc="Review and verify daily attendance videos." />
      </div>
    </div>
  )
}

function Card({ title, desc, to }) {
  return (
    <Link to={to} className="p-4 rounded-lg border bg-white block hover:shadow-sm transition">
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{desc}</p>
    </Link>
  )
}


