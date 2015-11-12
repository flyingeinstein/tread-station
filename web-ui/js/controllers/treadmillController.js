app.controller('treadmillController', ['$scope', function($scope) {
    $scope.pageClass = 'treadmill';

    var treadmill = new Treadmill();
    $scope.treadmill = treadmill;
    $scope.dial = $("#speed-dial").dial();

    $scope.treadmill.dial = $scope.dial;
    $scope.dial.treadmill = $scope.treadmill;

    console.log($scope.treadmill);

    Treadmill.prototype.parseEvent = function(name, data)
    {
        if(name=="connected") {
            $("body").addClass("connected");
            $("body").removeClass("disconnected");
            $(".status-indicator").text("LET'S GO!");
        } else if(name=="closed") {
            $("body").addClass("disconnected");
            $("body").removeClass("connected");
            $("body").removeClass("running");
            $("body").removeClass("stopped");
            $(".status-indicator").text("DISCONNECTED");
        } else if(name=="running") {
            $("body").removeClass("stopped");
            $("body").addClass("running");
            $(".status-indicator").text("RUNNING");
        } else if(name=="stopping") {
            $("body").removeClass("running");
            $("body").addClass("stopped");
            $(".status-indicator").text("STOPPING");
        } else if(name=="stopped") {
            $("body").removeClass("running");
            $("body").addClass("stopped");
            $(".status-indicator").text("");
            console.log("wait for it");
            treadmill.resetTimer = setTimeout(function() { treadmill.reset(); $("#user-select").modal(); }, 10000);
        }
    }

    treadmill.on("user", function(user) { if(user!=null) $("#view-current-user").text(user.name); });
    treadmill.on("users", function(users) {
        var usergroup = $("#user-select .users");
        usergroup.html("");
        for(var u in users)
        {
            var user = users[u];
            if(u<=0) continue;
            var radio = d3.select(usergroup[0]).append("label")
                .attr("class","btn btn-default")
                .text(user.name)
                .on('click', function() {
                    //console.log("yes "+this.val());
                    //$("#enter-weight").attr("disabled","false");
                    var weight = $("#enter-weight");
                    var user = $(this).find("input").val();
                    if(user>0) {
                        weight.removeClass("disabled");
                        weight.val( KgToLbs(treadmill.users[user].weight) );
                    }
                })
                .append("input")
                .attr("type","radio")
                .attr("id","user"+user.userid)
                .attr("name","user")
                .attr("value",user.userid);
        }
    });

    $('.speed-decrease').on('click', function() { treadmill.decreaseSpeed(); });
    $('.speed-increase').on('click', function() { treadmill.increaseSpeed(); });
    $('.stop').on('click', function() { treadmill.stop(); });
    $('.reset').on('click', function() { treadmill.reset(); });

    $('.quick-dial li').on('click', function() { treadmill.setSpeed(Number($(this).text())); });

    treadmill.connect("treadmill");
}]);