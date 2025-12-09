import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ItemDetailsForm({ formData, onChange }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          placeholder="E.g.: React useEffect Hook"
          value={formData.title}
          onChange={(e) => onChange({...formData, title: e.target.value})}
          required
          className="border-slate-200"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type *</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => onChange({...formData, type: value})}
        >
          <SelectTrigger className="border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="prompt">Prompt</SelectItem>
            <SelectItem value="code">Code</SelectItem>
            <SelectItem value="snippet">Snippet</SelectItem>
            <SelectItem value="idee">Idea</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(formData.type === "code" || formData.type === "snippet") && (
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="language">Language</Label>
          <Select
            value={formData.language}
            onValueChange={(value) => onChange({...formData, language: value})}
          >
            <SelectTrigger className="border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="css">CSS</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="markdown">Markdown</SelectItem>
              <SelectItem value="sql">SQL</SelectItem>
              <SelectItem value="bash">Bash</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="Short description of this item"
          value={formData.description}
          onChange={(e) => onChange({...formData, description: e.target.value})}
          className="border-slate-200"
        />
      </div>
    </div>
  );
}