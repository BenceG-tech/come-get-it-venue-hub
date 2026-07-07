
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ImageUploadInputProps {
  onUploaded: (publicUrl: string) => void;
  buttonLabel?: string;
  folder?: string; // optional storage folder prefix
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  multiple?: boolean;
}

/**
 * Small, focused upload button that uploads a single image to Supabase Storage (venue-images)
 * and returns its public URL via onUploaded.
 */
export function ImageUploadInput({
  onUploaded,
  buttonLabel = "Fájl feltöltése",
  folder = "venues",
  className,
  size = "sm",
  variant = "outline",
  multiple = false,
}: ImageUploadInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const { toast } = useToast();

  const handleClick = () => {
    if (!isUploading) inputRef.current?.click();
  };

  const uploadOne = async (file: File): Promise<string | null> => {
    const safeName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9.\-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("venue-images")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("[ImageUploadInput] upload error", uploadError, "for", file.name);
      toast({
        title: `Feltöltési hiba: ${file.name}`,
        description: uploadError.message || "A fájl feltöltése nem sikerült.",
        variant: "destructive" as any,
      });
      return null;
    }

    const { data: publicData } = supabase.storage
      .from("venue-images")
      .getPublicUrl(path);
    return publicData?.publicUrl ?? null;
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setProgress({ done: 0, total: files.length });

    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      const url = await uploadOne(files[i]);
      if (url) {
        onUploaded(url);
        successCount++;
      }
      setProgress({ done: i + 1, total: files.length });
    }

    if (successCount > 0) {
      toast({
        title: "Sikeres feltöltés",
        description: files.length > 1
          ? `${successCount}/${files.length} kép feltöltve.`
          : "A kép feltöltése sikerült.",
      });
    }

    setIsUploading(false);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("inline-flex items-center", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <Button
        type="button"
        size={size}
        variant={variant}
        className={cn(isUploading ? "opacity-70 cursor-not-allowed" : "")}
        onClick={handleClick}
        disabled={isUploading}
      >
        {isUploading ? "Feltöltés..." : buttonLabel}
      </Button>
    </div>
  );
}

export default ImageUploadInput;
