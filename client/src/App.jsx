import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Lenis from 'lenis';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import HomeV2 from './pages/HomeV2';
import Courses from './pages/Courses';
import Community from './pages/Community';
import CareerRoadmaps from './pages/CareerRoadmaps';
import AboutElevate from './pages/AboutElevate';
import Testimonials from './pages/Testimonials';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import EducatorPortal from './pages/EducatorPortal';
import AdminPortal from './pages/AdminPortal';
import CourseDetail from './pages/CourseDetail';
import LearningNeeds from './pages/LearningNeeds';

function App() {
  // Initialize Lenis for buttery smooth momentum scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/home-v2" element={<HomeV2 />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/community" element={<Community />} />
          <Route path="/career-roadmaps" element={<CareerRoadmaps />} />
          <Route path="/about-elevate" element={<AboutElevate />} />
          <Route path="/testimonials" element={<Testimonials />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Role-protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/learning-needs"
            element={
              <ProtectedRoute>
                <LearningNeeds />
              </ProtectedRoute>
            }
          />
          <Route
            path="/diagnostic"
            element={
              <ProtectedRoute>
                <LearningNeeds />
              </ProtectedRoute>
            }
          />
          <Route
            path="/educator"
            element={
              <ProtectedRoute allowedRoles={['educator', 'admin']}>
                <EducatorPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPortal />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
