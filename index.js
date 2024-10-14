import express from "express";
import bodyParser from "body-parser";
import ytdl from "@distube/ytdl-core";
import { createWriteStream, existsSync, unlinkSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import http from "http";
import { Server } from "socket.io";
import helmet from "helmet";

// Set up Express
const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new Server(server);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); // Ensure the views folder is set

// Set security-related HTTP headers
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "https://vercel.live"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    frameSrc: ["https://vercel.live"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
  },
}));


// Render the correct form for user input (index.ejs)
app.get("/", (req, res) => {
  res.render("index", {});
});

// Handle form submission to download audio
app.post("/download", async (req, res) => {
  const videoUrl = req.body.url;
  const audioOutput = "audio.mp3";

  try {
    // Fetch video information to get the title
    const info = await ytdl.getInfo(videoUrl);
    const videoTitle = info.videoDetails.title; // Get the video title
    const finalOutput = `${videoTitle}.mp3`; // Save audio with video title

    // Download audio
    const audio = ytdl(videoUrl, {
      quality: "highestaudio",
      filter: (format) => format.container === "mp4",
    });

    const audioStream = createWriteStream(audioOutput);

    // Progress tracking for audio
    audio.on("progress", (chunkLength, downloaded, total) => {
      const progress = (downloaded / total) * 100;
      io.emit("audioProgress", progress.toFixed(2)); // Emit progress event to client
    });

    // Pipe audio stream to file
    audio.pipe(audioStream);

    audioStream.on("finish", () => {
      // Send the final audio file to the user
      res.download(audioOutput, finalOutput, (err) => {
        if (err) {
          console.error("Error downloading file:", err);
        }

        // Cleanup: delete temporary files
        if (existsSync(audioOutput)) unlinkSync(audioOutput);
      });
    });
  } catch (error) {
    console.error("Error fetching video info:", error);
    res.status(500).send("Error fetching video information");
  }
});

// Clean up temporary files on exit
process.on("exit", () => {
  if (existsSync(audioOutput)) unlinkSync(audioOutput);
});

// Start the server
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
