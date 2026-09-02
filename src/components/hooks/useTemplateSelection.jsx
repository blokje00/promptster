import { useState, useEffect } from "react";
import * as projects from "@/api/projects";

export const useTemplateSelection = (selectedProjectId, selectedProject) => {
  const [startTemplateId, setStartTemplateId] = useState("");
  const [endTemplateId, setEndTemplateId] = useState("");
  const [includePersonalPrefs, setIncludePersonalPrefs] = useState(true);
  const [includeProjectConfig, setIncludeProjectConfig] = useState(true);
  // TASK-1: previously always-on blocks, now toggleable in the Prompt Recipe
  const [includeLearnedPatterns, setIncludeLearnedPatterns] = useState(true);
  const [includeParserInstruction, setIncludeParserInstruction] = useState(true);

  // Load templates on project change
  useEffect(() => {
    if (selectedProject) {
      setStartTemplateId(selectedProject.last_start_template_id || "");
      setEndTemplateId(selectedProject.last_end_template_id || "");
    } else {
      setStartTemplateId("");
      setEndTemplateId("");
    }
  }, [selectedProjectId, selectedProject]);

  // TASK-5: Autosave start template with debounce
  useEffect(() => {
    if (!selectedProjectId || !startTemplateId) return;
    
    const timer = setTimeout(() => {
      projects.update(selectedProjectId, {
        last_start_template_id: startTemplateId
      }).catch(err => console.error('Failed to save start template:', err));
    }, 300);

    return () => clearTimeout(timer);
  }, [startTemplateId, selectedProjectId]);

  // TASK-5: Autosave end template with debounce
  useEffect(() => {
    if (!selectedProjectId || !endTemplateId) return;
    
    const timer = setTimeout(() => {
      projects.update(selectedProjectId, {
        last_end_template_id: endTemplateId
      }).catch(err => console.error('Failed to save end template:', err));
    }, 300);

    return () => clearTimeout(timer);
  }, [endTemplateId, selectedProjectId]);

  return {
    startTemplateId,
    setStartTemplateId,
    endTemplateId,
    setEndTemplateId,
    includePersonalPrefs,
    setIncludePersonalPrefs,
    includeProjectConfig,
    setIncludeProjectConfig,
    includeLearnedPatterns,
    setIncludeLearnedPatterns,
    includeParserInstruction,
    setIncludeParserInstruction
  };
};