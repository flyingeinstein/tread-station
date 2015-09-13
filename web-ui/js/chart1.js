$(function() {
	var seriesOptions = [],
		yAxisOptions = [],
		seriesCounter = 0,
		names = ['MSFT', 'AAPL', 'GOOG'],
		colors = Highcharts.getOptions().colors;

	$.each(names, function(i, name) {

		$.getJSON('http://www.highcharts.com/samples/data/jsonp.php?filename='+ name.toLowerCase() +'-c.json&callback=?',	function(data) {

			seriesOptions[i] = {
				name: name,
				data: data
			};

			// As we're loading the data asynchronously, we don't know what order it will arrive. So
			// we keep a counter and create the chart when all the data is loaded.
			seriesCounter++;

			if (seriesCounter == names.length) {
				createChart();
			}
		});
	});



	// create the chart when all data is loaded
	var chart;
	function createChart() {

		var chart = $('#chart1_container').highcharts('StockChart', {
		    chart: {
		    reflow: true,
        backgroundColor: "transparent",
        margin: [10,10,10,10],
        spacing: [10,10,10,10]
		    },
				credits: {
				      enabled: false
				  },
		    rangeSelector: {
		        selected: 4
		    },

		    yAxis: {
		    	labels: {
		    		formatter: function() {
		    			return (this.value > 0 ? '+' : '') + this.value + '%';
		    		}
		    	},
		    	plotLines: [{
		    		value: 0,
		    		width: 2,
		    		color: 'silver'
		    	}]
		    },
		    
		    plotOptions: {
		    	series: {
		    		compare: 'percent'
		    	}
		    },
		    
		    tooltip: {
		    	pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.change}%)<br/>',
		    	valueDecimals: 2
		    },
		    
		    series: seriesOptions
		});
	}
	
	$("#chart1").resize(function(){    
		var con = $(this).find("#chart1_container");
	    con.highcharts().setSize(
	       con.innerWidth(),
	       con.innerHeight(),
	       true
	    );   
	});

});