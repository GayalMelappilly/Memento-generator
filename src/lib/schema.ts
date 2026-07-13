import { z } from "zod";

export const StudentSchema = z.object({
  name: z.string().optional(),
  photo: z.string().optional(),
  "Name of student": z.string().optional(),
  "image": z.string().optional(),
  "Upload Student Image": z.string().optional(),
}).transform((data) => {
  let photoUrl = data.photo || data.image || data["Upload Student Image"] || "";
  
  if (photoUrl.includes("drive.google.com")) {
    const idMatch = photoUrl.match(/[?&]id=([^&]+)/) || photoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      photoUrl = `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
    }
  }

  const extractedName = data.name || data["Name of student"] || "";

  return {
    name: extractedName.toUpperCase(),
    photo: photoUrl
  };
}).refine(data => data.name.length > 0 && data.photo.length > 0, {
  message: "Each record must have a name (or 'Name of student') and a photo (or 'image' or 'Upload Student Image')"
});

export const DatasetSchema = z.array(StudentSchema).min(1, "Dataset must contain at least one student");
