'use client';

import { useEffect, useState } from 'react';
import { FileText, Trash2, Upload, X } from 'lucide-react';
import { get, put, del } from '@/lib/api';
import { formatDate } from '@/lib/constants';

// PDF → text happens in the browser; only the text is sent to the server.
async function readFile(file) {
  if (!/\.pdf$/i.test(file.name)) return file.text();
  const { extractText, getDocumentProxy } = await import('unpdf');
  const { text } = await extractText(await getDocumentProxy(new Uint8Array(await file.arrayBuffer())), { mergePages: true });
  return text;
}

function ResumeModal({ onClose, onSaved }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(''); // '' | 'reading' | 'saving'
  const [error, setError] = useState('');

  const load = async (file) => {
    if (!file) return;
    setError('');
    setBusy('reading');
    try {
      const content = (await readFile(file)).trim();
      if (!content) throw new Error("Couldn't find any text in that file (it may be a scanned image). Paste the text instead.");
      setText(content);
    } catch (err) {
      setError(err.message || "Couldn't read that file. Paste the text instead.");
    }
    setBusy('');
  };

  const save = async () => {
    setError('');
    setBusy('saving');
    try {
      onSaved(await put('/api/users/me/resume', { text }));
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="font-serif text-3xl">Your resume</h2>
          <button onClick={onClose} className="btn-ghost size-8 p-0!" title="Close"><X size={16} /></button>
        </div>
        <p className="mt-1 text-sm text-ink-2">Aria uses a short summary to ask about your real projects. Contact details are never used.</p>

        <label
          className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-5 text-sm text-ink-2 transition hover:border-sky hover:text-sky-deep"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); load(e.dataTransfer.files[0]); }}
        >
          <input type="file" accept=".pdf,.txt" className="sr-only" onChange={(e) => load(e.target.files[0])} />
          {busy === 'reading' ? <span className="spinner size-4" /> : <Upload size={16} />} Upload or drop a PDF
        </label>
        <textarea
          className="input mt-3 h-44 resize-none"
          placeholder="…or paste your resume text here"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {error && <div className="alert mt-3">{error}</div>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} disabled={busy !== '' || text.trim().length < 100} className="btn-primary">
            {busy === 'saving' && <span className="spinner size-4" />} {busy === 'saving' ? 'Reading your resume…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Resume status with Add / Update / Remove. `compact` is a one-line version for the new-interview page.
export default function ResumeCard({ compact = false, onChange }) {
  const [resume, setResume] = useState(undefined); // undefined = loading, null = none saved
  const [open, setOpen] = useState(false);

  useEffect(() => {
    get('/api/users/me/resume').then(setResume).catch(() => setResume(null));
  }, []);
  useEffect(() => {
    if (resume !== undefined) onChange?.(resume);
  }, [resume, onChange]);

  const remove = async () => {
    if (!confirm("Remove your resume? Aria won't use it in new interviews (past reports keep theirs).")) return;
    await del('/api/users/me/resume').catch(() => {});
    setResume(null);
  };

  const modal = open && <ResumeModal onClose={() => setOpen(false)} onSaved={(r) => { setResume(r); setOpen(false); }} />;

  if (compact) {
    return (
      // A div, not a p: the modal renders inside and can't live in a paragraph.
      <div className="text-sm text-ink-2">
        {resume === undefined ? 'Checking your resume…' : resume ? `Resume updated ${formatDate(resume.updatedAt)}. ` : 'No resume saved yet. '}
        {resume !== undefined && (
          <button onClick={() => setOpen(true)} className="cursor-pointer font-medium text-sky-deep hover:underline">
            {resume ? 'Update' : 'Add resume'}
          </button>
        )}
        {modal}
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><FileText size={16} className="text-sky" /> Your resume</h2>
      {resume === undefined ? (
        <span className="spinner mt-4 size-4 text-ink-3" />
      ) : resume ? (
        <>
          <p className="mt-2 text-xs text-ink-3">
            Updated {formatDate(resume.updatedAt)}
            {resume.stale && <span className="text-amber-700"> · Still current?</span>}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {resume.profile?.skills?.slice(0, 6).map((s) => (
              <span key={s} className="rounded-full bg-sky-soft px-2.5 py-1 text-xs text-sky-deep">{s}</span>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setOpen(true)} className="btn border border-line px-4 py-2 hover:border-ink/20">Update</button>
            <button onClick={remove} className="btn-ghost size-9 p-0!" title="Remove resume"><Trash2 size={15} /></button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-2">Add it once and Aria will ask about your real projects and experience.</p>
          <button onClick={() => setOpen(true)} className="btn-primary mt-4 px-4 py-2">Add resume</button>
        </>
      )}
      {modal}
    </div>
  );
}
