"use client"

import { useState, useRef, useCallback } from "react"
import { Camera, Trash2, Loader2 } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { uploadAvatar, removeAvatar } from "@/lib/actions/profile"
import { toast } from "sonner"

interface ProfilePhotoUploadProps {
  avatarUrl?: string | null
  initials: string
  onAvatarChange?: (newUrl: string | null) => void
}

export function ProfilePhotoUpload({
  avatarUrl,
  initials,
  onAvatarChange,
}: ProfilePhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Validate on client side
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Use JPG, PNG, WebP, or GIF.")
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 2MB.")
        return
      }

      // Show preview
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result as string)
      reader.readAsDataURL(file)

      // Upload
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append("avatar", file)
        const result = await uploadAvatar(formData)

        if (result.error) {
          toast.error(result.error)
          setPreview(null)
        } else {
          toast.success("Profile photo updated!")
          onAvatarChange?.(result.data?.avatar_url ?? null)
        }
      } catch {
        toast.error("Failed to upload photo")
        setPreview(null)
      } finally {
        setUploading(false)
        setShowDialog(false)
        // Reset input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    },
    [onAvatarChange]
  )

  const handleRemove = useCallback(async () => {
    setRemoving(true)
    try {
      const result = await removeAvatar()
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Profile photo removed")
        setPreview(null)
        onAvatarChange?.(null)
      }
    } catch {
      toast.error("Failed to remove photo")
    } finally {
      setRemoving(false)
      setShowDialog(false)
    }
  }, [onAvatarChange])

  const displayUrl = preview || avatarUrl

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileSelect}
      />

      <button
        type="button"
        onClick={() => setShowDialog(true)}
        className="relative group cursor-pointer"
        disabled={uploading}
      >
        <Avatar className="w-20 h-20 border-4 border-[hsl(222,47%,8%)] shadow-xl transition-transform group-hover:scale-105">
          {displayUrl ? (
            <AvatarImage src={displayUrl} alt="Profile photo" />
          ) : null}
          <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Overlay */}
        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {uploading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </div>
      </button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-sm bg-[hsl(222,47%,8%)] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-foreground">Profile Photo</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Upload a new photo or remove the current one.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center py-4">
            <Avatar className="w-28 h-28 border-4 border-white/10">
              {displayUrl ? (
                <AvatarImage src={displayUrl} alt="Profile photo" />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || removing}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Upload New Photo
                </>
              )}
            </Button>

            {avatarUrl && (
              <Button
                variant="outline"
                onClick={handleRemove}
                disabled={uploading || removing}
                className="w-full bg-white/[0.04] border-white/[0.10] hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400"
              >
                {removing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Removing…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove Photo
                  </>
                )}
              </Button>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground text-center mt-1">
            JPG, PNG, WebP, or GIF · Max 2 MB
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
