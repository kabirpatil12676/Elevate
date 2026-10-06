import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Lenis from 'lenis';
import Home from './pages/Home';
import Courses from './pages/Courses';
import Community from './pages/Community';
import CareerRoadmaps from './pages/CareerRoadmaps';
import AboutElevate from './pages/AboutElevate';
import Testimonials from './pages/Testimonials';

function App() {
  // Initialize Lenis for buttery smooth momentum scrolling (like WebVeda)
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Smooth ease-out
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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/community" element={<Community />} />
        <Route path="/career-roadmaps" element={<CareerRoadmaps />} />
        <Route path="/about-elevate" element={<AboutElevate />} />
        <Route path="/testimonials" element={<Testimonials />} />
        {/* We will add more routes here for login, dashboard, journeys, etc. */}
      </Routes>
    </Router>
  );
}

export default App;
