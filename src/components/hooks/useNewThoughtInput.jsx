import { useState, useEffect } from "react";

export const useNewThoughtInput = (selectedProjectId) => {
  const [newThoughtContent, setNewThoughtContent] = useState("");
  const [newThoughtScreenshots, setNewThoughtScreenshots] = useState([]);
  const [newThoughtFocus, setNewThoughtFocus] = useState("both");
  const [newThoughtContext, setNewThoughtContext] = useState({});

  // TASK-2: Load draft AND screenshots per project from localStorage
  useEffect(() => {
    const draftKey = `promptster:draft:${selectedProjectId || 'all'}`;
    const screenshotsKey = `promptster:screenshots:${selectedProjectId || 'all'}`;
    
    const saved = localStorage.getItem(draftKey);
    if (saved) setNewThoughtContent(saved);
    else setNewThoughtContent("");
    
    const savedScreenshots = localStorage.getItem(screenshotsKey);
    if (savedScreenshots) {
      try {
        setNewThoughtScreenshots(JSON.parse(savedScreenshots));
      } catch {
        setNewThoughtScreenshots([]);
      }
    } else {
      setNewThoughtScreenshots([]);
    }
  }, [selectedProjectId]);

  // TASK-2: Save draft AND screenshots per project to localStorage
  useEffect(() => {
    const draftKey = `promptster:draft:${selectedProjectId || 'all'}`;
    const screenshotsKey = `promptster:screenshots:${selectedProjectId || 'all'}`;
    
    if (newThoughtContent) {
      localStorage.setItem(draftKey, newThoughtContent);
    } else {
      localStorage.removeItem(draftKey);
    }
    
    if (newThoughtScreenshots.length > 0) {
      localStorage.setItem(screenshotsKey, JSON.stringify(newThoughtScreenshots));
    } else {
      localStorage.removeItem(screenshotsKey);
    }
  }, [newThoughtContent, newThoughtScreenshots, selectedProjectId]);

  const resetInput = () => {
    setNewThoughtContent("");
    setNewThoughtScreenshots([]);
    setNewThoughtFocus("both");
    setNewThoughtContext({});
    localStorage.removeItem(`promptster:draft:${selectedProjectId || 'all'}`);
    localStorage.removeItem(`promptster:screenshots:${selectedProjectId || 'all'}`);
  };

  return {
    newThoughtContent,
    setNewThoughtContent,
    newThoughtScreenshots,
    setNewThoughtScreenshots,
    newThoughtFocus,
    setNewThoughtFocus,
    newThoughtContext,
    setNewThoughtContext,
    resetInput
  };
};