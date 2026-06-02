import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1E3A5F] text-white p-5 text-center font-sans">
      <h1 className="text-5xl font-bold mb-2.5 text-[#C9A84C]">404</h1>
      <h2 className="text-2xl mb-5 font-normal">Page Not Found</h2>
      <p className="text-base mb-7.5 max-w-[400px] text-[#E8C96A] leading-relaxed mx-auto">
        The Philippine Statutory & Edge Compliance ledger page you are looking for does not exist.
      </p>
      <Link 
        href="/" 
        className="bg-[#C9A84C] hover:bg-[#E8C96A] text-white px-5 py-2.5 rounded-md font-bold text-sm transition-all duration-200"
      >
        Return Home
      </Link>
    </div>
  );
}

