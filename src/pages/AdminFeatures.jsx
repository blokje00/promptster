import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Plus, Trash2, Eye, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * AdminFeatures - Admin-friendly CMS for Features page
 * Bulk edit all feature blocks without inline editors
 */
export default function AdminFeatures() {
  const queryClient = useQueryClient();
  const [editingBlocks, setEditingBlocks] = useState({});

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['featureBlocks'],
    queryFn: () => base44.entities.FeatureBlock.list("order"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FeatureBlock.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureBlocks'] });
      toast.success("Block updated");
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FeatureBlock.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureBlocks'] });
      toast.success("Block created");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FeatureBlock.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureBlocks'] });
      toast.success("Block deleted");
    }
  });

  const handleUpdate = (blockId) => {
    const block = editingBlocks[blockId];
    if (!block) return;
    
    updateMutation.mutate({
      id: blockId,
      data: {
        content: block.content,
        content_type: block.content_type || 'text',
        order: block.order || 0,
        metadata: block.metadata || {}
      }
    });
  };

  const handleFieldChange = (blockId, field, value) => {
    setEditingBlocks(prev => ({
      ...prev,
      [blockId]: {
        ...(prev[blockId] || blocks.find(b => b.id === blockId)),
        [field]: value
      }
    }));
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-slate-600 mt-2">Admin only page</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Features CMS Editor
            </h1>
            <p className="text-slate-600 mt-2">Bulk edit all feature blocks for the Features page</p>
            <Badge className="mt-2 bg-red-600">ADMIN ONLY</Badge>
          </div>
          <Link to={createPageUrl("Features")}>
            <Button variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Preview Live Page
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {blocks.map((block) => {
            const editing = editingBlocks[block.id] || block;
            
            return (
              <Card key={block.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <code className="text-sm bg-slate-100 px-2 py-1 rounded text-slate-700">
                        {block.block_key}
                      </code>
                      <Badge variant="outline">Order: {block.order}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(block.id)}
                        disabled={updateMutation.isPending}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(block.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Content Type</Label>
                      <Select 
                        value={editing.content_type || 'text'}
                        onValueChange={(val) => handleFieldChange(block.id, 'content_type', val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="markdown">Markdown</SelectItem>
                          <SelectItem value="html">HTML</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Display Order</Label>
                      <Input
                        type="number"
                        value={editing.order || 0}
                        onChange={(e) => handleFieldChange(block.id, 'order', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      value={editing.content}
                      onChange={(e) => handleFieldChange(block.id, 'content', e.target.value)}
                      className="min-h-[120px] font-mono text-sm"
                    />
                  </div>

                  {editing.metadata && (
                    <div className="space-y-2">
                      <Label>Metadata (JSON)</Label>
                      <Textarea
                        value={JSON.stringify(editing.metadata, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            handleFieldChange(block.id, 'metadata', parsed);
                          } catch (err) {
                            // Invalid JSON, don't update
                          }
                        }}
                        className="min-h-[80px] font-mono text-xs"
                        placeholder='{"icon": "Database", "specs": ["spec1", "spec2"]}'
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {blocks.length === 0 && !isLoading && (
          <div className="text-center py-12 text-slate-500">
            No feature blocks found. Create your first block.
          </div>
        )}
      </div>
    </div>
  );
}