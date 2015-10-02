LeaderBoards = new Mongo.Collection("leaderboards");
LapTimes = new Mongo.Collection("lap_times");

if (Meteor.isClient) {
  Template.body.helpers({
    leaderboard: function() {
      return getLeaderboard();
    },

    leaderboards: function() {
      return LeaderBoards.find({}, {sort: {created_dtm : -1}});
    },

    lapTimes: function () {
      var leaderboard = Session.get("leaderboard");
      var drivers = [];
      var result = [];

      var cursor = LapTimes.find({leaderboard_id: leaderboard}, {sort: {time: 1}});
      cursor.forEach(function(i) {
        if (drivers.indexOf(i.owner) == -1) {
          result.push(
              {
                "driver": i.driver,
                "time": msToTime(i.time)
              });
          drivers.push(i.owner);
        }
      });

      return result;
    },

    isViewOnly: function () {
      var params = location.search.split('?')[1];
      if (params) {
        return (params.split('=').indexOf('viewOnly') !== -1);
      }
    }
  });

  Template.body.events({
    "submit .new-time": function (event) {
      event.preventDefault();

      var leaderboard = Session.get("leaderboard");
      var time = event.target.time.value;
      if (/^[0-9]?[0-9]:[0-5][0-9]\.[0-9]$/.test(time)) {
        var timeMs = timeToMs(time);

        notifyHipChat(leaderboard, time, timeMs);

        LapTimes.insert({
          leaderboard_id: leaderboard,
          owner: Meteor.userId(),
          driver: Meteor.user().username,
          time: Number(timeMs),
          created_dtm: new Date()
        });
        event.target.time.value = "";

        // auto logout - if ever wanted
        // localStorage.removeItem('Meteor.loginToken');

      } else {
        alert ('Nice try. Lap times must be formatted as follows: 00:00.0');
      }
    },
    "click .leaderboard": function (event) {
      event.preventDefault();
      Session.set("leaderboard", Number(event.target.id));
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

  function getLeaderboard() {
    if (Session.get("leaderboard")) {
      return LeaderBoards.findOne({_id: Session.get("leaderboard")});
    } else {
      var latest = LeaderBoards.findOne({}, {sort: {created_dtm: -1}});
      Session.set("leaderboard", latest._id);
      return latest;
    }
  }

  function timeToMs(time) {
    var minutes = Number(time.split(':')[0]);
    var seconds = Number(time.split(':')[1].split('.')[0]);
    var ms = Number(time.split('.')[1]);

    return (minutes * 60 * 1000) + (seconds * 1000) + (ms * 100);
  }

  function msToTime(ms) {
    var milliseconds = parseInt((ms % 1000) / 100);
    var seconds = parseInt((ms / 1000) % 60);
    var minutes = parseInt((ms / (1000 * 60)) % 60);

    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return minutes + ":" + seconds + "." + milliseconds;
  }

  function notifyHipChat(leaderboard, time, timeMs) {
    var driver = Meteor.user().username;
    var personalBest = LapTimes.findOne({driver: driver, leaderboard_id: leaderboard}, {sort: {time: 1}});
    var personalBestMs = personalBest ? personalBest.time : 9999999;
    var faster = timeMs < personalBestMs;
    var diff = Math.abs((timeMs - personalBestMs) / 1000);
    var close = diff * 1000 / personalBestMs <= .01;

    var color = faster ? "green" : close ? "yellow" : "red";
    var message1 = driver + " has completed a lap in " + time + ".";
    var message2 = faster ? " Nice work! That's a " + diff + " second improvement!" : close ? " Not too shabby." : " Better luck next time.";

    var overallBest = LapTimes.findOne({leaderboard_id: leaderboard}, {sort: {time: 1}});
    var overallBestMs = overallBest ? overallBest.time : 9999999;
    var message3 = timeMs < overallBestMs ? " And it's also a new all-time record!" : "";

    alert(color + " : " +message1 + message2 + message3);

    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", "https://api.hipchat.com/v2/room/Racing/notification?auth_token=Mk8MPiX1IuDD9ujFlIWkN2F12dXHflpIR1Nx1Koj", true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send(JSON.stringify({
      "color": color,
      "message": message1 + message2 + message3,
      "notify": true,
      "message_format": "text"
    }));
  }
}
