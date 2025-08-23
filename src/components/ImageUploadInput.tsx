
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
}: ImageUploadInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleClick = () => {
    if (!isUploading) inputRef.current?.click();
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
    const path = `${folder}/${Date.now()}-${safeName}`;

    console.log("[ImageUploadInput] uploading to path:", path);

    const { error: uploadError } = await supabase.storage
      .from("venue-images")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("[ImageUploadInput] upload error", uploadError);
      toast({
        title: "Feltöltési hiba",
        description: uploadError.message || "A fájl feltöltése nem sikerült.",
        variant: "destructive" as any,
      });
      setIsUploading(false);
      return;
    }

    const { data: publicData } = supabase.storage
      .from("venue-images")
      .getPublicUrl(path);

    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) {
      toast({
        title: "URL hiba",
        description: "Nem sikerült lekérni a feltöltött kép URL-jét.",
        variant: "destructive" as any,
      });
      setIsUploading(false);
      return;
    }

    toast({
      title: "Sikeres feltöltés",
      description: "A kép feltöltése sikerült.",
    });

    onUploaded(publicUrl);
    setIsUploading(false);
    // reset input so the same file can be reselected if needed
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
