import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ResidentDashboard from './pages/ResidentDashboard.jsx'
import WardenDashboard from './pages/WardenDashboard.jsx'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import RoleRoute from './components/RoleRoute.jsx'
import ApplyLeave from './pages/resident/ApplyLeave.jsx'
import ViewLeaves from './pages/resident/ViewLeaves.jsx'
import Fines from './pages/resident/Fines.jsx'
import Bills from './pages/resident/Bills.jsx'
import Complaint from './pages/resident/Complaint.jsx'
import UploadDocs from './pages/resident/UploadDocs.jsx'
import ViewDocs from './pages/resident/ViewDocs.jsx'
import MealOptOut from './pages/resident/MealOptOut.jsx'
import ViewComplaints from './pages/resident/ViewComplaints.jsx'
import ViewOptOuts from './pages/resident/ViewOptOuts.jsx'
import Chat from './pages/resident/Chat.jsx'
import Leaves from './pages/warden/Leaves.jsx'
import Complaints from './pages/warden/Complaints.jsx'
import Residents from './pages/warden/Residents.jsx'
import IssueNotice from './pages/warden/IssueNotice.jsx'
import MessRefunds from './pages/warden/MessRefunds.jsx'
import MessExpenses from './pages/warden/MessExpenses.jsx'
import AllNotices from './pages/resident/AllNotices.jsx'
import RecordAttendance from './pages/resident/RecordAttendance.jsx'
import Attendance from './pages/warden/Attendance.jsx'
import Profile from './pages/resident/Profile.jsx'
import './App.css'
import Ietlogo from "./assets/Ietlogo.png"
function App() {
  const { user, logout } = useAuth() || {}
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <header className="border-b bg-white">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <img className="w-10 h-10 rounded-full" src={Ietlogo}></img>
            <nav className="flex items-center gap-4 text-sm">
              {!user && (<>
                <Link className="text-gray-700 hover:text-black" to="/login">Login</Link>
                <Link className="text-gray-700 hover:text-black" to="/register">Register</Link>
              </>)}
               <button onClick={logout} className="px-3 py-1 border rounded-md">Logout</button>
              {/* {user && (
                <>
                  <span className="text-gray-600 hidden sm:inline">{user.name} ({user.role})</span>
                 
                </>
              )} */}
            </nav>
          </div>
        </header>
        <main className="flex-1 bg-gray-50">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/resident" element={
              <ProtectedRoute>
                <RoleRoute allow={['resident']}>
                  <ResidentDashboard />
                </RoleRoute>
              </ProtectedRoute>
            } />
            <Route path="/resident/leave" element={<ProtectedRoute><RoleRoute allow={['resident']}><ApplyLeave /></RoleRoute></ProtectedRoute>} />
            <Route path="/resident/leaves" element={<ProtectedRoute><RoleRoute allow={['resident']}><ViewLeaves /></RoleRoute></ProtectedRoute>} />
            <Route path="/resident/fines" element={<ProtectedRoute><RoleRoute allow={['resident']}><Fines /></RoleRoute></ProtectedRoute>} />
            <Route path="/resident/bill" element={<ProtectedRoute><RoleRoute allow={['resident']}><Bills /></RoleRoute></ProtectedRoute>} />
            <Route path="/resident/complaint" element={<ProtectedRoute><RoleRoute allow={['resident']}><Complaint /></RoleRoute></ProtectedRoute>} />
            <Route path="/resident/docs" element={<ProtectedRoute><RoleRoute allow={['resident']}><UploadDocs /></RoleRoute></ProtectedRoute>} />
            <Route path="/resident/viewDocs" element={<ProtectedRoute><RoleRoute allow={['resident']}><ViewDocs /></RoleRoute></ProtectedRoute>} />
            <Route path="/resident/optouts" element={<ProtectedRoute><RoleRoute allow={['resident']}><MealOptOut /></RoleRoute></ProtectedRoute>} />
            <Route path="/resident/complaints" element={<ProtectedRoute><RoleRoute allow={['resident']}><ViewComplaints /></RoleRoute></ProtectedRoute>} />
            <Route path="/resident/my-optouts" element={<ProtectedRoute><RoleRoute allow={['resident']}><ViewOptOuts /></RoleRoute></ProtectedRoute>} />
            <Route path="/resident/chat" element={<ProtectedRoute><RoleRoute allow={['resident']}><Chat /></RoleRoute></ProtectedRoute>} />
            <Route path="/resident/notices" element={<ProtectedRoute><RoleRoute allow={['resident']}><AllNotices /></RoleRoute></ProtectedRoute>} />
            <Route path="/resident/attendance" element={<ProtectedRoute><RoleRoute allow={['resident']}><RecordAttendance /></RoleRoute></ProtectedRoute>} />
            <Route path="/resident/profile" element={<ProtectedRoute><RoleRoute allow={['resident']}><Profile /></RoleRoute></ProtectedRoute>} />
            {/* <Route path="/resident/documents" element={<ProtectedRoute><RoleRoute allow={['resident']}><AllDocuments /></RoleRoute></ProtectedRoute>} /> */}
            <Route path="/warden" element={
              <ProtectedRoute>
                <RoleRoute allow={['warden','admin']}>
                  <WardenDashboard />
                </RoleRoute>
              </ProtectedRoute>
            } />
            <Route path="/warden/leaves" element={<ProtectedRoute><RoleRoute allow={['warden','admin']}><Leaves /></RoleRoute></ProtectedRoute>} />
            <Route path="/warden/complaints" element={<ProtectedRoute><RoleRoute allow={['warden','admin']}><Complaints /></RoleRoute></ProtectedRoute>} />
            <Route path="/warden/residents" element={<ProtectedRoute><RoleRoute allow={['warden','admin']}><Residents /></RoleRoute></ProtectedRoute>} />
            <Route path="/warden/notice" element={<ProtectedRoute><RoleRoute allow={['warden','admin']}><IssueNotice /></RoleRoute></ProtectedRoute>} />
            <Route path="/warden/mess-expenses" element={<ProtectedRoute><RoleRoute allow={['warden','admin']}><MessExpenses /></RoleRoute></ProtectedRoute>} />
            <Route path="/warden/mess-refunds" element={<ProtectedRoute><RoleRoute allow={['warden','admin']}><MessRefunds /></RoleRoute></ProtectedRoute>} />
            <Route path="/warden/attendance" element={<ProtectedRoute><RoleRoute allow={['warden','admin']}><Attendance /></RoleRoute></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="border-t bg-white">
          <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-gray-500">
            © {new Date().getFullYear()} Hostel Management Cell
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
