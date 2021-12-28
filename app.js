import readline from "readline";
import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config();

const SPOTIFY_ENDPOINT = "https://api.spotify.com/v1/";
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID; // Your client id
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET; // Your secret
let ACCESS_TOKEN = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const getAccesToken = async () => {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64"),
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) {
    console.log("Unable to fetch spotify api !");
    process.exit();
  } else {
    const result = await response.json();
    ACCESS_TOKEN = result.access_token;
  }
};

const fetchTrack = async (query) => {
  const response = await fetch(SPOTIFY_ENDPOINT + `search?type=track&q=${query}&limit=1`, {
    headers: {
      Authorization: "Bearer " + ACCESS_TOKEN,
    },
  });

  if (response.status == 429) {
    console.log("The app has exceeded its rate limits.");
    process.exit();
  }
  if (response.status == 401) {
    await getAccesToken();
    return fetchTrack(query);
  }
  return response.json();
};

const main = async () => {
  if (!ACCESS_TOKEN) await getAccesToken();

  rl.write("Deezer Playlist ID ?\n");
  rl.prompt();
  rl.once("line", async (id) => {
    if (!id && isNaN(parseInt(id))) {
      console.log("Invalid ID !");
      return main();
    }
    let response = await fetch("https://api.deezer.com/playlist/" + id);
    if (!response.ok) {
      console.log("No playlist found !");
      return main();
    } else {
      rl.close();
      const playlist = await response.json();
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
      console.log(uris);
    }
  });
};

main();
