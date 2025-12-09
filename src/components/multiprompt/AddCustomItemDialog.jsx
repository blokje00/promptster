import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * Dialog for adding custom pages or components
 * @param {boolean} isOpen - Whether dialog is open
 * @param {function} onClose - Close callback
 * @param {'page'|'component'} type - Type of item being added
 * @param {function} onAdd - Add callback with name parameter
 */
export default function AddCustomItemDialog({ isOpen, onClose, type, onAdd }) {
  const { t } = useLanguage();
  const [name, setName] = React.useState("");

  const handleSubmit = () => {
    if (name.trim()) {
      onAdd(name.trim());
      setName("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {type === 'page' 
              ? (t("addNewPage") || "Add New Page") 
              : (t("addNewComponent") || "Add New Component")}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'page' 
              ? (t("pageName") || "Page name...") 
              : (t("componentName") || "Component name...")}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("cancel") || "Cancel"}
          </Button>
          <Button type="submit" onClick={handleSubmit}>
            {t("add") || "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}