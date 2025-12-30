import React from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Globe } from "lucide-react";

const languageFlags = {
  nl: "🇳🇱",
  en: "🇬🇧",
  fr: "🇫🇷",
  de: "🇩🇪",
  "zh-CN": "🇨🇳",
};

export default function LanguageSelector() {
  const { language, setLanguage, t, languageNames } = useLanguage();

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Globe className="w-4 h-4" />
        {t("languageSelection")}
      </Label>
      <Select value={language} onValueChange={setLanguage}>
        <SelectTrigger className="w-full">
          <SelectValue>
            <span className="flex items-center gap-2">
              <span>{languageFlags[language]}</span>
              <span>{languageNames[language]}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(languageNames).map(([code, name]) => (
            <SelectItem key={code} value={code}>
              <span className="flex items-center gap-2">
                <span>{languageFlags[code]}</span>
                <span>{name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}