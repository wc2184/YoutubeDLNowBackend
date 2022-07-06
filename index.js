const express = require("express");
const fs = require("fs");
const ytdl = require("ytdl-core");
const downloadsFolder = require("downloads-folder");
var cors = require("cors");
const app = express();

app.on("uncaughtException", function (req, res, route, err) {
  log.info(
    "******* Begin Error *******\n%s\n*******\n%s\n******* End Error *******",
    route,
    err.stack
  );
  if (!res.headersSent) {
    return res.send(500, { ok: false });
  }
  res.write("\n");
  res.end();
});

app.use(cors({ credentials: true, origin: true }));
let PORT = process.env.PORT || 5000;

// TypeScript: import ytdl from 'ytdl-core'; with --esModuleInterop
// TypeScript: import * as ytdl from 'ytdl-core'; with --allowSyntheticDefaultImports
// TypeScript: import ytdl = require('ytdl-core'); with neither of the above

// ytdl("http://www.youtube.com/watch?v=aqz-KE-bpKQ").pipe(
//   fs.createWriteStream("video.mp4")
// );
// app.get("/", (req, res) => {
//   const user = req.query.user;
//   res.send(user + "is what you typed");
// });

app.get("/download", (req, res) => {
  console.log("download ran");
  let title;
  let videolink = req.query.link;
  if (!/(youtube.com|youtu.be)\/(watch)?(\?v=)?(\S+)?/.test(videolink)) {
    console.log("Not a valid Youtube Link");
    res.send(500).send({ ok: false });
    return;
  }

  console.log(videolink, "this is the link");

  let file = fs.createWriteStream("thevideo.mp4");
  file.on("error", function (err) {
    console.log(err);
    file.end();
    console.log("Stopping your thing");
    res.send(500).send({ ok: false });
    return;
  });
  //s
  ytdl(videolink)
    .on("error", (err) => {
      console.log(err, "caught da error");
      console.log("end it now");
      res.header("ok", "false");
      res.send(500);
      return;
    })
    .pipe(file);
  ytdl.getInfo(videolink).then((data) => {
    console.log(data.videoDetails.title);
    title = data.videoDetails.title;
  });
  //   http://localhost:5000/download?link=https://www.youtube.com/watch?v=AuO0Y8Iwq0E

  //   console.log(downloadsFolder());
  //   location = downloadsFolder();
  file.on("finish", () => {
    // fs.writeFile(location, file, function callback(err) {
    //   if (err) throw err;
    //   console.log(downloaded);
    // });
    // res.send("Downloaded!");
    title.replace(" ", "_");
    res.attachment(`${title}.mp4`);
    res.set("Access-Control-Expose-Headers", "Content-Disposition");
    res.set("Content-Disposition", `attachment;  ${title}.mp4`);
    console.log(JSON.stringify(res.headers));
    console.log(res, "response");
    console.log(res.getHeaders(), "response");
    res.download("thevideo.mp4", `${title}.mp4`);
  });
});

app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});
