LeaderBoards = new Mongo.Collection("leaderboards");
LapTimes = new Mongo.Collection("lap_times");

if (Meteor.isClient) {
  Template.body.helpers({
    currentBoard: function() {
      return getCurrentLeaderboard();
    },

    lapTimes: function () {
      var leaderboard = getCurrentLeaderboard();
      var drivers = [];
      var result = [];

      if (leaderboard) {
        var cursor = LapTimes.find({leaderboard_id: leaderboard._id}, {sort: {time: 1}});
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
      }

      return result;
    }
  });

  Template.body.events({
    "submit .new-time": function (event) {
      event.preventDefault();

      var leaderboard = getCurrentLeaderboard();
      var time = event.target.time.value;
      if (/^([0-9]?[0-9]):([0-5][0-9]).([0-9])$/.test(time)) {
        var timeMs = timeToMs(time);
        LapTimes.insert({
          leaderboard_id: leaderboard._id,
          owner: Meteor.userId(),
          driver: Meteor.user().username,
          time: Number(timeMs),
          created_dtm: new Date()
        });
        event.target.time.value = "";

      } else {
        alert ('Nice try. Lap times must be formatted as follows: 00:00.0');
      }
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

  function getCurrentLeaderboard() {
    return LeaderBoards.findOne({}, {sort: {created_dtm: -1}});
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
}
