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
      if (/^([0-9]?[0-9]):([0-5][0-9]).([0-9])$/.test(time)) {
        var timeMs = timeToMs(time);
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
}
