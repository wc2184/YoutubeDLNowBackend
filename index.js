const express = require("express");
const app = express();
const fs = require("fs");
const ytdl = require("ytdl-core");
const downloadsFolder = require("downloads-folder");

// TypeScript: import ytdl from 'ytdl-core'; with --esModuleInterop
// TypeScript: import * as ytdl from 'ytdl-core'; with --allowSyntheticDefaultImports
// TypeScript: import ytdl = require('ytdl-core'); with neither of the above

ytdl("http://www.youtube.com/watch?v=aqz-KE-bpKQ").pipe(
  fs.createWriteStream("video.mp4")
);
// app.get("/", (req, res) => {
//   const user = req.query.user;
//   res.send(user + "is what you typed");
// });

app.get("/download", (req, res) => {
  console.log("download ran");
  let title;
  let videolink = req.query.link;
  console.log(videolink);
  let file = fs.createWriteStream("thevideo.mp4");
  ytdl(videolink).pipe(file);
  ytdl.getInfo(videolink).then((data) => {
    console.log(data.videoDetails.title);
    title = data.videoDetails.title;
  });
  //   http://localhost:5000/download?link=https://www.youtube.com/watch?v=AuO0Y8Iwq0E

  console.log(downloadsFolder());
  location = downloadsFolder();
  file.on("finish", () => {
    // fs.writeFile(location, file, function callback(err) {
    //   if (err) throw err;
    //   console.log(downloaded);
    // });
    // res.send("Downloaded!");
    title.replace(" ", "_");
    res.download("thevideo.mp4", `${title}.mp4`);
  });
});

app.listen(5000, () => {
  console.log("server started on port 5000");
});
