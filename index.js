import express from "express";
import bodyParser from "body-parser";
import ytdl from "@distube/ytdl-core";
import { createWriteStream, existsSync, unlinkSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
// import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";

// Disable YTDL updates
process.env.YTDL_NO_UPDATE = "1";

// Set up Express
const app = express();
const port = process.env.PORT || 3000;

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); // Serve static files

// Path for the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Render form for user input (audio.html)
app.get("/", (req, res) => {
  res.render("index.ejs", {}); // or render your HTML file if not using ejs
});

// Function to fetch video info with retry logic
async function fetchVideoInfoWithRetry(videoUrl, retries = 3, delay = 3000) {
  try {
    return await ytdl.getInfo(videoUrl);
  } catch (error) {
    if (error.statusCode === 429 && retries > 0) {
      console.log(`Rate limited. Retrying in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay)); // Wait before retrying
      return fetchVideoInfoWithRetry(videoUrl, retries - 1, delay * 2); // Exponential backoff
    }
    throw error; // If retries are exhausted or another error, throw it
  }
}

// Handle form submission to download audio
app.post("/download", async (req, res) => {
  const videoUrl = req.body.url;
  const tempFilePath = path.join(__dirname, "temp", "audio.mp3");

  try {
    // Fetch video information with retry logic
    const info = await fetchVideoInfoWithRetry(videoUrl);
    const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, ""); // Clean up title for file name
    const finalOutput = `${videoTitle}.mp3`; // Save audio with video title

    // Download audio
    const audio = ytdl(videoUrl, {
      quality: "highestaudio",
      filter: (format) => format.container === "mp4",
    });

    const audioStream = createWriteStream(tempFilePath);

    // Progress tracking for audio
    audio.on("progress", (chunkLength, downloaded, total) => {
      const progress = (downloaded / total) * 100;
      io.emit("audioProgress", progress.toFixed(2)); // Emit progress event to client
    });

    // Pipe audio stream to file
    audio.pipe(audioStream);

    audioStream.on("finish", () => {
      res.download(tempFilePath, finalOutput, (err) => {
        if (err) {
          console.error("Error downloading file:", err);
        }

        // Cleanup: delete temporary files after download
        if (existsSync(tempFilePath)) unlinkSync(tempFilePath);
      });
    });
  } catch (error) {
    console.error("Error fetching video info:", error);
    res.redirect("/");
  }
});

// Start the server
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
