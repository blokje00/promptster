import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TaskDecomposerDialog({ 
    isOpen, 
    onClose, 
    taskContent, 
    projectId,
    onSelectVariant 
}) {
    const [selectedVariant, setSelectedVariant] = useState(null);

    const decomposeMutation = useMutation({
        mutationFn: async () => {
            const response = await base44.functions.invoke('decomposeTask', {
                task_content: taskContent,
                project_id: projectId
            });
            return response.data;
        }
    });

    React.useEffect(() => {
        if (isOpen && taskContent && !decomposeMutation.data) {
            decomposeMutation.mutate();
        }
    }, [isOpen, taskContent]);

    const handleSelectVariant = (variant) => {
        setSelectedVariant(variant.id);
        if (onSelectVariant) {
            onSelectVariant(variant.description);
        }
        toast.success(`Variant ${variant.id} geselecteerd!`);
        setTimeout(() => onClose(), 500);
    };

    const getVariantColor = (id) => {
        switch (id) {
            case 'A': return 'bg-blue-100 text-blue-800';
            case 'B': return 'bg-purple-100 text-purple-800';
            case 'C': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        Task Decomposer
                    </DialogTitle>
                    <DialogDescription>
                        AI genereert 3 varianten van je task - kies de beste!
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Originele task:</p>
                        <p className="text-gray-900 font-medium">{taskContent}</p>
                    </div>

                    {decomposeMutation.isPending && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                            <span className="ml-3 text-gray-600">AI genereert varianten...</span>
                        </div>
                    )}

                    {decomposeMutation.isError && (
                        <div className="text-center py-8">
                            <p className="text-red-600">Fout bij genereren: {decomposeMutation.error.message}</p>
                            <Button 
                                onClick={() => decomposeMutation.mutate()} 
                                className="mt-4"
                                variant="outline"
                            >
                                Opnieuw proberen
                            </Button>
                        </div>
                    )}

                    {decomposeMutation.data && (
                        <div className="space-y-4">
                            {decomposeMutation.data.variants.map((variant) => {
                                const isRecommended = variant.id === decomposeMutation.data.recommendation;
                                const isSelected = selectedVariant === variant.id;

                                return (
                                    <div
                                        key={variant.id}
                                        className={`border-2 rounded-lg p-4 transition-all ${
                                            isSelected 
                                                ? 'border-indigo-500 bg-indigo-50' 
                                                : isRecommended 
                                                ? 'border-green-300 bg-green-50' 
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Badge className={getVariantColor(variant.id)}>
                                                    Variant {variant.id}
                                                </Badge>
                                                {isRecommended && (
                                                    <Badge variant="outline" className="bg-green-100 text-green-800">
                                                        ⭐ Aanbevolen
                                                    </Badge>
                                                )}
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleSelectVariant(variant)}
                                                disabled={isSelected}
                                                variant={isSelected ? "secondary" : "default"}
                                            >
                                                {isSelected ? (
                                                    <>
                                                        <Check className="w-4 h-4 mr-2" />
                                                        Geselecteerd
                                                    </>
                                                ) : (
                                                    'Selecteer'
                                                )}
                                            </Button>
                                        </div>

                                        <h3 className="font-semibold text-gray-900 mb-2">
                                            {variant.title}
                                        </h3>

                                        <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                                            {variant.description}
                                        </p>

                                        <div className="text-xs text-gray-600 bg-white rounded p-2 border border-gray-200">
                                            <span className="font-medium">💡 Rationale:</span> {variant.rationale}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}