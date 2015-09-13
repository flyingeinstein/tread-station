$(function () {
    	
    	// Radialize the colors
		Highcharts.getOptions().colors = Highcharts.map(Highcharts.getOptions().colors, function(color) {
		    return {
		        radialGradient: { cx: 0.5, cy: 0.3, r: 0.7 },
		        stops: [
		            [0, color],
		            [1, Highcharts.Color(color).brighten(-0.3).get('rgb')] // darken
		        ]
		    };
		});
		
		// Build the chart
        $('#pie1_container').highcharts({
            chart: {
                plotBackgroundColor: null,
                plotBorderWidth: null,
                plotShadow: false,
                height: 140,
                width: 160,
                margin: [10,10,10,10],
                spacing: [10,10,10,10],
                backgroundColor: "transparent",
            },
						credits: {
						      enabled: false
						  },
            tooltip: {
        	    pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
            },
            title: null,
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    size: '40%',
                    dataLabels: {
                        enabled: true,
                        color: '#ccc',
                        connectorColor: '#aaa',
                        formatter: function() {
                            return this.point.name +': '+ this.percentage +' %';
                        }
                    }
                }
            },
            series: [{
                type: 'pie',
                name: 'Browser share',
                data: [
                    ['Firefox',   45.0],
                    ['IE',       26.8],
                    {
                        name: 'Chrome',
                        y: 12.8,
                        sliced: true,
                        selected: true
                    },
                    ['Safari',    8.5],
                    ['Opera',     6.2],
                    ['Others',   0.7]
                ]
            }]
        });

	$("#pie1").resize(function(){    
		var con = $(this).find("#pie1_container");
		//alert('w:'+con.innerWidth()+' h:'+con.innerHeight());
	  con.highcharts().setSize(
	       con.innerWidth(),
	       con.innerHeight(),
	       true
	    );   
	});


    });
    
