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

    lapTimes: function() {
      return getLapTimes();
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
      if (/^[0-9]?[0-9]:[0-5][0-9]\.[0-9][0-9]?[0-9]?$/.test(time)) {
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
        alert ('Nice try. Lap times must be formatted as follows: 00:00.0 up to 3 decimals places.');
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

  function getLapTimes() {
    var leaderboard = Session.get("leaderboard");
    var drivers = [];
    var result = [];

    var cursor = LapTimes.find({leaderboard_id: leaderboard}, {sort: {time: 1}});
    cursor.forEach(function(i) {
      if (drivers.indexOf(i.owner) == -1) {
        result.push(
            {
              "driver": i.driver,
              "time": msToTime(i.time),
              "timeMs": i.time
            });
        drivers.push(i.owner);
      }
    });

    return result;
  }

  function timeToMs(time) {
    var minutes = Number(time.split(':')[0]);
    var seconds = Number(time.split(':')[1].split('.')[0]);
    var ms = Number(time.split('.')[1]);

    return (minutes * 60 * 1000) + (seconds * 1000) + ms;
  }

  function msToTime(ms) {
    var milliseconds = parseInt((ms % 1000)) + '';
    var seconds = parseInt((ms / 1000) % 60);
    var minutes = parseInt((ms / (1000 * 60)) % 60);

    // fill in leading zeros
    while (milliseconds.length < 3) milliseconds = '0' + milliseconds;

    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return minutes + ":" + seconds + "." + milliseconds;
  }

  function secondsDiff(ms1, ms2) {
    return Math.abs((ms1 - ms2) / 1000);
  }

  function notifyHipChat(leaderboard, time, timeMs) {
    var driver = Meteor.user().username;
    var personalBest = LapTimes.findOne({driver: driver, leaderboard_id: leaderboard}, {sort: {time: 1}});
    var personalBestMs = personalBest ? personalBest.time : 0;
    var first = personalBestMs == 0;
    var faster = !first && timeMs < personalBestMs;
    var diff = secondsDiff(timeMs, personalBestMs);
    var close = diff * 1000 / personalBestMs <= .01;

    var color = first || faster ? "green" : close ? "yellow" : "red";
    var line1 = driver + " has posted a time of " + time;

    var line2;
    if (first) {
      line2 = "<br/>- welcome to the board!";
    } else {
      line2 = "<br/>- " + diff;
      if (faster) {
        line2 += " second improvement";
      } else {
        line2 += " seconds off pace";
      }
    }

    var line3 = "";
    var lapTimes = getLapTimes();
    var self = false;
    lapTimes.forEach(function (lapTime) {
      if (driver == lapTime.driver) self = true;
      if (!self && timeMs < lapTime.timeMs && !line3) {
        line3 = "<br/>- overtakes " + lapTime.driver + " by " + secondsDiff(lapTime.timeMs, timeMs) + " seconds";
      }
    });

    var overallBest = LapTimes.findOne({leaderboard_id: leaderboard}, {sort: {time: 1}});
    var overallBestMs = overallBest ? overallBest.time : 9999999;
    var line4 = "";
    if (timeMs < overallBestMs) {
      line4 = "<br/>- new lap record";
    }

    var message = line1 + line2;
    if (line3) message += line3;
    if (line4) message += line4;

    var xhttp = new XMLHttpRequest();
    xhttp.open("POST", "https://api.hipchat.com/v2/room/1938262/notification?auth_token=Mk8MPiX1IuDD9ujFlIWkN2F12dXHflpIR1Nx1Koj", true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send(JSON.stringify({
      "color": color,
      "message": message,
      "notify": true
    }));
  }
}
