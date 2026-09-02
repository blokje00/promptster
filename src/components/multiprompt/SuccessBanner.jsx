import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SuccessBanner({ show }) {
  if (!show) return null;

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg shadow-lg animate-in fade-in slide-in-from-top-4 text-center">
      <p className="text-sm font-medium">
        ✓ Copied & Saved! Tekst zit op je plakbord. Tasks moved to Recycle Bin.{" "}
        <Link to={createPageUrl("Checks")} className="underline text-white hover:text-white/90">
          Check progress in Vault.
        </Link>
      </p>
    </div>
  );
}