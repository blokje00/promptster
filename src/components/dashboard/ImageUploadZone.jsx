import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, ZoomIn, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ImageUploadZone({ images, onImagesChange }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith("image/")
    );

    if (droppedFiles.length === 0) {
      toast.error("Alleen afbeeldingen zijn toegestaan");
      return;
    }

    await uploadFiles(droppedFiles);
  };

  const handleFileInput = async (e) => {
    const selectedFiles = Array.from(e.target.files).filter(
      file => file.type.startsWith("image/")
    );

    if (selectedFiles.length === 0) {
      toast.error("Alleen afbeeldingen zijn toegestaan");
      return;
    }

    await uploadFiles(selectedFiles);
  };

  const uploadFiles = async (files) => {
    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return file_url;
      });

      const newImageUrls = await Promise.all(uploadPromises);
      onImagesChange([...(images || []), ...newImageUrls]);
      toast.success(`${files.length} afbeelding(en) geüpload`);
    } catch (error) {
      toast.error("Fout bij uploaden van afbeeldingen");
      console.error(error);
    }
    setUploading(false);
  };

  const removeImage = (indexToRemove) => {
    onImagesChange(images.filter((_, index) => index !== indexToRemove));
    toast.success("Afbeelding verwijderd");
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onImagesChange(items);
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 transition-all ${
          dragActive 
            ? "border-indigo-500 bg-indigo-50" 
            : "border-slate-300 hover:border-slate-400"
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="hidden"
          id="image-upload"
          disabled={uploading}
        />
        <label htmlFor="image-upload" className="cursor-pointer block text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
            {uploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            ) : (
              <Upload className="w-8 h-8 text-slate-400" />
            )}
          </div>
          <p className="text-slate-700 font-medium mb-1">
            {uploading ? "Uploaden..." : "Sleep afbeeldingen hierheen"}
          </p>
          <p className="text-sm text-slate-500">of klik om bestanden te selecteren</p>
        </label>
      </div>

      {images && images.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-slate-600 font-medium">
            {images.length} afbeelding(en) • Sleep om volgorde te wijzigen
          </p>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="images" direction="horizontal">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                >
                  {images.map((imageUrl, index) => (
                    <Draggable key={imageUrl} draggableId={imageUrl} index={index}>
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`relative group overflow-hidden ${
                            snapshot.isDragging ? 'ring-2 ring-indigo-500 shadow-lg' : ''
                          }`}
                        >
                          <div className="relative">
                            <img
                              src={imageUrl}
                              alt={`Screenshot ${index + 1}`}
                              className="w-full h-32 object-cover"
                            />
                            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-40 transition-opacity" />
                            
                            {/* Drag handle */}
                            <div
                              {...provided.dragHandleProps}
                              className="absolute top-2 left-2 p-1 bg-white rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="w-4 h-4 text-slate-600" />
                            </div>

                            {/* Action buttons */}
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <ZoomIn className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl">
                                  <img
                                    src={imageUrl}
                                    alt={`Screenshot ${index + 1}`}
                                    className="w-full h-auto rounded-lg"
                                  />
                                </DialogContent>
                              </Dialog>

                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => removeImage(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>

                            {/* Index badge */}
                            <div className="absolute bottom-2 left-2 bg-slate-900 text-white text-xs font-medium px-2 py-1 rounded">
                              #{index + 1}
                            </div>
                          </div>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}
    </div>
  );
}