import { BrowserRouter, Route, Routes } from 'react-router-dom';

function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="text-3xl font-bold tracking-tight text-white">OurApp</h1>
        <p className="mt-3 text-sm text-slate-400">
          Instagram-first personal memory layer. Save once. Understand
          immediately. Remember later.
        </p>
        <div className="mt-6 inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
          Phase 1 — Foundation Ready
        </div>
      </div>
    </main>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
