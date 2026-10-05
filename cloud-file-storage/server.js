const express = require("express");
const multer = require("multer");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const crypto = require("crypto");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// MULTER CONFIGURATION
// ===============================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

// ===============================
// SUPABASE CONNECTION
// ===============================

if (!process.env.SUPABASE_URL) {
  console.error("❌ SUPABASE_URL is missing in .env");
  process.exit(1);
}

if (!process.env.SUPABASE_SECRET_KEY) {
  console.error("❌ SUPABASE_SECRET_KEY is missing in .env");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const BUCKET_NAME = "files";

// ===============================
// HOME PAGE
// ===============================

app.get("/", (req, res) => {

  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );

});

// ===============================
// TEST SERVER
// ===============================

app.get("/api/test", (req, res) => {

  res.json({
    success: true,
    message: "Cloud File Storage server is working!"
  });

});

// ===============================
// UPLOAD FILE
// ===============================

app.post(
  "/api/upload",
  upload.single("file"),
  async (req, res) => {

    try {

      // Check file
      if (!req.file) {

        return res.status(400).json({
          success: false,
          message: "Please select a file."
        });

      }

      console.log(
        "Uploading:",
        req.file.originalname
      );

      // Get extension
      const fileExtension =
        path.extname(req.file.originalname);

      // Get filename without extension
      const baseName =
        path.basename(
          req.file.originalname,
          fileExtension
        );

      // Make filename safe
      const safeName =
        baseName.replace(
          /[^a-zA-Z0-9-_]/g,
          "_"
        );

      // Create unique filename
      const fileName =
        `${Date.now()}-${crypto
          .randomBytes(4)
          .toString("hex")}-${safeName}${fileExtension}`;

      // Upload to Supabase
      const { error } =
        await supabase.storage
          .from(BUCKET_NAME)
          .upload(
            fileName,
            req.file.buffer,
            {
              contentType:
                req.file.mimetype,

              upsert: false
            }
          );

      // Check upload error
      if (error) {

        console.error(
          "Supabase upload error:",
          error
        );

        return res.status(500).json({
          success: false,
          message: "File upload failed.",
          error: error.message
        });

      }

      // Get public URL
      const { data: publicUrlData } =
        supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(fileName);

      console.log(
        "Upload successful:",
        fileName
      );

      // Send response
      res.json({

        success: true,

        message:
          "File uploaded successfully!",

        file: {

          originalName:
            req.file.originalname,

          fileName:
            fileName,

          size:
            req.file.size,

          type:
            req.file.mimetype,

          url:
            publicUrlData.publicUrl

        }

      });

    } catch (error) {

      console.error(
        "Upload server error:",
        error
      );

      res.status(500).json({

        success: false,

        message:
          "Something went wrong.",

        error:
          error.message

      });

    }

  }
);

// ===============================
// LIST FILES
// ===============================

app.get("/api/files", async (req, res) => {

  try {

    const { data, error } =
      await supabase.storage
        .from(BUCKET_NAME)
        .list("", {

          limit: 100,

          offset: 0,

          sortBy: {

            column: "created_at",

            order: "desc"

          }

        });

    if (error) {

      console.error(
        "Supabase list error:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          error.message

      });

    }

    const files = data
      .filter(file => file.name)
      .map(file => {

        const { data: urlData } =
          supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(
              file.name
            );

        return {

          name:
            file.name,

          size:
            file.metadata?.size || 0,

          type:
            file.metadata?.mimetype ||
            "Unknown",

          createdAt:
            file.created_at,

          url:
            urlData.publicUrl

        };

      });

    res.json({

      success: true,

      files: files

    });

  } catch (error) {

    console.error(
      "List server error:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        error.message

    });

  }

});

// ===============================
// DELETE FILE
// ===============================

app.delete("/api/files", async (req, res) => {

  try {

    const fileName =
      req.query.fileName;

    // Check filename
    if (!fileName) {

      return res.status(400).json({

        success: false,

        message:
          "File name is required."

      });

    }

    console.log(
      "Deleting file:",
      fileName
    );

    // Delete from Supabase
    const { data, error } =
      await supabase.storage
        .from(BUCKET_NAME)
        .remove([
          fileName
        ]);

    if (error) {

      console.error(
        "Supabase delete error:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          error.message

      });

    }

    console.log(
      "Delete result:",
      data
    );

    res.json({

      success: true,

      message:
        "File deleted successfully!"

    });

  } catch (error) {

    console.error(
      "Delete server error:",
      error
    );

    res.status(500).json({

      success: false,

      message:
        error.message

    });

  }

});

// ===============================
// ERROR HANDLER
// ===============================

app.use((error, req, res, next) => {

  console.error(
    "General error:",
    error
  );

  if (
    error instanceof multer.MulterError
  ) {

    if (
      error.code ===
      "LIMIT_FILE_SIZE"
    ) {

      return res.status(400).json({

        success: false,

        message:
          "File is too large. Maximum size is 50 MB."

      });

    }

  }

  res.status(500).json({

    success: false,

    message:
      error.message ||
      "Something went wrong."

  });

});

// ===============================
// START SERVER
// ===============================

app.listen(
  PORT,
  () => {

    console.log(
      "----------------------------------------"
    );

    console.log(
      "☁️  Cloud File Storage Server"
    );

    console.log(
      "----------------------------------------"
    );

    console.log(
      `Server running at: http://localhost:${PORT}`
    );

    console.log(
      "Supabase bucket:",
      BUCKET_NAME
    );

    console.log(
      "----------------------------------------"
    );

  }
);