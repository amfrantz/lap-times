LeaderBoards = new Mongo.Collection("leaderboards");
LapTimes = new Mongo.Collection("lap_times");

if (Meteor.isClient) {
  // This code only runs on the client
  Template.body.helpers({
    currentBoard: function() {
      return LeaderBoards.findOne({}, {sort: {createdDtm: -1}});
    },

    lapTimes: function () {
      var cursor = LapTimes.find({}, {sort: {time: 1}});
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

      // Get value from form element
      var driver = event.target.driver.value;
      var time = event.target.time.value;

      // Insert a time into the collection
      LapTimes.insert({
        leaderboardId: 1,
        user: driver,
        time: time,
        createdAt: new Date() // current time
      });

      // Clear form
      event.target.driver.value = "";
      event.target.time.value = "";
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
