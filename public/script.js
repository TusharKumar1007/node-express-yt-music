// document.addEventListener("DOMContentLoaded", () => {
//   const socket = io();
//   const progressBarContainer = document.getElementById("progress-bar");
//   const progressBar = document.getElementById("progress");
//   const downloadForm = document.getElementById("download-form");

//   // Listen for progress updates from the server
//   socket.on("audioProgress", (progress) => {
//     progressBar.style.width = `${progress}%`;
//     progressBar.textContent = `${progress}%`;
//   });

//   // Show progress bar and reset it on form submission
//   downloadForm.addEventListener("submit", () => {
//     progressBarContainer.style.display = "block"; // Show the progress bar
//     progressBar.style.width = "0%";
//     progressBar.textContent = "0%";
//   });
// });
