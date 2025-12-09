import { useState, useEffect } from "react";

export const useNewThoughtInput = (selectedProjectId) => {
  const [newThoughtContent, setNewThoughtContent] = useState("");
  const [newThoughtScreenshots, setNewThoughtScreenshots] = useState([]);
  const [newThoughtFocus, setNewThoughtFocus] = useState("both");
  const [newThoughtContext, setNewThoughtContext] = useState({});

  // Load draft from localStorage
  useEffect(() => {
    const key = `promptster:draft:${selectedProjectId || 'all'}`;
    const saved = localStorage.getItem(key);
    if (saved) setNewThoughtContent(saved);
  }, [selectedProjectId]);

  // Save draft to localStorage
  useEffect(() => {
    const key = `promptster:draft:${selectedProjectId || 'all'}`;
    localStorage.setItem(key, newThoughtContent);
  }, [newThoughtContent, selectedProjectId]);

  const resetInput = () => {
    setNewThoughtContent("");
    localStorage.removeItem(`promptster:draft:${selectedProjectId || 'all'}`);
    setNewThoughtScreenshots([]);
    setNewThoughtFocus("both");
    setNewThoughtContext({});
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