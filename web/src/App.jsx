import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

const RequireAuth = ({ children }) => {
  const user = firebase.auth().currentUser;
  const isAdmin = user?.role === 'admin'; // Replace with your logic

  return isAdmin ? children : <Navigate to="/" />;
};
//<Route path="/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Routes>
    </Router>
  );
}

export default App;
