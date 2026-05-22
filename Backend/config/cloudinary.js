// utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// export const storage = new CloudinaryStorage({
//   cloudinary,
//    params: async (req, file) => {
//     let resource_type = "image";
//     if (file.mimetype === "application/pdf") {
//       resource_type = "raw";
//     }
//     return {
//       folder: "mess_bills",
//       allowed_formats: ["pdf", "png", "jpg", "jpeg"],
//       resource_type
//     };
//   }
// });

export const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isAttendanceVideo = file.fieldname === "attendanceVideo";
    if (isAttendanceVideo) {
      return {
        folder: "attendance_proofs",
        resource_type: "video",
        allowed_formats: ["mp4", "mov", "webm", "m4v"],
      };
    }
    const isReferenceFaceImage = file.fieldname === "referenceFaceImage";
    if (isReferenceFaceImage) {
      return {
        folder: "resident_reference_faces",
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      };
    }

    if (file.mimetype === "application/pdf") {
      return {
        folder: "mess_bills",
        resource_type: "raw",
        format: "pdf",
        public_id: file.originalname
          .replace(/\s+/g, "_")     // spaces → underscores
          .replace(/\.[^/.]+$/, "") // remove extension
          .replace(/\./g, "_")      // extra dots → underscores

      };
    }
    return {
      folder: "mess_bills",
      resource_type: "image",
      allowed_formats: ["jpg", "jpeg", "png"],
    };
  },
});
