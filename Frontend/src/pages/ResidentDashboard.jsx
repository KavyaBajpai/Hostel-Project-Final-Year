import { Link } from 'react-router-dom'
import NoticeBoard from './NoticeBoard.jsx' // import the component I gave earlier

export default function ResidentDashboard() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-semibold text-gray-900">Resident Dashboard</h2>
      <p className="mt-1 text-sm text-gray-600">Quick actions for your hostel services.</p>

      {/*Notice Board Section */}
      <div className="mt-6">
        <NoticeBoard />
      </div>

      {/* Existing cards */}
      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card title="Resident Profile" to="/resident/profile" desc="Create/update your academic and guardian profile." />
        <Card title="Apply Leave" to="/resident/leave" desc="Submit a leave application." />
        <Card title="View Fines" to="/resident/fines" desc="Check your fines for a semester." />
        <Card title="Mess Bills" to="/resident/bill" desc="View mess bill details." />
        <Card title="Meal Opt-Outs" to="/resident/optouts" desc="Register meal opt-outs." />
        <Card title="Upload Documents" to="/resident/docs" desc="Upload academic/residence docs." />
        <Card title="Complaints" to="/resident/complaint" desc="File a complaint." />
        <Card title="View Complaints" to="/resident/complaints" desc="Track complaint status." />
        <Card title="View Opt-Outs" to="/resident/my-optouts" desc="See your opt-outs." />
        {/* <Card title="Hostel Chat" to="/resident/chat" desc="Talk with fellow residents." /> */}
        <Card title="Mark Attendance" to="/resident/attendance" desc="Record selfie video and mark attendance." />
        <Card title="View Uploaded Docs" to="/resident/viewDocs" desc="View your documents." />
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
