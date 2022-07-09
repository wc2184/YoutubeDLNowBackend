const express = require("express");
const fs = require("fs");
const ytdl = require("ytdl-core");
const downloadsFolder = require("downloads-folder");
var cors = require("cors");
const ytpl = require("ytpl");
var zipper = require("zip-local");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);

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
function youtube_parser(url) {
  var regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  var match = url.match(regExp);
  return match && match[7].length == 11 ? match[7] : false;
}

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
  let filenames = youtube_parser(videolink) + ".mp4";
  let file = fs.createWriteStream(filenames);
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
    // console.log(JSON.stringify(res.headers));
    // console.log(res, "response");
    console.log(res.getHeaders(), "response");
    res.download(filenames, `${title}.mp4`);
  });
  //   res.sendStatus(500);
});
// just make another api request with the playlist download, use react front end to parse the playlist
// put everything into a file, and zip/compress that file

app.get("/playlist/:type", (req, res) => {
  console.log(req.query.link);
  console.log(req.params.type);
  let type = req.params.type;
  // res.send(req.query.link);
  let playlist = req.query.link.split("list=")[1];
  console.log(playlist ? console.log("yes") : "undefinedddd daddy");
  if (!playlist) return res.end();
  console.log(playlist, "playlist");
  ytpl(playlist)
    .then(async (data) => {
      // console.log(res.items);
      await fs.mkdir(`${__dirname}/playlists/${playlist}`, (err) =>
        console.log(err)
      );

      console.log(data.items.length);
      let counter = 0;
      data.items.forEach((item) => {
        let file = fs.createWriteStream(
          `${__dirname}/playlists/${playlist}/${item.title}.mp4`
        );
        console.log(item.title);
        console.log(item.shortUrl);
        console.log("-------");
        let options = {};
        if (req.params.type == "audio") {
          options = { filter: "audioonly" };
          console.log("ran the audio!");
        }
        let yt = ytdl(item.shortUrl, options).on("error", (err) => {
          console.log(err, "caught da error");
          console.log("end it now");
          res.header("ok", "false");
          res.sendStatus(500);
          return;
          //
        });

        // .pipe(file); // if video then add this
        let start = Date.now();
        if (type == "audio") {
          console.log("yes its audio", __dirname);
          ffmpeg(yt)
            .audioBitrate(128)
            .save(`${__dirname}/playlists/${playlist}/${item.title}.mp3`)
            .on("progress", (p) => {
              // readline.cursorTo(process.stdout, 0);
              process.stdout.write(`${p.targetSize}kb downloaded`);
            })
            .on("end", () => {
              console.log(`\ndone, thanks - ${(Date.now() - start) / 1000}s`);
              fs.unlinkSync(
                `${__dirname}/playlists/${playlist}/${item.title}.mp4`
              );
              console.log("converted to mp3");
              counter++;
              console.log(counter);
            });
        } else {
          yt.pipe(file);
        }
        file.on("finish", () => {
          // res.set("Access-Control-Expose-Headers", "Content-Disposition");
          // res.set("Content-Disposition", `attachment;  ${item.title}.mp4`);

          // console.log(JSON.stringify(res.headers));
          // console.log(res, "response");
          // console.log(res.getHeaders(), "response");
          console.log("staying in mp4");
          counter++;
          console.log(counter);
          // if (type == "audio") {
          //   console.log(
          //     "yes its an audio now convertin, path is " +
          //       `${__dirname}/playlists/${playlist}/${item.title}.mp4`
          //   );
          //   ffmpeg(`${__dirname}/playlists/${playlist}/${item.title}.mp4`)
          //     .format("mp3")
          //     .audioBitrate(128)
          //     .on("end", () => {
          //       console.log("converted to mp3");
          //       counter++;
          //       console.log(counter);
          //     })
          //     .on("err", (err) => {
          //       console.log(err, "error conversion");
          //     });
          // }
          // res.download(`./playlists/${playlist}/${item.title}.mp4`, (err) =>
          //   console.log(err)
          // );
        });
      });
      const clear = setInterval(async () => {
        console.log(counter, "from interval");
        if (counter == data.items.length) {
          clearInterval(clear);
          console.log("done");
          zipper.sync
            .zip(`${__dirname}/playlists/${playlist}`)
            .save(`${__dirname}/playlists/${playlist}.zip`);
          setTimeout(() => {
            res.download(
              `${__dirname}/playlists/${playlist}.zip`,
              "youtubefolder.zip",
              function (err) {
                if (err) {
                  console.log("error here boys");
                  res.end();
                }
                // fs.unlink(`./playlists/${playlist}.zip`);
                console.log("done downloadin local");
                return;
              }
            );
          }, 2000);

          // zipper.zip(`./playlists/${playlist}`, function (error, zipped) {
          //   if (!error) {
          //     // zipped.compress(); // compress before exporting

          //     // var buff = zipped.memory(); // get the zipped file as a Buffer

          //     // or save the zipped file to disk
          //     zipped.save(`./playlists/${playlist}.zip`, function (error) {
          //       if (!error) {
          //         console.log("saved successfully !");
          //         res.download(
          //           `./playlists/${playlist}.zip`,
          //           "youtubefolder.zip"
          //         );
          //       }
          //     });
          //   }
          // });

          // res.send("Done Downloading! Yay!");
          // `./playlists/${playlist}`
          // res.download(`./playlists/hamil`, "videofolder.mp4");
        }
      }, 1000);
    })
    .catch((err) => console.log(err, "err playlist"));
});

app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});
