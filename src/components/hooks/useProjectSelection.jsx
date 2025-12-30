import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const useProjectSelection = (projects) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    if (location.state?.projectId) return location.state.projectId;
    return localStorage.getItem('lastSelectedProjectId') || "";
  });

  useEffect(() => {
    localStorage.setItem('lastSelectedProjectId', selectedProjectId || "");
    if (location.state?.projectId) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [selectedProjectId, location.state, navigate]);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'lastSelectedProjectId' && e.newValue !== selectedProjectId) {
        setSelectedProjectId(e.newValue || "");
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [selectedProjectId]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return {
    selectedProjectId,
    setSelectedProjectId,
    selectedProject
  };
};