'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Get current user profile
export async function getProfile() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    return { error: error.message }
  }

  return { data: { ...data, email: user.email } }
}

// Update profile
export async function updateProfile(input: {
  full_name?: string
  avatar_url?: string
}) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(input)
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/profile')

  return { data }
}

// Update email
export async function updateEmail(newEmail: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.updateUser({
    email: newEmail,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: 'Confirmation email sent to new address' }
}

// Upload avatar to Supabase Storage and update profile
export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  const file = formData.get('avatar') as File
  if (!file || file.size === 0) {
    return { error: 'No file provided' }
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Invalid file type. Use JPG, PNG, WebP, or GIF.' }
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return { error: 'File too large. Maximum size is 2MB.' }
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filePath = `${user.id}/avatar.${fileExt}`

  // Upload to Supabase Storage (upsert to replace existing)
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    return { error: uploadError.message }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath)

  // Update profile with new avatar URL (add cache-bust)
  const avatarUrl = `${publicUrl}?t=${Date.now()}`
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/profile')
  return { data: { avatar_url: avatarUrl } }
}

// Remove avatar
export async function removeAvatar() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  // List and remove all files in user's avatar folder
  const { data: files } = await supabase.storage
    .from('avatars')
    .list(user.id)

  if (files && files.length > 0) {
    const filePaths = files.map(f => `${user.id}/${f.name}`)
    await supabase.storage.from('avatars').remove(filePaths)
  }

  // Clear avatar_url in profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/profile')
  return { data: { avatar_url: null } }
}

// Update password
export async function updatePassword(newPassword: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
