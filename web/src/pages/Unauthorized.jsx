import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig"; // make sure auth is correctly imported

export default function Unauthorized() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error during sign-out:", error);
      alert("Logout failed. Please try again.");
    }
  };

  return (
    <div className="text-center mt-10 text-red-600">
      <h1 className="text-2xl font-bold mb-4">403 - Unauthorized</h1>
      <p className="mb-6">You do not have permission to access this page.</p>
      <button
        onClick={handleLogout}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
      >
        Sign Out
      </button>
    </div>
  );
}
