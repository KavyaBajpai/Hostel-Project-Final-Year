export default function Landing() {
  return (
    <div className=""> 
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900">Hostel Management Portal</h1>
            <p className="mt-4 text-gray-600 max-w-prose">
              A simple and secure portal for residents, wardens, and mess in-charge to manage
              leaves, mess bills, fines, complaints, and documents in one place.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="/login" className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm">Login</a>
              <a href="/register" className="px-4 py-2 rounded-md border text-sm">Register</a>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="aspect-video w-full rounded-lg bg-gray-100 border" />
          </div>
        </div>
      </section>

      <section className="bg-gray-50 border-t">
        <div className="max-w-6xl mx-auto px-4 py-12 grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          <Feature title="Leaves" body="Apply and track hostel leave approvals online." />
          <Feature title="Mess" body="View bills, opt-out meals, and track expenses." />
          <Feature title="Complaints" body="File complaints and track their resolution." />
        </div>
      </section>
    </div>
  )
}

function Feature({ title, body }) {
  return (
    <div className="p-5 rounded-lg border bg-white">
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{body}</p>
    </div>
  )
}


