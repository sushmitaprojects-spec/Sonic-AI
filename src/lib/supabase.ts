import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. Auth features will not work.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);

// Helper to upload media (Blob/URL) to Supabase Storage
export async function uploadMedia(fileUrl: string, folder: 'images' | 'videos') {
    try {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const fileName = `${crypto.randomUUID()}.${folder === 'images' ? 'png' : 'mp4'}`;
        const filePath = `${folder}/${fileName}`;

        const { data, error } = await supabase.storage
            .from('media')
            .upload(filePath, blob);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (err) {
        console.error('Error uploading media:', err);
        return fileUrl; // Return original if upload fails
    }
}
