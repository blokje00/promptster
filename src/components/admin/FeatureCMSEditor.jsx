import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export default function FeatureCMSEditor() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [formData, setFormData] = useState({
    block_key: "",
    content: "",
    content_type: "text",
    order: 0,
    metadata: {}
  });

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['featureBlocks'],
    queryFn: () => base44.entities.FeatureBlock.list("order"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FeatureBlock.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureBlocks'] });
      toast.success("Block created");
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FeatureBlock.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureBlocks'] });
      toast.success("Block updated");
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FeatureBlock.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featureBlocks'] });
      toast.success("Block deleted");
    },
  });

  const resetForm = () => {
    setFormData({
      block_key: "",
      content: "",
      content_type: "text",
      order: 0,
      metadata: {}
    });
    setEditingBlock(null);
    setDialogOpen(false);
  };

  const handleEdit = (block) => {
    setFormData({
      block_key: block.block_key,
      content: block.content,
      content_type: block.content_type || "text",
      order: block.order || 0,
      metadata: block.metadata || {}
    });
    setEditingBlock(block);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingBlock) {
      updateMutation.mutate({ id: editingBlock.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Features Page CMS (Admin Only)</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Block
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{editingBlock ? "Edit Block" : "New Block"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Block Key</Label>
                <Input 
                  value={formData.block_key}
                  onChange={(e) => setFormData({...formData, block_key: e.target.value})}
                  placeholder="hero_title, feature_1_title, etc."
                />
              </div>
              <div>
                <Label>Content Type</Label>
                <Select value={formData.content_type} onValueChange={(v) => setFormData({...formData, content_type: v})}>
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
              <div>
                <Label>Content</Label>
                <Textarea 
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="min-h-[150px]"
                  placeholder="Enter content here..."
                />
              </div>
              <div>
                <Label>Order</Label>
                <Input 
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <Label>Metadata (JSON)</Label>
                <Textarea 
                  value={JSON.stringify(formData.metadata, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setFormData({...formData, metadata: parsed});
                    } catch {}
                  }}
                  className="min-h-[100px] font-mono text-xs"
                  placeholder='{"icon": "Database", "specs": ["Unlimited prompts"]}'
                />
              </div>
              <Button onClick={handleSubmit} className="w-full bg-indigo-600">
                <Save className="w-4 h-4 mr-2" />
                Save Block
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-slate-500 text-center py-8">Loading...</p>
        ) : blocks.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No blocks yet. Create your first one!</p>
        ) : (
          <div className="space-y-3">
            {blocks.map((block) => (
              <div key={block.id} className="border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{block.block_key}</span>
                    <span className="text-xs text-slate-500">({block.content_type})</span>
                  </div>
                  <p className="text-sm text-slate-700 line-clamp-2">{block.content}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(block)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(block.id)} className="text-red-500 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}