import { Link } from 'react-router-dom';

export default function HomePage() {
    
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">Welcome to HandOff Tools</h1>
      <p className="text-lg text-gray-700 mb-6">Manage your tools, users, and QR codes efficiently.</p>

      <div className="space-x-4">
        <Link
          to="/login"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded shadow"
        >
          Login 
        </Link>

        <Link
          to="/admin"
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded shadow"
        >
          Admin Dashboard 
        </Link>
        <Link
          to="/signup"
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded shadow"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
}
