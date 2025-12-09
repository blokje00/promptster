import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export const useTemplateSelection = (selectedProjectId, selectedProject) => {
  const [startTemplateId, setStartTemplateId] = useState("");
  const [endTemplateId, setEndTemplateId] = useState("");
  const [includePersonalPrefs, setIncludePersonalPrefs] = useState(true);
  const [includeProjectConfig, setIncludeProjectConfig] = useState(true);

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

  // Autosave start template
  useEffect(() => {
    if (selectedProjectId && startTemplateId) {
      base44.entities.Project.update(selectedProjectId, { 
        last_start_template_id: startTemplateId 
      });
    }
  }, [startTemplateId, selectedProjectId]);

  // Autosave end template
  useEffect(() => {
    if (selectedProjectId && endTemplateId) {
      base44.entities.Project.update(selectedProjectId, { 
        last_end_template_id: endTemplateId 
      });
    }
  }, [endTemplateId, selectedProjectId]);

  return {
    startTemplateId,
    setStartTemplateId,
    endTemplateId,
    setEndTemplateId,
    includePersonalPrefs,
    setIncludePersonalPrefs,
    includeProjectConfig,
    setIncludeProjectConfig
  };
};