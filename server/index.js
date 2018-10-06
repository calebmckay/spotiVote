var express = require('express');
var app = express();
var SpotifyWebApi = require('spotify-web-api-node');
var path=require("path");
var bodyParser = require('body-parser');
const ROOT_DIR="../front/";

var nextSongs=[];
var previousIDs=[];
var votes=[];
var current={"artist":"null","song":"null","imgSrc":"null","timeStarted":"null","length":"null"}

var spotifyApi = new SpotifyWebApi({
  clientId : 'FILL IN CLIENT ID',
  clientSecret : 'FILL IN CLIENT SECRET',
  redirectUri : 'https://example.com/callback'
});

code="GENERATED FROM FOLLOWING AUTH LINK";
spotifyApi.authorizationCodeGrant(code)
  .then(function(data) {
    console.log('The token expires in ' + data.body['expires_in']);
    console.log('The access token is ' + data.body['access_token']);
    console.log('The refresh token is ' + data.body['refresh_token']);
    // Set the access token on the API object to use it in later calls
    spotifyApi.setAccessToken(data.body['access_token']);
    spotifyApi.setRefreshToken(data.body['refresh_token']);
    start();
  }, function(err) {
    console.log('Some auth error', err);
  });

//songSelecitons '3xzgrZkVY9wA6xxcvtrp2H'
//songQueue '7BCwRo2wA3QaKbyuVjSeiK',

app.use(express.static(ROOT_DIR));

app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(bodyParser.json());

app.get('/getSongs',function(req,res){
  res.send(nextSongs);
});

app.get('/nowPlaying',function(req,res){
  res.send(current);
});

app.post('/vote',function(req,res){
  vote=req.body.song;
  for(i=0;i<votes.length;i++){
    if(nextSongs[i].track.id==vote){
      votes[i]+=1;
    }
  }
  res.send("Success");
});

app.use('/', function(req, res) {
  send(res, "index.html");
});

app.listen(80, function () {
    console.log('Example app listening on port %d!', 80);
});

function start(){
  spotifyApi.getPlaylist('criggs10', '7BCwRo2wA3QaKbyuVjSeiK')
    .then(function(data) {
      songs=data.body.tracks.items;
      for(i=0;i<songs.length;i++){
        previousIDs.push(songs[i].track.id);
      }
      findNextSongs();
      var songNumber=songs.length-1;
      var d = new Date();
      current.artist=songs[songNumber].track.artists[0].name;
      current.song=songs[songNumber].track.name;
      current.imgSrc=songs[songNumber].track.album.images[0].url;
      current.timeStarted=d.getTime();
      current.length=songs[songNumber].track.duration_ms;
      setTimeout(nextVote,songs[songNumber].track.duration_ms);
      setInterval(refreshToken,300000);
    }, function(err) {
      console.log('Something went wrong!', err);
  });
}

function findNextSongs(){
  spotifyApi.getPlaylist('criggs10', '3xzgrZkVY9wA6xxcvtrp2H')
    .then(function(data) {
      songs=data.body.tracks.items;
      nextSongs=[];
      votes=[];
      for(i=0;i<5;i++){
        number=Math.floor(Math.random() * songs.length);
        if(previousIDs.indexOf(songs[number].track.id)==-1){
          nextSongs.push(songs[number]);
          votes.push(0);
        }
        else{
          while(true){
            number=Math.floor(Math.random() * songs.length);
            if(previousIDs.indexOf(songs[number].track.id)==-1){
              nextSongs.push(songs[number]);
              votes.push(0);
              break;
            }
          }
        }
      }
    }, function(err) {
      console.log('Something went wrong!', err);
  });
}

function nextVote(){
  var i = votes.indexOf(Math.max.apply(null, votes));

  spotifyApi.addTracksToPlaylist('criggs10', '7BCwRo2wA3QaKbyuVjSeiK', ["spotify:track:"+nextSongs[i].track.id])
  .then(function(data) {
    console.log('Added tracks to playlist!');
  }, function(err) {
    console.log('Something went wrong adding a track', err);
  });

  spotifyApi.getPlaylist('criggs10', '7BCwRo2wA3QaKbyuVjSeiK')
  .then(function(data) {
    spotifyApi.removeTracksFromPlaylistByPosition('criggs10', '7BCwRo2wA3QaKbyuVjSeiK', [0],data.body.snapshot_id)
    .then(function(data) {
      console.log('Removed track from playlist!');
    }, function(err) {
      console.log('Something went wrong removing a track', err);
    });
  }, function(err) {
    console.log('Something went wrong!', err);
  });


  previousIDs.pop(0);
  var d = new Date();
  previousIDs.push(nextSongs[i].track.id);
  current.artist=nextSongs[i].track.artists[0].name;
  current.song=nextSongs[i].track.name;
  current.imgSrc=nextSongs[i].track.album.images[0].url;
  current.timeStarted=d.getTime();
  current.length=nextSongs[i].track.duration_ms;
  setTimeout(nextVote,nextSongs[i].track.duration_ms);
  findNextSongs();
}

function refreshToken(){
  spotifyApi.refreshAccessToken()
  .then(function(data) {
    console.log('The access token has been refreshed!');

    // Save the access token so that it's used in future calls
    spotifyApi.setAccessToken(data.body['access_token']);
  }, function(err) {
    console.log('Could not refresh access token', err);
  });
}

function send(request, file) {
    request.sendFile(path.join(__dirname, ROOT_DIR, file));
}
