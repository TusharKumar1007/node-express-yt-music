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

// Render the correct form for user input (audio.html)
// app.get("/", (req, res) => {
//     res.sendFile(path.join(__dirname, "public", "audio.html"));
//   });

// app.use(
//   helmet.contentSecurityPolicy({
//     directives: {
//       defaultSrc: ["'self'"],
//       scriptSrc: ["'self'", "'unsafe-inline'", "https://vercel.live"],
//       styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
//       frameSrc: ["https://vercel.live"],
//       imgSrc: ["'self'", "data:", "https:"],
//       connectSrc: ["'self'"],
//     },
//   })
// );

app.get("/", (req, res) => {
  res.render("index.ejs", {});
});

// Handle form submission to download audio
app.post("/download", async (req, res) => {
  const videoUrl = req.body.url;

  try {
    // Fetch video information
    const info = await ytdl.getInfo(videoUrl);
    const videoTitle = info.videoDetails.title;
    const finalOutput = `${videoTitle}.mp3`;

    // Set headers for file download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${finalOutput}"`
    );
    res.setHeader("Content-Type", "audio/mpeg");

    // Stream audio directly to the response
    const audioStream = ytdl(videoUrl, {
      quality: "highestaudio",
      filter: (format) => format.container === "mp4",
    });

    audioStream.pipe(res);

    // Emit progress event
    audioStream.on("progress", (chunkLength, downloaded, total) => {
      const progress = (downloaded / total) * 100;
      io.emit("audioProgress", progress.toFixed(2));
    });

    audioStream.on("end", () => {
      console.log("Audio download completed");
    });
  } catch (error) {
    console.error("Error during audio download:", error);
    // res.status(500).send("Error downloading the audio");
    res.redirect("/")
  }
});

// Start the server
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
