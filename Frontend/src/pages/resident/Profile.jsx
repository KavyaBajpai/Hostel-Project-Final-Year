import { useEffect, useState } from 'react';
import { getResidentProfile, upsertResidentProfile, uploadReferenceFaceImage } from '../../services/api';

function profileToForm(profile) {
  return {
    batch: profile.batch ?? '',
    year: profile.year != null ? String(profile.year) : '',
    branch: profile.branch ?? '',
    phone: profile.phone ?? '',
    motherName: profile.motherName ?? '',
    motherPhone: profile.motherPhone ?? '',
    fatherName: profile.fatherName ?? '',
    fatherPhone: profile.fatherPhone ?? '',
    address: profile.address ?? '',
    localGuardianName: profile.localGuardianName ?? '',
    localGuardianPhone: profile.localGuardianPhone ?? '',
    localGuardianAddress: profile.localGuardianAddress ?? '',
  };
}

const initialForm = {
  batch: '',
  year: '',
  branch: '',
  phone: '',
  motherName: '',
  motherPhone: '',
  fatherName: '',
  fatherPhone: '',
  address: '',
  localGuardianName: '',
  localGuardianPhone: '',
  localGuardianAddress: '',
};

export default function Profile() {
  const [form, setForm] = useState(initialForm);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [faceFile, setFaceFile] = useState(null);
  const [facePreview, setFacePreview] = useState('');
  const [uploadingFace, setUploadingFace] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await getResidentProfile();
        const profile = res?.profile;
        if (profile) {
          setForm(profileToForm(profile));
          if (profile.referenceFaceImageUrl) {
            setFacePreview(profile.referenceFaceImageUrl);
          }
        }
      } catch (apiErr) {
        if (apiErr?.response?.status !== 404) {
          setErr(apiErr?.response?.data?.message || 'Failed to load profile.');
        }
      } finally {
        setFetching(false);
      }
    }
    loadProfile();
  }, []);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    setErr('');
    try {
      const payload = { ...form, year: Number(form.year) };
      const res = await upsertResidentProfile(payload);
      setMsg(res?.message || 'Profile saved successfully.');
    } catch (apiErr) {
      setErr(apiErr?.response?.data?.message || 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  }

  async function onUploadFaceImage(e) {
    e.preventDefault();
    setMsg('');
    setErr('');
    if (!faceFile) {
      setErr('Please choose a face image first.');
      return;
    }
    setUploadingFace(true);
    try {
      const res = await uploadReferenceFaceImage(faceFile);
      setFacePreview(res?.referenceFaceImageUrl || '');
      setMsg(res?.message || 'Reference face image uploaded.');
    } catch (apiErr) {
      setErr(apiErr?.response?.data?.message || 'Failed to upload face image.');
    } finally {
      setUploadingFace(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h3 className="text-xl font-semibold text-gray-900">Resident Profile</h3>
      <p className="text-sm text-gray-600 mt-1">
        Fill this once and update anytime. Attendance and other academic flows use this profile.
      </p>

      {msg && <div className="mt-4 p-3 text-sm rounded border bg-green-50 text-green-700">{msg}</div>}
      {err && <div className="mt-4 p-3 text-sm rounded border bg-red-50 text-red-700">{err}</div>}
      {fetching && <p className="mt-4 text-sm text-gray-500">Loading profile...</p>}

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Batch (YYYY or YYYY-YY)" name="batch" value={form.batch} onChange={onChange} required />
          <Field label="Year" name="year" value={form.year} onChange={onChange} required />
          <Field label="Branch" name="branch" value={form.branch} onChange={onChange} required />
        </div>

        <Field label="Phone" name="phone" value={form.phone} onChange={onChange} required />

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Mother Name" name="motherName" value={form.motherName} onChange={onChange} required />
          <Field label="Mother Phone" name="motherPhone" value={form.motherPhone} onChange={onChange} required />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Father Name" name="fatherName" value={form.fatherName} onChange={onChange} required />
          <Field label="Father Phone" name="fatherPhone" value={form.fatherPhone} onChange={onChange} required />
        </div>

        <div>
          <label className="block text-sm">Address</label>
          <textarea
            name="address"
            value={form.address}
            onChange={onChange}
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            rows={3}
            required
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Local Guardian Name (optional)" name="localGuardianName" value={form.localGuardianName} onChange={onChange} />
          <Field label="Local Guardian Phone (optional)" name="localGuardianPhone" value={form.localGuardianPhone} onChange={onChange} />
        </div>
        <div>
          <label className="block text-sm">Local Guardian Address (optional)</label>
          <textarea
            name="localGuardianAddress"
            value={form.localGuardianAddress}
            onChange={onChange}
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            rows={2}
          />
        </div>

        <button disabled={loading || fetching} className="rounded bg-gray-900 text-white py-2 px-4 text-sm disabled:opacity-50">
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      <form className="mt-8 p-4 border rounded-lg bg-white" onSubmit={onUploadFaceImage}>
        <h4 className="text-base font-semibold text-gray-900">Reference Face Image</h4>
        <p className="text-sm text-gray-600 mt-1">
          Upload one clear front-face image. This will be used later by your ArcFace verification pipeline.
        </p>
        <div className="mt-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFaceFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={uploadingFace || fetching}
          className="mt-3 rounded bg-gray-900 text-white py-2 px-4 text-sm disabled:opacity-50"
        >
          {uploadingFace ? 'Uploading...' : 'Upload Face Image'}
        </button>

        {facePreview && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-800">Current reference image</p>
            <img src={facePreview} alt="Reference face" className="mt-2 h-40 w-40 object-cover rounded-md border" />
          </div>
        )}
      </form>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm">{label}</label>
      <input {...props} className="mt-1 w-full border rounded px-3 py-2 text-sm" />
    </div>
  );
}
