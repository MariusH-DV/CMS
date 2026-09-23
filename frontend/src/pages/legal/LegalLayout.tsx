import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';

export default function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <Link to="/login" className="flex items-center gap-2 mb-6 w-fit">
          <img src={logo} alt="Logo" className="h-8 w-8 rounded-md object-cover" />
          <span className="font-semibold text-slate-800">Zentrale CMS</span>
        </Link>
        <div className="card p-8 animate-pop-in">
          <h1 className="text-xl font-semibold text-slate-800 mb-6">{title}</h1>
          <div className="flex flex-col gap-4 text-sm text-slate-700 leading-relaxed">{children}</div>
        </div>
        <div className="flex gap-4 mt-4 px-2 text-xs text-slate-400">
          <Link to="/impressum" className="hover:text-slate-600">
            Impressum
          </Link>
          <Link to="/datenschutz" className="hover:text-slate-600">
            Datenschutzerklärung
          </Link>
          <Link to="/login" className="hover:text-slate-600">
            Zurück zur Anmeldung
          </Link>
        </div>
      </div>
    </div>
  );
}
