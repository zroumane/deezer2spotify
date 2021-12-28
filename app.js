import readline from "readline";
import dotenv from "dotenv";
import fetch from "node-fetch";
import express from "express";
import { stringify } from "querystring";
dotenv.config();

const SP_API = "https://api.spotify.com/v1/";
const SP_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SP_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
let access_token = null;

const app = express();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const getUserId = async () => {
  let result = await fetch(SP_API + "me", { headers: { Authorization: "Bearer " + access_token } });
  const profile = await result.json();
  return profile.id;
};

const fetchTrack = async (query) => {
  const response = await fetch(SP_API + `search?type=track&q=${query}&limit=1`, {
    headers: {
      Authorization: "Bearer " + access_token,
    },
  });
  if (response.status == 429) {
    console.log("The app has exceeded its rate limits.");
    process.exit();
  }
  if (response.status == 401) {
    console.log("Invalid access token.");
    process.exit();
  }
  return await response.json();
};

const postTrack = async (id, uris) => {
  if (uris.length == 0) return "Playlist created";
  const next = uris.splice(100);
  await fetch(SP_API + `playlists/${id}/tracks`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + access_token,
      Accept: "application/json",
    },
    body: JSON.stringify({
      uris: uris,
    }),
  });
  return await postTrack(id, next);
};

app.get("/callback/", async (req, res) => {
  const code = req.query.code;

  if (code) {
    res.send("Succesfuly login !");
  } else {
    res.send("An error occurred !");
    return;
  }

  let result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(SP_CLIENT_ID + ":" + SP_CLIENT_SECRET).toString("base64"),
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: stringify({
      code: code,
      grant_type: "authorization_code",
      redirect_uri: "http://localhost:8888/callback/",
    }),
  });

  result = await result.json();
  access_token = result.access_token;
  let user_id = await getUserId();

  rl.write("Deezer Playlist ID ?\n");
  rl.prompt();

  rl.once("line", async (id) => {
    if (!id && isNaN(parseInt(id))) {
      console.log("Invalid ID !");
      process.exit();
    }

    result = await fetch("https://api.deezer.com/playlist/" + id);
    let playlist = await result.json();

    if (playlist.error) {
      console.log("No playlist found !");
      process.exit();
    }
    rl.close();
    console.log(`"${playlist.title}" by ${playlist.creator.name} with ${playlist.nb_tracks} track(s).`);

    let uris = [];
    for (const track of playlist.tracks.data) {
      const reponse = await fetchTrack(`${track.title} ${track.artist.name}`);
      const item = reponse.tracks.items[0];
      if (item) {
        console.log(`Fetched "${item.name}" by ${item.artists.map((a) => a.name).join(", ")}`);
        uris.push(item.uri);
      }
    }

    result = await fetch(SP_API + `users/${user_id}/playlists`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + access_token,
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: `${playlist.title} by ${playlist.creator.name}`,
        description: "Playlist from deezer2spotify",
        public: false,
      }),
    });

    playlist = await result.json();
    result = await postTrack(playlist.id, uris);
    console.log(result);
    process.exit();
  });
});

console.log(
  "You need first to login with spotify here :\n" +
    "https://accounts.spotify.com/authorize?" +
    stringify({
      response_type: "code",
      scope: "playlist-modify-private",
      client_id: SP_CLIENT_ID,
      redirect_uri: "http://localhost:8888/callback/",
    })
);

app.listen(8888);
