DZ.init({
  appId: "YOUR_APP_ID",
  channelUrl: "https://www.deezer.com/fr/profile/1092973762",
});

DZ.ready(function (sdk_options) {
  console.log("DZ SDK is ready", sdk_options);
});
