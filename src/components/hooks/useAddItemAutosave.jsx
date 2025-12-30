import { useEffect, useState } from "react";

/**
 * Hook for managing AddItem autosave functionality
 * @param {Object} currentUser - Current user object
 * @param {Object} formData - Form data to autosave
 * @param {string} tagInput - Tag input value
 * @returns {Object} - { setIsRestoringDraft }
 */
export function useAddItemAutosave(currentUser, formData, tagInput) {
  const [isRestoringDraft, setIsRestoringDraft] = useState(true);

  // Autosave effect
  useEffect(() => {
    if (!isRestoringDraft && currentUser?.id) {
      const draftData = {
        ...formData,
        timestamp: new Date().getTime()
      };
      localStorage.setItem(`additem_draft_${currentUser.id}`, JSON.stringify(draftData));
      localStorage.setItem(`additem_tag_draft_${currentUser.id}`, tagInput);
    }
  }, [formData, tagInput, currentUser, isRestoringDraft]);

  // Restore autosave effect
  useEffect(() => {
    if (currentUser?.id) {
      const savedDraft = localStorage.getItem(`additem_draft_${currentUser.id}`);
      const savedTag = localStorage.getItem(`additem_tag_draft_${currentUser.id}`);
      
      return { draft: savedDraft, tag: savedTag };
    }
  }, [currentUser]);

  const clearDraft = () => {
    if (currentUser?.id) {
      localStorage.removeItem(`additem_draft_${currentUser.id}`);
      localStorage.removeItem(`additem_tag_draft_${currentUser.id}`);
    }
  };

  return { isRestoringDraft, setIsRestoringDraft, clearDraft };
}