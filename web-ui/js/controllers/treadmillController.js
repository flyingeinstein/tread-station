app.controller('treadmillController', ['$scope', 'treadmillService', function($scope, treadmill) {
    $scope.pageClass = 'treadmill';

    $scope.treadmill = treadmill;
    $scope.dial = $("#speed-dial").dial();

    $scope.treadmill.dial = $scope.dial;
    $scope.dial.treadmill = $scope.treadmill;

    //console.log($scope.treadmill);

    $scope.$on("treadmill.on.connected", function() {
        $("body").addClass("connected");
        $("body").removeClass("disconnected");
        $(".status-indicator").text("LET'S GO!");
    });

    $scope.$on("treadmill.on.closed", function() {
        $("body").addClass("disconnected");
        $("body").removeClass("connected");
        $("body").removeClass("running");
        $("body").removeClass("stopped");
    });

    $scope.$on("treadmill.on.running", function() {
        $("body").removeClass("stopped");
        $("body").addClass("running");
        $(".status-indicator").text("RUNNING");
    });

    $scope.$on("treadmill.on.stopping", function() {
        $("body").removeClass("running");
        $("body").addClass("stopped");
        $(".status-indicator").text("STOPPING");
    });

    $scope.$on("treadmill.on.stopped", function() {
        $("body").removeClass("running");
        $("body").addClass("stopped");
        $(".status-indicator").text("");
        treadmill.resetTimer = setTimeout(function() {
            treadmill.reset();
            $("#user-select").modal();
        }, 60000);
    });

    $scope.$on("treadmill.running-time", function(e, time)
    {
        var rt = zeropad(time.minutes)+":"+zeropad(time.seconds);
        if(time.hours>0)	// more than an hour
            rt = time.hours+":"+rt;
        $(".running-time").text(rt);
        if(this.dial) this.dial.setRunningTime(time.seconds,time.minutes,time.hours);
    });

    $scope.$on("treadmill.current-speed", function(event, value) {
        if(value==0.0)
            $(".speed-indicator").text("0");
        else
            $(".speed-indicator").text(value.toFixed(1));
        if(this.dial)
        {
            this.dial.setSpeed(value);
        }
    });

    $scope.$on("treadmill.user", function(event, user) {
        if(user!=null)
            $("#view-current-user").text(user.name);
    });
    $scope.$on("treadmill.users", function(event, users) {
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