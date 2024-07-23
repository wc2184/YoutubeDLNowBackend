const express = require("express");
const fs = require("fs");
const os = require("os");
// const ytdl = require("ytdl-core"); // ytdl-core is broken as of July 22, 2024.
const ytdl = require("@distube/ytdl-core");
var cors = require("cors");
var zipper = require("zip-local");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
var contentDisposition = require("content-disposition");
// const exec = require("child_process");

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
let PORT = process.env.PORT || 5001;

function youtube_parser(url) {
  var regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  var match = url.match(regExp);
  return match && match[7].length == 11 ? match[7] : false;
}
app.get("/", (req, res) => {
  res.send(
    "You're using YoutubeDLNow's backend made by William Chan located at https://github.com/wc2184/YoutubeDLNowBackend"
  );
});

app.get("/download/:type", (req, res) => {
  console.log("Download has begun.");
  console.log(req.params.type, "is the type.");
  let type = req.params.type;
  let title;
  let videolink = req.query.link;
  if (!/(youtube.com|youtu.be)\/(watch)?(\?v=)?(\S+)?/.test(videolink)) {
    console.log("Not a valid Youtube Link");
    res.send(500).send({ ok: false });
    return;
  }

  console.log(videolink, "<< Youtube Link");
  let filenames = youtube_parser(videolink) + ".mp4";
  let file = fs.createWriteStream(filenames);
  file.on("error", function (err) {
    console.log(err);
    file.end();
    console.log("Stopping your thing");
    res.send(500).send({ ok: false });
    return;
  });

  let options = { filter: "audioandvideo", quality: "highest" };

  ytdl(videolink, options)
    .on("error", (err) => {
      console.log(err, "This is the error.");
      console.log("Ending script.");
      res.header("ok", "false");
      res.sendStatus(500);
      return;
    })
    .pipe(file);
  ytdl
    .getInfo(videolink)
    .then((data) => {
      console.log(data.videoDetails.title);
      title = data.videoDetails.title;
    })
    .catch((err) => console.log(err, "in the get info error"));

  file.on("finish", () => {
    let start = Date.now();
    if (type == "audio") {
      title.replace(" ", "_");
      res.attachment(`${title}.mp3`);
      res.set("Access-Control-Expose-Headers", "Content-Disposition");
      res.set("Content-Disposition", contentDisposition(`${title}.mp3`));

      console.log(__dirname);
      console.log(os.platform(), "is the platform");
      fs.readdirSync(__dirname).forEach((file) => {
        console.log(file, "is a file--");
      });

      ffmpeg(filenames)
        .output(`${__dirname}/${youtube_parser(videolink)}.mp3`) // CRUX, DIRNAME IS IMPORTANT
        .on("end", () => {
          res.download(
            `${youtube_parser(videolink)}.mp3`,
            `${title}.mp3`,
            function (err) {
              if (err) {
                console.log("Error in after res.download: ", err);
                console.log("Error done. ----");
              }
              fs.readdirSync(__dirname).forEach((file) => {
                console.log(file, "POST DL is a file--");
              });
              fs.unlink(`${youtube_parser(videolink)}.mp3`, function () {
                console.log(
                  `${
                    youtube_parser(videolink) + ".mp3"
                  } has been deleted successfully.`
                );
              });
              fs.unlink(filenames, function () {
                console.log(`${filenames} has been deleted successfully.`);
              });
            }
          );
        })
        .on("error", (err) => {
          console.log(err, "This is ffmpeg error.");
        })
        .run();
    } else {
      console.log(filenames, "Filenames <-");
      title.replace(" ", "_");
      res.attachment(`${title}.mp4`);
      res.set("Access-Control-Expose-Headers", "Content-Disposition");

      res.set("Content-Disposition", contentDisposition(`${title}.mp4`));

      res.download(filenames, `${title}.mp4`, function (err) {
        if (err) {
          console.log("Error in after res.download: ", err);
          console.log("Error done. ----");
        }

        fs.unlink(filenames, function () {
          console.log(`${filenames} has been deleted successfully.`);
        });
      });
    }
  });
});

app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});
