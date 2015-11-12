var app = angular.module('treadmill', [
    'ngRoute',
    'ngAnimate'
]);

app.config(function($routeProvider) {
    $routeProvider
        .when('/main', {
            controller: 'treadmillController',
            templateUrl: 'views/treadmill.html'
        })
        .when('/history', {
            controller:  'historyController',
            templateUrl: 'views/history.html'
        })
        .when('/settings', {
            controller:  'settingsController',
            templateUrl: 'views/settings.html'
        })
        .otherwise({
            redirectTo: '/main'
        });
});