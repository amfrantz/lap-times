LeaderBoards = new Mongo.Collection("leaderboards");
LapTimes = new Mongo.Collection("lap_times");

if (Meteor.isClient) {
  // This code only runs on the client
  Template.body.helpers({
    currentBoard: function() {
      return LeaderBoards.findOne({}, {sort: {createdDtm: -1}});
    },

    lapTimes: function () {
      var leaderboard = LeaderBoards.findOne({}, {sort: {createdDtm: -1}});
      var cursor = LapTimes.find({leaderboardId: leaderboard.id}, {sort: {time: 1}});
      var drivers = [];
      var result = [];
      cursor.forEach(function(i) {
        if (drivers.indexOf(i.user) == -1) {
          result.push(i);
          drivers.push(i.user);
        }
      });
      return result;
    }
  });

  Template.body.events({
    "submit .new-time": function (event) {
      // Prevent default browser form submit
      event.preventDefault();

      var leaderboard = LeaderBoards.findOne({}, {sort: {createdDtm: -1}});
      var time = event.target.time.value;

      // Insert a time into the collection
      LapTimes.insert({
        leaderboardId: leaderboard.id,
        owner: Meteor.userId(),
        user: Meteor.user().username,
        time: time,
        createdAt: new Date() // current time
      });

      // Clear form
      event.target.time.value = "";
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
