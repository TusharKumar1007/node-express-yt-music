import express from "express";
import bodyParser from "body-parser";
import ytdl from "@distube/ytdl-core";
import { createWriteStream, existsSync, unlinkSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";

// Set up Express
const app = express();
const port = 3000;

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); // Serve static files

// Path for the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Render the correct form for user input (audio.html)
// app.get("/", (req, res) => {
//     res.sendFile(path.join(__dirname, "public", "audio.html"));
//   });

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://vercel.live"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      frameSrc: ["https://vercel.live"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  })
);

app.get("/", (req, res) => {
  res.render("index.ejs", {});
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
      // console.log(`Audio Download Progress: ${progress.toFixed(2)}%`);
      io.emit("audioProgress", progress.toFixed(2)); // Emit progress event to client
    });

    // Pipe audio stream to file
    audio.pipe(audioStream);

    audioStream.on("finish", () => {
      // console.log("Audio downloaded");

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

// Start the server
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
